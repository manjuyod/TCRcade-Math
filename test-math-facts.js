/**
 * Test script for Math Facts questions
 */

async function testAllMathFacts() {
    const gradeSelect = document.getElementById('grade');
    const operationSelect = document.getElementById('operation');
    const fetchBtn = document.getElementById('fetch-btn');
    const questionDisplay = document.getElementById('question-display');
    const resultsDiv = document.getElementById('results');
    
    fetchBtn.addEventListener('click', async () => {
        const grade = gradeSelect.value;
        const operation = operationSelect.value;
        const category = `math-facts-${operation}`;
        
        questionDisplay.innerHTML = '<p>Loading questions...</p>';
        resultsDiv.innerHTML = '';
        
        try {
            // Create a sample cookie to simulate authentication (this is just for testing)
            document.cookie = 'test_auth=true; path=/';
            
            // Try to fetch 5 math facts questions
            const questions = [];
            const errors = [];
            
            resultsDiv.innerHTML = '<p>Attempting to fetch 5 questions...</p>';
            
            for (let i = 0; i < 5; i++) {
                try {
                    const response = await fetch(
                        `/api/questions/next?grade=${encodeURIComponent(grade)}&category=${encodeURIComponent(category)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to fetch question ${i+1}: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                    
                    const question = await response.json();
                    questions.push(question);
                    resultsDiv.innerHTML += `<p>Question ${i+1} fetched successfully!</p>`;
                } catch (error) {
                    errors.push(`Question ${i+1}: ${error.message}`);
                    resultsDiv.innerHTML += `<p style="color: red;">Error fetching question ${i+1}: ${error.message}</p>`;
                }
            }
            
            // Display the results
            if (questions.length > 0) {
                displayQuestions(questions, questionDisplay);
            } else {
                questionDisplay.innerHTML = '<p>No questions were successfully fetched.</p>';
            }
            
            resultsDiv.innerHTML += `<p>Successfully fetched ${questions.length} of 5 questions.</p>`;
            if (errors.length > 0) {
                resultsDiv.innerHTML += '<p>Errors:</p><ul>' + 
                    errors.map(err => `<li>${err}</li>`).join('') +
                    '</ul>';
            }
        } catch (error) {
            questionDisplay.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    });
}

function displayQuestions(questions, container) {
    // Clear the container
    container.innerHTML = '';
    
    // Create a div for each question
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        
        let questionText = '';
        let isFlashcard = false;
        
        // Check if the question is a JSON string containing styling information
        try {
            // If question.question is already an object, use it directly
            // Otherwise, try to parse it as JSON
            const questionData = typeof question.question === 'object' 
                ? question.question 
                : JSON.parse(question.question);
            
            questionText = questionData.text || 'No question text';
            isFlashcard = questionData.isFlashcard || questionData.style?.isFlashcard || false;
        } catch (error) {
            // If not JSON, use the raw question text
            questionText = question.question;
        }
        
        // Create a header
        const header = document.createElement('h3');
        header.textContent = `Question ${index + 1} (ID: ${question.id})`;
        questionDiv.appendChild(header);
        
        // Create the question display
        const questionContent = document.createElement('div');
        if (isFlashcard) {
            questionContent.className = 'flashcard';
        }
        questionContent.textContent = questionText;
        questionDiv.appendChild(questionContent);
        
        // Create answer display
        const answerDiv = document.createElement('div');
        answerDiv.innerHTML = `
            <p><strong>Answer:</strong> ${question.answer}</p>
            <p><strong>Options:</strong> ${Array.isArray(question.options) ? question.options.join(', ') : question.options}</p>
            <p><strong>Category:</strong> ${question.category}</p>
            <p><strong>Grade:</strong> ${question.grade}</p>
            <p><strong>Difficulty:</strong> ${question.difficulty}</p>
        `;
        questionDiv.appendChild(answerDiv);
        
        // Add to container
        container.appendChild(questionDiv);
        
        // Add a separator unless it's the last question
        if (index < questions.length - 1) {
            const separator = document.createElement('hr');
            container.appendChild(separator);
        }
    });
}

// Initialize the test page
testAllMathFacts();