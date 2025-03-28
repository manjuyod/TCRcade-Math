import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  grade: text("grade"),
  tokens: integer("tokens").default(0).notNull(),
  streakDays: integer("streak_days").default(0).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  displayName: text("display_name"),
  initials: text("initials").default("AAA"),
  dailyTokensEarned: integer("daily_tokens_earned").default(0).notNull(),
  questionsAnswered: integer("questions_answered").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  grade: text("grade").notNull(),
  difficulty: integer("difficulty").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  options: text("options").array().notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  level: integer("level").default(1).notNull(),
  score: integer("score").default(0).notNull(),
  completedQuestions: integer("completed_questions").default(0).notNull(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  score: integer("score").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  grade: true,
  initials: true,
  isAdmin: true,
});

export const insertQuestionSchema = createInsertSchema(questions);
export const insertProgressSchema = createInsertSchema(userProgress);
export const insertLeaderboardSchema = createInsertSchema(leaderboard);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Leaderboard = typeof leaderboard.$inferSelect;
