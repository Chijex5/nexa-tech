from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import close_db, connect_db
from app.routes import router as sales_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await connect_db()
    yield
    await close_db()


app: FastAPI = FastAPI(
    title="NexaTech World — Sales & Receipt API",
    description=(
        "Accepts sales data from the frontend, persists it to MongoDB, "
        "and generates professional PDF receipts via ReportLab."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sales_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "NexaTech Sales API"}
