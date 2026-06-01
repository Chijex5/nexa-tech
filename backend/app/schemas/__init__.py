from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Item schemas ──────────────────────────────────────────────────────────────

class SaleItemIn(BaseModel):
    """A single line item submitted by the frontend."""

    description: Annotated[str, Field(min_length=1, max_length=200)]
    serial: Annotated[str, Field(max_length=100)] = ""
    qty: Annotated[int, Field(ge=1)]
    unit_price: Annotated[float, Field(gt=0)]
    is_swap: bool = False
    swap_from_description: Annotated[str, Field(max_length=200)] = ""
    swap_from_serial: Annotated[str, Field(max_length=100)] = ""

    @model_validator(mode="after")
    def validate_swap_details(self) -> "SaleItemIn":
        if not self.is_swap:
            return self
        if not self.serial.strip():
            raise ValueError("serial is required when is_swap is true")
        if not self.swap_from_description.strip():
            raise ValueError("swap_from_description is required when is_swap is true")
        if not self.swap_from_serial.strip():
            raise ValueError("swap_from_serial is required when is_swap is true")
        return self


class SaleItemOut(BaseModel):
    """A single line item as stored and returned."""

    description: str
    serial: str
    qty: int
    unit_price: float
    amount: float
    is_swap: bool
    swap_from_description: str
    swap_from_serial: str


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
