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
  docType: text("doc_type").default("document").notNull(),
  displayName: text("display_name"),
  warrantyData: jsonb("warranty_data"),
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
  yearBuilt: integer("year_built"),
  mortgageRate: text("mortgage_rate"),
  // New Maintly-accuracy fields
  grassType: text("grass_type"),
  foundationType: text("foundation_type"),
  crawlSpaceSealed: text("crawl_space_sealed"),
  hvacType: text("hvac_type"),
  roofAgeYear: integer("roof_age_year"),
  sidingType: text("siding_type"),
  pastPestIssues: text("past_pest_issues"),
  pastPestIssuesNotes: text("past_pest_issues_notes"),
  resolvedBigTicketKeys: jsonb("resolved_big_ticket_keys").default([]),
  newConstructionData: jsonb("new_construction_data"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsLogTable = pgTable("sms_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  phone: text("phone").notNull(),
  taskNames: text("task_names").notNull(),
  month: text("month").notNull(),
  status: text("status").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const giftCodesTable = pgTable("gift_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  purchasedByUserId: integer("purchased_by_user_id").references(() => usersTable.id),
  redeemedByUserId: integer("redeemed_by_user_id").references(() => usersTable.id),
  stripeSessionId: text("stripe_session_id"),
  priceCents: integer("price_cents").notNull().default(2900),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  redeemedAt: timestamp("redeemed_at"),
});

export const stripeTransactionsTable = pgTable("stripe_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  type: text("type").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  amountCents: integer("amount_cents"),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brokerPrecreationsTable = pgTable("broker_precreations", {
  id: serial("id").primaryKey(),
  brokerUserId: integer("broker_user_id").notNull().references(() => usersTable.id),
  stripeSessionId: text("stripe_session_id").unique(),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name"),
  propertyData: jsonb("property_data"),
  quizAnswers: jsonb("quiz_answers"),
  calendarData: jsonb("calendar_data"),
  documentPaths: jsonb("document_paths"),
  activationToken: text("activation_token").unique(),
  clientUserId: integer("client_user_id").references(() => usersTable.id),
  activatedAt: timestamp("activated_at"),
  status: text("status").notNull().default("pending_payment"),
  priceCents: integer("price_cents").notNull().default(3600),
  newConstructionData: jsonb("new_construction_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brokerServiceProvidersTable = pgTable("broker_service_providers", {
  id: serial("id").primaryKey(),
  brokerSubdomain: text("broker_subdomain").notNull(),
  category: text("category").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SavedCalendar = typeof savedCalendarsTable.$inferSelect;
export type MaintenanceLogEntry = typeof maintenanceLogTable.$inferSelect;
export type MaintenanceNote = typeof maintenanceNotesTable.$inferSelect;
export type MaintenanceDocument = typeof maintenanceDocumentsTable.$inferSelect;
export type HomeProfile = typeof homeProfilesTable.$inferSelect;
export type SmsLog = typeof smsLogTable.$inferSelect;
export type GiftCode = typeof giftCodesTable.$inferSelect;
export type StripeTransaction = typeof stripeTransactionsTable.$inferSelect;
export type BrokerPrecreation = typeof brokerPrecreationsTable.$inferSelect;
export type BrokerServiceProvider = typeof brokerServiceProvidersTable.$inferSelect;
