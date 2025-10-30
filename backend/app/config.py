import os
from typing import List

class Settings:
    def __init__(self) -> None:
        self.SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_changed_in_production")
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
        # Lunch window (reserved): slots starting at/after this time and before LUNCH_END will be treated as lunch
        self.lunch_start = os.getenv("LUNCH_START", "13:00")
        self.lunch_end = os.getenv("LUNCH_END", "14:00")

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

settings = Settings()
