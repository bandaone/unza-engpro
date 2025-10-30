from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
from datetime import time

from ..database import get_db
from .. import models
from ..deps import get_current_user, require_role

router = APIRouter(prefix="/validation", tags=["validation"])


def _upsert_issue(db: Session, scope: str, issue_type: str, message: str, severity: str = "warning", department: Optional[str] = None,
                  course_id: Optional[int] = None, group_id: Optional[int] = None, lecturer_id: Optional[int] = None, room_id: Optional[int] = None,
                  version_id: Optional[int] = None) -> models.Issue:
    q = db.query(models.Issue).filter(models.Issue.scope == scope, models.Issue.issue_type == issue_type,
                                      models.Issue.message == message, models.Issue.status != 'resolved')
    if department:
        q = q.filter(models.Issue.department == department)
    if course_id:
        q = q.filter(models.Issue.course_id == course_id)
    if group_id:
        q = q.filter(models.Issue.group_id == group_id)
    if lecturer_id:
        q = q.filter(models.Issue.lecturer_id == lecturer_id)
    if room_id:
        q = q.filter(models.Issue.room_id == room_id)
    if version_id:
        q = q.filter(models.Issue.version_id == version_id)
    existing = q.first()
    if existing:
        return existing
    iss = models.Issue(scope=scope, issue_type=issue_type, severity=severity, status='open', message=message,
                       department=department, course_id=course_id, group_id=group_id, lecturer_id=lecturer_id,
                       room_id=room_id, version_id=version_id)
    db.add(iss)
    db.commit()
    db.refresh(iss)
    return iss


def _overlaps(a: Tuple[time, time], b: Tuple[time, time]) -> bool:
    return max(a[0], b[0]) < min(a[1], b[1])


def _latest_version(db: Session) -> Optional[models.Version]:
    return db.query(models.Version).order_by(models.Version.created_at.desc()).first()


@router.post("/department")
def validate_department(department: Optional[str] = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Resolve department scope
    if user.role == 'coordinator':
        dep = (department or '').upper() or None
        if not dep:
            raise HTTPException(status_code=400, detail="department is required for coordinator departmental validation")
    else:
        dep = (user.department or '').upper()
        if not dep:
            raise HTTPException(status_code=400, detail="Your user has no department assigned")

    # Validate courses in department
    courses = db.query(models.Course).filter(models.Course.department == dep).all()
    for c in courses:
        if not c.is_project and (c.weekly_hours is None or c.weekly_hours <= 0):
            _upsert_issue(db, 'departmental', 'missing_field', f"Course {c.code} missing/invalid weekly_hours", 'warning', department=dep, course_id=c.id)
        if not c.lecturers:
            _upsert_issue(db, 'departmental', 'missing_assignment', f"Course {c.code} has no lecturer assigned", 'error', department=dep, course_id=c.id)
        if not c.groups:
            _upsert_issue(db, 'departmental', 'missing_assignment', f"Course {c.code} has no group assigned", 'error', department=dep, course_id=c.id)

    # Validate groups in department
    groups = db.query(models.StudentGroup).filter(models.StudentGroup.department == dep).all()
    for g in groups:
        if (g.size or 0) <= 0:
            _upsert_issue(db, 'departmental', 'missing_field', f"Group {g.name} has invalid size", 'warning', department=dep, group_id=g.id)
        # For EEE department years >= 4, ensure a track is specified for clarity of minors.
        if (dep == 'EEE') and (g.year or 0) >= 4 and not (g.track or '').strip():
            _upsert_issue(db, 'departmental', 'missing_field', f"Group {g.name} (Y{g.year}) missing track (e.g., ET/MP)", 'warning', department=dep, group_id=g.id)

    return {"status": "ok"}


@router.post("/global")
def validate_global(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_role(user, 'coordinator')
    v = _latest_version(db)
    if not v:
        raise HTTPException(status_code=400, detail="No timetable versions exist to validate")
    events: List[models.TimetableEvent] = db.query(models.TimetableEvent).filter(models.TimetableEvent.version_id == v.id).all()

    # Build per day lists and check overlaps for room, lecturer, group
    from collections import defaultdict
    by_day = defaultdict(list)
    for ev in events:
        by_day[ev.day].append(ev)

    for day, lst in by_day.items():
        # Check pairwise overlaps
        for i in range(len(lst)):
            a = lst[i]
            for j in range(i + 1, len(lst)):
                b = lst[j]
                if _overlaps((a.start, a.end), (b.start, b.end)):
                    if a.room_id == b.room_id:
                        _upsert_issue(db, 'global', 'room_overbook', f"Room double booking {day} {a.start}-{a.end} room_id={a.room_id}", 'error', room_id=a.room_id, version_id=v.id)
                    if a.lecturer_id == b.lecturer_id:
                        _upsert_issue(db, 'global', 'lecturer_double_book', f"Lecturer double booking {day} {a.start}-{a.end} lecturer_id={a.lecturer_id}", 'error', lecturer_id=a.lecturer_id, version_id=v.id)
                    if a.group_id == b.group_id:
                        _upsert_issue(db, 'global', 'group_double_book', f"Group double booking {day} {a.start}-{a.end} group_id={a.group_id}", 'error', group_id=a.group_id, version_id=v.id)

    return {"status": "ok", "version_id": v.id}
