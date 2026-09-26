from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, default="Inventory Manager")
    password_hash = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OtpCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_code = Column(String, unique=True, nullable=False)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    name = Column(String, nullable=False)
    short_code = Column(String, nullable=False)
    location_type = Column(String, default="internal")
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    uom = Column(String, default="Units")
    cost_price = Column(Numeric(10, 2), default=0.00)
    sale_price = Column(Numeric(10, 2), default=0.00)
    min_reorder_level = Column(Integer, default=10)
    reorder_qty = Column(Integer, default=50)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class StockLevel(Base):
    __tablename__ = "stock_levels"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    on_hand = Column(Integer, default=0)
    reserved = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Operation(Base):
    __tablename__ = "operations"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    operation_type = Column(String, nullable=False)
    status = Column(String, default="draft")
    contact = Column(String, nullable=True)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    scheduled_date = Column(String, nullable=True)
    responsible = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class OperationLine(Base):
    __tablename__ = "operation_lines"
    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    demand_qty = Column(Integer, nullable=False)
    done_qty = Column(Integer, default=0)

class StockLedger(Base):
    __tablename__ = "stock_ledger"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, nullable=False)
    operation_type = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_location = Column(String, nullable=False)
    to_location = Column(String, nullable=False)
    contact = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String, default="done")
    date = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
