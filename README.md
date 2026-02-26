# FinSight — AI Business Finance Platform

> Smart financial insights for growing businesses.

A full-stack diploma project featuring AI-powered expense classification, cash flow forecasting, receipt OCR, and an LLM financial advisor chatbot.

---

## Tech Stack

| Layer       | Technology                                         |
|-------------|---------------------------------------------------|
| Frontend    | React 19 + Vite + TypeScript + TailwindCSS v4     |
| Go Backend  | Go 1.25 + chi router + pgx/v5                     |
| ML Service  | Python FastAPI + scikit-learn + Prophet + OpenAI  |
| Database    | Supabase (PostgreSQL)                             |

---

## Features

- **Auth** — JWT-based register/login
- **Transactions** — Manual CRUD, filter by type/category/date
- **Excel Import** — Upload `.xlsx`/`.xls`, auto-detect columns, bulk import
- **Receipt OCR** — Upload receipt photo → Tesseract extracts amount/date
- **AI Classifier** — TF-IDF + Logistic Regression auto-tags expense categories
- **Dashboard** — Income/expense KPIs, cash flow chart, category pie chart
- **Forecast** — Prophet-based 3-month cash flow prediction with risk alerts
- **Tax Estimator** — Configurable tax rate, quarterly payment schedule, optimization tips
- **AI Chatbot** — GPT-4o-mini advisor with your financial context injected

---

## Project Structure

```
diploma/
├── cmd/main.go                 # Go server entry point
├── internal/
│   ├── middleware/             # JWT auth middleware
│   ├── user/                   # Auth (register/login/me)
│   ├── transaction/            # CRUD + Excel upload
│   ├── dashboard/              # Analytics aggregation
│   ├── tax/                    # Tax estimation
│   └── mlproxy/                # Proxy to Python ML service
├── migrations/001_init.sql     # Database schema
├── ml-service/                 # Python FastAPI
│   ├── main.py
│   ├── classifier/             # TF-IDF + LR expense classifier
│   ├── forecaster/             # Prophet cash flow forecasting
│   ├── ocr/                    # Tesseract OCR
│   └── chatbot/                # OpenAI chatbot
└── frontend/                   # React + Vite app
    └── src/
        ├── pages/              # Dashboard, Transactions, Upload, Forecast, Tax, Chat
        ├── components/         # Layout, StatCard, CategoryBadge
        ├── api/                # Axios API clients
        └── context/            # Auth context
```

---

## Quick Start

### 1. Database Setup

Run the migration against your Supabase (or local PostgreSQL) instance.

If you don't have the Postgres client (`psql`) installed, the simplest way on macOS is Homebrew:

```bash
brew install postgresql
# start the DB server so local connections work (optional for remote DBs)
brew services start postgresql@14
```

Then run the migration SQL file using the DATABASE_URL from your `.env`:

```bash
export DATABASE_URL="postgres://user:password@host:port/dbname?sslmode=disable"
psql "$DATABASE_URL" -f migrations/001_init.sql
```

Notes / troubleshooting

- If `psql`/`pg_dump` client and the Postgres server have different major versions (for example client v14 vs server v18), `pg_dump` may refuse to run. In that case you can either install a matching client version or use a lightweight introspection fallback. During the current session a schema snapshot was written to `migrations/schema.sql` using `psql` (introspection output) as a workaround for client/server mismatch.

- To generate a portable schema dump with a matching client, prefer:

```bash
# install matching client (example: adjust version to match your server)
brew install postgresql@18
pg_dump -s "$DATABASE_URL" -f migrations/schema.sql
```

The `migrations/schema.sql` file now contains the current schema introspection output (table definitions and indexes) and can be used as a reference when `pg_dump` isn't available.

### 2. Environment Variables

**Go backend** — edit `.env`:
```
DATABASE_URL=postgres://user:password@host:port/dbname?sslmode=disable
JWT_SECRET=your-secret-key
ML_SERVICE_URL=http://localhost:8000
PORT=8080
```

**Python ML service** — edit `ml-service/.env`:
```
OPENAI_API_KEY=sk-...   # optional, uses rule-based fallback if not set
PORT=8000
```

### 3. Start Go Backend

```bash
go build -o bin/finsight ./cmd
./bin/finsight
# or: go run ./cmd
```

### 4. Start Python ML Service

```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Train the expense classifier (first run only)
python -m classifier.train

# Start server
python main.py
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, receive JWT |
| GET | `/api/me` | Get current user |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List with filters |
| POST | `/api/transactions` | Create manually |
| PATCH | `/api/transactions/:id` | Update |
| DELETE | `/api/transactions/:id` | Delete |
| POST | `/api/transactions/upload/excel` | Bulk import from Excel |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | KPI summary |
| GET | `/api/dashboard/breakdown` | Category breakdown |
| GET | `/api/dashboard/cashflow` | Cash flow series |

### Tax
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tax/settings` | Get tax config |
| PUT | `/api/tax/settings` | Save tax config |
| GET | `/api/tax/estimate` | Get tax estimate for year |

### AI/ML
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ml/classify` | Classify expense description |
| GET | `/api/ml/forecast` | 3-month cash flow forecast |
| POST | `/api/ml/ocr` | OCR a receipt image |
| POST | `/api/chat` | Chat with AI advisor |

---

## ML Models

### Expense Classifier
- **Algorithm**: TF-IDF (bigrams) + Logistic Regression
- **Training data**: 100+ labeled descriptions (English + Russian)
- **Categories**: Food, Rent, Utilities, Salary, Equipment, Marketing, Transport, Finance, Other
- **Auto-trained** on first run if no `.pkl` file exists

### Cash Flow Forecaster
- **Algorithm**: Facebook Prophet (seasonal time series)
- **Fallback**: 3-month moving average
- **Requires**: At least 3 months of transaction history

### Receipt OCR
- **Engine**: Tesseract via pytesseract
- **Extracts**: Total amount, date, description
- **Requires**: `tesseract` installed on system (`brew install tesseract`)
