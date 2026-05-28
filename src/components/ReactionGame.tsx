import React, { useState, useEffect, useRef } from "react";
import { Play, Timer, Award, Sparkles, Zap } from "lucide-react";

interface ReactionGameProps {
  onFinish: (score: number) => void;
  instructions: string;
}

export default function ReactionGame({ onFinish, instructions }: ReactionGameProps) {
  const [gameState, setGameState] = useState<"idle" | "waiting" | "clickNow" | "tooEarly" | "result">("idle");
  const [attempts, setAttempts] = useState(0);
  const [scoresList, setScoresList] = useState<number[]>([]);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [averageTime, setAverageTime] = useState<number | null>(null);
  
  const timeoutRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

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

  const startTest = () => {
    setGameState("waiting");
    playSound(400, "sine", 0.1);
    
    // Set random time between 1.5s and 5s
    const delay = Math.floor(Math.random() * 3500) + 1500;
    
    timeoutRef.current = setTimeout(() => {
      setGameState("clickNow");
      startTimeRef.current = Date.now();
      playSound(800, "sawtooth", 0.08);
    }, delay);
  };

  const handleAreaClick = () => {
    if (gameState === "waiting") {
      // Too early! Punish
      clearTimeout(timeoutRef.current);
      setGameState("tooEarly");
      playSound(150, "sawtooth", 0.3);
    } else if (gameState === "clickNow") {
      // Correct! Calculate response
      const diff = Date.now() - startTimeRef.current;
      setReactionTime(diff);
      
      const newScores = [...scoresList, diff];
      setScoresList(newScores);
      setAttempts((prev) => prev + 1);
      
      playSound(587.33, "sine", 0.15);
      setGameState("result");
      
      // Calculate overall dynamic average
      const avg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      setAverageTime(avg);
    }
  };

  const nextAttempt = () => {
    if (attempts >= 5) {
      // Game set! Compute total unified score
      // Score formula: Reaction time under 500ms gets points. 
      // 250ms is baseline (gives 200 pts per attempt). 
      // Under 200ms gives massive points.
      let totalPoints = 0;
      scoresList.forEach((t) => {
        if (t < 600) {
          totalPoints += Math.max(10, Math.floor((600 - t) * 1.5));
        } else {
          totalPoints += 5;
        }
      });
      onFinish(totalPoints);
    } else {
      startTest();
    }
  };

  const resetGame = () => {
    setAttempts(0);
    setScoresList([]);
    setReactionTime(null);
    setAverageTime(null);
    startTest();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden text-white id-reaction-game-container">
      {/* Upper stats bar */}
      <div className="flex items-center justify-between w-full mb-4 px-2 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          <span className="font-mono text-sm font-bold">
            Intento: <span className="text-white font-black">{attempts}/5</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-cyan-400" />
          <span className="font-sans text-xs text-gray-400">
            Promedio: <span className="font-mono text-sm font-bold text-cyan-300">{averageTime ? `${averageTime} ms` : "---"}</span>
          </span>
        </div>
      </div>

      {gameState === "idle" ? (
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/30 animate-pulse">
            <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold mb-2">⚡ Reflejos de Color</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {instructions || "Mantente atento. Haz clic en la pantalla en el milisegundo exacto en que cambie a color verde brillante. ¡Hazlo 5 veces para conseguir el mejor promedio!"}
          </p>
          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition duration-150 transform hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            ¡Probar Mis Reflejos!
          </button>
        </div>
      ) : (
        /* Reactive Box Stage */
        <div
          onClick={handleAreaClick}
          className={`relative w-full min-h-[280px] rounded-xl flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-100 ${
            gameState === "waiting" ? "bg-red-950/70 hover:bg-red-950/80 border border-red-500/30" :
            gameState === "clickNow" ? "bg-emerald-600 border-2 border-white animate-pulse" :
            gameState === "tooEarly" ? "bg-amber-950/80 border border-amber-500/30" : "bg-slate-950 border border-gray-800"
          }`}
        >
          {gameState === "waiting" && (
            <div className="text-center p-4">
              <p className="text-2xl font-black text-red-400">🔴 ESPERA EL COLOR VERDE...</p>
              <p className="text-xs text-slate-500 font-mono mt-2">Haz clic antes e invalidarás el intento</p>
            </div>
          )}

          {gameState === "clickNow" && (
            <div className="text-center p-4 animate-bounce">
              <p className="text-4xl md:text-5xl font-black text-white tracking-widest drop-shadow-md">🚀 ¡PULSA YA!</p>
            </div>
          )}

          {gameState === "tooEarly" && (
            <div className="text-center p-6 flex flex-col items-center">
              <p className="text-2xl font-extrabold text-amber-500">❌ ¡Demasiado pronto!</p>
              <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">Pulsaste antes del cambio. Este intento requiere compostura mental.</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startTest();
                }}
                className="mt-5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs transition"
              >
                Reintentar Intento
              </button>
            </div>
          )}

          {gameState === "result" && (
            <div className="text-center p-6 flex flex-col items-center justify-center">
              <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">Tiempo de Reacción</p>
              <p className="text-5xl font-black text-cyan-300 font-mono mt-1 mb-2">
                {reactionTime} <span className="text-xs text-slate-400 font-normal">ms</span>
              </p>
              <span className="text-[10px] text-gray-500 italic block mb-6">
                {reactionTime && reactionTime < 200 ? "⭐ ¡Velocidad de élite!" :
                 reactionTime && reactionTime < 300 ? "👌 Reflejos óptimos" : "😴 Algo lento..."}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextAttempt();
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition min-w-[120px]"
              >
                {attempts >= 5 ? "Ver Resultado General 🏆" : "Siguiente Intento ➡️"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="w-full text-center mt-3 text-xs text-gray-500 font-mono">
        {gameState !== "idle" && `Promedio de ${scoresList.length} intentos completados`}
      </div>
    </div>
  );
}
