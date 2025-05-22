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
    fetch('/api/modules/decimal-defender/questions')
      .then(res => res.json())
      .then(data => {
        // Randomly choose 5 from the 10 returned
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 5);
        setQuestions(shuffled);
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