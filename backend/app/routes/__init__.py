from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.schemas import (
    CreateSaleRequest,
    CreateSaleResponse,
    SaleListItem,
    SaleOut,
)
from app.services.sale_service import (
    create_sale,
    download_receipt,
    get_sale_by_id,
    list_sales,
)

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
    response_model=list[SaleListItem],
    summary="List all sales (paginated, newest first).",
)
async def list_sales_endpoint(
    skip: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return."),
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> list[SaleListItem]:
    return await list_sales(db, skip=skip, limit=limit)


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
            detail=f"Sale with id '{sale_id}' not found.",
        )
    return sale


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
            detail=f"Sale with id '{sale_id}' not found.",
        )
    return Response(
        content=receipt.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{receipt.filename}"',
        },
    )
