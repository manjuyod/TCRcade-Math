import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("⚠️ WARNING: OPENAI_API_KEY is not set in environment variables");
} else {
  console.log("✓ OpenAI API key found in environment");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Checks if a question text references an image or visual
 * @param questionText The text of the question to check for image references
 */
function questionReferencesImage(questionText: string): boolean {
  console.log("Checking if question references an image - disabled per user request");
  
  // All image generation is disabled - always return false
  return false;
  
  // NOTE: Original pattern matching code has been commented out per user request
  // to prevent all image generation and visual-based questions
  /*
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
    /\$\d+/i, /\d+\s*cents/i, /\$(\d+)\.(\d+)/i, /cash/i, /currency/i
  ];
  
  // Money-specific question patterns
  const moneyQuestionPatterns = [
    /how much money/i,
    /how many (cents|pennies|nickels|dimes|quarters)/i,
    /what is the (total|value|amount)/i,
    /count the (money|coins|bills)/i,
    /how much (does .+ cost|is .+ worth)/i,
    /what coins make/i,
    /which coins would you use/i,
    /can you make \$[\d\.]+/i,
    /show the coins that equal/i,
    /if you have .+ coins/i,
    /value of the (coins|bills|money)/i,
    /calculate the (total|value|amount)/i,
    /what is the change/i,
    /how much more money/i,
    /which coins add up to/i,
    /find the (total|value|amount)/i
  */
  
  /* Money-related pattern matching has been disabled
  if (moneyTerms.some(term => term.test(questionText)) && 
      (moneyQuestionPatterns.some(pattern => pattern.test(questionText)) || 
       /how many|count|total|value|worth|cost|amount|add up|sum/i.test(questionText) || 
       /\d+.*and.*\d+/.test(questionText))) {
    console.log("Money-related question detected for 'Money Matters' category");
    return true;
  }*/
  
  /* All pattern matching code is disabled per user request
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
  */
  
  /* Word problem pattern matching has been disabled
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
  */
  
  return false;
}

/**
 * Previously generated SVG images for math questions
 * Now returns empty SVG per user request to remove all visual elements
 * @param content Not used - visualization content has been disabled
 * @param type Not used - visualization type has been disabled
 */
function generateSVGImage(content: any, type: string): string {
  // Per user request, return an empty string with no visual elements at all
  console.log("SVG image generation completely disabled per user request");
  return "";
  
  /* Original SVG generation code has been disabled and will never execute
  const svgWidth = 300;
  const svgHeight = 200;
  let svgContent = '';
  
  // Start with SVG header
  const svgHeader = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>`;
  
  // End with SVG footer
  const svgFooter = `</svg>`;
  */
  
  // Generate appropriate content based on type
  if (type === "money") {
    // Special case for money visuals (US currency)
    // Content is expected to be an array of objects with type and count properties
    
    // Parse and standardize the money items based on different possible input formats
    let moneyItems: Array<{type: string, count: number}>;
    
    // Detect if the question is about coins generally without specifying types
    const isGenericCoinQuestion = 
      (typeof content === 'string' && 
       (content.includes('coin') || content.includes('money') || content.includes('cents'))) ||
      (typeof content === 'number' || 
       (Array.isArray(content) && content.length === 1 && typeof content[0] === 'number'));
    
    if (isGenericCoinQuestion) {
      // Create a standard representation of US coins for generic coin questions
      const coinCount = typeof content === 'number' ? content : 
                       (Array.isArray(content) && typeof content[0] === 'number' ? content[0] : 
                       (typeof content === 'string' ? 3 : 3));
      
      if (coinCount <= 0 || coinCount > 10) {
        // Sanity check - keep a reasonable number of coins
        moneyItems = [{ type: 'penny', count: 3 }];
      } else if (coinCount <= 5) {
        // For small counts, just use pennies
        moneyItems = [{ type: 'penny', count: coinCount }];
      } else {
        // For larger counts, mix coins
        moneyItems = [
          { type: 'penny', count: Math.ceil(coinCount / 2) },
          { type: 'nickel', count: Math.floor(coinCount / 4) },
          { type: 'dime', count: Math.floor(coinCount / 4) }
        ];
      }
    } else if (Array.isArray(content) && content.length === 2 && typeof content[1] === 'number') {
      // Simple [type, count] format - e.g. ["penny", 3]
      const [type, count] = content;
      const coinType = String(type).toLowerCase();
      
      // Ensure we're using a valid coin type
      if (['penny', 'pennies', 'nickel', 'nickels', 'dime', 'dimes', 'quarter', 'quarters'].includes(coinType)) {
        // Normalize plurals to singular
        let normalizedType = coinType;
        if (coinType === 'pennies') normalizedType = 'penny';
        if (coinType === 'nickels') normalizedType = 'nickel';
        if (coinType === 'dimes') normalizedType = 'dime';
        if (coinType === 'quarters') normalizedType = 'quarter';
        
        moneyItems = [{ type: normalizedType, count }];
      } else {
        // If not a valid coin, default to pennies
        moneyItems = [{ type: 'penny', count: count || 3 }];
      }
    } else if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
      // Object with multiple denominations - e.g. {penny: 2, nickel: 1}
      moneyItems = [];
      for (const [type, count] of Object.entries(content)) {
        const coinType = String(type).toLowerCase();
        
        // Normalize plurals and check valid types
        let normalizedType = coinType;
        if (['penny', 'pennies', 'nickel', 'nickels', 'dime', 'dimes', 'quarter', 'quarters', 
             '$1', '$5', '$10', '$20'].includes(coinType)) {
          if (coinType === 'pennies') normalizedType = 'penny';
          if (coinType === 'nickels') normalizedType = 'nickel';
          if (coinType === 'dimes') normalizedType = 'dime';
          if (coinType === 'quarters') normalizedType = 'quarter';
          
          moneyItems.push({ type: normalizedType, count: Number(count) });
        }
      }
      
      // If no valid coins were found, default to a mix
      if (moneyItems.length === 0) {
        moneyItems = [
          { type: 'penny', count: 2 },
          { type: 'nickel', count: 1 },
          { type: 'dime', count: 1 }
        ];
      }
    } else if (Array.isArray(content) && content.length > 0 && 
               content.every(item => typeof item === 'object' && item !== null && 'type' in item && 'count' in item)) {
      // Already in the correct format - e.g. [{type: "penny", count: 2}, {type: "nickel", count: 1}]
      moneyItems = [];
      for (const item of content) {
        if (typeof item === 'object' && item !== null && 'type' in item && 'count' in item) {
          const coinType = String(item.type).toLowerCase();
          
          // Normalize plurals and check valid types
          let normalizedType = coinType;
          if (['penny', 'pennies', 'nickel', 'nickels', 'dime', 'dimes', 'quarter', 'quarters', 
               '$1', '$5', '$10', '$20'].includes(coinType)) {
            if (coinType === 'pennies') normalizedType = 'penny';
            if (coinType === 'nickels') normalizedType = 'nickel';
            if (coinType === 'dimes') normalizedType = 'dime';
            if (coinType === 'quarters') normalizedType = 'quarter';
            
            moneyItems.push({
              type: normalizedType,
              count: Number(item.count)
            });
          }
        }
      }
      
      // If no valid coins were found, default to a mix
      if (moneyItems.length === 0) {
        moneyItems = [
          { type: 'penny', count: 2 },
          { type: 'nickel', count: 1 },
          { type: 'dime', count: 1 }
        ];
      }
    } else {
      // Default fallback - show a mix of coins
      moneyItems = [
        { type: 'penny', count: 2 },
        { type: 'nickel', count: 1 },
        { type: 'dime', count: 1 }
      ];
    }
    
    // Define properties of each currency type with more realistic designs
    const currencyProps = {
      'penny': { 
        color: '#B87333', 
        innerColor: '#B5714C', 
        edgeColor: '#A05C2C', 
        value: '1¢', 
        radius: 15, 
        label: 'Penny',
        detail: '🛡️' // Lincoln memorial or shield
      },
      'nickel': { 
        color: '#A8A9AD', 
        innerColor: '#B5B5B5', 
        edgeColor: '#A0A0A0', 
        value: '5¢', 
        radius: 17, 
        label: 'Nickel',
        detail: '👤' // Jefferson profile
      },
      'dime': { 
        color: '#A8A9AD', 
        innerColor: '#D5D5D5', 
        edgeColor: '#A0A0A0', 
        value: '10¢', 
        radius: 14, 
        label: 'Dime',
        detail: '🔥' // Roosevelt profile
      },
      'quarter': { 
        color: '#A8A9AD', 
        innerColor: '#C0C0C0', 
        edgeColor: '#909090', 
        value: '25¢', 
        radius: 19, 
        label: 'Quarter',
        detail: '🦅' // Eagle/state design 
      },
      '$1': { 
        color: '#E8E8E0', 
        borderColor: '#2D6440', 
        textColor: '#2D6440',
        value: '$1', 
        width: 60, 
        height: 25, 
        label: 'One Dollar',
        seal: '🦅'
      },
      '$5': { 
        color: '#E8E8E0', 
        borderColor: '#6B3E8F', 
        textColor: '#6B3E8F',
        value: '$5', 
        width: 62, 
        height: 26, 
        label: 'Five Dollars',
        seal: '🦅'
      },
      '$10': { 
        color: '#E8E8E0', 
        borderColor: '#945A35', 
        textColor: '#945A35',
        value: '$10', 
        width: 64, 
        height: 27, 
        label: 'Ten Dollars',
        seal: '🦅'
      },
      '$20': { 
        color: '#E8E8E0', 
        borderColor: '#1A472A', 
        textColor: '#1A472A',
        value: '$20', 
        width: 66, 
        height: 28, 
        label: 'Twenty Dollars',
        seal: '🦅'
      }
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
          // Draw a coin with more realistic details
          // Use a type guard to ensure the correct property access
          if ('radius' in props && 'innerColor' in props && 'edgeColor' in props) {
            // Draw outer edge of coin
            svgContent += `
              <circle cx="${x}" cy="${y}" r="${props.radius}" fill="${props.edgeColor}" />
              
              <!-- Draw inner part of coin -->
              <circle cx="${x}" cy="${y}" r="${props.radius - 1.5}" fill="${props.innerColor}" />
              
              <!-- Draw inner circle for design -->
              <circle cx="${x}" cy="${y}" r="${props.radius - 3.5}" fill="${props.color}" />
              
              <!-- Add ridged edge effect -->
              <circle cx="${x}" cy="${y}" r="${props.radius}" fill="none" stroke="${props.edgeColor}" stroke-width="1" stroke-dasharray="1,1" />
              
              <!-- Coin value -->
              <text x="${x}" y="${y-2}" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
              
              <!-- Coin detail/symbol -->
              <text x="${x}" y="${y+6}" font-family="Arial" font-size="7" text-anchor="middle" dominant-baseline="middle">${props.detail || ""}</text>
            `;
          } else {
            // Fallback if for some reason we get the wrong type of props
            svgContent += `
              <circle cx="${x}" cy="${y}" r="15" fill="${props.color}" stroke="#333" stroke-width="1" />
              <text x="${x}" y="${y+1}" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">${props.value}</text>
            `;
          }
        } else {
          // Draw a bill with more realistic details
          // Use a type guard to ensure the correct property access
          if ('width' in props && 'height' in props && 'borderColor' in props && 'textColor' in props) {
            const width = props.width;
            const height = props.height;
            
            // Draw the bill background
            svgContent += `
              <!-- Main bill background -->
              <rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" fill="${props.color}" stroke="${props.borderColor}" stroke-width="1.5" rx="3" />
              
              <!-- Decorative border -->
              <rect x="${x - width/2 + 2}" y="${y - height/2 + 2}" width="${width - 4}" height="${height - 4}" fill="none" stroke="${props.borderColor}" stroke-width="0.5" stroke-dasharray="2,1" rx="2" />
              
              <!-- Currency value -->
              <text x="${x}" y="${y}" font-family="Georgia, serif" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="${props.textColor}">${props.value}</text>
              
              <!-- Small seal symbol -->
              <text x="${x + width/4}" y="${y}" font-family="Arial" font-size="8" text-anchor="middle" dominant-baseline="middle">${props.seal || ""}</text>
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
        
        // Add icon to legend with more realistic appearances
        if (['penny', 'nickel', 'dime', 'quarter'].includes(item.type)) {
          // Draw a realistic miniature coin for the legend
          svgContent += `
            <!-- Outer edge of coin -->
            <circle cx="${legendX + 10}" cy="${legendY}" r="8" fill="${props.edgeColor}" />
            
            <!-- Inner part of coin -->
            <circle cx="${legendX + 10}" cy="${legendY}" r="7" fill="${props.innerColor}" />
            
            <!-- Inner circle -->
            <circle cx="${legendX + 10}" cy="${legendY}" r="5" fill="${props.color}" />
            
            <!-- Ridged edge effect -->
            <circle cx="${legendX + 10}" cy="${legendY}" r="8" fill="none" stroke="${props.edgeColor}" stroke-width="0.5" stroke-dasharray="0.7,0.7" />
          `;
        } else {
          // Draw a realistic miniature bill for the legend
          svgContent += `
            <!-- Main bill background -->
            <rect x="${legendX}" y="${legendY-6}" width="20" height="12" fill="${props.color}" stroke="${props.borderColor}" stroke-width="0.8" rx="1" />
            
            <!-- Inner decoration -->
            <rect x="${legendX + 1.5}" y="${legendY-4.5}" width="17" height="9" fill="none" stroke="${props.borderColor}" stroke-width="0.3" stroke-dasharray="1,0.5" rx="0.5" />
          `;
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
  previousQuestions?: Array<number | { 
    id?: number;
    question?: string;
    mathOperations?: string[];
    questionSignature?: string;
    [key: string]: any;
  }>;
  difficulty?: number;
  category?: string;
  forceDynamic?: boolean;  // Indicates if this is the first question in a series
  isMathFactsModule?: boolean; // Indicates this is a pure computation Math Facts module
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
  const { 
    grade, 
    concept, 
    studentLevel = 3, 
    difficulty = 3, 
    category = "General",
    previousQuestions = [],
    forceDynamic = false,
    isMathFactsModule = false
  } = params;
  
  // We are no longer using image generation per user request
  // The following code is kept for reference but will not be executed
  
  try {
    // Extract full question data if available to avoid duplication
    let previousQuestionData: string[] = [];
    let previousMathFacts: string[] = [];
    
    if (Array.isArray(previousQuestions)) {
      if (previousQuestions.length > 0) {
        // Check if we have full question objects or just IDs
        const hasFullQuestionData = previousQuestions.some(q => 
          typeof q === 'object' && q !== null && q.hasOwnProperty('question'));
          
        if (hasFullQuestionData) {
          // Extract the text and math facts to avoid repetition
          previousQuestionData = previousQuestions
            .filter(q => typeof q === 'object' && q !== null && q.hasOwnProperty('question'))
            .map(q => (q as any).question as string)
            .slice(-15); // Keep last 15 questions for context
            
          // Extract mathematical operations from previous questions
          // This helps us avoid repeating the same math facts (like 3+2)
          for (const prevQ of previousQuestions) {
            if (typeof prevQ === 'object' && prevQ !== null && prevQ.hasOwnProperty('question')) {
              const questionText = (prevQ as any).question as string;
              
              // Extract operations using regex - enhanced to capture more variations
              const additionMatches = [...questionText.matchAll(/(\d+)\s*\+\s*(\d+)/g)];
              const subtractionMatches = [...questionText.matchAll(/(\d+)\s*\-\s*(\d+)/g)];
              const multiplicationMatches = [
                ...questionText.matchAll(/(\d+)\s*[×x\*]\s*(\d+)/g),
                ...questionText.matchAll(/(\d+)\s*times\s*(\d+)/gi),
                ...questionText.matchAll(/multiply\s*(\d+)\s*by\s*(\d+)/gi),
                ...questionText.matchAll(/(\d+)\s*(?:multiplied by|product of)\s*(\d+)/gi),
                ...questionText.matchAll(/multiplication\s*of\s*(\d+)\s*and\s*(\d+)/gi),
                ...questionText.matchAll(/product\s*of\s*(\d+)\s*and\s*(\d+)/gi)
              ];
              const divisionMatches = [
                ...questionText.matchAll(/(\d+)\s*[÷\/]\s*(\d+)/g),
                ...questionText.matchAll(/divide\s*(\d+)\s*by\s*(\d+)/gi),
                ...questionText.matchAll(/(\d+)\s*divided\s*by\s*(\d+)/gi),
                ...questionText.matchAll(/(\d+)\s*(?:split into|shared among)\s*(\d+)/gi),
                ...questionText.matchAll(/quotient\s*of\s*(\d+)\s*and\s*(\d+)/gi)
              ];
              
              // Also check for word problems with numbers mentioned close to operations keywords
              const wordProblemMatches = [
                // Addition patterns
                ...questionText.matchAll(/(\d+).*(\d+).*(?:add|sum|total|altogether|combined|in all)/gi),
                ...questionText.matchAll(/(?:add|sum|total|altogether|combined|in all).*(\d+).*(\d+)/gi),
                // Subtraction patterns
                ...questionText.matchAll(/(\d+).*(\d+).*(?:subtract|minus|difference|remain|left)/gi),
                ...questionText.matchAll(/(?:subtract|minus|difference|remain|left).*(\d+).*(\d+)/gi),
                // Multiplication patterns
                ...questionText.matchAll(/(\d+).*(\d+).*(?:multiply|product|times)/gi),
                ...questionText.matchAll(/(?:multiply|product|times).*(\d+).*(\d+)/gi),
                ...questionText.matchAll(/(\d+)\s+(?:groups|sets)(?:\s+with|\s+of|\s+containing)\s+(\d+)/gi),
                // Division patterns
                ...questionText.matchAll(/(\d+).*(\d+).*(?:divide|quotient|split|share)/gi),
                ...questionText.matchAll(/(?:divide|quotient|split|share).*(\d+).*(\d+)/gi),
                ...questionText.matchAll(/(\d+)\s+(?:divided into|split into|shared among)\s+(\d+)/gi)
              ];
              
              // Extract ALL individual numbers from the question
              const allNumbers = [...questionText.matchAll(/\b(\d+)\b/g)];
              
              // Extract number pairs that are close to each other (might be an operation)
              const allNumberPairs = [...questionText.matchAll(/(\d+)[\s\w]{1,25}(\d+)/g)];
              
              // Convert matches to standardized math facts
              additionMatches.forEach(m => {
                previousMathFacts.push(`${m[1]}+${m[2]}`);
                // Also add the commutative pair
                previousMathFacts.push(`${m[2]}+${m[1]}`);
              });
              
              subtractionMatches.forEach(m => {
                previousMathFacts.push(`${m[1]}-${m[2]}`);
              });
              
              multiplicationMatches.forEach(m => {
                previousMathFacts.push(`${m[1]}×${m[2]}`);
                // Also add the commutative pair
                previousMathFacts.push(`${m[2]}×${m[1]}`);
              });
              
              divisionMatches.forEach(m => {
                previousMathFacts.push(`${m[1]}÷${m[2]}`);
              });
              
              // Add word problem matches as generic number combinations
              wordProblemMatches.forEach(m => {
                // Identify operation based on keywords
                if (m[0].includes('add') || m[0].includes('sum') || m[0].includes('total') || 
                    m[0].includes('altogether') || m[0].includes('combined') || m[0].includes('in all')) {
                  previousMathFacts.push(`${m[1]}+${m[2]}`);
                  previousMathFacts.push(`${m[2]}+${m[1]}`);
                } 
                else if (m[0].includes('subtract') || m[0].includes('minus') || m[0].includes('difference') || 
                         m[0].includes('remain') || m[0].includes('left')) {
                  previousMathFacts.push(`${m[1]}-${m[2]}`);
                } 
                else if (m[0].includes('multiply') || m[0].includes('product') || m[0].includes('times') ||
                         m[0].includes('groups') || m[0].includes('sets')) {
                  previousMathFacts.push(`${m[1]}×${m[2]}`);
                  previousMathFacts.push(`${m[2]}×${m[1]}`);
                } 
                else if (m[0].includes('divide') || m[0].includes('quotient') || m[0].includes('split') || 
                         m[0].includes('share') || m[0].includes('shared')) {
                  previousMathFacts.push(`${m[1]}÷${m[2]}`);
                }
                
                // Always add the generic number pair to avoid reusing the same numbers
                previousMathFacts.push(`pair:${m[1]},${m[2]}`);
                previousMathFacts.push(`pair:${m[2]},${m[1]}`);
              });
              
              // Track all individual numbers to avoid repetition
              allNumbers.forEach(m => {
                if (m[1]) {
                  previousMathFacts.push(`number:${m[1]}`);
                }
              });
              
              // Also capture generic number pairs to avoid using the same numbers
              allNumberPairs.forEach(m => {
                if (m[1] && m[2]) {
                  // Create ordered pair so that (2,3) and (3,2) are both blocked
                  const num1 = parseInt(m[1]);
                  const num2 = parseInt(m[2]);
                  previousMathFacts.push(`pair:${num1},${num2}`);
                  previousMathFacts.push(`pair:${num2},${num1}`);
                  
                  // Also track operations with these numbers to avoid the same numbers in different operations
                  // e.g. if 2+3 was used, avoid 2×3 in future questions
                  previousMathFacts.push(`combo:${num1},${num2}`);
                  
                  // Block specific sums/products/etc. to avoid problems with the same results
                  previousMathFacts.push(`sum:${num1 + num2}`);
                  if (num1 * num2 <= 100) { // Only track reasonable products
                    previousMathFacts.push(`product:${num1 * num2}`); 
                  }
                  if (num1 - num2 >= 0) {
                    previousMathFacts.push(`difference:${num1 - num2}`);
                  }
                  if (num2 > 0 && num1 % num2 === 0) {
                    previousMathFacts.push(`quotient:${num1 / num2}`);
                  }
                }
              });
            }
          }
        }
      }
    }
    
    // Create detailed context to prevent repetition
    const contextMessage = previousQuestionData.length > 0
      ? `Recently asked questions that you SHOULD NOT DUPLICATE (avoid similar problems):
         ${previousQuestionData.slice(-7).map((q, i) => `Question ${i+1}: "${q}"`).join('\n')}
         
         CRITICAL: DO NOT repeat these exact math operations:
         ${previousMathFacts.slice(-15).join(', ')}
         
         NUMERICAL AVOIDANCE RULES:
         1. DO NOT use any of these exact number pairs or single numbers in new operations
         2. DO NOT create problems with the same answer as any of these operations
         3. AVOID similar patterns - create truly diverse problems with different structure
         4. DO NOT just swap operands (avoid A+B if B+A was used)
         5. When using division or multiplication, use completely different number sets
         
         Create something COMPLETELY different using unique numbers, operations and contexts.`
      : 'Please generate a completely new question that hasn\'t been asked before with diverse number operations.';
    
    // Determine question format based on grade level - with STRICT K grading enforcement
    const questionFormat = grade === 'K'
      ? 'KINDERGARTEN LEVEL ONLY: Keep language EXTREMELY simple with 1-2 sentences max. Use ONLY numbers 1-10. NO complex patterns, NO advanced vocabulary, NO word problems with abstract concepts. Focus on basic addition/subtraction and very basic comparisons (more/less). Questions should be solvable by 5-year-olds with minimal reading ability. NEVER use complex problems or abstract concepts for this grade level.'
      : grade === '1' 
      ? 'FIRST GRADE LEVEL ONLY: Keep language simple and use small numbers (1-20). Focus on basic addition/subtraction and simple number patterns. Questions should be solvable by 6-7 year olds. Use simple word problems with familiar contexts.'
      : grade === '2' || grade === '3'
        ? 'Use appropriate vocabulary and numbers up to 100. Can include basic multiplication/division, simple fractions, and word problems with real-world contexts.'
        : grade === '4' || grade === '5'
        ? 'Can include decimals, fractions, multi-step problems, and more complex word problems. Also include basic order of operations and pre-algebraic thinking.'
        : 'Can include pre-algebra concepts, ratio and proportion, complex word problems, and multi-step equations.';
    
    // Extract the recent numeric combinations to avoid repetition
    const recentNumbers = previousMathFacts
      .filter(fact => !fact.startsWith('pair:'))
      .slice(-10);
      
    // Create a list of generic number pairs from previous questions
    const recentNumberPairs = previousMathFacts
      .filter(fact => fact.startsWith('pair:'))
      .map(fact => fact.replace('pair:', ''))
      .slice(-15);
    
    // Add seeds for unique question types to ensure diversity
    // Specifically designed for computational problems without visual elements
    const uniqueFactors = [
      // STRONGLY emphasize numerical variety to avoid repetition
      `NEVER use these exact number combinations: ${recentNumbers.join(', ')}`,
      `AVOID using number pairs similar to: ${recentNumberPairs.join(', ')}`,
      'CRITICAL: Use numerical values that have NOT appeared in recent questions',
      'Use a completely different mathematical operation than previous questions',
      'Frame the question in a different real-world context with unique numbers',
      'Use a step-by-step word problem requiring careful reading with new numerical values',
      'Present a pattern or sequence with numerical combinations not seen recently',
      'Use different number combinations even if presenting a similar problem structure',
      'Create a multi-step calculation problem with unique number combinations',
      'Incorporate new numerical values - avoid repeating any numbers from recent questions',
      'Present a comparison between two unique numeric quantities not used recently',
      'Use number combinations that create different answers than recent problems',
      'Include at least one number not used in any recent question',
      'Create a problem about equivalence using numbers not seen in recent questions',
      'Use multiples or divisors not featured in recent problems',
      'For word problems, change both the object type AND the quantities',
      'For practice with operations, use unique operands in different positions',
      'Create a problem with an answer that differs from recent questions by at least 5',
      'Use a different approach to testing the same concept (e.g., verbal vs. direct calculation)',
      'Incorporate numerical values from a range not recently used'
    ];
    
    // ALWAYS include the first critical factors about numeric variety
    // plus a larger selection of additional factors to ensure maximum question diversity
    const criticalNumericFactors = uniqueFactors.slice(0, 4); // Include first 4 critical factors always
    const additionalFactors = uniqueFactors
      .slice(4)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6); // Include 6 additional random factors for more diversity
    
    const selectedFactors = [...criticalNumericFactors, ...additionalFactors].join(', ');
    
    // Get a timestamp to ensure uniqueness
    const timestamp = Date.now();
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    console.log(`🔍 Attempting OpenAI API call to generate math question for grade ${grade}, category ${category || 'general'}`);
    try {
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
          5. Create diversity by: ${selectedFactors}.
          6. NEVER repeat the same question patterns, numbers, or contexts - create truly unique content.
          ${isMathFactsModule ? `
          !!!! MATH FACTS MODULE INSTRUCTIONS - VIOLATION MEANS AUTOMATIC REJECTION !!!!
          
          1. THE QUESTION TEXT MUST BE *EXACTLY* IN THIS FORMAT: "X [operation] Y = ?" 
             - VALID EXAMPLES: "7 + 5 = ?" or "6 × 9 = ?" or "12 - 8 = ?" or "15 ÷ 3 = ?"
             - INVALID EXAMPLES: "What is 7 + 5?" or "Sally has 7 apples..."
          
          2. NO WORDS ALLOWED IN QUESTION TEXT - ONLY NUMBERS, OPERATION SYMBOLS, AND EQUALS SIGN
          
          3. NO SENTENCES, NO DESCRIPTIONS, NO CONTEXT - ONLY MATH EXPRESSION
          
          4. NO WORD PROBLEMS UNDER ANY CIRCUMSTANCES
          
          5. For kindergarten: Simple addition/subtraction with numbers 1-10
          
          6. For grades 1-2: Addition/subtraction with numbers 1-20
          
          7. For grades 3-4: Multiplication/division with single-digit numbers
          
          8. For grades 5-6: Multi-digit operations and simple fractions

          9. FINAL CHECK: Verify question contains ONLY numbers and operation symbols` : ''}
          
          NUMERICAL VARIETY REQUIREMENTS:
          1. CRITICAL: Each question MUST use COMPLETELY DIFFERENT number combinations than ALL recent questions
          2. Do NOT reuse ANY number pairs that have appeared in recent questions (e.g., if 2×3 was used, don't use it again)
          3. CRITICAL: Avoid repeating the same numeric values even in different operations (if 5+8 was used, don't use 5×8, 8-5, or 8÷5)
          4. Use truly unique number combinations - not just different wording around the same calculations
          5. For word problems, vary BOTH the context (objects, scenario) AND the numerical values 
          6. If operations are conceptually related (addition vs. subtraction), use COMPLETELY different number sets
          7. NEVER reuse the same numbers in different positions (e.g., if 3×2 was used, don't use 2×3)
          8. ESSENTIAL: For questions with the same operation type, use COMPLETELY DIFFERENT VALUES (never ask 4×5 if 3×7 was asked recently)
          9. CRITICAL: Use unique operands to create distinct arithmetic facts (if any operation used 2 and 9, use neither 2 nor 9 in new problems)
          10. IMPORTANT: Generate problems with DIFFERENT answers (if a previous answer was 12, avoid problems with answers near 12)
          11. For multiple-choice options, ensure the correct answer AND distractors don't repeat across questions
          12. If a problem involves a particular object quantity (e.g., 4 apples), don't use that same quantity for a different object
          13. In sequence problems, use different step patterns than in previous questions
          14. For multi-step problems, ensure each step uses unique numerical values
          
          QUESTION TYPE RESTRICTIONS:
          1. ONLY create text-based computational problems (e.g. calculations, word problems)
          2. DO NOT create questions that reference visuals, shapes, images, or currency
          3. DO NOT create counting problems that would require visual elements
          4. DO NOT create questions about identifying shapes
          5. DO NOT create fraction problems that ask "what fraction is shaded?"
          6. NEVER use terms like "below", "above", "pictured", "illustrated", "shown", "image", or "diagram"
          7. Do not reference colors or position of objects
          8. Only use fractions expressed as numbers (1/2, 3/4, etc.)
          9. DO NOT include money questions (no coins, dollars, cents, bills, currency)
          10. DO NOT use underscores to emphasize or highlight digits or numbers (e.g., DO NOT use "_3_" to indicate the digit 3)
          11. For place value questions, write clearly (e.g., "Which digit is in the tens place of 345?" instead of "What is the value of _3_ in 345?")
          
          CRITICAL: DO NOT give away the answer in the question itself:
          1. DO NOT use phrasing like "If 5+7=12, what is 5+7?" or similar constructions
          2. DO NOT include the answer in the question stem accidentally
          3. Make sure the student must perform the computation themselves
          4. For word problems, do not state the operation result in the setup
          5. Check that the question actually requires calculation and isn't self-evident
          
          CONTEXT FROM PREVIOUS QUESTIONS:
          ${contextMessage}
          
          Format your response as a JSON object with these fields:
          - question: The actual question text (detailed, clear, and engaging)
          - answer: The correct answer (as simple text, e.g. "42" or "3.14")
          - options: An array of 4 possible answers including the correct one (realistic distractors)
          - explanation: A brief explanation of how to solve the problem
          - difficulty: A number 1-5
          - concepts: Array of specific math concepts covered (be granular)
          - grade: The grade level ("K", "1", "2", etc.)
          - category: A specific category like "Arithmetic", "Algebra", "Fractions", etc.
          - uniqueId: A random 6-digit number to serve as a unique identifier`
        },
        {
          role: "user",
          content: `Create a unique, engaging ${grade} grade math question ${concept ? `about ${concept}` : `in the category of ${category}`} that hasn't been asked before. 
          
It must be completely different from all recent questions.

Timestamp for uniqueness: ${timestamp}

Make sure it's appropriate for the student's level and provides a learning opportunity.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 1.2, // Even higher temperature for maximum diversity
    });

    const content = response.choices[0].message.content || '{}';
    console.log(`✅ OpenAI API call successful for grade ${grade}, category ${category || 'general'}`);
    const parsedResponse = JSON.parse(content as string);
    } catch (error) {
      console.error(`❌ OpenAI API ERROR: ${error.message}`);
      console.error(`Failed to generate question for grade ${grade}, category ${category || 'general'}`);
      // Rethrow to be caught by outer try/catch
      throw error;
    }
    
    // For Math Facts modules, strictly enforce pure computation format
    if (isMathFactsModule) {
      console.log("MATH FACTS MODULE - Validating question format");
      
      // Define regex for valid math facts format: X [operation] Y = ?
      const validMathFactsFormat = /^\s*\d+\s*[\+\-×÷\*\/]\s*\d+\s*=\s*\?\s*$/;
      
      if (!validMathFactsFormat.test(parsedResponse.question)) {
        console.log("INVALID MATH FACTS FORMAT DETECTED - Fixing...");
        console.log(`Original question: "${parsedResponse.question}"`);
        
        // Extract numbers and operation from the question using more flexible regex
        const numMatch = parsedResponse.question.match(/(\d+)\s*([\+\-×÷\*\/])\s*(\d+)/);
        
        if (numMatch) {
          const [_, num1, op, num2] = numMatch;
          let operation = op;
          
          // Standardize operation symbols
          if (op === '*' || op === 'x') operation = '×';
          if (op === '/') operation = '÷';
          
          // Reformat to strict math facts format
          parsedResponse.question = `${num1} ${operation} ${num2} = ?`;
          console.log(`Reformatted to: "${parsedResponse.question}"`);
        } else {
          // If we can't extract numbers, create a grade-appropriate math fact
          const grade = params.grade || 'K';
          let num1, num2, operation;
          
          if (grade === 'K' || grade === '1') {
            // Addition/subtraction with small numbers
            num1 = Math.floor(Math.random() * 8) + 2; // 2-9
            num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1
            operation = Math.random() < 0.6 ? '+' : '-'; // 60% addition for lower grades
            
            // For subtraction, swap to ensure larger number first
            if (operation === '-') {
              [num1, num2] = [Math.max(num1, num2), Math.min(num1, num2)];
            }
          } else if (grade === '2' || grade === '3') {
            // Simple multiplication/division for grades 2-3
            if (Math.random() < 0.6) {
              // Multiplication
              num1 = Math.floor(Math.random() * 9) + 2; // 2-10
              num2 = Math.floor(Math.random() * 9) + 2; // 2-10
              operation = '×';
            } else {
              // Division (ensure clean division)
              num2 = Math.floor(Math.random() * 9) + 2; // 2-10
              const factor = Math.floor(Math.random() * 9) + 2; // 2-10
              num1 = num2 * factor; // Ensures clean division
              operation = '÷';
            }
          } else {
            // More complex operations for grades 4-6
            if (Math.random() < 0.5) {
              // Two-digit arithmetic
              num1 = Math.floor(Math.random() * 90) + 10; // 10-99
              num2 = Math.floor(Math.random() * 90) + 10; // 10-99
              operation = Math.random() < 0.5 ? '+' : '-';
              
              // For subtraction, swap to ensure larger number first
              if (operation === '-') {
                [num1, num2] = [Math.max(num1, num2), Math.min(num1, num2)];
              }
            } else {
              // Multiplication/division with larger numbers
              if (Math.random() < 0.7) {
                // Multiplication
                num1 = Math.floor(Math.random() * 12) + 3; // 3-14
                num2 = Math.floor(Math.random() * 12) + 3; // 3-14
                operation = '×';
              } else {
                // Division (ensure clean division)
                num2 = Math.floor(Math.random() * 11) + 2; // 2-12
                const factor = Math.floor(Math.random() * 8) + 2; // 2-9
                num1 = num2 * factor; // Ensures clean division
                operation = '÷';
              }
            }
          }
          
          // Create the math fact
          parsedResponse.question = `${num1} ${operation} ${num2} = ?`;
          
          // Update the answer
          switch (operation) {
            case '+': parsedResponse.answer = (num1 + num2).toString(); break;
            case '-': parsedResponse.answer = (num1 - num2).toString(); break;
            case '×': parsedResponse.answer = (num1 * num2).toString(); break;
            case '÷': parsedResponse.answer = (num1 / num2).toString(); break;
          }
          
          console.log(`Created fallback math fact: "${parsedResponse.question}" with answer: ${parsedResponse.answer}`);
        }
        
        // Generate appropriate options for multiple choice
        const correctAnswer = parseInt(parsedResponse.answer);
        const options = new Set<string>();
        options.add(correctAnswer.toString());
        
        // Add reasonable options around the correct answer
        options.add((correctAnswer + 1).toString());
        if (correctAnswer > 1) options.add((correctAnswer - 1).toString());
        options.add((correctAnswer + 2).toString());
        if (correctAnswer > 2) options.add((correctAnswer - 2).toString());
        
        // For larger numbers, add some more distant options
        if (correctAnswer > 10) {
          options.add((correctAnswer + Math.floor(correctAnswer * 0.2)).toString());
          options.add((correctAnswer - Math.floor(correctAnswer * 0.2)).toString());
        }
        
        // Randomly select 4 options
        parsedResponse.options = Array.from(options)
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);
          
        // Ensure we have exactly 4 options
        while (parsedResponse.options.length < 4) {
          const newOption = (correctAnswer + parsedResponse.options.length + 1).toString();
          parsedResponse.options.push(newOption);
        }
      }
    }
    
    // Image generation is disabled per user request - this block will never execute
    if (false) { // Was: questionReferencesImage(parsedResponse.question)
      console.log("Image generation disabled per user request");
      
      // Check if the question has color-shape descriptions that give away the answer
      const colorShapePatterns = [
        /here is a (red|blue|green|yellow|purple) (triangle|circle|square|star)/i,
        /you see a (red|blue|green|yellow|purple) (triangle|circle|square|star)/i,
        /this is a (red|blue|green|yellow|purple) (triangle|circle|square|star)/i
      ];
      
      // If the question text describes the colors or shapes explicitly and then asks about them,
      // modify the question to avoid giving away the answer
      let questionModified = false;
      for (const pattern of colorShapePatterns) {
        if (pattern.test(parsedResponse.question)) {
          const colorMatch = parsedResponse.question.match(/(red|blue|green|yellow|purple)/gi);
          const shapeMatch = parsedResponse.question.match(/(triangle|circle|square|star)/gi);
          
          if (colorMatch && colorMatch.length > 0 && 
              /what color is/i.test(parsedResponse.question)) {
            // If asking about color but giving it away in the description
            parsedResponse.question = parsedResponse.question.replace(pattern, "Here is a shape.");
            questionModified = true;
          } 
          else if (shapeMatch && shapeMatch.length > 0 && 
                  /what shape is/i.test(parsedResponse.question)) {
            // If asking about shape but giving it away in the description
            parsedResponse.question = parsedResponse.question.replace(pattern, "Here is a colored object.");
            questionModified = true;
          }
        }
      }
      
      // Handle money-related questions to ensure proper currency visualization
      const moneyTerms = [
        /coins?/i, /money/i, /cents?/i, /penny|pennies/i, /nickel/i, /dime/i, /quarter/i,
        /\$\d+/i, /\d+\s*cents/i
      ];
      
      let moneyTypeDetected = false;
      if (moneyTerms.some(term => term.test(parsedResponse.question))) {
        console.log("Money-related question detected");
        imageType = "money";
        
        // Try to extract specific coin types and counts
        const coinMatches = {
          pennies: parsedResponse.question.match(/(\d+)\s*penn(y|ies)/i),
          nickels: parsedResponse.question.match(/(\d+)\s*nickel/i),
          dimes: parsedResponse.question.match(/(\d+)\s*dime/i),
          quarters: parsedResponse.question.match(/(\d+)\s*quarter/i)
        };
        
        const coins: {[key: string]: number} = {};
        let coinsFound = false;
        
        // Process each coin type if found
        Object.entries(coinMatches).forEach(([type, match]) => {
          if (match && match[1]) {
            const count = parseInt(match[1]);
            if (!isNaN(count)) {
              coins[type === 'pennies' ? 'penny' : type.slice(0, -1)] = count;
              coinsFound = true;
            }
          }
        });
        
        if (coinsFound) {
          imageContent = coins;
          moneyTypeDetected = true;
        } else {
          // If no specific coins found, check for generic coin count
          const genericCoinMatch = parsedResponse.question.match(/(\d+)\s*coins?/i);
          if (genericCoinMatch && genericCoinMatch[1]) {
            const count = parseInt(genericCoinMatch[1]);
            if (!isNaN(count) && count > 0) {
              if (count <= 5) {
                imageContent = [{ type: 'penny', count }];
              } else {
                // For larger counts, mix coin types
                imageContent = [
                  { type: 'penny', count: Math.min(3, count) },
                  { type: 'nickel', count: Math.min(2, Math.max(0, count - 3)) },
                  { type: 'dime', count: Math.max(0, count - 5) }
                ];
              }
              moneyTypeDetected = true;
            }
          }
        }
        
        // Default for money questions if no specific coins detected
        if (!moneyTypeDetected) {
          imageContent = [
            { type: 'penny', count: 3 },
            { type: 'nickel', count: 1 },
            { type: 'dime', count: 1 }
          ];
        }
        
        // Check for value-based questions about money (e.g., "How much money is shown?")
        if (/how much|what is the value|worth/i.test(parsedResponse.question)) {
          // Calculate the total value in cents
          let totalCents = 0;
          if (typeof imageContent === 'object') {
            // Handle array of coin objects
            if (Array.isArray(imageContent)) {
              for (const item of imageContent) {
                if (item && typeof item === 'object' && 'type' in item && 'count' in item) {
                  const { type, count } = item;
                  switch (type) {
                    case 'penny': totalCents += 1 * count; break;
                    case 'nickel': totalCents += 5 * count; break;
                    case 'dime': totalCents += 10 * count; break;
                    case 'quarter': totalCents += 25 * count; break;
                    case '$1': totalCents += 100 * count; break;
                    case '$5': totalCents += 500 * count; break;
                    case '$10': totalCents += 1000 * count; break;
                    case '$20': totalCents += 2000 * count; break;
                  }
                }
              }
            } 
            // Handle object with coin type keys
            else if (!Array.isArray(imageContent)) {
              for (const [type, count] of Object.entries(imageContent)) {
                switch (type) {
                  case 'penny': totalCents += 1 * count; break;
                  case 'nickel': totalCents += 5 * count; break;
                  case 'dime': totalCents += 10 * count; break;
                  case 'quarter': totalCents += 25 * count; break;
                  case '$1': totalCents += 100 * count; break;
                  case '$5': totalCents += 500 * count; break;
                  case '$10': totalCents += 1000 * count; break;
                  case '$20': totalCents += 2000 * count; break;
                }
              }
            }
          }
          
          // Format the value as dollars/cents
          let valueStr: string;
          if (totalCents >= 100) {
            // Format as dollars
            const dollars = Math.floor(totalCents / 100);
            const cents = totalCents % 100;
            valueStr = cents > 0 ? `$${dollars}.${cents.toString().padStart(2, '0')}` : `$${dollars}`;
          } else {
            // Format as cents
            valueStr = `${totalCents}¢`;
          }
          
          // Update the answer
          parsedResponse.answer = valueStr;
          
          // Generate reasonable options for multiple choice
          const values = [totalCents];
          while (values.length < 4) {
            // Generate a value that's within 50% of the correct value but different
            let newVal;
            do {
              const adjustment = Math.random() > 0.5 ? 1 : -1;
              const variance = Math.max(5, Math.floor(totalCents * 0.3));
              newVal = totalCents + adjustment * (Math.floor(Math.random() * variance) + 1);
              newVal = Math.max(1, newVal); // Ensure it's at least 1 cent
            } while (values.includes(newVal));
            values.push(newVal);
          }
          
          // Format all values and scramble
          const options = values.map(cents => {
            if (cents >= 100) {
              const dollars = Math.floor(cents / 100);
              const remainingCents = cents % 100;
              return remainingCents > 0 ? `$${dollars}.${remainingCents.toString().padStart(2, '0')}` : `$${dollars}`;
            } else {
              return `${cents}¢`;
            }
          }).sort(() => Math.random() - 0.5);
          
          // Ensure the correct answer is in the options
          if (!options.includes(valueStr)) {
            options[0] = valueStr;
          }
          
          parsedResponse.options = options;
        }
      } else {
        // For non-money questions
        imageType = "countObjects";
        imageContent = ["circle", 5];

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
      }
      
      // Check for counting questions
      if (/how many/i.test(parsedResponse.question)) {
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
      
      // Image generation disabled per user request
      console.log("Image generation is disabled - setting storyImage to null");
      
      // Set story image to null
      parsedResponse.storyImage = null;
    }
    
    // Add a truly unique ID that won't collide with existing questions
    // Use timestamp + random number to ensure uniqueness
    const uniqueId = parsedResponse.uniqueId 
      ? parseInt(parsedResponse.uniqueId) 
      : Date.now() + Math.floor(Math.random() * 10000);
      
    // Extract key mathematical operations for tracking question uniqueness
    const mathOperations: string[] = [];
    
    // Look for basic arithmetic operations in the question
    if (typeof parsedResponse.question === 'string') {
      // Extract operations using regex
      const additionMatches = [...parsedResponse.question.matchAll(/(\d+)\s*\+\s*(\d+)/g)];
      const subtractionMatches = [...parsedResponse.question.matchAll(/(\d+)\s*\-\s*(\d+)/g)];
      const multiplicationMatches = [...parsedResponse.question.matchAll(/(\d+)\s*[×x\*]\s*(\d+)/g)];
      const divisionMatches = [...parsedResponse.question.matchAll(/(\d+)\s*[÷\/]\s*(\d+)/g)];
      
      // Convert matches to standardized math facts
      additionMatches.forEach(m => mathOperations.push(`${m[1]}+${m[2]}`));
      subtractionMatches.forEach(m => mathOperations.push(`${m[1]}-${m[2]}`));
      multiplicationMatches.forEach(m => mathOperations.push(`${m[1]}×${m[2]}`));
      divisionMatches.forEach(m => mathOperations.push(`${m[1]}÷${m[2]}`));
    }
    
    // Check for fractions in the question
    const fractionMatches = typeof parsedResponse.question === 'string'
      ? [...parsedResponse.question.matchAll(/(\d+)\/(\d+)/g)]
      : [];
    fractionMatches.forEach(m => mathOperations.push(`fraction:${m[1]}/${m[2]}`));
    
    // Log for debugging
    if (mathOperations.length > 0) {
      console.log("Checking if question references an image - disabled per user request");
      console.log(`Generated question with math operations: ${mathOperations.join(', ')}`);
    } else {
      console.log("Checking if question references an image - disabled per user request");
    }
    
    // Generate hash signature of the question text (ignoring whitespace and capitalization)
    // This helps identify almost identical questions even if wording varies slightly
    const questionSignature = typeof parsedResponse.question === 'string' 
      ? parsedResponse.question
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
      : '';
          
    console.log("Successfully generated new question via OpenAI");
    
    return {
      ...parsedResponse,
      id: uniqueId,
      mathOperations: mathOperations.length > 0 ? mathOperations : undefined,
      questionSignature: questionSignature || undefined
    };
  } catch (error) {
    console.error("Error generating adaptive question:", error);
    
    // Return a basic dynamic question as last resort - with grade-specific adjustments
    const grade = params.grade || "K";
    let num1, num2, questionText, options, explanation, category;
    // No visual elements per user request
    
    // Adjust the fallback question based on grade level
    if (grade === "K") {
      // For kindergarten, use small numbers (1-5) and simple questions
      num1 = Math.floor(Math.random() * 3) + 1; // 1-3
      num2 = Math.floor(Math.random() * 3) + 1; // 1-3
      
      // Randomly select between counting, simple addition, or shape recognition
      const questionType = Math.floor(Math.random() * 3);
      
      if (questionType === 0) {
        // Text-only counting question (no visual)
        questionText = `If you count from 1 to ${num1}, how many numbers will you say?`;
        options = [`${num1}`, `${num1+1}`, `${num1-1 > 0 ? num1-1 : num1+2}`, `${num1+2}`];
        explanation = `When counting from 1 to ${num1}, you say ${num1} numbers: ${Array.from({length: num1}, (_, i) => i+1).join(', ')}.`;
        category = "Counting";
        // No images per user request - disabled completely
      } else if (questionType === 1) {
        // Text-only addition question
        questionText = `What is ${num1} + ${num2}?`;
        options = [`${num1 + num2}`, `${num1 + num2 + 1}`, `${num1 + num2 - 1 > 0 ? num1 + num2 - 1 : num1 + num2 + 2}`, `${num1 + num2 + 2}`];
        explanation = `To add ${num1} + ${num2}, combine the two numbers to get ${num1 + num2}.`;
        category = "Addition";
        // No images per user request - disabled completely
      } else {
        // Text-only shape property question 
        const shapes = ["circle", "square", "triangle"];
        const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Create text-only properties questions rather than shape identification
        const shapeProps = {
          "circle": "How many sides does a circle have?",
          "square": "How many sides does a square have?",
          "triangle": "How many sides does a triangle have?"
        };
        
        const shapeAnswers = {
          "circle": "0",
          "square": "4",
          "triangle": "3"
        };
        
        const shapeOptions = {
          "circle": ["0", "1", "2", "4"],
          "square": ["3", "4", "5", "6"],
          "triangle": ["2", "3", "4", "5"]
        };
        
        questionText = shapeProps[correctShape as keyof typeof shapeProps];
        options = shapeOptions[correctShape as keyof typeof shapeOptions];
        explanation = `A ${correctShape} has ${shapeAnswers[correctShape as keyof typeof shapeAnswers]} sides.`;
        category = "Geometry";
        // No images per user request - disabled completely
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
    
    // Create result object
    const result = {
      id: Date.now(),
      question: questionText,
      answer: options[0], // First option is always the correct one
      options: options,
      explanation: explanation,
      difficulty: params.difficulty || 1,
      concepts: [category],
      grade: grade,
      category: category
      // No storyImage - visual elements removed per user request
    };
    
    // Post-process to avoid the repetitive apple counting question
    // Detect apple counting questions
    const isAppleCountingQuestion = /Count the apples:[\s\S]*🍎.*How many/i.test(result.question) || 
        /How many apples are there\?/i.test(result.question);
    
    if (isAppleCountingQuestion) {
      // Check if this is likely to be the first question of a series (forceDynamic is true)
      // or if it's in an inappropriate category
      if (params.forceDynamic || (category !== 'counting' && category !== 'addition' && category !== 'all')) {
        console.log("Replacing repetitive apple counting question - first question or inappropriate category");
        
        // For first questions (forceDynamic=true), always provide varied alternatives
        if (params.forceDynamic) {
          // Varied first questions by grade level
          const grade = params.grade.toLowerCase();
          if (grade === 'k' || grade === 'kindergarten') {
            const kQuestions = [
              {
                question: "What number comes after 5?",
                answer: "6",
                options: ["5", "6", "7", "8"],
                explanation: "When counting, 6 comes right after 5."
              },
              {
                question: "Count the shapes: 🔶 🔶 🔶. How many triangles?",
                answer: "3",
                options: ["2", "3", "4", "5"],
                explanation: "There are 3 triangle shapes shown."
              },
              {
                question: "Which group has more? Group A: 🔵🔵 or Group B: 🔵🔵🔵",
                answer: "Group B",
                options: ["Group A", "Group B", "Same amount", "Can't tell"],
                explanation: "Group B has 3 circles, which is more than Group A that has 2 circles."
              }
            ];
            // Pick a random kindergarten question
            Object.assign(result, kQuestions[Math.floor(Math.random() * kQuestions.length)]);
            return result;
          }
          else if (grade === '1' || grade === '1st' || grade === 'first') {
            const firstGradeQuestions = [
              {
                question: "10 + 5 = ?",
                answer: "15",
                options: ["13", "14", "15", "16"],
                explanation: "Adding 10 and 5 gives us 15."
              },
              {
                question: "How many tens are in the number 43?",
                answer: "4",
                options: ["3", "4", "5", "0"],
                explanation: "The number 43 has 4 tens and 3 ones."
              },
              {
                question: "What is 20 - 5?",
                answer: "15",
                options: ["10", "15", "25", "5"],
                explanation: "When you subtract 5 from 20, you get 15."
              }
            ];
            Object.assign(result, firstGradeQuestions[Math.floor(Math.random() * firstGradeQuestions.length)]);
            return result;
          }
        }
        
        // Modify the question to be more specific to the requested category
        if (category === 'multiplication') {
          result.question = `Sarah has 3 baskets. Each basket has 4 oranges. How many oranges does Sarah have in total?`;
          result.answer = "12";
          result.options = ["8", "10", "12", "15"];
          result.explanation = "To find the total, multiply the number of baskets by the number of oranges in each: 3 × 4 = 12.";
        } else if (category === 'division') {
          result.question = `Max has 12 stickers that he wants to share equally among 3 friends. How many stickers will each friend receive?`;
          result.answer = "4";
          result.options = ["3", "4", "5", "6"];
          result.explanation = "To find how many stickers each friend gets, divide the total by the number of friends: 12 ÷ 3 = 4.";
        } else if (category === 'subtraction') {
          result.question = `Emma had 9 markers. She gave 4 markers to her friend. How many markers does Emma have now?`;
          result.answer = "5";
          result.options = ["3", "4", "5", "6"];
          result.explanation = "To find how many markers Emma has left, subtract the number she gave away from her initial amount: 9 - 4 = 5.";
        }
      }
    }
    
    // Post-process to remove underscores used for emphasis
    if (/_\d+_/.test(result.question)) {
      console.log("Fixing question with underscored numbers");
      // Replace _digit_ with digit without underscores
      result.question = result.question.replace(/_(\d+)_/g, '$1');
    }
    
    // Fix place value questions to be clearer
    if (/What is the value of _\d+_ in \d+/.test(result.question)) {
      // For example: "What is the value of _3_ in 345?" becomes "Which digit is in the tens place of 345?"
      const match = result.question.match(/What is the value of _(\d+)_ in (\d+)/);
      if (match) {
        const digit = match[1];
        const number = match[2];
        
        // Find the position of the digit in the number
        const position = number.indexOf(digit);
        if (position !== -1) {
          const places = ['ones', 'tens', 'hundreds', 'thousands'];
          const placeIndex = number.length - position - 1;
          if (placeIndex >= 0 && placeIndex < places.length) {
            result.question = `Which digit is in the ${places[placeIndex]} place of ${number}?`;
          }
        }
      }
    }
    
    return result;
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