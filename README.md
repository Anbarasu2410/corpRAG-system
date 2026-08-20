# corpRAG - Enterprise AI Workspace

**corpRAG** is a fullstack document intelligence RAG application featuring **JWT Authentication**, a **Google Sheets backend database (via Apps Script)**, and a **Flowise Prediction AI Engine**.

---

## Technical Architecture

- **Frontend**: React + Vite + TailwindCSS (`client/`) & Standalone HTML/CSS (`index.html`)
- **Backend API**: Node.js + Express (`server/`)
- **Authentication**: JWT Bearer Tokens with `bcryptjs` password hashing
- **Database**: Google Sheets via Google Apps Script Web App (`Code.gs`)
- **AI Engine**: Flowise RAG Prediction API (`http://localhost:3000`)

---

## Directory Structure

```text
├── server/          # Node.js Express API Server (JWT Auth & Google Sheets Proxy)
├── client/          # React + Vite Frontend UI Workspace
├── Code.gs          # Google Apps Script Web App Engine (Paste into Google Sheets)
├── index.html       # Standalone UI Layout
├── app.js           # Frontend Logic & Fetch Handlers
├── style.css        # Glassmorphic Styling
└── README.md
```

---

## Quick Start (Local Development)

### 1. Start Backend Server
```bash
cd server
npm install
node index.js
```
*(Runs on `http://localhost:5000`)*

### 2. Start Frontend
```bash
cd client
pnpm install
pnpm dev
```
*(Runs on `http://localhost:5173`)*

---

## Google Sheets Setup (`Code.gs`)

1. Open a Google Sheet.
2. Go to **Extensions > Apps Script**, paste `Code.gs`, and click **Deploy > New Deployment**.
3. Set **Execute as**: `Me`, **Who has access**: `Anyone`.
4. Copy the Web App URL and set it in `server/.env` under `GOOGLE_SCRIPT_WEBAPP_URL`.
