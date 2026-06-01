from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


def _utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


class SaleItemDocument:
    """Represents a single line item as stored in MongoDB."""

    __slots__ = (
        "description",
        "serial",
        "qty",
        "unit_price",
        "amount",
        "is_swap",
        "swap_from_description",
        "swap_from_serial",
    )

    def __init__(
        self,
        description: str,
        qty: int,
        unit_price: float,
        serial: str = "",
        is_swap: bool = False,
        swap_from_description: str = "",
        swap_from_serial: str = "",
    ) -> None:
        self.description: str = description
        self.serial: str = serial
        self.qty: int = qty
        self.unit_price: float = unit_price
        self.amount: float = round(qty * unit_price, 2)
        self.is_swap: bool = is_swap
        self.swap_from_description: str = swap_from_description
        self.swap_from_serial: str = swap_from_serial

    def to_dict(self) -> dict[str, Any]:
        return {
            "description": self.description,
            "serial": self.serial,
            "qty": self.qty,
            "unit_price": self.unit_price,
            "amount": self.amount,
            "is_swap": self.is_swap,
            "swap_from_description": self.swap_from_description,
            "swap_from_serial": self.swap_from_serial,
        }


class SaleDocument:
    """Represents a full sale as stored in MongoDB."""

    COLLECTION: str = "sales"

    def __init__(
        self,
        invoice_number: str,
        invoice_date: str,
        customer_name: str,
        customer_phone: str,
        staff_name: str,
        items: list[SaleItemDocument],
        payment_method: str = "Bank Transfer",
        _id: ObjectId | None = None,
        created_at: datetime | None = None,
    ) -> None:
        self._id: ObjectId = _id or ObjectId()
        self.invoice_number: str = invoice_number
        self.invoice_date: str = invoice_date
        self.customer_name: str = customer_name
        self.customer_phone: str = customer_phone
        self.staff_name: str = staff_name
        self.payment_method: str = payment_method
        self.items: list[SaleItemDocument] = items
        self.subtotal: float = round(sum(i.amount for i in items), 2)
        self.created_at: datetime = created_at or _utc_now()

    def to_dict(self) -> dict[str, Any]:
        return {
            "_id": self._id,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "staff_name": self.staff_name,
            "payment_method": self.payment_method,
            "items": [item.to_dict() for item in self.items],
            "subtotal": self.subtotal,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SaleDocument":
        items: list[SaleItemDocument] = [
            SaleItemDocument(
                description=i["description"],
                serial=i.get("serial", ""),
                qty=i["qty"],
                unit_price=i["unit_price"],
                is_swap=i.get("is_swap", False),
                swap_from_description=i.get("swap_from_description", ""),
                swap_from_serial=i.get("swap_from_serial", ""),
            )
            for i in data["items"]
        ]
        return cls(
            _id=data["_id"],
            invoice_number=data["invoice_number"],
            invoice_date=data["invoice_date"],
            customer_name=data["customer_name"],
            customer_phone=data["customer_phone"],
            staff_name=data["staff_name"],
            payment_method=data.get("payment_method", "Bank Transfer"),
            items=items,
            created_at=data["created_at"],
        )
