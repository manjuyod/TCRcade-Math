import { useState } from 'react';
import { Question } from '@shared/schema';
import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/questions';

type QuestionCardProps = {
  question: Question;
  onAnswerSubmit: (answer: string) => void;
};

export default function QuestionCard({ question, onAnswerSubmit }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    onAnswerSubmit(option);
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
        <span className="text-gray-500 text-sm">
          Question {question.id % 20 + 1}/20
        </span>
      </div>
      
      <div className="text-center my-8">
        <motion.h3
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-dark mb-2"
        >
          {question.question}
        </motion.h3>
        <p className="text-gray-500">Solve the {question.category} problem</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-8">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            disabled={selectedOption !== null}
            onClick={() => handleSelectOption(option)}
            className={`
              arcade-btn bg-white border-2 
              ${selectedOption === option ? 'border-primary' : 'border-gray-200 hover:border-primary'} 
              text-dark font-bold py-3 rounded-xl text-xl transition
            `}
          >
            {option}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
