import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const whiteLabelConfigsTable = pgTable("white_label_configs", {
  id: serial("id").primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  brokerName: text("broker_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#1f9e6e").notNull(),
  secondaryColor: text("secondary_color").default("#1e293b").notNull(),
  tagline: text("tagline"),
  welcomeMessage: text("welcome_message"),
  contactEmail: text("contact_email").notNull(),
  type: text("type").$type<"individual_agent" | "team_leader">().default("individual_agent").notNull(),
  monetizationModel: text("monetization_model").$type<"private_label" | "closing_gift">().default("private_label").notNull(),
  giftDuration: text("gift_duration").$type<"1year" | "3years" | null>(),
  status: text("status").$type<"pending" | "approved" | "rejected">().default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WhiteLabelConfig = typeof whiteLabelConfigsTable.$inferSelect;
export type NewWhiteLabelConfig = typeof whiteLabelConfigsTable.$inferInsert;
