from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import crud, schemas, models

router = APIRouter(prefix="/entities", tags=["entities"])

# Rooms
@router.post("/rooms", response_model=schemas.Room)
def create_room(data: schemas.RoomCreate, db: Session = Depends(get_db)):
    return crud.create_room(db, data)

@router.put("/rooms/{room_id}", response_model=schemas.Room)
def update_room(room_id: int, data: schemas.RoomCreate, db: Session = Depends(get_db)):
    try:
        return crud.update_room(db, room_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/rooms/{room_id}")
def remove_room(room_id: int, db: Session = Depends(get_db)):
    try:
        crud.delete_room(db, room_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rooms", response_model=List[schemas.Room])
def list_rooms(db: Session = Depends(get_db)):
    return crud.get_rooms(db)

# Groups
@router.post("/groups", response_model=schemas.StudentGroup)
def create_group(data: schemas.StudentGroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db, data)

@router.put("/groups/{group_id}", response_model=schemas.StudentGroup)
def update_group(group_id: int, data: schemas.StudentGroupCreate, db: Session = Depends(get_db)):
    try:
        return crud.update_group(db, group_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/groups/{group_id}")
def remove_group(group_id: int, db: Session = Depends(get_db)):
    try:
        crud.delete_group(db, group_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Lecturer email update endpoint
@router.patch("/lecturers/{lecturer_id}/email", response_model=schemas.Lecturer)
def update_lecturer_email(
    lecturer_id: int, 
    data: schemas.UpdateLecturerEmail, 
    db: Session = Depends(get_db)
):
    """
    Update a lecturer's email address. This endpoint is specifically for HODs to set or update
    lecturer email addresses. The email must be unique across all lecturers.
    """
    try:
        # Check if email already exists for another lecturer
        existing = db.query(models.Lecturer).filter(
            models.Lecturer.email == data.email,
            models.Lecturer.id != lecturer_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Email {data.email} is already assigned to another lecturer"
            )

        # Get the lecturer
        lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
        if not lecturer:
            raise HTTPException(status_code=404, detail="Lecturer not found")

        # Update email
        lecturer.email = data.email
        db.commit()
        db.refresh(lecturer)
        return lecturer

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/groups", response_model=List[schemas.StudentGroup])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

# Lecturers
@router.post("/lecturers", response_model=schemas.Lecturer)
def create_lecturer(data: schemas.LecturerCreate, db: Session = Depends(get_db)):
    return crud.create_lecturer(db, data)

@router.put("/lecturers/{lecturer_id}", response_model=schemas.Lecturer)
def update_lecturer(lecturer_id: int, data: schemas.LecturerCreate, db: Session = Depends(get_db)):
    try:
        return crud.update_lecturer(db, lecturer_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/lecturers/{lecturer_id}")
def remove_lecturer(lecturer_id: int, db: Session = Depends(get_db)):
    try:
        crud.delete_lecturer(db, lecturer_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/lecturers", response_model=List[schemas.Lecturer])
def list_lecturers(db: Session = Depends(get_db)):
    return crud.get_lecturers(db)

# Courses
@router.post("/courses", response_model=schemas.Course)
def create_course(data: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud.create_course(db, data)

@router.put("/courses/{course_id}", response_model=schemas.Course)
def update_course(course_id: int, data: schemas.CourseCreate, db: Session = Depends(get_db)):
    try:
        return crud.update_course(db, course_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/courses/{course_id}")
def remove_course(course_id: int, db: Session = Depends(get_db)):
    try:
        crud.delete_course(db, course_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/courses", response_model=List[schemas.Course])
def list_courses(db: Session = Depends(get_db)):
    return crud.get_courses(db)
