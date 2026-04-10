# Multi-Agent AI Core + Control Modes

## What & Why
Transform the current basic chat interface into the true multi-agent Jarvis architecture described in the OpenClaw system document. Right now, the AI chat sends messages with no system prompt and never uses the stored memories. This task wires in the master system identity, memory injection, agent routing, and control mode switching — making OpenClaw behave like the OS it's meant to be.

## Done looks like
- Every chat call injects the master OpenClaw system prompt (7-agent identity: CEO, Revenue, Ops, Analytics, Communication, Memory, Integration agents)
- All stored AI memories are automatically prepended into every conversation as system context, so the AI "remembers" clients, projects, preferences, and decisions
- The AI page has a visible agent selector: users can direct their message to CEO Agent, Revenue Agent, Operations Agent, or Analytics Agent — each routes to a specialized sub-prompt that focuses the response
- A Control Mode switcher (Full Auto / Assist / Manual / Money Mode) lives in the sidebar or header; Money Mode makes Revenue Agent dominant with a distinct amber/gold UI accent
- Asking "What should I do today?" triggers a structured 5-section output: Top 3 revenue tasks, Top 3 operational tasks, Client follow-ups, Risks, Fast money opportunities — populated from live DB data injected into the prompt
- The Daily Briefing page uses AI to generate a real narrative insight (currently it's just string concatenation), calling GPT with the aggregated data to produce a personalized strategic summary

## Out of scope
- Real autonomous agent execution (agents don't take actions on their own — they advise)
- Voice input
- External calendar or email integration

## Tasks
1. **Master system prompt + memory injection** — Add the full OpenClaw multi-agent identity as a system message at the start of every chat call. Before streaming, fetch all stored memories and inject them as a "MEMORY AGENT CONTEXT" system block so the AI has persistent awareness.

2. **Agent routing on the backend** — Add an optional `agentMode` field to the send-message request body. Each mode (ceo, revenue, ops, analytics, general) prepends a targeted sub-prompt that directs the AI's focus and persona for that turn.

3. **Agent selector + Control Mode UI** — Add an agent-selector row above the chat input on the AI page (CEO / Revenue / Ops / Analytics chips). Add a Control Mode dropdown (Full Auto, Assist, Manual, Money Mode) that persists in localStorage. Money Mode activates an amber color theme and defaults the agent to Revenue.

4. **"What should I do today?" structured output** — Add a `/api/intelligence/daily-plan` endpoint that queries DB for overdue tasks, hot leads, unpaid invoices, and upcoming milestones, then calls GPT to format a structured 5-section strategic plan and streams it back. Wire a "DAILY PLAN" button on the AI page that triggers this.

5. **AI-powered briefing narrative** — Replace the string-concatenated `aiInsight` field in the briefing endpoint with a real GPT call that receives all the aggregated data and returns a 2–3 sentence strategic morning narrative.

## Relevant files
- `artifacts/api-server/src/routes/openai.ts`
- `artifacts/api-server/src/routes/briefing.ts`
- `artifacts/api-server/src/routes/memories.ts`
- `artifacts/openclaw/src/pages/ai.tsx`
- `artifacts/openclaw/src/pages/briefing.tsx`
- `lib/api-spec/openapi.yaml`
- `lib/db/src/schema/memories.ts`
- `attached_assets/Pasted--OPENCLAW-ULTIMATE-JARVIS-OPERATING-SYSTEM-PROMPT-v2-Yo_1775844147703.txt`
