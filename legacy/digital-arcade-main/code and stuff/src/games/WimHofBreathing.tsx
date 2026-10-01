import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';

export default function WimHofBreathing() {
  const [isActive, setIsActive] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [phase, setPhase] = useState<'breathe' | 'hold' | 'recovery'>('breathe');
  const [holdTime, setHoldTime] = useState(0);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Ready to begin');
  const [bubbleSize, setBubbleSize] = useState(100);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let bubbleTimer: NodeJS.Timeout;

    if (isActive) {
      if (phase === 'breathe') {
        // Bubble animation
        bubbleTimer = setInterval(() => {
          setBubbleSize(prev => {
            const isBreathingIn = breathCount % 2 === 0;
            if (isBreathingIn) {
              return Math.min(prev + 2, 200);
            } else {
              return Math.max(prev - 2, 100);
            }
          });
        }, 20);

        timer = setInterval(() => {
          setBreathCount(prev => {
            if (prev >= 29) {
              setPhase('hold');
              setHoldTime(60);
              setMessage('Hold your breath...');
              return 0;
            }
            setMessage(prev % 2 === 0 ? 'Breathe in deeply...' : 'Let it all out...');
            return prev + 1;
          });
        }, 2500);
      } else if (phase === 'hold' || phase === 'recovery') {
        timer = setInterval(() => {
          setHoldTime(prev => {
            if (prev <= 1) {
              if (phase === 'hold') {
                setPhase('recovery');
                setMessage('Deep breath in and hold...');
                return 15;
              } else {
                if (round < 3) {
                  setRound(r => r + 1);
                  setPhase('breathe');
                  setMessage('Next round starting...');
                } else {
                  setIsActive(false);
                  setMessage('Session complete! Well done!');
                }
                return 0;
              }
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      clearInterval(timer);
      clearInterval(bubbleTimer);
    };
  }, [isActive, phase, round, breathCount]);

  const startSession = () => {
    setIsActive(true);
    setBreathCount(0);
    setPhase('breathe');
    setRound(1);
    setMessage('Starting...');
    setBubbleSize(100);
  };

  const resetSession = () => {
    setIsActive(false);
    setBreathCount(0);
    setPhase('breathe');
    setRound(1);
    setHoldTime(0);
    setMessage('Ready to begin');
    setBubbleSize(100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Wim Hof Breathing
        </h1>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-8">
          <div className="grid grid-cols-3 gap-8">
            {/* Left Bubble */}
            <div className="flex items-center justify-center">
              <div
                className="rounded-full bg-purple-500/20 transition-all duration-300"
                style={{
                  width: `${bubbleSize}px`,
                  height: `${bubbleSize}px`,
                  transform: `scale(${phase === 'breathe' ? 1 : 0.5})`,
                }}
              />
            </div>

            {/* Main Content */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-4">
                Round {round}/3
              </div>
              
              {phase === 'breathe' && (
                <div className="text-2xl text-white mb-4">
                  Breath {Math.floor(breathCount/2) + 1}/30
                </div>
              )}
              
              {(phase === 'hold' || phase === 'recovery') && (
                <div className="text-4xl font-bold text-white mb-4">
                  {holdTime}s
                </div>
              )}

              <div className="text-xl text-gray-300 mb-8">
                {message}
              </div>

              <div className="flex justify-center space-x-4">
                {!isActive ? (
                  <button
                    onClick={startSession}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 flex items-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => setIsActive(false)}
                    className="px-6 py-3 bg-purple-900/50 text-white rounded-lg hover:bg-purple-800/50 transition-all duration-200 flex items-center"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </button>
                )}
                <button
                  onClick={resetSession}
                  className="px-6 py-3 bg-purple-900/50 text-white rounded-lg hover:bg-purple-800/50 transition-all duration-200 flex items-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reset
                </button>
              </div>
            </div>

            {/* Right Bubble */}
            <div className="flex items-center justify-center">
              <div
                className="rounded-full bg-purple-500/20 transition-all duration-300"
                style={{
                  width: `${bubbleSize}px`,
                  height: `${bubbleSize}px`,
                  transform: `scale(${phase === 'breathe' ? 1 : 0.5})`,
                }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-6 text-gray-300">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>30 deep breaths (2-3 seconds each)</li>
                <li>Hold your breath for 1 minute</li>
                <li>Recovery breath held for 15 seconds</li>
                <li>Repeat 3 rounds</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Tips:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Find a comfortable position</li>
                <li>Breathe deeply into your belly</li>
                <li>Stay relaxed throughout</li>
                <li>Stop if you feel dizzy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}