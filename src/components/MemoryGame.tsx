import React, { useState, useEffect } from "react";
import { Play, Timer, Award, Sparkles, Heart } from "lucide-react";

interface MemoryGameProps {
  onFinish: (score: number) => void;
  instructions: string;
}

export default function MemoryGame({ onFinish, instructions }: MemoryGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(16); // 4x4 grid
  const [lives, setLives] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [starting, setStarting] = useState(false);
  
  const [activePattern, setActivePattern] = useState<number[]>([]);
  const [userSelection, setUserSelection] = useState<number[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedSelection, setRevealedSelection] = useState<number[]>([]);

  const playSound = (freq: number, type: OscillatorType, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignored
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
      setScore(0);
      setLevel(1);
      setLives(3);
      generateLevelPattern(1);
    }
    return () => clearTimeout(timer);
  }, [starting, countdown]);

  const startGame = () => {
    setCountdown(3);
    setStarting(true);
  };

  const generateLevelPattern = (lvl: number) => {
    setUserSelection([]);
    setRevealedSelection([]);
    setIsRevealing(true);

    // Number of active tiles increases with level
    const tilesCount = lvl + 2; // lvl 1 = 3 tiles, lvl 2 = 4 tiles etc
    const newPattern: number[] = [];
    
    while (newPattern.length < tilesCount) {
      const randIdx = Math.floor(Math.random() * gridSize);
      if (!newPattern.includes(randIdx)) {
        newPattern.push(randIdx);
      }
    }

    // Flash the cards immediately
    setActivePattern(newPattern);

    // After 1.5 seconds, hide the pattern so the user has to click
    setTimeout(() => {
      setIsRevealing(false);
      playSound(400, "sine", 0.15);
    }, 1500 + lvl * 100); // give slightly more time for longer levels
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || isRevealing || userSelection.includes(index) || lives <= 0) return;

    const isCorrect = activePattern.includes(index);

    if (isCorrect) {
      playSound(600 + userSelection.length * 50, "sine", 0.12);
      const nextSelection = [...userSelection, index];
      setUserSelection(nextSelection);

      // Check if user found all tiles
      if (nextSelection.length === activePattern.length) {
        // Success! Go to next level
        setScore((prev) => prev + level * 50 + 100);
        playSound(987.77, "sine", 0.3); // success chime
        
        // Brief transition to make it nice
        setIsRevealing(true);
        setRevealedSelection(activePattern); // show correct answer highlighted Green
        
        setTimeout(() => {
          setLevel((prev) => prev + 1);
          generateLevelPattern(level + 1);
        }, 1000);
      }
    } else {
      // Incorrect guess
      playSound(150, "sawtooth", 0.25);
      const nextLives = lives - 1;
      setLives(nextLives);
      
      // Flash the missed grid pattern in red
      setIsRevealing(true);
      setRevealedSelection(activePattern);

      if (nextLives <= 0) {
        // Game Over immediately or after brief delay
        setTimeout(() => {
          setIsPlaying(false);
          playSound(250, "square", 0.4);
          onFinish(score);
        }, 1200);
      } else {
        // Try the same level again
        setTimeout(() => {
          generateLevelPattern(level);
        }, 1200);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden text-white id-memory-game-container">
      {/* Upper stats bar */}
      <div className="flex items-center justify-between w-full mb-4 px-2 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm uppercase text-gray-400">
            Nivel <span className="text-white font-bold">{level}</span>
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition ${
                  i < lives ? "text-red-500 fill-current scale-100" : "text-gray-700 scale-90"
                }`}
              />
            ))}
          </div>
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
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">🧠 Memoria Grid</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {instructions || "Memoriza la posición de las cuadrículas iluminadas en azul y haz clic en ellas. Cada nivel aumenta la cantidad de objetivos. ¡Consigues puntos por nivel completado!"}
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition duration-150 transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            ¡Iniciar Entrenamiento!
          </button>
        </div>
      ) : starting ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="text-7xl font-sans font-black text-emerald-400 animate-ping">
            {countdown}
          </div>
          <p className="mt-8 text-sm text-emerald-300/80 font-mono tracking-widest uppercase">
            Memorizando neuronas...
          </p>
        </div>
      ) : (
        /* Memory Grid Arena */
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-slate-950 p-6 rounded-xl border border-gray-800 select-none">
          <div className="mb-4 text-sm font-mono text-emerald-300 antialiased h-6">
            {isRevealing ? (
              <span className="animate-pulse">👀 ¡Memoriza los bloques azules!</span>
            ) : (
              <span>👇 Pulsa las posiciones marcadas</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 w-56 h-56 md:w-64 md:h-64">
            {Array.from({ length: gridSize }).map((_, idx) => {
              const isPattern = activePattern.includes(idx);
              const isSelected = userSelection.includes(idx);
              const isFailureReveal = revealedSelection.includes(idx);

              let tileClass = "bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-850/80";

              if (isRevealing) {
                if (revealedSelection.length > 0) {
                  // Post-level or after strike green/red highlight
                  if (isFailureReveal) {
                    tileClass = "bg-emerald-500 border-white shadow-[0_0_10px_rgba(16,185,129,0.7)]";
                  } else {
                    tileClass = "bg-red-500 border-red-400 opacity-60";
                  }
                } else if (isPattern) {
                  // Active memorization stage
                  tileClass = "bg-sky-500 border-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.8)] animate-pulse";
                }
              } else {
                if (isSelected) {
                  // Selected successfully by user
                  tileClass = "bg-indigo-600 border-indigo-400 shadow-[0_0_6px_rgba(79,70,229,0.5)]";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  disabled={isRevealing}
                  className={`w-full h-full border rounded-xl transition-all duration-150 transform active:scale-90 ${tileClass}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full text-center mt-3 text-xs text-gray-500 font-mono">
        {isPlaying ? `Completa la ronda para conseguir puntos extra` : `Compite por el puntaje perfecto`}
      </div>
    </div>
  );
}
