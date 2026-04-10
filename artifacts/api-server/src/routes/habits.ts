import { Router } from "express";
import { db } from "@workspace/db";
import { habits, habitLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateHabitBody, UpdateHabitBody } from "@workspace/api-zod";
import { writeAudit } from "../audit-writer.js";

const router = Router();

function serialize(h: typeof habits.$inferSelect) {
  return {
    ...h,
    lastCompleted: h.lastCompleted?.toISOString() ?? null,
    createdAt: h.createdAt.toISOString(),
  };
}

router.get("/habits", async (req, res) => {
  try {
    const rows = await db.select().from(habits).orderBy(habits.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list habits");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits", async (req, res) => {
  try {
    const body = CreateHabitBody.parse(req.body);
    const [row] = await db.insert(habits).values(body).returning();
    res.status(201).json(serialize(row));
    writeAudit("habit.create", "habit", {
      entityId: row.id,
      details: `Habit "${row.name}" created — frequency: ${row.frequency}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create habit");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/habits/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateHabitBody.parse(req.body);
    const [row] = await db.update(habits).set(body).where(eq(habits.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
    writeAudit("habit.update", "habit", {
      entityId: row.id,
      details: `Habit "${row.name}" updated`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update habit");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/habits/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(habitLogs).where(eq(habitLogs.habitId, id));
    const deleted = await db.delete(habits).where(eq(habits.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
    writeAudit("habit.delete", "habit", { entityId: id, details: "Habit deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits/:id/complete", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    if (!habit) return res.status(404).json({ error: "Not found" });

    const now = new Date();
    const lastCompleted = habit.lastCompleted;
    let newStreak = habit.streak;

    if (lastCompleted) {
      const diffHours = (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60);
      if (diffHours < 20) {
        return res.json(serialize(habit));
      }
      if (diffHours < 48) {
        newStreak = habit.streak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const bestStreak = Math.max(habit.bestStreak, newStreak);

    await db.insert(habitLogs).values({ habitId: id });
    const [updated] = await db.update(habits).set({
      streak: newStreak,
      bestStreak,
      totalCompletions: habit.totalCompletions + 1,
      lastCompleted: now,
    }).where(eq(habits.id, id)).returning();

    res.json(serialize(updated));
    writeAudit("habit.log", "habit", {
      entityId: id,
      details: `Habit "${habit.name}" logged — streak: ${newStreak}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to complete habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
