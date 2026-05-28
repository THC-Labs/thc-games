import React, { useState, useEffect } from "react";
import { Play, Timer, Award, Sparkles, Check, X } from "lucide-react";

interface MathGameProps {
  onFinish: (score: number) => void;
  instructions: string;
}

interface Question {
  text: string;
  options: number[];
  answer: number;
}

export default function MathGame({ onFinish, instructions }: MathGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [starting, setStarting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

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
      // Ignored
    }
  };

  // Generate a random math question
  const generateQuestion = (): Question => {
    const operators = ["+", "-", "*"];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let num1 = 0;
    let num2 = 0;
    let answer = 0;

    if (op === "+") {
      num1 = Math.floor(Math.random() * 48) + 2;
      num2 = Math.floor(Math.random() * 48) + 2;
      answer = num1 + num2;
    } else if (op === "-") {
      num1 = Math.floor(Math.random() * 48) + 12;
      num2 = Math.floor(Math.random() * (num1 - 2)) + 2; // avoid negative numbers for quick logic
      answer = num1 - num2;
    } else {
      // multiplication of easy-medium ranges
      num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
      num2 = Math.floor(Math.random() * 11) + 2; // 2 to 12
      answer = num1 * num2;
    }

    // Generate 4 options: correct answer + 3 close fake options
    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    while (optionsSet.size < 4) {
      const scatter = Math.floor(Math.random() * 9) - 4; // -4 to +4
      const fake = answer + (scatter === 0 ? 5 : scatter);
      if (fake >= 0) {
        optionsSet.add(fake);
      }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      text: `${num1} ${op === "*" ? "×" : op} ${num2}`,
      options,
      answer,
    };
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
      setTimeLeft(30);
      setScore(0);
      setCurrentQuestion(generateQuestion());
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

  const startGame = () => {
    setCountdown(3);
    setStarting(true);
    setScore(0);
    setFeedback(null);
  };

  const handleAnswer = (option: number) => {
    if (!isPlaying || !currentQuestion || feedback) return;

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 15);
      setFeedback("correct");
      playSound(750, "sine", 0.15);
    } else {
      setScore((prev) => Math.max(0, prev - 5));
      setFeedback("incorrect");
      playSound(200, "sawtooth", 0.2);
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentQuestion(generateQuestion());
    }, 450);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden text-white id-math-game-container">
      {/* Upper stats bar */}
      <div className="flex items-center justify-between w-full mb-4 px-2 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-400" />
          <span className="font-mono text-lg font-bold">
            {starting ? `Arrancando en ${countdown}...` : `${timeLeft}s`}
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
          <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mb-4 border border-pink-500/30">
            <Sparkles className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">⚡ Cálculo Matemático Relámpago</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {instructions || "Resuelve la mayor cantidad posible de operaciones aritméticas en 30 segundos. Las respuestas correctas suman puntos, las incorrectas los restan."}
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold rounded-xl transition duration-150 transform hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            ¡Iniciar Entrenamiento!
          </button>
        </div>
      ) : starting ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-gray-950 rounded-xl border border-gray-800/50">
          <div className="text-7xl font-sans font-black text-pink-400 animate-ping">
            {countdown}
          </div>
          <p className="mt-8 text-sm text-pink-300/80 font-mono tracking-widest uppercase">
            Prepara el cerebro...
          </p>
        </div>
      ) : (
        /* Math Question Arena */
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-slate-950 p-6 rounded-xl border border-gray-800 select-none">
          {currentQuestion && (
            <div className="w-full flex flex-col items-center justify-between h-full gap-8">
              {/* Question card */}
              <div className="relative flex flex-col items-center justify-center py-8 px-12 bg-gray-900 border border-gray-800 rounded-2xl w-full shadow-inner">
                {feedback === "correct" && (
                  <div className="absolute inset-0 bg-green-500/15 flex items-center justify-center rounded-2xl animate-fade-in">
                    <Check className="w-12 h-12 text-green-400 animate-bounce" />
                  </div>
                )}
                {feedback === "incorrect" && (
                  <div className="absolute inset-0 bg-red-500/15 flex items-center justify-center rounded-2xl animate-fade-in">
                    <X className="w-12 h-12 text-red-500 animate-shake" />
                  </div>
                )}
                <span className="text-gray-500 font-mono text-xs tracking-wider uppercase mb-1">Resuelve</span>
                <span className="text-4xl md:text-5xl font-sans font-black tracking-tight text-white drop-shadow">
                  {currentQuestion.text}
                </span>
                <span className="text-pink-400 font-mono text-xs mt-3 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">= ?</span>
              </div>

              {/* Options list */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={feedback !== null}
                    className="py-4 px-6 bg-gray-900 hover:bg-slate-800 border border-gray-800 rounded-xl font-mono text-xl font-bold transition duration-75 text-white active:bg-pink-900/40 active:border-pink-500 disabled:opacity-50 flex items-center justify-center hover:border-pink-500/40"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full text-center mt-3 text-xs text-gray-500 font-mono">
        Correcto: +15 pts | Incorrecto: -5 pts
      </div>
    </div>
  );
}
