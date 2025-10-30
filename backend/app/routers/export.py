from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import Dict, Tuple, List, Optional
from datetime import datetime

from ..database import get_db
from .. import models
from ..config import settings
from ..solver import build_timeslots

router = APIRouter(prefix="/timetable", tags=["export"])  # keep under /timetable namespace


def _ordinal(n: int) -> str:
    if 10 <= (n % 100) <= 20:
        suffix = "TH"
    else:
        suffix = {1: "ST", 2: "ND", 3: "RD"}.get(n % 10, "TH")
    return f"{n}{suffix}"


@router.get("/export/html", response_class=HTMLResponse)
def export_html(version_id: Optional[int] = None, db: Session = Depends(get_db)):
    # Resolve version
    if version_id is None:
        v = db.query(models.Version).order_by(models.Version.created_at.desc()).first()
        if not v:
            return HTMLResponse(content="<html><body><p>No timetable to export.</p></body></html>")
        version_id = v.id

    # Load data
    events = db.query(models.TimetableEvent).filter(models.TimetableEvent.version_id == version_id).all()
    groups = {g.id: g for g in db.query(models.StudentGroup).all()}
    courses = {c.id: c for c in db.query(models.Course).all()}
    rooms = {r.id: r for r in db.query(models.Room).all()}

    # Build years and departments present
    years_present = sorted({g.year for g in groups.values() if g.year is not None})
    if not years_present:
        years_present = [2, 3, 4, 5]
    dept_all = { (g.department or '').upper() for g in groups.values() if g.department }
    # Standard order prioritizing GEN then common departments
    ordered_base = ["AEN", "CEE", "EEE", "GEE", "MEC"]
    depts: List[str] = [d for d in ordered_base if d in dept_all]
    for d in sorted(dept_all):
        if d not in depts:
            depts.append(d)

    # Build day -> slots
    slots = build_timeslots()  # list[(day, start, end)]
    day_slots: Dict[str, List[Tuple]] = {}
    for d, st, en in slots:
        day_slots.setdefault(d, []).append((st, en))

    # Map (day, start) -> row index
    slot_index: Dict[Tuple[str, datetime.time], int] = {}
    for d, lst in day_slots.items():
        for idx, (st, en) in enumerate(lst):
            slot_index[(d, st)] = idx

     # Define columns per year: Only 2nd year has GEN LG1/LG2; others have GEN (no subgroups) and depts
    def col_keys_for_year(y: int):
        cols = []
        if "GEN" in depts:
            if y == 2:
                cols.append(("GEN", "LG1"))
                cols.append(("GEN", "LG2"))
            else:
                cols.append(("GEN", None))
        for d in depts:
            if d == "GEN":
                continue
            cols.append((d, None))
        return cols

    # cells[day][row_index][(year, (dept, lg))] = (html, rowspan)
    from collections import defaultdict
    cells = defaultdict(lambda: defaultdict(dict))

    slot_minutes = settings.slot_minutes

    # Place events into cells
    for ev in events:
        g = groups.get(ev.group_id)
        c = courses.get(ev.course_id)
        r = rooms.get(ev.room_id)
        if not g or not c or not r:
            continue
        y = g.year or 0
        dept = (g.department or '').upper()
        lg = (g.lecture_group or '').upper()
        if dept == "GEN":
            # Only second-year uses LG1/LG2; others aggregate under GEN
            if (g.year or 0) == 2:
                col = (dept, lg or "LG1")
            else:
                col = (dept, None)
        else:
            col = (dept, None)
        try:
            start_idx = slot_index[(ev.day, ev.start)]
        except KeyError:
            # Non-aligned event; skip in export
            continue
        duration = (datetime.combine(datetime.today(), ev.end) - datetime.combine(datetime.today(), ev.start)).seconds // 60
        span = max(1, duration // slot_minutes)
        label_type = "Lab" if (getattr(c, 'has_lab', False) and duration == (c.lab_session_minutes or 180)) else "Lec"
        title = f"{c.code} {label_type}<br/><span style='font-size:11px;color:#374151'>{r.name}</span>"
        if y in years_present:
            cells[ev.day][start_idx][(y, col)] = (title, span)

    # Build HTML
    def day_title(d: str) -> str:
        return {
            "Mon": "MONDAY",
            "Tue": "TUESDAY",
            "Wed": "WEDNESDAY",
            "Thu": "THURSDAY",
            "Fri": "FRIDAY",
            "Sat": "SATURDAY",
            "Sun": "SUNDAY",
        }.get(d, d.upper())

    style = """
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
      th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; font-size: 12px; }
      th { background: #f3f4f6; text-align: center; font-weight: 700; }
      .day { font-weight: 800; font-size: 14px; margin: 8px 0; }
      .hours { width: 120px; font-weight: 700; text-align: center; }
      .dept { font-weight: 700; }
      .hdr { text-align:center; margin-bottom: 8px; }
      .hdr .l1 { font-weight: 700; font-size: 18px; }
      .hdr .l2 { font-weight: 600; }
      .hdr .l3 { font-weight: 700; margin-top: 6px; }
      .hdr .l4 { margin-top: 4px; }
    </style>
    """

    header_html = f"""
    <div class='hdr'>
      <div class='l1'>THE UNIVERSITY OF ZAMBIA</div>
      <div class='l2'>SCHOOL OF ENGINEERING</div>
      <div class='l3'>SECOND HALF 2024/2025 ACADEMIC YEAR UG TIME-TABLE FOR LECTURES, LABS AND TUTORIALS</div>
      <div class='l4'>THIRD DRAFT – {datetime.today().strftime('%A, %d %B, %Y').upper()}</div>
    </div>
    """

    html_parts = ["<html><head>", style, "</head><body>", header_html]

    for d in settings.week_days:
        if d not in day_slots:
            continue
        html_parts.append(f"<div class='day'>{day_title(d)}</div>")
        # Header rows
        header_row1 = ["<th class='hours'>HOURS</th>"]
        header_row2 = ["<th></th>"]
        year_cols: Dict[int, List[Tuple[str, Optional[str]]]] = {}
        for y in years_present:
            cols = col_keys_for_year(y)
            year_cols[y] = cols
            header_row1.append(f"<th colspan='{len(cols)}'><div>{_ordinal(y)} YEAR</div></th>")
            for dept, lg in cols:
                if dept == "GEN" and lg:
                    header_row2.append(f"<th>GEN {lg}</th>")
                else:
                    header_row2.append(f"<th>{dept}</th>")
        table_html = ["<table>", "<tr>" + "".join(header_row1) + "</tr>", "<tr>" + "".join(header_row2) + "</tr>"]

        # Skip map for rowspans
        skip: Dict[Tuple[int, Tuple[str, Optional[str]]], int] = {}

        for row_idx, (st, en) in enumerate(day_slots[d]):
            # Insert a lunch row if this slot is the lunch start
            try:
                ls_h, ls_m = map(int, settings.lunch_start.split(':'))
                lunch_start_time = datetime.today().time().replace(hour=ls_h, minute=ls_m, second=0, microsecond=0)
            except Exception:
                lunch_start_time = None

            if lunch_start_time and st == lunch_start_time:
                # Add a full-width lunch row before the normal row
                colspan = 1 + sum(len(v) for v in year_cols.values())
                table_html.append(f"<tr><td class='hours'>{st.strftime('%H:%M')} – {en.strftime('%H:%M')}</td><td colspan='{colspan}' style='text-align:center;font-weight:700;'>LUNCH {settings.lunch_start} - {settings.lunch_end}</td></tr>")

            row_cells = [f"<td class='hours'>{st.strftime('%H:%M')} – {en.strftime('%H:%M')}</td>"]
            for y in years_present:
                for col in year_cols[y]:
                    key = (y, col)
                    if skip.get(key, 0) > 0:
                        skip[key] -= 1
                        continue
                    cell = cells[d].get(row_idx, {}).get(key)
                    if cell:
                        title, span = cell
                        if span > 1:
                            skip[key] = span - 1
                        row_cells.append(f"<td rowspan='{span}'><div class='dept'>{title}</div></td>")
                    else:
                        row_cells.append("<td></td>")
            table_html.append("<tr>" + "".join(row_cells) + "</tr>")

        table_html.append("</table>")
        html_parts.append("".join(table_html))

    # Keys (brief)
    footer = """
    <div style='margin-top:12px;'>
      <div style='font-weight:700;'>KEY TO ROOM CODES</div>
      <div class='small'>Codes correspond to Room names configured (e.g., ENLT1, NLR1, G05).</div>
      <div style='font-weight:700;margin-top:6px;'>KEY TO GROUP CODES</div>
      <div class='small'>LG = Lecture Group (LG1, LG2). A/B/C/D = Lab/Tutorial subgroups.</div>
    </div>
    """
    html_parts.append(footer)

    html_parts.append("</body></html>")
    return HTMLResponse(content="".join(html_parts))
