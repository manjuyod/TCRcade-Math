import { storage } from "../storage";

export async function updateUserStatsAfterModule(
  userId: number,
  correct: number,
  total: number,
  tokensEarned: number,
) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const updated = await storage.updateUser(userId, {
    tokens: (user.tokens || 0) + tokensEarned,
    questionsAnswered: (user.questionsAnswered || 0) + total,
    correctAnswers: (user.correctAnswers || 0) + correct,
  });

  return updated;
}
