from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings


class _Database:
    client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
    db: AsyncIOMotorDatabase | None = None  # type: ignore[type-arg]


_db = _Database()


async def connect_db() -> None:
    _db.client = AsyncIOMotorClient(settings.mongodb_uri)
    _db.db = _db.client[settings.database_name]


async def close_db() -> None:
    if _db.client is not None:
        _db.client.close()


def get_db() -> AsyncIOMotorDatabase:  # type: ignore[type-arg]
    if _db.db is None:
        raise RuntimeError("Database is not connected. Call connect_db() first.")
    return _db.db
