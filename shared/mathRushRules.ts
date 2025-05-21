export const MATH_RUSH_RULES = {
  modes: ["addition", "subtraction", "multiplication", "division", "mixed"] as const,

  timeSettings: {
    SHORT: { sec: 60,        // 60-second rush
             tokensPer5: 3,
             bonusPerfect: 20 },
    LONG:  { sec: 90,        // 90-second rush
             tokensPer5: 2,
             bonusPerfect: 15 }
  } as const,

  questionCount: 20
} as const;