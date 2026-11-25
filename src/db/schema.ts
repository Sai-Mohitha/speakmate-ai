import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  GrammarCorrection,
  GroundingSource,
  SessionSummary,
  VocabularyItem,
} from "../types/index.ts";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("Student"),
  proficiencyLevel: text("proficiency_level").notNull().default("Intermediate"),
  communicationGoals: jsonb("communication_goals")
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredMode: text("preferred_mode").notNull().default("Friendly Conversation"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(15),
  preferredAvailability: text("preferred_availability")
    .notNull()
    .default("Weekday Evenings"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const practiceSessions = pgTable("practice_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  mode: text("mode").notNull(),
  level: text("level").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  corrections: jsonb("corrections")
    .$type<GrammarCorrection[]>()
    .notNull()
    .default([]),
  vocabularyLearned: jsonb("vocabulary_learned")
    .$type<VocabularyItem[]>()
    .notNull()
    .default([]),
  summary: jsonb("summary").$type<SessionSummary | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentorshipBookings = pgTable("mentorship_bookings", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  coachId: text("coach_id").notNull(),
  coachName: text("coach_name").notNull(),
  coachExpertise: text("coach_expertise").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  sessionPurpose: text("session_purpose").notNull(),
  status: text("status").notNull().default("Demo Request Saved"),
  isDemoBooking: boolean("is_demo_booking").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  persona: text("persona").notNull(),
  modelUsed: text("model_used").notNull(),
  sources: jsonb("sources").$type<GroundingSource[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  practiceSessions: many(practiceSessions),
  mentorshipBookings: many(mentorshipBookings),
  chatMessages: many(chatMessages),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  user: one(users, {
    fields: [practiceSessions.userId],
    references: [users.id],
  }),
}));

export const mentorshipBookingsRelations = relations(mentorshipBookings, ({ one }) => ({
  user: one(users, {
    fields: [mentorshipBookings.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
