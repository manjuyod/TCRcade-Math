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
    console.log('🔢 CLIENT: Fetching decimal defender questions from /api/modules/decimal-defender/questions');
    fetch('/api/modules/decimal-defender/questions')
      .then(res => {
        console.log('🔢 CLIENT: Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('🔢 CLIENT: Received data:', data);
        console.log('🔢 CLIENT: Data type:', Array.isArray(data) ? 'array' : typeof data);
        
        // The API should return an array of decimal questions directly
        if (Array.isArray(data) && data.length > 0) {
          console.log('🔢 CLIENT: First question content:', data[0]);
          console.log('🔢 CLIENT: All question skills:', data.map(q => q.skill));
          
          // Use first 5 questions for the session
          const sessionQuestions = data.slice(0, 5);
          setQuestions(sessionQuestions);
          console.log('🔢 CLIENT: Set', sessionQuestions.length, 'questions for session');
        } else {
          console.error('🔢 CLIENT: No questions received or invalid format');
        }
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