import React, { useState, useEffect } from 'react';
import { Flag, Bomb, HelpCircle } from 'lucide-react';

type CellType = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_SETTINGS = {
  easy: { size: 9, mines: 10 },
  medium: { size: 16, mines: 40 },
  hard: { size: 22, mines: 99 }
};

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<CellType[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [flagsLeft, setFlagsLeft] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showHints, setShowHints] = useState(false);

  const initializeGrid = () => {
    const { size, mines } = DIFFICULTY_SETTINGS[difficulty];
    const newGrid: CellType[][] = Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    );

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      
      if (!newGrid[row][col].isMine) {
        newGrid[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mines
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!newGrid[row][col].isMine) {
          let count = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (row + i >= 0 && row + i < size && col + j >= 0 && col + j < size) {
                if (newGrid[row + i][col + j].isMine) count++;
              }
            }
          }
          newGrid[row][col].neighborMines = count;
        }
      }
    }

    setGrid(newGrid);
    setFlagsLeft(mines);
    setGameOver(false);
    setGameWon(false);
    setFirstClick(true);
  };

  useEffect(() => {
    initializeGrid();
  }, [difficulty]);

  const revealCell = (row: number, col: number) => {
    if (gameOver || gameWon || grid[row][col].isFlagged) return;

    const newGrid = [...grid];
    const cell = newGrid[row][col];

    if (cell.isRevealed) return;

    cell.isRevealed = true;

    if (cell.isMine) {
      setGameOver(true);
      // Reveal all mines
      newGrid.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isRevealed = true;
      }));
    } else if (cell.neighborMines === 0) {
      // Reveal adjacent cells
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = row + i;
          const newCol = col + j;
          if (
            newRow >= 0 && newRow < grid.length &&
            newCol >= 0 && newCol < grid[0].length &&
            !newGrid[newRow][newCol].isRevealed &&
            !newGrid[newRow][newCol].isFlagged
          ) {
            revealCell(newRow, newCol);
          }
        }
      }
    }

    setGrid(newGrid);

    // Check for win
    const allNonMinesRevealed = newGrid.every(row =>
      row.every(cell => cell.isMine ? !cell.isRevealed : cell.isRevealed)
    );
    if (allNonMinesRevealed) {
      setGameWon(true);
    }
  };

  const toggleFlag = (row: number, col: number) => {
    if (gameOver || gameWon || grid[row][col].isRevealed) return;

    const newGrid = [...grid];
    const cell = newGrid[row][col];
    
    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsLeft(prev => prev + 1);
    } else if (flagsLeft > 0) {
      cell.isFlagged = true;
      setFlagsLeft(prev => prev - 1);
    }
    
    setGrid(newGrid);
  };

  const getCellColor = (cell: CellType) => {
    if (!cell.isRevealed) return 'bg-purple-900/30';
    if (cell.isMine) return 'bg-red-500';
    return 'bg-purple-800/30';
  };

  const getNumberColor = (num: number) => {
    const colors = [
      'text-blue-400',
      'text-green-400',
      'text-red-400',
      'text-purple-400',
      'text-yellow-400',
      'text-pink-400',
      'text-orange-400',
      'text-teal-400'
    ];
    return colors[num - 1] || 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">MineSweeper</h1>
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
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Basic Controls</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Left click to reveal a cell</li>
                  <li>• Right click to place/remove a flag</li>
                  <li>• Use flags to mark where you think mines are</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Understanding Numbers</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Each number shows how many mines are in the adjacent cells</li>
                  <li>• Adjacent means the 8 cells surrounding the number (including diagonals)</li>
                  <li>• Use these numbers to deduce where mines are located</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Strategy Tips</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Start with corners or edges where there are fewer adjacent cells</li>
                  <li>• When you see a 1 next to an already revealed mine, nearby cells are safe</li>
                  <li>• Use process of elimination with the numbers you reveal</li>
                  <li>• Don't guess unless you have to - use logic to deduce mine locations</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Winning the Game</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Reveal all safe cells without clicking any mines</li>
                  <li>• Flag all mines correctly</li>
                  <li>• The flag counter helps you track remaining mines</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Flag className="w-5 h-5 text-red-400" />
              <span className="text-xl text-white">{flagsLeft}</span>
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="px-4 py-2 bg-purple-900/30 text-white rounded-lg border border-purple-500/20"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="grid gap-1 mb-6" 
               style={{ 
                 gridTemplateColumns: `repeat(${DIFFICULTY_SETTINGS[difficulty].size}, minmax(0, 1fr))` 
               }}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square ${getCellColor(cell)} hover:bg-purple-700/30 border border-purple-500/20 rounded flex items-center justify-center text-sm font-bold transition-colors`}
                  onClick={() => revealCell(rowIndex, colIndex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(rowIndex, colIndex);
                  }}
                >
                  {cell.isFlagged ? (
                    <Flag className="w-3 h-3 text-red-400" />
                  ) : cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb className="w-3 h-3 text-white" />
                    ) : cell.neighborMines > 0 ? (
                      <span className={getNumberColor(cell.neighborMines)}>
                        {cell.neighborMines}
                      </span>
                    ) : null
                  ) : null}
                </button>
              ))
            )}
          </div>

          {(gameOver || gameWon) && (
            <div className="text-center mb-6">
              <p className={`text-2xl font-bold mb-4 ${gameWon ? 'text-green-500' : 'text-red-500'}`}>
                {gameWon ? 'Congratulations! You won!' : 'Game Over!'}
              </p>
            </div>
          )}

          <button
            onClick={() => initializeGrid()}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}