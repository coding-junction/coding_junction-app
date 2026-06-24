import asyncio
from sqlmodel import select
from db.session import engine, init_db, get_session
from models.user import User
from core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession

async def seed_admin():
    print("Seeding default admin...")
    await init_db()
    
    async with AsyncSession(engine) as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.email == "ranadebsaha@coding-junction.in"))
        admin = result.scalar_one_or_none()
        
        if admin:
            print("Admin already exists. Updating password and role...")
            admin.hashed_password = get_password_hash("rds1234")
            admin.is_admin = True
            admin.is_verified = True
            session.add(admin)
        else:
            print("Creating new admin user...")
            new_admin = User(
                email="ranadebsaha@coding-junction.in",
                full_name="Default Admin",
                hashed_password=get_password_hash("rds1234"),
                is_admin=True,
                is_verified=True,
            )
            session.add(new_admin)
            
        await session.commit()
        print("Admin seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_admin())
