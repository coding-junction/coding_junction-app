"""
DB migration: create otp table
"""
import asyncio
from db.session import engine
from sqlalchemy import text

async def migrate():
    print("Creating OTP table...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS otp (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR NOT NULL,
                    otp_code VARCHAR NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    is_used BOOLEAN DEFAULT FALSE
                );
            """))
        print("OTP table ready.")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
