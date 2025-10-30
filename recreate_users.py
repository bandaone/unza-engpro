import os
import csv
import sys
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# --- Configuration ---
# Load database configuration from environment variables
DB_USER = os.getenv("POSTGRES_USER", "timetable")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "timetable")
DB_NAME = os.getenv("POSTGRES_DB", "timetable")
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

# Coordinator configuration
COORDINATOR_USERNAME = os.getenv("COORDINATOR_USERNAME", "admin")
COORDINATOR_PASSWORD = os.getenv("COORDINATOR_PASSWORD", "admin")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Password hashing context (must match the one in the main app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def recreate_users():
    """Connects to the database, reads users from hods.csv, and inserts them."""
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            print("Successfully connected to the database.")

            # Check if users table is empty
            user_count_result = connection.execute(text("SELECT COUNT(*) FROM users"))
            user_count = user_count_result.scalar_one()
            if user_count > 0:
                print(f"Found {user_count} existing users. Aborting to prevent duplicates.")
                print("If you want to run this script, please start with a fresh database.")
                sys.exit(1)

            # --- Create Coordinator ---
            print(f"Creating coordinator user: {COORDINATOR_USERNAME}")
            coordinator_hash = get_password_hash(COORDINATOR_PASSWORD)
            coordinator_user = {
                'username': COORDINATOR_USERNAME,
                'password_hash': coordinator_hash,
                'role': 'coordinator',
                'department': None,
                'is_active': True
            }
            
            trans = connection.begin()
            try:
                connection.execute(text("""
                    INSERT INTO users (username, password_hash, role, department, is_active)
                    VALUES (:username, :password_hash, :role, :department, :is_active)
                """), coordinator_user)
                print("Coordinator user created successfully.")

                # --- Create HODs from CSV ---
                with open('hods.csv', mode='r', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    users_to_insert = []
                    for row in reader:
                        users_to_insert.append({
                            'username': row['username'],
                            'password_hash': get_password_hash(row['password']),
                            'role': 'hod',
                            'department': row['department'].upper(),
                            'is_active': True
                        })
                    
                    if users_to_insert:
                        for user in users_to_insert:
                            connection.execute(text("""
                                INSERT INTO users (username, password_hash, role, department, is_active)
                                VALUES (:username, :password_hash, :role, :department, :is_active)
                            """), user)
                        print(f"Successfully inserted {len(users_to_insert)} HOD users.")
                
                trans.commit()

            except Exception as e:
                print(f"An error occurred during insertion: {e}")
                trans.rollback()

    except Exception as e:
        print(f"Failed to connect to the database or process the file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    recreate_users()
