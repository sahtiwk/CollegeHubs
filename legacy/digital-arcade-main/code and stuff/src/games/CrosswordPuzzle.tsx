import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, HelpCircle } from 'lucide-react';

interface Crossword {
  grid: string[][];
  words: { word: string; row: number; col: number; direction: string; clue: string }[];
}

const PUZZLES: Record<string, Crossword> = {
  easy: {
    grid: [
      ["H", "T", "M", "L", ""],
      ["", "A", "", "", ""],
      ["D", "I", "V", "", ""],
      ["", "L", "", "", ""],
      ["", "", "", "", ""]
    ],
    words: [
      { word: "HTML", row: 0, col: 0, direction: "horizontal", clue: "Standard markup language for web pages" },
      { word: "TAIL", row: 0, col: 1, direction: "vertical", clue: "Command to view end of file in Linux" },
      { word: "DIV", row: 2, col: 0, direction: "horizontal", clue: "HTML container element" }
    ]
  },
  medium: {
    grid: [
      ["", "N", "P", "M", ""],
      ["", "O", "", "", ""],
      ["G", "I", "T", "", ""],
      ["", "E", "", "", ""],
      ["", "", "", "", ""]
    ],
    words: [
      { word: "NPM", row: 0, col: 1, direction: "horizontal", clue: "Node.js package manager" },
      { word: "NODE", row: 0, col: 1, direction: "vertical", clue: "JavaScript runtime environment" },
      { word: "GIT", row: 2, col: 0, direction: "horizontal", clue: "Version control system" }
    ]
  },
  hard: {
    grid: [
      ["R", "E", "A", "C", "T", "", ""],
      ["E", "", "P", "", "Y", "", ""],
      ["S", "", "I", "", "P", "", ""],
      ["T", "Y", "P", "E", "S", "", ""],
      ["", "", "", "", "C", "", ""],
      ["", "", "V", "I", "T", "E", ""],
      ["", "", "", "", "P", "", ""]
    ],
    words: [
      { word: "REACT", row: 0, col: 0, direction: "horizontal", clue: "Popular JavaScript UI library" },
      { word: "REST", row: 0, col: 0, direction: "vertical", clue: "API architectural style" },
      { word: "API", row: 0, col: 2, direction: "vertical", clue: "Interface for software communication" },
      { word: "TYPES", row: 3, col: 0, direction: "horizontal", clue: "TypeScript's key feature" },
      { word: "VITE", row: 5, col: 2, direction: "horizontal", clue: "Modern frontend build tool" },
      { word: "TYPESCRIPT", row: 0, col: 4, direction: "vertical", clue: "JavaScript with static typing" }
    ]
  }
};

export default function CrosswordPuzzle() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentPuzzle, setCurrentPuzzle] = useState<Crossword>(PUZZLES.easy);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [complete, setComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: number; total: number } | null>(null);

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  const initializeGame = () => {
    const puzzle = PUZZLES[difficulty];
    setCurrentPuzzle(puzzle);
    setUserGrid(puzzle.grid.map(row => row.map(() => '')));
    setComplete(false);
    setFeedback(null);
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    const newGrid = [...userGrid];
    newGrid[row][col] = value.toUpperCase();
    setUserGrid(newGrid);
  };

  const checkAnswers = () => {
    let correctCount = 0;
    let totalLetters = 0;

    currentPuzzle.words.forEach(word => {
      const letters = word.word.split('');
      letters.forEach((letter, index) => {
        totalLetters++;
        if (word.direction === 'horizontal') {
          if (userGrid[word.row][word.col + index] === letter) {
            correctCount++;
          }
        } else {
          if (userGrid[word.row + index][word.col] === letter) {
            correctCount++;
          }
        }
      });
    });

    setFeedback({ correct: correctCount, total: totalLetters });
    setComplete(correctCount === totalLetters);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Crossword Puzzle</h1>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="p-2 text-white hover:text-purple-400 transition-colors"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>

        {showInstructions && (
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">How to Play</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• Type letters in the white cells</li>
              <li>• Use the clues to solve the puzzle</li>
              <li>• All answers are in UPPERCASE</li>
              <li>• Gray cells are not part of any word</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="px-4 py-2 bg-purple-900/30 text-white rounded-lg border border-purple-500/20"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button
                onClick={initializeGame}
                className="p-2 text-white hover:text-purple-400 transition-colors"
                title="New Puzzle"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>

            <div className="grid gap-1 mb-6" 
                 style={{ 
                   gridTemplateColumns: `repeat(${currentPuzzle.grid[0].length}, minmax(0, 1fr))`
                 }}>
              {currentPuzzle.grid.map((row, rowIndex) => (
                row.map((cell, colIndex) => (
                  <input
                    key={`${rowIndex}-${colIndex}`}
                    type="text"
                    maxLength={1}
                    value={userGrid[rowIndex]?.[colIndex] || ''}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    disabled={cell === ''}
                    className={`
                      w-full aspect-square text-center text-xl font-bold rounded
                      ${cell === '' ? 'bg-black/50 cursor-not-allowed' : 'bg-purple-900/30 text-white'}
                      border border-purple-500/20 focus:outline-none focus:border-purple-500
                    `}
                  />
                ))
              ))}
            </div>

            <button
              onClick={checkAnswers}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200"
            >
              Check Answers
            </button>

            {feedback && (
              <div className={`text-center mt-4 ${complete ? 'text-green-500' : 'text-red-500'}`}>
                {complete ? (
                  <div className="flex items-center justify-center">
                    <Check className="w-6 h-6 mr-2" />
                    <span>Congratulations! Puzzle Complete!</span>
                  </div>
                ) : (
                  `Keep trying! ${feedback.correct} out of ${feedback.total} correct`
                )}
              </div>
            )}
          </div>

          <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Clues</h2>
            <div className="space-y-4">
              {currentPuzzle.words.map((word, index) => (
                <div key={index} className="text-gray-300">
                  <div className="flex items-center">
                    <span className="font-bold text-purple-400 mr-2">{index + 1}.</span>
                    <span>{word.clue}</span>
                  </div>
                  <div className="text-sm text-gray-400 ml-6">
                    ({word.direction})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}