import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from db.session import init_db
from api.routes import auth, users, tests, ai, notifications, events, submissions, quiz, poll
from fastapi.staticfiles import StaticFiles
import os

# Ensure uploads directory exists at startup
os.makedirs("uploads/id_cards", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Checking database connection...")
    try:
        await init_db()
        print("Database connected!")
    except Exception as e:
        print(f"Database error on startup: {e}")
        # This prevents the 'Status 3' crash by letting the app start anyway
    yield
    # Cleanup on shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
app.include_router(tests.router, prefix=f"{settings.API_V1_STR}/tests", tags=["tests"])
app.include_router(submissions.router, prefix=f"{settings.API_V1_STR}/submissions", tags=["submissions"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(quiz.router, prefix=f"{settings.API_V1_STR}/quiz", tags=["quiz"])
app.include_router(poll.router, prefix=f"{settings.API_V1_STR}/poll", tags=["poll"])

from fastapi import WebSocket, WebSocketDisconnect
from core.websocket import manager

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Discard any client messages, keep-alive only
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def root():
    return {"message": "Welcome to Coding Junction API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
