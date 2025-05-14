/**
 * Extends Express.Session to track seen questions and session state
 * This helps prevent duplicates across requests and manage session batches
 */
declare namespace Express {
  interface SessionData {
    seenQuestions?: number[];        // Question IDs already seen by the user
    currentBatch?: {
      questions: number[];           // Question IDs in current batch
      correctAnswers: number[];      // IDs of correctly answered questions
      start: Date;                   // When the batch started
      count: number;                 // Number of questions in this batch
    };
  }
}