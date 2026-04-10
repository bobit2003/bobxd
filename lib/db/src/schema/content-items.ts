import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  platform: text("platform").notNull().default("linkedin"),
  contentType: text("content_type").notNull().default("post"),
  status: text("status").notNull().default("idea"),
  content: text("content"),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  publishedDate: timestamp("published_date", { withTimezone: true }),
  engagement: text("engagement"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true, updatedAt: true });
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
