import React, { useState } from 'react';

type Choice = 'rock' | 'paper' | 'scissors';
type GameResult = 'win' | 'lose' | 'draw' | null;

export default function RockPaperScissors() {
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<GameResult>(null);
  const [score, setScore] = useState({ player: 0, computer: 0 });

  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  const emojis: Record<Choice, string> = {
    rock: '✊',
    paper: '✋',
    scissors: '✌️'
  };

  const determineWinner = (player: Choice, computer: Choice): GameResult => {
    if (player === computer) return 'draw';
    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      return 'win';
    }
    return 'lose';
  };

  const playGame = (choice: Choice) => {
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];
    const gameResult = determineWinner(choice, computerChoice);

    setPlayerChoice(choice);
    setComputerChoice(computerChoice);
    setResult(gameResult);

    if (gameResult === 'win') {
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
    } else if (gameResult === 'lose') {
      setScore(prev => ({ ...prev, computer: prev.computer + 1 }));
    }
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
    setScore({ player: 0, computer: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Rock Paper Scissors
        </h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between mb-8 text-xl text-white">
            <div>Player: {score.player}</div>
            <div>Computer: {score.computer}</div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {choices.map(choice => (
              <button
                key={choice}
                onClick={() => playGame(choice)}
                className="aspect-square text-4xl bg-purple-800/30 hover:bg-purple-700/30 border border-purple-500/20 rounded-lg flex items-center justify-center transition-all duration-200 transform hover:scale-105"
              >
                {emojis[choice]}
              </button>
            ))}
          </div>

          {playerChoice && computerChoice && (
            <div className="text-center mb-8">
              <div className="flex justify-center items-center space-x-8 mb-4">
                <div className="text-4xl">{emojis[playerChoice]}</div>
                <div className="text-2xl text-purple-400">vs</div>
                <div className="text-4xl">{emojis[computerChoice]}</div>
              </div>
              <div className={`text-2xl font-bold mb-2 ${
                result === 'win' ? 'text-green-500' :
                result === 'lose' ? 'text-red-500' :
                'text-yellow-500'
              }`}>
                {result === 'win' && 'You Win!'}
                {result === 'lose' && 'Computer Wins!'}
                {result === 'draw' && "It's a Draw!"}
              </div>
            </div>
          )}

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