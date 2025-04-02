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
export const getQuestionImage = (questionText: string, storyImage?: string | null): string | null => {
  // If there's already a storyImage provided from the server, prioritize it
  if (storyImage) {
    console.log('Using provided storyImage:', storyImage.substring(0, 50) + '...');
    return storyImage;
  }
  
  // Exit early if no question text
  if (!questionText) return null;

  console.log('Finding image for question:', questionText);
  
  // Check for various patterns in the question text
  
  // 1. Enhanced counting questions check - capture more variations
  if (/how many (objects|items|things|shapes|dots|stars|blocks|circles|squares|triangles) (are there|do you see|can you see|can you count)/i.test(questionText) ||
      /count the (objects|items|things|shapes|dots|stars|blocks|circles|squares|triangles)/i.test(questionText)) {
    
    // First check for actual numbers in the answer choices
    // This helps us display the correct number of objects that matches the answer
    const answerOptions = questionText.match(/options:? \[(.*?)\]/i);
    if (answerOptions && answerOptions[1]) {
      const options = answerOptions[1].split(',').map(opt => opt.trim().replace(/['"]/g, ''));
      const numericOptions = options
        .map(opt => parseInt(opt.trim()))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);
        
      if (numericOptions.length > 0) {
        // Find the correct answer if it's marked
        const correctAnswer = questionText.match(/answer:? ["']?(\d+)["']?/i);
        if (correctAnswer && correctAnswer[1]) {
          const answer = parseInt(correctAnswer[1]);
          console.log(`Found correct answer: ${answer}`);
          
          // Match the shape type
          const shapeType = (questionText.match(/(circle|square|triangle|star|block|dot)/i) || ['', 'circle'])[1].toLowerCase();
          
          // Get the correct image
          return getCountingImage(answer, shapeType);
        }
        
        // If no correct answer marked, use the smallest numeric option
        const count = numericOptions[0];
        console.log(`Using the smallest option: ${count}`);
        
        // Match the shape type from the question
        const shapeType = (questionText.match(/(circle|square|triangle|star|block|dot)/i) || ['', 'circle'])[1].toLowerCase();
        return getCountingImage(count, shapeType);
      }
    }
    
    // Generic counting question - look for specific numbers in the question
    const countMatch = questionText.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(objects|items|things|shapes|dots|stars|blocks|circles|squares|triangles)/i);
    if (countMatch) {
      const countMap: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
      };
      const count = countMatch[1].match(/\d+/) 
        ? parseInt(countMatch[1]) 
        : countMap[countMatch[1].toLowerCase()] || 3;
      
      // Determine shape type if mentioned
      const itemType = countMatch[2].toLowerCase();
      let shapeType = 'circle'; // default
      
      if (itemType.includes('circle')) shapeType = 'circle';
      else if (itemType.includes('square')) shapeType = 'square';
      else if (itemType.includes('triangle')) shapeType = 'triangle';
      else if (itemType.includes('star')) shapeType = 'star';
      
      return getCountingImage(count, shapeType);
    }
    
    // If we're asking to count but no specific number is in the question,
    // see if we can extract from pattern like "How many stars are there? ⭐️⭐️⭐️"
    const emojiMatch = questionText.match(/[⭐️🔵🔴🟡🟢🟣🟠◼️▲●♦️]+/);
    if (emojiMatch) {
      const emojiText = emojiMatch[0];
      
      // For emoji counting, use a fixed number rather than trying to count the characters
      const count = 3; // Default to 3 to avoid string iteration issues
      
      // Determine emoji type
      let shapeType = 'circle';
      if (emojiText.indexOf('⭐️') >= 0) shapeType = 'star';
      else if (emojiText.indexOf('▲') >= 0) shapeType = 'triangle';
      else if (emojiText.indexOf('◼️') >= 0) shapeType = 'square';
      
      return getCountingImage(count, shapeType);
    }
    
    // Default to 3 if no count specified
    return countingImages[3];
  }
  
  // 2. Check for specific shape questions - expanded patterns
  if (/which (one|shape|object) is a (circle|square|triangle|rectangle|star)/i.test(questionText) ||
      /identify the (circle|square|triangle|rectangle|star)/i.test(questionText) ||
      /find the (circle|square|triangle|rectangle|star)/i.test(questionText)) {
    return images.shapes;
  }
  
  // 3. Enhanced check for counting specific shapes
  const shapeCountMatch = questionText.match(/how many (small|big|large|red|blue|green|yellow|orange|purple)?\s*(circles|squares|triangles|rectangles|stars|shapes)/i);
  if (shapeCountMatch) {
    const shapeModifier = (shapeCountMatch[1] || "").toLowerCase();
    const shapeType = (shapeCountMatch[2] || "").toLowerCase();
    
    // First look for multichoice options in the form of 5, 6, 7, or 8
    const optionsMatch = questionText.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*(or|and|&)?\s*(\d+)?/i);
    if (optionsMatch) {
      // Extract potential counts from the options
      const potentialCounts = [];
      for (let i = 1; i <= 5; i++) {
        if (optionsMatch[i] && /^\d+$/.test(optionsMatch[i])) {
          potentialCounts.push(parseInt(optionsMatch[i]));
        }
      }
      
      // If we have potential counts, use the correct answer if found or the smallest valid one
      if (potentialCounts.length > 0) {
        // Try to find the correct answer
        const correctAnswer = questionText.match(/answer:? ["']?(\d+)["']?/i);
        if (correctAnswer && correctAnswer[1]) {
          const answer = parseInt(correctAnswer[1]);
          console.log(`Found correct answer for shape count: ${answer}`);
          return getCountingImage(answer, shapeType.replace(/s$/, ''));
        }
        
        const count = Math.min(...potentialCounts);
        console.log(`Found shape count options ${potentialCounts}, using ${count} for ${shapeType}`);
        return getCountingImage(count, shapeType.replace(/s$/, ''));
      }
    }
    
    // Look for a number in the question text itself
    const countMatch = questionText.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(small|big|large|red|blue|green|yellow|orange|purple)?\s*(circles|squares|triangles|rectangles|stars)/i);
    if (countMatch) {
      const countMap: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
      };
      const count = countMatch[1].match(/\d+/) 
        ? parseInt(countMatch[1]) 
        : countMap[countMatch[1].toLowerCase()] || 3;
      
      // Get the shape type
      const shape = countMatch[3].toLowerCase().replace(/s$/, '');
      return getCountingImage(count, shape);
    }
    
    // Look for emoji count in the question (e.g., ⭐️⭐️⭐️⭐️)
    const emojiMatch = questionText.match(/[⭐️🔵🔴🟡🟢🟣🟠◼️▲●♦️]+/);
    if (emojiMatch) {
      const emojiText = emojiMatch[0];
      
      // For emoji counting, use a fixed number rather than trying to count the characters
      const count = 3; // Default to 3 to avoid string iteration issues
      
      // Determine shape type
      let shape = shapeType.replace(/s$/, '');
      if (emojiText.indexOf('⭐️') >= 0 && !shape) shape = 'star';
      
      return getCountingImage(count, shape);
    }
    
    // Generate specific count images based on shape type (3-6 is a safe range)
    const safeCount = 3 + Math.floor(Math.random() * 4); // Between 3 and 6
    if (shapeType.includes('circle')) return getCountingImage(safeCount, 'circle');
    if (shapeType.includes('square')) return getCountingImage(safeCount, 'square');
    if (shapeType.includes('triangle')) return getCountingImage(safeCount, 'triangle');
    if (shapeType.includes('star')) return getCountingImage(safeCount, 'star');
    
    return getCountingImage(safeCount);
  }
  
  // 4. Check for comparing shapes or objects
  if (/which (group|shape|set|color) has (more|less|fewer)/i.test(questionText) || 
      /(more|less|fewer) (shapes|objects|items)/i.test(questionText)) {
    return images.coloredShapes;
  }
  
  // 5. Check for fraction visuals
  if (/what fraction/i.test(questionText) || /fraction (is|of)/i.test(questionText)) {
    // Try to extract the specific fraction from the answer if available
    const fractionMatch = questionText.match(/answer:? ["']?(\d+)\/(\d+)["']?/i);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      if (!isNaN(numerator) && !isNaN(denominator)) {
        return getFractionImage(numerator, denominator);
      }
    }
    
    // Otherwise default to 1/2
    return images.fractionHalf;
  }
  
  // 6. Enhanced pattern matching for complex shape descriptions: "2 red circles, 3 blue squares"
  const shapeMatches: ShapeMatch[] = [];
  const regex = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(red|blue|green|yellow|purple|orange)?\s*(squares?|circles?|triangles?|rectangles?|stars?)/gi;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(questionText)) !== null) {
    const countText = match[1].toLowerCase();
    const countMap: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
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
  
  // 7. Enhanced pattern for "look at these shapes" with more variations
  if (/look at (the|these) shapes/i.test(questionText) ||
      /these (shapes|objects|items) (below|above|shown)/i.test(questionText) ||
      /(circles|squares|triangles|stars) (below|above|shown)/i.test(questionText)) {
    // Check if we're looking for a specific shape
    const specificShape = questionText.match(/(circle|square|triangle|star)/i);
    if (specificShape) {
      const shape = specificShape[1].toLowerCase();
      // Pick a reasonable count
      return getCountingImage(4, shape);
    }
    
    return images.shapes;
  }
  
  // 8. Enhanced generic fallback for any visual references 
  const visualPatterns = [
    /picture/i, /image/i, /figure/i, /diagram/i, /drawing/i,
    /shown/i, /below/i, /above/i, /pictured/i, /illustrated/i,
    /do you see/i, /can you see/i, /you can see/i,
    /there are/i, /look at/i, /observe/i, /notice/i
  ];
  
  for (const pattern of visualPatterns) {
    if (pattern.test(questionText)) {
      // Check for specific shapes in the text
      const shapeMatch = questionText.match(/(circle|square|triangle|star|shapes)/i);
      if (shapeMatch) {
        const shape = shapeMatch[1].toLowerCase();
        if (shape === 'shapes') {
          return images.shapes;
        } else {
          // For specific shapes use a sensible count
          return getCountingImage(4, shape);
        }
      }
      
      return images.shapes; // Default fallback if we detect visual references
    }
  }
  
  // 9. Check for emoji indicators in the question
  if (/[⭐️🔵🔴🟡🟢🟣🟠◼️▲●♦️]+/.test(questionText)) {
    const emojiMatch = questionText.match(/[⭐️🔵🔴🟡🟢🟣🟠◼️▲●♦️]+/);
    if (emojiMatch) {
      const emojiText = emojiMatch[0];
      
      // For emoji counting, use a fixed number rather than trying to count the characters
      const count = 3; // Default to 3 to avoid string iteration issues
      
      // Determine emoji type
      let shapeType = 'circle';
      if (emojiText.indexOf('⭐️') >= 0) shapeType = 'star';
      else if (emojiText.indexOf('▲') >= 0) shapeType = 'triangle';
      else if (emojiText.indexOf('◼️') >= 0) shapeType = 'square';
      
      return getCountingImage(count, shapeType);
    }
  }
  
  // No match found
  return null;
};