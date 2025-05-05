/**
 * Test script for verifying question bank operations
 */

// Import required modules
import pkg from 'pg';
const { Client } = pkg;

// Connect to the database
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testQuestionBank() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Successfully connected to the database');
    
    // Test 1: Count questions in the database
    console.log('\n--- Test 1: Counting questions in the database ---');
    const countQuery = 'SELECT COUNT(*) FROM questions';
    const countResult = await client.query(countQuery);
    const totalQuestions = parseInt(countResult.rows[0].count, 10);
    console.log(`Total questions in database: ${totalQuestions}`);
    
    // Test 2: Count questions by grade
    console.log('\n--- Test 2: Counting questions by grade ---');
    const gradeCountQuery = 'SELECT grade, COUNT(*) FROM questions GROUP BY grade ORDER BY grade';
    const gradeCountResult = await client.query(gradeCountQuery);
    console.log('Questions by grade:');
    gradeCountResult.rows.forEach(row => {
      console.log(`  Grade ${row.grade}: ${row.count} questions`);
    });
    
    // Test 3: Count Math Facts questions
    console.log('\n--- Test 3: Counting Math Facts questions ---');
    const mathFactsQuery = "SELECT category, COUNT(*) FROM questions WHERE category LIKE 'math-facts-%' GROUP BY category ORDER BY category";
    const mathFactsResult = await client.query(mathFactsQuery);
    console.log('Math Facts questions by operation:');
    mathFactsResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} questions`);
    });
    
    // Test 4: Retrieve and display a Math Facts question
    console.log('\n--- Test 4: Retrieving a Math Facts question ---');
    const sampleQuery = "SELECT * FROM questions WHERE category LIKE 'math-facts-%' LIMIT 1";
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      const question = sampleResult.rows[0];
      console.log('Sample Math Facts question:');
      console.log(`  ID: ${question.id}`);
      console.log(`  Category: ${question.category}`);
      console.log(`  Grade: ${question.grade}`);
      console.log(`  Question: ${JSON.stringify(question.question)}`);
      console.log(`  Answer: ${question.answer}`);
      console.log(`  Options: ${question.options.join(', ')}`);
    } else {
      console.log('No Math Facts questions found in the database');
    }
    
    // Test 5: Check for any invalid IDs in the database
    console.log('\n--- Test 5: Checking for ID issues ---');
    const checkIdsQuery = 'SELECT id FROM questions WHERE id > 2147483647';
    const checkIdsResult = await client.query(checkIdsQuery);
    
    if (checkIdsResult.rows.length > 0) {
      console.log(`WARNING: Found ${checkIdsResult.rows.length} questions with IDs larger than INT_MAX (2147483647)`);
      console.log('Sample problematic IDs:');
      checkIdsResult.rows.slice(0, 5).forEach(row => {
        console.log(`  ${row.id}`);
      });
      console.log('These IDs will cause errors when using INTEGER type in PostgreSQL');
    } else {
      console.log('All question IDs are within valid PostgreSQL INTEGER range');
    }
    
    console.log('\nQuestion bank tests complete!');
  } catch (error) {
    console.error('Error testing question bank:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the tests
testQuestionBank();
