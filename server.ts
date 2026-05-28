import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Interfaces for our custom data model
interface Player {
  nickname: string;
  joinedAt: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

interface ScoreRecord {
  id: string;
  player: string;
  score: number;
  gameId: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  weekId?: string; // Partition high scores by week
}

interface RoomNotification {
  id: string;
  type: 'join' | 'score' | 'chat_alert';
  message: string;
  timestamp: string;
}

interface Room {
  code: string;
  name: string;
  creator: string;
  players: Player[];
  messages: Message[];
  notifications: RoomNotification[];
  createdAt: string;
}

interface Game {
  id: string;
  name: string;
  description: string;
  instructions: string;
  genre: string;
}

// Predefined available games
const GAMES: Game[] = [
  {
    id: "clicker_veloz",
    name: "🎯 Clicker Veloz",
    description: "Un desafío de reflejos y velocidad. Haz clic en los objetivos móviles que aparecen en pantalla antes de que expire el tiempo.",
    instructions: "Haz clic en la diana roja móvil tan rápido como puedas. Los círculos más pequeños otorgan más puntos. ¡Tienes 15 segundos!",
    genre: "Reflejos"
  },
  {
    id: "calculo_relampago",
    name: "⚡ Cálculo Matemático",
    description: "Una carrera mental de cálculo rápido. Resuelve la mayor cantidad posible de ecuaciones matemáticas simples.",
    instructions: "Resuelve operaciones matemáticas de suma, resta y multiplicación. Cada respuesta correcta te da +15 puntos, los fallos restan 5 puntos. ¡Tienes 30 segundos!",
    genre: "Agilidad Mental"
  },
  {
    id: "secuencia_memoria",
    name: "🧠 Memoria Grid",
    description: "Pon a prueba tu memoria visual a corto plazo repitiendo una secuencia de cuadrículas que aumenta de tamaño.",
    instructions: "Observa atentamente el patrón de casillas iluminadas y repítelo en el orden exacto. Cada nivel completado te otorga más puntos, ¡un error y termina el juego!",
    genre: "Memoria"
  },
  {
    id: "reaccion_rapida",
    name: "⚡ Reflejos de Color",
    description: "Pon a prueba tus reflejos visuales inmediatos reaccionando al cambio cromático de la pantalla.",
    instructions: "Mantente atento. Haz clic en la pantalla en el milisegundo exacto en que cambie a color verde brillante. ¡Hazlo 5 veces para conseguir el mejor promedio!",
    genre: "Reflejos"
  },
  {
    id: "escribe_rapido",
    name: "⌨️ Palabras Relámpago",
    description: "Teclea las palabras flotantes a toda velocidad sin cometer fallos en el teclado.",
    instructions: "Escribe las palabras lo más rápido que puedas. ¡Las palabras más largas otorgan sustancialmente más puntos! Tienes 15 segundos.",
    genre: "Destreza"
  }
];

interface WeekConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  games: string[];
}

const WEEKS_DATA: WeekConfig[] = [
  {
    id: "2026-W20",
    name: "Semana 20 (Retro Desafío)",
    startDate: "2026-05-11",
    endDate: "2026-05-17",
    games: ["clicker_veloz", "calculo_relampago", "secuencia_memoria", "reaccion_rapida", "escribe_rapido"]
  },
  {
    id: "2026-W21",
    name: "Semana 21 (Supercopa Cerebral)",
    startDate: "2026-05-18",
    endDate: "2026-05-24",
    games: ["clicker_veloz", "calculo_relampago", "secuencia_memoria", "reaccion_rapida", "escribe_rapido"]
  },
  {
    id: "2026-W22",
    name: "Semana 22 (Campeonato de Primavera)",
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    games: ["clicker_veloz", "calculo_relampago", "secuencia_memoria", "reaccion_rapida", "escribe_rapido"]
  },
  {
    id: "2026-W23",
    name: "Semana 23 (Desafío del Sol)",
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    games: ["clicker_veloz", "calculo_relampago", "secuencia_memoria", "reaccion_rapida", "escribe_rapido"]
  }
];

function getCurrentWeekId(): string {
  const todayStr = new Date().toISOString().split("T")[0];
  const active = WEEKS_DATA.find(w => todayStr >= w.startDate && todayStr <= w.endDate);
  return active ? active.id : "2026-W22"; // Default to systems current week
}

const DB_FILE = path.join(process.cwd(), "supadb.json");

// Local DB State that acts as "SupaDB"
class SupaDB {
  private data: {
    rooms: Record<string, Room>;
    scores: ScoreRecord[];
    currentDailyGameId: string;
    lastGameUpdateDate: string;
  } = {
    rooms: {},
    scores: [],
    currentDailyGameId: "clicker_veloz",
    lastGameUpdateDate: ""
  };

  constructor() {
    this.load();
    this.updateDailyGameAutomatically();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        console.log("💾 SupaDB: Datos cargados exitosamente desde", DB_FILE);
      } else {
        this.save();
      }
    } catch (e) {
      console.error("❌ Fallo al cargar SupaDB, inicializando datos vacíos", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("❌ Fallo al escribir en SupaDB", e);
    }
  }

  // Auto update game of the day based on the calendar day to make it dynamic
  public updateDailyGameAutomatically() {
    const todayStr = new Date().toISOString().split("T")[0];
    if (this.data.lastGameUpdateDate !== todayStr) {
      // Pick a semi-random game based on date hash
      const hash = todayStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const gameIndex = hash % GAMES.length;
      this.data.currentDailyGameId = GAMES[gameIndex].id;
      this.data.lastGameUpdateDate = todayStr;
      this.save();
      console.log(`📅 SupaDB: Juego del día actualizado para hoy (${todayStr}): ${this.data.currentDailyGameId}`);
    }
  }

  // Get current game of the day
  public getDailyGame(): Game {
    this.updateDailyGameAutomatically();
    const game = GAMES.find(g => g.id === this.data.currentDailyGameId);
    return game || GAMES[0];
  }

  public setDailyGame(gameId: string): boolean {
    const exists = GAMES.some(g => g.id === gameId);
    if (exists) {
      this.data.currentDailyGameId = gameId;
      this.save();
      return true;
    }
    return false;
  }

  // Rooms logic
  public getRoom(code: string): Room | null {
    return this.data.rooms[code.toLowerCase()] || null;
  }

  public createRoom(name: string, creator: string): Room {
    // Generate a unique room code of 5 alphanumeric digits
    let code = "";
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    do {
      code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.data.rooms[code]);

    const newRoom: Room = {
      code: code,
      name: name,
      creator: creator,
      players: [{ nickname: creator, joinedAt: new Date().toISOString() }],
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "Sistema Bot",
          text: `¡Bienvenidos a la sala ${name}! Creador por ${creator}. El juego del día está listo para jugar.`,
          timestamp: new Date().toISOString()
        }
      ],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          type: "join",
          message: `👤 ${creator} creó la sala de juegos.`,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.data.rooms[code] = newRoom;
    this.save();
    return newRoom;
  }

  public joinRoom(code: string, nickname: string): Room | null {
    const cleanCode = code.toLowerCase().trim();
    const room = this.data.rooms[cleanCode];
    if (!room) return null;

    // Check if user already in players
    const userExists = room.players.some(
      p => p.nickname.toLowerCase() === nickname.toLowerCase()
    );

    if (!userExists) {
      room.players.push({
        nickname: nickname,
        joinedAt: new Date().toISOString()
      });

      // System notification
      const timestamp = new Date().toISOString();
      room.notifications.push({
        id: `notif-${Date.now()}-${Math.random()}`,
        type: "join",
        message: `👋 ¡${nickname} se ha unido al grupo!`,
        timestamp
      });

      room.messages.push({
        id: `join-msg-${Date.now()}`,
        sender: "Sistema Bot",
        text: `¡${nickname} se ha unido al grupo! Prepárate para competir.`,
        timestamp
      });

      this.save();
    }

    return room;
  }

  public addMessage(code: string, sender: string, text: string): Message | null {
    const room = this.getRoom(code);
    if (!room) return null;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      text,
      timestamp: new Date().toISOString()
    };

    room.messages.push(newMessage);
    
    // limit messages to last 100 to save space
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    this.save();
    return newMessage;
  }

  // Scores logic
  public submitScore(
    player: string,
    score: number,
    gameId: string,
    roomId: string,
    weekId?: string
  ): ScoreRecord {
    const finalWeekId = weekId || getCurrentWeekId();
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const timestamp = new Date().toISOString();

    const newRecord: ScoreRecord = {
      id: `score-${Date.now()}-${Math.random()}`,
      player,
      score,
      gameId,
      roomId: roomId.toLowerCase().trim(),
      date,
      timestamp,
      weekId: finalWeekId
    };

    // Check if player has an existing score for this game in this room and this week ID
    // If they score higher, update it! Otherwise keep the higher one.
    const existingIndex = this.data.scores.findIndex(
      s => s.player.toLowerCase() === player.toLowerCase() &&
           s.gameId === gameId &&
           s.roomId === roomId.toLowerCase().trim() &&
           (s.weekId === finalWeekId || (!s.weekId && finalWeekId === "2026-W22"))
    );

    if (existingIndex !== -1) {
      if (score > this.data.scores[existingIndex].score) {
        this.data.scores[existingIndex].score = score;
        this.data.scores[existingIndex].timestamp = timestamp;
        this.data.scores[existingIndex].date = date;
      }
    } else {
      this.data.scores.push(newRecord);
    }

    // Add score notification to the room if submitted to a room
    const room = this.getRoom(roomId);
    if (room) {
      const gName = GAMES.find(g => g.id === gameId)?.name || gameId;
      room.notifications.push({
        id: `notif-score-${Date.now()}`,
        type: "score",
        message: `🏆 ¡${player} consiguió un puntaje de ${score} en ${gName}!`,
        timestamp
      });

      this.save();
    }

    this.save();
    return newRecord;
  }

  // Get weekly leaderboard (historical or current week)
  public getWeeklyLeaderboard(gameId: string, roomId?: string, weekId?: string): ScoreRecord[] {
    const finalWeekId = weekId || getCurrentWeekId();
    let filtered = this.data.scores.filter(
      s => s.gameId === gameId && (s.weekId === finalWeekId || (!s.weekId && finalWeekId === "2026-W22"))
    );

    if (roomId) {
      const cleanRoom = roomId.toLowerCase().trim();
      filtered = filtered.filter(s => s.roomId === cleanRoom);
    }

    // Sort by score desc, then by date oldest to give advantage to the quicker score
    return filtered.sort((a, b) => b.score - a.score || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Backwards compatibility daily scores fallback
  public getDailyLeaderboard(gameId: string, roomId?: string): ScoreRecord[] {
    const today = new Date().toISOString().split("T")[0];
    let filtered = this.data.scores.filter(
      s => s.gameId === gameId && s.date === today
    );

    if (roomId) {
      const cleanRoom = roomId.toLowerCase().trim();
      filtered = filtered.filter(s => s.roomId === cleanRoom);
    }

    return filtered.sort((a, b) => b.score - a.score || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Get all-time global leaderboard
  public getGlobalLeaderboard(gameId: string, roomId?: string): any[] {
    let filtered = this.data.scores.filter(s => s.gameId === gameId);

    if (roomId) {
      const cleanRoom = roomId.toLowerCase().trim();
      filtered = filtered.filter(s => s.roomId === cleanRoom);
    }

    // Group by player name and take their max score
    const maxScores: Record<string, ScoreRecord> = {};
    filtered.forEach(record => {
      const key = record.player.toLowerCase();
      if (!maxScores[key] || record.score > maxScores[key].score) {
        maxScores[key] = record;
      }
    });

    return Object.values(maxScores).sort((a, b) => b.score - a.score);
  }

  // Helper for all games reference lists
  public getAllGames(): Game[] {
    return GAMES;
  }
}

const supaDB = new SupaDB();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Log simple requests
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // API REST endpoints
  app.get("/api/games", (req, res) => {
    res.json({ games: supaDB.getAllGames() });
  });

  app.get("/api/game/today", (req, res) => {
    res.json({ dailyGame: supaDB.getDailyGame() });
  });

  app.post("/api/admin/set-game", (req, res) => {
    const { gameId } = req.body;
    if (!gameId) {
       res.status(400).json({ error: "Debe proveer gameId" });
       return;
    }
    const success = supaDB.setDailyGame(gameId);
    if (success) {
      res.json({ success: true, dailyGame: supaDB.getDailyGame() });
    } else {
      res.status(400).json({ error: "Juego no encontrado o inválido" });
    }
  });

  app.post("/api/rooms/create", (req, res) => {
    const { name, creator } = req.body;
    if (!name || !creator) {
      res.status(400).json({ error: "Falta el nombre de la sala o del creador" });
      return;
    }
    const room = supaDB.createRoom(name, creator);
    res.json({ room });
  });

  app.post("/api/rooms/join", (req, res) => {
    const { code, nickname } = req.body;
    if (!code || !nickname) {
      res.status(400).json({ error: "Falta el código de sala o tu nombre de usuario" });
      return;
    }
    const room = supaDB.joinRoom(code, nickname);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }
    res.json({ room });
  });

  app.get("/api/rooms/:code", (req, res) => {
    const { code } = req.params;
    const room = supaDB.getRoom(code);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }
    res.json({ room });
  });

  app.post("/api/rooms/:code/chat", (req, res) => {
    const { code } = req.params;
    const { sender, text } = req.body;
    if (!sender || !text) {
      res.status(400).json({ error: "Falta remitente o texto del mensaje" });
      return;
    }
    const msg = supaDB.addMessage(code, sender, text);
    if (!msg) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }
    res.json({ message: msg });
  });

  app.get("/api/weeks", (req, res) => {
    const currentWeekId = getCurrentWeekId();
    const todayStr = new Date().toISOString().split("T")[0];
    const responseWeeks = WEEKS_DATA.map(w => {
      return {
        ...w,
        isCurrent: w.id === currentWeekId,
        isClosed: todayStr > w.endDate
      };
    });
    res.json({ weeks: responseWeeks, currentWeekId });
  });

  app.post("/api/rooms/:code/score", (req, res) => {
    const { code } = req.params;
    const { player, score, gameId, weekId } = req.body;
    if (!player || score === undefined || !gameId) {
      res.status(400).json({ error: "Faltan parámetros del puntaje" });
      return;
    }
    
    const targetWeekId = weekId || getCurrentWeekId();
    const todayStr = new Date().toISOString().split("T")[0];
    const targetWeek = WEEKS_DATA.find(w => w.id === targetWeekId);
    
    if (targetWeek && todayStr > targetWeek.endDate) {
      res.status(400).json({ error: "La clasificación de esta semana ya ha finalizado. Puedes seguir practicando, pero el podio oficial competitiva está cerrado." });
      return;
    }

    // Check if room exists
    const room = supaDB.getRoom(code);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }

    const record = supaDB.submitScore(player, score, gameId, code, targetWeekId);
    res.json({ success: true, score: record });
  });

  // Global / local Leaderboards
  app.get("/api/leaderboards", (req, res) => {
    const gameId = req.query.gameId as string || "clicker_veloz";
    const roomId = req.query.roomId as string || undefined;
    const weekId = req.query.weekId as string || getCurrentWeekId();

    const daily = supaDB.getWeeklyLeaderboard(gameId, roomId, weekId);
    const globalList = supaDB.getGlobalLeaderboard(gameId, roomId);

    res.json({
      daily,
      global: globalList
    });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Portal de Juegos running on http://localhost:${PORT}`);
  });
}

startServer();
