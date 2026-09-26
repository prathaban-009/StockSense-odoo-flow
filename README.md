# StockSense IMS

StockSense is a warehouse and inventory management application for tracking products, stock by location, receipts, deliveries, internal transfers, adjustments, and inventory movement history. It includes manager and warehouse-staff views, low-stock monitoring, CSV exports, and optional email and Google sign-in integrations.

## Features

- **Dashboard:** inventory and operation summaries, low-stock alerts, and shortcuts into workflows.
- **Product catalogue:** search and filter products, manage pricing and reorder thresholds, inspect location-level stock, relocate inventory, and export CSV files.
- **Warehouse operations:** create and manage receipts, deliveries, internal transfers, and stock adjustments; assign staff, confirm quantities, validate operations, and print receipts.
- **Move history:** review inventory ledger entries.
- **Administration:** manage warehouses, locations, staff, permissions, and operational settings.
- **Accounts and themes:** email/password registration and sign-in, OTP password reset, optional Firebase Google sign-in, and light/dark themes.
- **Optional email:** Nodemailer/SMTP support for password-reset and low-stock messages.

## Architecture

- The primary app is a React 19 + TypeScript single-page application, built with Vite and Tailwind CSS 4.
- An Express server in `server.ts` serves the frontend and `/api` endpoints. In development it mounts Vite middleware; in production it serves the built `dist` directory.
- The primary server persists application data to PostgreSQL using `pg` and Drizzle ORM. The schema is in `src/db/schema.ts`.
- `fastapi_backend/` contains a separate Python/FastAPI reference implementation. It is not the backend used by the primary React/Express application and does not currently provide feature parity.

## Requirements

- Node.js **20.19+** or **22.12+** and npm (Vite 8 runtime requirement).
- A PostgreSQL database reachable by the app.
- Optional: Python 3.11+ to run the separate FastAPI backend.

## Quick start: primary application

1. Install JavaScript dependencies:

   ```sh
   npm install
   ```

2. Create a local `.env` file in the project root. Set the database and runtime values below. `PORT` is optional and defaults to `3000`.

   ```dotenv
   PORT=3000
   SQL_HOST=localhost
   SQL_USER=stocksense_app
   SQL_PASSWORD=replace-with-a-local-secret
   SQL_DB_NAME=stocksense_db
   SQL_ADMIN_USER=stocksense_admin
   SQL_ADMIN_PASSWORD=replace-with-an-admin-secret
   JWT_SECRET=replace-with-a-long-random-secret
   ```

   The app connection uses `SQL_USER` and `SQL_PASSWORD`. Drizzle Kit uses `SQL_ADMIN_USER` and `SQL_ADMIN_PASSWORD` when applying schema changes. Create the database and provision a PostgreSQL role with the required permissions first. Keep `.env` out of version control.

3. Apply the Drizzle schema to the configured database:

   ```sh
   npx drizzle-kit push
   ```

   Review the proposed changes before confirming. This repository does not include a seed command; start with an empty schema and add warehouses/products through the application.

4. Start the combined Express + Vite development server:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000` (or the configured `PORT`). The app requires a working PostgreSQL connection.

## Environment configuration

| Variable | Used for | Required |
| --- | --- | --- |
| `SQL_HOST` | PostgreSQL host/socket | Yes for the primary app |
| `SQL_USER`, `SQL_PASSWORD` | App database connection | Yes for the primary app |
| `SQL_DB_NAME` | PostgreSQL database name | Yes for the primary app |
| `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` | Drizzle Kit schema management credentials | When applying schema changes |
| `JWT_SECRET` | Signing local authentication tokens | Set a strong secret; the built-in development fallback is not safe for deployment |
| `PORT` | Express server port | No; defaults to `3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional Nodemailer SMTP delivery; examples are in `.env.example` | Only for real outbound email |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service-account credentials for server-side Firebase Admin verification | Only when using server-side Firebase token verification |
| `DATABASE_URL` | PostgreSQL URL for the separate FastAPI backend | Required by that backend unless its `SQL_*` settings are used |

The client Firebase project configuration is in `firebase-applet-config.json`. Never commit private service-account keys, SMTP app passwords, or production secrets. `.env.example` also includes `APP_URL` and `GEMINI_API_KEY` placeholders; verify whether an integration is enabled before treating those as necessary settings.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Express with Vite development middleware |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Start the server (set `NODE_ENV=production` to serve the built frontend) |
| `npm run preview` | Preview the Vite frontend build; this does not run the Express API |
| `npm run lint` | Run TypeScript checking with `tsc --noEmit` (not a lint-rule suite) |
| `npx drizzle-kit push` | Apply the current Drizzle schema to PostgreSQL |

For a production-style local run, build first, then start with `NODE_ENV=production` and the required database/environment settings. The server listens on `0.0.0.0`.

## Optional FastAPI reference backend

This is a separate implementation with its own dependencies and database configuration:

```sh
cd fastapi_backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Set `DATABASE_URL` (or the backend's supported `SQL_*` values), then run:

```sh
uvicorn main:app --reload --port 8000
```

The API is available at `http://localhost:8000`; interactive documentation is at `http://localhost:8000/docs`. The FastAPI backend is a partial reference implementation, not a drop-in replacement for the Express server.

## Development and deployment notes

- No automated test script or test suite is currently configured; `npm run lint` performs TypeScript checking.
- Configure and verify authentication, authorization, secret handling, SMTP, database permissions, and CORS before exposing a deployment publicly. UI role restrictions are not a substitute for server-side access control, and development OTP behavior must not be used as production security.
- Do not use demo/test credentials or commit real secrets. Use a secret manager or deployment environment variables for production.
