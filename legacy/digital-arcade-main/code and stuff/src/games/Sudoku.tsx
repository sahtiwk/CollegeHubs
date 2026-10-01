import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function Sudoku() {
  const [board, setBoard] = useState<number[][]>(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isComplete, setIsComplete] = useState(false);
  const [isSolutionValid, setIsSolutionValid] = useState(true);

  const generateSudoku = () => {
    // Initialize empty board
    const newBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    
    // Fill diagonal boxes first (they are independent)
    for (let box = 0; box < 9; box += 3) {
      fillBox(newBoard, box, box);
    }
    
    // Fill remaining cells
    solveSudoku(newBoard);
    
    // Create puzzle by removing numbers based on difficulty
    const cellsToRemove = {
      easy: 30,
      medium: 40,
      hard: 50
    }[difficulty];

    const puzzle = newBoard.map(row => [...row]);
    let removed = 0;
    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }

    setBoard(puzzle);
    setInitialBoard(puzzle.map(row => [...row]));
    setIsComplete(false);
    setIsSolutionValid(true);
    setSelectedCell(null);
  };

  const fillBox = (board: number[][], row: number, col: number) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        board[row + i][col + j] = numbers[randomIndex];
        numbers.splice(randomIndex, 1);
      }
    }
  };

  const checkValidPlacement = (board: number[][], row: number, col: number, num: number): boolean => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }

    // Check 3x3 box
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol] === num) return false;
      }
    }

    return true;
  };

  const solveSudoku = (board: number[][]): boolean => {
    let row = 0;
    let col = 0;
    let isEmpty = false;
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === 0) {
          row = i;
          col = j;
          isEmpty = true;
          break;
        }
      }
      if (isEmpty) break;
    }
    
    if (!isEmpty) return true;
    
    for (let num = 1; num <= 9; num++) {
      if (checkValidPlacement(board, row, col, num)) {
        board[row][col] = num;
        if (solveSudoku(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  };

  const handleCellClick = (row: number, col: number) => {
    if (initialBoard[row][col] === 0) {
      setSelectedCell([row, col]);
    }
  };

  const handleNumberInput = (number: number) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = number;
    setBoard(newBoard);
    
    // Check if board is complete and valid
    const complete = newBoard.every(row => row.every(cell => cell !== 0));
    if (complete) {
      const valid = validateBoard(newBoard);
      setIsComplete(true);
      setIsSolutionValid(valid);
    }
  };

  const validateBoard = (board: number[][]): boolean => {
    // Check rows
    for (let row = 0; row < 9; row++) {
      const seen = new Set();
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0) {
          if (seen.has(board[row][col])) return false;
          seen.add(board[row][col]);
        }
      }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const seen = new Set();
      for (let row = 0; row < 9; row++) {
        if (board[row][col] !== 0) {
          if (seen.has(board[row][col])) return false;
          seen.add(board[row][col]);
        }
      }
    }

    // Check 3x3 boxes
    for (let box = 0; box < 9; box++) {
      const seen = new Set();
      const rowStart = Math.floor(box / 3) * 3;
      const colStart = (box % 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const value = board[rowStart + i][colStart + j];
          if (value !== 0) {
            if (seen.has(value)) return false;
            seen.add(value);
          }
        }
      }
    }

    return true;
  };

  useEffect(() => {
    generateSudoku();
  }, [difficulty]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Sudoku</h1>
        
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="px-4 py-2 bg-purple-900/30 text-white rounded-lg border border-purple-500/20"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={generateSudoku}
              className="p-2 text-white hover:text-purple-400 transition-colors"
              title="New Game"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-9 gap-1 mb-6">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square flex items-center justify-center text-lg font-bold
                    ${(rowIndex + 1) % 3 === 0 && rowIndex < 8 ? 'border-b-2 border-purple-500/50' : ''}
                    ${(colIndex + 1) % 3 === 0 && colIndex < 8 ? 'border-r-2 border-purple-500/50' : ''}
                    ${selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex
                      ? 'bg-purple-600/30'
                      : 'bg-purple-900/30'}
                    ${initialBoard[rowIndex][colIndex] !== 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-white hover:bg-purple-700/30 cursor-pointer'}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell !== 0 ? cell : ''}
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null].map((number, index) => (
              <button
                key={index}
                className={`
                  aspect-square bg-purple-800/30 hover:bg-purple-700/30
                  text-white text-xl font-bold rounded
                  flex items-center justify-center
                  transition-colors
                `}
                onClick={() => number && handleNumberInput(number)}
              >
                {number}
              </button>
            ))}
          </div>

          {isComplete && (
            <div className="text-center mb-6">
              <div className={`text-2xl font-bold mb-2 ${isSolutionValid ? 'text-green-500' : 'text-red-500'}`}>
                {isSolutionValid ? (
                  <div className="flex items-center justify-center">
                    <Check className="w-6 h-6 mr-2" />
                    Congratulations!
                  </div>
                ) : (
                  'Solution is incorrect'
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-gray-400">
          <p>Click a cell to select it, then use the number pad to input values</p>
          <p>Complete the puzzle by filling all cells with valid numbers</p>
        </div>
      </div>
    </div>
  );
}