# Drag-and-Drop Kanban, Calendar View + Trend Charts

## What & Why
Three pure UI upgrades that make the app feel professional rather than basic. The Task and Content Calendar Kanban boards have no drag-and-drop, forcing users to use small status buttons. The Content Calendar has no actual calendar grid — only a Kanban column view. And the Metrics page is underused despite Recharts already being installed — there are no trend charts showing how revenue, tasks, or habits change over time.

## Done looks like
- Tasks page: cards can be dragged between Pending / In Progress / Completed columns, with visual drop-zone highlighting and an optimistic status update on drop
- Content Calendar page: cards can be dragged between Idea / Draft / Scheduled / Published columns; a toggle button switches between Kanban view and a monthly calendar grid where scheduled content items appear on their scheduled dates
- Metrics page: three trend charts — Revenue over last 12 weeks (line chart from paid invoices by week), Tasks Completed per week (bar chart from audit log or task updates), Habit Completion Rate per week (line chart, % of habits logged each day averaged per week)
- All charts use the existing Recharts library and match the dark glassmorphism theme (no white backgrounds, electric blue / amber color palette)
- Drag-and-drop uses @hello-pangea/dnd (the maintained fork of react-beautiful-dnd)

## Out of scope
- Mobile touch drag-and-drop
- Cross-board dragging (can't drag a task into the content calendar)
- Chart export / CSV download
- Editing items inline on the calendar grid

## Tasks
1. **Install drag-and-drop library** — Add `@hello-pangea/dnd` to the openclaw frontend package and run pnpm install.

2. **Drag-and-drop Task Kanban** — Wrap the Tasks page Kanban columns with `DragDropContext` and `Droppable`/`Draggable` from @hello-pangea/dnd. On drag end, call the task update mutation to change the status. Add visual drag feedback (card lift shadow, drop zone highlight).

3. **Drag-and-drop Content Calendar Kanban** — Apply the same drag-and-drop pattern to the Content Calendar columns (Idea / Draft / Scheduled / Published). On drop, update content item status via the existing mutation.

4. **Monthly calendar grid view for Content Calendar** — Add a view toggle (Kanban / Calendar) on the Content Calendar page. The calendar grid shows the current month with each day cell, and places content item chips on their `scheduledDate`. Clicking a chip opens the edit sheet. Month navigation with prev/next arrows.

5. **Revenue, task, and habit trend charts on Metrics page** — Add three Recharts charts to the Metrics page: a line chart of weekly revenue (grouped paid invoices by week for last 12 weeks), a bar chart of tasks completed per week, and a line chart of habit completion rate per week. Fetch data from existing financial summary, tasks list, and habits + habit logs endpoints, grouping on the frontend by ISO week.

## Relevant files
- `artifacts/openclaw/src/pages/tasks.tsx`
- `artifacts/openclaw/src/pages/content-calendar.tsx`
- `artifacts/openclaw/src/pages/metrics.tsx`
- `artifacts/openclaw/package.json`
- `lib/api-spec/openapi.yaml`
