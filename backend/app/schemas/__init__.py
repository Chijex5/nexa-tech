from __future__ import annotations

from datetime import datetime
from typing import Annotated

from app.utils import lagos_today, parse_date
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Upper bounds that stop absurd or abusive payloads (huge prices, thousands of
# lines) from being stored. Generous enough for any real phone-shop sale.
MAX_PRICE = 1_000_000_000  # ₦1bn per unit
MAX_QTY = 1_000
MAX_ITEMS = 50
MAX_TRADE_INS = 10


class _Input(BaseModel):
    """Base for request bodies: trims surrounding whitespace on every string."""

    model_config = ConfigDict(str_strip_whitespace=True)


def _clean_phone(v: str) -> str:
    stripped = v.replace("+", "").replace("-", "").replace(" ", "")
    if not stripped.isdigit() or "+" in v[1:]:
        raise ValueError("must contain only digits, spaces, hyphens, or a leading +")
    if not 7 <= len(stripped) <= 15:
        raise ValueError("must have between 7 and 15 digits")
    return v


# ── Item schemas ──────────────────────────────────────────────────────────────

class SwapDevice(_Input):
    """A single device traded in as part of a swap.

    A swap line item can trade in more than one device towards a single new
    device (e.g. two old phones swapped for one new phone).
    """

    description: Annotated[str, Field(max_length=200)] = ""
    serial: Annotated[str, Field(max_length=100)] = ""
    colour: Annotated[str, Field(max_length=50)] = ""


class SaleItemIn(_Input):
    """A single line item submitted by the frontend."""

    description: Annotated[str, Field(min_length=1, max_length=200)]
    serial: Annotated[str, Field(max_length=100)] = ""
    colour: Annotated[str, Field(max_length=50)] = ""
    qty: Annotated[int, Field(ge=1, le=MAX_QTY)]
    unit_price: Annotated[float, Field(gt=0, le=MAX_PRICE)]
    is_swap: bool = False
    swap_from_devices: Annotated[list[SwapDevice], Field(max_length=MAX_TRADE_INS)] = Field(
        default_factory=list
    )
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

class CreateSaleRequest(_Input):
    """Payload the frontend POSTs to create a new sale."""

    customer_name: Annotated[str, Field(min_length=1, max_length=100)]
    customer_phone: Annotated[str, Field(min_length=1, max_length=20)]
    staff_name: Annotated[str, Field(min_length=1, max_length=100)]
    items: Annotated[list[SaleItemIn], Field(min_length=1, max_length=MAX_ITEMS)]
    payment_method: Annotated[str, Field(min_length=1, max_length=50)] = "Bank Transfer"

    @field_validator("customer_phone")
    @classmethod
    def phone_must_be_numeric_ish(cls, v: str) -> str:
        return _clean_phone(v)


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
    customer_phone: str = ""
    staff_name: str
    payment_method: str = ""
    items_summary: str = ""
    item_count: int = 0
    has_swap: bool = False
    subtotal: float
    created_at: datetime


class SaleListPage(BaseModel):
    """A page of sales plus totals for everything matching the filter."""

    items: list[SaleListItem]
    total: int
    total_amount: float
    skip: int
    limit: int


# ── Purchase schemas (phones bought in from sellers / suppliers) ──────────────

class PurchaseItemIn(_Input):
    description: Annotated[str, Field(min_length=1, max_length=200)]
    serial: Annotated[str, Field(max_length=100)] = ""
    colour: Annotated[str, Field(max_length=50)] = ""
    cost_price: Annotated[float, Field(gt=0, le=MAX_PRICE)]


class CreatePurchaseRequest(_Input):
    seller_name: Annotated[str, Field(min_length=1, max_length=100)]
    seller_phone: Annotated[str, Field(min_length=1, max_length=20)]
    payment_method: Annotated[str, Field(min_length=1, max_length=50)] = "Cash"
    purchase_date: Annotated[str, Field(max_length=10)] = ""  # YYYY-MM-DD, Lagos
    staff_name: Annotated[str, Field(max_length=100)] = ""
    notes: Annotated[str, Field(max_length=500)] = ""
    items: Annotated[list[PurchaseItemIn], Field(min_length=1, max_length=MAX_ITEMS)]

    @field_validator("seller_phone")
    @classmethod
    def seller_phone_numeric_ish(cls, v: str) -> str:
        return _clean_phone(v)

    @field_validator("purchase_date")
    @classmethod
    def purchase_date_valid(cls, v: str) -> str:
        if not v:
            return v
        day = parse_date(v)
        if day is None:
            raise ValueError("must be a date in YYYY-MM-DD format")
        if day > lagos_today():
            raise ValueError("cannot be in the future")
        return day.isoformat()


class PurchaseSoldInfo(BaseModel):
    sale_id: str
    invoice_number: str
    customer_name: str
    customer_phone: str
    sold_price: float
    is_swap: bool
    sold_at: datetime


class PurchaseItemOut(BaseModel):
    description: str
    serial: str
    colour: str
    cost_price: float
    sold: PurchaseSoldInfo | None = None
    # Sale price minus cost. None while unsold, or for swaps where the sale
    # price is only the top-up amount and a profit figure would be misleading.
    profit: float | None = None


class PurchaseOut(BaseModel):
    id: str
    ref: str
    seller_name: str
    seller_phone: str
    payment_method: str
    purchase_date: str
    staff_name: str
    notes: str
    items: list[PurchaseItemOut]
    total: float
    created_at: datetime


class PurchaseListPage(BaseModel):
    items: list[PurchaseOut]
    total: int  # number of purchases matching the filter
    total_amount: float  # money spent on matching purchases
    phone_count: int  # phones in matching purchases
    in_stock: int  # of those, not sold yet
    profit: float  # profit on sold (non-swap) phones
    skip: int
    limit: int


# ── Generic response wrappers ─────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class CreateSaleResponse(BaseModel):
    message: str
    sale: SaleOut
