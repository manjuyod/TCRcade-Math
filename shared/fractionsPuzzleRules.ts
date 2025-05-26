export const FRACTIONS_PUZZLE_RULES = {
  skills: [
    "define",          // identify fraction from bar
    "simplify",        // levels 1-2: find GCD then simplify, levels 3+: just type lowest terms
    "equivalent",      // multi-select all equivalents
    "addSub",          // add OR subtract fractions (different dens)
    "mulDiv",          // multiply OR divide fractions
    "mixedImproper"    // convert mixed ↔ improper
  ] as const,

  /** five internal difficulty tiers (auto-advance every 4 Qs) */
  levels: [
    { maxDen: 6, maxNum: 3, minDen: 2, properOnly: true },   // Level 1: easier start
    { maxDen: 8, maxNum: 5, minDen: 2, properOnly: true },   // Level 2: gradual increase
    { maxDen: 10, maxNum: 8, minDen: 2, properOnly: true },  // Level 3: building complexity
    { maxDen: 12, maxNum: 10, minDen: 2, properOnly: true }, // Level 4: more challenging
    { maxDen: 12, maxNum: 15, minDen: 2, improperAllowed: true } // Level 5: full complexity
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