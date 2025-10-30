from datetime import datetime, time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from . import models
import re


def format_time(t: time) -> str:
    """Format time object to string"""
    return t.strftime("%H:%M")


def parse_time(time_str: str) -> time:
    """Parse time string to time object"""
    return datetime.strptime(time_str, "%H:%M").time()


def overlaps(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    """Check if two time periods overlap"""
    return max(a_start, b_start) < min(a_end, b_end)


def get_department_summary(db: Session, department: str) -> Dict[str, Any]:
    """Get a summary of department data"""
    return {
        "courses": db.query(models.Course).filter(models.Course.department == department).count(),
        "lecturers": db.query(models.Lecturer).filter(models.Lecturer.department == department).count(),
        "groups": db.query(models.StudentGroup).filter(models.StudentGroup.department == department).count(),
        "scheduled_slots": db.query(models.TimeSlot).join(models.Course).filter(
            models.Course.department == department
        ).count()
    }


def check_room_conflicts(db: Session, room_id: int, day: int, start_time: time, end_time: time) -> bool:
    """Check if a room is available at a specific time"""
    existing = db.query(models.TimeSlot).filter(
        models.TimeSlot.room_id == room_id,
        models.TimeSlot.day == day,
        models.TimeSlot.start_time < end_time,
        models.TimeSlot.end_time > start_time
    ).first()
    
    return existing is not None


def check_lecturer_availability(db: Session, lecturer_id: int, day: int, start_time: time, end_time: time) -> bool:
    """Check if a lecturer is available at a specific time"""
    existing = db.query(models.TimeSlot).join(models.Course).filter(
        models.Course.lecturers.any(id=lecturer_id),
        models.TimeSlot.day == day,
        models.TimeSlot.start_time < end_time,
        models.TimeSlot.end_time > start_time
    ).first()
    
    return existing is None


def check_conflicts(db: Session, event: models.TimetableEvent) -> List[str]:
    errors = []
    # Room capacity
    if event.room and event.group and event.room.capacity < event.group.size:
        errors.append("Room capacity is less than group size")
    # Requirements
    req = event.course.requirements or {}
    # Case-insensitive compare by normalizing to uppercase
    room_ft = (event.room.furniture_type or "").upper() if event.room else ""
    req_ft = (req.get("furniture_type") or "").upper()
    if req_ft and room_ft != req_ft:
        errors.append("Room furniture type does not meet requirement")
    needed = set([str(x).upper() for x in (req.get("equipment", []) or [])])
    have = set([str(x).upper() for x in (event.room.equipment or [])])
    if not needed.issubset(have):
        errors.append("Room equipment does not meet requirement")

    # Availability windows (simplified: if availability exists for resource, ensure slot inside any window)
    def within_availability(avail, day: str, start: time, end: time) -> bool:
        if not avail:
            return True
        windows = avail.get(day) or []
        for s, e in windows:
            ss_h, ss_m = map(int, s.split(":"))
            ee_h, ee_m = map(int, e.split(":"))
            if time(ss_h, ss_m) <= start and end <= time(ee_h, ee_m):
                return True
        return False

    if not within_availability(event.room.availability if event.room else None, event.day, event.start, event.end):
        errors.append("Room not available in selected slot")
    if not within_availability(event.lecturer.availability if event.lecturer else None, event.day, event.start, event.end):
        errors.append("Lecturer not available in selected slot")

    # Double-bookings
    existing = db.query(models.TimetableEvent).filter(models.TimetableEvent.day == event.day).all()
    for ev in existing:
        if ev.id == event.id:
            continue
        if overlaps(event.start, event.end, ev.start, ev.end):
            if ev.room_id == event.room_id:
                errors.append("Room already booked at that time")
            if ev.group_id == event.group_id:
                errors.append("Group already has a class at that time")
            if ev.lecturer_id == event.lecturer_id:
                errors.append("Lecturer already teaching at that time")

    return list(sorted(set(errors)))

# --- Course code utilities ---
_code_re = re.compile(r"^[A-Z]{2,}\s*-?\s*(\d{4})$")

def course_year_from_code(code: str) -> Optional[int]:
    if not code:
        return None
    m = _code_re.match(code.strip().upper())
    if not m:
        return None
    digits = m.group(1)
    # First digit represents year level in many schemes (2xxx,3xxx,4xxx,5xxx)
    try:
        y = int(digits[0])
        if y in (1, 2, 3, 4, 5):
            return y
        return None
    except Exception:
        return None
