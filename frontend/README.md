# AI hướng dẫn đăng ký khai sinh

Frontend Next.js + TypeScript kết nối backend FastAPI tại `VITE_API_BASE_URL`.

## Chạy frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Build và kiểm thử

```bash
npm test
npm run build
npm start
```

## Chạy backend local

```bash
cd ../backend
docker compose up -d
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Backend chạy tại `http://localhost:8000`; OpenAPI tại `http://localhost:8000/openapi.json`.
