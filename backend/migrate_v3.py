import asyncio
import os
import sys

# Add the current directory to sys.path so we can import modules
sys.path.append(os.getcwd())

from sqlalchemy import text
from db.session import engine, init_db
from models.user import User
from models.event import Event
from models.quiz import Quiz
from models.poll import Poll
from models.response import QuizResponse, PollResponse

async def migrate():
    print("Starting migration v3...")
    async with engine.begin() as conn:
        # Add columns to 'user' table
        print("Updating 'user' table...")
        try:
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS roll_no VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS batch VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_core_member BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS id_card_path VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS profile_image_path VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS fcm_token VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS welcome_shown BOOLEAN DEFAULT FALSE"))
            print("User table updated.")
        except Exception as e:
            print(f"Error updating user table: {e}")

        # Add columns to 'event' table
        print("Updating 'event' table...")
        try:
            await conn.execute(text("ALTER TABLE \"event\" ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE"))
            print("Event table updated.")
        except Exception as e:
            print(f"Error updating event table: {e}")

    # Now create new tables (Quiz, Poll, etc.)
    print("Creating new tables if they don't exist...")
    await init_db()
    print("Migration v3 complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
