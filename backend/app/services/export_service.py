"""Excel (.xlsx) exports of the sales and purchase books."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Iterable

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.worksheet import Worksheet

from app.models import SaleDocument
from app.schemas import PurchaseOut
from app.utils import LAGOS_TZ

MONEY_FORMAT = '"₦"#,##0.00'
HEADER_FILL = PatternFill("solid", fgColor="E8622C")
HEADER_FONT = Font(bold=True, color="FFFFFF")


def _local(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LAGOS_TZ).strftime("%d/%m/%Y %H:%M")


class _Sheet:
    """Thin write-only sheet wrapper.

    Every text value is written as a plain string cell. openpyxl would otherwise
    turn text starting with "=" into a live formula, letting a customer name like
    ``=HYPERLINK(...)`` run inside Excel (CSV/formula injection). Writing strings
    explicitly also keeps leading zeros on phone numbers and long IMEIs intact.
    """

    def __init__(self, ws: Worksheet, columns: list[tuple[str, int, str]]) -> None:
        self.ws = ws
        self.kinds = [kind for _, _, kind in columns]
        for idx, (_, width, _) in enumerate(columns):
            ws.column_dimensions[_col_letter(idx)].width = width
        ws.freeze_panes = "A2"
        header = []
        for title, _, _ in columns:
            cell = WriteOnlyCell(ws, value=title)
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL
            cell.alignment = Alignment(vertical="center")
            header.append(cell)
        ws.append(header)

    def row(self, values: Iterable[Any]) -> None:
        cells = []
        for value, kind in zip(values, self.kinds):
            if kind == "money" and isinstance(value, (int, float)):
                cell = WriteOnlyCell(self.ws, value=float(value))
                cell.number_format = MONEY_FORMAT
            elif kind == "int" and isinstance(value, int):
                cell = WriteOnlyCell(self.ws, value=value)
            else:
                cell = WriteOnlyCell(self.ws, value=None if value in (None, "") else str(value))
                if cell.value is not None:
                    cell.data_type = "s"
            cells.append(cell)
        self.ws.append(cells)


def _col_letter(idx: int) -> str:
    letters = ""
    idx += 1
    while idx:
        idx, rem = divmod(idx - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


def _finish(wb: Workbook) -> bytes:
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


SALES_COLUMNS: list[tuple[str, int, str]] = [
    ("Invoice No", 12, "text"),
    ("Date", 17, "text"),
    ("Customer", 24, "text"),
    ("Customer Phone", 16, "text"),
    ("Handled By", 16, "text"),
    ("Payment Method", 15, "text"),
    ("Device", 30, "text"),
    ("Serial / IMEI", 20, "text"),
    ("Colour", 12, "text"),
    ("Qty", 6, "int"),
    ("Unit Price / Top-Up", 18, "money"),
    ("Amount", 16, "money"),
    ("Swap?", 7, "text"),
    ("Traded In", 40, "text"),
    ("Invoice Total", 16, "money"),
]


async def sales_workbook(sales: Any) -> bytes:
    wb = Workbook(write_only=True)
    sheet = _Sheet(wb.create_sheet("Sales"), SALES_COLUMNS)
    doc: SaleDocument
    async for doc in sales:
        for item in doc.items:
            traded = "; ".join(
                " · ".join(p for p in (d.get("description"), d.get("serial"), d.get("colour")) if p)
                for d in item.swap_from_devices
            )
            sheet.row(
                [
                    doc.invoice_number,
                    _local(doc.created_at),
                    doc.customer_name,
                    doc.customer_phone,
                    doc.staff_name,
                    doc.payment_method,
                    item.description,
                    item.serial,
                    item.colour,
                    item.qty,
                    item.unit_price,
                    item.amount,
                    "Yes" if item.is_swap else "No",
                    traded,
                    doc.subtotal,
                ]
            )
    return _finish(wb)


PURCHASE_COLUMNS: list[tuple[str, int, str]] = [
    ("Ref", 12, "text"),
    ("Date Bought", 12, "text"),
    ("Bought From", 24, "text"),
    ("Seller Phone", 16, "text"),
    ("Device", 30, "text"),
    ("Serial / IMEI", 20, "text"),
    ("Colour", 12, "text"),
    ("Cost Price", 16, "money"),
    ("Paid By", 14, "text"),
    ("Bought By", 16, "text"),
    ("Notes", 30, "text"),
    ("Status", 10, "text"),
    ("Sold To", 24, "text"),
    ("Buyer Phone", 16, "text"),
    ("Sale Invoice", 12, "text"),
    ("Sale Date", 17, "text"),
    ("Sold For", 16, "money"),
    ("Profit", 16, "money"),
]


async def purchases_workbook(purchases: Any) -> bytes:
    wb = Workbook(write_only=True)
    sheet = _Sheet(wb.create_sheet("Purchases"), PURCHASE_COLUMNS)
    p: PurchaseOut
    async for p in purchases:
        for item in p.items:
            sold = item.sold
            sheet.row(
                [
                    p.ref,
                    datetime.fromisoformat(p.purchase_date).strftime("%d/%m/%Y")
                    if p.purchase_date
                    else "",
                    p.seller_name,
                    p.seller_phone,
                    item.description,
                    item.serial,
                    item.colour,
                    item.cost_price,
                    p.payment_method,
                    p.staff_name,
                    p.notes,
                    ("Sold (swap)" if sold.is_swap else "Sold") if sold else "In stock",
                    sold.customer_name if sold else "",
                    sold.customer_phone if sold else "",
                    sold.invoice_number if sold else "",
                    _local(sold.sold_at) if sold else "",
                    (sold.sold_price if not sold.is_swap else None) if sold else None,
                    item.profit,
                ]
            )
    return _finish(wb)
