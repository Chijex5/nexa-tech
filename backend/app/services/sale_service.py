from __future__ import annotations

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
    SaleOut,
)
from app.services.receipt_generator import ReceiptData, ReceiptItem, generate_receipt
from app.utils import generate_invoice_number, today_str


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
                swap_from_description=i.swap_from_description,
                swap_from_serial=i.swap_from_serial,
                swap_from_colour=i.swap_from_colour,
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
            swap_from_description=item.swap_from_description,
            swap_from_serial=item.swap_from_serial,
            swap_from_colour=item.swap_from_colour,
        )
        for item in payload.items
    ]

    doc = SaleDocument(
        invoice_number=generate_invoice_number(),
        invoice_date=today_str(),
        customer_name=payload.customer_name.upper(),
        customer_phone=payload.customer_phone,
        staff_name=payload.staff_name,
        payment_method=payload.payment_method,
        items=items,
    )

    await db[SaleDocument.COLLECTION].insert_one(doc.to_dict())

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


async def list_sales(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    skip: int = 0,
    limit: int = 20,
) -> list[SaleListItem]:
    cursor = (
        db[SaleDocument.COLLECTION]
        .find({})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    results: list[SaleListItem] = []
    async for raw in cursor:
        doc = SaleDocument.from_dict(raw)
        results.append(
            SaleListItem(
                id=str(doc._id),
                invoice_number=doc.invoice_number,
                invoice_date=doc.invoice_date,
                customer_name=doc.customer_name,
                staff_name=doc.staff_name,
                subtotal=doc.subtotal,
                created_at=doc.created_at,
            )
        )
    return results


async def download_receipt(
    db: AsyncIOMotorDatabase,  # type: ignore[type-arg]
    sale_id: str,
) -> ReceiptPdf | None:
    """Generate PDF receipt bytes for a sale, or None if sale not found."""
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
            swap_from_description=i.swap_from_description,
            swap_from_serial=i.swap_from_serial,
            swap_from_colour=i.swap_from_colour,
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
    )

    return ReceiptPdf(
        content=generate_receipt(receipt_data),
        filename=f"{doc.invoice_number}.pdf",
    )
