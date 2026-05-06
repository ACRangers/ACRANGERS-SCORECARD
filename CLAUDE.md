# Activity App – Claude Development Guide

## Project Overview

The **Activity App** is a standalone analytics dashboard for the AC Rangers HVAC business. It reads directly from the shared PostgreSQL database (\ctivity_log\ table) and provides historical tracking and trend analysis.

**Architecture**:
- **Frontend**: React 18 + Vite
- **Backend**: Express.js + PostgreSQL (Node.js)
- **Styling**: Tailwind CSS v3
- **Charts**: Recharts
- **Database**: PostgreSQL on Railway

---

## Project Structure

\\\
activity-app/
├── server.js                   # Express backend, connects to PostgreSQL
├── src/
│   ├── App.jsx                 # Main app, view navigation, filters
│   ├── App.css                 # Global app styles
│   ├── index.css               # Tailwind + custom components
│   └── components/
│       ├── Dashboard.jsx       # Daily summary cards + recent activities
│       ├── Timeline.jsx        # Chronological activity view
│       └── Charts.jsx          # Recharts visualizations
├── .env                        # Template env vars
├── .env.local                  # Local dev credentials (git ignored)
└── package.json                # Dependencies
\\\

---

## Local Development Setup

### 1. Add Database Credentials

Copy your Railway PostgreSQL credentials to \.env.local\:

\\\ash
# .env.local
VITE_API_URL=http://localhost:3001
PGHOST=your-railway-host.railway.internal
PGPORT=5432
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=your-railway-password
PORT=3001
\\\

Get these from your Railway database dashboard (Variables tab).

### 2. Install & Run

\\\ash
npm install

# Run frontend + backend together
npm run dev:full

# Or run separately (in different terminals):
npm run server        # Express backend on port 3001
npm run dev           # Vite frontend on port 5173
\\\

### 3. Test

Open browser: \http://localhost:5173\

---

## Backend API

### GET /api/activity

Fetch activity log entries.

**Query Parameters**:
- \rom\: Start date (YYYY-MM-DD)
- \	o\: End date (YYYY-MM-DD or full ISO)
- \	ype\: 'creation' | 'update' | 'dispatch'
- \job_id\: Filter by job
- \limit\: Max results (default 1000)
- \offset\: Pagination offset (default 0)

**Response**:
\\\json
{
  "data": [
    {
      "id": 123,
      "type": "update",
      "job_id": 456,
      "job_number": "ST-123456",
      "customer_name": "John Doe",
      "old_stage": "needs_scheduling",
      "new_stage": "scheduled",
      "modified_by": "Jane Smith",
      "occurred_at": "2026-05-06T14:30:00.000Z",
      "created_at": "2026-05-06T14:30:05.000Z"
    }
  ],
  "total": 245,
  "limit": 1000,
  "offset": 0
}
\\\

### POST /api/activity

Create activity log entry (called by HVAC tracker).

\\\json
{
  "type": "update",
  "job_id": 456,
  "job_number": "ST-123456",
  "customer_name": "John Doe",
  "old_stage": "needs_scheduling",
  "new_stage": "scheduled",
  "modified_by": "Jane Smith"
}
\\\

---

## Environment Variables

### .env.local (Local Development - git ignored)
\\\
VITE_API_URL=http://localhost:3001
PGHOST=railway-host
PGPORT=5432
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=password
PORT=3001
\\\

### Railway Dashboard (Production)

Set these environment variables in Railway:

\\\
PGHOST=<railway-db-host>
PGPORT=5432
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=<railway-password>
PORT=3001
\\\

The frontend will build and use \http://localhost:3001\ locally, and Railway's internal network on production.

---

## Development Workflow

1. **Make changes** to React components (\src/\*\)
2. **Vite hot-reloads** automatically
3. **Test in browser** at \http://localhost:5173\
4. **Backend changes** (server.js): restart \
pm run server\

---

## Building & Deployment

### Local Build
\\\ash
npm run build
npm run preview
\\\

### Deploy to Railway

1. Push to GitHub:
   \\\ash
   git add .
   git commit -m "Feature: XYZ"
   git push origin main
   \\\

2. Railway auto-detects changes and rebuilds
3. Set environment variables in Railway dashboard
4. Done! 🚀

---

## Current Features

- ✅ Daily summary cards
- ✅ Recent activities list
- ✅ Chronological timeline
- ✅ 5 analytics charts
- ✅ Date range filtering
- ✅ Activity type filtering
- ✅ Job ID search
- ✅ Dark mode
- ✅ Responsive design
- ✅ Direct PostgreSQL connection

---

## Upcoming (Phase 2+)

- CSV export
- Custom dashboards
- WebSocket real-time updates
- Email reports
- Role-based permissions

---

**Last Updated**: 2026-05-06  
**Status**: MVP with backend  
**Phase**: 1
