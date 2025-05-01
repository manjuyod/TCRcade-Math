/**
 * Math formatting utility for LaTeX and KaTeX integration
 * This utility helps format math expressions properly using KaTeX
 */

/**
 * Formats a mathematical expression for proper display using LaTeX syntax
 * @param expression The mathematical expression to format
 * @returns The formatted expression with LaTeX wrappers
 */
export function formatMathExpression(expression: string): string {
  if (!expression) return '';
  
  // Skip processing if it's already wrapped in LaTeX delimiters
  if (expression.startsWith('$') && expression.endsWith('$')) {
    return expression;
  }
  
  // Check if this looks like a math expression that should be formatted
  const mathRegex = /[\+\-\*\/\^\=\(\)\[\]\{\}]/; // Basic math operators and brackets
  const fractionRegex = /\d+\s*\/\s*\d+/; // Fractions like 3/4
  const exponentRegex = /\^\d+|\d+\^\d+/; // Exponents 
  const algebraicRegex = /[a-zA-Z][\^\d]|[a-zA-Z]\s*[\+\-\*\/]|[\+\-\*\/]\s*[a-zA-Z]/; // Algebraic expressions
  
  const isMathExpression = mathRegex.test(expression) || 
                        fractionRegex.test(expression) || 
                        exponentRegex.test(expression) || 
                        algebraicRegex.test(expression);
  
  if (!isMathExpression) {
    return expression;
  }
  
  // Format specific patterns for better LaTeX display
  let formattedExpression = expression
    // Handle division
    .replace(/(\/)/g, ' \\div ')
    // Handle multiplication
    .replace(/(\*)|(×)/g, ' \\times ')
    // Format exponents (like 2^3)
    .replace(/(\d+)\^(\d+)/g, '$1^{$2}')
    // Format variables with exponents (like x^2)
    .replace(/([a-zA-Z])\^(\d+)/g, '$1^{$2}')
    // Format square roots
    .replace(/√(\d+)/g, '\\sqrt{$1}')
    // Format fractions with proper spacing
    .replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');
  
  // Wrap the expression in LaTeX inline math delimiters
  return `$${formattedExpression}$`;
}

/**
 * Formats a mathematical operation symbol to its LaTeX equivalent
 * @param operation Math operation (+, -, *, /, etc)
 * @returns Properly formatted LaTeX for the operation
 */
export function formatOperation(operation: string): string {
  switch(operation) {
    case 'addition':
      return '+';
    case 'subtraction':
      return '-';
    case 'multiplication':
      return '\\times';
    case 'division':
      return '\\div';
    default:
      return operation;
  }
}

/**
 * Prepares a complete math expression with LaTeX formatting
 * @param left Left operand
 * @param operation Math operation
 * @param right Right operand
 * @returns Formatted LaTeX math expression
 */
export function prepareMathExpression(left: string | number, operation: string, right: string | number): string {
  return formatMathExpression(`${left} ${operation} ${right}`);
}
