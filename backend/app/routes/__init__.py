from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.schemas import (
    CreateSaleRequest,
    CreateSaleResponse,
    PurchaseOut,
    SaleListPage,
    SaleOut,
    UpdateSaleDateRequest,
)
from app.routes.common import DateFrom, DateTo, SearchText, xlsx_response
from app.services.export_service import sales_workbook
from app.services.purchase_service import purchases_for_sale
from app.services.sale_service import (
    build_sale_filter,
    create_sale,
    download_receipt,
    get_sale_by_id,
    iter_sales_for_export,
    list_sales,
    update_sale_date,
)

EXPORT_MAX_SALES = 20_000

router: APIRouter = APIRouter(prefix="/sales", tags=["Sales"])


@router.post(
    "/",
    response_model=CreateSaleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sale and store it in the database.",
)
async def create_sale_endpoint(
    payload: CreateSaleRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> CreateSaleResponse:
    return await create_sale(db, payload)


@router.get(
    "/",
    response_model=SaleListPage,
    summary="Search / list sales (paginated, newest first) with totals.",
)
async def list_sales_endpoint(
    skip: int = Query(default=0, ge=0, le=1_000_000, description="Number of records to skip."),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return."),
    q: SearchText = None,
    date_from: DateFrom = None,
    date_to: DateTo = None,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> SaleListPage:
    return await list_sales(
        db, skip=skip, limit=limit, q=q, date_from=date_from, date_to=date_to
    )


@router.get(
    "/export",
    summary="Download matching sales as an Excel sheet (one row per item).",
    response_class=Response,
)
async def export_sales_endpoint(
    q: SearchText = None,
    date_from: DateFrom = None,
    date_to: DateTo = None,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> Response:
    query = build_sale_filter(q, date_from, date_to)
    content = await sales_workbook(iter_sales_for_export(db, query, EXPORT_MAX_SALES))
    return xlsx_response(content, "sales")


@router.get(
    "/{sale_id}",
    response_model=SaleOut,
    summary="Retrieve full details of a single sale by its MongoDB ID.",
)
async def get_sale_endpoint(
    sale_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> SaleOut:
    sale: SaleOut | None = await get_sale_by_id(db, sale_id)
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found.",
        )
    return sale


@router.patch(
    "/{sale_id}/date",
    response_model=SaleOut,
    summary="Change the date of a sale (and its receipt), e.g. a receipt written late.",
)
async def update_sale_date_endpoint(
    sale_id: str,
    payload: UpdateSaleDateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> SaleOut:
    sale = await update_sale_date(db, sale_id, payload)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found.")
    return sale


@router.get(
    "/{sale_id}/purchases",
    response_model=list[PurchaseOut],
    summary="Purchases (where it was bought from) for phones sold in this sale.",
)
async def get_sale_purchases_endpoint(
    sale_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> list[PurchaseOut]:
    return await purchases_for_sale(db, sale_id)


@router.get(
    "/{sale_id}/receipt",
    summary="Generate and download the PDF receipt for a sale.",
    response_class=Response,
)
async def get_receipt_endpoint(
    sale_id: str,
    proforma: bool = Query(
        default=False,
        description="Render as a proforma invoice (not paid) instead of a paid receipt.",
    ),
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> Response:
    receipt = await download_receipt(db, sale_id, proforma=proforma)
    if receipt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found.",
        )
    return Response(
        content=receipt.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{receipt.filename}"',
        },
    )
