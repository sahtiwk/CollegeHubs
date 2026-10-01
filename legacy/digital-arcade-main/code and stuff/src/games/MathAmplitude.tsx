import React, { useState, useEffect } from 'react';
import { Timer, Plus, Minus, X, Divide } from 'lucide-react';

type Operation = '+' | '-' | '*' | '/';
type Question = {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
};

export default function MathAmplitude() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [highScore, setHighScore] = useState(0);

  const generateQuestion = (): Question => {
    const operations: Operation[] = ['+', '-', '*', '/'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1: number, num2: number, answer: number;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 100);
        num2 = Math.floor(Math.random() * 100);
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 100);
        num2 = Math.floor(Math.random() * num1);
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12);
        num2 = Math.floor(Math.random() * 12);
        answer = num1 * num2;
        break;
      case '/':
        num2 = Math.floor(Math.random() * 11) + 1;
        answer = Math.floor(Math.random() * 10);
        num1 = num2 * answer;
        break;
      default:
        num1 = 0;
        num2 = 0;
        answer = 0;
    }

    return { num1, num2, operation, answer };
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameActive(true);
    setCurrentQuestion(generateQuestion());
    setUserAnswer('');
    setFeedback('');
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;

    const userNum = parseInt(userAnswer);
    if (userNum === currentQuestion.answer) {
      setScore(prev => prev + 1);
      setFeedback('Correct! 🎉');
      setCurrentQuestion(generateQuestion());
      setUserAnswer('');
    } else {
      setFeedback('Try again! 🤔');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setGameActive(false);
      if (score > highScore) {
        setHighScore(score);
      }
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft, score, highScore]);

  const getOperationSymbol = (op: Operation) => {
    switch (op) {
      case '+': return <Plus className="w-6 h-6" />;
      case '-': return <Minus className="w-6 h-6" />;
      case '*': return <X className="w-6 h-6" />;
      case '/': return <Divide className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Math Amplitude</h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl text-white">Score: {score}</div>
            <div className="flex items-center text-xl text-white">
              <Timer className="w-6 h-6 mr-2" />
              {timeLeft}s
            </div>
          </div>

          {!gameActive ? (
            <div className="text-center">
              {timeLeft === 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-xl text-purple-400">Final Score: {score}</p>
                  <p className="text-lg text-gray-400">High Score: {highScore}</p>
                </div>
              )}
              <button
                onClick={startGame}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
              >
                {timeLeft === 60 ? 'Start Game' : 'Play Again'}
              </button>
            </div>
          ) : (
            <>
              {currentQuestion && (
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center text-3xl text-white space-x-4 mb-8">
                    <span>{currentQuestion.num1}</span>
                    <span className="text-purple-400">
                      {getOperationSymbol(currentQuestion.operation)}
                    </span>
                    <span>{currentQuestion.num2}</span>
                    <span className="text-purple-400">=</span>
                    <input
                      type="number"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                      className="w-24 px-4 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-center"
                      placeholder="?"
                    />
                  </div>
                  {feedback && (
                    <p className={`text-xl ${feedback.includes('Correct') ? 'text-green-500' : 'text-red-500'}`}>
                      {feedback}
                    </p>
                  )}
                  <button
                    onClick={checkAnswer}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
                  >
                    Check Answer
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>Solve as many math problems as you can in 60 seconds!</p>
          <p>Test your mental calculation speed and accuracy.</p>
        </div>
      </div>
    </div>
  );
}