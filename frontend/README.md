# CivicPath AI Frontend

Next.js 16 + React 19 + TypeScript frontend for the AI-guided birth-registration workflow. The interface is styled with Tailwind CSS 4 and connects to the FastAPI backend through native `fetch` using `VITE_API_BASE_URL`.

## Run locally

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open:

- Citizen flow: `http://localhost:3000`
- Officer dashboard: `http://localhost:3000/admin`

## Tailwind CSS

- Tailwind v4 is loaded from `app/globals.css` with `@import "tailwindcss"`.
- Government color, typography, easing, and shadow tokens are defined in the `@theme` block.
- Roboto is bundled locally through `@fontsource-variable/roboto`, so rendering does not depend on a third-party font request.
- Components use utility classes directly; global CSS is limited to base accessibility rules, reveal motion, and keyframes.
- PostCSS integration is configured in `postcss.config.mjs`.

## Test and build

```bash
npm test
npm run build
npm start
```

## Backend

```bash
cd ../backend
docker compose up -d
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Backend: `http://localhost:8000`<br>
OpenAPI: `http://localhost:8000/openapi.json`

The officer dashboard supports paginated session review, updates, deletion, and authenticated PDF preview/download. `ADMIN_API_KEY` stays in the backend configuration; the entered access code is held only in `sessionStorage`.

Voice recordings are sent to the backend for Vietnamese transcription and are not persisted in the frontend session. Never expose `OPENAI_API_KEY` in frontend files or environment variables.
