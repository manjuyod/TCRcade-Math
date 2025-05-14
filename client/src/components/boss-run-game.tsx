import React, { useState, useEffect } from 'react';
import { Question } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { getNextMathFact } from '@server/mathFacts';

interface BossRunGameProps {
  question: Question;
  onAnswerSubmit: (answer: string) => void;
  bossLevel?: number;
}

export default function BossRunGame({ question, onAnswerSubmit, bossLevel = 1 }: BossRunGameProps) {
  const [bossHealth, setBossHealth] = useState(100 * bossLevel);
  const [timeLeft, setTimeLeft] = useState(10);
  const [bossPosition, setBossPosition] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Move boss closer every 2 questions
  useEffect(() => {
    if (questionCount >= 2) {
      setBossPosition(prev => {
        if (prev >= 10) {
          setGameOver(true);
          return prev;
        }
        return prev + 1;
      });
      setQuestionCount(0);
    }
  }, [questionCount]);

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setQuestionCount(c => c + 1);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver]);

  const handleAnswer = (selectedAnswer: string) => {
    if (gameOver) return;

    // Calculate damage based on remaining time
    const damage = timeLeft * 10;

    // Submit answer and update boss health if correct
    onAnswerSubmit(selectedAnswer);
    if (selectedAnswer === question.answer) {
      setBossHealth(prev => {
        const newHealth = Math.max(0, prev - damage);
        if (newHealth <= 0) {
          setGameOver(true);
        }
        return newHealth;
      });
    }

    setQuestionCount(prev => prev + 1);
    setTimeLeft(10);
  };

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-100 rounded-xl p-6">
        <h2 className="text-3xl font-bold mb-4">
          {bossHealth <= 0 ? "Victory! Boss Defeated!" : "Game Over - Boss Reached You!"}
        </h2>
        <Button onClick={() => window.location.reload()}>Play Again</Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[400px] bg-gray-100 rounded-xl p-6">
      {/* Boss Health Bar */}
      <div className="absolute top-4 left-4 right-4">
        <div className="h-4 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-red-500 rounded-full transition-all"
            style={{ width: `${(bossHealth / (100 * bossLevel)) * 100}%` }}
          />
        </div>
        <div className="text-center text-sm mt-1">
          Boss Health: {bossHealth}/{100 * bossLevel}
        </div>
      </div>

      {/* Timer */}
      <div className="absolute top-20 left-4 right-4 text-center">
        <div className="text-2xl font-bold">
          Time Left: {timeLeft}s
        </div>
      </div>

      {/* Boss and Player */}
      <div className="flex justify-between items-center mt-32">
        <motion.div 
          className="text-6xl"
          initial={{ x: 400 }}
          animate={{ x: bossPosition * 40 }}
        >
          👾
        </motion.div>

        <div className="text-6xl">
          😊
        </div>
      </div>

      {/* Question */}
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{question.question.text}</h2>
        <div className="grid grid-cols-2 gap-4">
          {question.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleAnswer(option)}
              className="p-4 text-lg"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}