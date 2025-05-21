import { describe, it, expect } from 'vitest';
import { calculateRushTokens } from '../mathRush';
import { MATH_RUSH_RULES } from '../../shared/mathRushRules';

describe('Math Rush Scoring System', () => {
  // Test case scenarios from the requirements
  it('should award correct tokens for SHORT time setting (60 seconds)', () => {
    // Case 1: 17 correct out of 20, durationSec=60 (SHORT setting)
    // Math.floor(17/5)*3 = 9 tokens
    const result1 = calculateRushTokens(17, 20, 60);
    expect(result1).toBe(9);

    // Case 2: Perfect score (20/20) with SHORT time setting
    // Math.floor(20/5)*3 + 20 = 12 + 20 = 32 tokens
    const result2 = calculateRushTokens(20, 20, 60);
    expect(result2).toBe(32);
  });

  it('should award correct tokens for LONG time setting (90 seconds)', () => {
    // Case 3: Perfect score (20/20) with LONG time setting
    // Math.floor(20/5)*2 + 15 = 8 + 15 = 23 tokens
    const result = calculateRushTokens(20, 20, 90);
    expect(result).toBe(23);
  });

  it('should select the correct time setting based on duration', () => {
    // 59 seconds should use SHORT setting (3 tokens per 5)
    // Math.floor(15/5)*3 = 9 tokens
    const result1 = calculateRushTokens(15, 20, 59);
    expect(result1).toBe(9);

    // 60 seconds exactly should use SHORT setting
    // Math.floor(15/5)*3 = 9 tokens
    const result2 = calculateRushTokens(15, 20, 60);
    expect(result2).toBe(9);

    // 61 seconds should use LONG setting (2 tokens per 5)
    // Math.floor(15/5)*2 = 6 tokens
    const result3 = calculateRushTokens(15, 20, 61);
    expect(result3).toBe(6);
  });

  it('should only award perfect bonus when all questions are correct', () => {
    // 19/20 correct with SHORT time setting should get no perfect bonus
    // Math.floor(19/5)*3 = 9 tokens (no bonus)
    const result1 = calculateRushTokens(19, 20, 60);
    expect(result1).toBe(9);

    // 20/20 correct with SHORT time setting should get perfect bonus
    // Math.floor(20/5)*3 + 20 = 12 + 20 = 32 tokens
    const result2 = calculateRushTokens(20, 20, 60);
    expect(result2).toBe(32);
  });

  it('should handle edge cases properly', () => {
    // 0 correct answers should award 0 tokens
    const result1 = calculateRushTokens(0, 20, 60);
    expect(result1).toBe(0);

    // 4 correct answers (less than 5) should award 0 base tokens
    const result2 = calculateRushTokens(4, 20, 60);
    expect(result2).toBe(0);

    // 5 correct answers exactly should award 3 tokens (SHORT setting)
    const result3 = calculateRushTokens(5, 20, 60);
    expect(result3).toBe(3);
  });
});