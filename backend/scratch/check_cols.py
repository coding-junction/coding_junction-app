import asyncio
from sqlalchemy import text
from db.session import engine

async def check_columns():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'user'"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Columns in 'user' table: {columns}")
        
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'event'"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Columns in 'event' table: {columns}")

if __name__ == "__main__":
    asyncio.run(check_columns())
