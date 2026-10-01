import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface GameAudioProps {
  audioUrl: string;
  volume?: number;
}

export default function GameAudio({ audioUrl, volume = 0.5 }: GameAudioProps) {
  const [audio] = useState(new Audio(audioUrl));
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audio.loop = true;
    audio.volume = volume;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio, volume]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audio]);

  return (
    <button
      onClick={togglePlay}
      className="fixed bottom-4 right-4 p-3 bg-purple-900/50 rounded-full hover:bg-purple-800/50 transition-colors"
      title={isPlaying ? 'Mute Music' : 'Play Music'}
    >
      {isPlaying ? (
        <Volume2 className="w-6 h-6 text-white" />
      ) : (
        <VolumeX className="w-6 h-6 text-white" />
      )}
    </button>
  );
}