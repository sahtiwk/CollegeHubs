import React, { useState } from 'react';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const status = winner
    ? `Winner: ${winner}`
    : board.every(square => square)
    ? "Game Draw!"
    : `Next player: ${xIsNext ? 'X' : 'O'}`;

  const handleClick = (i: number) => {
    if (calculateWinner(board) || board[i]) return;
    
    const newBoard = board.slice();
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Tic Tac Toe</h1>
        
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="text-xl text-white mb-4 text-center">{status}</div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {board.map((square, i) => (
              <button
                key={i}
                className="aspect-square bg-purple-800/30 hover:bg-purple-700/30 border border-purple-500/20 rounded-lg text-3xl font-bold text-white flex items-center justify-center transition-colors"
                onClick={() => handleClick(i)}
              >
                {square}
              </button>
            ))}
          </div>
          
          <button
            onClick={resetGame}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}