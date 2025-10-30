import csv
import os
from alembic import op
from sqlalchemy import text, table, column, String, Boolean
from passlib.context import CryptContext

# Alembic revision identifiers
revision = '001'
down_revision = 'c14cfd07d476'  # Link to the previous migration
branch_labels = None
depends_on = None

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def upgrade() -> None:
    """Seeds the database with initial users if the users table is empty."""
    bind = op.get_bind()
    result = bind.execute(text("SELECT COUNT(id) FROM users")).scalar_one_or_none()

    if result is not None and result > 0:
        print("Users table is not empty, skipping initial data seed.")
        return

    print("Users table is empty, seeding initial data...")

    users_table = table('users',
        column('username', String),
        column('password_hash', String),
        column('role', String),
        column('department', String),
        column('is_active', Boolean)
    )

    # --- Create Coordinator User ---
    coordinator_username = os.getenv("COORDINATOR_USERNAME", "admin")
    coordinator_password = os.getenv("COORDINATOR_PASSWORD", "admin")
    coordinator_hash = get_password_hash(coordinator_password)
    
    op.bulk_insert(users_table, [
        {
            'username': coordinator_username,
            'password_hash': coordinator_hash,
            'role': 'coordinator',
            'department': None,
            'is_active': True
        }
    ])
    print(f"Coordinator '{coordinator_username}' created.")

    # --- Create HOD Users from CSV ---
    hods_to_insert = []
    try:
        # Alembic runs from the project root, so the path is correct
        with open('hods.csv', mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                hods_to_insert.append({
                    'username': row['username'],
                    'password_hash': get_password_hash(row['password']),
                    'role': 'hod',
                    'department': row['department'].upper(),
                    'is_active': True
                })
        
        if hods_to_insert:
            op.bulk_insert(users_table, hods_to_insert)
            print(f"Successfully inserted {len(hods_to_insert)} HOD users from hods.csv.")

    except FileNotFoundError:
        print("Warning: hods.csv not found. Skipping HOD user creation.")

def downgrade() -> None:
    """Removes the seeded data. A simple approach is to delete all users."""
    op.execute("DELETE FROM users")
    print("All users have been deleted.")
