# E-Waste Collector Platform — Backend & Web

Complete Next.js 15 (App Router, TypeScript strict) backend and web portals for the **E-Waste Collector Platform**, connecting informal waste-pickers with government-authorized formal recyclers.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js 20+ (v24 recommended)
- Docker Desktop (for MongoDB replica set & MinIO)

### 2. Start Database Services (Docker Compose)
A MongoDB replica set is **mandatory** for interactive `$transaction` and offline sync support.
```bash
docker-compose up -d
```
- **MongoDB**: `localhost:27017` (Replica set: `rs0`)
- **MinIO S3 Console**: `http://localhost:9001` (`minioadmin` / `minioadmin`)

### 3. MongoDB Compass Connection
To inspect the database in MongoDB Compass, use the direct replica set URI:
```text
mongodb://localhost:27017/?directConnection=true
```
- Select database: `ewaste`

### 4. Setup Environment & Push Schema
```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation
For full end-to-end user journey walkthroughs, test cases, and edge-case validation, see:
📘 **[Manual Testing Guide](docs/MANUAL_TESTING_GUIDE.md)**

Run all pure domain unit tests:
```bash
npx tsx --test "tests/unit/**/*.test.ts"
```
Run TypeScript strict type checking:
```bash
npx tsc --noEmit
```
Run production build:
```bash
npm run build
```

---

## 🔑 Demo Login Credentials (from Seed)

| Role | Portal URL | Username / Phone | Password / PIN |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `/admin/login` | `9999999999` | `admin123` |
| **Recycler Staff** | `/recycler/login` | `9876543210` | `password123` |
| **Mobile Collector** | Mobile API / C2 | `9820000001` | `1234` |

---

## 📁 Project Structure

```text
├── PROJECT.md                    # Full master architecture document
├── README.md                     # Setup and run instructions
├── docker-compose.yml            # MongoDB 7 replica set (rs0) + MinIO
├── prisma/
│   ├── schema.prisma             # MongoDB schema (integer paise & grams)
│   └── seed.ts                   # Idempotent seed (categories, topics, admin, demo data)
├── docs/
│   ├── contract-diff.md          # Drift v3 vs Prisma detailed comparison
│   ├── geo_api_contract.md       # Geolocation endpoints & location proof rules
│   ├── schema-changes.md         # Schema evolution & MongoDB conversion log
│   ├── API.md                    # Complete REST API specification + Dart snippet
│   ├── local_db.dart             # Mobile contract source of truth (v3)
│   └── screens.csv               # 24 screens specification matrix
├── src/
│   ├── app/
│   │   ├── api/v1/               # Mobile REST API endpoints (Auth, Sync, Prices, Geo)
│   │   ├── recycler/             # R1–R4 Recycler Web Portal & Server Actions
│   │   ├── admin/                # M1–M5 Admin Dashboard & Server Actions
│   │   ├── receipts/[token]/     # Public non-sensitive receipt view
│   │   ├── globals.css           # Plain CSS responsive design system
│   │   └── page.tsx              # Welcome landing page
│   └── lib/
│       ├── domain/               # Pure business functions (no DB imports)
│       ├── services/             # Sync engine & background services
│       ├── auth/                 # JWT, session cookies, rate-limiter, bcrypt
│       ├── storage/              # S3 & local-disk dev storage driver
│       └── prisma.ts             # PrismaClient with replica set health assert
└── tests/
    └── domain/                   # 29 unit tests covering all business rules
```
