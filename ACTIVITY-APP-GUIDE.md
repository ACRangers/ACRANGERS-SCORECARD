# Activity/Analytics App — Development Guide

## Overview

The **Activity/Analytics App** is a standalone application that provides detailed historical tracking and analysis of all job status changes in the HVAC tracker. It reads from a shared PostgreSQL database (`activity_log` table) populated by the main HVAC tracker.

**Purpose:** Track and visualize:
- WOS (Work Order Status) changes over time
- Job creations
- Dispatch assignments
- Trends, patterns, and team performance metrics

**Status:** Separate from HVAC tracker (removed complex implementation). Database and API infrastructure ready.

---

## Data Source & Architecture

### Where Data Comes From

**Database:** PostgreSQL on Railway (shared with HVAC tracker)
- **Host:** `${PGHOST}` from `.env`
- **Port:** `${PGPORT}` from `.env`
- **Database:** `${PGDATABASE}` from `.env`
- **User:** `${PGUSER}` from `.env`
- **Password:** `${PGPASSWORD}` from `.env`

**Table:** `activity_log` (created in previous migrations)

### Database Schema

```sql
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,  -- 'creation' | 'update' | 'dispatch'
  job_id INT,
  job_number VARCHAR(50),
  customer_name VARCHAR(255),
  old_stage VARCHAR(50),      -- WOS value before change (for 'update' type)
  new_stage VARCHAR(50),      -- WOS value after change
  created_by VARCHAR(100),    -- For 'creation' type
  modified_by VARCHAR(100),   -- For 'update' type
  dispatcher_name VARCHAR(100), -- For 'dispatch' type
  tech_name VARCHAR(100),     -- For 'dispatch' type
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints (Backend: HVAC Tracker)

All endpoints served by `server.js` on Railway.

#### GET `/api/activity`

Fetch activity log entries with optional filtering.

**Query Parameters:**
- `type` (optional): 'creation' | 'update' | 'dispatch'
- `from` (optional): ISO date string (YYYY-MM-DD), inclusive start date
- `to` (optional): ISO date string (YYYY-MM-DD), inclusive end date (must append `T23:59:59.999Z` for end-of-day)
- `job_id` (optional): Filter by specific job
- `limit` (optional): Max results (default 1000)
- `offset` (optional): Pagination offset (default 0)

**Response:**
```json
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
    },
    ...
  ],
  "total": 245,
  "limit": 1000,
  "offset": 0
}
```

#### POST `/api/activity`

Create a new activity log entry (called by HVAC tracker when jobs change).

**Request Body:**
```json
{
  "type": "update",
  "job_id": 456,
  "job_number": "ST-123456",
  "customer_name": "John Doe",
  "old_stage": "needs_scheduling",
  "new_stage": "scheduled",
  "modified_by": "Jane Smith"
}
```

**For creations:** Use `created_by` instead of `modified_by`  
**For dispatches:** Include `dispatcher_name` and `tech_name`

---

## Data Flow

```
HVAC Tracker (main)
    ↓
User changes job WOS in ServiceTitan
    ↓
HVAC Tracker detects change (smartRefresh or manual action)
    ↓
Calls addLogEntry() with change details
    ↓
POST /api/activity → Database
    ↓
Activity Log Table (activity_log)
    ↓
Activity App reads via GET /api/activity
    ↓
Displays trends, charts, analytics
```

---

## Recommended Tech Stack

### Frontend
- **Framework:** React 18+ or Vue 3+ (your choice)
- **Build:** Vite or Create React App / Nuxt
- **UI:** Tailwind CSS or shadcn/ui
- **Charts:** Recharts, Chart.js, or ECharts
- **State:** React Context / useReducer OR Vue 3 Composition API
- **Date handling:** date-fns or Day.js

### Backend (Optional—May Use HVAC Tracker API)
- Node.js/Express (if building separate backend for aggregations)
- OR just use HVAC tracker endpoints directly from frontend

### Hosting
- Railway (same as HVAC tracker) or Vercel/Netlify
- Same database connection string from `.env`

---

## Feature Roadmap

### Phase 1: MVP (Read-Only)
- [ ] Daily summary: Jobs created, WOS changes, dispatches
- [ ] Timeline view: Job by job, all changes in chronological order
- [ ] Filter by date range, job number, customer, WOS
- [ ] Basic bar/line charts: Changes per day, creations per day
- [ ] Export as CSV

### Phase 2: Analytics
- [ ] Team performance: Dispatches by technician
- [ ] Velocity: Days in each WOS stage (average time to schedule, to complete, etc.)
- [ ] Funnel: Jobs created → scheduled → completed
- [ ] Search by technician, job type
- [ ] Heatmap: Peak hours/days

### Phase 3: Advanced
- [ ] Real-time updates (WebSocket to activity_log)
- [ ] Custom dashboards
- [ ] Role-based permissions (Dispatchers see dispatch data, Estimates see creations, etc.)
- [ ] Email reports (daily summary)
- [ ] Integration with ServiceTitan API for richer job context

---

## Environment Setup

### .env (for Activity App)
```
# Database (same as HVAC Tracker)
PGHOST=your-railway-db-host.railway.internal
PGPORT=5432
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=your-password

# API (if building separate backend)
PORT=3001
NODE_ENV=production

# HVAC Tracker API (if using frontend-only approach)
REACT_APP_HVAC_API=https://hvac-tracker.railway.app
```

### Database Connection
```javascript
// Node.js example
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});
```

```javascript
// React/SPA example (use HVAC Tracker API only)
const response = await fetch(`https://hvac-tracker.railway.app/api/activity?from=2026-05-01&to=2026-05-06`);
const { data } = await response.json();
```

---

## Example Queries

### All WOS updates today
```
GET /api/activity?type=update&from=2026-05-06&to=2026-05-06T23:59:59.999Z
```

### All job creations in May
```
GET /api/activity?type=creation&from=2026-05-01&to=2026-05-31T23:59:59.999Z
```

### Specific job history
```
GET /api/activity?job_id=123456
```

### Pagination: Get 50 entries, skip first 100
```
GET /api/activity?limit=50&offset=100
```

---

## Known Gotchas

### Date Range Bug (Fixed in HVAC Tracker)
The `to` parameter must be end-of-day to be inclusive. Server code appends `T23:59:59.999Z` to the ISO date before filtering. Always pass YYYY-MM-DD format; server handles the time.

### Timezone Handling
- Database stores `occurred_at` in UTC (TIMESTAMP)
- API returns ISO 8601 strings (UTC)
- Frontend should parse with `new Date(iso_string)` and format per local timezone
- User's browser timezone is the source of truth for display

### Large Date Ranges
Querying 6+ months of data may be slow. Implement pagination (`limit`/`offset`) or consider aggregation endpoints if needed.

### Activity Log is Write-Once
The HVAC tracker POSTs to activity_log. Do NOT delete or modify entries manually. If a mistake is made, it's recorded as a separate entry.

---

## Code Examples

### React Component: Daily Summary

```jsx
import { useState, useEffect } from 'react';

export default function DailySummary({ date = new Date() }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dateStr = date.toISOString().split('T')[0];
    fetch(`/api/activity?from=${dateStr}&to=${dateStr}T23:59:59.999Z`)
      .then(r => r.json())
      .then(({ data }) => {
        const summary = {
          creations: data.filter(e => e.type === 'creation').length,
          updates: data.filter(e => e.type === 'update').length,
          dispatches: data.filter(e => e.type === 'dispatch').length,
        };
        setData(summary);
      })
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Jobs Created: {data.creations}</p>
      <p>WOS Updates: {data.updates}</p>
      <p>Dispatches: {data.dispatches}</p>
    </div>
  );
}
```

### Node.js Backend: Aggregation Endpoint

```javascript
// GET /api/stats/daily?date=2026-05-06
app.get('/api/stats/daily', async (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  const dateEnd = new Date(date + 'T23:59:59.999Z').toISOString();

  try {
    const result = await pool.query(
      `SELECT type, COUNT(*) as count
       FROM activity_log
       WHERE occurred_at >= $1::timestamp AND occurred_at <= $2::timestamp
       GROUP BY type`,
      [new Date(date).toISOString(), dateEnd]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Deployment

1. **Frontend-only (recommended for MVP):**
   - Deploy React/Vue app to Vercel, Netlify, or Railway
   - Point API calls to `https://hvac-tracker.railway.app/api/activity`
   - No backend needed

2. **Full stack (for complex aggregations):**
   - Deploy backend to Railway alongside HVAC tracker
   - Environment variables managed in Railway dashboard
   - Database connection string shared

---

## Testing Checklist

- [ ] Can fetch last 24 hours of activity
- [ ] Date range filters work correctly
- [ ] Job numbers are accurate
- [ ] WOS labels display correctly
- [ ] Performance acceptable for 1-year date range
- [ ] Pagination works (limit/offset)
- [ ] Error handling (API down, invalid params, etc.)
- [ ] Timezone displays correctly in frontend

---

## Future: Full Activity App

Once this app is built, the HVAC tracker will be lighter and faster—it will only show today's updates in the sidebar. All historical analysis and trends will live in this dedicated app.

**Integration point:** Users click a link in HVAC tracker sidebar to open Activity app in new tab for deeper analysis.

---

## Questions?

Refer back to:
- `HVAC-TRACKER/CLAUDE.md` — main app architecture
- `HVAC-TRACKER/AC-Rangers-Tracker-Guide.md` — WOS reference
- `server.js` — API endpoint implementations
- `activity_log` table schema in Railway database

---

**Last Updated:** 2026-05-06  
**Created by:** Claude Haiku 4.5  
**Status:** Ready for development
