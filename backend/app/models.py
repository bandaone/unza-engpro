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
    department = Column(String, nullable=True)  # primary owning department (for scoping)

    # Lecture configuration
    weekly_hours = Column(Integer, nullable=False)  # total lecture hours per week
    session_minutes = Column(Integer, nullable=False, default=60)  # default lecture session duration
    requirements = Column(JSON, nullable=True)  # lecture requirements {"furniture_type": "lecture", "equipment": ["projector"]}
    # Project course flag: true for capstone/project courses (typically year 5); these are not assigned venues by the solver
    is_project = Column(Boolean, nullable=False, default=False)

    # Lab configuration
    has_lab = Column(Boolean, nullable=False, default=False)
    lab_weekly_sessions = Column(Integer, nullable=False, default=0)  # number of lab sessions per week
    lab_session_minutes = Column(Integer, nullable=False, default=180)  # duration of each lab session
    lab_requirements = Column(JSON, nullable=True)  # lab-specific requirements

    groups = relationship("StudentGroup", secondary=course_groups, back_populates="courses")
    lecturers = relationship("Lecturer", secondary=course_lecturers, back_populates="courses")
    events = relationship("TimetableEvent", back_populates="course")

class StudentGroup(Base):
    __tablename__ = "student_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # allow duplicate names (e.g., "2Y")
    size = Column(Integer, nullable=False)
    # Reporting metadata
    year = Column(Integer, nullable=True)  # 2,3,4,5, etc.
    department = Column(String, nullable=True)  # e.g., GEN, AEN, CEE, EEE, GEE, MEC
    lecture_group = Column(String, nullable=True)  # e.g., LG1, LG2
    subgroup = Column(String, nullable=True)  # e.g., A, B, C, D (lab/tutorial group)
    track = Column(String, nullable=True)  # specialization/track for years 4-5 (e.g., EEE: ET, MP)

    courses = relationship("Course", secondary=course_groups, back_populates="groups")
    events = relationship("TimetableEvent", back_populates="group")

class Lecturer(Base):
    __tablename__ = "lecturers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)  # Optional but unique if provided
    department = Column(String, nullable=True)
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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="hod")  # hod | coordinator | delegate
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String, nullable=False)  # departmental | global
    issue_type = Column(String, nullable=False)  # e.g., room_overbook, lecturer_double_book, missing_field
    severity = Column(String, nullable=False, default="warning")  # info | warning | error
    status = Column(String, nullable=False, default="open")  # open | assigned | resolved
    message = Column(String, nullable=False)
    department = Column(String, nullable=True)  # owning/affected department (if applicable)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("student_groups.id"), nullable=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.id"), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    version_id = Column(Integer, ForeignKey("versions.id"), nullable=True)

    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ChangeLog(Base):
    __tablename__ = "change_logs"
    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String, nullable=False)  # e.g., room, course, group, lecturer, event
    entity_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)  # create | update | delete
    before = Column(JSON, nullable=True)
    after = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
