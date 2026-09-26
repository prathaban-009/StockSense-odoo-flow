# StockSense FastAPI + PostgreSQL Backend

This directory provides the standalone **FastAPI** Python implementation for StockSense IMS.

## Features
- **FastAPI** asynchronous REST endpoints with interactive OpenAPI Swagger UI at `/docs`.
- **SQLAlchemy 2.0** models corresponding to PostgreSQL schema (`users`, `otp_codes`, `warehouses`, `locations`, `products`, `operations`, `stock_ledger`).
- **OTP Password Reset**: Generates 6-digit one-time passcodes and logs them to the console.
- **Mail Provider Readiness**: Includes prepared hooks for swapping console output with **Resend**, **SendGrid**, or **AWS SES**.

## How to run locally:
```bash
cd fastapi_backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Configure your PostgreSQL connection:
export DATABASE_URL="postgresql://user:password@localhost:5432/stocksense_db"

# Start the FastAPI server:
uvicorn main:app --reload --port 8000
```

Access API Documentation at: `http://localhost:8000/docs`
