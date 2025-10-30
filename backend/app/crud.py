from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas

def get_departments(db: Session) -> List[str]:
    """Get a list of all department codes"""
    # For now, return hardcoded departments
    return ["CSE", "EEE", "CEE", "MEC", "AEN"]

def get_department(db: Session, code: str) -> Optional[str]:
    """Get a specific department by code"""
    departments = get_departments(db)
    return code if code in departments else None

def get_courses(db: Session, department: Optional[str] = None) -> List[Any]:
    """Get all courses, optionally filtered by department"""
    # For now, return hardcoded courses
    courses = [
        {"id": 1, "code": "CSE101", "department": "CSE", "name": "Introduction to Programming"},
        {"id": 2, "code": "EEE101", "department": "EEE", "name": "Basic Electronics"},
        {"id": 3, "code": "CEE101", "department": "CEE", "name": "Engineering Mechanics"}
    ]
    if department:
        return [c for c in courses if c["department"] == department]
    return courses

def get_groups(db: Session, department: Optional[str] = None) -> List[Any]:
    """Get all student groups, optionally filtered by department"""
    # For now, return hardcoded groups
    groups = [
        {"id": 1, "name": "CSE-A", "department": "CSE", "size": 30},
        {"id": 2, "name": "EEE-A", "department": "EEE", "size": 25},
        {"id": 3, "name": "CEE-A", "department": "CEE", "size": 28}
    ]
    if department:
        return [g for g in groups if g["department"] == department]
    return groups

def get_lecturers(db: Session, department: Optional[str] = None) -> List[Any]:
    """Get all lecturers, optionally filtered by department"""
    # For now, return hardcoded lecturers
    lecturers = [
        {"id": 1, "name": "Dr. Smith", "department": "CSE"},
        {"id": 2, "name": "Dr. Jones", "department": "EEE"},
        {"id": 3, "name": "Dr. Brown", "department": "CEE"}
    ]
    if department:
        return [l for l in lecturers if l["department"] == department]
    return lecturers

# -------------------------
# Normalization helpers
# -------------------------

def _upper_or_none(v: Optional[str]) -> Optional[str]:
    return v.upper() if isinstance(v, str) and v != "" else None


def _upper_list(xs: Optional[List[Any]]) -> Optional[List[str]]:
    if not xs:
        return None
    out = []
    for x in xs:
        s = str(x).upper()
        if s:
            out.append(s)
    return out or None


def _norm_requirements(req: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not req:
        return None
    ft = _upper_or_none(req.get("furniture_type"))
    eq = _upper_list(req.get("equipment"))
    out: Dict[str, Any] = {}
    if ft:
        out["furniture_type"] = ft
    if eq:
        out["equipment"] = eq
    return out or None


def _norm_room_payload(data: schemas.RoomCreate) -> Dict[str, Any]:
    return {
        "name": data.name,
        "capacity": data.capacity,
        "building": data.building,
        "furniture_type": _upper_or_none(data.furniture_type),
        "equipment": _upper_list(data.equipment),
        "availability": data.availability,
    }


def _norm_group_payload(data: schemas.StudentGroupBase) -> Dict[str, Any]:
    year = getattr(data, "year", None)
    dept = _upper_or_none(getattr(data, "department", None))
    lg = _upper_or_none(getattr(data, "lecture_group", None))
    subgroup = _upper_or_none(getattr(data, "subgroup", None))
    track = _upper_or_none(getattr(data, "track", None))

    # Second-year groups are general; departments don't apply; only LG1/LG2 valid
    if year == 2:
        dept = "GEN"
        if lg not in ("LG1", "LG2"):
            lg = None  # if invalid, drop
        # No track at year 2
        track = None
    else:
        # For years other than 2, don't keep lecture_group (only 2Y uses LG)
        lg = None

    return {
        "name": data.name,
        "size": data.size,
        "year": year,
        "department": dept,
        "lecture_group": lg,
        "subgroup": subgroup,
        "track": track,
    }


def _norm_lecturer_payload(data: schemas.LecturerBase) -> Dict[str, Any]:
    return {
        "name": data.name,
        "department": _upper_or_none(getattr(data, "department", None)),
        "max_daily_load": data.max_daily_load,
        "availability": data.availability,
    }


def _norm_course_payload(data: schemas.CourseCreate) -> Dict[str, Any]:
    return {
        "code": (data.code or "").upper(),
        "name": data.name,
        "weekly_hours": data.weekly_hours,
        "session_minutes": data.session_minutes,
        "requirements": _norm_requirements(data.requirements),
        "is_project": getattr(data, 'is_project', False),
        "has_lab": data.has_lab,
        "lab_weekly_sessions": data.lab_weekly_sessions,
        "lab_session_minutes": data.lab_session_minutes,
        "lab_requirements": _norm_requirements(data.lab_requirements),
        "department": _upper_or_none(getattr(data, 'department', None)),
    }

# -------------------------
# Rooms
# -------------------------

def create_room(db: Session, data: schemas.RoomCreate) -> models.Room:
    payload = _norm_room_payload(data)
    obj = models.Room(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_room(db: Session, room_id: int, data: schemas.RoomCreate) -> models.Room:
    obj = db.query(models.Room).get(room_id)
    if not obj:
        raise ValueError("Room not found")
    payload = _norm_room_payload(data)
    for k, v in payload.items():
        setattr(obj, k, v)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_room(db: Session, room_id: int) -> None:
    obj = db.query(models.Room).get(room_id)
    if not obj:
        return
    refs = db.query(models.TimetableEvent).filter(models.TimetableEvent.room_id == room_id).count()
    if refs:
        raise ValueError(f"Cannot delete room; {refs} timetable events reference it")
    db.delete(obj)
    db.commit()


def get_rooms(db: Session) -> List[models.Room]:
    return db.query(models.Room).all()


def get_room(db: Session, room_id: int) -> Optional[models.Room]:
    return db.query(models.Room).get(room_id)

# -------------------------
# Student Groups
# -------------------------

def create_group(db: Session, data: schemas.StudentGroupCreate) -> models.StudentGroup:
    payload = _norm_group_payload(data)
    obj = models.StudentGroup(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_group(db: Session, group_id: int, data: schemas.StudentGroupCreate) -> models.StudentGroup:
    obj = db.query(models.StudentGroup).get(group_id)
    if not obj:
        raise ValueError("Group not found")
    payload = _norm_group_payload(data)
    for k, v in payload.items():
        setattr(obj, k, v)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_group(db: Session, group_id: int) -> None:
    obj = db.query(models.StudentGroup).get(group_id)
    if not obj:
        return
    refs = db.query(models.TimetableEvent).filter(models.TimetableEvent.group_id == group_id).count()
    if refs:
        raise ValueError(f"Cannot delete group; {refs} timetable events reference it")
    db.delete(obj)
    db.commit()


def get_groups(db: Session) -> List[models.StudentGroup]:
    return db.query(models.StudentGroup).all()

# -------------------------
# Lecturers
# -------------------------

def create_lecturer(db: Session, data: schemas.LecturerCreate) -> models.Lecturer:
    payload = _norm_lecturer_payload(data)
    obj = models.Lecturer(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_lecturer(db: Session, lecturer_id: int, data: schemas.LecturerCreate) -> models.Lecturer:
    obj = db.query(models.Lecturer).get(lecturer_id)
    if not obj:
        raise ValueError("Lecturer not found")
    payload = _norm_lecturer_payload(data)
    for k, v in payload.items():
        setattr(obj, k, v)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_lecturer(db: Session, lecturer_id: int) -> None:
    obj = db.query(models.Lecturer).get(lecturer_id)
    if not obj:
        return
    refs = db.query(models.TimetableEvent).filter(models.TimetableEvent.lecturer_id == lecturer_id).count()
    if refs:
        raise ValueError(f"Cannot delete lecturer; {refs} timetable events reference it")
    db.delete(obj)
    db.commit()


def get_lecturers(db: Session) -> List[models.Lecturer]:
    return db.query(models.Lecturer).all()

# -------------------------
# Courses
# -------------------------

def create_course(db: Session, data: schemas.CourseCreate) -> models.Course:
    payload = _norm_course_payload(data)
    obj = models.Course(**payload)
    groups = []
    # explicit groups by ids
    if data.group_ids:
        groups.extend(db.query(models.StudentGroup).filter(models.StudentGroup.id.in_(data.group_ids)).all())
    # if department supplied and no explicit groups, attach groups from that department
    if (not groups) and getattr(data, 'department', None):
        dep = (data.department or '').upper()
        if dep:
            groups_dep = db.query(models.StudentGroup).filter(models.StudentGroup.department == dep).all()
            groups.extend(groups_dep)
    # Support shared departments/years (+ second-year GEN + specialization tracks)
    deps = [d.upper() for d in (getattr(data, "shared_departments", None) or []) if d]
    yrs = [int(y) for y in (getattr(data, "shared_years", None) or []) if y]
    tracks = [t.upper() for t in (getattr(data, "target_tracks", None) or []) if t]
    if deps and yrs:
        q = db.query(models.StudentGroup).filter(models.StudentGroup.department.in_(deps), models.StudentGroup.year.in_(yrs))
        if tracks:
            q = q.filter(models.StudentGroup.track.in_(tracks))
        shared_groups = q.all()
        groups.extend(shared_groups)
    # If year 2 is part of sharing, attach GEN groups of year 2
    if 2 in yrs:
        gen_groups = db.query(models.StudentGroup).filter(models.StudentGroup.department == 'GEN', models.StudentGroup.year == 2).all()
        groups.extend(gen_groups)
    # Deduplicate by id
    if groups:
        seen = set()
        uniq = []
        for g in groups:
            if g.id in seen:
                continue
            seen.add(g.id)
            uniq.append(g)
        obj.groups = uniq
    if data.lecturer_ids:
        obj.lecturers = db.query(models.Lecturer).filter(models.Lecturer.id.in_(data.lecturer_ids)).all()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_course(db: Session, course_id: int, data: schemas.CourseCreate) -> models.Course:
    obj = db.query(models.Course).get(course_id)
    if not obj:
        raise ValueError("Course not found")
    payload = _norm_course_payload(data)
    for k, v in payload.items():
        setattr(obj, k, v)
    # Reassign relations if provided
    if data.group_ids is not None or getattr(data, "shared_departments", None) or getattr(data, "shared_years", None) or getattr(data, 'department', None):
        groups = []
        if data.group_ids:
            groups.extend(db.query(models.StudentGroup).filter(models.StudentGroup.id.in_(data.group_ids)).all())
        # if department provided and still no groups, attach groups from department
        if (not groups) and getattr(data, 'department', None):
            dep = (data.department or '').upper()
            if dep:
                groups_dep = db.query(models.StudentGroup).filter(models.StudentGroup.department == dep).all()
                groups.extend(groups_dep)
        if getattr(data, "shared_departments", None) and getattr(data, "shared_years", None):
            deps = [d.upper() for d in data.shared_departments if d]
            yrs = [int(y) for y in data.shared_years if y]
            if deps and yrs:
                shared_groups = db.query(models.StudentGroup).filter(models.StudentGroup.department.in_(deps), models.StudentGroup.year.in_(yrs)).all()
                groups.extend(shared_groups)
        if groups:
            seen = set()
            uniq = []
            for g in groups:
                if g.id in seen:
                    continue
                seen.add(g.id)
                uniq.append(g)
            obj.groups = uniq
    if data.lecturer_ids is not None:
        obj.lecturers = db.query(models.Lecturer).filter(models.Lecturer.id.in_(data.lecturer_ids)).all()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_course(db: Session, course_id: int) -> None:
    obj = db.query(models.Course).get(course_id)
    if not obj:
        return
    refs = db.query(models.TimetableEvent).filter(models.TimetableEvent.course_id == course_id).count()
    if refs:
        raise ValueError(f"Cannot delete course; {refs} timetable events reference it")
    db.delete(obj)
    db.commit()


def get_courses(db: Session) -> List[models.Course]:
    return db.query(models.Course).all()

def get_departments(db: Session) -> List[str]:
    q1 = db.query(models.StudentGroup.department).filter(models.StudentGroup.department.isnot(None))
    q2 = db.query(models.Course.department).filter(models.Course.department.isnot(None))
    q3 = db.query(models.Lecturer.department).filter(models.Lecturer.department.isnot(None))
    
    all_deps = [r[0] for r in q1.distinct()]
    all_deps.extend([r[0] for r in q2.distinct()])
    all_deps.extend([r[0] for r in q3.distinct()])
    
    return sorted(list(set(all_deps)))


# -------------------------
# Versions / Events
# -------------------------

def create_version(db: Session, name: str) -> models.Version:
    v = models.Version(name=name)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


def get_latest_version(db: Session) -> Optional[models.Version]:
    return db.query(models.Version).order_by(models.Version.created_at.desc()).first()


def add_event(db: Session, data: schemas.TimetableEventCreate) -> models.TimetableEvent:
    ev = models.TimetableEvent(**data.dict())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def get_events(db: Session, version_id: Optional[int] = None) -> List[models.TimetableEvent]:
    q = db.query(models.TimetableEvent)
    if version_id:
        q = q.filter(models.TimetableEvent.version_id == version_id)
    return q.all()
