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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const magicLinkTokensTable = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
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
