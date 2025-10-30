from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from backend.app import models, crud, solver
from backend.app.database import Base
from backend.app import schemas


def main():
    engine = create_engine('sqlite:///./demo.db')
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    print('Creating sample rooms...')
    r1 = crud.create_room(db, schemas.RoomCreate(name='RM_SMALL', capacity=50, furniture_type='LECTURE', equipment=['projector'], availability=None))
    r2 = crud.create_room(db, schemas.RoomCreate(name='RM_LARGE', capacity=200, furniture_type='LECTURE', equipment=['projector'], availability=None))

    print('Creating sample groups...')
    g1 = crud.create_group(db, schemas.StudentGroupCreate(name='AEN-3Y', size=180, year=3, department='AEN', lecture_group=None, subgroup=None))
    g2 = crud.create_group(db, schemas.StudentGroupCreate(name='AEN-5Y', size=120, year=5, department='AEN', lecture_group=None, subgroup=None))

    print('Creating lecturer...')
    lec = crud.create_lecturer(db, schemas.LecturerCreate(name='Dr Alice', department='AEN', max_daily_load=480, availability=None))

    print('Creating courses...')
    # Normal course for 3rd year (should be scheduled)
    c1 = crud.create_course(db, schemas.CourseCreate(code='AEN 3001', name='Fluid Mechanics', weekly_hours=3, session_minutes=60, requirements=None, has_lab=False, lab_weekly_sessions=0, lab_session_minutes=180, lab_requirements=None, group_ids=[g1.id], lecturer_ids=[lec.id], shared_departments=[], shared_years=[], department='AEN'))
    # Project course for 5th year (is_project True -> not scheduled)
    c2 = crud.create_course(db, schemas.CourseCreate(code='AEN 5001', name='Final Year Project', weekly_hours=0, session_minutes=0, requirements=None, is_project=True, has_lab=False, lab_weekly_sessions=0, lab_session_minutes=0, lab_requirements=None, group_ids=[g2.id], lecturer_ids=[lec.id], shared_departments=[], shared_years=[], department='AEN'))

    # Course where group size exceeds any room capacity (g1.size=180, rm_small 50, rm_large 200 -> rm_large fits)
    # To force a room-too-small case, create a group bigger than largest room
    g_big = crud.create_group(db, schemas.StudentGroupCreate(name='BIG-3Y', size=300, year=3, department='AEN', lecture_group=None, subgroup=None))
    c3 = crud.create_course(db, schemas.CourseCreate(code='AEN 3002', name='Big Lecture', weekly_hours=2, session_minutes=60, requirements=None, has_lab=False, lab_weekly_sessions=0, lab_session_minutes=180, lab_requirements=None, group_ids=[g_big.id], lecturer_ids=[lec.id], shared_departments=[], shared_years=[], department='AEN'))

    print('Creating version and running solver...')
    v = crud.create_version(db, name='demo')
    events = solver.generate_timetable(db, v)

    print(f'Generated {len(events)} events:')
    for ev in events:
        db.refresh(ev)
        course = db.query(models.Course).get(ev.course_id)
        room = db.query(models.Room).get(ev.room_id)
        group = db.query(models.StudentGroup).get(ev.group_id)
        lecturer = db.query(models.Lecturer).get(ev.lecturer_id)
        print(f'- {course.code} for group {group.name} by {lecturer.name} in {room.name} on {ev.day} {ev.start} - {ev.end}')


if __name__ == '__main__':
    main()
