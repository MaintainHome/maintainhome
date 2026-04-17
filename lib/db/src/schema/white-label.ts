import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const whiteLabelConfigsTable = pgTable("white_label_configs", {
  id: serial("id").primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  brokerName: text("broker_name").notNull(),
  logoUrl: text("logo_url"),
  agentPhotoUrl: text("agent_photo_url"),
  phoneNumber: text("phone_number"),
  tagline: text("tagline"),
  welcomeMessage: text("welcome_message"),
  contactEmail: text("contact_email").notNull(),
  type: text("type").$type<"individual_agent" | "team_leader">().default("individual_agent").notNull(),
  monetizationModel: text("monetization_model").$type<"private_label" | "closing_gift">().default("private_label").notNull(),
  giftDuration: text("gift_duration").$type<"1year" | "3years" | null>(),
  status: text("status").$type<"pending" | "approved" | "rejected">().default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  accountType: text("account_type").$type<"broker" | "builder">().default("broker").notNull(),
  warrantyPeriodMonths: integer("warranty_period_months").default(12),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamSubdomain: text("team_subdomain").notNull(),
  memberUserId: integer("member_user_id").references(() => usersTable.id),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  headshotUrl: text("headshot_url"),
  phone: text("phone"),
  agentHandle: text("agent_handle"),
  status: text("status").$type<"invited" | "active">().default("invited").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
});

export type WhiteLabelConfig = typeof whiteLabelConfigsTable.$inferSelect;
export type NewWhiteLabelConfig = typeof whiteLabelConfigsTable.$inferInsert;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type NewTeamMember = typeof teamMembersTable.$inferInsert;
