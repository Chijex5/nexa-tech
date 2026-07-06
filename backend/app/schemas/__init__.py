from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Item schemas ──────────────────────────────────────────────────────────────

class SwapDevice(BaseModel):
    """A single device traded in as part of a swap.

    A swap line item can trade in more than one device towards a single new
    device (e.g. two old phones swapped for one new phone).
    """

    description: Annotated[str, Field(max_length=200)] = ""
    serial: Annotated[str, Field(max_length=100)] = ""
    colour: Annotated[str, Field(max_length=50)] = ""


class SaleItemIn(BaseModel):
    """A single line item submitted by the frontend."""

    description: Annotated[str, Field(min_length=1, max_length=200)]
    serial: Annotated[str, Field(max_length=100)] = ""
    colour: Annotated[str, Field(max_length=50)] = ""
    qty: Annotated[int, Field(ge=1)]
    unit_price: Annotated[float, Field(gt=0)]
    is_swap: bool = False
    swap_from_devices: list[SwapDevice] = Field(default_factory=list)
    # ── Legacy single-device fields (kept for backward-compatible payloads) ──
    swap_from_description: Annotated[str, Field(max_length=200)] = ""
    swap_from_serial: Annotated[str, Field(max_length=100)] = ""
    swap_from_colour: Annotated[str, Field(max_length=50)] = ""

    @model_validator(mode="after")
    def validate_swap_details(self) -> "SaleItemIn":
        if not self.is_swap:
            self.swap_from_devices = []
            return self

        # Accept legacy single-device payloads by folding them into the list.
        if not self.swap_from_devices and (
            self.swap_from_description.strip()
            or self.swap_from_serial.strip()
            or self.swap_from_colour.strip()
        ):
            self.swap_from_devices = [
                SwapDevice(
                    description=self.swap_from_description,
                    serial=self.swap_from_serial,
                    colour=self.swap_from_colour,
                )
            ]

        if not self.serial.strip():
            raise ValueError("serial is required when is_swap is true")

        # Drop fully-empty trade-in rows, then require what remains to be complete.
        cleaned: list[SwapDevice] = [
            SwapDevice(
                description=d.description.strip(),
                serial=d.serial.strip(),
                colour=d.colour.strip(),
            )
            for d in self.swap_from_devices
            if d.description.strip() or d.serial.strip() or d.colour.strip()
        ]
        if not cleaned:
            raise ValueError(
                "at least one trade-in device is required when is_swap is true"
            )
        for d in cleaned:
            if not d.description:
                raise ValueError(
                    "each trade-in device requires a description when is_swap is true"
                )
            if not d.serial:
                raise ValueError(
                    "each trade-in device requires a serial when is_swap is true"
                )
        self.swap_from_devices = cleaned
        return self


class SaleItemOut(BaseModel):
    """A single line item as stored and returned."""

    description: str
    serial: str
    colour: str
    qty: int
    unit_price: float
    amount: float
    is_swap: bool
    swap_from_devices: list[SwapDevice]


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
