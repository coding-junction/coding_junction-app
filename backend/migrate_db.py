import asyncio
import asyncpg
from core.config import settings

async def migrate():
    # Replace connection scheme for asyncpg direct connection
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    elif db_url.startswith("postgresql://"):
        pass
    else:
        # Fallback default
        db_url = "postgresql://postgres:postgres@localhost:5432/coding_junction"

    print(f"Connecting to database to apply migrations...")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    statements = [
        # Alter question table
        'ALTER TABLE "question" ADD COLUMN IF NOT EXISTS explanation TEXT;',
        
        # Alter user table
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_status VARCHAR DEFAULT \'unverified\';',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_document_type VARCHAR;',
        
        # Alter poll table
        'ALTER TABLE "poll" ADD COLUMN IF NOT EXISTS creator_id UUID;',
        
        # Alter quiz table
        'ALTER TABLE "quiz" ADD COLUMN IF NOT EXISTS creator_id UUID;',
        
        # Alter event table
        'ALTER TABLE "event" ADD COLUMN IF NOT EXISTS creator_id UUID;',
        
        # Alter otp table
        'ALTER TABLE "otp" ADD COLUMN IF NOT EXISTS action_type VARCHAR;',

        # Create performance indexes
        'CREATE INDEX IF NOT EXISTS idx_event_is_published ON "event" (is_published);',
        'CREATE INDEX IF NOT EXISTS idx_event_creator_id ON "event" (creator_id);',
        'CREATE INDEX IF NOT EXISTS idx_quiz_is_published ON "quiz" (is_published);',
        'CREATE INDEX IF NOT EXISTS idx_quiz_creator_id ON "quiz" (creator_id);',
        'CREATE INDEX IF NOT EXISTS idx_question_quiz_id ON "question" (quiz_id);',
        'CREATE INDEX IF NOT EXISTS idx_option_question_id ON "option" (question_id);',
        'CREATE INDEX IF NOT EXISTS idx_poll_is_published ON "poll" (is_published);',
        'CREATE INDEX IF NOT EXISTS idx_poll_creator_id ON "poll" (creator_id);',
        'CREATE INDEX IF NOT EXISTS idx_polloption_poll_id ON "polloption" (poll_id);',
        'CREATE INDEX IF NOT EXISTS idx_quizresponse_user_id ON "quizresponse" (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_quizresponse_quiz_id ON "quizresponse" (quiz_id);',
        'CREATE INDEX IF NOT EXISTS idx_quizresponse_question_id ON "quizresponse" (question_id);',
        'CREATE INDEX IF NOT EXISTS idx_quizresponse_option_id ON "quizresponse" (option_id);',
        'CREATE INDEX IF NOT EXISTS idx_pollresponse_user_id ON "pollresponse" (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_pollresponse_poll_id ON "pollresponse" (poll_id);',
        'CREATE INDEX IF NOT EXISTS idx_pollresponse_option_id ON "pollresponse" (option_id);'
    ]

    for stmt in statements:
        try:
            await conn.execute(stmt)
            print(f"SUCCESS: {stmt}")
        except Exception as e:
            print(f"FAILED: {stmt} | Error: {e}")

    await conn.close()
    print("Database migrations applied successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
