"""Phones bought in from sellers / suppliers ("purchases").

Each purchase records who the phones came from, what was paid and how, so the
shop can always prove where a phone came from. When a phone with the same
serial / IMEI is later sold, the purchase item is linked to that sale so the
app can show who it was sold to and the profit made.
"""

from __future__ import annotations

import datetime
from typing import Any, AsyncIterator

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import PURCHASES_COLLECTION, SaleDocument
from app.schemas import (
    CreatePurchaseRequest,
    PurchaseItemOut,
    PurchaseListPage,
    PurchaseOut,
    PurchaseSoldInfo,
)
from app.utils import (
    date_range_filter,
    day_start_utc,
    generate_unique_number,
    lagos_today,
    parse_date,
    search_regex,
    serial_key,
    serial_regex,
)

STATUS_IN_STOCK = "in_stock"
STATUS_SOLD = "sold"


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.timezone.utc)


# ── Conversions ───────────────────────────────────────────────────────────────

def _sold_info(item: dict[str, Any]) -> PurchaseSoldInfo | None:
    sold = item.get("sold")
    if not sold:
        return None
    return PurchaseSoldInfo(
        sale_id=sold.get("sale_id", ""),
        invoice_number=sold.get("invoice_number", ""),
        customer_name=sold.get("customer_name", ""),
        customer_phone=sold.get("customer_phone", ""),
        sold_price=float(sold.get("sold_price", 0) or 0),
        is_swap=bool(sold.get("is_swap", False)),
        sold_at=sold.get("sold_at") or _utc_now(),
    )


def _item_profit(item: dict[str, Any]) -> float | None:
    sold = item.get("sold")
    if not sold or sold.get("is_swap"):
        return None
    return round(float(sold.get("sold_price", 0) or 0) - float(item.get("cost_price", 0)), 2)


def to_purchase_out(raw: dict[str, Any]) -> PurchaseOut:
    items = [
        PurchaseItemOut(
            description=i.get("description", ""),
            serial=i.get("serial", ""),
            colour=i.get("colour", ""),
            cost_price=float(i.get("cost_price", 0)),
            sold=_sold_info(i),
            profit=_item_profit(i),
        )
        for i in raw.get("items", [])
    ]
    return PurchaseOut(
        id=str(raw["_id"]),
        ref=raw.get("ref", ""),
        seller_name=raw.get("seller_name", ""),
        seller_phone=raw.get("seller_phone", ""),
        payment_method=raw.get("payment_method", ""),
        purchase_date=raw.get("purchase_date", ""),
        staff_name=raw.get("staff_name", ""),
        notes=raw.get("notes", ""),
        items=items,
        total=float(raw.get("total", 0)),
        created_at=raw.get("created_at") or _utc_now(),
    )


def _sale_snapshot(sale: dict[str, Any] | SaleDocument, item: Any) -> dict[str, Any]:
    """What we store on a purchase item once its phone is sold."""
    if isinstance(sale, SaleDocument):
        sale_id, invoice, name, phone, created = (
            str(sale._id), sale.invoice_number, sale.customer_name,
            sale.customer_phone, sale.created_at,
        )
        price, is_swap = item.unit_price, item.is_swap
    else:
        sale_id, invoice, name, phone, created = (
            str(sale["_id"]), sale.get("invoice_number", ""), sale.get("customer_name", ""),
            sale.get("customer_phone", ""), sale.get("created_at"),
        )
        price, is_swap = item.get("unit_price", 0), item.get("is_swap", False)
    return {
        "sale_id": sale_id,
        "invoice_number": invoice,
        "customer_name": name,
        "customer_phone": phone,
        "sold_price": float(price),
        "is_swap": bool(is_swap),
        "sold_at": created,
    }


# ── Linking purchases ⇄ sales by serial / IMEI ────────────────────────────────

async def _find_sale_for_serial(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    serial: str,
    since: datetime.datetime,
    taken_sale_ids: set[str],
) -> dict[str, Any] | None:
    """Earliest sale of ``serial`` on/after ``since`` that isn't linked yet."""
    cursor = (
        db[SaleDocument.COLLECTION]
        .find({"items.serial": serial_regex(serial), "created_at": {"$gte": since}})
        .sort("created_at", 1)
        .limit(20)
    )
    async for sale in cursor:
        if str(sale["_id"]) in taken_sale_ids:
            continue
        already = await db[PURCHASES_COLLECTION].count_documents(
            {"items.sold.sale_id": str(sale["_id"]), "items.serial_key": serial_key(serial)},
            limit=1,
        )
        if not already:
            return sale
    return None


async def link_sale_to_purchases(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    sale: SaleDocument,
) -> None:
    """Mark the in-stock purchase item for each sold serial as sold."""
    for item in sale.items:
        key = serial_key(item.serial)
        if not key:
            continue
        raw = await db[PURCHASES_COLLECTION].find_one(
            {
                "items": {"$elemMatch": {"serial_key": key, "sold": None}},
                "purchase_at": {"$lte": sale.created_at},
            },
            sort=[("purchase_at", -1)],
        )
        if raw is None:
            continue
        items = raw["items"]
        for p_item in items:
            if p_item.get("serial_key") == key and not p_item.get("sold"):
                p_item["sold"] = _sale_snapshot(sale, item)
                break
        await db[PURCHASES_COLLECTION].update_one(
            {"_id": raw["_id"]}, {"$set": {"items": items}}
        )


async def _link_new_purchase_items(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    items: list[dict[str, Any]],
    purchase_at: datetime.datetime,
) -> None:
    """For a purchase recorded late, attach sales that already happened."""
    taken: set[str] = set()
    for p_item in items:
        if not p_item["serial_key"]:
            continue
        sale = await _find_sale_for_serial(db, p_item["serial"], purchase_at, taken)
        if sale is None:
            continue
        key = p_item["serial_key"]
        sale_item = next(
            (i for i in sale.get("items", []) if serial_key(i.get("serial", "")) == key),
            None,
        )
        if sale_item is None:
            continue
        p_item["sold"] = _sale_snapshot(sale, sale_item)
        taken.add(str(sale["_id"]))


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_purchase(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    payload: CreatePurchaseRequest,
) -> PurchaseOut:
    collection = db[PURCHASES_COLLECTION]

    async def _ref_taken(ref: str) -> bool:
        return await collection.count_documents({"ref": ref}, limit=1) > 0

    day = parse_date(payload.purchase_date) or lagos_today()
    now = _utc_now()
    # Same-day purchases keep the real time so ordering within a day is right.
    purchase_at = now if day == lagos_today() else day_start_utc(day)

    items = [
        {
            "description": i.description,
            "serial": i.serial,
            "serial_key": serial_key(i.serial),
            "colour": i.colour,
            "cost_price": round(i.cost_price, 2),
            "sold": None,
        }
        for i in payload.items
    ]
    await _link_new_purchase_items(db, items, day_start_utc(day))

    doc: dict[str, Any] = {
        "_id": ObjectId(),
        "ref": await generate_unique_number("PUR", _ref_taken),
        "seller_name": payload.seller_name.upper(),
        "seller_phone": payload.seller_phone,
        "payment_method": payload.payment_method,
        "purchase_date": day.isoformat(),
        "purchase_at": purchase_at,
        "staff_name": payload.staff_name,
        "notes": payload.notes,
        "items": items,
        "total": round(sum(i["cost_price"] for i in items), 2),
        "created_at": now,
    }
    await collection.insert_one(doc)
    return to_purchase_out(doc)


async def get_purchase(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    purchase_id: str,
) -> PurchaseOut | None:
    if not ObjectId.is_valid(purchase_id):
        return None
    raw = await db[PURCHASES_COLLECTION].find_one({"_id": ObjectId(purchase_id)})
    return to_purchase_out(raw) if raw else None


async def delete_purchase(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    purchase_id: str,
) -> bool:
    if not ObjectId.is_valid(purchase_id):
        return False
    result = await db[PURCHASES_COLLECTION].delete_one({"_id": ObjectId(purchase_id)})
    return result.deleted_count > 0


async def purchases_for_sale(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    sale_id: str,
) -> list[PurchaseOut]:
    """Purchases containing a phone that was sold in ``sale_id``."""
    cursor = db[PURCHASES_COLLECTION].find({"items.sold.sale_id": sale_id}).limit(50)
    return [to_purchase_out(raw) async for raw in cursor]


def build_purchase_filter(
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    query: dict[str, Any] = date_range_filter("purchase_at", date_from, date_to)
    if q and q.strip():
        rx = search_regex(q)
        query["$or"] = [
            {"ref": rx},
            {"seller_name": rx},
            {"seller_phone": rx},
            {"staff_name": rx},
            {"payment_method": rx},
            {"notes": rx},
            {"items.description": rx},
            {"items.serial": rx},
            {"items.colour": rx},
        ]
    if status == STATUS_IN_STOCK:
        query["items"] = {"$elemMatch": {"sold": None}}
    elif status == STATUS_SOLD:
        query["items"] = {"$elemMatch": {"sold": {"$ne": None}}}
    return query


async def list_purchases(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    skip: int = 0,
    limit: int = 20,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> PurchaseListPage:
    collection = db[PURCHASES_COLLECTION]
    query = build_purchase_filter(q, date_from, date_to, status)

    cursor = collection.find(query).sort("purchase_at", -1).skip(skip).limit(limit)
    page = [to_purchase_out(raw) async for raw in cursor]

    # Totals across everything that matches (not just this page). A shop's
    # purchase book is small, so a projection scan is simple and fast enough.
    total = phone_count = in_stock = 0
    total_amount = profit = 0.0
    async for raw in collection.find(query, {"items": 1, "total": 1}):
        total += 1
        total_amount += float(raw.get("total", 0))
        for item in raw.get("items", []):
            phone_count += 1
            if not item.get("sold"):
                in_stock += 1
            else:
                item_profit = _item_profit(item)
                if item_profit is not None:
                    profit += item_profit

    return PurchaseListPage(
        items=page,
        total=total,
        total_amount=round(total_amount, 2),
        phone_count=phone_count,
        in_stock=in_stock,
        profit=round(profit, 2),
        skip=skip,
        limit=limit,
    )


async def iter_purchases_for_export(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    query: dict[str, Any],
    max_rows: int,
) -> AsyncIterator[PurchaseOut]:
    cursor = db[PURCHASES_COLLECTION].find(query).sort("purchase_at", -1).limit(max_rows)
    async for raw in cursor:
        yield to_purchase_out(raw)
