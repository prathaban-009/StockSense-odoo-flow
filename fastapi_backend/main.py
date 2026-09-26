"""
StockSense IMS - FastAPI Reference Implementation
Compatible with PostgreSQL (Cloud SQL) and React Frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, inventory

app = FastAPI(
    title="StockSense Modular IMS API",
    description="Full REST API for Inventory Management System: Receipts, Deliveries, Transfers, OTP Auth, and Stock Ledger",
    version="1.0.0",
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication & OTP"])
app.include_router(inventory.router, prefix="/api", tags=["Inventory Operations & Products"])

@app.get("/")
def root():
    return {
        "app": "StockSense IMS API",
        "status": "online",
        "docs_url": "/docs",
        "framework": "FastAPI (Python 3.11+)",
        "database": "PostgreSQL",
    }
