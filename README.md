# DevSync ⚡

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**DevSync** is a modern, real-time engineering collaboration platform designed for software teams. It unifies interactive **Kanban project management**, **collaborative Markdown documentation**, **real-time WebSocket sync**, **granular RBAC permissions**, **AI-assisted task breakdown**, and **activity audit logging** into a single sleek web interface.

> **Why I Built This**: DevSync was built to demonstrate a highly responsive, real-time collaboration application featuring strict access controls, soft-delete safety mechanisms, dynamic system activity auditing, and an integrated Retrieval-Augmented Generation (RAG) vector database pipeline.

---

## 🌐 Live Deployments

* **Frontend (Vercel)**: [https://devsync-neon.vercel.app](https://devsync-neon.vercel.app)
* **Backend API (Render)**: [https://devsync-2saa.onrender.com](https://devsync-2saa.onrender.com)

---

## 🚀 Live Demo Access

You can access the live system immediately without registration using the following credentials:
* **Demo Login**: [https://devsync-neon.vercel.app/login](https://devsync-neon.vercel.app/login)
* **Email**: `demo@devsync.io`
* **Password**: `password123`
* **Role**: Owner (Quantum Product Suite)

---

## 🗺️ System Architecture

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Vercel Deployment]
        UI[React 18 Single Page App]
        State[Zustand State Store]
        Cache[TanStack Query Cache]
        UI --> State
        UI --> Cache
    end

    %% Network Protocols
    UI -- "HTTP REST & SSE" --> FastAPI
    UI -- "WebSocket (ws://)" --> WS[WebSocket Connection Handler]

    %% Backend Layer
    subgraph Backend [Render Container]
        FastAPI[FastAPI Web Server]
        SQLAlchemy[SQLAlchemy 2.0 ORM]
        FastAPI --> SQLAlchemy
        WS --> RedisClient[Redis Client]
    end

    %% Database & Cache Layer
    subgraph Storage [Render Database Services]
        PostgreSQL[(PostgreSQL DB + pgvector)]
        Redis[(Redis Key-Value Cache)]
        SQLAlchemy --> PostgreSQL
        RedisClient --> Redis
    end

    %% AI Pipeline
    subgraph AI [Local Development AI Engine]
        Ollama[Ollama LLM Server]
        EmbedPipeline[pure-Python Embedding Generator]
        FastAPI -- "api/generate" --> Ollama
        EmbedPipeline --> PostgreSQL
    end

    classDef orange fill:#ffefe0,stroke:#f59e0b,stroke-width:2px;
    classDef blue fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef green fill:#ecfdf5,stroke:#059669,stroke-width:2px;
    class UI,State,Cache orange;
    class FastAPI,SQLAlchemy,WS,RedisClient,EmbedPipeline blue;
    class PostgreSQL,Redis,Ollama green;
```

---

## ✨ Key Features

- **⚡ Real-Time Board Sync**: Instant drag-and-drop task movements across custom columns, synchronized live across all active project members using WebSockets.
- **🎨 60-30-10 Sunset Amber Design System**: High-contrast dark mode design (`#111827` dominant, `#1F2937` surface cards, `#F59E0B` vibrant amber primary accents) with smooth micro-animations.
- **🛡️ Granular Workspace & Project RBAC**: Workspace roles (`OWNER`, `ADMIN`, `MEMBER`) with project-specific permission overrides (`EDITOR` vs read-only `VIEWER`).
- **♻️ Soft Delete & Archive Trash**: Recover soft-deleted tasks and projects from the Archive & Trash view before 30-day permanent deletion.
- **📜 Workspace Audit Log**: Comprehensive, filterable activity history tracking mutation events by user, date range, and event type.
- **🚀 Pre-Login Landing & Live Demo**: Public landing page featuring interactive feature highlights and one-click demo login.
- **🛡️ Resilience**: Class-component `RootErrorBoundary` for catching uncaught render errors and a full 404 handler.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Database**: PostgreSQL with [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async & Sync ORM)
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Real-time Engine**: WebSockets with custom connection manager
- **Authentication**: OAuth2 with JWT tokens & passlib password hashing
- **Search System**: PostgreSQL Full-Text Search index (`TSVECTOR` for keywords)
- **Vector / RAG Search**: PostgreSQL `pgvector` index (384-dimensional cosine similarity embeddings)

### Frontend
- **Framework**: [React 18](https://react.dev/) (JS) built with [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) + Custom CSS variables
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persistence middleware
- **Data Fetching & Caching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Drag and Drop**: [@dnd-kit](https://dndkit.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🤖 AI Assistant & Ollama Deployment Note

Due to resource, CPU/GPU, and timeout limitations on Render's free tier, the **Ollama LLM Server is not deployed to the cloud**. 

* **Local Development**: The project integrates locally with Ollama (defaulting to `http://localhost:11434` with the `llama3.2:3b` model) using Docker Compose.
* **Production Sandbox**: Since Ollama runs locally, live text generation services (Weekly Digest, Subtask Suggestions, Code Explainer) will return a graceful "AI Service Unavailable" message if Ollama isn't configured on the hosting platform. However, all RAG documents and task descriptions are pre-embedded and seeded directly into the `chunks` table, so search functionalities remain fully queryable.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ & **npm**
- **Python** 3.11+ & **Poetry**
- **PostgreSQL** database instance running locally or hosted

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies using Poetry
poetry install

# Set up environment variables (.env)
# Create a .env file with the following keys:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devsync
# JWT_SECRET_KEY=your_secret_key_here

# Run database migrations
poetry run alembic upgrade head

# Seed test data (creates demo accounts, tasks, documents, and RAG embeddings)
poetry run python scripts/seed.py

# Start the FastAPI backend server
poetry run uvicorn app.main:app --reload
```
*Backend server will run at: `http://localhost:8000` (API documentation at `http://localhost:8000/docs`)*

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend app will run at: `http://localhost:5173`*

---

## 👥 Seeded Test Credentials

You can log into the application using any of the following seeded user accounts:

| Email | Username | Default Password | Role |
|---|---|---|---|
| `demo@devsync.io` | `demo_user` | `password123` | Owner |
| `sarah.chen@devsync.io` | `sarah_chen` | `password123` | Admin |
| `marcus.vance@devsync.io` | `marcus_vance` | `password123` | Member |

---

## 📂 Project Structure

```
Devsync/
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── api/              # FastAPI route endpoints (tasks, projects, workspaces, audit)
│   │   ├── core/             # Auth, security, activity log & WebSocket manager
│   │   ├── models/           # SQLAlchemy database models
│   │   └── schemas/          # Pydantic request/response schemas
│   └── scripts/
│       └── seed.py           # Database seed script (idempotent, supports embeddings)
│
└── frontend/
    ├── src/
    │   ├── api/              # Axios instance & request interceptors
    │   ├── components/       # UI components (Kanban, Sidebar, Modals, ErrorBoundary)
    │   ├── hooks/            # TanStack Query custom hooks
    │   ├── pages/            # Page views (Landing, Dashboard, Settings, Trash, Audit Log)
    │   └── stores/           # Zustand state stores (auth, theme, toast, task panel)
    ├── index.css             # Tailwind theme configuration & CSS variables
    ├── vercel.json           # Client routing rewrites for Vercel
    └── main.jsx              # React app entrypoint with RootErrorBoundary
```

---

## 📝 License

Distributed under the MIT License.
