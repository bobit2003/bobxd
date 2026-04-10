import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  color: text("color").notNull().default("#00bfff"),
  icon: text("icon").notNull().default("check"),
  lastCompleted: timestamp("last_completed", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"),
});

export const insertHabitSchema = createInsertSchema(habits).omit({ id: true, createdAt: true, lastCompleted: true, streak: true, bestStreak: true, totalCompletions: true });
export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export const insertHabitLogSchema = createInsertSchema(habitLogs).omit({ id: true, completedAt: true });
export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
