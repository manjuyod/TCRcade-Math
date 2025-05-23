export const FRACTIONS_PUZZLE_RULES = {
  skills: [
    "define",          // identify fraction from bar
    "gcdSimplify",     // step 1: pick GCD, step 2: type simplified form
    "simplify",        // just type lowest terms
    "equivalent",      // multi-select all equivalents
    "addSub",          // add OR subtract fractions (different dens)
    "mulDiv",          // multiply OR divide fractions
    "mixedImproper"    // convert mixed ↔ improper
  ] as const,

  /** five internal difficulty tiers (auto-advance every 4 Qs) */
  levels: [
    { maxDen: 10  },   // Level 1   (denominator ≤ 10)
    { maxDen: 20  },   // Level 2   (≤ 20)
    { maxDen: 30  },   // Level 3   (≤ 30)
    { maxDen: 40  },   // Level 4   (≤ 40)
    { maxDen: 25, mixedAllowed: true } // Level 5, focus on mixed/"non-nice" fractions
  ] as const,

  questionCount: 20,
  tokensPer5: 3,
  bonusPerfect: 20,

  // Color palette for fraction bars
  colors: [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#06B6D4", // cyan
    "#F97316", // orange
    "#84CC16", // lime
  ] as const
} as const;

export type FractionSkill = typeof FRACTIONS_PUZZLE_RULES.skills[number];
export type FractionLevel = typeof FRACTIONS_PUZZLE_RULES.levels[number];