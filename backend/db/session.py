from sqlmodel import create_engine, SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from core.config import settings

# Ensure we use the asyncpg driver
db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine for normal operations with PgBouncer fix
engine = create_async_engine(
    db_url, 
    echo=False, 
    future=True,
    pool_size=50,
    max_overflow=100,
    pool_timeout=30,
    # This dictionary disables the statement cache to prevent the PgBouncer crash
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
)

# Session factory
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # Create all tables (In production, use Alembic instead)
        await conn.run_sync(SQLModel.metadata.create_all)