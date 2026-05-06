# Activity App – Claude Development Guide

## Project Overview

The **Activity App** is a standalone analytics dashboard for the AC Rangers HVAC business. It reads from a shared PostgreSQL database (\ctivity_log\ table) populated by the main HVAC tracker and provides historical tracking and trend analysis.

**Purpose**: Display activity trends, job status changes, dispatch patterns, and team performance metrics over time.

**Tech Stack**:
- **Frontend**: React 18 + Vite (no backend needed for MVP)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **API Client**: Axios (or fetch)

---

## Project Structure

\\\
src/
├── App.jsx                     # Main app, view navigation, filters
├── App.css                     # Global app styles
├── index.css                   # Tailwind + custom components
└── components/
    ├── Dashboard.jsx           # Daily summary cards + recent activities
    ├── Timeline.jsx            # Chronological activity view
    └── Charts.jsx              # Recharts visualizations
\\\

---

## Key Components

### App.jsx
- Main container component
- Manages active view state (dashboard, timeline, charts)
- Filter state (date range, activity type, job ID)
- Fetches data from HVAC Tracker API
- Passes data to child components

### Dashboard.jsx
- Shows 4 summary cards (Total, Creations, Updates, Dispatches)
- Lists 20 most recent activities
- Quick glance at current activity

### Timeline.jsx
- Chronological list of all activities
- Grouped by date
- Shows full details (stage changes, tech info, etc.)
- Colored badges by activity type

### Charts.jsx
- **Pie Chart**: Activity type distribution
- **Stacked Bar Chart**: Daily activity trends
- **Line Chart**: Activity count over time
- **Horizontal Bar**: Top stage transitions
- **Bar Chart**: Technician dispatch counts

---

## API Integration

**Base URL**: Configured via \VITE_API_URL\ env var

**Endpoint**: \/api/activity\

**Query Parameters**:
- \rom\: ISO date string (YYYY-MM-DD)
- \	o\: ISO date string + time (YYYY-MM-DD)T23:59:59.999Z)
- \	ype\: 'creation' | 'update' | 'dispatch'
- \job_id\: Filter by specific job
- \limit\: Max results (default 1000)
- \offset\: Pagination offset (default 0)

**Response Format**:
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

---

## Development Workflow

### Local Development

\\\ash
# Install dependencies
npm install

# Start Vite dev server (port 5173)
npm run dev

# In another terminal, make sure HVAC tracker is running on port 3000
cd ../hvac-tracker
npm start
\\\

### Testing

1. Open browser: \http://localhost:5173\
2. Set date range and filters
3. Check:
   - Dashboard shows correct summary counts
   - Timeline displays all activities in order
   - Charts render without errors
   - Dark mode works (browser system preference)
   - Responsive on mobile widths

### Building & Deployment

\\\ash
# Build for production
npm run build

# Preview build locally
npm run preview

# Deploy to Railway via git push
git push origin main
\\\

---

## Common Tasks

### Add a New Chart
1. Open \Charts.jsx\
2. Create data transformation function (useMemo)
3. Add Recharts component (BarChart, LineChart, PieChart, etc.)
4. Import necessary Recharts components
5. Test with sample data

### Update API Endpoint
1. Change \API_BASE\ in \App.jsx\
2. Update query parameters as needed
3. Test with browser DevTools (Network tab)

### Add New Filter
1. Add state to \ilters\ object in \App.jsx\
2. Create UI control in filter section
3. Update \etchActivities() to include new param
4. Pass filtered data to components

### Add Dark Mode Toggle
1. Tailwind dark mode is automatic (respects system preference)
2. For manual toggle: create context provider or useState for theme
3. Add class to html element: \<html class="dark">\

---

## Environment Setup

### .env.local (Local Development)
\\\
VITE_API_URL=http://localhost:3000
\\\

### .env (Production Template)
\\\
VITE_API_URL=https://hvac-tracker.railway.app
\\\

### Railway Dashboard
Set environment variable:
\\\
VITE_API_URL=https://hvac-tracker.railway.app
\\\

---

## Current Features (MVP Phase 1)

- ✅ Daily summary (4 stat cards)
- ✅ Recent activities list (Dashboard view)
- ✅ Chronological timeline (Timeline view)
- ✅ Activity type distribution (Pie chart)
- ✅ Daily trends (Stacked bar chart)
- ✅ Activity over time (Line chart)
- ✅ Stage transitions (Horizontal bar)
- ✅ Technician dispatch count (Bar chart)
- ✅ Date range filtering
- ✅ Activity type filtering
- ✅ Job ID filtering
- ✅ Dark mode support
- ✅ Responsive design

## Upcoming Features (Phase 2+)

- [ ] CSV export
- [ ] Custom dashboard builder
- [ ] Real-time WebSocket updates
- [ ] Email reports
- [ ] Role-based access
- [ ] Advanced search filters

---

## Styling Notes

- **Framework**: Tailwind CSS
- **Dark Mode**: Automatic via \dark:\ prefix
- **Custom Components**: Defined in \index.css\ (@layer components)
- **No CSS-in-JS**: Keep all styles in CSS files
- **Responsive**: Mobile-first approach

---

## Testing Checklist

Before pushing:
- [ ] All filters work correctly
- [ ] Date ranges are accurate
- [ ] Charts render without console errors
- [ ] Activity counts match API response
- [ ] Timeline is chronologically correct
- [ ] Dark mode looks good
- [ ] Responsive on mobile (375px width)
- [ ] API calls complete in < 5 seconds
- [ ] No unused imports or dead code

---

## Deployment

1. Commit and push to GitHub:
   \\\ash
   git add .
   git commit -m "Feature: Add XYZ"
   git push origin main
   \\\

2. Railway automatically detects push and rebuilds
3. Verify deployment at: \https://activity-app.railway.app\ (or configured domain)

---

## Known Limitations

- Timezone handling: App displays in user's local timezone (UTC stored in DB)
- Large date ranges (6+ months) may be slow; use pagination
- Activity log is write-once (no edits/deletes from app)
- Chart rendering slows with 10k+ data points

---

## References

- HVAC Tracker: \../hvac-tracker/CLAUDE.md\
- Activity App Guide: \../hvac-tracker/ACTIVITY-APP-GUIDE.md\
- React Docs: https://react.dev
- Tailwind Docs: https://tailwindcss.com
- Recharts Docs: https://recharts.org

---

**Last Updated**: 2026-05-06  
**Status**: MVP Ready  
**Phase**: 1
