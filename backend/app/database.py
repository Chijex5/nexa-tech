import logging
from datetime import timezone

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)


class _Database:
    client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
    db: AsyncIOMotorDatabase | None = None  # type: ignore[type-arg]


_db = _Database()


async def connect_db() -> None:
    # tz_aware makes datetimes come back as UTC-aware, so the API returns
    # "...+00:00" and browsers show the correct local time instead of
    # treating a naive UTC timestamp as local time.
    _db.client = AsyncIOMotorClient(
        settings.mongodb_uri, tz_aware=True, tzinfo=timezone.utc
    )
    _db.db = _db.client[settings.database_name]
    await ensure_indexes(_db.db)


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
    """Create the indexes the app relies on. Never fatal on failure."""
    specs = [
        ("sales", [("created_at", -1)], {}),
        ("sales", [("customer_phone", 1)], {}),
        ("sales", [("invoice_number", 1)], {}),
        ("purchases", [("purchase_at", -1)], {}),
        ("purchases", [("items.serial_key", 1)], {}),
        ("purchases", [("items.sold_sale_id", 1)], {}),
        ("purchases", [("ref", 1)], {"unique": True}),
    ]
    for collection, keys, opts in specs:
        try:
            await db[collection].create_index(keys, **opts)
        except Exception:  # noqa: BLE001 - index creation must not stop the API
            logger.warning("Could not create index %s on %s", keys, collection, exc_info=True)


async def close_db() -> None:
    if _db.client is not None:
        _db.client.close()


def get_db() -> AsyncIOMotorDatabase:  # type: ignore[type-arg]
    if _db.db is None:
        raise RuntimeError("Database is not connected. Call connect_db() first.")
    return _db.db
