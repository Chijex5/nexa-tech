from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any
from urllib.request import urlopen
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

from app.config import settings

# ── Colour palette ────────────────────────────────────────────────────────────
_BLACK: colors.Color = colors.HexColor("#1A1A1A")
_DARK_GRAY: colors.Color = colors.HexColor("#333333")
_MID_GRAY: colors.Color = colors.HexColor("#888888")
_LIGHT_LINE: colors.Color = colors.HexColor("#DDDDDD")
_HEADER_BG: colors.Color = colors.HexColor("#0D1B3E")
_STEEL_BLUE: colors.Color = colors.HexColor("#2A5298")
_WHITE: colors.HexColor = colors.white  # type: ignore[assignment]

_PAGE_W: float
_PAGE_H: float
_PAGE_W, _PAGE_H = A4  # type: ignore[misc]

_ML: float = 18 * mm
_MR: float = _PAGE_W - 18 * mm
_CW: float = _MR - _ML

# ── Static business info ──────────────────────────────────────────────────────
_BUSINESS: dict[str, str] = {
    "name": "NexaTech World",
    "tagline": "Powering the Next Generation of Tech",
    "address": "Pepple Street, Computer Village, Ikeja",
    "phone": "08036498157",
    "email": "Nexatechgadget@gmail.com",
}

_TERMS: list[str] = [
    "1.  Fourteen (14) days is given to all customers. NOTE THAT SCREEN PROBLEM, DEAD PHONE AND IMEI NOT SHOWING WILL NOT BE ACCEPTED after being tested ok at point of purchase.",
    "2.  All faulty phones must be POWERED ON before they will be submitted for Repairs / Replacement.",
    "3.  Goods sold in good conditions are not Returnable.",
    "4.  Faulty Phones returned within the warranty period without the invoice will not be attended to.",
]

_NOTICE: str = (
    "NOTE: SCREEN, DEAD PHONE AND IMEI NOT SHOWING WILL NOT BE ACCEPTABLE BY MANAGEMENT."
)


# ── Data transfer objects ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class ReceiptItem:
    description: str
    serial: str
    colour: str
    qty: int
    unit_price: float
    amount: float
    is_swap: bool = False
    swap_from_description: str = ""
    swap_from_serial: str = ""
    swap_from_colour: str = ""


@dataclass(frozen=True)
class ReceiptData:
    invoice_number: str
    invoice_date: str
    customer_name: str
    customer_phone: str
    staff_name: str
    payment_method: str
    items: list[ReceiptItem]
    subtotal: float


# ── Internal helpers ──────────────────────────────────────────────────────────

def _fmt(n: float) -> str:
    return f"NGN {n:,.2f}"


_TABLE_BODY_STYLE = ParagraphStyle(
    "ReceiptTableBody",
    fontName="Helvetica",
    fontSize=8.5,
    leading=10,
    textColor=_BLACK,
    wordWrap="CJK",
)


def _table_paragraph(lines: list[str]) -> Paragraph:
    return Paragraph("<br/>".join(escape(line) for line in lines), _TABLE_BODY_STYLE)


def _fill(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    col: colors.Color,
) -> None:
    c.setFillColor(col)
    c.rect(x, y, w, h, stroke=0, fill=1)


def _hline(
    c: canvas.Canvas,
    x1: float,
    x2: float,
    y: float,
    col: colors.Color,
    lw: float = 0.4,
) -> None:
    c.setStrokeColor(col)
    c.setLineWidth(lw)
    c.line(x1, y, x2, y)


def _draw_header(c: canvas.Canvas) -> None:
    header_h: float = 26 * mm
    _fill(c, 0, _PAGE_H - header_h, _PAGE_W, header_h, _HEADER_BG)

    try:
        try:
            img = ImageReader(settings.logo_path)
        except Exception:
            img = ImageReader(
                urlopen("https://nexa-tech-seven.vercel.app/Logo.png")
            )
        logo_h: float = 30 * mm
        logo_w: float = logo_h * 1.5
        c.drawImage(
            img,
            _ML,
            _PAGE_H - header_h + 3 * mm,
            width=logo_w,
            height=logo_h,
            mask="auto",
        )
    except Exception:
        c.setFillColor(_WHITE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(_ML, _PAGE_H - header_h + 12 * mm, _BUSINESS["name"])

    c.setFillColor(_WHITE)
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(_MR, _PAGE_H - header_h + 12 * mm, "INVOICE")

    c.setFillColor(colors.HexColor("#7BA7D4"))
    c.setFont("Helvetica", 7)
    c.drawRightString(_MR, _PAGE_H - header_h + 7 * mm, _BUSINESS["tagline"])


def _draw_business_info(c: canvas.Canvas, y: float) -> float:
    c.setFillColor(_DARK_GRAY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(_ML, y, _BUSINESS["name"])
    c.setFont("Helvetica", 8)
    c.drawString(_ML, y - 4 * mm, _BUSINESS["address"])
    c.drawString(_ML, y - 8 * mm, _BUSINESS["phone"])
    c.drawString(_ML, y - 12 * mm, _BUSINESS["email"])
    return y - 18 * mm


def _draw_meta_row(
    c: canvas.Canvas,
    y: float,
    data: ReceiptData,
) -> float:
    meta_items: list[tuple[str, str]] = [
        ("Invoice No:", data.invoice_number),
        ("Date:", data.invoice_date),
        ("Prepared by:", data.staff_name),
    ]
    col_w: float = _CW / 3
    for i, (label, val) in enumerate(meta_items):
        x: float = _ML + i * col_w
        c.setFillColor(_MID_GRAY)
        c.setFont("Helvetica", 7.5)
        c.drawString(x, y, label)
        c.setFillColor(_BLACK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x, y - 5 * mm, val)
    y -= 12 * mm
    _hline(c, _ML, _MR, y, _LIGHT_LINE, 0.5)
    return y - 6 * mm


def _draw_customer_cards(
    c: canvas.Canvas,
    y: float,
    data: ReceiptData,
) -> float:
    card_h: float = 24 * mm
    gap: float = 6 * mm
    card_w: float = (_CW - gap) / 2

    # Bill To
    c.setStrokeColor(_LIGHT_LINE)
    c.roundRect(_ML, y - card_h, card_w, card_h, 3, stroke=1, fill=0)
    c.setFillColor(_MID_GRAY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(_ML + 4 * mm, y - 5 * mm, "BILL TO")
    c.setFillColor(_BLACK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(_ML + 4 * mm, y - 11 * mm, data.customer_name)
    c.setFont("Helvetica", 8)
    c.drawString(_ML + 4 * mm, y - 16 * mm, data.customer_phone)

    # Invoice Details
    x2: float = _ML + card_w + gap
    c.roundRect(x2, y - card_h, card_w, card_h, 3, stroke=1, fill=0)
    c.setFillColor(_MID_GRAY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x2 + 4 * mm, y - 5 * mm, "INVOICE DETAILS")
    c.setFillColor(_BLACK)
    c.setFont("Helvetica", 8)
    c.drawString(x2 + 4 * mm, y - 11 * mm, f"Invoice #: {data.invoice_number}")
    c.drawString(x2 + 4 * mm, y - 16 * mm, f"Date: {data.invoice_date}")
    c.drawString(x2 + 4 * mm, y - 21 * mm, f"Prepared by: {data.staff_name}")

    return y - card_h - 8 * mm


def _format_device(description: str, serial: str) -> str:
    if serial:
        return f"{description} ({serial})"
    return description


def _item_description_lines(item: ReceiptItem) -> list[str]:
    if item.is_swap:
        return [
            "DEVICE SWAP",
            f"From: {_format_device(item.swap_from_description, item.swap_from_serial)}",
            f"To: {_format_device(item.description, item.serial)}",
        ]

    lines: list[str] = [item.description]
    if item.serial:
        lines.append(item.serial)
    return lines


def _price_heading(items: list[ReceiptItem]) -> str:
    if items and all(item.is_swap for item in items):
        return "TOP-UP AMOUNT"
    if any(item.is_swap for item in items):
        return "UNIT PRICE / TOP-UP"
    return "UNIT PRICE"


def _item_colour_lines(item: ReceiptItem) -> list[str]:
    if item.is_swap:
        return [
            f"From: {item.swap_from_colour or '-'}",
            f"To: {item.colour or '-'}",
        ]
    return [item.colour or "-"]


def _build_items_table(data: ReceiptData) -> tuple[Table, float]:
    col_widths: list[float] = [
        _CW * 0.37,
        _CW * 0.18,
        _CW * 0.08,
        _CW * 0.18,
        _CW * 0.19,
    ]
    rows: list[list[Any]] = [
        ["DESCRIPTION", "COLOUR", "QTY", _price_heading(data.items), "AMOUNT"]
    ]
    row_heights: list[float | None] = [8 * mm]

    for item in data.items:
        description_lines = _item_description_lines(item)
        colour_lines = _item_colour_lines(item)
        rows.append(
            [
                _table_paragraph(description_lines),
                _table_paragraph(colour_lines),
                str(item.qty),
                _fmt(item.unit_price),
                _fmt(item.amount),
            ]
        )
        row_heights.append(None)

    rows.append(["", "", "", "TOTAL", _fmt(data.subtotal)])

    n: int = len(rows)
    total_row: int = n - 1

    row_heights.append(10 * mm)

    tbl: Table = Table(rows, colWidths=col_widths, rowHeights=row_heights)
    tbl.setStyle(
        TableStyle(
            [
                # Header
                ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
                ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("ALIGN", (1, 0), (-1, 0), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, 0), 3),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
                # Body
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8.5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 1), (-1, -2), 4),
                ("BOTTOMPADDING", (0, 1), (-1, -2), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (1, 1), (1, -2), 8),
                ("LEFTPADDING", (2, 1), (2, -2), 8),
                ("ALIGN", (2, 1), (2, -2), "CENTER"),
                # Total row
                ("BACKGROUND", (0, total_row), (-1, total_row), _HEADER_BG),
                ("TEXTCOLOR", (3, total_row), (-1, total_row), _WHITE),
                ("FONTNAME", (3, total_row), (-1, total_row), "Helvetica-Bold"),
                ("FONTSIZE", (3, total_row), (-1, total_row), 9.5),
                ("ALIGN", (3, total_row), (-1, total_row), "CENTER"),
                ("TOPPADDING", (0, total_row), (-1, total_row), 4),
                ("BOTTOMPADDING", (0, total_row), (-1, total_row), 4),
                ("LINEABOVE", (0, total_row), (-1, total_row), 0.8, _STEEL_BLUE),
                ("LINEBELOW", (0, total_row), (-1, total_row), 0.8, _STEEL_BLUE),
                ("SPAN", (0, total_row), (2, total_row)),
            ]
        )
    )
    return tbl, total_row


def _draw_summary_box(
    c: canvas.Canvas,
    y: float,
    subtotal: float,
) -> float:
    summary_w: float = 60 * mm
    summary_h: float = 28 * mm
    summary_x: float = _MR - summary_w

    c.roundRect(summary_x, y - summary_h, summary_w, summary_h, 3, stroke=1, fill=0)
    c.setFont("Helvetica", 8)
    c.drawString(summary_x + 4 * mm, y - 6 * mm, "Subtotal")
    c.drawRightString(summary_x + summary_w - 4 * mm, y - 6 * mm, _fmt(subtotal))
    c.drawString(summary_x + 4 * mm, y - 12 * mm, "VAT")
    c.drawRightString(summary_x + summary_w - 4 * mm, y - 12 * mm, "NGN 0.00")
    c.drawString(summary_x + 4 * mm, y - 18 * mm, "Discount")
    c.drawRightString(summary_x + summary_w - 4 * mm, y - 18 * mm, "NGN 0.00")
    _hline(c, summary_x + 3 * mm, summary_x + summary_w - 3 * mm, y - 20 * mm, _LIGHT_LINE)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(_HEADER_BG)
    c.drawString(summary_x + 4 * mm, y - 26 * mm, "TOTAL")
    c.drawRightString(summary_x + summary_w - 4 * mm, y - 26 * mm, _fmt(subtotal))

    return y - summary_h - 10 * mm


def _draw_payment_box(
    c: canvas.Canvas,
    y: float,
    payment_method: str,
) -> float:
    payment_h: float = 20 * mm
    c.roundRect(_ML, y - payment_h, _CW, payment_h, 3, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(_ML + 4 * mm, y - 5 * mm, "PAYMENT INFORMATION")
    c.setFont("Helvetica", 8)
    c.drawString(_ML + 4 * mm, y - 11 * mm, "Payment Status:")
    c.drawString(_ML + 35 * mm, y - 11 * mm, "PAID")
    c.drawString(_ML + 4 * mm, y - 16 * mm, "Method:")
    c.drawString(_ML + 35 * mm, y - 16 * mm, payment_method)
    return y - payment_h - 20 * mm


def _draw_terms(c: canvas.Canvas, y: float) -> float:
    c.setFillColor(_BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(_ML, y, "Terms & Conditions")
    _hline(c, _ML, _ML + 45 * mm, y - 1.5 * mm, _STEEL_BLUE, 0.7)
    y -= 6 * mm

    tc_style: ParagraphStyle = ParagraphStyle(
        "tc",
        fontName="Helvetica",
        fontSize=8,
        leading=12,
        textColor=_DARK_GRAY,
        spaceAfter=3,
    )
    notice_style: ParagraphStyle = ParagraphStyle(
        "tn",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=12,
        textColor=_BLACK,
    )

    for term in _TERMS:
        p: Paragraph = Paragraph(term, tc_style)
        _pw, ph = p.wrapOn(c, _CW, 200)
        p.drawOn(c, _ML, y - ph)
        y -= ph + 2 * mm

    y -= 2 * mm
    np: Paragraph = Paragraph(_NOTICE, notice_style)
    _nw, nh = np.wrapOn(c, _CW, 100)
    np.drawOn(c, _ML, y - nh)
    return y - nh - 6 * mm


def _draw_footer(c: canvas.Canvas, y: float) -> None:
    _hline(c, _ML, _MR, y, _LIGHT_LINE, 0.5)
    y -= 5 * mm
    c.setFillColor(_MID_GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(
        _PAGE_W / 2,
        y,
        f"{_BUSINESS['name']}  ·  {_BUSINESS['address']}  ·  {_BUSINESS['phone']}  ·  {_BUSINESS['email']}",
    )


# ── Public API ────────────────────────────────────────────────────────────────

def generate_receipt(data: ReceiptData) -> bytes:
    """Generate a PDF receipt in memory for the given sale data.

    Args:
        data: Structured receipt data (no hardcoded customer info).

    Returns:
        The generated PDF contents as bytes.
    """
    buffer = BytesIO()

    c: canvas.Canvas = canvas.Canvas(buffer, pagesize=A4)

    _fill(c, 0, 0, _PAGE_W, _PAGE_H, _WHITE)
    _draw_header(c)

    y: float = _PAGE_H - 26 * mm - 8 * mm
    y = _draw_business_info(c, y)
    y = _draw_meta_row(c, y, data)
    y = _draw_customer_cards(c, y, data)

    tbl, _total_row = _build_items_table(data)
    tbl_w, tbl_h = tbl.wrapOn(c, _CW, 800)
    tbl.drawOn(c, _ML, y - tbl_h)
    y -= tbl_h + 8 * mm

    y = _draw_summary_box(c, y, data.subtotal)
    y = _draw_payment_box(c, y, data.payment_method)
    y = _draw_terms(c, y)
    _draw_footer(c, y)

    c.save()
    return buffer.getvalue()
