import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Checks if a question text references an image or visual
 * @param questionText The text of the question to check for image references
 */
function questionReferencesImage(questionText: string): boolean {
  console.log("Checking if question references an image:", questionText);
  
  // Define very specific patterns for allowed visual questions
  const allowedVisualPatterns = [
    // Counting specific shapes
    /how many (triangles?|circles?|squares?|stars?|shapes?|rectangles?|pentagons?|hexagons?|octagons?|ovals?)/i,
    /count the (triangles?|circles?|squares?|stars?|shapes?|rectangles?|pentagons?|hexagons?|octagons?|ovals?)/i,
    /total number of (triangles?|circles?|squares?|stars?|shapes?|rectangles?|pentagons?|hexagons?|octagons?|ovals?)/i,
    
    // Shape identification/recognition
    /which (shape|one) is a (triangle|circle|square|star|rectangle|pentagon|hexagon|octagon|oval)/i,
    /identify the (triangle|circle|square|star|rectangle|pentagon|hexagon|octagon|oval)/i,
    /what shape is (shown|this|pictured|displayed)/i,
    /name the shape/i,
    /which of these shapes/i,

    // Shape attribute questions
    /which shape has (\d+) sides/i,
    /how many sides does a (triangle|square|pentagon|hexagon|octagon) have/i,
    /which shape is (round|circular|rectangular|triangular|square)/i,
    
    // Fractions with visual references
    /what fraction is shaded/i,
    /what fraction of the (shape|circle|square|rectangle|figure) is (shaded|colored)/i,
    /which fraction (represents|shows|equals|is) the shaded part/i,
    /shade the part that represents (\d+)\/(\d+)/i,
    /which model (shows|represents) (\d+)\/(\d+)/i
  ];
  
  // Check for these specific patterns
  const matchedPattern = allowedVisualPatterns.find(pattern => pattern.test(questionText));
  if (matchedPattern) {
    console.log("Question matches allowed visual pattern:", matchedPattern);
    return true;
  }
  
  // Check for specific counting of colored shapes - flexible pattern matching
  const colorWords = /red|blue|green|yellow|purple|orange|pink|brown|black|white|gray|grey/i;
  const shapeWords = /triangles?|circles?|squares?|stars?|rectangles?|pentagons?|hexagons?|octagons?|ovals?|shapes?/i;
  const numberWords = /\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many|few/i;
  
  // Test various patterns that mix colors and shapes
  const colorPatterns = [
    // Number + color + shape ("3 red circles")
    new RegExp(`(${numberWords.source})\\s+(${colorWords.source})\\s+(${shapeWords.source})`, 'i'),
    
    // Color + shape + number/quantifier ("red circles that have 5 sides")
    new RegExp(`(${colorWords.source})\\s+(${shapeWords.source})`, 'i'),
    
    // Various ways of asking about colored shapes
    /identify the (red|blue|green|yellow|purple) shapes?/i,
    /which shapes? is (red|blue|green|yellow|purple)/i,
    /how many (red|blue|green|yellow|purple) shapes?/i,
    /count the (red|blue|green|yellow|purple) shapes?/i,
    /(red|blue|green|yellow|purple) colored shapes?/i
  ];
  
  // Check if any color pattern is found
  for (const pattern of colorPatterns) {
    if (pattern.test(questionText)) {
      console.log("Colored shape question detected with pattern:", pattern);
      return true;
    }
  }
  
  // Special handling for Money-related questions
  const moneyTerms = [
    /coins?/i, /bills?/i, /dollars?/i, /cents?/i, /money/i, 
    /penny|pennies/i, /nickel/i, /dime/i, /quarter/i,
    /\$\d+/i, /\d+\s*cents/i, /\$(\d+)\.(\d+)/i
  ];
  
  // Money-specific question patterns
  const moneyQuestionPatterns = [
    /how much money/i,
    /how many (cents|pennies|nickels|dimes|quarters)/i,
    /what is the (total|value)/i,
    /count the (money|coins|bills)/i,
    /how much (does .+ cost|is .+ worth)/i,
    /what coins make/i,
    /which coins would you use/i,
    /can you make \$[\d\.]+/i,
    /show the coins that equal/i,
    /if you have .+ coins/i
  ];
  
  // Check if it's a money-related question
  if (moneyTerms.some(term => term.test(questionText)) && 
      (moneyQuestionPatterns.some(pattern => pattern.test(questionText)) || 
       /how many|count|total|value|worth|cost/i.test(questionText) || 
       /\d+.*and.*\d+/.test(questionText))) {
    console.log("Money-related question detected for 'Money Matters' category");
    return true;
  }
  
  // Check for specific counting patterns
  const countingPattern = /how many (triangles?|circles?|squares?|stars?)/i;
  if (countingPattern.test(questionText)) {
    console.log("Counting question detected that needs visualization");
    return true;
  }
  
  // Specific patterns for fraction-related questions needing visuals
  const fractionVisualPatterns = [
    /what fraction (is|of|represents)/i,
    /fraction model/i,
    /which model shows/i,
    /shade (\d+\/\d+) of the/i,
    /represent the fraction/i,
    /(\d+)\/(\d+) of the (circle|square|shape|rectangle|figure|model)/i,
    /equivalent fractions?/i,
    /equal parts/i
  ];

  if ((fractionVisualPatterns.some(pattern => pattern.test(questionText)) || 
      (/fraction/i.test(questionText) && /shaded|colored|show|model|visual|diagram|part/i.test(questionText)))) {
    console.log("Fraction question detected that needs visualization");
    return true;
  }
  
  // Don't generate images for real-world object references
  const realWorldObjectsPattern = /(chocolate|pizza|cake|cookie|car|book|apple|banana|toy|train|doll|pencil|marker|ball)/i;
  if (realWorldObjectsPattern.test(questionText)) {
    console.log("Question references real-world objects, not generating an image");
    return false;
  }
  
  // Do NOT generate images for word problems or numerical calculations
  const wordProblemPatterns = [
    /If .+ has .+ and/i,
    /Jane has/i,
    /John has/i,
    /Tom has/i,
    /Sarah has/i,
    /A student has/i
  ];
  
  if (wordProblemPatterns.some(pattern => pattern.test(questionText))) {
    console.log("Word problem detected, not generating an image");
    return false;
  }
  
  return false;
}

/**
 * Generates a simple SVG image for math questions
 * @param content Content to be visualized (numbers, shapes, etc.)
 * @param type Type of image to generate: "countObjects", "shapes", etc.
 */
function generateSVGImage(content: any, type: string): string {
  const svgWidth = 300;
  const svgHeight = 200;
  let svgContent = '';
  
  // Start with SVG header
  const svgHeader = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>`;
  
  // End with SVG footer
  const svgFooter = `</svg>`;
  
  // Generate appropriate content based on type
  if (type === "money") {
    // Special case for money visuals (US currency)
    // Content is expected to be an array of objects with type and count properties
    
    // Define currency properties - Money visualization settings
    
    // Parse and standardize the money items based on different possible input formats
    let moneyItems: Array<{type: string, count: number}>;
    
    // Handle different input formats
    if (Array.isArray(content) && content.length === 2 && typeof content[1] === 'number') {
      // Simple [type, count] format - e.g. ["penny", 3]
      const [type, count] = content;
      moneyItems = [{ type, count }];
    } else if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
      // Object with multiple denominations - e.g. {penny: 2, nickel: 1}
      moneyItems = [];
      for (const [type, count] of Object.entries(content)) {
        moneyItems.push({ type, count: Number(count) });
      }
    } else if (Array.isArray(content) && content.length > 0 && 
               content.every(item => typeof item === 'object' && item !== null && 'type' in item && 'count' in item)) {
      // Already in the correct format - e.g. [{type: "penny", count: 2}, {type: "nickel", count: 1}]
      moneyItems = [];
      for (const item of content) {
        if (typeof item === 'object' && item !== null && 'type' in item && 'count' in item) {
          moneyItems.push({
            type: String(item.type),
            count: Number(item.count)
          });
        }
      }
    } else {
      // Default fallback - show a mix of coins
      moneyItems = [
        { type: 'penny', count: 2 },
        { type: 'nickel', count: 1 },
        { type: 'dime', count: 1 }
      ];
    }
    
    // Define properties of each currency type
    const currencyProps = {
      'penny': { color: '#B87333', value: '1¢', radius: 15, label: 'Penny' },
      'nickel': { color: '#A8A9AD', value: '5¢', radius: 17, label: 'Nickel' },
      'dime': { color: '#A8A9AD', value: '10¢', radius: 14, label: 'Dime' },
      'quarter': { color: '#A8A9AD', value: '25¢', radius: 19, label: 'Quarter' },
      '$1': { color: '#EADDCA', value: '$1', width: 60, height: 25, label: 'One Dollar' },
      '$5': { color: '#B3D9B3', value: '$5', width: 62, height: 26, label: 'Five Dollars' },
      '$10': { color: '#F9E076', value: '$10', width: 64, height: 27, label: 'Ten Dollars' },
      '$20': { color: '#B1CAE5', value: '$20', width: 66, height: 28, label: 'Twenty Dollars' }
    };
    
    // Count total items
    let totalItems = 0;
    moneyItems.forEach(item => { totalItems += item.count; });
    
    // Layout settings
    const itemsPerRow = Math.min(5, totalItems);
    const rows = Math.ceil(totalItems / itemsPerRow);
    const spacing = svgWidth / (itemsPerRow + 1);
    const verticalSpacing = Math.min(40, (svgHeight - 60) / (rows + 1));
    
    // Add a title
    svgContent += `<text x="${svgWidth/2}" y="20" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle">US Currency</text>`;
    
    // Draw the items
    let itemsDrawn = 0;
    for (const item of moneyItems) {
      for (let i = 0; i < item.count; i++) {
        const row = Math.floor(itemsDrawn / itemsPerRow);
        const col = itemsDrawn % itemsPerRow;
        const x = spacing * (col + 1);
        const y = verticalSpacing * (row + 1) + 30; // Add offset for title
        
        // Get currency properties
        const props = currencyProps[item.type as keyof typeof currencyProps] || currencyProps['penny'];
        
        // Draw the appropriate currency
        if (['penny', 'nickel', 'dime', 'quarter'].includes(item.type)) {
          // Draw a coin
          // Use a type guard to ensure the correct property access
          if ('radius' in props) {
            svgContent += `
              <circle cx="${x}" cy="${y}" r="${props.radius}" fill="${props.color}" stroke="#333" stroke-width="1" />
              <text x="${x}" y="${y+1}" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
            `;
          } else {
            // Fallback if for some reason we get the wrong type of props
            svgContent += `
              <circle cx="${x}" cy="${y}" r="15" fill="${props.color}" stroke="#333" stroke-width="1" />
              <text x="${x}" y="${y+1}" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
            `;
          }
        } else {
          // Draw a bill
          // Use a type guard to ensure the correct property access
          if ('width' in props && 'height' in props) {
            const width = props.width;
            const height = props.height;
            svgContent += `
              <rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" fill="${props.color}" stroke="#333" stroke-width="1" rx="2" />
              <text x="${x}" y="${y+1}" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
            `;
          } else {
            // Fallback if for some reason we get the wrong type of props
            svgContent += `
              <rect x="${x - 30}" y="${y - 15}" width="60" height="30" fill="${props.color}" stroke="#333" stroke-width="1" rx="2" />
              <text x="${x}" y="${y+1}" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
            `;
          }
        }
        
        itemsDrawn++;
      }
    }
    
    // Add a legend explaining the currency
    svgContent += `<rect x="10" y="${svgHeight - 60}" width="${svgWidth - 20}" height="50" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1" rx="5" />`;
    
    let legendX = 20;
    const legendY = svgHeight - 40;
    let legendCount = 0;
    
    for (const item of moneyItems) {
      if (legendCount < 3) { // Limit to 3 legend items to avoid crowding
        const props = currencyProps[item.type as keyof typeof currencyProps] || currencyProps['penny'];
        
        // Add icon to legend
        if (['penny', 'nickel', 'dime', 'quarter'].includes(item.type)) {
          svgContent += `<circle cx="${legendX + 10}" cy="${legendY}" r="8" fill="${props.color}" stroke="#333" stroke-width="0.5" />`;
        } else {
          svgContent += `<rect x="${legendX}" y="${legendY-6}" width="20" height="12" fill="${props.color}" stroke="#333" stroke-width="0.5" rx="1" />`;
        }
        
        // Add label
        svgContent += `<text x="${legendX + 25}" y="${legendY + 4}" font-family="Arial" font-size="11">${props.label}${item.count > 1 ? 's' : ''} (${item.count})</text>`;
        
        legendX += 100;
        legendCount++;
      }
    }
    
    // Add total value if there are mixed denominations
    if (moneyItems.length > 1) {
      let totalValue = 0;
      for (const item of moneyItems) {
        let value = 0;
        switch (item.type) {
          case 'penny': value = 1; break;
          case 'nickel': value = 5; break;
          case 'dime': value = 10; break;
          case 'quarter': value = 25; break;
          case '$1': value = 100; break;
          case '$5': value = 500; break;
          case '$10': value = 1000; break;
          case '$20': value = 2000; break;
        }
        totalValue += value * item.count;
      }
      
      // Format as dollars and cents
      let formattedValue = '';
      if (totalValue >= 100) {
        const dollars = Math.floor(totalValue / 100);
        const cents = totalValue % 100;
        formattedValue = `$${dollars}.${cents.toString().padStart(2, '0')}`;
      } else {
        formattedValue = `${totalValue}¢`;
      }
      
      svgContent += `<text x="${svgWidth-20}" y="${svgHeight - 40}" font-family="Arial" font-size="12" font-weight="bold" text-anchor="end">Total: ${formattedValue}</text>`;
    }
  }
  else if (type === "multipleShapes") {
    // For complex shape arrangements with multiple colors and types
    // content is expected to be an array of objects: {type, color, count}
    if (!Array.isArray(content)) {
      content = [{type: "circle", color: "blue", count: 3}]; // Default
    }
    
    // Keep track of total shapes for layout
    let totalShapes = 0;
    for (const shape of content) {
      totalShapes += shape.count;
    }
    
    // Calculate the layout 
    const itemsPerRow = Math.min(5, totalShapes);
    const rows = Math.ceil(totalShapes / itemsPerRow);
    const spacing = svgWidth / (itemsPerRow + 1);
    const verticalSpacing = svgHeight / (rows + 1);
    
    // Create a color mapping
    const colorMap: {[key: string]: string} = {
      "red": "#FF5733",
      "blue": "#3498DB",
      "green": "#2ECC71",
      "yellow": "#F1C40F",
      "purple": "#9B59B6",
      "orange": "#FF9500"
    };
    
    // Draw each set of shapes
    let shapesDrawn = 0;
    
    // Add a title showing the shapes being displayed
    svgContent += `<text x="${svgWidth/2}" y="20" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle">Shape Collection</text>`;
    
    for (const shapeSet of content) {
      for (let i = 0; i < shapeSet.count; i++) {
        const row = Math.floor(shapesDrawn / itemsPerRow);
        const col = shapesDrawn % itemsPerRow;
        const x = spacing * (col + 1);
        const y = verticalSpacing * (row + 1);
        
        // Get the fill color (use default if not specified)
        const fillColor = colorMap[shapeSet.color] || colorMap.blue;
        
        // Draw the appropriate shape type
        if (shapeSet.type === "circle") {
          svgContent += `<circle cx="${x}" cy="${y}" r="20" fill="${fillColor}" />`;
        } else if (shapeSet.type === "square") {
          svgContent += `<rect x="${x-20}" y="${y-20}" width="40" height="40" fill="${fillColor}" />`;
        } else if (shapeSet.type === "triangle") {
          svgContent += `<polygon points="${x},${y-20} ${x-20},${y+15} ${x+20},${y+15}" fill="${fillColor}" />`;
        }
        
        shapesDrawn++;
      }
    }
    
    // Add a legend to explain the colors and shapes
    svgContent += `<rect x="10" y="${svgHeight - 60}" width="${svgWidth - 20}" height="50" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1" rx="5" />`;
    
    let legendX = 20;
    const legendY = svgHeight - 40;
    
    for (const shapeSet of content) {
      // Skip if we've already added this type-color combo
      const fillColor = colorMap[shapeSet.color] || colorMap.blue;
      
      // Add the legend item
      if (shapeSet.type === "circle") {
        svgContent += `<circle cx="${legendX + 10}" cy="${legendY}" r="8" fill="${fillColor}" />`;
      } else if (shapeSet.type === "square") {
        svgContent += `<rect x="${legendX + 2}" y="${legendY - 8}" width="16" height="16" fill="${fillColor}" />`;
      } else if (shapeSet.type === "triangle") {
        svgContent += `<polygon points="${legendX + 10},${legendY - 8} ${legendX},${legendY + 8} ${legendX + 20},${legendY + 8}" fill="${fillColor}" />`;
      }
      
      svgContent += `<text x="${legendX + 25}" y="${legendY + 5}" font-family="Arial" font-size="12">${shapeSet.color} ${shapeSet.type}${shapeSet.count > 1 ? 's' : ''}</text>`;
      
      legendX += 100; // Move to the next legend item
    }
    
  } else if (type === "countObjects") {
    // Count objects is expecting an array: [object type, count]
    const [objectType, count] = Array.isArray(content) ? content : ["circle", 5];
    const objects = parseInt(count.toString()) || 5;
    const itemsPerRow = Math.min(5, objects);
    const rows = Math.ceil(objects / itemsPerRow);
    const spacing = svgWidth / (itemsPerRow + 1);
    const verticalSpacing = svgHeight / (rows + 1);
    
    // Draw the objects
    for (let i = 0; i < objects; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const x = spacing * (col + 1);
      const y = verticalSpacing * (row + 1);
      
      // Different objects based on the type
      if (objectType === "apple" || objectType === "apples") {
        // Draw a red apple
        svgContent += `
          <circle cx="${x}" cy="${y}" r="15" fill="red" />
          <rect x="${x-1}" y="${y-20}" width="2" height="10" fill="brown" />
          <path d="M ${x-5} ${y-15} Q ${x} ${y-20} ${x+5} ${y-15}" stroke="green" stroke-width="1.5" fill="none" />
        `;
      } else if (objectType === "star" || objectType === "stars") {
        // Draw a yellow star
        const starPoints = getStarPoints(x, y, 15);
        svgContent += `<polygon points="${starPoints}" fill="gold" stroke="orange" stroke-width="1" />`;
      } else if (objectType === "triangle" || objectType === "triangles") {
        // Draw a green triangle
        svgContent += `<polygon points="${x},${y-15} ${x-15},${y+10} ${x+15},${y+10}" fill="green" />`;
      } else if (objectType === "square" || objectType === "squares") {
        // Draw a blue square
        svgContent += `<rect x="${x-15}" y="${y-15}" width="30" height="30" fill="blue" />`;
      } else if (objectType === "circle" || objectType === "circles") {
        // Draw a purple circle
        svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="purple" />`;
      } else {
        // Default to a simple circle
        svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="#FF9500" />`;
      }
    }
  } else if (type === "shapes") {
    // Draw different shapes for shape recognition
    const shapesData = [
      { type: "circle", x: 75, y: 75, params: 30, fill: "#FF5733" },
      { type: "square", x: 225, y: 75, size: 50, fill: "#33A8FF" },
      { type: "triangle", x: 150, y: 125, size: 50, fill: "#4CAF50" }
    ];
    
    // Draw each shape
    for (const shape of shapesData) {
      if (shape.type === "circle") {
        svgContent += `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.params}" fill="${shape.fill}" />`;
      } else if (shape.type === "square") {
        const halfSize = (shape.size || 40) / 2;
        svgContent += `<rect x="${shape.x - halfSize}" y="${shape.y - halfSize}" width="${shape.size}" height="${shape.size}" fill="${shape.fill}" />`;
      } else if (shape.type === "triangle") {
        const size = shape.size || 40;
        const halfSize = size / 2;
        svgContent += `<polygon points="${shape.x},${shape.y - halfSize} ${shape.x - halfSize},${shape.y + halfSize} ${shape.x + halfSize},${shape.y + halfSize}" fill="${shape.fill}" />`;
      }
    }
    
    // Add labels if requested
    if (content === "labeled") {
      svgContent += `
        <text x="75" y="125" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Circle</text>
        <text x="225" y="125" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Square</text>
        <text x="150" y="185" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Triangle</text>
      `;
    }
  } else if (type === "fractions") {
    // Draw a fraction representation (e.g., 3/4 shows 3 out of 4 parts shaded)
    const [numerator, denominator] = Array.isArray(content) ? content : [1, 4];
    const num = parseInt(numerator.toString()) || 1;
    const denom = parseInt(denominator.toString()) || 4;
    
    // Calculate dimensions for a horizontal bar representation
    const barWidth = 240;
    const barHeight = 40;
    const barX = (svgWidth - barWidth) / 2;
    const barY = (svgHeight - barHeight) / 2;
    
    // Draw the whole bar outline
    svgContent += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="none" stroke="black" stroke-width="2" />`;
    
    // Draw division lines
    const sectionWidth = barWidth / denom;
    for (let i = 1; i < denom; i++) {
      const lineX = barX + (sectionWidth * i);
      svgContent += `<line x1="${lineX}" y1="${barY}" x2="${lineX}" y2="${barY + barHeight}" stroke="black" stroke-width="2" />`;
    }
    
    // Fill in the numerator parts
    for (let i = 0; i < num; i++) {
      const rectX = barX + (sectionWidth * i);
      svgContent += `<rect x="${rectX}" y="${barY}" width="${sectionWidth}" height="${barHeight}" fill="#FFD700" stroke="none" />`;
    }
    
    // Add fraction text
    svgContent += `<text x="${svgWidth/2}" y="${barY + barHeight + 25}" font-family="Arial" font-size="14" text-anchor="middle" fill="black">${num}/${denom}</text>`;
  }
  
  // Create the complete SVG string
  const completeSvg = svgHeader + svgContent + svgFooter;
  
  // For debugging
  console.log("Generated SVG:", completeSvg.substring(0, 100) + "...");
  
  // Return as a data URI
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(completeSvg)}`;
}

/**
 * Helper function to create star points
 */
function getStarPoints(centerX: number, centerY: number, size: number): string {
  const outerRadius = size;
  const innerRadius = size / 2.5;
  const points = [];
  
  for (let i = 0; i < 10; i++) {
    // Use outer or inner radius based on the current point
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI * i / 5;
    
    // Calculate the point coordinates
    const x = centerX + radius * Math.sin(angle);
    const y = centerY - radius * Math.cos(angle);
    
    points.push(`${x},${y}`);
  }
  
  return points.join(' ');
}

type AdaptiveQuestionParams = {
  grade: string;
  concept?: string;
  studentLevel?: number;
  previousQuestions?: number[];
  difficulty?: number;
  category?: string;
};

/**
 * Analyzes a student's response to a math question and provides helpful feedback
 */
export async function analyzeStudentResponse(question: string, studentAnswer: string, correctAnswer: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert and encouraging math tutor for K-6 students. 
          Your goal is to help students understand math concepts by giving clear, encouraging feedback.
          Keep your responses simple, positive, and appropriate for elementary school students.
          If the student's answer is correct, offer brief praise.
          If the answer is incorrect, explain the concept in simple terms and guide them toward the right approach without directly giving the answer.
          Always use visuals or relatable examples when appropriate.
          For incorrect answers, provide 1-2 hints that will help them solve it on their own.`
        },
        {
          role: "user",
          content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}`
        }
      ],
      max_tokens: 300,
    });

    return {
      feedback: response.choices[0].message.content,
      isCorrect: studentAnswer === correctAnswer
    };
  } catch (error) {
    console.error("Error analyzing student response:", error);
    return {
      feedback: "I couldn't analyze your answer right now. Let's try again later!",
      isCorrect: studentAnswer === correctAnswer
    };
  }
}

/**
 * Generates a personalized hint based on a math question and student context
 */
export async function generateMathHint(question: string, grade: string, previousAttempts: number = 0) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful math tutor for ${grade} grade students. 
          Provide an age-appropriate hint for the question without giving away the answer.
          For the first hint (previousAttempts=0), give a general conceptual reminder.
          For the second hint (previousAttempts=1), provide a more specific strategy.
          For the third hint (previousAttempts=2+), provide a more direct clue that gets them closer to the answer.
          Keep hints concise, encouraging, and tailored for young students.`
        },
        {
          role: "user",
          content: `Question: ${question}\nPrevious attempts: ${previousAttempts}`
        }
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating math hint:", error);
    return "Think about the key steps needed to solve this problem. You can do it!";
  }
}

/**
 * Explains a math concept in an age-appropriate and engaging way
 */
export async function explainMathConcept(concept: string, grade: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a talented math teacher who excels at explaining concepts to ${grade} grade students.
          Use simple language, fun examples, and visual descriptions when explaining concepts.
          Relate the concept to real-world situations that children can understand.
          Keep the explanation concise - no more than 3-4 sentences.
          End with an encouraging message that makes the student feel capable.`
        },
        {
          role: "user",
          content: `Please explain the math concept of "${concept}" to a ${grade} grade student.`
        }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error explaining math concept:", error);
    return `${concept} is an important math skill that you'll use often. Let's keep practicing to get better at it!`;
  }
}

/**
 * Generates adaptive questions based on student parameters
 */
export async function generateAdaptiveQuestion(params: AdaptiveQuestionParams) {
  try {
    const { 
      grade, 
      concept, 
      studentLevel = 3, 
      difficulty = 3, 
      category = "General",
      previousQuestions = []
    } = params;
    
    // Create a context message that helps GPT understand what was previously asked
    const contextMessage = previousQuestions && previousQuestions.length > 0 
      ? `Recently asked questions that you SHOULD NOT DUPLICATE (avoid similar problems):
        ${previousQuestions.slice(0, 5).map(id => `Question ID ${id}`).join('\n')}`
      : 'Please generate a completely new question that hasn\'t been asked before.';
    
    // Determine question format based on grade level - with STRICT K grading enforcement
    const questionFormat = grade === 'K'
      ? 'KINDERGARTEN LEVEL ONLY: Keep language EXTREMELY simple with 1-2 sentences max. Use ONLY numbers 1-5. NO complex patterns, NO advanced vocabulary, NO word problems with abstract concepts. Focus on counting, shape recognition, and very basic comparisons (more/less). Questions should be solvable by 5-year-olds with minimal reading ability. Include simple visual descriptions (like "count the apples" or "which shape is a circle?"). NEVER use complex problems or abstract concepts for this grade level.'
      : grade === '1' 
      ? 'FIRST GRADE LEVEL ONLY: Keep language simple and use small numbers (1-10). Include visuals in the question description if helpful. Focus on basic addition/subtraction, simple patterns, and shape recognition. Questions should be solvable by 6-7 year olds.'
      : grade === '2' || grade === '3'
        ? 'Use appropriate vocabulary and numbers up to 100. Can include basic fractions and simple word problems.'
        : grade === '4' || grade === '5'
        ? 'Can include decimals, fractions, multi-step problems, and more complex word problems.'
        : 'Can include pre-algebra concepts, ratio and proportion, and complex word problems.';
    
    // Add variability to ensure diverse questions - adjust based on grade level
    let uniqueFactors = [];
    
    if (grade === 'K') {
      // For kindergarten, use extremely simple factors only
      uniqueFactors = [
        'Use simple counting of objects (1-5 only)',
        'Include a very basic shape recognition element',
        'Use simple comparisons (more/less/same)',
        'Show familiar objects like animals or toys',
        'Ask about colors or basic patterns',
        'Use simple size comparison (big/small)',
        'Focus on matching similar items',
        'Ask about simple sorting (by color or shape)'
      ];
    } else if (grade === '1') {
      // For 1st grade, use basic factors
      uniqueFactors = [
        'Use simple counting up to 10',
        'Include very basic addition or subtraction',
        'Use familiar objects for counting',
        'Include simple shape recognition',
        'Use basic patterns',
        'Focus on simple comparisons',
        'Include visual elements',
        'Use simple sorting activities'
      ];
    } else {
      // For higher grades, use more advanced factors
      uniqueFactors = [
        'Use a real-world scenario relevant to children',
        'Include a visual or spatial component',
        'Frame the question as a puzzle or challenge',
        'Incorporate a pattern recognition element',
        'Use measurement or data interpretation',
        'Include a comparison or estimation task',
        'Frame as a multi-step problem',
        'Incorporate logical reasoning'
      ];
    }
    
    // Select random factors to make this question unique
    const selectedFactors = uniqueFactors
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .join(' and ');
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert math educator specializing in creating unique, age-appropriate math questions for K-6 students.

          CRITICAL INSTRUCTIONS:
          1. Generate a COMPLETELY UNIQUE math question for ${grade} grade students with difficulty level ${difficulty}/5.
          2. ${concept ? `Focus specifically on the concept of ${concept}.` : `Focus on ${category} math.`}
          3. The student skill level is ${studentLevel}/5, adjust accordingly.
          4. ${questionFormat}
          5. ${selectedFactors} to make this question unique and engaging.
          6. NEVER repeat the same question patterns - create truly diverse content.
          7. STRICT INSTRUCTIONS ABOUT VISUAL REFERENCES:
             a. ONLY create questions that reference visuals for these specific types:
                - Counting problems: "How many [shapes] are there?" with a specific number (must use triangles, circles, squares, or stars)
                - Shape recognition: "Which shape is a [triangle/circle/square]?" (must use standard shapes, not real-world objects)
                - Fraction visualization: "What fraction is shaded?" (must use a specific fraction like 1/4, 2/3, etc.)
             b. For visual questions, ALWAYS ensure the question, answer, and all options are perfectly aligned
                - If asking about counting 3 triangles, the answer MUST be exactly "3"
                - If asking about shapes, all options MUST be actual shape names (circle, square, triangle, star)
                - If asking about fractions, answer MUST be in the format "1/4" (not "one-fourth" or "0.25")
             c. For counting questions, use ONLY numbers 1-5 for Kindergarten, 1-10 for Grade 1, and up to 20 for higher grades
             d. DO NOT reference real-world objects in visual questions (no chocolate bars, toy trains, pizzas, etc.)
             e. NEVER use terms like "below", "above", "pictured", or "illustrated" unless specifically creating one of the allowed visual types
          8. ${contextMessage}
          
          Format your response as a JSON object with these fields:
          - question: The actual question text (detailed, clear, and engaging)
          - answer: The correct answer (as simple text, e.g. "42" or "3.14")
          - options: An array of 4 possible answers including the correct one (realistic distractors)
          - explanation: A brief explanation of how to solve the problem
          - difficulty: A number 1-5
          - concepts: Array of specific math concepts covered (be granular)
          - grade: The grade level ("K", "1", "2", etc.)
          - category: A specific category like "Arithmetic", "Algebra", "Geometry", "Fractions", etc.
          - uniqueId: A random 6-digit number to serve as a unique identifier`
        },
        {
          role: "user",
          content: `Create a unique, engaging ${grade} grade math question ${concept ? `about ${concept}` : `in the category of ${category}`} that hasn't been asked before. Make sure it's appropriate for the student's level and provides a learning opportunity.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8, // Slightly higher temperature for more variability
    });

    const content = response.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(content as string);
    
    // Check if the question references an image and handle it if needed
    if (questionReferencesImage(parsedResponse.question)) {
      console.log("Question references an image - generating a visual");
      
      // Determine what kind of image to generate
      let imageType = "countObjects";
      let imageContent: any = ["circle", 5];

      // Check for complex shape descriptions like "Look at the shapes: two red squares, two blue circles"
      const complexShapeMatch = parsedResponse.question.match(/(\d+|one|two|three|four|five)\s+(red|blue|green|yellow)?\s*(squares?|circles?|triangles?)/gi);
      if (complexShapeMatch && complexShapeMatch.length > 0) {
        console.log("Complex shape description detected:", complexShapeMatch);
        imageType = "multipleShapes";
        
        // Parse the shapes from the description
        const shapes: Array<{type: string, color: string, count: number}> = [];
        
        complexShapeMatch.forEach((match: string) => {
          // Extract count, color, and shape type
          const parts = match.match(/(\d+|one|two|three|four|five)\s+(red|blue|green|yellow)?\s*(squares?|circles?|triangles?)/i);
          if (parts) {
            let count = parts[1].toLowerCase();
            // Convert text numbers to digits
            if (count === "one") count = "1";
            if (count === "two") count = "2";
            if (count === "three") count = "3";
            if (count === "four") count = "4";
            if (count === "five") count = "5";
            
            const color = parts[2] || "blue"; // Default color if none specified
            let type = parts[3].toLowerCase();
            
            // Normalize singular/plural
            if (type.endsWith('s')) type = type.slice(0, -1);
            
            shapes.push({
              type, 
              color, 
              count: parseInt(count)
            });
          }
        });
        
        imageContent = shapes;
        
        // If the question is asking about counting a specific shape, find the answer
        if (/how many (red|blue|green|yellow)?\s*(squares?|circles?|triangles?)/i.test(parsedResponse.question)) {
          const targetMatch = parsedResponse.question.match(/how many (red|blue|green|yellow)?\s*(squares?|circles?|triangles?)/i);
          if (targetMatch) {
            const targetColor = targetMatch[1] || null;
            let targetType = targetMatch[2].toLowerCase();
            if (targetType.endsWith('s')) targetType = targetType.slice(0, -1);
            
            // Find the matching shape and count
            let count = 0;
            for (const shape of shapes) {
              if ((!targetColor || shape.color === targetColor) && shape.type === targetType) {
                count += shape.count;
              }
            }
            
            // Update the answer and options
            parsedResponse.answer = count.toString();
            parsedResponse.options = [
              count.toString(),
              (count + 1).toString(),
              (count - 1 > 0 ? count - 1 : count + 2).toString(),
              (count + 2).toString()
            ];
          }
        }
      }
      // Check for counting questions
      else if (/how many/i.test(parsedResponse.question)) {
        // Extract correct answer from question or use a reasonable count
        let count = 0;
        // First try to get the correct answer from parsedResponse
        if (parsedResponse.answer && /^\d+$/.test(parsedResponse.answer)) {
          count = parseInt(parsedResponse.answer);
        } else {
          // Default to a reasonable count
          count = Math.floor(Math.random() * 3) + 2; // 2-4 objects (keeping it simple)
        }
        
        // Extract object type from question
        const objectMatches = parsedResponse.question.match(/how many (triangles?|circles?|squares?|stars?|shapes?|red|blue|green|yellow)/i);
        let objectType = "circles";
        
        if (objectMatches && objectMatches[1]) {
          objectType = objectMatches[1].toLowerCase();
          // Remove trailing 's' if present
          if (objectType.endsWith('s')) {
            objectType = objectType.slice(0, -1);
          }
        }
        
        // Set image content based on the correct answer
        imageContent = [objectType, count];
        console.log(`Setting image content for counting question: ${objectType}, count: ${count}`);
        
        // Always ensure the answer matches the count in the image
        parsedResponse.answer = count.toString();
        
        // Generate reasonable options
        const options = new Set<string>();
        options.add(count.toString()); // Add correct answer
        
        // Add some reasonable alternatives
        if (count > 1) options.add((count - 1).toString()); // One less
        options.add((count + 1).toString()); // One more
        if (count > 2) options.add((count - 2).toString()); // Two less
        options.add((count + 2).toString()); // Two more
        
        // If we still need more options
        if (options.size < 4) {
          if (count > 3) options.add((count - 3).toString());
          options.add((count + 3).toString());
        }
        
        // Convert to array and keep only 4 options
        parsedResponse.options = Array.from(options).slice(0, 4);
        
        // If we don't have enough options, add some more
        while (parsedResponse.options.length < 4) {
          parsedResponse.options.push((parseInt(parsedResponse.options[0]) + parsedResponse.options.length).toString());
        }
        
        console.log(`Updated options for counting question: ${parsedResponse.options.join(', ')}`);
      } 
      // Check for shape-related questions
      else if (/shape|triangle|circle|square/i.test(parsedResponse.question)) {
        imageType = "shapes";
        imageContent = "labeled";
        
        // Extract specific information about the shapes from the question
        const triangleCount = (parsedResponse.question.match(/triangles?/gi) || []).length;
        const circleCount = (parsedResponse.question.match(/circles?/gi) || []).length;
        const squareCount = (parsedResponse.question.match(/squares?/gi) || []).length;
        
        // Check for questions asking about specific counts of shapes
        if (/how many (small|large|big)? triangles/i.test(parsedResponse.question) ||
            /count the (small|large|big)? triangles/i.test(parsedResponse.question)) {
          // Extract the number from the answer if available
          let count = 3; // Default reasonable value for triangles
          
          if (parsedResponse.answer && /^\d+$/.test(parsedResponse.answer)) {
            count = parseInt(parsedResponse.answer);
          }
          
          // Generate an image with the exact number of triangles
          imageType = "countObjects";
          imageContent = ["triangle", count];
          console.log(`Setting image content for triangle question: count: ${count}`);
          
          // Make sure the answer matches the image content
          parsedResponse.answer = count.toString();
          
          // Generate reasonable options
          const options = new Set<string>();
          options.add(count.toString()); // Add correct answer
          
          // Add some reasonable alternatives
          if (count > 1) options.add((count - 1).toString()); // One less
          options.add((count + 1).toString()); // One more
          if (count > 2) options.add((count - 2).toString()); // Two less
          options.add((count + 2).toString()); // Two more
          
          // Convert to array and keep only 4 options
          parsedResponse.options = Array.from(options).slice(0, 4);
          
          // If we don't have enough options, add some more
          while (parsedResponse.options.length < 4) {
            parsedResponse.options.push((parseInt(parsedResponse.options[0]) + parsedResponse.options.length).toString());
          }
          
          console.log(`Updated options for triangle counting: ${parsedResponse.options.join(', ')}`);
        }
        else if (/how many (small|large|big)? circles/i.test(parsedResponse.question) ||
                /count the (small|large|big)? circles/i.test(parsedResponse.question)) {
          // Extract the number from the answer if available
          let count = 3; // Default reasonable value for circles
          
          if (parsedResponse.answer && /^\d+$/.test(parsedResponse.answer)) {
            count = parseInt(parsedResponse.answer);
          }
          
          imageType = "countObjects";
          imageContent = ["circle", count];
          console.log(`Setting image content for circle question: count: ${count}`);
          
          // Make sure the answer matches the image content
          parsedResponse.answer = count.toString();
          
          // Generate reasonable options
          const options = new Set<string>();
          options.add(count.toString()); // Add correct answer
          
          // Add some reasonable alternatives
          if (count > 1) options.add((count - 1).toString()); // One less
          options.add((count + 1).toString()); // One more
          if (count > 2) options.add((count - 2).toString()); // Two less
          options.add((count + 2).toString()); // Two more
          
          // Convert to array and keep only 4 options
          parsedResponse.options = Array.from(options).slice(0, 4);
          
          // If we don't have enough options, add some more
          while (parsedResponse.options.length < 4) {
            parsedResponse.options.push((parseInt(parsedResponse.options[0]) + parsedResponse.options.length).toString());
          }
          
          console.log(`Updated options for circle counting: ${parsedResponse.options.join(', ')}`);
        }
        else if (/how many (small|large|big)? squares/i.test(parsedResponse.question) ||
                /count the (small|large|big)? squares/i.test(parsedResponse.question)) {
          // Extract the number from the answer if available
          let count = 3; // Default reasonable value for squares
          
          if (parsedResponse.answer && /^\d+$/.test(parsedResponse.answer)) {
            count = parseInt(parsedResponse.answer);
          }
          
          imageType = "countObjects";
          imageContent = ["square", count];
          console.log(`Setting image content for square question: count: ${count}`);
          
          // Make sure the answer matches the image content
          parsedResponse.answer = count.toString();
          
          // Generate reasonable options
          const options = new Set<string>();
          options.add(count.toString()); // Add correct answer
          
          // Add some reasonable alternatives
          if (count > 1) options.add((count - 1).toString()); // One less
          options.add((count + 1).toString()); // One more
          if (count > 2) options.add((count - 2).toString()); // Two less
          options.add((count + 2).toString()); // Two more
          
          // Convert to array and keep only 4 options
          parsedResponse.options = Array.from(options).slice(0, 4);
          
          // If we don't have enough options, add some more
          while (parsedResponse.options.length < 4) {
            parsedResponse.options.push((parseInt(parsedResponse.options[0]) + parsedResponse.options.length).toString());
          }
          
          console.log(`Updated options for square counting: ${parsedResponse.options.join(', ')}`);
        }
      }
      // Check for money-related questions
      else if (/coins?|bills?|dollars?|cents?|money|penny|pennies|nickel|dime|quarter|\$\d+|\d+\s*cents/i.test(parsedResponse.question)) {
        console.log("Money question detected, creating appropriate visualization");
        imageType = "money";
        
        // Default to generic money content if we can't parse specifics
        let moneyContent: any = [
          { type: 'penny', count: 3 },
          { type: 'nickel', count: 1 }
        ];
        
        // Try to parse the specific coins/bills from the question
        const pennyMatch = parsedResponse.question.match(/(\d+)\s*(pennies|penny|cents?)/i);
        const nickelMatch = parsedResponse.question.match(/(\d+)\s*nickels?/i);
        const dimeMatch = parsedResponse.question.match(/(\d+)\s*dimes?/i);
        const quarterMatch = parsedResponse.question.match(/(\d+)\s*quarters?/i);
        const dollarMatch = parsedResponse.question.match(/(\d+)\s*dollars?|(\d+)\s*\$|\$\s*(\d+)/i);
        
        // If we have specific coin/bill counts, use those
        if (pennyMatch || nickelMatch || dimeMatch || quarterMatch || dollarMatch) {
          moneyContent = [];
          
          if (pennyMatch) moneyContent.push({ type: 'penny', count: parseInt(pennyMatch[1]) });
          if (nickelMatch) moneyContent.push({ type: 'nickel', count: parseInt(nickelMatch[1]) });
          if (dimeMatch) moneyContent.push({ type: 'dime', count: parseInt(dimeMatch[1]) });
          if (quarterMatch) moneyContent.push({ type: 'quarter', count: parseInt(quarterMatch[1]) });
          if (dollarMatch) {
            const amount = parseInt(dollarMatch[1] || dollarMatch[2] || dollarMatch[3]);
            moneyContent.push({ type: '$1', count: amount }); // Simplify by just showing $1 bills
          }
        } else {
          // Check for total money amounts
          const totalDollarsMatch = parsedResponse.question.match(/total of \$(\d+)/i);
          const totalCentsMatch = parsedResponse.question.match(/total of (\d+) cents/i);
          
          if (totalDollarsMatch) {
            const dollars = parseInt(totalDollarsMatch[1]);
            if (dollars <= 5) {
              moneyContent = [{ type: '$1', count: dollars }];
            } else {
              moneyContent = [
                { type: '$5', count: Math.floor(dollars / 5) },
                { type: '$1', count: dollars % 5 }
              ].filter(item => item.count > 0);
            }
          } else if (totalCentsMatch) {
            let totalCents = parseInt(totalCentsMatch[1]);
            moneyContent = [];
            
            if (totalCents >= 25) {
              moneyContent.push({ type: 'quarter', count: Math.floor(totalCents / 25) });
              totalCents %= 25;
            }
            if (totalCents >= 10) {
              moneyContent.push({ type: 'dime', count: Math.floor(totalCents / 10) });
              totalCents %= 10;
            }
            if (totalCents >= 5) {
              moneyContent.push({ type: 'nickel', count: Math.floor(totalCents / 5) });
              totalCents %= 5;
            }
            if (totalCents > 0) {
              moneyContent.push({ type: 'penny', count: totalCents });
            }
          }
        }
        
        // Make sure the answer is a number for counting questions
        if (/how many|count/i.test(parsedResponse.question)) {
          let totalCount = 0;
          moneyContent.forEach((item: any) => { totalCount += item.count; });
          parsedResponse.answer = totalCount.toString();
          
          // Generate options for counting money questions
          const options = new Set<string>();
          options.add(totalCount.toString()); // Add correct answer
          options.add((totalCount - 1).toString()); // One less
          options.add((totalCount + 1).toString()); // One more
          options.add((totalCount + 2).toString()); // Two more
          
          // Convert to array and keep only 4 options
          parsedResponse.options = Array.from(options).slice(0, 4);
          
          // If we still need more options, add some
          while (parsedResponse.options.length < 4) {
            const newOption = Math.max(1, totalCount - parsedResponse.options.length);
            parsedResponse.options.push(newOption.toString());
          }
        }
        
        imageContent = moneyContent;
        console.log(`Setting money image content:`, JSON.stringify(moneyContent));
      }
      // Check for fraction-related questions
      else if (/fraction|part/i.test(parsedResponse.question)) {
        imageType = "fractions";
        
        // Try to extract the fraction from the question or answer
        let numerator = 1;
        let denominator = 4;
        
        // First check if the answer contains a fraction
        if (parsedResponse.answer && /^(\d+)\/(\d+)$/.test(parsedResponse.answer)) {
          const fractionMatch = parsedResponse.answer.match(/^(\d+)\/(\d+)$/);
          if (fractionMatch) {
            numerator = parseInt(fractionMatch[1]);
            denominator = parseInt(fractionMatch[2]);
          }
        } 
        // Otherwise check if the question mentions a specific fraction
        else {
          const fractionMatch = parsedResponse.question.match(/(\d+)\/(\d+)/);
          if (fractionMatch) {
            numerator = parseInt(fractionMatch[1]);
            denominator = parseInt(fractionMatch[2]);
          }
        }
        
        // Ensure reasonable values
        if (numerator >= denominator) {
          numerator = Math.floor(denominator / 2);
        }
        
        // Set the image content based on the fraction
        imageContent = [numerator, denominator];
        console.log(`Setting fraction image content: ${numerator}/${denominator}`);
        
        // Make sure the answer matches our visualization
        const fractionAnswer = `${numerator}/${denominator}`;
        parsedResponse.answer = fractionAnswer;
        
        // Check if options include fractions and update them if needed
        let hasOptions = Array.isArray(parsedResponse.options) && parsedResponse.options.length > 0;
        let hasFractionOptions = hasOptions && parsedResponse.options.some((opt: string) => /^\d+\/\d+$/.test(opt));
        
        if (!hasFractionOptions) {
          // Generate reasonable fraction options
          const options = new Set<string>();
          options.add(fractionAnswer); // Add correct answer
          
          // Add some reasonable alternatives
          if (numerator > 1) options.add(`${numerator - 1}/${denominator}`);
          if (numerator < denominator - 1) options.add(`${numerator + 1}/${denominator}`);
          if (denominator > 2) options.add(`${numerator}/${denominator - 1}`);
          options.add(`${numerator}/${denominator + 1}`);
          
          // Convert to array and keep only 4 options
          parsedResponse.options = Array.from(options).slice(0, 4);
          
          // If we don't have enough options, add some more
          while (parsedResponse.options.length < 4) {
            // Add reasonable fractions
            const n = Math.max(1, Math.min(3, numerator + (parsedResponse.options.length % 3) - 1));
            const d = Math.max(2, Math.min(6, denominator + (parsedResponse.options.length % 3)));
            
            // Make sure we don't add the same fraction twice
            const newFraction = `${n}/${d}`;
            if (!parsedResponse.options.includes(newFraction) && n < d) {
              parsedResponse.options.push(newFraction);
            } else {
              // If we can't add a reasonable fraction, add a whole number
              parsedResponse.options.push(String(parsedResponse.options.length));
            }
          }
          
          console.log(`Updated options for fraction question: ${parsedResponse.options.join(', ')}`);
        }
      }
      
      // Generate the image
      const imageUrl = generateSVGImage(imageContent, imageType);
      
      // Add the image URL to the response
      parsedResponse.storyImage = imageUrl;
    }
    
    // Add a truly unique ID that won't collide with existing questions
    // Use timestamp + random number to ensure uniqueness
    const uniqueId = parsedResponse.uniqueId 
      ? parseInt(parsedResponse.uniqueId) 
      : Date.now() + Math.floor(Math.random() * 10000);
    
    return {
      ...parsedResponse,
      id: uniqueId
    };
  } catch (error) {
    console.error("Error generating adaptive question:", error);
    
    // Return a basic dynamic question as last resort - with grade-specific adjustments
    const grade = params.grade || "K";
    let num1, num2, questionText, options, explanation, category;
    let storyImage = null; // For visual references
    
    // Adjust the fallback question based on grade level
    if (grade === "K") {
      // For kindergarten, use small numbers (1-5) and simple questions
      num1 = Math.floor(Math.random() * 3) + 1; // 1-3
      num2 = Math.floor(Math.random() * 3) + 1; // 1-3
      
      // Randomly select between counting, simple addition, or shape recognition
      const questionType = Math.floor(Math.random() * 3);
      
      if (questionType === 0) {
        // Counting question with SVG image
        questionText = `How many stars are there?`;
        options = [`${num1}`, `${num1+1}`, `${num1-1 > 0 ? num1-1 : num1+2}`, `${num1+2}`];
        explanation = `Count the stars one by one: ${Array.from({length: num1}, (_, i) => i+1).join(', ')}.`;
        category = "Counting";
        // Generate a SVG image for the counting stars
        storyImage = generateSVGImage(["star", num1], "countObjects");
      } else if (questionType === 1) {
        // Simple addition with visual cues
        questionText = `How many apples in total? ${num1} apples and ${num2} more apples.`;
        options = [`${num1 + num2}`, `${num1 + num2 + 1}`, `${num1 + num2 - 1 > 0 ? num1 + num2 - 1 : num1 + num2 + 2}`, `${num1 + num2 + 2}`];
        explanation = `Count ${num1} apples, then count ${num2} more apples. ${num1} + ${num2} = ${num1 + num2}.`;
        category = "Addition";
      } else {
        // Shape recognition with SVG image
        const shapes = ["circle", "square", "triangle"];
        const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
        questionText = `Which shape is a ${correctShape}?`;
        options = shapes.sort(() => Math.random() - 0.5);
        explanation = `A ${correctShape} is a shape that looks like a ${correctShape}.`;
        category = "Geometry";
        // Generate SVG image for shape recognition
        storyImage = generateSVGImage(correctShape, "shapes");
      }
    } else {
      // For higher grades, use default addition questions with appropriate numbers
      const maxNum = grade === "1" ? 10 : grade === "2" ? 20 : grade === "3" ? 100 : 1000;
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      
      questionText = `What is ${num1} + ${num2}?`;
      options = [
        `${num1 + num2}`,
        `${num1 + num2 + 1}`,
        `${num1 + num2 - 1}`,
        `${num1 + num2 + 2}`
      ];
      explanation = `To add ${num1} and ${num2}, count forward ${num2} places from ${num1}.`;
      category = "Addition";
    }
    
    return {
      id: Date.now(),
      question: questionText,
      answer: options[0], // First option is always the correct one
      options: options,
      explanation: explanation,
      difficulty: params.difficulty || 1,
      concepts: [category],
      grade: grade,
      category: category,
      storyImage: storyImage
    };
  }
}

/**
 * Predicts student performance based on learning history
 */
export async function predictStudentPerformance(
  userId: number, 
  conceptMasteries: any[], 
  progressHistory: any[]
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI educational analyst that predicts student performance.
          Analyze the student's concept masteries and progress history to predict:
          1. Which concepts they are ready to advance in
          2. Which concepts need review
          3. A recommended learning path
          Format your response as a JSON object with these fields:
          - readyForAdvancement: Array of concept names
          - needsReview: Array of concept names
          - recommendedPath: Brief description of suggested learning activities
          - strengthAreas: Array of the student's strongest areas
          - challengeAreas: Array of areas where the student needs more support`
        },
        {
          role: "user",
          content: `Analyze student performance:\nConcept Masteries: ${JSON.stringify(conceptMasteries)}\nProgress History: ${JSON.stringify(progressHistory)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error predicting student performance:", error);
    return {
      readyForAdvancement: [],
      needsReview: [],
      recommendedPath: "Continue practicing fundamental skills across all areas.",
      strengthAreas: [],
      challengeAreas: []
    };
  }
}

/**
 * Generates a conceptual map showing relationships between math concepts
 */
export async function generateConceptMap(grade: string, centralConcept: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert math curriculum designer.
          Create a concept map for ${grade} grade students centered on ${centralConcept}.
          Show how ${centralConcept} relates to other math concepts at this grade level.
          Format your response as a JSON object with these fields:
          - centralConcept: The main concept
          - relatedConcepts: Array of objects with name and relationship properties
          - prerequisites: Array of concepts that should be understood first
          - applications: Array of real-world applications of this concept
          - nextSteps: Array of concepts to learn after mastering this one`
        },
        {
          role: "user",
          content: `Create a concept map for ${centralConcept} at ${grade} grade level.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating concept map:", error);
    return {
      centralConcept,
      relatedConcepts: [],
      prerequisites: [],
      applications: [],
      nextSteps: []
    };
  }
}

/**
 * Generates a timeline of how a math concept develops across grade levels
 */
export async function generateMathTimeline(concept: string, grade: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a math curriculum specialist.
          Create a developmental timeline for how the concept of ${concept} evolves from kindergarten through 6th grade.
          Format your response as a JSON object with these fields:
          - concept: The math concept name
          - timeline: Array of objects with grade and description properties showing how the concept develops
          - currentGradeDetails: Detailed information about what students at ${grade} grade should know
          - connections: How this concept connects to other areas of mathematics`
        },
        {
          role: "user",
          content: `Create a developmental timeline for the math concept "${concept}" with details for ${grade} grade.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating math timeline:", error);
    return {
      concept,
      timeline: [],
      currentGradeDetails: `In ${grade} grade, students work with ${concept} in age-appropriate ways.`,
      connections: []
    };
  }
}

/**
 * Generates achievement badges and milestones for math concepts
 */
export async function generateAchievements(grade: string, concepts: string[]) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a gamification expert for educational applications.
          Create achievement badges and milestones for ${grade} grade students learning these math concepts: ${concepts.join(', ')}.
          Make the achievements fun, motivating, and appropriate for elementary students.
          Format your response as a JSON object with these fields:
          - achievements: Array of achievement objects with name, description, and criteria properties
          - milestones: Array of milestone objects with level, name, and description properties
          - conceptBadges: Object mapping each concept to a badge name and description`
        },
        {
          role: "user",
          content: `Generate achievements and badges for ${grade} grade students learning: ${concepts.join(', ')}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating achievements:", error);
    return {
      achievements: [],
      milestones: [],
      conceptBadges: {}
    };
  }
}