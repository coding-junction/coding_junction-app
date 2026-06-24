import asyncio
from sqlmodel import select, text
from db.session import engine, init_db
from models.user import User

async def check_db():
    print("Checking database connection...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("Connection successful!")
            
            print("Checking for tables...")
            await init_db()
            print("Database initialized (tables created if missing).")
            
            async with engine.begin() as conn:
                # Try to count users
                try:
                    res = await conn.execute(text("SELECT count(*) FROM \"user\""))
                    count = res.scalar()
                    print(f"Current user count: {count}")
                except Exception as e:
                    print(f"Error querying users table: {e}")
                    
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
