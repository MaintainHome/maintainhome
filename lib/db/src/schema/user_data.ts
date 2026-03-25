import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const savedCalendarsTable = pgTable("saved_calendars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  quizAnswers: jsonb("quiz_answers").notNull(),
  calendarData: jsonb("calendar_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceLogTable = pgTable("maintenance_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  taskName: text("task_name").notNull(),
  taskKey: text("task_key").notNull(),
  month: text("month").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  notes: text("notes"),
  zipCode: text("zip_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SavedCalendar = typeof savedCalendarsTable.$inferSelect;
export type MaintenanceLogEntry = typeof maintenanceLogTable.$inferSelect;
