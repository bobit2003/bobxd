import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const directives = pgTable("directives", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  type: text("type").notNull().default("system"),
  priority: text("priority").notNull().default("medium"),
  source: text("source").notNull().default("System"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDirectiveSchema = createInsertSchema(directives).omit({ id: true, createdAt: true, updatedAt: true });
export type Directive = typeof directives.$inferSelect;
export type InsertDirective = z.infer<typeof insertDirectiveSchema>;
