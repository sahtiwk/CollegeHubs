import React, { useState } from 'react';

export default function CoinFlip() {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [stats, setStats] = useState({ heads: 0, tails: 0 });
  const [flipHistory, setFlipHistory] = useState<Array<{ result: 'heads' | 'tails', time: string }>>([]);

  const flipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);
    const newResult = Math.random() < 0.5 ? 'heads' : 'tails';
    
    setTimeout(() => {
      setResult(newResult);
      setStats(prev => ({
        ...prev,
        [newResult]: prev[newResult] + 1
      }));
      setFlipHistory(prev => [
        { result: newResult, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9)
      ]);
      setIsFlipping(false);
    }, 1000);
  };

  const resetStats = () => {
    setStats({ heads: 0, tails: 0 });
    setFlipHistory([]);
    setResult(null);
  };

  const totalFlips = stats.heads + stats.tails;
  const headsPercentage = totalFlips ? ((stats.heads / totalFlips) * 100).toFixed(1) : '0.0';
  const tailsPercentage = totalFlips ? ((stats.tails / totalFlips) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Coin Flip
        </h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-center mb-8">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl font-bold shadow-lg transform transition-all duration-500 ${
                isFlipping ? 'animate-spin' : ''
              }`}
            >
              {result ? (result === 'heads' ? 'H' : 'T') : '?'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">Heads</div>
              <div className="text-lg text-purple-400">{stats.heads}</div>
              <div className="text-sm text-gray-400">{headsPercentage}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">Tails</div>
              <div className="text-lg text-purple-400">{stats.tails}</div>
              <div className="text-sm text-gray-400">{tailsPercentage}%</div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={flipCoin}
              disabled={isFlipping}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </button>

            <button
              onClick={resetStats}
              className="w-full px-4 py-2 bg-purple-900/50 text-white rounded-lg hover:bg-purple-800/50 transition-all duration-200"
            >
              Reset Stats
            </button>
          </div>

          {flipHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-2">Last 10 Flips</h3>
              <div className="space-y-1">
                {flipHistory.map((flip, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm text-gray-400"
                  >
                    <span>{flip.result}</span>
                    <span>{flip.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}