export const RATIOS_RULES = {
  skills: ["write_form", "equivalents", "visual_identification"] as const,
  levels: {
    1: { maxValue: 10 },
    2: { maxValue: 35 },
    3: { maxValue: 50 },
    4: { maxValue: 75 },
    5: { maxValue: 100 }
  },
  questionCount: 5
} as const;

export type RatiosSkill = typeof RATIOS_RULES.skills[number];
export type RatiosLevel = keyof typeof RATIOS_RULES.levels;