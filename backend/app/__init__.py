from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, connect_db
from app.routes import router as sales_router
from app.routes.purchases import router as purchases_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await connect_db()
    yield
    await close_db()


app: FastAPI = FastAPI(
    title="Dovatech World — Sales & Receipt API",
    description=(
        "Accepts sales data from the frontend, persists it to MongoDB, "
        "and generates professional PDF receipts via ReportLab."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# The API uses no cookies, so credentials are never allowed. (Wildcard origins
# combined with allow_credentials=True is rejected by browsers and unsafe.)
# Set CORS_ORIGINS to the site's URL in production to lock this down.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
    expose_headers=["Content-Disposition"],
)

app.include_router(sales_router, prefix="/api/v1")
app.include_router(purchases_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "Dovatech Sales API"}
