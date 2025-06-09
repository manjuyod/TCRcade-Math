// Basic OpenAI test
import OpenAI from 'openai';

console.log("Starting OpenAI connection test");

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("⚠️ WARNING: OPENAI_API_KEY is not set in environment variables");
  process.exit(1);
} else {
  console.log("✓ OpenAI API key found in environment");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testOpenAI() {
  try {
    console.log("🧪 Testing OpenAI API connection...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Keep your response under 5 words."
        },
        {
          role: "user",
          content: "Can you generate a very simple math question for a 3rd grade student?"
        }
      ],
      max_tokens: 50
    });
    
    console.log("✅ OpenAI API connection test successful!");
    console.log("Response:", response.choices[0].message.content);
    
    // Generate a math question
    console.log("🔍 Generating a basic math question...");
    
    const mathResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
      // Alex R: Changing content prompt for 5 questions instead of 1
          content: "Generate 5 simple math question for grade 2 in the category of Addition. Return ONLY the JSON object with 'question', 'answer', and 'options' fields."
        },
        {
          role: "user",
          content: "Create 5 grade 2 math question about Addition. Use pure calculation format (e.g., '4 + 5 = ?')."
        }
      ],
      response_format: { type: "json_object" },
      // Alex R: Increasing max tokens to 800 to accommodate 5 questions
      max_tokens: 800
    });
    
    console.log("✅ Math question generation successful!");
    
    const content = mathResponse.choices[0].message.content || '{}';
    console.log("Raw response:", content);

    // Alex R: Parse JSON and log the 1st generated question
    let parsedResponse;
    try{
    
    const parsed = JSON.parse(content);
    // Alex R: If the response is an array, take the 1st element
    parsedResponse = Array.isArray(parsed) ? parsed[0] : parsed;  
    console.log("Question:", parsedResponse.question || 'Unknown');
    console.log("Answer:", parsedResponse.answer || 'Unknown');
    console.log("Options:", parsedResponse.options || []);
    } catch(parseError){
      console.error("❌ Failed to parse JSON response:", parseError.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ OpenAI API test failed:", error.message || String(error));
    return false;
  }
}

testOpenAI().then(result => {
  console.log("Test completed with result:", result);
  process.exit(result ? 0 : 1);
});