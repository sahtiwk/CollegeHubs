import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import GameAudio from '../components/GameAudio';

export default function PingPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'computer' | null>(null);
  const [computerDifficulty, setComputerDifficulty] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 400;

    const paddleHeight = 100;
    const paddleWidth = 10;
    const ballSize = 10;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballSpeedX = 7;
    let ballSpeedY = 7;
    let playerY = canvas.height / 2 - paddleHeight / 2;
    let computerY = canvas.height / 2 - paddleHeight / 2;
    let computerSpeed = 6.5;
    let computerPredictionError = 30;
    let consecutiveHits = 0;

    function drawRect(x: number, y: number, width: number, height: number, color: string) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }

    function drawCircle(x: number, y: number, radius: number, color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawNet() {
      for (let i = 0; i < canvas.height; i += 40) {
        drawRect(canvas.width / 2 - 1, i, 2, 20, 'rgba(255, 255, 255, 0.2)');
      }
    }

    function resetBall() {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballSpeedX = -ballSpeedX;
      ballSpeedY = Math.random() * 10 - 5;
      consecutiveHits = 0;
    }

    function moveComputer() {
      if (Math.random() < 0.1 * computerDifficulty) {
        // Occasionally make mistakes based on difficulty
        return;
      }

      const predictedY = ballY + (ballSpeedY * (canvas.width - ballX) / ballSpeedX);
      const targetY = predictedY + (Math.random() * computerPredictionError * 2 - computerPredictionError);
      const computerCenter = computerY + paddleHeight / 2;
      
      if (computerCenter < targetY - 10) {
        computerY += computerSpeed * (1 - (computerDifficulty * 0.2));
      } else if (computerCenter > targetY + 10) {
        computerY -= computerSpeed * (1 - (computerDifficulty * 0.2));
      }

      computerY = Math.max(0, Math.min(canvas.height - paddleHeight, computerY));
    }

    function checkCollision(paddle: number, paddleY: number) {
      if (
        ballY > paddleY &&
        ballY < paddleY + paddleHeight &&
        ballX > paddle - ballSize &&
        ballX < paddle + paddleWidth + ballSize
      ) {
        const diff = ballY - (paddleY + paddleHeight / 2);
        ballSpeedY = diff * 0.2;
        return true;
      }
      return false;
    }

    function checkGameOver(newScore: { player: number; computer: number }) {
      if (newScore.player >= 11 || newScore.computer >= 11) {
        setGameOver(true);
        setWinner(newScore.player >= 11 ? 'player' : 'computer');
        setGameStarted(false);
        return true;
      }
      return false;
    }

    function update() {
      if (!gameStarted || gamePaused || gameOver) return;

      ballX += ballSpeedX;
      ballY += ballSpeedY;

      if (ballY < 0 || ballY > canvas.height) {
        ballSpeedY = -ballSpeedY;
      }

      if (ballSpeedX > 0) {
        moveComputer();
      }

      if (checkCollision(0, playerY)) {
        ballSpeedX = Math.abs(ballSpeedX);
        consecutiveHits++;
        
        // Increase difficulty as player gets better
        if (consecutiveHits > 5) {
          setComputerDifficulty(prev => Math.max(0.2, prev - 0.1));
        }
      }

      if (checkCollision(canvas.width - paddleWidth, computerY)) {
        ballSpeedX = -Math.abs(ballSpeedX);
      }

      if (ballX < 0) {
        const newScore = { ...score, computer: score.computer + 1 };
        setScore(newScore);
        if (!checkGameOver(newScore)) {
          resetBall();
        }
      }

      if (ballX > canvas.width) {
        const newScore = { ...score, player: score.player + 1 };
        setScore(newScore);
        if (!checkGameOver(newScore)) {
          resetBall();
        }
      }
    }

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawNet();

      drawRect(0, playerY, paddleWidth, paddleHeight, '#fff');
      drawRect(canvas.width - paddleWidth, computerY, paddleWidth, paddleHeight, '#fff');

      drawCircle(ballX, ballY, ballSize, '#fff');

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(score.player.toString(), canvas.width / 4, 60);
      ctx.fillText(score.computer.toString(), 3 * canvas.width / 4, 60);

      if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.fillText(
          `Game Over! ${winner === 'player' ? 'You' : 'Computer'} Win!`,
          canvas.width / 2,
          canvas.height / 2 + 10
        );
      }
    }

    let animationId: number;

    function gameLoop() {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!gameStarted || gamePaused) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleY = canvas.height / rect.height;
      const mouseY = (e.clientY - rect.top) * scaleY;
      playerY = Math.max(0, Math.min(canvas.height - paddleHeight, mouseY));
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [gameStarted, gamePaused, gameOver, score]);

  const resetGame = () => {
    setScore({ player: 0, computer: 0 });
    setGameStarted(true);
    setGamePaused(false);
    setGameOver(false);
    setWinner(null);
    setComputerDifficulty(1);
  };

  const togglePause = () => {
    setGamePaused(!gamePaused);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Ping Pong</h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-xl text-white">You: {score.player}</div>
            <div className="space-x-4">
              {!gameStarted ? (
                <button
                  onClick={() => setGameStarted(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200"
                >
                  Start Game
                </button>
              ) : (
                <button
                  onClick={togglePause}
                  className="px-6 py-2 bg-purple-900/50 text-white rounded-lg hover:bg-purple-800/50 transition-all duration-200"
                >
                  {gamePaused ? 'Resume' : 'Pause'}
                </button>
              )}
              <button
                onClick={resetGame}
                className="p-2 text-white hover:text-purple-400 transition-colors"
                title="Reset Game"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>
            <div className="text-xl text-white">Computer: {score.computer}</div>
          </div>

          <div className="relative w-full" style={{ paddingBottom: '50%' }}>
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full bg-black/30 rounded-lg border border-purple-500/20"
            />
          </div>

          <div className="mt-6 text-center text-gray-400">
            <p>Move your mouse up and down to control the paddle</p>
            <p>First to 11 points wins!</p>
          </div>
        </div>
        
        <GameAudio audioUrl="https://assets.codepen.io/2971409/retro-game-background.mp3" volume={0.4} />
      </div>
    </div>
  );
}