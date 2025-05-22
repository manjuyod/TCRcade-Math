import { MATH_RUSH_RULES } from "@shared/mathRushRules";

/**
 * Calculate tokens earned for Math Rush sessions
 */
export function calcTokensRush(correct: number, total: number, duration: number): number {
  // Input validation
  if (correct < 0 || total < 0 || duration < 0 || correct > total) {
    return 0;
  }

  const setting = duration <= MATH_RUSH_RULES.timeSettings.SHORT.sec
    ? MATH_RUSH_RULES.timeSettings.SHORT
    : MATH_RUSH_RULES.timeSettings.LONG;

  const baseTokens = Math.floor(correct / 5) * setting.tokensPer5;
  const perfectBonus = correct === total && total > 0 ? setting.bonusPerfect : 0;
  const totalTokens = baseTokens + perfectBonus;

  // Validate result is within safe integer range
  return Math.max(0, Math.min(totalTokens, 2_147_483_647));
}

/**
 * Calculate tokens earned for Math Facts sessions
 */
export function calcTokensFacts(correct: number, total: number): number {
  // Input validation
  if (correct < 0 || total < 0 || correct > total) {
    return 0;
  }

  // Standard rate: 3 tokens per correct answer
  const baseRate = 3;
  const totalTokens = correct * baseRate;

  // Validate result is within safe integer range
  return Math.max(0, Math.min(totalTokens, 2_147_483_647));
}

/**
 * Validate token amount is within acceptable bounds
 */
export function validateTokenAmount(amount: number): boolean {
  return amount >= 0 && amount <= 2_147_483_647 && Number.isInteger(amount);
}