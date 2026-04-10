import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  source: text("source").notNull().default("ai_conversation"),
  importance: text("importance").notNull().default("normal"),
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true });
export type Memory = typeof memories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
