# DevSync ⚡

**DevSync** is a modern, real-time engineering collaboration platform designed for software teams. It unifies interactive **Kanban project management**, **collaborative Markdown documentation**, **real-time WebSocket sync**, **granular RBAC permissions**, **AI-assisted task breakdown**, and **activity audit logging** into a single sleek web interface.

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
- **Vector / RAG Search**: PostgreSQL Full-Text Search TSVECTOR & `pgvector`

### Frontend
- **Framework**: [React 18](https://react.dev/) (JS) built with [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) + Custom CSS variables
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persistence middleware
- **Data Fetching & Caching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Drag and Drop**: [@dnd-kit](https://dndkit.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

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

# Seed test data (creates users alex_morgan, sarah_chen, david_kim, etc. with password 'password123')
poetry run python seed_test_data.py

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

You can log into the local environment using any of the following seeded user accounts:

| Email | Username | Default Password | Role |
|---|---|---|---|
| `alex_morgan@devsync.com` | `alex_morgan` | `password123` | Owner |
| `sarah_chen@devsync.com` | `sarah_chen` | `password123` | Admin |
| `david_kim@devsync.com` | `david_kim` | `password123` | Member |
| `marcus_vance@devsync.com` | `marcus_vance` | `password123` | Member |

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
│   └── seed_test_data.py     # Database seed script
│
└── frontend/
    ├── src/
    │   ├── api/              # Axios instance & request interceptors
    │   ├── components/       # UI components (Kanban, Sidebar, Modals, ErrorBoundary)
    │   ├── hooks/            # TanStack Query custom hooks
    │   ├── pages/            # Page views (Landing, Dashboard, Settings, Trash, Audit Log)
    │   └── stores/           # Zustand state stores (auth, theme, toast, task panel)
    ├── index.css             # Tailwind v4 theme configuration & CSS variables
    └── main.jsx              # React app entrypoint with RootErrorBoundary
```

---

## 📝 License

Distributed under the MIT License.
