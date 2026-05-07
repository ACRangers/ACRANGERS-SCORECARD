# AC Rangers HVAC Tracker — Claude Development Guide

## Project Overview

**AC Rangers HVAC Tracker** is a real-time dispatch and billing pipeline for HVAC service companies. It reads live job data from ServiceTitan API and organizes jobs into visual boards based on **Work Order Status (WOS)** — a custom field in ServiceTitan.

**Key principle:** The tracker does NOT replace ServiceTitan. It reflects and organizes data from ServiceTitan. All actual changes (scheduling, invoicing, marking complete) happen in ServiceTitan; the tracker displays the state and suggests next actions.

**Users:** Dispatchers, Estimates Team, Invoicing Team, Managers/Owners

**Access:** Hosted on Railway. Chrome or Edge recommended.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript + HTML/CSS (no frameworks)
  - Single file: `public/index.html` (~4000 lines)
  - No build step, no bundler
  - Responsive grid/flexbox layout
- **Backend:** Node.js + Express 5.2.1
  - File: `server.js`
  - Serves static files + handles API routes
- **Database:** PostgreSQL (optional, not currently used for core features)
- **External API:** ServiceTitan (reads job data)
- **Hosting:** Railway (deployed via git push)
- **Environment:** CommonJS, dotenv for secrets (.env file)

---

## Architecture & How It Works

### Data Flow

1. **Frontend loads** → Checks `server.js` for job data endpoint
2. **Server fetches** from ServiceTitan API (if needed) or returns cached/stored data
3. **Frontend renders** jobs into board columns based on their **Work Order Status (WOS)**
4. **User actions** (scheduling, sending estimates, invoicing) are done in ServiceTitan
5. **Page refresh** pulls fresh data from ServiceTitan
6. **Activity log** tracks changes locally (localStorage)

### Key Concepts

#### Work Order Status (WOS)
- Custom field in ServiceTitan set on each job
- Determines which board column a job appears in
- Examples: "Needs Scheduling", "Scheduled", "Awaiting Approval (Estimate Sent)", "Invoiced", "Completed (Payment Received)"
- See `AC-Rangers-Tracker-Guide.md` for complete WOS reference

#### Boards (5 total)
1. **Work Orders** — General service/repair jobs (excludes install, major repair, warranty, maintenance)
2. **Installs** — New installation jobs
3. **Major Repairs** — Major repair jobs
4. **Warranties** — Warranty work
5. **Maintenance** — Maintenance jobs (filtered by job type)

Each board has columns representing stages in the workflow. Jobs move between columns as their WOS changes.

#### Key Filters
- **Urgency** — Color-coded by age and status (Fresh, Stale, Urgent)
- **Work Order Type** — Multi-select dropdown (Maintenance, HVAC Service, HVAC Repair, No Cool)
- **Role** — Filter by user role (Dispatcher, Estimates, Invoicing, Manager)
- **Search** — Job number or customer name
- **Calendar** — Date-based view of scheduled appointments
- **Activity Log** — History of all job status changes

---

## Code Structure

### public/index.html
The entire frontend lives here. Key sections:

| Line Range | Section | Purpose |
|---|---|---|
| 1-600 | CSS Styles | Layout, colors, responsive design, dark mode |
| 600-700 | Filter UI HTML | Sidebar with filters, search, role selector |
| 700-900 | Board layout HTML | Cards, tabs, column structure |
| 900-1000 | Calendar & History page HTML | Day view, week calendar, activity log |
| 1200-1400 | COLUMN_TASKS object | Task guidance for each stage (shows in tooltips) |
| 1400-1500 | BOARDS config | Defines which jobs go on which board |
| 1500-2000 | Board rendering functions | `renderBoard()`, `switchBoard()`, filter logic |
| 2000-2100 | Calendar functions | `renderDayView()`, `renderCalendar()` |
| 2100-2300 | History page | `renderHistoryPage()` |
| 2400-3000 | Utility functions | `jobType()`, `getJobStageInfo()`, badge rendering |
| 3000-3600 | Filter management | `setTypeFilter()`, `clearAllFilters()`, etc. |
| 3600-END | Activity log, data handlers | `addLogEntry()`, `updateLog` management |

### server.js
- Express server on port 3000
- Serves `public/index.html` and static files
- May have API endpoints for future data fetching (currently minimal)

### AC-Rangers-Tracker-Guide.md
- User-facing documentation
- Complete WOS reference
- Board and column explanations
- How to use features

---

## Development Workflow

### Before Starting
1. Read `AC-Rangers-Tracker-Guide.md` to understand WOS and board logic
2. Check current git status: `git status`
3. Pull latest: `git pull origin main`

### During Development
1. Start dev server: `npm start` (runs `node server.js`)
2. Open browser: `http://localhost:3000`
3. Make changes to `public/index.html`
4. Refresh browser to test (no build needed)
5. Test all affected features in the UI before committing

### Before Committing
- **Manual browser testing required** — test affected features in browser
- Check for console errors (F12 → Console)
- Verify data accuracy (filters, sorting, calculations work correctly)
- Test edge cases (empty states, long names, multiple filters)
- Check dark mode if UI changes (click dark icon in topbar)

### Git Workflow
1. Make and test changes locally
2. Stage: `git add public/index.html` (or specific files)
3. Commit with clear message (see style guide below)
4. **Always push** to remote: `git push origin main` (no asking needed)

---

## User Preferences & Guidelines

### Code Style
- **Comments:** Minimal. Only explain WHY, not WHAT. Well-named code is self-documenting.
- **Functions:** Keep focused and concise. Avoid premature abstractions.
- **Variables:** Use clear names. Global state is OK for this single-file architecture.
- **No unused code:** Delete instead of leaving commented-out code.

### Feature Development
- Do NOT add features beyond what was explicitly requested
- Do NOT add error handling for impossible scenarios
- Do NOT add backwards-compatibility hacks
- Do NOT over-engineer for hypothetical future needs
- **Keep it simple.** Three similar lines beats a premature abstraction.

### Communication
- **Speak in short sentences. No fillers.**
- Be concise and direct.
- Use plain language only.
- Focus on what changed and what's next.
- One or two sentences for updates.
- No lengthy explanations or preamble.
- No "Let me...", "I'll...", "I've...", or recap statements.
- Just state the result and move forward.

### Deployment
- **Always push commits** after creating them (no confirmation needed)
- Railway automatically deploys from main branch
- Manual deployment process: make change → commit → push → Railway redeploys

---

## Important Files & Code Locations

### Key Objects & Constants
```
Line 1486-1530: BOARDS object
  - workorders, installs, majorrep, warranty, maintenance boards
  - Each board has: filter function, stages, stageConfig
  - Board filter determines which jobs appear where

Line 1219-1484: STAGES, INSTALL_STAGES, MAJOR_REPAIR_STAGES, WARRANTY_STAGES
  - Map WOS values to column keys
  - Used to determine where jobs appear

Line 1242-1400: COLUMN_TASKS object
  - Task guidance for each stage
  - Shows when user clicks 📋 Tasks badge
  - Update these when workflow changes

Line 1207-1212: Filter state variables
  - workOrdersTypeFilter, activeRole, urgencyFilter, searchQuery
  - calJobTypeFilter, calStatusFilter, calEstimateFilter (for calendar)
```

### Key Functions
```
Line 1587-1628: switchBoard(boardKey)
  - Changes current board
  - Updates UI, re-renders

Line 1857-2020: renderDayView()
  - Renders calendar day view
  - Creates timeline with tech rows
  - Job cards on calendar

Line 2191-2300: renderHistoryPage()
  - Renders activity log
  - Shows job status changes with timestamps

Line 1571-1575: setTypeFilter(value)
  - Updates work order type filter
  - Re-renders board

Line 1578-1583: setRoleFilter(role)
  - Filters by user role
  - Updates visibility

Line 3598-3700: clearAllFilters()
  - Resets all filters to default
  - Clears search
```

### Key Filter Functions
```
Line 3545-3600: hasActiveFilters(), updateClearFilterBtn()
  - Check if any filter is active
  - Show/hide Clear Filters button

Line 3610-3630: clearAllFilters()
  - Reset filters, re-render board

Line 3898-3906: addLogEntry(entry)
  - Log job status changes to localStorage
  - Entry format: {time, jobId, jobNumber, oldStage, newStage, isNew, modifiedBy}
```

### Styling System
```
Line 1-100: CSS Variables (--bg, --surface, --border, --text1, etc.)
  - Used throughout for theming
  - Dark mode support

Line 72: .sidebar CSS
  - Filter sidebar styling

Line 403: .day-view-tech-label CSS
  - Technician labels in calendar day view

Line 413: .day-view-card CSS
  - Job cards on calendar timeline
```

---

## Common Tasks

### Add a New Filter Option
1. Add filter state variable near top (line ~1210)
2. Create setter function (see `setTypeFilter` pattern at line 1571)
3. Add HTML filter element in sidebar (line 541-569)
4. Update `renderBoard()` to filter jobs based on new variable
5. Add filter reset to `clearAllFilters()`

### Update Column Tasks (Guidance)
1. Find COLUMN_TASKS at line 1242
2. Locate the column key (e.g., `awaiting`, `openestimates`)
3. Update the `goal` and/or `tasks` array
4. No code change needed — guidance displays when user clicks 📋

### Add a New Board or Column
1. Add WOS values to STAGES or board-specific STAGES (line 1219)
2. Update BOARDS object (line 1486) with new board config
3. Add menu item HTML (line ~508)
4. Update board filters if needed
5. Add CSS styling if new column needs special look

### Update Job Indicators/Badges
1. Find `getJobIndicators()` at line 1402
2. Add or modify badge logic based on job properties
3. Badges show flags like "⚠ No Invoice Sent", "✓ Payment Detected"

### Fix Filter/Search Logic
1. Find `renderBoard()` or relevant filter function
2. Update the `filter()` condition
3. Test with multiple filter combinations
4. Ensure edge cases handled (empty results, partial matches)

---

## Current Features & Recent Work

### Implemented Features
- ✅ 5 board system (Work Orders, Installs, Major Repairs, Warranties, Maintenance)
- ✅ Multi-column workflow for each board
- ✅ Real-time ServiceTitan data integration
- ✅ Filter sidebar (type, role, urgency, search)
- ✅ Clear Filters button
- ✅ Calendar week view
- ✅ Calendar day view with technician timeline
- ✅ Activity/History page with date filtering
- ✅ Job hyperlinks to ServiceTitan
- ✅ Job indicators (badges for open estimates, unpaid invoices, etc.)
- ✅ Dark mode
- ✅ Responsive layout

### Recent Changes (Last Sprint)
- Added scroll synchronization for day view (sidebar + timeline scroll together)
- Removed job type toggle pills (keep multi-select dropdown)
- Improved Clear Filters button styling
- Reorganized column tasks for clearer workflows
- Added invoice indicator checks (No Invoice Sent Date, Payment Detected)
- Schedule Completed column overhauled for audit workflow
- Fixed "modified by" to use job history (shows who last changed job, not creator)
  - Removed job history fetching due to API performance constraints
  - Falls back to `createdByName` from job record
  - See "Custom Field Change History Limitation" for details
- Parallelized invoice and appointment fetching in API endpoints for ~50% performance improvement

---

## Key Gotchas & Decisions

### WOS is Everything
Jobs appear on the board based solely on their WOS value. If a job seems to be in the wrong place, check its WOS in ServiceTitan first.

### No Real Persistence
The tracker reads from ServiceTitan on every page load. Activity log is stored in localStorage (client-side only). There is no database backend storing job state — ServiceTitan is the source of truth.

### Appointment Status vs. WOS
- Technician marks appointment "Done" in ServiceTitan → triggers auto-move to Schedule Completed or Open Estimates
- WOS change is manual (dispatcher sets it in ServiceTitan) → controls main board position

### Multi-Select Filters
Type filter is multi-select via dropdown (not pills). Multiple selections are OR'd together. All other filters are single-select or additive.

### ServiceTitan API Limits
API calls may be rate-limited or slow. The `/api/jobs` endpoint enriches every job with appointment and invoice data via batch API calls, which takes time proportional to the job count. For 300+ jobs, expect 30-60+ seconds. The 3-minute cache helps, and the smart refresh endpoint (called every 60s) only fetches recent changes and is much faster. For development/testing with large date ranges, use narrow date windows or clear the cache with `/api/cache/clear`.

### Custom Field Change History Limitation
ServiceTitan's public REST API does not expose custom field change history (who modified the Work Order Status, when, from what value to what). The `/jobs/{id}/history` endpoint only returns job events (Booked, Completed, Rescheduled, etc.), not field-level changes. Activity log "Modified By" currently shows the last employee to interact with the job or its creator as fallback. If detailed WOS change tracking is needed, this would require either:
- Direct access to ServiceTitan's internal audit trail (discovered via network inspection but not accessible via public API)
- Manual tracking/logging in our own database when WOS changes are detected
- Integration with ServiceTitan's Notes API to correlate field changes with notes

### localStorage Activity Log
Activity log is stored in browser localStorage under `updateLog`. It persists across page refreshes but is lost if cache is cleared. Consider this when deciding if changes should be logged.

---

## Before Asking for Help

1. **Check the guide:** `AC-Rangers-Tracker-Guide.md` has comprehensive WOS and board info
2. **Inspect the UI:** F12 → Console for errors, Network tab for API issues
3. **Trace the code:** Look for similar functions or patterns already in place
4. **Test thoroughly:** Browser test before reporting issues

---

## Sources & References

For CLAUDE.md best practices:
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- [CLAUDE.md Best Practices - UX Planet](https://uxplanet.org/claude-md-best-practices-1ef4f861ce7c)
- [How to Write a Good CLAUDE.md File - Builder.io](https://www.builder.io/blog/claude-md-guide)
- [Writing a good CLAUDE.md - HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

---

## Questions for Future Chats

If starting a new chat, clarify:
- What specific change or feature are you adding?
- Which board/column does it affect?
- Should it involve ServiceTitan API changes?
- What needs testing before deployment?

---

**Last Updated:** 2026-05-05  
**By:** Claude Haiku 4.5  
**Status:** Active project, ongoing development as-needed
