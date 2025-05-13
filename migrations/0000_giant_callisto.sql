CREATE TABLE "ai_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"analysis_date" timestamp DEFAULT now() NOT NULL,
	"learning_patterns" json DEFAULT '{}'::json,
	"recommendations" text,
	"strengths" text[] DEFAULT '{}',
	"areas_for_improvement" text[] DEFAULT '{}',
	"engagement_analysis" json DEFAULT '{}'::json,
	"suggested_activities" text[] DEFAULT '{}',
	"learning_style" text,
	"strength_concepts" text[] DEFAULT '{}',
	"weakness_concepts" text[] DEFAULT '{}',
	"recommended_activities" text[] DEFAULT '{}',
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "avatar_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer DEFAULT 50 NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"required_grade" text,
	"required_achievement" text,
	"image_url" text,
	CONSTRAINT "avatar_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "concept_mastery" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"concept" text NOT NULL,
	"grade" text NOT NULL,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"last_practiced" timestamp DEFAULT now() NOT NULL,
	"mastery_level" integer DEFAULT 0 NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" json DEFAULT '[]'::json,
	"question_ids" integer[] DEFAULT '{}',
	"difficulty" text DEFAULT 'medium',
	"difficulty_bonus" integer DEFAULT 1 NOT NULL,
	"token_reward" integer DEFAULT 25 NOT NULL,
	"special_reward" text,
	"category" text,
	"required_grade" text,
	CONSTRAINT "daily_challenges_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "math_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"grade" text NOT NULL,
	"difficulty_range" integer[] DEFAULT '{1,3}',
	"categories" text[] DEFAULT '{}',
	"node_count" integer DEFAULT 5 NOT NULL,
	"completion_reward" integer DEFAULT 50 NOT NULL,
	"cover_image" text
);
--> statement-breakpoint
CREATE TABLE "multiplayer_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"host_id" integer NOT NULL,
	"max_players" integer DEFAULT 4 NOT NULL,
	"game_type" text DEFAULT 'cooperative' NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"category" text,
	"grade" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"game_data" json DEFAULT '{}'::json,
	"current_question_id" integer,
	"room_code" text NOT NULL,
	"status" text DEFAULT 'waiting',
	"participants" integer[] DEFAULT '{}',
	"max_participants" integer DEFAULT 4,
	"settings" json DEFAULT '{"questionCount":10,"timeLimit":30}'::json,
	"game_state" json DEFAULT '{}'::json,
	"started_at" timestamp,
	"ended_at" timestamp,
	CONSTRAINT "multiplayer_rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"grade" text NOT NULL,
	"difficulty" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"options" text[] NOT NULL,
	"concepts" text[],
	"story_id" integer,
	"story_node" integer,
	"story_text" text,
	"story_image" text
);
--> statement-breakpoint
CREATE TABLE "questions_addition" (
	"id" bigint PRIMARY KEY NOT NULL,
	"int1" integer NOT NULL,
	"int2" integer NOT NULL,
	"int3" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions_multiplication" (
	"id" bigint PRIMARY KEY NOT NULL,
	"int1" integer NOT NULL,
	"int2" integer NOT NULL,
	"int3" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"concepts_to_review" text[] DEFAULT '{}',
	"concepts_to_learn" text[] DEFAULT '{}',
	"suggested_categories" text[] DEFAULT '{}',
	"difficulty_level" integer DEFAULT 1 NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"recommendation_data" json DEFAULT '{}'::json,
	"ai_insights" text,
	"learning_style_suggestions" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "subject_difficulty_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"difficulty_level" integer NOT NULL,
	"question_id" integer
);
--> statement-breakpoint
CREATE TABLE "subject_mastery" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"last_practiced" timestamp DEFAULT now() NOT NULL,
	"mastery_level" integer DEFAULT 0 NOT NULL,
	"is_unlocked" boolean DEFAULT true NOT NULL,
	"next_grade_unlocked" boolean DEFAULT false NOT NULL,
	"downgraded" boolean DEFAULT false NOT NULL,
	"difficulty_level" integer DEFAULT 1 NOT NULL,
	"upgrade_eligible" boolean DEFAULT false NOT NULL,
	"downgrade_eligible" boolean DEFAULT false NOT NULL,
	"recent_30_attempts" integer DEFAULT 0 NOT NULL,
	"recent_30_correct" integer DEFAULT 0 NOT NULL,
	"recent_20_attempts" integer DEFAULT 0 NOT NULL,
	"recent_20_correct" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"completed_questions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"grade" text,
	"last_grade_advancement" timestamp,
	"tokens" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"display_name" text,
	"initials" text DEFAULT 'AAA',
	"daily_tokens_earned" integer DEFAULT 0 NOT NULL,
	"questions_answered" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"daily_engagement_minutes" integer DEFAULT 0 NOT NULL,
	"avatar_items" json DEFAULT '{"hair":"default","face":"default","outfit":"default","accessories":[],"background":"default","unlocks":["default"]}'::json,
	"last_daily_challenge" text,
	"daily_challenge_streak" integer DEFAULT 0 NOT NULL,
	"completed_challenges" text[] DEFAULT '{}',
	"story_progress" json DEFAULT '{}'::json,
	"fastest_category" text,
	"highest_score_category" text,
	"learning_style" text,
	"strength_concepts" text[] DEFAULT '{}',
	"weakness_concepts" text[] DEFAULT '{}',
	"interests" text[] DEFAULT '{}',
	"reset_password_token" text,
	"reset_password_expires" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
