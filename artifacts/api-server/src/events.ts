import { db } from "@workspace/db";
import { events } from "@workspace/db";
import { Response } from "express";

const subscribers = new Set<Response>();

export function subscribeToEvents(res: Response) {
  subscribers.add(res);
  res.on("close", () => {
    subscribers.delete(res);
  });
}

export async function emitEvent(
  type: string,
  category: string,
  title: string,
  opts?: {
    description?: string;
    entityId?: string | number;
    entityType?: string;
    meta?: Record<string, unknown>;
  }
) {
  const [row] = await db.insert(events).values({
    type,
    category,
    title,
    description: opts?.description ?? null,
    entityId: opts?.entityId != null ? String(opts.entityId) : null,
    entityType: opts?.entityType ?? null,
    meta: opts?.meta ?? null,
  }).returning();

  const payload = {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    entityId: row.entityId,
    entityType: row.entityType,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  };

  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(data);
    } catch {
      subscribers.delete(res);
    }
  }

  return payload;
}
