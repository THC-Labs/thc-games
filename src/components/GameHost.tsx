import React, { useState } from "react";
import ClickerGame from "./ClickerGame";
import MathGame from "./MathGame";
import MemoryGame from "./MemoryGame";
import ReactionGame from "./ReactionGame";
import TypingGame from "./TypingGame";
import { Game } from "../types";
import { Award, RefreshCw, Trophy } from "lucide-react";

interface GameHostProps {
  game: Game;
  onScoreSubmit: (score: number) => void;
  playerNickname: string;
}

export default function GameHost({ game, onScoreSubmit, playerNickname }: GameHostProps) {
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleGameFinish = (score: number) => {
    setLatestScore(score);
    setHasSubmitted(false);
  };

  const handleSubmitScore = () => {
    if (latestScore === null) return;
    onScoreSubmit(latestScore);
    setHasSubmitted(true);
  };

  const handleRetry = () => {
    setLatestScore(null);
    setHasSubmitted(false);
  };

  const renderActiveGame = () => {
    switch (game.id) {
      case "clicker_veloz":
        return <ClickerGame onFinish={handleGameFinish} instructions={game.instructions} />;
      case "calculo_relampago":
        return <MathGame onFinish={handleGameFinish} instructions={game.instructions} />;
      case "secuencia_memoria":
        return <MemoryGame onFinish={handleGameFinish} instructions={game.instructions} />;
      case "reaccion_rapida":
        return <ReactionGame onFinish={handleGameFinish} instructions={game.instructions} />;
      case "escribe_rapido":
        return <TypingGame onFinish={handleGameFinish} instructions={game.instructions} />;
      default:
        return <ClickerGame onFinish={handleGameFinish} instructions={game.instructions} />;
    }
  };

  if (latestScore !== null) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#0b0c16]/80 backdrop-blur-md border border-slate-800/80 rounded-3xl w-full max-w-lg mx-auto shadow-2xl text-center text-white id-game-host-score">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20 animate-pulse-glow">
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="text-2xl font-bold font-future mb-1">¡Partida Completada!</h3>
        <p className="text-sm text-slate-405 mb-6">Buen intento, {playerNickname}. Tu puntaje es:</p>
        
        <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 mb-2 font-future tracking-tight">
          {latestScore}
        </div>
        <span className="text-xs text-amber-400/80 uppercase font-mono tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-8">
          Puntos Conseguidos
        </span>

        <div className="flex flex-col gap-3 w-full">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmitScore}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl transition duration-150 shadow-lg shadow-amber-500/20 transform active:scale-[0.98] cursor-pointer"
            >
              Publicar Puntaje en Leaderboard 🚀
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-semibold mb-2 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Puntaje guardado en SupaDB
            </div>
          )}

          <button
            onClick={handleRetry}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Jugar de Nuevo (Entrenar)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Jugando Como</span>
          <h4 className="text-xs font-bold text-slate-205 flex items-center gap-1.5 mt-0.5">👑 {playerNickname}</h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-405 font-mono tracking-widest uppercase">Competencia</span>
          <h4 className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{game.genre}</h4>
        </div>
      </div>
      {renderActiveGame()}
    </div>
  );
}
