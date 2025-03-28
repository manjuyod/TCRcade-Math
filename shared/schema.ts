import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
  concepts: text("concepts").array(), // Math concepts covered by this question
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

// Track user performance by concept for personalized recommendations
export const conceptMastery = pgTable("concept_mastery", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  concept: text("concept").notNull(),
  grade: text("grade").notNull(),
  totalAttempts: integer("total_attempts").default(0).notNull(),
  correctAttempts: integer("correct_attempts").default(0).notNull(),
  lastPracticed: timestamp("last_practiced").defaultNow().notNull(),
  masteryLevel: integer("mastery_level").default(0).notNull(), // 0-100 measure of mastery
  needsReview: boolean("needs_review").default(false).notNull(),
});

// Store recommendations for each user
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  conceptsToReview: text("concepts_to_review").array().default([]),
  conceptsToLearn: text("concepts_to_learn").array().default([]),
  suggestedCategories: text("suggested_categories").array().default([]),
  difficultyLevel: integer("difficulty_level").default(1).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  recommendationData: json("recommendation_data"), // Flexible JSON data for future extensions
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
export const insertConceptMasterySchema = createInsertSchema(conceptMastery);
export const insertRecommendationSchema = createInsertSchema(recommendations);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Leaderboard = typeof leaderboard.$inferSelect;
export type ConceptMastery = typeof conceptMastery.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
