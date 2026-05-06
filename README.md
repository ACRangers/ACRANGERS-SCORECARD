# AC Rangers Activity Dashboard

A real-time analytics and historical tracking application for the AC Rangers HVAC service company. This app provides detailed insights into job status changes, dispatch patterns, and team performance metrics.

## Features

- **Daily Summary**: Quick overview of jobs created, WOS changes, and dispatches
- **Timeline View**: Chronological view of all activities with full details
- **Analytics Charts**: Visual representation of trends, distributions, and patterns
- **Flexible Filtering**: Filter by date range, activity type, and specific jobs
- **Export Ready**: Structured data for CSV export (Phase 2)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **HTTP Client**: Axios

## Quick Start

### Local Development

\\\ash
# Install dependencies
npm install

# Start dev server
npm run dev
\\\

The app will be available at \http://localhost:5173\

**Note:** The app reads from the HVAC Tracker API at \http://localhost:3000\ (configurable via \.env.local\)

### Build for Production

\\\ash
npm run build

# Preview production build
npm run preview
\\\

## Environment Variables

Create a \.env.local\ file in the project root:

\\\env
VITE_API_URL=http://localhost:3000
\\\

For production (Railway):
\\\env
VITE_API_URL=https://hvac-tracker.railway.app
\\\

## Project Structure

\\\
activity-app/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Daily summary and recent activities
│   │   ├── Timeline.jsx       # Chronological activity view
│   │   └── Charts.jsx         # Analytics charts
│   ├── App.jsx                # Main app container
│   ├── App.css                # Global styles
│   └── index.css              # Tailwind directives
├── index.html                 # HTML entry point
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── package.json               # Dependencies
\\\

## Deployment

The app is deployed via Railway from the GitHub repository:

1. Push changes to GitHub
2. Railway automatically rebuilds and deploys
3. Set \VITE_API_URL\ environment variable in Railway dashboard
