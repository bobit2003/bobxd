---
title: Real-Time Command Center + Living Agent Map
---
# Real-Time Command Center + Living Agent Map

## What & Why
The Command Center dashboard currently shows a simulated activity feed of fake terminal logs — none of it is real. The Agent Network map is a fully hardcoded SVG with no connection to actual system data. This task replaces all fake data with live, real-time feeds: a true SSE stream from the audit log for the activity feed, and a data-driven Agent Map that shows actual conversation counts, task volumes, automation runs, and revenue flows per node.

Additionally, this task adds a proactive alert system — a banner/panel that surfaces urgent items the OS detected on its own without the user asking: overdue tasks, habit streaks at risk, unpaid invoices past due date, hot leads going cold.

## Done looks like
- The Command Center activity feed shows real system events in real time via SSE — every task update, invoice action, lead change, habit log, automation run, and AI conversation appears as a terminal-style log line as it happens
- All system CRUD operations (task created/updated, invoice marked paid, lead converted, habit logged, automation run) automatically write entries to the audit log table
- The Agent Map nodes display live statistics: AI Brain node shows conversation count, Ops node shows task counts, Revenue node shows total pipeline value, Automation node shows run count — updated on page load
- A "System Alerts" panel sits at the top of the Command Center showing proactive warnings: overdue tasks count, habits not logged today, hot leads idle 7+ days, invoices past due — each with a quick-link to the relevant page
- Clicking any alert dismisses it for the session

## Out of scope
- Push notifications or browser notifications
- Email alerts
- Per-user alert preferences / settings page

## Tasks
1. **Audit log auto-instrumentation** — Add middleware or helper calls so that key operations (task create/update/complete, lead create/convert, invoice mark-paid, habit log, automation run) all automatically write a structured entry to the `audit_log` table with action, entity type, entity name, and timestamp.

2. **Real-time activity feed SSE endpoint** — Create `GET /api/audit/stream` that opens an SSE connection and pushes the 20 most recent audit log entries on connect, then pushes new entries as they are written (using a polling interval of 3 seconds or a DB-trigger-like approach). Replace the simulated log generator on the dashboard with this SSE stream.

3. **Proactive alerts endpoint** — Create `GET /api/intelligence/alerts` that scans for: tasks overdue, habits not logged today, invoices past due date, hot leads idle 7+ days. Returns an array of alert objects with type, message, severity, and link. Render these as a dismissible alert strip at the top of the dashboard.

4. **Living Agent Map with real data** — Add `GET /api/intelligence/agent-stats` that returns live counts for each agent domain: AI Brain (conversation count, message count), Operations (active tasks, projects), Revenue (pipeline value, hot leads), Automation (automations count, recent runs). Update the Agent Map page to fetch this data and display the live numbers on each node as a small stat badge.

## Relevant files
- `artifacts/api-server/src/routes/audit.ts`
- `artifacts/api-server/src/routes/dashboard.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/openclaw/src/pages/dashboard.tsx`
- `artifacts/openclaw/src/pages/agent-map.tsx`
- `lib/db/src/schema`
- `lib/api-spec/openapi.yaml`