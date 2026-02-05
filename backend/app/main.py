from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import guide, poems, feedback, revisions


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SME Poetry Feedback Loop",
    description="AI-powered poetry generation with SME feedback integration",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(guide.router)
app.include_router(poems.router)
app.include_router(feedback.router)
app.include_router(revisions.router)


@app.get("/")
async def root():
    return {"message": "SME Poetry Feedback Loop API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
