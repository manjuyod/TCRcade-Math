/**
 * Extends Express.Session to track seen questions
 * This helps prevent duplicates across requests
 */
declare namespace Express {
  interface SessionData {
    seenQuestions?: number[];  // Question IDs already seen by the user
  }
}