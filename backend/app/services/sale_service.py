from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import SaleDocument, SaleItemDocument
from app.schemas import (
    CreateSaleRequest,
    CreateSaleResponse,
    SaleItemOut,
    SaleListItem,
    SaleListPage,
    SaleOut,
    SwapDevice,
)
from app.services.purchase_service import link_sale_to_purchases
from app.services.receipt_generator import (
    ReceiptData,
    ReceiptItem,
    ReceiptSwapDevice,
    generate_receipt,
)
from app.utils import (
    date_range_filter,
    generate_unique_number,
    search_regex,
    today_str,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ReceiptPdf:
    content: bytes
    filename: str


def _doc_to_sale_out(doc: SaleDocument) -> SaleOut:
    return SaleOut(
        id=str(doc._id),
        invoice_number=doc.invoice_number,
        invoice_date=doc.invoice_date,
        customer_name=doc.customer_name,
        customer_phone=doc.customer_phone,
        staff_name=doc.staff_name,
        payment_method=doc.payment_method,
        items=[
            SaleItemOut(
                description=i.description,
                serial=i.serial,
                colour=i.colour,
                qty=i.qty,
                unit_price=i.unit_price,
                amount=i.amount,
                is_swap=i.is_swap,
                swap_from_devices=[SwapDevice(**d) for d in i.swap_from_devices],
            )
            for i in doc.items
        ],
        subtotal=doc.subtotal,
        created_at=doc.created_at,
    )


async def create_sale(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    payload: CreateSaleRequest,
) -> CreateSaleResponse:
    items: list[SaleItemDocument] = [
        SaleItemDocument(
            description=item.description,
            serial=item.serial,
            colour=item.colour,
            qty=item.qty,
            unit_price=item.unit_price,
            is_swap=item.is_swap,
            swap_from_devices=[d.model_dump() for d in item.swap_from_devices],
        )
        for item in payload.items
    ]

    collection = db[SaleDocument.COLLECTION]

    async def _invoice_taken(number: str) -> bool:
        return await collection.count_documents({"invoice_number": number}, limit=1) > 0

    doc = SaleDocument(
        invoice_number=await generate_unique_number("NTW", _invoice_taken),
        invoice_date=today_str(),
        customer_name=payload.customer_name.upper(),
        customer_phone=payload.customer_phone,
        staff_name=payload.staff_name,
        payment_method=payload.payment_method,
        items=items,
    )

    await collection.insert_one(doc.to_dict())

    # Link sold phones back to the purchase they were bought in with (by IMEI).
    # A failure here must never lose the sale that was just saved.
    try:
        await link_sale_to_purchases(db, doc)
    except Exception:  # noqa: BLE001
        logger.exception("Could not link sale %s to purchases", doc.invoice_number)

    sale_out: SaleOut = _doc_to_sale_out(doc)
    return CreateSaleResponse(message="Sale created successfully.", sale=sale_out)


async def get_sale_by_id(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    sale_id: str,
) -> SaleOut | None:
    if not ObjectId.is_valid(sale_id):
        return None

    raw: dict[str, Any] | None = await db[SaleDocument.COLLECTION].find_one(
        {"_id": ObjectId(sale_id)}
    )
    if raw is None:
        return None

    doc = SaleDocument.from_dict(raw)
    return _doc_to_sale_out(doc)


def build_sale_filter(
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    """Mongo filter for the sales list / export search box and date range."""
    query: dict[str, Any] = date_range_filter("created_at", date_from, date_to)
    if q and q.strip():
        rx = search_regex(q)
        query["$or"] = [
            {"customer_name": rx},
            {"customer_phone": rx},
            {"invoice_number": rx},
            {"staff_name": rx},
            {"payment_method": rx},
            {"items.description": rx},
            {"items.serial": rx},
            {"items.swap_from_devices.description": rx},
            {"items.swap_from_devices.serial": rx},
        ]
    return query


def _summarise_items(doc: SaleDocument) -> str:
    names = [i.description for i in doc.items]
    if len(names) <= 2:
        return ", ".join(names)
    return f"{names[0]}, {names[1]} +{len(names) - 2} more"


def _to_list_item(doc: SaleDocument) -> SaleListItem:
    return SaleListItem(
        id=str(doc._id),
        invoice_number=doc.invoice_number,
        invoice_date=doc.invoice_date,
        customer_name=doc.customer_name,
        customer_phone=doc.customer_phone,
        staff_name=doc.staff_name,
        payment_method=doc.payment_method,
        items_summary=_summarise_items(doc),
        item_count=sum(i.qty for i in doc.items),
        has_swap=any(i.is_swap for i in doc.items),
        subtotal=doc.subtotal,
        created_at=doc.created_at,
    )


async def list_sales(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    skip: int = 0,
    limit: int = 20,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> SaleListPage:
    collection = db[SaleDocument.COLLECTION]
    query = build_sale_filter(q, date_from, date_to)

    cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    results: list[SaleListItem] = []
    async for raw in cursor:
        results.append(_to_list_item(SaleDocument.from_dict(raw)))

    total = 0
    total_amount = 0.0
    async for row in collection.aggregate(
        [
            {"$match": query},
            {"$group": {"_id": None, "count": {"$sum": 1}, "amount": {"$sum": "$subtotal"}}},
        ]
    ):
        total = int(row.get("count", 0))
        total_amount = round(float(row.get("amount", 0) or 0), 2)

    return SaleListPage(
        items=results,
        total=total,
        total_amount=total_amount,
        skip=skip,
        limit=limit,
    )


async def iter_sales_for_export(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    query: dict[str, Any],
    max_rows: int,
):
    cursor = db[SaleDocument.COLLECTION].find(query).sort("created_at", -1).limit(max_rows)
    async for raw in cursor:
        yield SaleDocument.from_dict(raw)


async def download_receipt(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    sale_id: str,
    proforma: bool = False,
) -> ReceiptPdf | None:
    """Generate PDF receipt bytes for a sale, or None if sale not found.

    When ``proforma`` is True the document is rendered as a proforma invoice:
    it is titled "PROFORMA INVOICE" and the payment status reads "NOT PAID"
    instead of "PAID".
    """
    if not ObjectId.is_valid(sale_id):
        return None

    raw: dict[str, Any] | None = await db[SaleDocument.COLLECTION].find_one(
        {"_id": ObjectId(sale_id)}
    )
    if raw is None:
        return None

    doc = SaleDocument.from_dict(raw)

    receipt_items: list[ReceiptItem] = [
        ReceiptItem(
            description=i.description,
            serial=i.serial,
            colour=i.colour,
            qty=i.qty,
            unit_price=i.unit_price,
            amount=i.amount,
            is_swap=i.is_swap,
            swap_from_devices=tuple(
                ReceiptSwapDevice(
                    description=d.get("description", ""),
                    serial=d.get("serial", ""),
                    colour=d.get("colour", ""),
                )
                for d in i.swap_from_devices
            ),
        )
        for i in doc.items
    ]

    receipt_data = ReceiptData(
        invoice_number=doc.invoice_number,
        invoice_date=doc.invoice_date,
        customer_name=doc.customer_name,
        customer_phone=doc.customer_phone,
        staff_name=doc.staff_name,
        payment_method=doc.payment_method,
        items=receipt_items,
        subtotal=doc.subtotal,
        is_proforma=proforma,
    )

    suffix: str = "-proforma" if proforma else ""
    return ReceiptPdf(
        content=generate_receipt(receipt_data),
        filename=f"{doc.invoice_number}{suffix}.pdf",
    )
