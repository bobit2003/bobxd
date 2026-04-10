# BobXD OS

## Overview

BobXD OS is an ultimate AI-powered command center — a personal operating system for a solo builder/operator. It combines an AI brain (GPT chat), project management, task tracking, client management, and an automation hub in one dark, fast, cockpit-style interface.

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

## Features

- **Command Dashboard** — live stats: projects, tasks, clients, automations, AI conversations
- **AI Brain** — streaming GPT chat, conversation history, create/delete threads
- **Projects** — CRUD: name, description, status, type, client link
- **Tasks** — CRUD: title, priority, status, due date, project/client link
- **Clients** — CRUD: name, email, company, status
- **Automation Hub** — write scripts, trigger manually, view last run results

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/openclaw run dev` — run frontend locally

## DB Schema

- `conversations` + `messages` — AI chat history
- `projects` — tracked builds and tools
- `tasks` — to-dos with priority/status
- `clients` — client records
- `automations` — script-based automation rules

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
