from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import time
from fastapi.responses import JSONResponse

from ..database import get_db
from .. import schemas, models, crud
from ..solver import generate_timetable
from ..utils import check_conflicts
from ..services.pdf import pdf_service
from ..services.email import email_service

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

@router.post("/publish/{version_id}")
async def publish_timetable(
    version_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Publish the timetable by generating and emailing individual schedules to lecturers
    """
    try:
        # Get all events for this version
        version = db.query(models.Version).filter(models.Version.id == version_id).first()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Get all lecturers with events in this version
        lecturers = db.query(models.Lecturer).join(
            models.TimetableEvent,
            models.TimetableEvent.lecturer_id == models.Lecturer.id
        ).filter(
            models.TimetableEvent.version_id == version_id
        ).distinct().all()

        sent_count = 0
        skipped_count = 0
        error_messages = []

        for lecturer in lecturers:
            try:
                if not lecturer.email:
                    error_messages.append(f"Lecturer {lecturer.name} (ID: {lecturer.id}) has no email address yet. Please have HOD set email address before publishing.")
                    skipped_count += 1
                    continue

                # Get events for this lecturer
                events = db.query(models.TimetableEvent).filter(
                    models.TimetableEvent.version_id == version_id,
                    models.TimetableEvent.lecturer_id == lecturer.id
                ).all()

                if not events:
                    error_messages.append(f"No events found for lecturer {lecturer.name} (ID: {lecturer.id})")
                    skipped_count += 1
                    continue

                # Generate PDF
                pdf_bytes = pdf_service.generate_timetable_pdf(events, lecturer.name)

                # Send email in background
                background_tasks.add_task(
                    email_service.send_timetable,
                    recipient_email=lecturer.email,
                    lecturer_name=lecturer.name,
                    timetable_pdf=pdf_bytes
                )
                sent_count += 1

            except Exception as e:
                error_msg = f"Error processing lecturer {lecturer.name} (ID: {lecturer.id}): {str(e)}"
                error_messages.append(error_msg)
                skipped_count += 1

        return JSONResponse(
            status_code=200,
            content={
                "message": f"Timetable publishing in progress",
                "details": {
                    "total_lecturers": len(lecturers),
                    "sent": sent_count,
                    "skipped": skipped_count,
                    "errors": error_messages
                },
                "version": version_id
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to publish timetable: {str(e)}"
        )

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
