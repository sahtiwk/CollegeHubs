import React, { useState, useEffect } from 'react';

export default function SpotDifference() {
  const [differences, setDifferences] = useState<{x: number, y: number}[]>([
    {x: 150, y: 100},
    {x: 300, y: 200},
    {x: 450, y: 150},
    {x: 200, y: 300},
    {x: 400, y: 250}
  ]);
  const [foundDifferences, setFoundDifferences] = useState<{x: number, y: number}[]>([]);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameComplete) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is near any difference point (within 20px radius)
    const foundDiff = differences.find(diff => 
      Math.sqrt(Math.pow(diff.x - x, 2) + Math.pow(diff.y - y, 2)) < 20 &&
      !foundDifferences.find(found => found.x === diff.x && found.y === diff.y)
    );

    if (foundDiff) {
      const newFoundDifferences = [...foundDifferences, foundDiff];
      setFoundDifferences(newFoundDifferences);
      setScore(score + 100);

      if (newFoundDifferences.length === differences.length) {
        setGameComplete(true);
      }
    }
  };

  const resetGame = () => {
    setFoundDifferences([]);
    setScore(0);
    setGameComplete(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Spot the Difference</h1>
        
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between mb-6">
            <div className="text-xl text-white">Score: {score}</div>
            <div className="text-xl text-white">
              Found: {foundDifferences.length}/{differences.length}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Original Image */}
            <div
              className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer"
              onClick={handleClick}
            >
              <img
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop"
                alt="Original"
                className="w-full h-full object-cover"
              />
              {foundDifferences.map((diff, index) => (
                <div
                  key={index}
                  className="absolute w-6 h-6 border-2 border-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                  style={{ left: diff.x, top: diff.y }}
                />
              ))}
            </div>

            {/* Modified Image */}
            <div
              className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer"
              onClick={handleClick}
            >
              <img
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop"
                alt="Modified"
                className="w-full h-full object-cover"
              />
              {foundDifferences.map((diff, index) => (
                <div
                  key={index}
                  className="absolute w-6 h-6 border-2 border-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                  style={{ left: diff.x, top: diff.y }}
                />
              ))}
            </div>
          </div>

          {gameComplete && (
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-green-500 mb-2">
                Congratulations!
              </h2>
              <p className="text-white">
                You found all differences with a score of {score}!
              </p>
            </div>
          )}

          <button
            onClick={resetGame}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
          >
            {gameComplete ? 'Play Again' : 'Reset Game'}
          </button>
        </div>

        <div className="mt-6 text-center text-gray-400">
          <p>Click on the differences you spot between the two images.</p>
          <p>Each correct find is worth 100 points!</p>
        </div>
      </div>
    </div>
  );
}