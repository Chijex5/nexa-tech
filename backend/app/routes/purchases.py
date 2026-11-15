from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.routes.common import DateFrom, DateTo, SearchText, xlsx_response
from app.schemas import CreatePurchaseRequest, PurchaseListPage, PurchaseOut
from app.services.export_service import purchases_workbook
from app.services.purchase_service import (
    build_purchase_filter,
    create_purchase,
    delete_purchase,
    get_purchase,
    iter_purchases_for_export,
    list_purchases,
)

EXPORT_MAX_PURCHASES = 20_000

router: APIRouter = APIRouter(prefix="/purchases", tags=["Purchases"])

Status = Annotated[
    Literal["in_stock", "sold"] | None,
    Query(
        alias="status",
        description="Only purchases with phones still in stock, or already sold.",
    ),
]


@router.post(
    "/",
    response_model=PurchaseOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record phones bought from a seller.",
)
async def create_purchase_endpoint(
    payload: CreatePurchaseRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> PurchaseOut:
    return await create_purchase(db, payload)


@router.get(
    "/",
    response_model=PurchaseListPage,
    summary="Search / list purchases (newest first) with totals.",
)
async def list_purchases_endpoint(
    skip: int = Query(default=0, ge=0, le=1_000_000),
    limit: int = Query(default=20, ge=1, le=100),
    q: SearchText = None,
    date_from: DateFrom = None,
    date_to: DateTo = None,
    status_filter: Status = None,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> PurchaseListPage:
    return await list_purchases(
        db, skip=skip, limit=limit, q=q, date_from=date_from, date_to=date_to,
        status=status_filter,
    )


@router.get(
    "/export",
    summary="Download matching purchases as an Excel sheet (one row per phone).",
    response_class=Response,
)
async def export_purchases_endpoint(
    q: SearchText = None,
    date_from: DateFrom = None,
    date_to: DateTo = None,
    status_filter: Status = None,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> Response:
    query = build_purchase_filter(q, date_from, date_to, status_filter)
    content = await purchases_workbook(
        iter_purchases_for_export(db, query, EXPORT_MAX_PURCHASES)
    )
    return xlsx_response(content, "purchases")


@router.get("/{purchase_id}", response_model=PurchaseOut, summary="Get one purchase.")
async def get_purchase_endpoint(
    purchase_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> PurchaseOut:
    purchase = await get_purchase(db, purchase_id)
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found.")
    return purchase


@router.delete(
    "/{purchase_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a purchase recorded by mistake.",
)
async def delete_purchase_endpoint(
    purchase_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),  # type: ignore[type-arg]
) -> Response:
    if not await delete_purchase(db, purchase_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
