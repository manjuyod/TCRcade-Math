import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import QuestionCard from '@/components/question-card';
import { playSound } from '@/lib/sounds';

export default function DecimalDefenderPage() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    console.log('🔢 CLIENT: Fetching decimal defender questions...');
    fetch('/api/modules/decimal-defender/questions')
      .then(res => {
        console.log('🔢 CLIENT: Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('🔢 CLIENT: Raw response data:', data);
        
        // The API returns an array of questions directly
        const questions = Array.isArray(data) ? data : [];
        console.log('🔢 CLIENT: Parsed questions array:', questions.length, 'questions');
        
        // Verify these are actually decimal questions
        const decimalQuestions = questions.filter(q => 
          q.question && (
            q.question.includes('decimal') ||
            q.question.includes('Round') ||
            q.question.includes('Compare') ||
            q.question.includes('Add') ||
            q.question.includes('Subtract') ||
            q.question.includes('digit is in the')
          )
        );
        
        console.log('🔢 CLIENT: Verified decimal questions:', decimalQuestions.length);
        console.log('🔢 CLIENT: First question:', decimalQuestions[0]?.question);
        
        // Randomly choose 5 from the verified decimal questions
        const shuffled = decimalQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
        setQuestions(shuffled);
      })
      .catch(error => {
        console.error('🔢 CLIENT ERROR: Failed to load decimal defender questions:', error);
      });
  }, []);

  const handleAnswer = (userAnswer: string) => {
    const current = questions[currentIndex];
    const isCorrect = userAnswer === current.answer;

    if (isCorrect) {
      playSound('correct');
      setScore(prev => prev + 1);
    } else {
      playSound('incorrect');
    }

    if (currentIndex + 1 >= questions.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Decimal Defender</h1>

      {sessionComplete ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Session Complete!</h2>
          <p>You got {score} out of {questions.length} correct.</p>
        </div>
      ) : questions.length > 0 ? (
        <QuestionCard
          question={questions[currentIndex]}
          onAnswer={handleAnswer}
        />
      ) : (
        <p>Loading questions...</p>
      )}
    </div>
  );
}