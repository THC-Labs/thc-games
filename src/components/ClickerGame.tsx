import React, { useState, useEffect, useRef } from "react";
import { Play, Timer, Sparkles, Award } from "lucide-react";

interface ClickerGameProps {
  onFinish: (score: number) => void;
  instructions: string;
}

export default function ClickerGame({ onFinish, instructions }: ClickerGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [targetSize, setTargetSize] = useState(70); // in pixels
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // percentages
  const [countdown, setCountdown] = useState(3);
  const [starting, setStarting] = useState(false);
  const playAreaRef = useRef<HTMLDivElement>(null);

  // Play synthesized game sounds
  const playSound = (freq: number, type: OscillatorType, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context might be blocked or unsupported
    }
  };

  // Pre-game countdown
  useEffect(() => {
    let timer: any;
    if (starting && countdown > 0) {
      timer = setTimeout(() => {
        playSound(440 + (3 - countdown) * 110, "sine", 0.1);
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (starting && countdown === 0) {
      playSound(880, "sine", 0.25);
      setStarting(false);
      setIsPlaying(true);
      setTimeLeft(15);
      setScore(0);
      moveTarget();
    }
    return () => clearTimeout(timer);
  }, [starting, countdown]);

  // Main game timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
        if (timeLeft <= 4 && timeLeft > 1) {
          playSound(293.66, "triangle", 0.05); // low tick warning
        }
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsPlaying(false);
      playSound(523.25, "square", 0.4); // game over fanfare
      onFinish(score);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft, score]);

  const startGame = () => {
    setCountdown(3);
    setStarting(true);
    setScore(0);
  };

  const moveTarget = () => {
    // Generate random positions between 10% and 90%
    const newX = Math.floor(Math.random() * 80) + 10;
    const newY = Math.floor(Math.random() * 80) + 10;
    setTargetPos({ x: newX, y: newY });
    
    // Make target smaller as score increases to make it harder
    const nextSize = Math.max(25, 80 - Math.floor(score / 4) * 5);
    setTargetSize(nextSize);
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;

    // Award score based on target size! Smaller = more points
    const pointsAwarded = Math.ceil((100 - targetSize) / 5) * 5 + 10; // minimum 10 points, smaller gives more
    setScore((prev) => prev + pointsAwarded);
    
    // play pop sound
    playSound(600 + pointsAwarded * 3, "sine", 0.12);
    
    moveTarget();
  };

  const handlePlayAreaMissClick = () => {
    if (!isPlaying) return;
    // penalty for clicking outside the target
    setScore((prev) => Math.max(0, prev - 15));
    playSound(180, "sawtooth", 0.15); // buzz sound
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden text-white id-clicker-game-container">
      {/* Upper stats bar */}
      <div className="flex items-center justify-between w-full mb-4 px-2 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-400" />
          <span className="font-mono text-lg font-bold">
            {starting ? `Estrenando en ${countdown}...` : `${timeLeft}s`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <span className="font-sans text-xl font-black text-yellow-300">
            {score} <span className="text-xs text-gray-400 font-normal">pts</span>
          </span>
        </div>
      </div>

      {!starting && !isPlaying ? (
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/30">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">🎯 Clicker Veloz</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {instructions || "Haz clic en los objetivos en movimiento lo más rápido posible. Los objetivo pequeños dan más puntos pero si fallas perderás puntos."}
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition duration-150 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            ¡Empezar Desafío!
          </button>
        </div>
      ) : starting ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="text-7xl font-sans font-black text-indigo-400 animate-ping">
            {countdown}
          </div>
          <p className="mt-8 text-sm text-indigo-300/80 font-mono tracking-widest uppercase">
            Prepárate...
          </p>
        </div>
      ) : (
        /* Dynamic Click Target Area */
        <div
          ref={playAreaRef}
          onClick={handlePlayAreaMissClick}
          className="relative w-full h-[320px] bg-slate-950 rounded-xl border border-gray-800 cursor-crosshair overflow-hidden select-none"
        >
          {/* Background guide grid details */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-5 pointer-events-none">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-white"></div>
            ))}
          </div>

          {/* Active target element */}
          <div
            onClick={handleTargetClick}
            style={{
              position: "absolute",
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              width: `${targetSize}px`,
              height: `${targetSize}px`,
              transform: "translate(-50%, -50%)",
            }}
            className="rounded-full bg-radial from-red-500 to-rose-600 border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.6)] cursor-pointer flex items-center justify-center transition-all duration-75 active:scale-75"
          >
            {/* Bullseye inner rings */}
            <div className="w-2/3 h-2/3 rounded-full border border-white flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full text-center mt-3 text-xs text-gray-500 font-mono">
        {isPlaying ? "⚠️ Cada click fuera del objetivo resta -15 puntos" : "Practica tantas veces como quieras. Tu puntaje más alto del día se subirá al Leaderboard."}
      </div>
    </div>
  );
}
