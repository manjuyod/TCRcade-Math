import { useState, useEffect } from 'react';
import { Question } from '@shared/schema';
import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/questions';

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
};

export default function QuestionCard({ question, onAnswerSubmit }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>(question.question);
  const [visualInfo, setVisualInfo] = useState<VisualInfo | null>(null);
  
  // Parse question for visual cues
  useEffect(() => {
    const questionStr = question.question;
    // Check if there's a visual instruction in the question
    if (questionStr.startsWith('[visual:')) {
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
  }, [question.question, question.grade]);
  
  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    onAnswerSubmit(option);
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
          {getCategoryLabel(question.category)}
        </span>
        {/* No question number displayed here as per requirements */}
      </div>
      
      <div className="text-center my-4">
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
        <p className="text-gray-500">Solve the {question.category} problem</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        {question.options.map((option, index) => (
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
        ))}
      </div>
    </motion.div>
  );
}
