import os
from pathlib import Path

ROOT = Path(__file__).parent

FILES = {
    # Root files
    "README.md": r"""
Automated Class Timetable Generation System (MVP)

Overview
- Web-based system to generate and manage academic timetables.
- Backend: FastAPI (Python) with Google OR-Tools CP-SAT for scheduling.
- Database: PostgreSQL via SQLAlchemy ORM.
- Frontend: Static React + FullCalendar (CDN) served by FastAPI.
- Deployment: Docker Compose (PostgreSQL + Backend).

Quick Start (Docker)
1) Copy .env.example to .env and adjust credentials if needed.
2) docker compose up --build
3) Open http://localhost:8000 for the UI and http://localhost:8000/docs for API docs.

Project Structure
- backend/
  - app/
    - main.py          FastAPI app entrypoint (serves API + static frontend)
    - config.py        Settings via environment
    - database.py      SQLAlchemy engine + session
    - models.py        ORM models
    - schemas.py       Pydantic schemas
    - crud.py          CRUD helpers
    - utils.py         Validation / conflict checks
    - solver.py        OR-Tools CP-SAT timetable generator
    - routers/
      - __init__.py
      - core.py        Health + utilities
      - entities.py    CRUD endpoints (rooms, courses, groups, lecturers)
      - timetable.py   Generate + manage timetable events
    - static/
      - index.html     React + FullCalendar UI (CDN)
- docker-compose.yml   Postgres + Backend
- .env.example         Environment variables template

Notes
- This MVP implements key hard constraints in the solver: capacity, equipment, availability, no double bookings, all course hours scheduled.
- Soft constraints are included minimally and can be extended.
- The UI supports viewing the timetable and basic drag-and-drop to adjust events; conflicts are checked server-side.

""",

    ".gitignore": r"""
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.venv/
venv/
.env

# Node / Frontend
node_modules/
dist/
build/

# OS
.DS_Store
Thumbs.db

# Docker
*.pid

""",

    ".env.example": r"""
# Database
POSTGRES_USER=timetable
POSTGRES_PASSWORD=timetable
POSTGRES_DB=timetable
POSTGRES_HOST=db
POSTGRES_PORT=5432

# App
APP_HOST=0.0.0.0
APP_PORT=8000
LOG_LEVEL=info

# Solver
WEEK_DAYS=Mon,Tue,Wed,Thu,Fri
DAY_START=07:00
DAY_END=17:00
SLOT_MINUTES=60

""",

    "docker-compose.yml": r"""
version: "3.9"
services:
  db:
    image: postgres:15
    container_name: timetable_db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-timetable}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-timetable}
      - POSTGRES_DB=${POSTGRES_DB:-timetable}
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
    container_name: timetable_backend
    depends_on:
      - db
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-timetable}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-timetable}
      - POSTGRES_DB=${POSTGRES_DB:-timetable}
      - POSTGRES_HOST=${POSTGRES_HOST:-db}
      - POSTGRES_PORT=${POSTGRES_PORT:-5432}
      - APP_HOST=${APP_HOST:-0.0.0.0}
      - APP_PORT=${APP_PORT:-8000}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - WEEK_DAYS=${WEEK_DAYS:-Mon,Tue,Wed,Thu,Fri}
      - DAY_START=${DAY_START:-08:00}
      - DAY_END=${DAY_END:-17:00}
      - SLOT_MINUTES=${SLOT_MINUTES:-60}
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app:/app/app
    command: ["sh", "-c", "uvicorn app.main:app --host $${APP_HOST} --port $${APP_PORT} --reload"]

volumes:
  db_data:
""",

    # Backend Dockerfile and requirements
    "backend/Dockerfile": r"""
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
""",

    "backend/requirements.txt": r"""
fastapi==0.111.0
uvicorn[standard]==0.30.1
SQLAlchemy==2.0.30
psycopg2-binary==2.9.9
pydantic==1.10.15
python-dotenv==1.0.1
pandas==2.2.2
openpyxl==3.1.5
ortools==9.10.4067
python-multipart==0.0.9
""",

    # Backend application files
    "backend/app/config.py": r"""
import os
from typing import List

class Settings:
    def __init__(self) -> None:
        self.db_user = os.getenv("POSTGRES_USER", "timetable")
        self.db_password = os.getenv("POSTGRES_PASSWORD", "timetable")
        self.db_name = os.getenv("POSTGRES_DB", "timetable")
        self.db_host = os.getenv("POSTGRES_HOST", "db")
        self.db_port = int(os.getenv("POSTGRES_PORT", "5432"))
        self.app_host = os.getenv("APP_HOST", "0.0.0.0")
        self.app_port = int(os.getenv("APP_PORT", "8000"))
        self.log_level = os.getenv("LOG_LEVEL", "info")

        self.week_days: List[str] = [d.strip() for d in os.getenv("WEEK_DAYS", "Mon,Tue,Wed,Thu,Fri").split(",")]
        self.day_start = os.getenv("DAY_START", "08:00")
        self.day_end = os.getenv("DAY_END", "17:00")
        self.slot_minutes = int(os.getenv("SLOT_MINUTES", "60"))

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

settings = Settings()
""",

    "backend/app/database.py": r"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for FastAPI

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",

    "backend/app/models.py": r"""
from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey, Table, UniqueConstraint, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

course_groups = Table(
    "course_groups",
    Base.metadata,
    Column("course_id", ForeignKey("courses.id"), primary_key=True),
    Column("group_id", ForeignKey("student_groups.id"), primary_key=True),
)

course_lecturers = Table(
    "course_lecturers",
    Base.metadata,
    Column("course_id", ForeignKey("courses.id"), primary_key=True),
    Column("lecturer_id", ForeignKey("lecturers.id"), primary_key=True),
)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    building = Column(String, nullable=True)
    furniture_type = Column(String, nullable=True)
    equipment = Column(JSON, nullable=True)  # e.g., ["projector", "lab"]
    availability = Column(JSON, nullable=True)  # e.g., {"Mon": [["08:00","17:00"]], ...}

    events = relationship("TimetableEvent", back_populates="room")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    weekly_hours = Column(Integer, nullable=False)
    session_minutes = Column(Integer, nullable=False, default=60)  # typical duration of session
    requirements = Column(JSON, nullable=True)  # {"furniture_type": "lab", "equipment": ["projector"]}

    groups = relationship("StudentGroup", secondary=course_groups, back_populates="courses")
    lecturers = relationship("Lecturer", secondary=course_lecturers, back_populates="courses")
    events = relationship("TimetableEvent", back_populates="course")

class StudentGroup(Base):
    __tablename__ = "student_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    size = Column(Integer, nullable=False)

    courses = relationship("Course", secondary=course_groups, back_populates="groups")
    events = relationship("TimetableEvent", back_populates="group")

class Lecturer(Base):
    __tablename__ = "lecturers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    max_daily_load = Column(Integer, nullable=True)  # in minutes
    availability = Column(JSON, nullable=True)

    courses = relationship("Course", secondary=course_lecturers, back_populates="lecturers")
    events = relationship("TimetableEvent", back_populates="lecturer")

class Version(Base):
    __tablename__ = "versions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    events = relationship("TimetableEvent", back_populates="version")

class TimetableEvent(Base):
    __tablename__ = "timetable_events"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("student_groups.id"), nullable=False)
    lecturer_id = Column(Integer, ForeignKey("lecturers.id"), nullable=False)

    day = Column(String, nullable=False)  # e.g., "Mon"
    start = Column(Time, nullable=False)
    end = Column(Time, nullable=False)

    version_id = Column(Integer, ForeignKey("versions.id"), nullable=False)

    course = relationship("Course", back_populates="events")
    room = relationship("Room", back_populates="events")
    group = relationship("StudentGroup", back_populates="events")
    lecturer = relationship("Lecturer", back_populates="events")
    version = relationship("Version", back_populates="events")

    __table_args__ = (
        UniqueConstraint("room_id", "day", "start", name="uq_room_timeslot"),
        UniqueConstraint("lecturer_id", "day", "start", name="uq_lecturer_timeslot"),
        UniqueConstraint("group_id", "day", "start", name="uq_group_timeslot"),
    )
""",

    "backend/app/schemas.py": r"""
from typing import List, Optional, Any
from datetime import time, datetime
from pydantic import BaseModel, Field

# Base models

class RoomBase(BaseModel):
    name: str
    capacity: int
    building: Optional[str] = None
    furniture_type: Optional[str] = None
    equipment: Optional[List[str]] = None
    availability: Optional[dict] = None

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int
    class Config:
        orm_mode = True

class CourseBase(BaseModel):
    code: str
    name: str
    weekly_hours: int
    session_minutes: int = 60
    requirements: Optional[dict] = None

class CourseCreate(CourseBase):
    group_ids: List[int] = []
    lecturer_ids: List[int] = []

class Course(CourseBase):
    id: int
    class Config:
        orm_mode = True

class StudentGroupBase(BaseModel):
    name: str
    size: int

class StudentGroupCreate(StudentGroupBase):
    pass

class StudentGroup(StudentGroupBase):
    id: int
    class Config:
        orm_mode = True

class LecturerBase(BaseModel):
    name: str
    max_daily_load: Optional[int] = None
    availability: Optional[dict] = None

class LecturerCreate(LecturerBase):
    pass

class Lecturer(LecturerBase):
    id: int
    class Config:
        orm_mode = True

class VersionBase(BaseModel):
    name: str

class Version(VersionBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class TimetableEventBase(BaseModel):
    course_id: int
    room_id: int
    group_id: int
    lecturer_id: int
    day: str
    start: time
    end: time
    version_id: int

class TimetableEventCreate(TimetableEventBase):
    pass

class TimetableEvent(TimetableEventBase):
    id: int
    class Config:
        orm_mode = True

# DTOs
class GenerateRequest(BaseModel):
    version_name: str = Field(default="auto")

class MoveEventRequest(BaseModel):
    day: str
    start: time
    end: time
    room_id: int

""",

    "backend/app/crud.py": r"""
from typing import List, Optional
from sqlalchemy.orm import Session
from . import models, schemas

# Rooms

def create_room(db: Session, data: schemas.RoomCreate) -> models.Room:
    obj = models.Room(
        name=data.name,
        capacity=data.capacity,
        building=data.building,
        furniture_type=data.furniture_type,
        equipment=data.equipment,
        availability=data.availability,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_rooms(db: Session) -> List[models.Room]:
    return db.query(models.Room).all()

def get_room(db: Session, room_id: int) -> Optional[models.Room]:
    return db.query(models.Room).get(room_id)

def delete_room(db: Session, room_id: int) -> None:
    obj = db.query(models.Room).get(room_id)
    if obj:
        db.delete(obj)
        db.commit()

# Student Groups

def create_group(db: Session, data: schemas.StudentGroupCreate) -> models.StudentGroup:
    obj = models.StudentGroup(name=data.name, size=data.size)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_groups(db: Session) -> List[models.StudentGroup]:
    return db.query(models.StudentGroup).all()

# Lecturers

def create_lecturer(db: Session, data: schemas.LecturerCreate) -> models.Lecturer:
    obj = models.Lecturer(name=data.name, max_daily_load=data.max_daily_load, availability=data.availability)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_lecturers(db: Session) -> List[models.Lecturer]:
    return db.query(models.Lecturer).all()

# Courses

def create_course(db: Session, data: schemas.CourseCreate) -> models.Course:
    obj = models.Course(
        code=data.code,
        name=data.name,
        weekly_hours=data.weekly_hours,
        session_minutes=data.session_minutes,
        requirements=data.requirements,
    )
    if data.group_ids:
        obj.groups = db.query(models.StudentGroup).filter(models.StudentGroup.id.in_(data.group_ids)).all()
    if data.lecturer_ids:
        obj.lecturers = db.query(models.Lecturer).filter(models.Lecturer.id.in_(data.lecturer_ids)).all()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_courses(db: Session) -> List[models.Course]:
    return db.query(models.Course).all()

# Versions

def create_version(db: Session, name: str) -> models.Version:
    v = models.Version(name=name)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

def get_latest_version(db: Session) -> Optional[models.Version]:
    return db.query(models.Version).order_by(models.Version.created_at.desc()).first()

# Events

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

""",

    "backend/app/utils.py": r"""
from datetime import time
from typing import List
from sqlalchemy.orm import Session
from . import models


def overlaps(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return max(a_start, b_start) < min(a_end, b_end)


def check_conflicts(db: Session, event: models.TimetableEvent) -> List[str]:
    errors = []
    # Room capacity
    if event.room and event.group and event.room.capacity < event.group.size:
        errors.append("Room capacity is less than group size")
    # Requirements
    req = event.course.requirements or {}
    if req.get("furniture_type") and event.room.furniture_type != req["furniture_type"]:
        errors.append("Room furniture type does not meet requirement")
    needed = set(req.get("equipment", []) or [])
    have = set(event.room.equipment or [])
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
""",

    "backend/app/solver.py": r"""
from typing import List, Dict, Tuple
from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session
from ortools.sat.python import cp_model
from .config import settings
from . import models

Day = str  # e.g., "Mon"


def build_timeslots() -> List[Tuple[Day, time, time]]:
    # Build day/slot grid from env
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

    # Build sessions: each Course for each Group with each Lecturer (simple: pair first lecturer if multiple)
    sessions: List[Tuple[models.Course, models.StudentGroup, models.Lecturer, int]] = []
    for c in courses:
        if not c.groups or not c.lecturers:
            continue
        minutes_needed = c.weekly_hours * 60
        per_session = c.session_minutes or 60
        num_sessions = max(1, (minutes_needed + per_session - 1) // per_session)
        lec = c.lecturers[0]
        for g in c.groups:
            for k in range(num_sessions):
                sessions.append((c, g, lec, per_session))

    slots = build_timeslots()

    model = cp_model.CpModel()

    # Variables: x[s, r, t] in {0,1}
    x: Dict[Tuple[int, int, int], cp_model.IntVar] = {}

    # Pre-filter feasible (room, slot) pairs per session based on capacity/equipment and availability
    def ok_room_session(c: models.Course, g: models.StudentGroup, r: models.Room) -> bool:
        if r.capacity < g.size:
            return False
        req = c.requirements or {}
        if req.get("furniture_type") and r.furniture_type != req["furniture_type"]:
            return False
        needed = set(req.get("equipment", []) or [])
        have = set(r.equipment or [])
        if not needed.issubset(have):
            return False
        return True

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

    # Map of lecturer id availability for faster check
    lec_avail = {l.id: l.availability for l in lecturers}
    room_avail = {r.id: r.availability for r in rooms}

    # Create variables only for feasible triples
    for si, (c, g, l, minutes) in enumerate(sessions):
        for ri, r in enumerate(rooms):
            if not ok_room_session(c, g, r):
                continue
            for ti, (d, st, en) in enumerate(slots):
                # match session duration
                if (datetime.combine(datetime.today(), en) - datetime.combine(datetime.today(), st)).seconds // 60 != minutes:
                    continue
                if not within_availability(lec_avail.get(l.id), d, st, en):
                    continue
                if not within_availability(room_avail.get(r.id), d, st, en):
                    continue
                x[(si, ri, ti)] = model.NewBoolVar(f"x_s{si}_r{ri}_t{ti}")

    # Each session assigned exactly once
    for si, _ in enumerate(sessions):
        vars_si = [var for (s, r, t), var in x.items() if s == si]
        if not vars_si:
            # No feasible assignment - create a dummy infeasible constraint to force UNSAT and expose data issue
            model.AddBoolOr([])
        else:
            model.Add(sum(vars_si) == 1)

    # No double booking: room/day/time unique
    for ri, _ in enumerate(rooms):
        for ti, _ in enumerate(slots):
            vars_rt = [var for (s, r, t), var in x.items() if r == ri and t == ti]
            if vars_rt:
                model.Add(sum(vars_rt) <= 1)

    # No double booking: group/day/time unique
    for ti, _ in enumerate(slots):
        # group by group id across sessions
        group_idx: Dict[int, List[int]] = {}
        for si, (c, g, l, minutes) in enumerate(sessions):
            group_idx.setdefault(g.id, []).append(si)
        for gid, sis in group_idx.items():
            vars_gt = [var for (s, r, t), var in x.items() if s in sis and t == ti]
            if vars_gt:
                model.Add(sum(vars_gt) <= 1)

    # No double booking: lecturer/day/time unique
    for ti, _ in enumerate(slots):
        lec_idx: Dict[int, List[int]] = {}
        for si, (c, g, l, minutes) in enumerate(sessions):
            lec_idx.setdefault(l.id, []).append(si)
        for lid, sis in lec_idx.items():
            vars_lt = [var for (s, r, t), var in x.items() if s in sis and t == ti]
            if vars_lt:
                model.Add(sum(vars_lt) <= 1)

    # Soft constraints: simple spreading - penalize same-day multiple sessions per course/group
    penalty = []
    for ci, (course, grp, lec, minutes) in enumerate(sessions):
        for cj, (course2, grp2, lec2, minutes2) in enumerate(sessions):
            if ci >= cj:
                continue
            if course.id == course2.id and grp.id == grp2.id:
                # same course-group pair; discourage same-day assignments
                for ti, (d, st, en) in enumerate(slots):
                    for tj, (d2, st2, en2) in enumerate(slots):
                        if d == d2 and ti != tj:
                            for ri, _ in enumerate(rooms):
                                for rj, _ in enumerate(rooms):
                                    v1 = x.get((ci, ri, ti))
                                    v2 = x.get((cj, rj, tj))
                                    if v1 is not None and v2 is not None:
                                        p = model.NewBoolVar(f"pen_c{ci}_c{cj}_d{ti}")
                                        model.AddBoolAnd([v1, v2]).OnlyEnforceIf(p)
                                        model.AddBoolOr([v1.Not(), v2.Not()]).OnlyEnforceIf(p.Not())
                                        penalty.append(p)

    model.Minimize(sum(penalty))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 20.0
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("No feasible timetable could be generated with current data and constraints")

    # Build events
    events: List[models.TimetableEvent] = []
    for si, (c, g, l, minutes) in enumerate(sessions):
        assigned = None
        for (s, r, t), var in x.items():
            if s == si and solver.BooleanValue(var):
                assigned = (r, t)
                break
        if assigned is None:
            continue
        r_idx, t_idx = assigned
        room = rooms[r_idx]
        d, st, en = slots[t_idx]
        ev = models.TimetableEvent(
            course_id=c.id,
            room_id=room.id,
            group_id=g.id,
            lecturer_id=l.id,
            day=d,
            start=st,
            end=en,
            version_id=version.id,
        )
        db.add(ev)
        events.append(ev)

    db.commit()
    for e in events:
        db.refresh(e)
    return events
""",

    "backend/app/routers/__init__.py": "",

    "backend/app/routers/core.py": r"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}
""",

    "backend/app/routers/entities.py": r"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, Base, engine
from .. import crud, schemas, models

# Create tables (for MVP; in production use Alembic)
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/entities", tags=["entities"])

# Rooms
@router.post("/rooms", response_model=schemas.Room)
def create_room(data: schemas.RoomCreate, db: Session = Depends(get_db)):
    return crud.create_room(db, data)

@router.get("/rooms", response_model=List[schemas.Room])
def list_rooms(db: Session = Depends(get_db)):
    return crud.get_rooms(db)

# Groups
@router.post("/groups", response_model=schemas.StudentGroup)
def create_group(data: schemas.StudentGroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db, data)

@router.get("/groups", response_model=List[schemas.StudentGroup])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

# Lecturers
@router.post("/lecturers", response_model=schemas.Lecturer)
def create_lecturer(data: schemas.LecturerCreate, db: Session = Depends(get_db)):
    return crud.create_lecturer(db, data)

@router.get("/lecturers", response_model=List[schemas.Lecturer])
def list_lecturers(db: Session = Depends(get_db)):
    return crud.get_lecturers(db)

# Courses
@router.post("/courses", response_model=schemas.Course)
def create_course(data: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud.create_course(db, data)

@router.get("/courses", response_model=List[schemas.Course])
def list_courses(db: Session = Depends(get_db)):
    return crud.get_courses(db)
""",

    "backend/app/routers/timetable.py": r"""
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
def list_events(version_id: Optional[int] = None, db: Session = Depends(get_db)):
    if version_id is None:
        v = crud.get_latest_version(db)
        if not v:
            return []
        version_id = v.id
    return crud.get_events(db, version_id)

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
""",

    "backend/app/main.py": r"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import core, entities, timetable

app = FastAPI(title="Automated Timetable System", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core.router)
app.include_router(entities.router)
app.include_router(timetable.router)

# Serve static frontend
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
""",

    # Frontend - static React + FullCalendar (CDN) served by FastAPI
    "backend/app/static/index.html": r"""
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Automated Timetable</title>
    <link href="https://cdn.jsdelivr.net/npm/@mui/material@5.15.18/dist/material.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css" rel="stylesheet" />
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif; margin: 0; }
      header { padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; gap: 12px; align-items: center; }
      .container { padding: 12px; }
      #calendar { max-width: 1200px; margin: 0 auto; }
      .status { color: #666; font-size: 13px; }
      .btn { padding: 8px 10px; background: #1976d2; color: white; border-radius: 6px; border: none; cursor: pointer; }
      .btn:disabled { background: #90caf9; cursor: not-allowed; }
      .toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
      .row { display: flex; gap: 8px; align-items: center; }
      input, select { padding: 6px 8px; }
    </style>
  </head>
  <body>
    <header>
      <h3 style="margin:0;">Automated Timetable</h3>
      <div class="toolbar">
        <button id="generateBtn" class="btn">Generate Timetable</button>
        <span id="status" class="status"></span>
      </div>
    </header>
    <div class="container">
      <div id="calendar"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js"></script>

    <script>
      const statusEl = document.getElementById('status');
      const generateBtn = document.getElementById('generateBtn');

      function setStatus(msg) { statusEl.textContent = msg || ''; }

      async function fetchEvents() {
        const res = await axios.get('/timetable/events');
        return res.data.map(ev => ({
          id: String(ev.id),
          title: `C${ev.course_id} G${ev.group_id} R${ev.room_id}`,
          daysOfWeek: [], // we will render as timed events for a specific week
          startRecur: null,
          endRecur: null,
          start: toDate(ev.day, ev.start),
          end: toDate(ev.day, ev.end),
          extendedProps: ev,
        }));
      }

      // Convert day string + time to next occurrence in current week
      function toDate(dayStr, timeStr) {
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const now = new Date();
        const targetDow = days.indexOf(dayStr);
        let d = new Date(now);
        d.setHours(0,0,0,0);
        // move to Monday of current week
        const currentDow = d.getDay();
        const mondayOffset = (currentDow + 6) % 7; // 0 for Mon
        d.setDate(d.getDate() - mondayOffset);
        // move to target dow
        const offset = (targetDow + 6) % 7; // Mon=1 -> 0
        d.setDate(d.getDate() + offset);
        const [hh, mm, ss] = String(timeStr).split(':');
        d.setHours(parseInt(hh||'0'), parseInt(mm||'0'), parseInt(ss||'0'));
        return d;
      }

      async function renderCalendar() {
        const events = await fetchEvents();
        const calendarEl = document.getElementById('calendar');
        const calendar = new FullCalendar.Calendar(calendarEl, {
          initialView: 'timeGridWeek',
          slotMinTime: '08:00:00',
          slotMaxTime: '20:00:00',
          nowIndicator: true,
          editable: true,
          droppable: false,
          eventOverlap: false,
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,dayGridMonth'
          },
          events,
          eventDrop: async (info) => {
            const ev = info.event;
            const start = ev.start;
            const end = ev.end;
            const dayStr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][start.getDay()];
            try {
              const payload = {
                day: dayStr,
                start: start.toTimeString().slice(0,8),
                end: end.toTimeString().slice(0,8),
                room_id: ev.extendedProps.room_id,
              };
              setStatus('Saving change...');
              const res = await axios.post(`/timetable/events/${ev.id}/move`, payload);
              setStatus('Saved.');
            } catch (e) {
              setStatus((e.response && e.response.data && e.response.data.detail) || 'Error saving.');
              info.revert();
            }
          }
        });
        calendar.render();
      }

      generateBtn.addEventListener('click', async () => {
        try {
          setStatus('Generating...');
          await axios.post('/timetable/generate', { version_name: 'auto' });
          setStatus('Generated. Reloading...');
          await renderCalendar();
          setStatus('');
        } catch (e) {
          setStatus((e.response && e.response.data && e.response.data.detail) || 'Generation failed');
        }
      });

      renderCalendar();
    </script>
  </body>
</html>
""",
}


def write_files():
    for rel_path, content in FILES.items():
        path = ROOT / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content.lstrip("\n"))
        print(f"Wrote {path}")

if __name__ == "__main__":
    write_files()
