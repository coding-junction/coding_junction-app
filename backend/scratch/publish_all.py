import asyncio
from sqlalchemy import text
from db.session import engine

async def check_and_publish():
    async with engine.begin() as conn:
        # Check Events
        result = await conn.execute(text("SELECT id, name, is_published FROM event"))
        events = result.fetchall()
        print(f"Events: {events}")
        
        # Check Polls
        result = await conn.execute(text("SELECT id, question, is_published FROM poll"))
        polls = result.fetchall()
        print(f"Polls: {polls}")
        
        # Check Quizzes
        result = await conn.execute(text("SELECT id, title, is_published FROM quiz"))
        quizzes = result.fetchall()
        print(f"Quizzes: {quizzes}")
        
        # Publish all for testing
        print("Publishing all items for testing...")
        await conn.execute(text("UPDATE event SET is_published = TRUE"))
        await conn.execute(text("UPDATE poll SET is_published = TRUE"))
        await conn.execute(text("UPDATE quiz SET is_published = TRUE"))
        print("All items published.")

if __name__ == "__main__":
    asyncio.run(check_and_publish())
