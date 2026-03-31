import { pgTable, text, serial, timestamp, integer, jsonb, date } from "drizzle-orm/pg-core";
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

export const maintenanceNotesTable = pgTable("maintenance_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  noteDate: date("note_date").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceDocumentsTable = pgTable("maintenance_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const homeProfilesTable = pgTable("home_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  fullAddress: text("full_address"),
  bedrooms: integer("bedrooms"),
  bathrooms: text("bathrooms"),
  finishedBasement: text("finished_basement"),
  poolOrHotTub: text("pool_or_hot_tub"),
  lastRenovationYear: integer("last_renovation_year"),
  mortgageRate: text("mortgage_rate"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SavedCalendar = typeof savedCalendarsTable.$inferSelect;
export type MaintenanceLogEntry = typeof maintenanceLogTable.$inferSelect;
export type MaintenanceNote = typeof maintenanceNotesTable.$inferSelect;
export type MaintenanceDocument = typeof maintenanceDocumentsTable.$inferSelect;
export type HomeProfile = typeof homeProfilesTable.$inferSelect;
