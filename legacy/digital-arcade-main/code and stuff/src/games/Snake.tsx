import React, { useState, useEffect, useCallback } from 'react';
import GameAudio from '../components/GameAudio';

type Choice = 'rock' | 'paper' | 'scissors';
type GameResult = 'win' | 'lose' | 'draw' | null;

export default function Snake() {
  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const INITIAL_SNAKE = [{ x: 10, y: 10 }];
  const INITIAL_DIRECTION = { x: 1, y: 0 };
  const GAME_SPEED = 150;

  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setScore(0);
    generateFood();
    setIsPaused(false);
  };

  const checkCollision = (head: { x: number; y: number }) => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Self collision
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsPaused(prev => !prev);
        return;
      }
      
      if (isPaused) return;

      const keyDirections: { [key: string]: { x: number; y: number } } = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
      };

      const newDirection = keyDirections[e.key];
      if (newDirection) {
        // Prevent 180-degree turns
        if (
          !(direction.x === -newDirection.x && direction.y === -newDirection.y) &&
          !(direction.x === newDirection.x && direction.y === newDirection.y)
        ) {
          setDirection(newDirection);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, isPaused]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const moveSnake = () => {
      const head = snake[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
      };

      if (checkCollision(newHead)) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...snake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(prev => prev + 1);
        generateFood();
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const gameInterval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(gameInterval);
  }, [snake, direction, food, gameOver, isPaused, generateFood]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Snake Game</h1>
        
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between mb-4">
            <div className="text-xl text-white">Score: {score}</div>
            <button
              onClick={() => setIsPaused(prev => !prev)}
              className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-500"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          <div
            className="relative bg-black/50 border border-purple-500/20 rounded-lg mb-4"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE
            }}
          >
            {snake.map((segment, i) => (
              <div
                key={i}
                className="absolute bg-purple-500"
                style={{
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE
                }}
              />
            ))}
            <div
              className="absolute bg-pink-500"
              style={{
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE
              }}
            />
          </div>

          {gameOver && (
            <div className="text-center mb-4">
              <div className="text-xl text-red-500 mb-2">Game Over!</div>
              <div className="text-white">Final Score: {score}</div>
            </div>
          )}

          <button
            onClick={resetGame}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
          >
            {gameOver ? 'Play Again' : 'Reset Game'}
          </button>
        </div>

        <div className="mt-4 text-gray-400 text-center">
          <p>Use arrow keys to control the snake</p>
          <p>Press space to pause/resume</p>
        </div>

        <GameAudio audioUrl="https://assets.codepen.io/2971409/8-bit-background-music.mp3" />
      </div>
    </div>
  );
}