from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "Inventory Manager"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OtpRequest(BaseModel):
    email: EmailStr

class OtpResetPassword(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

class ProductCreate(BaseModel):
    name: str
    sku: str
    category_id: Optional[int] = None
    uom: Optional[str] = "Units"
    cost_price: Optional[float] = 0.00
    sale_price: Optional[float] = 0.00
    min_reorder_level: Optional[int] = 10
    reorder_qty: Optional[int] = 50
    description: Optional[str] = None
    initial_stock: Optional[int] = 0
    initial_location_id: Optional[int] = None

class OperationLineCreate(BaseModel):
    product_id: int
    demand_qty: int
    done_qty: Optional[int] = 0

class OperationCreate(BaseModel):
    operation_type: str # receipt | delivery | internal | adjustment
    contact: Optional[str] = None
    source_location_id: Optional[int] = None
    dest_location_id: Optional[int] = None
    scheduled_date: Optional[str] = None
    responsible: Optional[str] = "Inventory Manager"
    notes: Optional[str] = None
    lines: List[OperationLineCreate] = []

class WarehouseCreate(BaseModel):
    name: str
    short_code: str
    address: Optional[str] = None

class LocationCreate(BaseModel):
    name: str
    short_code: str
    warehouse_id: Optional[int] = None
    location_type: Optional[str] = "internal"
