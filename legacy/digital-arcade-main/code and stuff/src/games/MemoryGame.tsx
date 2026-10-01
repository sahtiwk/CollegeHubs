import React, { useState, useEffect } from 'react';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGame() {
  const symbols = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎪', '🎯'];
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffledCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((value, index) => ({
        id: index,
        value,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setGameComplete(false);
  };

  const handleCardClick = (id: number) => {
    if (
      flippedCards.length === 2 ||
      cards[id].isFlipped ||
      cards[id].isMatched
    ) {
      return;
    }

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlippedCards;
      
      if (cards[firstId].value === cards[secondId].value) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstId].isMatched = true;
          matchedCards[secondId].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);

          if (matchedCards.every(card => card.isMatched)) {
            setGameComplete(true);
            if (!bestScore || moves + 1 < bestScore) {
              setBestScore(moves + 1);
            }
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstId].isFlipped = false;
          resetCards[secondId].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Memory Game</h1>

        <div className="mb-8">
          <div className="flex justify-center space-x-8 text-xl text-white">
            <div>Moves: {moves}</div>
            {bestScore && <div>Best: {bestScore}</div>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`w-16 h-16 rounded-lg text-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
                card.isFlipped || card.isMatched
                  ? 'bg-purple-600 rotate-y-180'
                  : 'bg-purple-900/50'
              }`}
              disabled={card.isMatched}
            >
              {(card.isFlipped || card.isMatched) && card.value}
            </button>
          ))}
        </div>

        {gameComplete && (
          <div className="mb-8">
            <p className="text-2xl text-green-500 mb-4">
              Congratulations! You completed the game in {moves} moves!
            </p>
          </div>
        )}

        <button
          onClick={initializeGame}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
        >
          New Game
        </button>
      </div>
    </div>
  );
}