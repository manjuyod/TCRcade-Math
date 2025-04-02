import { useState, useEffect } from 'react';
import { Question } from '@shared/schema';
import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/questions';
import { getQuestionImage } from '@/lib/imageUtils';

type QuestionCardProps = {
  question: Question;
  onAnswerSubmit: (answer: string) => void;
};

type VisualInfo = {
  type: string;
  object?: string;
  count?: number;
  rows?: number;
  cols?: number;
  total?: number;
  groups?: number;
  fraction?: {
    numerator: number;
    denominator: number;
  };
  clock?: {
    hours: number;
    minutes: number;
  };
};

export default function QuestionCard({ question, onAnswerSubmit }: QuestionCardProps) {
  // Default to a safe fallback if question is undefined
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>(question?.question || "Loading question...");
  const [visualInfo, setVisualInfo] = useState<VisualInfo | null>(null);
  
  // Parse question for visual cues and check for SVG images
  useEffect(() => {
    // Guard against undefined question
    if (!question || !question.question) {
      setQuestionText("Loading question...");
      return;
    }
    
    const questionStr = question.question;
    
    // First check if there's an SVG image from the server
    if (question.storyImage && question.storyImage.includes('<svg')) {
      // For dynamically generated questions, they'll have an SVG in storyImage
      // Just set the question text normally, we'll render the SVG separately
      setVisualInfo(null); // Clear any previous visual info
      setQuestionText(questionStr);
      return;
    }
    
    // Use our new image utilities to get a Base64 image for the question if applicable
    const base64Image = getQuestionImage(questionStr);
    if (base64Image) {
      console.log("Found Base64 image for question text:", questionStr);
      // Override the storyImage with our Base64 image
      if (question) {
        question.storyImage = base64Image;
      }
      setVisualInfo(null); // Clear any previous visual info
      setQuestionText(questionStr);
      return;
    }
    
    // Otherwise, check if there's a visual instruction in the question
    if (questionStr && questionStr.startsWith('[visual:')) {
      const endIndex = questionStr.indexOf(']');
      if (endIndex > 0) {
        const visualPart = questionStr.substring(8, endIndex); // Remove [visual: and ]
        const parts = visualPart.split(':');
        const type = parts[0];
        
        // Only show visuals for K-2 grades per requirements
        const gradeLevel = question.grade;
        const showVisuals = gradeLevel === 'K' || gradeLevel === '1' || gradeLevel === '2';
        
        if (!showVisuals) {
          // For grades 3 and up, don't display visuals
          setVisualInfo(null);
          setQuestionText(questionStr.substring(endIndex + 1).trim());
          return;
        }
        
        let visualObj: VisualInfo = { type };
        
        if (type === 'grid' && parts.length > 1) {
          // For grid visuals like [visual:grid:3x4]
          const dimensions = parts[1].split('x');
          visualObj.rows = parseInt(dimensions[0], 10);
          visualObj.cols = parseInt(dimensions[1], 10);
        } else if (type === 'division' && parts.length > 2) {
          // For division visuals like [visual:division:20:4]
          visualObj.total = parseInt(parts[1], 10);
          visualObj.groups = parseInt(parts[2], 10);
        } else if (type === 'fraction' && parts.length > 2) {
          // For fraction visuals like [visual:fraction:2:3]
          visualObj.fraction = {
            numerator: parseInt(parts[1], 10),
            denominator: parseInt(parts[2], 10)
          };
        } else if (type === 'clock' && parts.length > 2) {
          // For clock visuals like [visual:clock:3:15]
          visualObj.clock = {
            hours: parseInt(parts[1], 10),
            minutes: parseInt(parts[2], 10)
          };
        } else if (parts.length > 1) {
          // For object visuals like [visual:apples:5]
          visualObj.object = parts[0];
          visualObj.count = parseInt(parts[1], 10);
        }
        
        setVisualInfo(visualObj);
        // Remove the visual instruction from the displayed question
        setQuestionText(questionStr.substring(endIndex + 1).trim());
      } else {
        setQuestionText(questionStr);
      }
    } else {
      setQuestionText(questionStr);
    }
  }, [question]);
  
  const handleSelectOption = (option: string) => {
    // Set the selected option first
    setSelectedOption(option);
    // Log the selected answer for debugging
    console.log(`Selected answer: ${option} for question ID: ${question?.id}`);
    // Submit the answer after a slight delay to ensure UI updates first
    setTimeout(() => {
      onAnswerSubmit(option);
    }, 100);
  };
  
  // Generate emojis for common objects
  const getEmoji = (object: string): string => {
    const emojiMap: Record<string, string> = {
      'apples': '🍎',
      'bananas': '🍌',
      'pencils': '✏️',
      'coins': '🪙',
      'toys': '🧸',
      'books': '📚',
      'markers': '🖍️',
      'stickers': '🏷️',
      'marbles': '🔮',
      'cards': '🃏',
      'blocks': '🧱',
      'cookies': '🍪',
      'candies': '🍬'
    };
    
    return emojiMap[object] || '⭐';
  };
  
  // Render visual elements based on visualInfo
  const renderVisuals = () => {
    if (!visualInfo) return null;
    
    switch (visualInfo.type) {
      case 'grid':
        // Render a grid of items
        if (!visualInfo.rows || !visualInfo.cols) return null;
        
        return (
          <div className="flex flex-col items-center justify-center mb-4">
            {Array.from({ length: visualInfo.rows || 0 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex">
                {Array.from({ length: visualInfo.cols || 0 }).map((_, colIndex) => (
                  <div key={colIndex} className="w-6 h-6 m-1 bg-primary rounded-full"></div>
                ))}
              </div>
            ))}
          </div>
        );
        
      case 'division':
        // Render items that need to be divided
        if (!visualInfo.total || !visualInfo.groups) return null;
        
        return (
          <div className="flex flex-wrap justify-center mb-4">
            {Array.from({ length: visualInfo.total || 0 }).map((_, index) => (
              <span key={index} className="text-2xl m-1">🍬</span>
            ))}
          </div>
        );
      
      case 'fraction':
        // Render a fraction visualization
        if (!visualInfo.fraction) return null;
        const { numerator, denominator } = visualInfo.fraction;
        
        return (
          <div className="flex justify-center mb-6">
            <div className="w-40 h-40 border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${denominator}, 1fr)` }}>
                {Array.from({ length: denominator }).map((_, i) => (
                  <div 
                    key={i}
                    className={`
                      w-full border-b border-gray-300 
                      ${i < numerator ? 'bg-primary bg-opacity-70' : 'bg-white'}
                    `}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'clock':
        // Render a clock visualization
        if (!visualInfo.clock) return null;
        const { hours, minutes } = visualInfo.clock;
        
        // Calculate hand angles
        const hourDegrees = ((hours % 12) * 30) + (minutes * 0.5); // 30 degrees per hour + slight adjustment for minutes
        const minuteDegrees = minutes * 6; // 6 degrees per minute
        
        return (
          <div className="flex justify-center mb-6">
            <div className="w-40 h-40 relative rounded-full border-4 border-gray-700 bg-white">
              {/* Clock numbers */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                const angle = (num * 30) * (Math.PI / 180);
                const x = 50 + 35 * Math.sin(angle);
                const y = 50 - 35 * Math.cos(angle);
                return (
                  <div 
                    key={num}
                    className="absolute text-gray-800 font-bold"
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`, 
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {num}
                  </div>
                );
              })}
              
              {/* Clock hands */}
              <div 
                className="absolute left-1/2 top-1/2 w-1 h-16 bg-gray-800 rounded-full origin-top"
                style={{ 
                  transform: `translateX(-50%) rotate(${hourDegrees}deg)`,
                  transformOrigin: 'center 15%'
                }}
              ></div>
              <div 
                className="absolute left-1/2 top-1/2 w-0.5 h-20 bg-gray-600 rounded-full origin-top"
                style={{ 
                  transform: `translateX(-50%) rotate(${minuteDegrees}deg)`,
                  transformOrigin: 'center 10%'
                }}
              ></div>
              <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
        );
        
      default:
        // Render individual objects
        if (!visualInfo.object || !visualInfo.count) return null;
        
        const emoji = getEmoji(visualInfo.object);
        
        return (
          <div className="flex flex-wrap justify-center mb-4">
            {Array.from({ length: visualInfo.count || 0 }).map((_, index) => (
              <span key={index} className="text-3xl m-1">{emoji}</span>
            ))}
          </div>
        );
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="question-card bg-white p-6 rounded-3xl shadow-md mb-6"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="bg-primary bg-opacity-10 text-primary font-bold py-1 px-3 rounded-full text-sm">
          {question?.category ? getCategoryLabel(question.category) : 'Math'}
        </span>
        {/* No question number displayed here as per requirements */}
      </div>
      
      <div className="text-center my-4">
        {/* Display SVG from storyImage if present */}
        {question?.storyImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4 flex justify-center"
          >
            {question.storyImage.includes('<svg') ? (
              <div 
                dangerouslySetInnerHTML={{ __html: question.storyImage }} 
                className="svg-container max-w-full"
              />
            ) : (
              <img 
                src={question.storyImage} 
                alt="Question visual" 
                className="max-w-full max-h-64 object-contain"
                onError={(e) => {
                  console.error('Image failed to load:', question.storyImage);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </motion.div>
        )}
        
        {/* Display other types of visuals if present */}
        {visualInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4"
          >
            {renderVisuals()}
          </motion.div>
        )}
        
        <motion.h3
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-xl md:text-2xl font-bold text-dark mb-2"
        >
          {questionText}
        </motion.h3>
        <p className="text-gray-500">
          Solve the {question?.category ? getCategoryLabel(question.category) : 'math'} problem
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        {question?.options && question.options.length > 0 ? (
          question.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              disabled={selectedOption !== null}
              onClick={() => handleSelectOption(option)}
              className={`
                arcade-btn bg-white border-2 shadow-md hover:shadow-lg
                ${selectedOption === option ? 'border-primary' : 'border-gray-200 hover:border-primary'} 
                text-dark font-bold py-3 rounded-xl text-xl transition transform hover:scale-103
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
