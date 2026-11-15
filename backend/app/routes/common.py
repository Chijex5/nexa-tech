from __future__ import annotations

from typing import Annotated

from fastapi import Query
from fastapi.responses import Response

from app.utils import lagos_today

SearchText = Annotated[
    str | None,
    Query(max_length=100, description="Search text (name, phone, IMEI, invoice…)."),
]
DateFrom = Annotated[
    str | None,
    Query(pattern=r"^\d{4}-\d{2}-\d{2}$", description="From date, YYYY-MM-DD (inclusive)."),
]
DateTo = Annotated[
    str | None,
    Query(pattern=r"^\d{4}-\d{2}-\d{2}$", description="To date, YYYY-MM-DD (inclusive)."),
]

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def xlsx_response(content: bytes, name: str) -> Response:
    filename = f"{name}-{lagos_today().isoformat()}.xlsx"
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
