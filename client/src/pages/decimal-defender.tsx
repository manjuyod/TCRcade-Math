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
    const url = '/api/modules/decimal-defender/questions';
    console.log('🔢 CLIENT: *** STARTING FETCH ***');
    console.log('🔢 CLIENT: Target URL:', url);
    console.log('🔢 CLIENT: Full URL will be:', window.location.origin + url);
    console.log('🔢 CLIENT: About to call fetch...');
    
    fetch(url)
      .then(res => {
        console.log('🔢 CLIENT: ✅ Response received');
        console.log('🔢 CLIENT: Response status:', res.status);
        console.log('🔢 CLIENT: Response ok:', res.ok);
        console.log('🔢 CLIENT: Response headers:', Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}, statusText: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('🔢 CLIENT: ✅ JSON parsed successfully');
        console.log('🔢 CLIENT: Received data:', data);
        console.log('🔢 CLIENT: Data type:', Array.isArray(data) ? 'array' : typeof data);
        console.log('🔢 CLIENT: Data length:', Array.isArray(data) ? data.length : 'N/A');
        
        // Verify we received an array of decimal questions
        if (Array.isArray(data) && data.length > 0) {
          console.log('🔢 CLIENT: ✅ Valid array received with', data.length, 'questions');
          console.log('🔢 CLIENT: First question content:', data[0]);
          console.log('🔢 CLIENT: All question categories:', data.map(q => q.category));
          console.log('🔢 CLIENT: All question skills:', data.map(q => q.skill));
          
          // Validate that all questions are decimal-related
          const nonDecimalQuestions = data.filter(q => q.category !== "decimal_defender");
          if (nonDecimalQuestions.length > 0) {
            console.error('🔢 CLIENT ERROR: ❌ Received non-decimal questions:', nonDecimalQuestions);
            console.error('🔢 CLIENT ERROR: This should not happen - all questions should be decimal_defender category');
            return;
          }
          
          // Validate that all questions have decimal skills
          const invalidSkills = data.filter(q => !['rounding', 'comparing', 'addition', 'subtraction', 'place_value'].includes(q.skill));
          if (invalidSkills.length > 0) {
            console.error('🔢 CLIENT ERROR: ❌ Received questions with invalid skills:', invalidSkills);
            return;
          }
          
          console.log('🔢 CLIENT: ✅ All questions verified as decimal-related');
          
          // Use first 5 questions for the session
          const sessionQuestions = data.slice(0, 5);
          setQuestions(sessionQuestions);
          console.log('🔢 CLIENT: ✅ Set', sessionQuestions.length, 'decimal questions for session');
          console.log('🔢 CLIENT: Session questions:', sessionQuestions.map(q => `"${q.question}" (${q.skill})`));
        } else if (Array.isArray(data) && data.length === 0) {
          console.error('🔢 CLIENT ERROR: ❌ Received empty array');
        } else {
          console.error('🔢 CLIENT ERROR: ❌ Invalid data format - not an array or null');
          console.error('🔢 CLIENT ERROR: Data received:', data);
        }
      })
      .catch(error => {
        console.error('🔢 CLIENT ERROR: ❌ Failed to load decimal defender questions:', error);
        console.error('🔢 CLIENT ERROR: Error name:', error.name);
        console.error('🔢 CLIENT ERROR: Error message:', error.message);
        console.error('🔢 CLIENT ERROR: Error stack:', error.stack);
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