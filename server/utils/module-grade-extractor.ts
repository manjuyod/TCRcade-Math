/**
 * Utility functions to extract module-specific grade levels from user's hiddenGradeAsset
 */

/**
 * Extract the grade level for a specific module from user's hiddenGradeAsset
 */
export function getModuleGradeLevel(user: any, moduleName: string): string | undefined {
  if (!user?.hiddenGradeAsset?.modules) {
    return user?.grade || undefined;
  }

  const hiddenAsset = user.hiddenGradeAsset;
  
  // Map module names to their hiddenGradeAsset module keys
  const moduleMapping: Record<string, string> = {
    // Math Rush modules
    'math_rush_addition': 'math_rush',
    'math_rush_multiplication': 'math_rush', 
    'math_rush_subtraction': 'math_rush',
    'math_rush_division': 'math_rush',
    
    // Math Facts modules
    'math_facts_addition': 'addition_facts',
    'math_facts_subtraction': 'subtraction_facts', 
    'math_facts_multiplication': 'multiplication_facts',
    'math_facts_division': 'division_facts',
    'math_facts_mixed': 'multiplication_facts', // fallback to multiplication
    
    // Other modules
    'fractions_puzzle': 'fractions_puzzle',
    'decimal_defender_rounding': 'decimal_defender',
    'decimal_defender_comparing': 'decimal_defender',
    'decimal_defender_add_subtract': 'decimal_defender',
    'decimal_defender_place_value': 'decimal_defender',
    'decimal_defender_default': 'decimal_defender',
    'ratios_proportions': 'ratios_proportions',
    'measurement_mastery': 'measurement',
    'algebra': 'algebra'
  };

  // Get the module key from mapping
  const moduleKey = moduleMapping[moduleName] || moduleName.split('_')[0];
  
  // Try to get grade level from the specific module
  const moduleData = hiddenAsset.modules?.[moduleKey];
  if (moduleData?.grade_level) {
    return moduleData.grade_level.toString();
  }

  // Fallback to user's general grade
  return user?.grade || undefined;
}

/**
 * Get all available module grade levels for a user
 */
export function getAllModuleGradeLevels(user: any): Record<string, string> {
  const gradeLevels: Record<string, string> = {};
  
  if (!user?.hiddenGradeAsset?.modules) {
    return gradeLevels;
  }

  const modules = user.hiddenGradeAsset.modules;
  
  Object.keys(modules).forEach(moduleKey => {
    const moduleData = modules[moduleKey];
    if (moduleData?.grade_level) {
      gradeLevels[moduleKey] = moduleData.grade_level.toString();
    }
  });

  return gradeLevels;
}