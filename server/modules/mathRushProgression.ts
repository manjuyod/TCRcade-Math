/**
 * mathRushProgression.ts
 * --------------------------------------------------
 * Hard-coded progression for math fact families across operators.
 */

/* Addition Progression */
export const ADDITION_PROGRESSION = [
  'Adding 0 and 1',    // step 1  (index 0)
  'Adding 10',         // step 2
  'Adding 2',          // step 3
  'Adding 3',          // step 4
  'Adding 4',          // step 5
  'Adding 5',          // step 6
  'Mixed 0–5',         // step 7
  'Adding 6',          // step 8
  'Adding 7',          // step 9
  'Adding 8',          // step 10
  'Adding 9',          // step 11
  'Doubles to 20',     // step 12
  'Make 10',           // step 13
  'Mixed 6-10',        // step 14 (index 13)
] as const;

/* Subtraction Progression */
export const SUBTRACTION_PROGRESSION = [
  'Subtract From 0-3',             // step 1  (index 0)
  'Subtract From 10',              // step 2
  'Subtract From 4',
  'Subtract From 5',
  'Subtraction Mixed 0-5',
  'Subtract From 6',
  'Subtract From 7',
  'Subtract From 8',
  'Subtract From 9',
  'Subtraction Half of a Double',
  'Subtraction Mixed 6-10',
  'Subtraction Odd Balls',         // step 12 (index 11)
] as const;

/* Multiplication Progression */
export const MULTIPLICATION_PROGRESSION = [
  'Multiply by 0 and 1',  // step 1 (index 0) - auto-skip if grade > 5
  'Multiply by 2',        // step 2 (index 1) - auto-skip if grade > 5
  'Multiply by 3',        // step 3 (index 2) - auto-skip if grade > 5
  'Multiply by 4',
  'Multiply by 5',
  'Mixed 0–5',
  'Multiply by 6',
  'Multiply by 7',
  'Multiply by 8',
  'Multiply by 9',
  'Multiply by 10',
  'Multiply by 11',
  'Multiply by 12',
  'Multiply Doubles',
  'Mixed 6–12',           // step 15 (index 14)
] as const;

/* Division Progression */
export const DIVISION_PROGRESSION = [
  'Divide by 2',          // step 1 (index 0) - auto-skip if grade > 5
  'Divide by 3',          // step 2
  'Divide by 4',          // step 3
  'Divide by 5',          // step 4
  'Divide by 6',          // step 5
  'Mixed 2–6',            // step 6
  'Divide by 7',          // step 7
  'Divide by 8',          // step 8
  'Divide by 9',          // step 9
  'Divide by 10',         // step 10
  'Divide by 11',         // step 11
  'Divide by 12',         // step 12
  'Mixed 7–12',           // step 13 (index 12)
] as const;

/* Type definitions */
export type AddFactType = typeof ADDITION_PROGRESSION[number];
export type SubFactType = typeof SUBTRACTION_PROGRESSION[number];
export type MulFactType = typeof MULTIPLICATION_PROGRESSION[number];
export type DivFactType = typeof DIVISION_PROGRESSION[number];

/* Hash-maps for O(1) lookup */
export const ADD_FACT_STEP_MAP: Readonly<Record<AddFactType, number>> = (() => {
  const map = {} as Record<AddFactType, number>;
  ADDITION_PROGRESSION.forEach((ft, idx) => (map[ft] = idx + 1));
  return map;
})();

export const SUB_FACT_STEP_MAP: Readonly<Record<SubFactType, number>> = (() => {
  const map = {} as Record<SubFactType, number>;
  SUBTRACTION_PROGRESSION.forEach((ft, idx) => (map[ft] = idx + 1));
  return map;
})();

export const MUL_FACT_STEP_MAP: Readonly<Record<MulFactType, number>> = (() => {
  const map = {} as Record<MulFactType, number>;
  MULTIPLICATION_PROGRESSION.forEach((ft, idx) => (map[ft] = idx + 1));
  return map;
})();

export const DIV_FACT_STEP_MAP: Readonly<Record<DivFactType, number>> = (() => {
  const map = {} as Record<DivFactType, number>;
  DIVISION_PROGRESSION.forEach((ft, idx) => (map[ft] = idx + 1));
  return map;
})();

/* Helper functions */
export function getProgressionForOperator(operator: string) {
  switch (operator) {
    case 'addition': return ADDITION_PROGRESSION;
    case 'subtraction': return SUBTRACTION_PROGRESSION;
    case 'multiplication': return MULTIPLICATION_PROGRESSION;
    case 'division': return DIVISION_PROGRESSION;
    default: throw new Error(`Unknown operator: ${operator}`);
  }
}

export function getStepMapForOperator(operator: string) {
  switch (operator) {
    case 'addition': return ADD_FACT_STEP_MAP;
    case 'subtraction': return SUB_FACT_STEP_MAP;
    case 'multiplication': return MUL_FACT_STEP_MAP;
    case 'division': return DIV_FACT_STEP_MAP;
    default: throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Returns the next fact family in the progression, or null if finished.
 * currentStep is the zero-based index of the last mastered step.
 */
export function getNextFactType(operator: string, currentStep: number): string | null {
  const progression = getProgressionForOperator(operator);
  return progression[currentStep] ?? null;
}

/**
 * Get auto-skip types based on user grade (for grade > 5)
 */
export function getAutoSkipTypes(operator: string, userGrade: string): string[] {
  const gradeMap: Record<string, number> = {
    "K": 0, "1": 1, "2": 2, "3": 3, "4": 4,
    "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, 
    "10": 10, "11": 11, "12": 12
  };
  
  const gradeLevel = gradeMap[userGrade] || 3;
  
  if (gradeLevel <= 5) return [];
  
  switch (operator) {
    case 'multiplication':
      return ['Multiply by 0 and 1', 'Multiply by 2'];
    case 'division':
      return ['Divide by 2'];
    default:
      return [];
  }
}

/**
 * Get the current progression step for a user
 */
export function getCurrentProgressionStep(operator: string, typesComplete: string[], userGrade: string): number {
  const progression = getProgressionForOperator(operator);
  const autoSkipTypes = getAutoSkipTypes(operator, userGrade);
  
  // Find the lowest index item that is not in types_complete (including auto-skipped)
  for (let i = 0; i < progression.length; i++) {
    const type = progression[i];
    if (!typesComplete.includes(type) && !autoSkipTypes.includes(type)) {
      return i;
    }
  }
  
  // All steps completed
  return progression.length;
}

/**
 * Check if progression is fully completed
 */
export function isProgressionComplete(operator: string, typesComplete: string[], userGrade: string): boolean {
  const progression = getProgressionForOperator(operator);
  const autoSkipTypes = getAutoSkipTypes(operator, userGrade);
  
  // Check if all required types are completed
  return progression.every(type => 
    typesComplete.includes(type) || autoSkipTypes.includes(type)
  );
}