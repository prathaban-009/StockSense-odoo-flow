from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Product, ProductCategory, Warehouse, Location, Operation, OperationLine, StockLevel, StockLedger
from schemas import ProductCreate, OperationCreate, WarehouseCreate, LocationCreate

router = APIRouter()

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    products_count = db.query(Product).count()
    receipts_count = db.query(Operation).filter(Operation.operation_type == "receipt").count()
    deliveries_count = db.query(Operation).filter(Operation.operation_type == "delivery").count()
    return {
        "totalProductsCount": products_count,
        "receipts": {"total": receipts_count, "toReceive": 1, "late": 0, "waiting": 1},
        "deliveries": {"total": deliveries_count, "toDeliver": 1, "late": 0, "waiting": 1},
        "internalTransfersScheduled": 1,
    }

@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@router.post("/products")
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    prod = Product(
        name=payload.name,
        sku=payload.sku,
        category_id=payload.category_id,
        uom=payload.uom,
        cost_price=payload.cost_price,
        sale_price=payload.sale_price,
        min_reorder_level=payload.min_reorder_level,
        reorder_qty=payload.reorder_qty,
        description=payload.description
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.get("/operations")
def list_operations(type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Operation)
    if type:
        q = q.filter(Operation.operation_type == type)
    return q.all()

@router.get("/stock-ledger")
def list_stock_ledger(db: Session = Depends(get_db)):
    return db.query(StockLedger).order_by(StockLedger.id.desc()).all()
