from typing import List, Dict, Tuple
from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session
from ortools.sat.python import cp_model
from .config import settings
from . import models
from .utils import course_year_from_code

Day = str  # e.g., "Mon"


def build_timeslots() -> List[Tuple[Day, time, time]]:
    # Build base day/slot grid from env
    days = settings.week_days
    st_h, st_m = map(int, settings.day_start.split(":"))
    en_h, en_m = map(int, settings.day_end.split(":"))
    slot = settings.slot_minutes
    slots: List[Tuple[Day, time, time]] = []
    for d in days:
        cur = datetime(2000, 1, 1, st_h, st_m)
        end = datetime(2000, 1, 1, en_h, en_m)
        while cur + timedelta(minutes=slot) <= end:
            slots.append((d, (cur.time()), (cur + timedelta(minutes=slot)).time()))
            cur += timedelta(minutes=slot)
    return slots


def generate_timetable(db: Session, version: models.Version) -> List[models.TimetableEvent]:
    # Prepare data
    rooms: List[models.Room] = db.query(models.Room).all()
    courses: List[models.Course] = db.query(models.Course).all()
    groups: List[models.StudentGroup] = db.query(models.StudentGroup).all()
    lecturers: List[models.Lecturer] = db.query(models.Lecturer).all()

    # Build sessions: for each Course-Group pair with a Lecturer
    # session tuple: (course, group, lecturer, minutes, requirements)
    sessions: List[Tuple[models.Course, models.StudentGroup, models.Lecturer, int, Dict]] = []
    for c in courses:
        # Skip project courses (handled separately) -- they should not be scheduled into venues
        if getattr(c, 'is_project', False):
            continue
        if not c.groups or not c.lecturers:
            continue
        # Enforce year-course pairing via code convention if group.year is set
        c_year_hint = course_year_from_code(c.code)
        lec = c.lecturers[0]
        # Lecture sessions according to weekly_hours and session_minutes
        if c.weekly_hours and c.session_minutes:
            minutes_needed = c.weekly_hours * 60
            per_session = c.session_minutes or settings.slot_minutes
            num_sessions = max(1, (minutes_needed + per_session - 1) // per_session)
            for g in c.groups:
                if g.year and c_year_hint and g.year != c_year_hint:
                    continue
                req = dict(c.requirements or {})
                req["_is_lab"] = False
                for _ in range(num_sessions):
                    sessions.append((c, g, lec, per_session, req))
        # Lab sessions if configured
        if getattr(c, "has_lab", False) and getattr(c, "lab_weekly_sessions", 0) > 0:
            lab_per_session = c.lab_session_minutes or (3 * settings.slot_minutes)
            for g in c.groups:
                if g.year and c_year_hint and g.year != c_year_hint:
                    continue
                req = dict(c.lab_requirements or {})
                req["_is_lab"] = True
                for _ in range(c.lab_weekly_sessions):
                    sessions.append((c, g, lec, lab_per_session, req))

    slots = build_timeslots()
    base_slot_minutes = settings.slot_minutes



    # Precompute allowed rooms per group:
    # - If group fits in any room, allow all rooms (even if group is smaller than capacity)
    # - If group is too big for all rooms, allow only the largest room(s)
    room_caps = [r.capacity or 0 for r in rooms]
    max_cap = max(room_caps) if room_caps else 0
    group_allowed_rooms: Dict[int, List[int]] = {}
    for g in groups:
        size = g.size or 0
        fits_somewhere = any((r.capacity or 0) >= size for r in rooms)
        if fits_somewhere:
            acceptable = [i for i, r in enumerate(rooms)]  # allow all rooms
        else:
            # group too big for all rooms; allow only the largest room(s)
            acceptable = [i for i, r in enumerate(rooms) if (r.capacity or 0) == max_cap]
        group_allowed_rooms[g.id] = acceptable

    # Create virtual lab rooms per group so labs don't use listed lecture venues
    lab_group_ids = set()
    for (_c, g, _l, _m, req) in sessions:
        if req.get("_is_lab"):
            lab_group_ids.add(g.id)
    if lab_group_ids:
        id_to_group = {g.id: g for g in groups}
        for gid in lab_group_ids:
            vname = f"LAB-G{gid}"
            exists = any((r.name or "").upper() == vname.upper() for r in rooms)
            if not exists:
                g = id_to_group.get(gid)
                cap = (g.size if g and g.size else 1000)
                vr = models.Room(name=vname, capacity=cap, furniture_type="LAB", equipment=[], availability=None)
                db.add(vr)
        db.commit()
        rooms = db.query(models.Room).all()

    model = cp_model.CpModel()

    # Variables: x[(session_index, room_index, start_slot_index)] in {0,1}
    x: Dict[Tuple[int, int, int], cp_model.IntVar] = {}

    # Helper: room requirements
    def ok_room_session(req: Dict, g: models.StudentGroup, r: models.Room) -> bool:
        is_lab = bool(req.get("_is_lab"))
        rname = (r.name or "")
        is_virtual_lab = rname.startswith("LAB-")
        if is_lab:
            # Labs must use virtual lab rooms only
            return is_virtual_lab
        # Lectures must not use virtual lab rooms
        if is_virtual_lab:
            return False
    # No hard capacity check: any group can use any room; fallback handled above
        # Case-insensitive match for lecture requirements
        req_ft = (req.get("furniture_type") or "").upper()
        room_ft = (r.furniture_type or "").upper()
        if req_ft and room_ft != req_ft:
            return False
        needed = set([str(x).upper() for x in (req.get("equipment", []) or [])])
        have = set([str(x).upper() for x in (r.equipment or [])])
        if not needed.issubset(have):
            return False
        return True

    # Helper: availability over an interval
    def within_availability(avail, day: str, start: time, end: time) -> bool:
        if not avail:
            return True
        windows = avail.get(day) or []
        for s, e in windows:
            sh, sm = map(int, s.split(":"))
            eh, em = map(int, e.split(":"))
            if time(sh, sm) <= start and end <= time(eh, em):
                return True
        return False

    lec_avail = {l.id: l.availability for l in lecturers}
    room_avail = {r.id: r.availability for r in rooms}

    # Precompute coverage (set of base slot indices covered) for candidate assignments
    coverage: Dict[Tuple[int, int, int], List[int]] = {}

    # Create variables only for feasible (session, room, start_slot)
    for si, (c, g, l, minutes, req) in enumerate(sessions):
        if minutes % base_slot_minutes != 0:
            # For MVP, enforce durations are multiples of base slot size
            model.AddBoolOr([])
            continue
        span = minutes // base_slot_minutes  # number of base slots to cover
        for ri, r in enumerate(rooms):
            # restrict rooms to those allowed for this group (prefer fitting rooms; else largest rooms)
            allowed = group_allowed_rooms.get(g.id, [])
            if ri not in allowed:
                continue
            if not ok_room_session(req, g, r):
                continue
            for ti, (d, st, en) in enumerate(slots):
                # Skip lunch window slots
                try:
                    ls_h, ls_m = map(int, settings.lunch_start.split(':'))
                    le_h, le_m = map(int, settings.lunch_end.split(':'))
                    lunch_start_time = time(ls_h, ls_m)
                    lunch_end_time = time(le_h, le_m)
                except Exception:
                    lunch_start_time = None
                    lunch_end_time = None
                if lunch_start_time and lunch_end_time and lunch_start_time <= st < lunch_end_time:
                    continue
                # For 5th year groups, Friday is reserved for project work: skip any candidate slot on 'Fri'
                if getattr(g, 'year', None) == 5 and d == 'Fri':
                    continue
                # Enforce lab/lecture room separation
                is_lab = bool(req.get("_is_lab"))
                rname = (r.name or "")
                if is_lab and not rname.startswith("LAB-"):
                    continue
                if not is_lab and rname.startswith("LAB-"):
                    continue
                # Check that span contiguous slots exist within the same day and align contiguously
                ok = True
                last_end = en
                covered = [ti]
                cur_end = en
                for off in range(1, span):
                    idx2 = ti + off
                    if idx2 >= len(slots):
                        ok = False
                        break
                    d2, st2, en2 = slots[idx2]
                    if d2 != d or st2 != cur_end:
                        ok = False
                        break
                    covered.append(idx2)
                    cur_end = en2
                    last_end = en2
                if not ok:
                    continue
                # Availability checks for full interval
                # For labs, do not enforce lecturer availability; still enforce room availability
                is_lab = bool(req.get("_is_lab"))
                if (not is_lab) and (not within_availability(lec_avail.get(l.id), d, st, last_end)):
                    continue
                if not within_availability(room_avail.get(r.id), d, st, last_end):
                    continue
                var = model.NewBoolVar(f"x_s{si}_r{ri}_t{ti}")
                x[(si, ri, ti)] = var
                coverage[(si, ri, ti)] = covered

    # Each session assigned exactly once
    for si, _ in enumerate(sessions):
        vars_si = [var for (s, r, t), var in x.items() if s == si]
        if not vars_si:
            model.AddBoolOr([])  # force UNSAT if no feasible placement
        else:
            model.Add(sum(vars_si) == 1)

    # No double booking: room by base slot
    for ri, _ in enumerate(rooms):
        for b in range(len(slots)):
            vars_rb = [var for (s, r, t), var in x.items() if r == ri and b in coverage[(s, r, t)]]
            if vars_rb:
                model.Add(sum(vars_rb) <= 1)

    # No double booking: group and lecturer by base slot
    sess_group: Dict[int, int] = {si: g.id for si, (_, g, _, _, _) in enumerate(sessions)}
    sess_lec: Dict[int, int] = {si: l.id for si, (_, _, l, _, _) in enumerate(sessions)}
    # Labs do not block lecturer time; only lectures count for lecturer no-overlap
    nonlab_sessions = {si for si, (_c, _g, _l, _m, req) in enumerate(sessions) if not req.get("_is_lab")}

    for b in range(len(slots)):
        # groups
        for gid in set(sess_group.values()):
            vars_gb = [var for (s, r, t), var in x.items() if sess_group[s] == gid and b in coverage[(s, r, t)]]
            if vars_gb:
                model.Add(sum(vars_gb) <= 1)
        # lecturers
        for lid in set(sess_lec.values()):
            vars_lb = [var for (s, r, t), var in x.items() if s in nonlab_sessions and sess_lec[s] == lid and b in coverage[(s, r, t)]]
            if vars_lb:
                model.Add(sum(vars_lb) <= 1)

    # Soft constraints: discourage scheduling multiple sessions of the same course-group on the same day
    penalty = []
    sess_course: Dict[int, int] = {si: c.id for si, (c, _, _, _, _) in enumerate(sessions)}

    for si in range(len(sessions)):
        for sj in range(si + 1, len(sessions)):
            if sess_course[si] == sess_course[sj] and sess_group[si] == sess_group[sj]:
                # Introduce penalties if both sessions are placed on the same day (any rooms, any start)
                for (s1, r1, t1), v1 in x.items():
                    if s1 != si:
                        continue
                    d1, _, _ = slots[t1]
                    for (s2, r2, t2), v2 in x.items():
                        if s2 != sj:
                            continue
                        d2, _, _ = slots[t2]
                        if d1 == d2:
                            p = model.NewBoolVar(f"pen_s{si}_s{sj}_d{d1}_t{t1}_{t2}")
                            model.AddBoolAnd([v1, v2]).OnlyEnforceIf(p)
                            model.AddBoolOr([v1.Not(), v2.Not()]).OnlyEnforceIf(p.Not())
                            penalty.append(p)

    if penalty:
        model.Minimize(sum(penalty))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 20.0
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("No feasible timetable could be generated with current data and constraints")

    # Build events
    events: List[models.TimetableEvent] = []
    for si, (c, g, l, minutes, _req) in enumerate(sessions):
        # Find assigned (room, start_slot)
        assigned = None
        for (s, r, t), var in x.items():
            if s == si and solver.BooleanValue(var):
                assigned = (r, t)
                break
        if assigned is None:
            continue
        r_idx, t_idx = assigned
        room = rooms[r_idx]
        d, st, _ = slots[t_idx]
        span = minutes // base_slot_minutes
        _, _, end = slots[t_idx + span - 1]
        ev = models.TimetableEvent(
            course_id=c.id,
            room_id=room.id,
            group_id=g.id,
            lecturer_id=l.id,
            day=d,
            start=st,
            end=end,
            version_id=version.id,
        )
        db.add(ev)
        events.append(ev)

    db.commit()
    for e in events:
        db.refresh(e)
    return events
