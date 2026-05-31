from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


# ── Item schemas ──────────────────────────────────────────────────────────────

class SaleItemIn(BaseModel):
    """A single line item submitted by the frontend."""

    description: Annotated[str, Field(min_length=1, max_length=200)]
    serial: Annotated[str, Field(max_length=100)] = ""
    qty: Annotated[int, Field(ge=1)]
    unit_price: Annotated[float, Field(gt=0)]


class SaleItemOut(BaseModel):
    """A single line item as stored and returned."""

    description: str
    serial: str
    qty: int
    unit_price: float
    amount: float


# ── Sale schemas ──────────────────────────────────────────────────────────────

class CreateSaleRequest(BaseModel):
    """Payload the frontend POSTs to create a new sale."""

    customer_name: Annotated[str, Field(min_length=1, max_length=100)]
    customer_phone: Annotated[str, Field(min_length=1, max_length=20)]
    staff_name: Annotated[str, Field(min_length=1, max_length=100)]
    items: Annotated[list[SaleItemIn], Field(min_length=1)]
    payment_method: Annotated[str, Field(max_length=50)] = "Bank Transfer"

    @field_validator("customer_phone")
    @classmethod
    def phone_must_be_numeric_ish(cls, v: str) -> str:
        stripped = v.replace("+", "").replace("-", "").replace(" ", "")
        if not stripped.isdigit():
            raise ValueError("customer_phone must contain only digits, spaces, hyphens, or a leading +")
        return v


class SaleOut(BaseModel):
    """Full sale document returned to the frontend."""

    id: str
    invoice_number: str
    invoice_date: str
    customer_name: str
    customer_phone: str
    staff_name: str
    payment_method: str
    items: list[SaleItemOut]
    subtotal: float
    created_at: datetime


class SaleListItem(BaseModel):
    """Lightweight sale summary used in list endpoints."""

    id: str
    invoice_number: str
    invoice_date: str
    customer_name: str
    staff_name: str
    subtotal: float
    created_at: datetime


# ── Generic response wrappers ─────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class CreateSaleResponse(BaseModel):
    message: str
    sale: SaleOut
