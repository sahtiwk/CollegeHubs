import React, { useState, useEffect } from 'react';

export default function NumberGuess() {
  const [targetNumber, setTargetNumber] = useState(0);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(10);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setTargetNumber(Math.floor(Math.random() * 100) + 1);
    setGuess('');
    setAttempts(0);
    setMessage('Guess a number between 1 and 100');
    setGameOver(false);
    setHistory([]);
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numberGuess = parseInt(guess);
    if (isNaN(numberGuess)) {
      setMessage('Please enter a valid number');
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    let newMessage = '';
    if (numberGuess === targetNumber) {
      newMessage = `Congratulations! You found the number in ${newAttempts} attempts!`;
      setGameOver(true);
    } else if (newAttempts >= maxAttempts) {
      newMessage = `Game Over! The number was ${targetNumber}`;
      setGameOver(true);
    } else if (numberGuess < targetNumber) {
      newMessage = 'Too low! Try a higher number';
    } else {
      newMessage = 'Too high! Try a lower number';
    }

    setMessage(newMessage);
    setHistory(prev => [...prev, `Guess #${newAttempts}: ${numberGuess} - ${newMessage}`]);
    setGuess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Number Guessing Game
        </h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="text-xl text-white mb-2">
              Attempts: {attempts}/{maxAttempts}
            </div>
            <div className="text-lg text-purple-400">{message}</div>
          </div>

          <form onSubmit={handleGuess} className="mb-6">
            <div className="flex gap-4">
              <input
                type="number"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                disabled={gameOver}
                className="flex-1 px-4 py-2 bg-black/50 border border-purple-500/20 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                placeholder="Enter your guess"
                min="1"
                max="100"
              />
              <button
                type="submit"
                disabled={gameOver || !guess}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guess
              </button>
            </div>
          </form>

          <div className="mb-6 max-h-48 overflow-y-auto">
            {history.map((entry, index) => (
              <div
                key={index}
                className="text-gray-300 mb-1 text-sm"
              >
                {entry}
              </div>
            ))}
          </div>

          {gameOver && (
            <button
              onClick={startNewGame}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}