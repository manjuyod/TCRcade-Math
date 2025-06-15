import { pgTable, text, serial, integer, boolean, timestamp, json, date, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Main user table - based on actual DB structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  grade: text("grade"),
  lastGradeAdvancement: timestamp("last_grade_advancement"),
  tokens: integer("tokens").default(0).notNull(),
  streakDays: integer("streak_days").default(0).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  displayName: text("display_name"),
  initials: text("initials").default("AAA"),
  dailyTokensEarned: integer("daily_tokens_earned").default(0).notNull(),
  questionsAnswered: integer("questions_answered").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  dailyEngagementMinutes: integer("daily_engagement_minutes").default(0).notNull(),
  // Avatar system fields
  avatarItems: json("avatar_items").default({
    hair: "default",
    face: "default",
    outfit: "default",
    accessories: [],
    background: "default",
    unlocks: ["default"]
  }),
  // Challenge calendar fields
  lastDailyChallenge: text("last_daily_challenge"),
  dailyChallengeStreak: integer("daily_challenge_streak").default(0).notNull(),
  completedChallenges: text("completed_challenges").array().default([]),
  // Story progress
  storyProgress: json("story_progress").default({}),
  // Additional fields for stats tracking
  fastestCategory: text("fastest_category"),
  highestScoreCategory: text("highest_score_category"),
  // AI analytics features
  learningStyle: text("learning_style"),
  strengthConcepts: text("strength_concepts").array().default([]),
  weaknessConcepts: text("weakness_concepts").array().default([]),
  interests: text("interests").array().default([]),
  // Password reset fields
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  // New field found in actual database
  preferredDifficulty: integer("preferred_difficulty").default(1).notNull(),
  // JSON field to store all progress data
  hiddenGradeAsset: json("hidden_grade_asset"),
});

// Avatar items that can be unlocked and purchased
export const avatarItems = pgTable("avatar_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // hair, face, outfit, accessory, background
  name: text("name").notNull().unique(),
  description: text("description"),
  price: integer("price").default(50).notNull(),
  rarity: text("rarity").default("common").notNull(), // common, uncommon, rare, epic, legendary
  requiredGrade: text("required_grade"), // Restrict to certain grade level if needed
  requiredAchievement: text("required_achievement"), // Unlock through achievement
  imageUrl: text("image_url"),
});

// Question content structure
export const questionContentSchema = z.object({
  text: z.string(),
  style: z.object({
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(),
    textAlign: z.string().optional(),
    display: z.string().optional(),
    justifyContent: z.string().optional(),
    alignItems: z.string().optional(),
    padding: z.string().optional(),
    isFlashcard: z.boolean().optional(),
  }).optional(),
  isFlashcard: z.boolean().optional(),
});

export type QuestionContent = z.infer<typeof questionContentSchema>;

// Questions table - based on actual DB structure
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  grade: text("grade").notNull(),
  difficulty: integer("difficulty").notNull(),
  question: text("question").notNull(), // This can be a JSON string for complex questions
  answer: text("answer").notNull(),
  options: text("options").array().notNull(),
  concepts: text("concepts").array(), // Math concepts covered by this question
  // For storytelling mode
  storyId: integer("story_id"),
  storyNode: integer("story_node"),
  storyText: text("story_text"),
  storyImage: text("story_image"),
});

// Additional question tables with raw numeric data
export const questionsAddition = pgTable("questions_addition", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  int1: integer("int1").notNull(),
  int2: integer("int2").notNull(),
  int3: integer("int3").notNull(),
  type: text("type"),
  facts_type: text("facts_type"),
});

export const questionsMultiplication = pgTable("questions_multiplication", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  int1: integer("int1").notNull(),
  int2: integer("int2").notNull(),
  int3: integer("int3").notNull(),
  type: text("type"),
  facts_type: text("facts_type"),
});

export const questionsAlgebra = pgTable("questions_algebra", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  int1: integer("int1").notNull(),
  int2: integer("int2").notNull(),
  int3: integer("int3").notNull(),
  type: text("type"),
  facts_type: text("facts_type"),
});

export const questionsMeasurementAndData = pgTable("questions_measurementAndData", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  int1: integer("int1").notNull(),
  int2: integer("int2").notNull(),
  int3: integer("int3").notNull(),
  type: text("type"),
  facts_type: text("facts_type"),
});

// Math stories for narrative learning
export const mathStories = pgTable("math_stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  grade: text("grade").notNull(),
  difficultyRange: integer("difficulty_range").array().default([1, 3]),
  categories: text("categories").array().default([]),
  nodeCount: integer("node_count").default(5).notNull(),
  completionReward: integer("completion_reward").default(50).notNull(),
  coverImage: text("cover_image"),
});

// Daily challenges
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  questions: json("questions").default([]),
  questionIds: integer("question_ids").array().default([]),
  difficulty: text("difficulty").default("medium"),
  difficultyBonus: integer("difficulty_bonus").default(1).notNull(),
  tokenReward: integer("token_reward").default(25).notNull(),
  specialReward: text("special_reward"), // Special avatar item or other reward
  category: text("category"),
  requiredGrade: text("required_grade"),
});

// Multiplayer rooms - based on actual DB structure
export const multiplayerRooms = pgTable("multiplayer_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hostId: integer("host_id").notNull(),
  maxPlayers: integer("max_players").default(4).notNull(),
  gameType: text("game_type").default("cooperative").notNull(), // cooperative, competitive
  difficulty: integer("difficulty").default(1).notNull(),
  category: text("category"),
  grade: text("grade"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  gameData: json("game_data").default({}),
  currentQuestionId: integer("current_question_id"),
  roomCode: text("room_code").notNull().unique(),
  // Extended fields for multiplayer
  status: text("status").default("waiting"),
  participants: integer("participants").array().default([]),
  maxParticipants: integer("max_participants").default(4),
  settings: json("settings").default({ questionCount: 10, timeLimit: 30 }),
  gameState: json("game_state").default({}),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// Leaderboard (preserved - independent table)
export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  score: integer("score").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Store recommendations for each user (preserved)
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  conceptsToReview: text("concepts_to_review").array().default([]),
  conceptsToLearn: text("concepts_to_learn").array().default([]),
  suggestedCategories: text("suggested_categories").array().default([]),
  difficultyLevel: integer("difficulty_level").default(1).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  recommendationData: json("recommendation_data").default({}), // Flexible JSON data for future extensions
  aiInsights: text("ai_insights"),
  learningStyleSuggestions: json("learning_style_suggestions").default({}),
});

// AI Analytics data (preserved)
export const aiAnalytics = pgTable("ai_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  learningPatterns: json("learning_patterns").default({}),
  recommendations: text("recommendations"),
  strengths: text("strengths").array().default([]),
  areasForImprovement: text("areas_for_improvement").array().default([]),
  engagementAnalysis: json("engagement_analysis").default({}),
  suggestedActivities: text("suggested_activities").array().default([]),
  // Additional fields for analytics
  learningStyle: text("learning_style"),
  strengthConcepts: text("strength_concepts").array().default([]),
  weaknessConcepts: text("weakness_concepts").array().default([]),
  recommendedActivities: text("recommended_activities").array().default([]),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// Session table for auth - exists in DB but was missing from schema
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// These tables from original schema.ts are kept for compatibility but marked as
// "virtual tables" - they will not be created or modified in the database
// but are kept for code compatibility

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  grade: true,
  lastGradeAdvancement: true,
  initials: true,
  isAdmin: true,
  preferredDifficulty: true, // Added new field
});

export const insertQuestionSchema = createInsertSchema(questions);
export const insertLeaderboardSchema = createInsertSchema(leaderboard);
export const insertRecommendationSchema = createInsertSchema(recommendations);
export const insertAvatarItemSchema = createInsertSchema(avatarItems);
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges);
export const insertMathStorySchema = createInsertSchema(mathStories);
export const insertMultiplayerRoomSchema = createInsertSchema(multiplayerRooms);
export const insertAiAnalyticsSchema = createInsertSchema(aiAnalytics);
// Historical tracking for module completion sessions
export const moduleHistory = pgTable("module_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moduleName: text("module_name").notNull(), // e.g., "math-facts-multiplication", "algebra", "measurement"
  runType: text("run_type").notNull(), // "test" or "token_run"
  finalScore: integer("final_score").notNull(), // 0-100 integer score
  questionsTotal: integer("questions_total").default(0).notNull(),
  questionsCorrect: integer("questions_correct").default(0).notNull(),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  // Additional metadata for analytics
  difficultyLevel: integer("difficulty_level").default(1),
  gradeLevel: text("grade_level"),
  tokensEarned: integer("tokens_earned").default(0).notNull(),
});

export const insertSessionSchema = createInsertSchema(session);
export const insertModuleHistorySchema = createInsertSchema(moduleHistory);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Leaderboard = typeof leaderboard.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type AvatarItem = typeof avatarItems.$inferSelect;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type MathStory = typeof mathStories.$inferSelect;
export type MultiplayerRoom = typeof multiplayerRooms.$inferSelect;
export type AiAnalytic = typeof aiAnalytics.$inferSelect;
export type Session = typeof session.$inferSelect;
export type ModuleHistory = typeof moduleHistory.$inferSelect;