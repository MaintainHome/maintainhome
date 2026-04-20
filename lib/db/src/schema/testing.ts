import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const testChecklistStatusTable = pgTable("test_checklist_status", {
  itemKey: text("item_key").primaryKey(),
  tested: boolean("tested").default(false).notNull(),
  testedAt: timestamp("tested_at"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbackReportsTable = pgTable("feedback_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  category: text("category").$type<"bug" | "suggestion" | "other">().notNull(),
  description: text("description").notNull(),
  pageUrl: text("page_url"),
  hasScreenshot: boolean("has_screenshot").default(false).notNull(),
  screenshotFileName: text("screenshot_file_name"),
  status: text("status").$type<"open" | "in_progress" | "closed">().default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TestChecklistStatus = typeof testChecklistStatusTable.$inferSelect;
export type FeedbackReport = typeof feedbackReportsTable.$inferSelect;
export type NewFeedbackReport = typeof feedbackReportsTable.$inferInsert;
