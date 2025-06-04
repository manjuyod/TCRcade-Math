import { useState, useEffect, useRef } from 'react';
import { Question } from '@shared/schema';
import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/questions';

type QuestionCardProps = {
  question: Question;
  onAnswer: (answer: string) => void;
  disableOptions?: boolean;
  showCorrectAnswer?: boolean;
  showTimer?: boolean;
};

// Define the QuestionContent interface to match the structure coming from the backend
interface FlashcardStyle {
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  display: string;
  justifyContent: string;
  alignItems: string;
  padding: string;
  isFlashcard: boolean;
}

interface QuestionContent {
  text: string;
  style?: FlashcardStyle;
  isFlashcard?: boolean;
}

export default function QuestionCard({ question, onAnswer, disableOptions, showCorrectAnswer, showTimer }: QuestionCardProps) {
  // Default to a safe fallback if question is undefined
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>("Loading question...");
  
  // Track answered questions for study plan refreshing
  const answersCounter = useRef<number>(0);
  
  // Per user request, don't parse for visual cues or display images
  // Track if this is a Math Facts module
  const [isMathFactsModule, setIsMathFactsModule] = useState<boolean>(false);
  const [flashcardStyle, setFlashcardStyle] = useState<FlashcardStyle | null>(null);
  
  useEffect(() => {
    console.log("Question updated in card:", question);
    // Guard against undefined question
    if (!question) {
      setQuestionText("Loading question...");
      setIsMathFactsModule(false);
      setFlashcardStyle(null);
      return;
    }
    
    // Check if this is a Math Facts module
    const category = question.category || '';
    const isMathFacts = category.startsWith('math-facts-');
    setIsMathFactsModule(isMathFacts);
    
    // Handle different question formats
    if (!question.question) {
      setQuestionText("Loading question...");
      setFlashcardStyle(null);
      return;
    }
    
    // For debugging
    if (isMathFacts) {
      console.log("Math Facts question detected:", question);
    }
    
    try {
      // Parse the question content based on its type
      if (typeof question.question === 'object') {
        // This is an object with text property (flashcard style)
        const questionObj = question.question as any; // Use any to avoid TypeScript errors
        
        if (questionObj && questionObj.text) {
          console.log("Processing question text:", questionObj.text);
          setQuestionText(questionObj.text);
          
          if (questionObj.style) {
            setFlashcardStyle(questionObj.style);
          } else if (questionObj.isFlashcard) {
            // Default flashcard styling if isFlashcard is true but no style provided
            setFlashcardStyle({
              fontSize: '60px',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              isFlashcard: true
            });
          } else {
            setFlashcardStyle(null);
          }
        } else {
          setQuestionText(JSON.stringify(questionObj));
          console.error("Question object doesn't have expected structure:", questionObj);
        }
      } else if (typeof question.question === 'string') {
        // This is a regular string question
        const questionStr = question.question;
        
        // Format the question text properly if it contains a visual tag
        if (questionStr && questionStr.startsWith('[visual:')) {
          const endIndex = questionStr.indexOf(']');
          if (endIndex > 0) {
            // Remove the visual tag from the question text
            setQuestionText(questionStr.substring(endIndex + 1).trim());
          } else {
            setQuestionText(questionStr);
          }
        } else {
          setQuestionText(questionStr);
        }
        
        // For Math Facts modules with string questions, still use flashcard styling
        if (isMathFacts) {
          setFlashcardStyle({
            fontSize: '60px',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            isFlashcard: true
          });
        } else {
          // Reset flashcard styling for regular string questions
          setFlashcardStyle(null);
        }
      } else {
        // Fallback for unexpected types
        console.error("Unexpected question format:", typeof question.question);
        setQuestionText("Loading question...");
        setFlashcardStyle(null);
      }
    } catch (error) {
      console.error("Error processing question:", error);
      setQuestionText("Error loading question");
      setFlashcardStyle(null);
    }
  }, [question]);
  
  const handleSelectOption = (option: string) => {
    // Set the selected option first
    setSelectedOption(option);
    // Log the selected answer for debugging
    console.log(`Selected answer: ${option} for question ID: ${question?.id}`);
    
    // Increment the answer counter
    answersCounter.current += 1;
    
    // After every 5 answers, refresh the study plan
    if (answersCounter.current % 5 === 0) {
      console.log(`Refreshing study plan after ${answersCounter.current} answers`);
      // Dynamically import the study plan module to avoid circular dependencies
      try {
        import('@/lib/study-plan').then(module => {
          module.refreshStudyPlan().then(success => {
            if (success) {
              console.log('Study plan refreshed successfully');
            }
          });
        });
      } catch (error) {
        console.error('Error refreshing study plan:', error);
      }
    }
    
    // Submit the answer after a slight delay to ensure UI updates first
    setTimeout(() => {
      onAnswer(option);
    }, 100);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="question-card bg-white p-6 rounded-3xl shadow-md mb-6"
    >
      <div className="flex justify-center items-center mb-4">
        <span className="bg-primary bg-opacity-10 text-primary font-bold py-1 px-3 rounded-full text-sm">
          {question?.category ? getCategoryLabel(question.category) : 'Math'}
        </span>
        {/* No question number displayed here as per requirements */}
      </div>
      
      <div className="text-center my-4">
        {/* No images in questions per user request */}
        
        {flashcardStyle ? (
          <div className="math-facts-flashcard flex justify-center items-center mb-6 py-8">
            <div 
              className="text-dark flex justify-center items-center w-full"
              style={{
                fontSize: flashcardStyle.fontSize || '60px',
                fontWeight: flashcardStyle.fontWeight || 'bold',
                textAlign: 'center' as const,
                padding: flashcardStyle.padding || '20px',
                minHeight: '120px'
              }}
            >
              <motion.span
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                dangerouslySetInnerHTML={{ __html: questionText }}
              />
            </div>
          </div>
        ) : (
          <motion.h3
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-xl md:text-2xl font-bold text-dark mb-2"
            dangerouslySetInnerHTML={{ __html: questionText }}
          />
        )}
        
        <p className="text-gray-500">
          {isMathFactsModule 
            ? `Solve the ${getCategoryLabel(question?.category || '')} calculation` 
            : `Solve the ${question?.category ? getCategoryLabel(question.category) : 'math'} problem`
          }
        </p>
      </div>
      
      <div className={`grid ${isMathFactsModule ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-4 mt-6`}>
        {question?.options && question.options.length > 0 ? (
          question.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              disabled={disableOptions || selectedOption !== null}
              onClick={() => handleSelectOption(option)}
              className={`
                arcade-btn bg-white border-2 shadow-md hover:shadow-lg
                ${selectedOption === option ? 'border-primary' : 'border-gray-200 hover:border-primary'} 
                ${showCorrectAnswer && option === question.answer ? 'border-green-500' : ''}
                text-dark font-bold py-3 rounded-xl 
                ${isMathFactsModule ? 'text-2xl md:text-3xl py-4' : 'text-xl'} 
                transition transform hover:scale-103
              `}
            >
              {option}
            </motion.button>
          ))
        ) : (
          // If no options are provided, show an input field
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Type your answer here"
              onKeyDown={(e) => e.key === 'Enter' && handleSelectOption(e.currentTarget.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-center text-lg"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
