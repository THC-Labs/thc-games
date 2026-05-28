import React, { useState, useEffect, useRef } from "react";
import { Play, Timer, Award, Sparkles, Keyboard } from "lucide-react";

interface TypingGameProps {
  onFinish: (score: number) => void;
  instructions: string;
}

const WORDS_POOL = [
  "amigos", "computadora", "velocidad", "reflejos", "marcador", "record", "victoria", "desafio", "divertido",
  "minijuego", "campeon", "servidor", "teclado", "rapidez", "agilidad", "neurona", "calculo", "memoria", "estrella"
];

export default function TypingGame({ onFinish, instructions }: TypingGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [starting, setStarting] = useState(false);
  
  const [currentWord, setCurrentWord] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);

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
      setTimeLeft(15);
      setScore(0);
      setCorrectCount(0);
      setInputValue("");
      nextWord();
    }
    return () => clearTimeout(timer);
  }, [starting, countdown]);

  // Game active typing timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
        if (timeLeft <= 4 && timeLeft > 1) {
          playSound(293.66, "triangle", 0.05);
        }
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsPlaying(false);
      playSound(523.25, "square", 0.4);
      onFinish(score);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft, score]);

  // Keep focus on input
  useEffect(() => {
    if (isPlaying && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [isPlaying, currentWord]);

  const startGame = () => {
    setCountdown(3);
    setStarting(true);
    setScore(0);
  };

  const nextWord = () => {
    const randomWord = WORDS_POOL[Math.floor(Math.random() * WORDS_POOL.length)];
    setCurrentWord(randomWord);
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().trim();
    setInputValue(e.target.value);

    if (val === currentWord) {
      playSound(700, "sine", 0.1);
      // Give score based on word length! Longer word = more points
      const points = currentWord.length * 15;
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      nextWord();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden text-white id-typing-game-container">
      {/* Upper stats bar */}
      <div className="flex items-center justify-between w-full mb-4 px-2 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-400" />
          <span className="font-mono text-lg font-bold">
            {starting ? `Escribiendo en ${countdown}...` : `${timeLeft}s`}
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
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50 font-sans">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
            <Keyboard className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">⌨️ Palabras Relámpago</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {instructions || "Escribe las palabras lo más rápido que puedas. ¡Las palabras más largas otorgan sustancialmente más puntos!"}
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-extrabold rounded-xl transition duration-150 transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <Play className="w-5 h-5 fill-current text-black" />
            ¡Empezar a Teclear!
          </button>
        </div>
      ) : starting ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="text-7xl font-sans font-black text-amber-400 animate-ping">
            {countdown}
          </div>
          <p className="mt-8 text-sm text-amber-300/80 font-mono tracking-widest uppercase">
            Afila tus dedos...
          </p>
        </div>
      ) : (
        /* Typist Challenge Area */
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-slate-950 p-6 rounded-xl border border-gray-800 select-none">
          <div className="mb-8 flex flex-col items-center">
            <span className="text-xs text-indigo-400 font-mono tracking-widest uppercase mb-2">Escribe esta palabra:</span>
            <div className="text-4xl md:text-5xl font-sans font-black tracking-tight text-white select-none whitespace-nowrap bg-indigo-950/20 px-6 py-3 border border-indigo-950 rounded-2xl">
              {currentWord}
            </div>
            <span className="text-xs text-gray-500 mt-2 font-mono">(Longitud: {currentWord.length} letras)</span>
          </div>

          <div className="w-full max-w-sm">
            <input
              ref={inputRef}
              type="text"
              required
              value={inputValue}
              onChange={handleInputChange}
              className="w-full text-center py-4 bg-gray-900 border border-indigo-500/60 rounded-xl text-xl font-mono text-white tracking-wide outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              placeholder="Escribe deprisa..."
            />
          </div>

          <div className="mt-6 text-xs font-mono text-amber-400/80">
            Palabras completadas hoy: <span className="font-bold text-white text-sm">{correctCount}</span>
          </div>
        </div>
      )}

      <div className="w-full text-center mt-3 text-xs text-gray-500 font-mono">
        Recibes +15 puntos por cada letra de la palabra escrita correctamente.
      </div>
    </div>
  );
}
