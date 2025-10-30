from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import time

from ..database import get_db
from .. import schemas, models, crud
from ..solver import generate_timetable
from ..utils import check_conflicts

router = APIRouter(prefix="/timetable", tags=["timetable"])

@router.post("/generate", response_model=List[schemas.TimetableEvent])
def generate(req: schemas.GenerateRequest, db: Session = Depends(get_db)):
    version = crud.create_version(db, name=req.version_name)
    events = generate_timetable(db, version)
    return events

@router.get("/events", response_model=List[schemas.TimetableEvent])
def list_events(
    version_id: Optional[int] = None,
    group_id: Optional[int] = None,
    lecturer_id: Optional[int] = None,
    room_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if version_id is None:
        v = crud.get_latest_version(db)
        if not v:
            return []
        version_id = v.id
    q = db.query(models.TimetableEvent).filter(models.TimetableEvent.version_id == version_id)
    if group_id:
        q = q.filter(models.TimetableEvent.group_id == group_id)
    if lecturer_id:
        q = q.filter(models.TimetableEvent.lecturer_id == lecturer_id)
    if room_id:
        q = q.filter(models.TimetableEvent.room_id == room_id)
    return q.all()

@router.post("/events", response_model=schemas.TimetableEvent)
def add_event(data: schemas.TimetableEventCreate, db: Session = Depends(get_db)):
    # Pre-check conflicts
    ev = models.TimetableEvent(**data.dict())
    # attach relationships for validation
    ev.room = db.query(models.Room).get(ev.room_id)
    ev.group = db.query(models.StudentGroup).get(ev.group_id)
    ev.lecturer = db.query(models.Lecturer).get(ev.lecturer_id)
    ev.course = db.query(models.Course).get(ev.course_id)

    errors = check_conflicts(db, ev)
    if errors:
        raise HTTPException(status_code=400, detail=errors)
    # save
    return crud.add_event(db, data)

@router.post("/events/{event_id}/move", response_model=schemas.TimetableEvent)
def move_event(event_id: int, req: schemas.MoveEventRequest, db: Session = Depends(get_db)):
    ev = db.query(models.TimetableEvent).get(event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.day = req.day
    ev.start = req.start
    ev.end = req.end
    ev.room_id = req.room_id

    errors = check_conflicts(db, ev)
    if errors:
        raise HTTPException(status_code=400, detail=errors)

    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev
