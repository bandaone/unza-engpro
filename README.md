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

