import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export type SubscriptionStatus = "free" | "pro_monthly" | "pro_annual" | "promo_pro";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  zipCode: text("zip_code"),
  fullAccess: boolean("full_access").default(false).notNull(),
  subscriptionStatus: text("subscription_status").$type<SubscriptionStatus>().default("free").notNull(),
  referralSubdomain: text("referral_subdomain"),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  smsPhone: text("sms_phone"),
  stripeCustomerId: text("stripe_customer_id"),
  hasSeenDashboardTour: boolean("has_seen_dashboard_tour").default(false).notNull(),
  hasAcceptedTerms: boolean("has_accepted_terms").default(false).notNull(),
  proExpiresAt: timestamp("pro_expires_at"),
  brokerPreCreated: boolean("broker_pre_created").default(false).notNull(),
  assignedMemberId: integer("assigned_member_id"),
  // Maintly usage tracking
  monthlyMessagesUsed: integer("monthly_messages_used").default(0).notNull(),
  monthlyMessagesPeriod: text("monthly_messages_period"),
  powerUpMessagesRemaining: integer("power_up_messages_remaining").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const magicLinkTokensTable = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  pendingGiftCode: text("pending_gift_code"),
  pendingTeamJoinToken: text("pending_team_join_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  expiresAt: timestamp("expires_at").notNull(),
  staySignedIn: boolean("stay_signed_in").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
