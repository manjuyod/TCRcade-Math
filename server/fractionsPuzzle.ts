import { FRACTIONS_PUZZLE_RULES as R } from "../shared/fractionsPuzzleRules";

export type Fraction = { num: number; den: number };           // always den>0

export type FPQuestion =
  | { kind: "define";        bar: Fraction; colorIndex: number; answer: string }
  | { kind: "gcdSimplify";   frac: Fraction; gcd: number; answer: string }
  | { kind: "simplify";      frac: Fraction; answer: string }
  | { kind: "equivalent";    frac: Fraction; options: string[]; answerSet: Set<string>; level: number }
  | { kind: "addSub";        left: Fraction; right: Fraction; op: "+"|"-"; answer: string }
  | { kind: "mulDiv";        left: Fraction; right: Fraction; op: "×"|"÷"; answer: string }
  | { kind: "mixedImproper"; given: string; answer: string };

// Utility functions
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simplify(frac: Fraction): Fraction {
  const g = gcd(frac.num, frac.den);
  return { num: frac.num / g, den: frac.den / g };
}

function getDivisors(n: number): number[] {
  const divisors = [];
  for (let i = 2; i <= n; i++) {
    if (n % i === 0) divisors.push(i);
  }
  return divisors;
}

function fractionToString(frac: Fraction): string {
  return `${frac.num}/${frac.den}`;
}

function parseToMixed(improper: Fraction): string {
  const whole = Math.floor(improper.num / improper.den);
  const remainder = improper.num % improper.den;
  if (remainder === 0) return whole.toString();
  return `${whole} ${remainder}/${improper.den}`;
}

function parseMixedToImproper(mixed: string): Fraction {
  const parts = mixed.trim().split(' ');
  if (parts.length === 1) {
    // Just a fraction like "7/3"
    const [num, den] = parts[0].split('/').map(Number);
    return { num, den };
  } else {
    // Mixed number like "2 1/3"
    const whole = parseInt(parts[0]);
    const [fracNum, fracDen] = parts[1].split('/').map(Number);
    return { num: whole * fracDen + fracNum, den: fracDen };
  }
}

export function generateFractionsPuzzle(
  skill: typeof R.skills[number],
  idx: number
): FPQuestion {
  const levelIndex = Math.min(4, Math.floor(idx / 4));
  const level = R.levels[levelIndex];
  
  switch (skill) {
    case "define": {
      const den = randInt(level.minDen, level.maxDen);
      const maxNum = ('properOnly' in level) ? Math.min(level.maxNum, den - 1) : level.maxNum;
      const num = randInt(1, maxNum);
      const colorIndex = randInt(0, R.colors.length - 1);
      return {
        kind: "define",
        bar: { num, den },
        colorIndex,
        answer: fractionToString({ num, den })
      };
    }

    case "gcdSimplify": {
      // Generate a non-simplified fraction
      let baseDen = randInt(level.minDen, level.maxDen);
      let maxNum = ('properOnly' in level) ? Math.min(level.maxNum, baseDen - 1) : level.maxNum;
      let baseNum = randInt(1, maxNum);
      const multiplier = randInt(2, Math.min(4, Math.floor(level.maxDen / baseDen)));
      const frac = { num: baseNum * multiplier, den: baseDen * multiplier };
      const gcdValue = gcd(frac.num, frac.den);
      const simplified = simplify(frac);
      
      return {
        kind: "gcdSimplify",
        frac,
        gcd: gcdValue,
        answer: fractionToString(simplified)
      };
    }

    case "simplify": {
      // Generate a non-simplified fraction
      let baseDen = randInt(2, level.maxDen);
      let baseNum = randInt(1, baseDen - 1);
      const multiplier = randInt(2, Math.min(4, Math.floor(level.maxDen / baseDen)));
      const frac = { num: baseNum * multiplier, den: baseDen * multiplier };
      const simplified = simplify(frac);
      
      return {
        kind: "simplify",
        frac,
        answer: fractionToString(simplified)
      };
    }

    case "equivalent": {
      if (levelIndex <= 1) {
        // Levels 1-2: solve for x format
        const baseDen = randInt(2, level.maxDen);
        const baseNum = randInt(1, baseDen - 1);
        const baseFrac = { num: baseNum, den: baseDen };
        
        if (levelIndex === 0) {
          // Level 1: generate equivalent by multiplying both by same factor
          const solvingForNumerator = Math.random() < 0.5;
          if (solvingForNumerator) {
            // Solve for numerator: a/b = x/c where c = b * factor
            const factor = randInt(2, 4);
            const newDen = baseDen * factor;
            const answer = baseNum * factor;
            return {
              kind: "equivalent",
              frac: baseFrac,
              options: [`${baseNum}/${baseDen} = ?/${newDen}`],
              answerSet: [answer.toString()],
              level: levelIndex
            };
          } else {
            // Solve for denominator: a/b = c/x where c = a * factor
            const factor = randInt(2, 4);
            const newNum = baseNum * factor;
            const answer = baseDen * factor;
            return {
              kind: "equivalent",
              frac: baseFrac,
              options: [`${baseNum}/${baseDen} = ${newNum}/?`],
              answerSet: [answer.toString()],
              level: levelIndex
            };
          }
        } else {
          // Level 2: full fraction input
          const multiplier = randInt(2, 4);
          return {
            kind: "equivalent",
            frac: baseFrac,
            options: [`${baseNum}/${baseDen} = x`],
            answerSet: new Set([fractionToString({ num: baseNum * multiplier, den: baseDen * multiplier })]),
            level: levelIndex
          };
        }
      } else {
        // Levels 3+: multi-select checkboxes
        const baseDen = randInt(2, level.maxDen);
        const baseNum = randInt(1, baseDen - 1);
        const baseFrac = { num: baseNum, den: baseDen };
        
        const correctOptions = new Set<string>();
        const allOptions: string[] = [];
        
        // Add 1-2 correct equivalents
        for (let i = 0; i < 2; i++) {
          const multiplier = randInt(2, 4);
          const equiv = fractionToString({ num: baseNum * multiplier, den: baseDen * multiplier });
          correctOptions.add(equiv);
          allOptions.push(equiv);
        }
        
        // Add 2-3 incorrect options
        while (allOptions.length < 4) {
          const wrongNum = randInt(1, level.maxDen);
          const wrongDen = randInt(2, level.maxDen);
          const wrong = fractionToString({ num: wrongNum, den: wrongDen });
          if (!correctOptions.has(wrong) && !allOptions.includes(wrong)) {
            allOptions.push(wrong);
          }
        }
        
        // Shuffle options
        for (let i = allOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
        }
        
        return {
          kind: "equivalent",
          frac: baseFrac,
          options: allOptions,
          answerSet: correctOptions,
          level: levelIndex
        };
      }
    }

    case "addSub": {
      const den1 = randInt(2, level.maxDen);
      const den2 = randInt(2, level.maxDen);
      const num1 = randInt(1, den1 - 1);
      const num2 = randInt(1, den2 - 1);
      
      const left = { num: num1, den: den1 };
      const right = { num: num2, den: den2 };
      const op = Math.random() < 0.5 ? "+" : "-";
      
      const commonDen = lcm(den1, den2);
      const leftAdj = { num: num1 * (commonDen / den1), den: commonDen };
      const rightAdj = { num: num2 * (commonDen / den2), den: commonDen };
      
      const resultNum = op === "+" ? leftAdj.num + rightAdj.num : leftAdj.num - rightAdj.num;
      
      if (resultNum <= 0) {
        // Retry with addition to avoid negative results
        const resultFrac = simplify({ num: leftAdj.num + rightAdj.num, den: commonDen });
        return {
          kind: "addSub",
          left,
          right,
          op: "+",
          answer: fractionToString(resultFrac)
        };
      }
      
      const resultFrac = simplify({ num: resultNum, den: commonDen });
      return {
        kind: "addSub",
        left,
        right,
        op,
        answer: fractionToString(resultFrac)
      };
    }

    case "mulDiv": {
      const den1 = randInt(2, level.maxDen);
      const den2 = randInt(2, level.maxDen);
      const num1 = randInt(1, den1 - 1);
      const num2 = randInt(1, den2 - 1);
      
      const left = { num: num1, den: den1 };
      const right = { num: num2, den: den2 };
      const op = Math.random() < 0.5 ? "×" : "÷";
      
      let resultFrac: Fraction;
      if (op === "×") {
        resultFrac = simplify({ num: num1 * num2, den: den1 * den2 });
      } else {
        // Division: multiply by reciprocal
        resultFrac = simplify({ num: num1 * den2, den: den1 * num2 });
      }
      
      return {
        kind: "mulDiv",
        left,
        right,
        op,
        answer: fractionToString(resultFrac)
      };
    }

    case "mixedImproper": {
      if (Math.random() < 0.5) {
        // Given mixed, find improper
        const whole = randInt(1, 3);
        const den = randInt(2, 8);
        const num = randInt(1, den - 1);
        const mixed = `${whole} ${num}/${den}`;
        const improper = { num: whole * den + num, den };
        
        return {
          kind: "mixedImproper",
          given: mixed,
          answer: fractionToString(improper)
        };
      } else {
        // Given improper, find mixed
        const den = randInt(2, 8);
        const whole = randInt(1, 3);
        const extra = randInt(1, den - 1);
        const improper = { num: whole * den + extra, den };
        const mixed = parseToMixed(improper);
        
        return {
          kind: "mixedImproper",
          given: fractionToString(improper),
          answer: mixed
        };
      }
    }

    default:
      throw new Error(`Unknown skill: ${skill}`);
  }
}