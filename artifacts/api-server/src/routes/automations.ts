import { Router } from "express";
import { db } from "@workspace/db";
import { automations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAutomationBody, UpdateAutomationBody, UpdateAutomationParams, DeleteAutomationParams, RunAutomationParams } from "@workspace/api-zod";
import { writeAudit } from "../audit-writer.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function serialize(a: typeof automations.$inferSelect) {
  return {
    ...a,
    lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

router.get("/automations", async (req, res) => {
  try {
    const rows = await db.select().from(automations).orderBy(automations.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list automations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/automations", async (req, res) => {
  try {
    const body = CreateAutomationBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(automations).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
    writeAudit("automation.create", "automation", {
      entityId: row.id,
      details: `Automation "${row.name}" created`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create automation");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/automations/:id", async (req, res) => {
  try {
    const { id } = UpdateAutomationParams.parse({ id: Number(req.params.id) });
    const body = UpdateAutomationBody.parse(req.body);
    const [row] = await db.update(automations).set({ ...body, updatedAt: new Date() }).where(eq(automations.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
    writeAudit("automation.update", "automation", {
      entityId: row.id,
      details: `Automation "${row.name}" updated — status: ${row.status}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update automation");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/automations/:id", async (req, res) => {
  try {
    const { id } = DeleteAutomationParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(automations).where(eq(automations.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
    writeAudit("automation.delete", "automation", { entityId: id, details: "Automation deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete automation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/automations/generate", async (req, res) => {
  try {
    const { description } = req.body as { description: string };
    if (!description?.trim()) return res.status(400).json({ error: "description required" });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are an automation script generator for a business OS. 
Generate a clean JavaScript automation script that runs as a self-contained function.
The script should use only standard JavaScript (no external imports, no Node.js-specific modules).
Use console.log() to output meaningful status messages.
Return only valid JS code, no markdown, no explanation, no backticks.
The script should be practical, demonstrate the concept clearly, and run synchronously.`
        },
        {
          role: "user",
          content: `Generate an automation script for: "${description}"\n\nReturn only the JavaScript code, no explanation.`
        }
      ]
    });

    const script = completion.choices[0]?.message?.content?.trim() ?? "console.log('Automation ready');";
    const name = description.slice(0, 60);

    res.json({ script, name });
    writeAudit("automation.generate", "automation", { details: `AI-generated script for: ${description.slice(0, 80)}` });
  } catch (err) {
    req.log.error({ err }, "Failed to generate automation script");
    res.status(500).json({ error: "Generation failed" });
  }
});

router.post("/automations/:id/run", async (req, res) => {
  try {
    const { id } = RunAutomationParams.parse({ id: Number(req.params.id) });
    const [row] = await db.select().from(automations).where(eq(automations.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });

    const runAt = new Date();
    let output = "";
    let success = true;
    try {
      const fn = new Function(row.script);
      const result = fn();
      output = result !== undefined ? String(result) : "Script executed successfully";
    } catch (evalErr) {
      success = false;
      output = evalErr instanceof Error ? evalErr.message : "Script error";
    }

    await db.update(automations).set({ lastRunAt: runAt, lastResult: output, updatedAt: runAt }).where(eq(automations.id, id));

    res.json({ success, output, runAt: runAt.toISOString() });
    writeAudit("automation.run", "automation", {
      entityId: id,
      details: `Automation "${row.name}" run — ${success ? "success" : "failed"}: ${output.substring(0, 100)}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to run automation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
