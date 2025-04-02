import { 
  images, 
  countingImages, 
  getCountingImage, 
  getShapeImage, 
  getFractionImage 
} from '../assets/images/base64Images';

interface ShapeMatch {
  count: number;
  shape: string;
  color?: string;
}

/**
 * Analyzes a question text to determine which type of image to display
 */
export const getQuestionImage = (questionText: string): string | null => {
  // Exit early if no question text
  if (!questionText) return null;

  console.log('Finding image for question:', questionText);
  
  // Check for various patterns in the question text
  
  // 1. Check for specific counting questions
  if (/how many (objects|items|things|shapes|dots|stars) are there/i.test(questionText)) {
    // Generic counting question
    const countMatch = questionText.match(/(\d+|one|two|three|four|five)/i);
    if (countMatch) {
      const countMap: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
      };
      const count = countMatch[1].match(/\d+/) 
        ? parseInt(countMatch[1]) 
        : countMap[countMatch[1].toLowerCase()] || 3;
      
      return getCountingImage(count);
    }
    
    // Default to 3 if no count specified
    return countingImages[3];
  }
  
  // 2. Check for specific shape questions
  if (/which (one|shape) is a (circle|square|triangle|rectangle)/i.test(questionText)) {
    return images.shapes;
  }
  
  // 3. Check for counting specific shapes
  const shapeCountMatch = questionText.match(/how many (small|big|large)?\s*(circles|squares|triangles|rectangles|stars)/i);
  if (shapeCountMatch) {
    const shapeSize = (shapeCountMatch[1] || "").toLowerCase();
    const shapeType = (shapeCountMatch[2] || "").toLowerCase();
    
    // Look for options like "5, 6, 7, or 8" in the question text - this could indicate answer choices
    const optionsMatch = questionText.match(/(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(or|and|&|\d+)/i);
    if (optionsMatch) {
      // Extract potential counts from the options
      const potentialCounts = [];
      for (let i = 1; i <= 4; i++) {
        if (optionsMatch[i] && /^\d+$/.test(optionsMatch[i])) {
          potentialCounts.push(parseInt(optionsMatch[i]));
        }
      }
      
      // If we have potential counts, use the smallest valid one for the image
      if (potentialCounts.length > 0) {
        const count = Math.min(...potentialCounts);
        console.log(`Found shape count options ${potentialCounts}, using ${count} for ${shapeType}`);
        return getCountingImage(count, shapeType.replace(/s$/, ''));
      }
    }
    
    // Look for a number in the question text itself
    const countMatch = questionText.match(/(\d+|one|two|three|four|five)\s+(small|big|large)?\s*(circles|squares|triangles|rectangles|stars)/i);
    if (countMatch) {
      const countMap: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
      };
      const count = countMatch[1].match(/\d+/) 
        ? parseInt(countMatch[1]) 
        : countMap[countMatch[1].toLowerCase()] || 3;
      
      return getCountingImage(count, shapeType.replace(/s$/, ''));
    }
    
    // Generate specific count images based on shape type
    if (shapeType.includes('circle')) return getCountingImage(4, 'circle');
    if (shapeType.includes('square')) return getCountingImage(5, 'square');
    if (shapeType.includes('triangle')) return getCountingImage(6, 'triangle');
    if (shapeType.includes('star')) return getCountingImage(5, 'star');
    
    return images.coloredShapes;
  }
  
  // 4. Check for comparing shapes or objects
  if (/which (group|shape|color) has (more|less|fewer)/i.test(questionText) || 
      /(more|less|fewer) (shapes|objects|items)/i.test(questionText)) {
    return images.coloredShapes;
  }
  
  // 5. Check for fraction visuals
  if (/what fraction/i.test(questionText) || /fraction (is|of)/i.test(questionText)) {
    return images.fractionHalf;
  }
  
  // 6. Pattern matching for complex shape descriptions: "2 red circles, 3 blue squares"
  const shapeMatches: ShapeMatch[] = [];
  const regex = /(\d+|one|two|three|four|five)\s+(red|blue|green|yellow|purple|orange)?\s*(squares?|circles?|triangles?|rectangles?|stars?)/gi;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(questionText)) !== null) {
    const countText = match[1].toLowerCase();
    const countMap: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
    };
    const count = /\d+/.test(countText) ? parseInt(countText) : countMap[countText] || 1;
    
    const color = match[2] || undefined;
    const shape = match[3].toLowerCase().replace(/s$/, ''); // Remove plural 's'
    
    shapeMatches.push({ count, shape, color });
  }
  
  if (shapeMatches.length > 0) {
    console.log('Found shape matches:', shapeMatches);
    
    // If we have a specific shape match, use a counting image for that shape
    if (shapeMatches.length === 1) {
      const { count, shape } = shapeMatches[0];
      return getCountingImage(count, shape);
    }
    
    // If we have multiple shapes, use the colored shapes image
    return images.coloredShapes;
  }
  
  // 7. Look for "look at these shapes" pattern
  if (/look at (the|these) shapes/i.test(questionText)) {
    return images.shapes;
  }
  
  // 8. Generic fallback for any visual references
  const visualPatterns = [
    /picture/i, /image/i, /figure/i, /diagram/i, /drawing/i,
    /shown/i, /below/i, /above/i, /pictured/i
  ];
  
  for (const pattern of visualPatterns) {
    if (pattern.test(questionText)) {
      return images.shapes; // Default fallback if we detect visual references
    }
  }
  
  // No match found
  return null;
};