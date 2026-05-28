import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Users,
  MessageSquare,
  Plus,
  LogIn,
  Copy,
  Bell,
  Share2,
  LogOut,
  Globe,
  Sliders,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Gamepad2,
  Zap,
  Volume2,
  VolumeX,
  Calendar,
  Lock,
} from "lucide-react";
import { Room, Game, ScoreRecord, RoomNotification, Message, WeekConfig } from "./types";
import GameHost from "./components/GameHost";

export default function App() {
  // Authentication & Nickname
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem("gameportal_nickname") || "";
  });
  const [tempNickname, setTempNickname] = useState("");

  const [pin, setPin] = useState<string>(() => {
    return localStorage.getItem("gameportal_pin") || "";
  });
  const [tempPin, setTempPin] = useState("");

  // Joined rooms list
  const [userRooms, setUserRooms] = useState<any[]>([]);

  // Room State
  const [roomCode, setRoomCode] = useState<string>(() => {
    return localStorage.getItem("gameportal_roomcode") || "";
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [roomNameInput, setRoomNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Weeks & Active Selection
  const [weeks, setWeeks] = useState<WeekConfig[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");
  const [currentWeekId, setCurrentWeekId] = useState<string>("");

  // Games & Active Game Selector
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Leaderboard data
  const [leaderboardTab, setLeaderboardTab] = useState<"daily" | "global">("daily");
  const [leaderboardScope, setLeaderboardScope] = useState<"room" | "global-all">("room");
  const [leaderboardScores, setLeaderboardScores] = useState<{ daily: ScoreRecord[]; global: ScoreRecord[] }>({
    daily: [],
    global: [],
  });

  // UI Tabs & Interactive State
  const [activeViewTab, setActiveViewTab] = useState<"play" | "chat" | "ranks">("play");
  const [chatMessage, setChatMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [muteSound, setMuteSound] = useState(false);

  // In-app alert toasts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);
  
  // Refs for auto scrolling chat container
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  // First-load layout fetcher
  useEffect(() => {
    fetchWeeks();
    fetchAllGames();
  }, []);

  // Sync user's joined rooms when nickname is loaded
  useEffect(() => {
    if (nickname) {
      fetchUserRooms();
    }
  }, [nickname]);

  const fetchUserRooms = async () => {
    try {
      const res = await fetch(`/api/users/${nickname}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setUserRooms(data.rooms || []);
      }
    } catch (e) {
      console.error("Error fetching user rooms", e);
    }
  };

  // Poll active Room data and Leaderboard regularly
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      return;
    }

    // Immediate initial fetch
    syncRoomData();
    syncLeaderboards();

    const interval = setInterval(() => {
      syncRoomData();
      syncLeaderboards();
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, selectedGameId, selectedWeekId, leaderboardScope]);

  // Sync leaderboards depending on current selected game
  const syncLeaderboards = async () => {
    if (!selectedGameId || !selectedWeekId) return;
    try {
      const scopeFilter = leaderboardScope === "room" && roomCode ? `&roomId=${roomCode}` : "";
      const res = await fetch(`/api/leaderboards?gameId=${selectedGameId}&weekId=${selectedWeekId}${scopeFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardScores(data);
      }
    } catch (e) {
      console.error("Error updating leaderboards", e);
    }
  };

  // Sync full Room state (players, chat, and notification events)
  const syncRoomData = async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        const updatedRoom = data.room as Room;
        setRoom(updatedRoom);

        // Process new room notifications for toast display
        if (updatedRoom.notifications) {
          updatedRoom.notifications.forEach((notif) => {
            if (!processedNotificationsRef.current.has(notif.id)) {
              processedNotificationsRef.current.add(notif.id);
              
              // Only trigger toast if it didn't occur hours ago (e.g., within last 12 seconds)
              const timeDiff = Date.now() - new Date(notif.timestamp).getTime();
              if (timeDiff < 12000) {
                triggerToast(notif.message, notif.type);
              }
            }
          });
        }
      } else if (res.status === 404) {
        // Room expired or deleted locally in client state, but check if we should keep it in userRooms
        setRoomCode("");
        localStorage.removeItem("gameportal_roomcode");
      }
    } catch (e) {
      console.error("Error syncing room", e);
    }
  };

  // Auto-scroll chat container to bottom when room chat updates
  useEffect(() => {
    if (room?.messages && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [room?.messages?.length, activeViewTab]);

  const fetchWeeks = async () => {
    try {
      const res = await fetch("/api/weeks");
      if (res.ok) {
        const data = await res.json();
        setWeeks(data.weeks || []);
        setCurrentWeekId(data.currentWeekId);
        setSelectedWeekId((prev) => prev || data.currentWeekId);
      }
    } catch (e) {
      console.error("Error fetching weeks profile", e);
    }
  };

  const fetchAllGames = async () => {
    try {
      const res = await fetch("/api/games");
      if (res.ok) {
        const data = await res.json();
        setAllGames(data.games || []);
      }
    } catch (e) {
      console.error("Error fetching all games list", e);
    }
  };

  // Derive dynamic details based on selected week config
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);
  const activeWeekGames = allGames.filter((g) => {
    return selectedWeek ? selectedWeek.games.includes(g.id) : true;
  });

  // Keep selectedGameInSync with week changes
  useEffect(() => {
    if (activeWeekGames.length > 0) {
      const found = activeWeekGames.find((g) => g.id === selectedGameId);
      if (!found) {
        setSelectedGameId(activeWeekGames[0].id);
      }
    }
  }, [selectedWeekId, activeWeekGames]);

  // Derived active game object
  const activeGame = allGames.find((g) => g.id === selectedGameId) || null;

  const triggerToast = (message: string, type: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Play alert audio synth
    if (!muteSound) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(type === "score" ? 650 : 520, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (err) {}
    }

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Login / Register profile authentication
  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanNick = tempNickname.trim();
    const cleanPin = tempPin.trim();

    if (!cleanNick || cleanPin.length !== 4 || isNaN(Number(cleanPin))) {
      setErrorMsg("Debes ingresar un apodo y un PIN numérico de 4 dígitos.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: cleanNick, pin: cleanPin }),
      });
      const data = await res.json();
      if (res.ok) {
        setNickname(cleanNick);
        setPin(cleanPin);
        localStorage.setItem("gameportal_nickname", cleanNick);
        localStorage.setItem("gameportal_pin", cleanPin);
        
        // Trigger toast alerts
        triggerToast(data.message || "👋 Inicio de sesión exitoso.", "score");
        
        // Load user joined clanes
        fetchUserRooms();
      } else {
        setErrorMsg(data.error || "PIN incorrecto o error al acceder");
      }
    } catch (err) {
      setErrorMsg("Fallo al conectar con el servidor de autenticación.");
    }
  };

  const handleLogoutNickname = () => {
    setNickname("");
    setPin("");
    setRoomCode("");
    setUserRooms([]);
    localStorage.removeItem("gameportal_nickname");
    localStorage.removeItem("gameportal_pin");
    localStorage.removeItem("gameportal_roomcode");
  };

  // Create customized room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!roomNameInput.trim()) {
      setErrorMsg("Debes asignarle un nombre a tu sala de amigos");
      return;
    }
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomNameInput, creator: nickname }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCode(data.room.code);
        setRoom(data.room);
        localStorage.setItem("gameportal_roomcode", data.room.code);
        setRoomNameInput("");
        setSuccessMsg("¡Sala creada correctamente! Invita a tus amigos.");
        fetchUserRooms();
      } else {
        setErrorMsg(data.error || "Ocurrió un error al crear la sala");
      }
    } catch (e) {
      setErrorMsg("Fallo al conectar con el servidor.");
    }
  };

  // Join Existing Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = joinCodeInput.trim().toLowerCase();
    if (!cleanCode) {
      setErrorMsg("Debe ingresar el código de sala de tu grupo");
      return;
    }

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, nickname }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCode(data.room.code);
        setRoom(data.room);
        localStorage.setItem("gameportal_roomcode", data.room.code);
        setJoinCodeInput("");
        setSuccessMsg("👋 ¡Listo! Te has unido correctamente a la sala.");
        fetchUserRooms();
      } else {
        setErrorMsg(data.error || "Código de sala no válido o expirado");
      }
    } catch (e) {
      setErrorMsg("Fallo al conectar con el servidor para unir sala.");
    }
  };

  // Leave Room
  const handleLeaveRoom = () => {
    setRoomCode("");
    setRoom(null);
    localStorage.removeItem("gameportal_roomcode");
  };

  // Submit Score Handler
  const handleScoreSubmit = async (score: number) => {
    if (!roomCode || !nickname || !selectedGameId || !selectedWeekId) return;

    // First visual check
    if (selectedWeek?.isClosed) {
      triggerToast("⚠️ Esta semana ya finalizó. Tu puntaje no se registrará en el ranking competitivo oficial.", "chat_alert");
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${roomCode}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: nickname,
          score,
          gameId: selectedGameId,
          weekId: selectedWeekId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Trigger local celebration
        triggerToast(`🎉 ¡Batiste récord personal! Registraste ${score} puntos.`, "score");
        syncLeaderboards();
        syncRoomData();
      } else {
        triggerToast(`⚠️ ${data.error || "Error al subir puntaje"}`, "chat_alert");
      }
    } catch (e) {
      console.error("Error submitting score", e);
    }
  };

  // Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = chatMessage.trim();
    if (!cleanMsg || !roomCode) return;

    try {
      const res = await fetch(`/api/rooms/${roomCode}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: nickname,
          text: cleanMsg,
        }),
      });
      if (res.ok) {
        setChatMessage("");
        syncRoomData();
      }
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  // Admin override Game selection of the day
  const handleAdminSetGame = (gameId: string) => {
    setSelectedGameId(gameId);
    const found = allGames.find((g) => g.id === gameId);
    if (found) {
      triggerToast(`🛠️ Administrador seleccionó: ${found.name}`, "score");
    }
  };

  // Auto Copy Room Code
  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode.toUpperCase());
    triggerToast("📋 Código de sala copiado al portapapeles", "score");
  };

  // Switch Room instantly from sidebar
  const handleSwitchRoom = (code: string) => {
    const cleanCode = code.toLowerCase().trim();
    setRoomCode(cleanCode);
    localStorage.setItem("gameportal_roomcode", cleanCode);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#070913] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] text-slate-200 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-10 relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>

      {/* Dynamic Animated Status/Alert Toasts (Real-time Online Push simulation) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full font-sans">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 bg-slate-900/80 backdrop-blur-md border ${
              toast.type === "score" ? "border-amber-500/30" : "border-indigo-500/30"
            } rounded-2xl shadow-xl transform transition-all duration-300 animate-slide-in relative overflow-hidden`}
          >
            {/* Visual warning indicator */}
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${
              toast.type === "score" ? "bg-amber-500" : "bg-indigo-500"
            }`} />

            <div className="flex-1 mt-0.5">
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block mb-1 font-mono">
                [ ALERTA DE SISTEMA ]
              </span>
              <p className="text-xs font-semibold text-slate-200 leading-snug">{toast.message}</p>
            </div>
            
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-500 hover:text-white transition text-xs font-bold leading-none px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Top Branding Navbar */}
      <header className="glass-panel sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wider text-white font-future uppercase flex items-center gap-2">
                Arcade Portal <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded-full font-mono tracking-normal">Clans</span>
              </h1>
              <p className="text-[9px] text-indigo-400/80 font-mono tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                SISTEMA ONLINE CONECTADO
              </p>
            </div>
          </div>

          {/* Quick status controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMuteSound(!muteSound)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-905 rounded-xl border border-transparent hover:border-slate-800 transition cursor-pointer"
              title={muteSound ? "Activar beeps de audio" : "Silenciar beeps de audio"}
            >
              {muteSound ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>

            {nickname && activeGame && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`flex items-center gap-1.5 text-[10px] font-mono py-1.5 px-3 rounded-xl border transition-all uppercase font-bold cursor-pointer ${
                  showAdminPanel 
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-305 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                    : "bg-slate-955/60 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Pruebas</span>
              </button>
            )}

            {nickname && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-xs font-bold font-mono text-indigo-400">@{nickname}</span>
                <button
                  onClick={handleLogoutNickname}
                  className="p-1 hover:text-rose-455 text-slate-500 transition ml-1 cursor-pointer"
                  title="Cambiar Nickname"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center relative z-10">
        
        {/* Step 1: Set Profile Nickname & PIN */}
        {!nickname ? (
          <div className="w-full max-w-md mx-auto my-12 glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-slate-800/80 neon-glow-indigo">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 mx-auto">
              <Users className="w-7 h-7 text-indigo-400" />
            </div>
            
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-future mb-2 text-center">Acceso de Jugador</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans text-center">
              Registra o accede a tu cuenta con un apodo y PIN exclusivo para guardar tus clanes y marcas.
            </p>

            <form onSubmit={handleSaveNickname} className="space-y-4">
              <div className="text-left font-sans">
                <label className="block text-left text-[10px] font-future uppercase tracking-widest text-indigo-400 mb-2">
                  _INGRESAR APODO
                </label>
                <input
                  type="text"
                  maxLength={15}
                  required
                  placeholder="Ej. didac_pro"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value.replace(/\s+/g, ""))}
                  className="w-full px-4 py-3 bg-slate-955/80 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans tracking-wide transition text-center font-medium mb-4"
                />

                <label className="block text-left text-[10px] font-future uppercase tracking-widest text-indigo-400 mb-2">
                  _PIN DE SEGURIDAD (4 DÍGITOS)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 bg-slate-955/80 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans tracking-widest transition text-center font-medium"
                />
                <span className="block text-[9px] text-slate-500 mt-2 font-mono uppercase leading-relaxed text-center">
                  * Si es un apodo nuevo, este PIN se registrará. Si ya existe, introduce tu PIN original para ingresar.
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-300 font-sans text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-650 hover:from-indigo-600 hover:to-violet-750 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
              >
                <span>Acceder al Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : !roomCode ? (
          /* Step 2: Join or Create Room Panels */
          <div className="w-full max-w-4xl mx-auto my-6 grid md:grid-cols-2 gap-8 font-sans">
            
            {/* Create Room Box */}
            <div className="glass-panel p-8 rounded-3xl shadow-xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30">
                  <Plus className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-future mb-2">Crear nueva sala</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Crea un clan de competencia oficial. Al hacerlo, recibirás un código autodeclarado para compartir con tu equipo en tiempo real.
                </p>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-future uppercase tracking-widest text-purple-400 mb-2">
                    _Nombre del Clan / Sala
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    placeholder="Ej. Los Reyes del Click"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-955/80 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none font-sans transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-650 hover:from-purple-600 hover:to-indigo-750 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  Crear e Invitar 🎮
                </button>
              </form>
            </div>

            {/* Join Room Box */}
            <div className="glass-panel p-8 rounded-3xl shadow-xl flex flex-col justify-between hover:border-cyan-500/20 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 border border-cyan-500/30">
                  <LogIn className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-future mb-2">Unirse a sala de amigos</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  ¿Tus amigos ya tienen una sala activa? Solicítale tu invitación de 5 caracteres e regístrala para competir hoy.
                </p>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-future uppercase tracking-widest text-cyan-400 mb-2">
                    _CÓDIGO DE ACCESO (5 Carácteres)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="Ej. abcde"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 bg-slate-955/80 border border-slate-800 rounded-xl text-cyan-400 focus:text-white focus:border-cyan-500 outline-none font-sans tracking-widest text-center uppercase transition font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-650 hover:from-cyan-600 hover:to-indigo-750 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  Unirme al Clan 👋
                </button>
              </form>
            </div>

            {/* User rooms list if they have already joined some rooms */}
            {userRooms.length > 0 && (
              <div className="col-span-1 md:col-span-2 glass-panel p-6 rounded-3xl shadow-lg">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-future mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Mis Clanes Activos ({userRooms.length})
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  Ya eres miembro de estas salas de juego. Haz clic en cualquiera para ingresar de inmediato.
                </p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {userRooms.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => handleSwitchRoom(r.code)}
                      className="p-4 bg-slate-955/40 border border-slate-850 hover:border-slate-750 rounded-2xl text-left transition-all duration-300 cursor-pointer flex justify-between items-center group"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block truncate max-w-[150px]">{r.name}</span>
                        <span className="text-[9px] font-mono text-indigo-400 mt-1 block uppercase">COD: {r.code}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-all transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Errors alert container */}
            {(errorMsg || successMsg) && (
              <div className="col-span-1 md:col-span-2 mt-2">
                {errorMsg && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-300 font-sans text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-300 font-sans text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Step 3: Active Gaming Hub Interface (Multiplayer and Chat) */
          <div className="flex flex-col gap-6">
            
            {/* Sub-Header Widget: Active Room, Code Copy & Global Status */}
            <div className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-slate-800 text-lg">
                  🏠
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-future">{room?.name || "Cargando sala..."}</h3>
                    <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono text-[9px] border border-indigo-500/20 uppercase font-black">
                      SALÓN CLAN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>{room?.players.length || 1} jugadores en red</span>
                  </p>
                </div>
              </div>

              {/* Code display with automated clipboard action */}
              <div className="flex items-center gap-3 font-mono">
                <div className="bg-slate-950/60 px-3 py-2 border border-slate-800 flex items-center gap-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase">INVITACIÓN:</span>
                  <span className="text-xs font-black text-rose-400 tracking-wider font-mono">
                    {roomCode.toUpperCase()}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition cursor-pointer"
                    title="Copiar código de invitación"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] text-rose-455 font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Salir
                </button>
              </div>
            </div>

            {/* Admin Override Control Panel */}
            {showAdminPanel && (
              <div className="glass-panel border-amber-500/25 bg-amber-500/5 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-future">🛠️ Manual Admin: Forzar Selección</h4>
                </div>
                <p className="text-[10px] text-amber-200/70 mb-4 max-w-2xl leading-relaxed">
                  Usa estos modificadores manuales para forzar la recreación del juego de prueba. Los navegadores conectados se alinearán de inmediato.
                </p>
                <div className="flex flex-wrap gap-2">
                  {allGames.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleAdminSetGame(g.id)}
                      className={`px-3 py-1.5 text-[10px] font-bold border transition-all rounded-xl uppercase cursor-pointer ${
                        selectedGameId === g.id
                          ? "bg-amber-500 text-black border-amber-600 shadow-md shadow-amber-500/20"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Week Selector Bar */}
            <div className="glass-panel p-5 rounded-2xl shadow-lg">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-future">Desafíos Semanales</h4>
                    <p className="text-[10px] text-slate-400">Selecciona una temporada para competir en sus minijuegos exclusivos</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {weeks.map((wk) => {
                    const isSelected = wk.id === selectedWeekId;
                    const isActive = wk.id === currentWeekId;
                    return (
                      <button
                        key={wk.id}
                        onClick={() => setSelectedWeekId(wk.id)}
                        className={`px-4 py-2 border transition-all flex items-center gap-2 rounded-xl uppercase font-bold cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-indigo-500 to-indigo-650 text-white border-transparent shadow-lg shadow-indigo-500/20 font-extrabold"
                            : "bg-slate-955/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <span>{wk.name}</span>
                        {isActive && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black px-1.5 py-0.2 rounded-full">
                            Actual
                          </span>
                        )}
                        {wk.isClosed && (
                          <span className="text-slate-500 self-center">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Interactive Bento Columns */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              
              {/* Column 1: Joined Rooms List (Sidebar - 2 cols) */}
              <div className="lg:col-span-2 glass-panel p-4 shadow-lg h-[540px] flex flex-col rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-future">Mis Clanes</h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {userRooms.length > 0 ? (
                    userRooms.map((r) => {
                      const isCurrent = r.code === roomCode;
                      return (
                        <button
                          key={r.code}
                          onClick={() => handleSwitchRoom(r.code)}
                          className={`w-full p-3 border text-left transition-all duration-200 rounded-xl cursor-pointer block ${
                            isCurrent
                              ? "bg-indigo-500/10 border-indigo-500/40 text-white font-bold"
                              : "bg-slate-955/40 border-slate-900 hover:border-slate-800 text-slate-350"
                          }`}
                        >
                          <span className="text-xs block truncate">{r.name}</span>
                          <span className="text-[8px] font-mono text-indigo-400 mt-1 block uppercase">COD: {r.code}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center p-4 text-[9px] text-slate-500 uppercase leading-relaxed font-mono">
                      No estás en ninguna sala. ¡Crea o únete a una!
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Active Game (Center-Left - 5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                
                {/* Active Daily Game Widget */}
                {activeGame ? (
                  <div className="glass-panel p-6 shadow-lg relative overflow-hidden rounded-2xl border border-slate-800/80">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex flex-col mb-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                          </span>
                          <div>
                            <span className="text-[9px] text-indigo-400 font-mono tracking-widest uppercase font-black block">
                              _MINIJUEGO SELECCIONADO
                            </span>
                            <h3 className="text-base font-bold text-white uppercase tracking-wider font-future">{activeGame.name}</h3>
                          </div>
                        </div>
                      </div>

                      {/* Warning if historical week is closed to alert student practice MODE */}
                      {selectedWeek?.isClosed && (
                        <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-305 text-[10px] flex items-center gap-2 font-mono">
                          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>TABLA CERRADA. ESTÁS JUGANDO EN EL MODO ENTRENAMIENTO/PRÁCTICA.</span>
                        </div>
                      )}
                    </div>

                    {/* Game Display Container */}
                    <GameHost
                      game={activeGame}
                      playerNickname={nickname}
                      onScoreSubmit={handleScoreSubmit}
                    />
                  </div>
                ) : (
                  <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl text-xs uppercase">
                    Selecciona un minijuego de la semana para comenzar...
                  </div>
                )}

                {/* Sub-Widget: List of other available games */}
                <div className="glass-panel p-5 rounded-2xl shadow-lg border border-slate-800/80">
                  <h4 className="text-[10px] font-future uppercase tracking-widest text-cyan-400 mb-3 block">
                    _🕹️ MINIJUEGOS DE ESTA SEMANA (ELIGE PARA JUGAR)
                  </h4>
                  <div className="space-y-2">
                    {activeWeekGames.map((g) => {
                      const isSelected = selectedGameId === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGameId(g.id)}
                          className={`w-full p-4 border text-left transition-all duration-300 flex items-center justify-between rounded-2xl cursor-pointer ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-md"
                              : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-350"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-indigo-400 text-glow-indigo font-future" : "text-white"}`}>{g.name}</span>
                              {isSelected && (
                                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] px-1.5 py-0.2 rounded-full font-mono uppercase font-black tracking-widest">
                                  ON
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{g.description}</p>
                          </div>
                          <span className="text-[9px] font-mono text-slate-300 bg-slate-950/60 px-2 py-1 border border-slate-800 shrink-0 ml-2 rounded-xl uppercase">
                            {g.genre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 3: Leaderboards Table & Scope Switch (Center-Right - 2.5 cols -> lg:col-span-2) */}
              <div className="lg:col-span-2 glass-panel p-4 shadow-lg h-[540px] flex flex-col rounded-2xl border border-slate-800/80">
                
                {/* Header classifying tab selects */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-future">Rankings</h3>
                  </div>
                  
                  {/* Scope filter selector */}
                  <select
                    value={leaderboardScope}
                    onChange={(e) => setLeaderboardScope(e.target.value as any)}
                    className="bg-slate-950 text-[10px] text-slate-300 font-semibold py-1 px-1 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all cursor-pointer uppercase font-sans max-w-[80px]"
                  >
                    <option value="room">Sala 🏠</option>
                    <option value="global-all">Global 🌎</option>
                  </select>
                </div>

                {/* Switcher tabs */}
                <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 border border-slate-800 rounded-xl mb-4 font-sans">
                  <button
                    onClick={() => setLeaderboardTab("daily")}
                    className={`py-1.5 px-1 text-[9px] uppercase font-black transition-all rounded-lg cursor-pointer truncate ${
                      leaderboardTab === "daily"
                        ? "bg-slate-855 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setLeaderboardTab("global")}
                    className={`py-1.5 px-1 text-[9px] uppercase font-black transition-all rounded-lg cursor-pointer truncate ${
                      leaderboardTab === "global"
                        ? "bg-slate-855 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Histórico
                  </button>
                </div>

                {/* Leaderboard Table Content */}
                <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1 custom-scrollbar">
                  {/* Select corresponding ranking array */}
                  {((leaderboardTab === "daily" ? leaderboardScores.daily : leaderboardScores.global) || []).length > 0 ? (
                    (leaderboardTab === "daily" ? leaderboardScores.daily : leaderboardScores.global).map((record, index) => {
                      const isMe = record.player.toLowerCase() === nickname.toLowerCase();
                      
                      return (
                        <div
                          key={record.id}
                          className={`p-2 border transition-all duration-200 flex items-center justify-between rounded-xl ${
                            isMe 
                              ? "bg-indigo-500/10 border-indigo-500/30 font-bold" 
                              : "bg-slate-955/40 border-slate-900 hover:border-slate-805"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 ml-0.5">
                            {/* Rank Badge */}
                            <div className={`w-4 h-4 flex items-center justify-center font-mono text-[8px] font-black rounded-lg ${
                              index === 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold" :
                              index === 1 ? "bg-slate-300/20 text-slate-300 border border-slate-300/40" :
                              index === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/40" : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-205 block truncate max-w-[65px]">
                                {isMe ? `@${record.player}` : `@${record.player}`}
                              </span>
                              <span className="block text-[7px] font-mono text-gray-500 mt-0.5">
                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-[10px] font-bold text-amber-505">
                              {record.score}
                            </span>
                            <span className="block text-[6px] tracking-wider text-slate-500 uppercase">
                              pts
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 h-full font-sans">
                      <Trophy className="w-5 h-5 text-slate-805 mb-2" />
                      <p className="text-[9px] text-slate-500 uppercase">Sin marcas.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-center text-[8px] font-mono text-gray-500 uppercase tracking-wider leading-normal">
                  MARCAS DEL JUEGO.
                </div>
              </div>

              {/* Column 4: Integrated Live Chat & Notification Feed (Right - 3 cols) */}
              <div className="lg:col-span-3 glass-panel h-[540px] flex flex-col shadow-lg overflow-hidden rounded-2xl border border-slate-800/80">
                
                {/* Chat Top Banner */}
                <div className="flex items-center justify-between bg-slate-950/60 p-3.5 border-b border-slate-800 font-sans">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-future">Chat de Clan</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] text-emerald-400 font-mono tracking-wider font-bold">ONLINE</span>
                  </div>
                </div>

                {/* Message display container */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-[11px]">
                  {room?.messages && room.messages.length > 0 ? (
                    room.messages.map((msg) => {
                      const isMe = msg.sender.toLowerCase() === nickname.toLowerCase();
                      const isBot = msg.sender === "Sistema Bot";

                      if (isBot) {
                        return (
                          <div key={msg.id} className="text-center">
                            <span className="inline-block text-[8px] font-mono text-indigo-400/80 bg-slate-950/50 border border-indigo-500/10 px-3 py-1.5 max-w-[90%] break-words rounded-xl uppercase">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <span className="text-[9px] font-mono text-slate-500 mb-0.5 px-0.5 block">
                            @{msg.sender}
                          </span>
                          <div
                            className={`p-2.5 border text-[11px] leading-relaxed break-words ${
                              isMe
                                ? "bg-indigo-655/15 border-indigo-500/25 text-white rounded-2xl rounded-tr-none"
                                : "bg-slate-950/60 border-slate-850 text-slate-300 rounded-2xl rounded-tl-none"
                            }`}
                          >
                            <p>{msg.text}</p>
                          </div>
                          <span className="text-[7px] font-mono text-gray-500/80 mt-1 px-0.5 block">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 h-full select-none">
                      <MessageSquare className="w-5 h-5 text-slate-800 mb-2" />
                      <p className="text-[9px] text-slate-500 uppercase">Saluda a los miembros de tu clan.</p>
                    </div>
                  )}
                </div>

                {/* Message input Form */}
                <form onSubmit={handleSendChat} className="p-3 bg-slate-955/40 border-t border-slate-800 flex gap-2 font-sans">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="DIGITA MENSAJE..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Structured Styled Footer */}
      <footer className="mt-auto border-t border-slate-900/60 pt-6 font-mono relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            &copy; 1989-2026 Portal Arcade Clan. Todos los derechos reservados.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 bg-slate-950/40 border border-slate-850/60 text-slate-550 text-[8px] tracking-wider uppercase px-3 py-1 rounded-full w-fit mx-auto select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Estableciendo conexión persistente con nodo SupaDB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
