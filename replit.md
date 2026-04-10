# BobXD OS

## Overview

BobXD OS is an ultimate AI-powered command center — a personal operating system for a solo builder/operator. It combines an AI brain (GPT chat), project management, task tracking, client management, automation hub, habit tracking, goal tracking, knowledge base, AI memory engine, metrics, daily briefing, and a visual agent communication network map in one dark, cinematic, cockpit-style interface.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/openclaw) at `/`
- **API framework**: Express 5 (artifacts/api-server) at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2) — no user API key needed
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Animation**: framer-motion

## Design System

- Dark background (#0a0a0a), electric blue (#00bfff) primary, amber (#f59e0b) secondary, violet (#8b5cf6) for AI elements
- Fonts: JetBrains Mono / Space Mono (loaded in index.css)
- Glassmorphism with backdrop blur, glowing borders, animated pulses
- Uppercase tracking-widest labels, monospace throughout
- Status bar at top (uptime, API ping, system clock), collapsible sidebar on left
- framer-motion for page transitions and animations

## Pages (20 total)

- `/` — **Command Center** — live dashboard with stats, activity feed, active directives, priority queue
- `/briefing` — **Morning Briefing** — AI-generated daily brief with greeting, tasks due, priorities, insight, quote
- `/agent-map` — **Agent Network** — interactive graph of AI agent architecture with flowing SVG connections
- `/ai` — **AI Brain** — streaming GPT-5.2 chat with conversation history
- `/memories` — **AI Memory Bank** — persistent context storage, categories, importance levels
- `/projects` — **Projects** — CRUD with status, type, client link
- `/tasks` — **Tasks** — Kanban-style CRUD with priority/status/due dates
- `/goals` — **Mission Objectives** — goal tracking with progress bars, milestones, categories
- `/clients` — **Clients** — CRUD with status indicators
- `/notes` — **Knowledge Base** — searchable notes with tags, categories
- `/habits` — **Habit Tracker** — daily habits with streaks, completion logging, best streak tracking
- `/metrics` — **Telemetry Data** — log and track any metric (revenue, hours, etc.)
- `/leads` — **Lead Pipeline** — prospect tracking with score (hot/warm/cold), stage pipeline, convert to client+project
- `/invoices` — **Invoices** — billing with financial summary cards (revenue, expenses, net profit, unpaid), mark paid
- `/expenses` — **Expenses** — cost tracking with categories (software, hosting, ai_tools, domain, hardware, marketing)
- `/time` — **Time Tracker** — hours logging with billable/non-billable split, totals
- `/milestones` — **Milestones** — project checkpoints with status toggle (pending/in_progress/completed/overdue)
- `/content` — **Content Calendar** — Kanban-style board (idea/draft/scheduled/published) for multi-platform content
- `/automations` — **Automation Hub** — scripts with triggers and manual run
- `/command-log` — **System Audit Log** — immutable action history with filtering

## Enhanced Features

- **Cmd+K Command Palette** — global search across all data (projects, tasks, clients, notes, leads, invoices, content) + navigation
- **Global Search API** — search endpoint that queries all entities simultaneously
- **AI Memory Engine** — store and retrieve persistent AI memories across conversations
- **Habit Streaks** — automatic streak calculation with best streak tracking
- **Daily Briefing** — AI-generated personalized morning brief with tasks, financials, leads, milestones, content intel
- **Sidebar Sections** — nav items grouped into Command, Intelligence, Operations, Business, System
- **Live Timer** — start/stop timer on Time Tracker that auto-logs billable entries
- **Cross-linking** — invoices show clickable client/project names, milestones show project names
- **Real Progress** — dashboard project progress calculated from milestones/tasks, not random
- **Integrated Dashboard** — financial cards (revenue, unpaid, billable hours) + pipeline stats on Command Center
- **Integrated Briefing** — 8-card layout with unpaid invoices, hot leads, billable hours, content queued, upcoming milestones/content

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `cd lib/db && npx drizzle-kit push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/openclaw run dev` — run frontend locally

## DB Schema

- `conversations` + `messages` — AI chat history
- `projects` — tracked builds and tools
- `tasks` — to-dos with priority/status
- `clients` — client records
- `automations` — script-based automation rules
- `notes` — knowledge base entries with tags, categories, pinning
- `habits` + `habit_logs` — habit tracking with streak calculation
- `goals` — mission objectives with progress and milestones (JSON)
- `memories` — persistent AI context storage
- `audit_log` — system action history
- `metrics` — quantitative metric tracking
- `leads` — prospect pipeline with score, stage, budget, service, source
- `invoices` — billing records with status, line items, due/paid dates
- `expenses` — cost tracking with category, date, project link
- `time_entries` — time logging with hours, billable flag, project/task link
- `milestones` — project checkpoints with status, due date, completion
- `content_items` — content calendar with platform, type, status, engagement

## Scratchpad

- App name: **BobXD OS** (artifact slug stays `openclaw`)
- AI streaming uses raw `fetch()` with ReadableStream, NOT the `useSendOpenaiMessage` hook
- Hook pattern: `useGetThing(id, { query: { enabled: !!id, queryKey: getGetThingQueryKey(id) } })`
- Never use emojis in the UI
- `@workspace/integrations-openai-ai-server` added to api-server dependencies

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
