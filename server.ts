import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseKey);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn("⚠️ [Supabase Warning] SUPABASE_URL o SUPABASE_KEY no están configuradas en el entorno. Se usan placeholders.");
}

// Database wrapper implementing Supabase interactions
class SupaDB {
  
  // Login / Register User using nickname + 4-digit PIN
  public async loginOrRegister(nickname: string, pin: string): Promise<{ success: boolean; isNewUser: boolean; message: string }> {
    const cleanNick = nickname.trim();
    const cleanPin = pin.trim();

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("nickname", cleanNick)
        .maybeSingle();

      if (error) {
        console.error("❌ Supabase Error fetching user during login:", error.message);
        return { success: false, isNewUser: false, message: `Error de base de datos: ${error.message}` };
      }

      if (user) {
        // User exists, verify PIN
        if (user.pin === cleanPin) {
          return { success: true, isNewUser: false, message: "Inicio de sesión correcto." };
        } else {
          return { success: false, isNewUser: false, message: "PIN incorrecto. Por favor introduce tu PIN original." };
        }
      } else {
        // User does not exist, register them
        const { error: insertErr } = await supabase
          .from("users")
          .insert({ nickname: cleanNick, pin: cleanPin });

        if (insertErr) {
          console.error("❌ Supabase Error registering user:", insertErr.message);
          return { success: false, isNewUser: false, message: `Fallo al registrar usuario: ${insertErr.message}` };
        }

        return { success: true, isNewUser: true, message: "Usuario registrado e inicio de sesión correcto." };
      }
    } catch (e) {
      console.error("❌ Fallo al procesar login/registro", e);
      return { success: false, isNewUser: false, message: "Fallo de conexión con la base de datos." };
    }
  }

  // Fetch all rooms joined by a specific user
  public async getUserRooms(nickname: string): Promise<any[]> {
    const cleanNick = nickname.trim();
    try {
      const { data, error } = await supabase
        .from("room_members")
        .select(`
          room_code,
          rooms (
            code,
            name,
            creator,
            created_at
          )
        `)
        .eq("nickname", cleanNick);

      if (error) {
        console.error("❌ Supabase Error fetching user rooms:", error.message);
        throw new Error(`Supabase select failed: ${error.message}`);
      }

      if (!data) return [];

      // Map joint rooms response
      return data
        .map((item: any) => item.rooms)
        .filter((room: any) => room !== null);
    } catch (e) {
      console.error("❌ Fallo al obtener las salas del usuario", e);
      throw e;
    }
  }

  // Get current game of the day (checks settings override first, else deterministically hashes the date)
  public async getDailyGame(): Promise<Game> {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "daily_game_override")
        .single();
      
      if (data && data.value) {
        const game = GAMES.find(g => g.id === data.value);
        if (game) return game;
      }
    } catch (e) {
      // Fallback
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const hash = todayStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gameIndex = hash % GAMES.length;
    return GAMES[gameIndex];
  }

  public async setDailyGame(gameId: string): Promise<boolean> {
    const exists = GAMES.some(g => g.id === gameId);
    if (!exists) return false;

    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "daily_game_override", value: gameId });
      
      return !error;
    } catch (e) {
      console.error("❌ Falló al forzar el juego del día en Supabase", e);
      return false;
    }
  }

  // Fetch a single room from Supabase
  public async getRoom(code: string): Promise<Room | null> {
    try {
      const cleanCode = code.toLowerCase().trim();
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", cleanCode)
        .single();

      if (error) {
        if (error.code !== "PGRST116") { // PGRST116 is normal "no rows found"
          console.error("❌ Supabase: Error fetching room:", error.message, error.details);
          throw new Error(`Supabase select failed: ${error.message}`);
        }
        return null;
      }
      if (!data) return null;
      
      return {
        code: data.code,
        name: data.name,
        creator: data.creator,
        players: typeof data.players === "string" ? JSON.parse(data.players) : data.players || [],
        messages: typeof data.messages === "string" ? JSON.parse(data.messages) : data.messages || [],
        notifications: typeof data.notifications === "string" ? JSON.parse(data.notifications) : data.notifications || [],
        createdAt: data.created_at || data.createdAt
      };
    } catch (e) {
      console.error("❌ Error al obtener sala", e);
      throw e;
    }
  }

  // Create a new room with a unique 5-char code
  public async createRoom(name: string, creator: string): Promise<Room> {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
      code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existingRoom = await this.getRoom(code);
      if (!existingRoom) {
        isUnique = true;
      }
    }

    const newRoom: Room = {
      code: code,
      name: name,
      creator: creator,
      players: [{ nickname: creator, joinedAt: new Date().toISOString() }],
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "Sistema Bot",
          text: `¡Bienvenidos a la sala ${name}! Creada por ${creator}. El juego del día está listo para jugar.`,
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

    try {
      const { error } = await supabase
        .from("rooms")
        .insert({
          code,
          name,
          creator,
          players: newRoom.players,
          messages: newRoom.messages,
          notifications: newRoom.notifications,
          created_at: newRoom.createdAt
        });
      
      if (error) {
        console.error("❌ Supabase Error inserting room:", error.message, error.details, error.hint);
        throw new Error(`Supabase insert failed: ${error.message}`);
      }

      // Add creator to room members mapping table
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ nickname: creator, room_code: code });

      if (memberError) {
        console.error("❌ Supabase Error inserting room member (creator):", memberError.message, memberError.details);
      }
    } catch (e) {
      console.error("❌ Fallo al insertar sala en Supabase", e);
      throw e;
    }

    return newRoom;
  }

  // Join an existing room
  public async joinRoom(code: string, nickname: string): Promise<Room | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    // Register room member relation in mapping table (duplicate key constraints ignored by upsert)
    try {
      const { error: memberError } = await supabase
        .from("room_members")
        .upsert({ nickname, room_code: room.code }, { onConflict: "nickname,room_code" });
      
      if (memberError) {
        console.error("❌ Supabase Error inserting room member (join):", memberError.message, memberError.details);
        throw new Error(`Supabase insert member failed: ${memberError.message}`);
      }
    } catch (e) {
      console.error("❌ Fallo al registrar miembro de sala en Supabase", e);
      throw e;
    }

    const userExists = room.players.some(
      p => p.nickname.toLowerCase() === nickname.toLowerCase()
    );

    if (!userExists) {
      room.players.push({
        nickname: nickname,
        joinedAt: new Date().toISOString()
      });

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

      try {
        const { error } = await supabase
          .from("rooms")
          .update({
            players: room.players,
            messages: room.messages,
            notifications: room.notifications
          })
          .eq("code", room.code);
        
        if (error) {
          console.error("❌ Supabase Error updating room (join):", error.message, error.details);
          throw new Error(`Supabase update failed: ${error.message}`);
        }
      } catch (e) {
        console.error("❌ Fallo al actualizar sala unida en Supabase", e);
        throw e;
      }
    }

    return room;
  }

  // Append a chat message to a room
  public async addMessage(code: string, sender: string, text: string): Promise<Message | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      text,
      timestamp: new Date().toISOString()
    };

    room.messages.push(newMessage);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ messages: room.messages })
        .eq("code", room.code);
      
      if (error) {
        console.error("❌ Supabase Error updating messages:", error.message, error.details);
        throw new Error(`Supabase update failed: ${error.message}`);
      }
    } catch (e) {
      console.error("❌ Fallo al añadir mensaje en Supabase", e);
      throw e;
    }

    return newMessage;
  }

  // Submit score record and push room notification
  public async submitScore(
    player: string,
    score: number,
    gameId: string,
    roomId: string,
    weekId?: string
  ): Promise<ScoreRecord> {
    const finalWeekId = weekId || getCurrentWeekId();
    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();
    const cleanRoomId = roomId.toLowerCase().trim();

    let finalRecord: ScoreRecord;

    try {
      // Check if there is an existing record
      const { data: existing, error: fetchErr } = await supabase
        .from("scores")
        .select("*")
        .eq("player", player)
        .eq("game_id", gameId)
        .eq("room_id", cleanRoomId)
        .eq("week_id", finalWeekId)
        .maybeSingle();

      if (fetchErr) {
        console.error("❌ Supabase Error fetching score record:", fetchErr.message, fetchErr.details);
      }

      if (existing) {
        if (score > existing.score) {
          const { error: updateErr } = await supabase
            .from("scores")
            .update({
              score,
              timestamp,
              date
            })
            .eq("id", existing.id);

          if (updateErr) {
            console.error("❌ Supabase Error updating score:", updateErr.message, updateErr.details);
          }

          finalRecord = {
            id: existing.id,
            player,
            score,
            gameId,
            roomId: cleanRoomId,
            date,
            timestamp,
            weekId: finalWeekId
          };
        } else {
          finalRecord = {
            id: existing.id,
            player: existing.player,
            score: existing.score,
            gameId: existing.game_id,
            roomId: existing.room_id,
            date: existing.date,
            timestamp: existing.timestamp,
            weekId: existing.week_id
          };
        }
      } else {
        const id = `score-${Date.now()}-${Math.random()}`;
        const { error: insertErr } = await supabase
          .from("scores")
          .insert({
            id,
            player,
            score,
            game_id: gameId,
            room_id: cleanRoomId,
            date,
            timestamp,
            week_id: finalWeekId
          });

        if (insertErr) {
          console.error("❌ Supabase Error inserting score:", insertErr.message, insertErr.details);
        }

        finalRecord = {
          id,
          player,
          score,
          gameId,
          roomId: cleanRoomId,
          date,
          timestamp,
          weekId: finalWeekId
        };
      }

      // Add visual score notification to room
      const room = await this.getRoom(roomId);
      if (room) {
        const gName = GAMES.find(g => g.id === gameId)?.name || gameId;
        room.notifications.push({
          id: `notif-score-${Date.now()}`,
          type: "score",
          message: `🏆 ¡${player} consiguió un puntaje de ${score} en ${gName}!`,
          timestamp
        });

        const { error: roomUpdateErr } = await supabase
          .from("rooms")
          .update({ notifications: room.notifications })
          .eq("code", room.code);
        
        if (roomUpdateErr) {
          console.error("❌ Supabase Error updating room notifications:", roomUpdateErr.message, roomUpdateErr.details);
        }
      }
    } catch (e) {
      console.error("❌ Fallo al subir puntaje en Supabase", e);
      // Fallback response
      finalRecord = {
        id: `err-${Date.now()}`,
        player,
        score,
        gameId,
        roomId: cleanRoomId,
        date,
        timestamp,
        weekId: finalWeekId
      };
    }

    return finalRecord;
  }

  // Get weekly leaderboard
  public async getWeeklyLeaderboard(gameId: string, roomId?: string, weekId?: string): Promise<ScoreRecord[]> {
    const finalWeekId = weekId || getCurrentWeekId();
    try {
      let query = supabase
        .from("scores")
        .select("*")
        .eq("game_id", gameId)
        .eq("week_id", finalWeekId);

      if (roomId) {
        query = query.eq("room_id", roomId.toLowerCase().trim());
      }

      const { data, error } = await query;
      if (error || !data) return [];

      const mapped: ScoreRecord[] = data.map(s => ({
        id: s.id,
        player: s.player,
        score: s.score,
        gameId: s.game_id,
        roomId: s.room_id,
        date: s.date,
        timestamp: s.timestamp,
        weekId: s.week_id
      }));

      return mapped.sort((a, b) => b.score - a.score || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (e) {
      console.error("❌ Fallo al consultar leaderboard semanal", e);
      return [];
    }
  }

  // Get global leaderboard grouped by max score
  public async getGlobalLeaderboard(gameId: string, roomId?: string): Promise<ScoreRecord[]> {
    try {
      let query = supabase
        .from("scores")
        .select("*")
        .eq("game_id", gameId);

      if (roomId) {
        query = query.eq("room_id", roomId.toLowerCase().trim());
      }

      const { data, error } = await query;
      if (error || !data) return [];

      const maxScores: Record<string, ScoreRecord> = {};
      data.forEach(s => {
        const key = s.player.toLowerCase();
        if (!maxScores[key] || s.score > maxScores[key].score) {
          maxScores[key] = {
            id: s.id,
            player: s.player,
            score: s.score,
            gameId: s.game_id,
            roomId: s.room_id,
            date: s.date,
            timestamp: s.timestamp,
            weekId: s.week_id
          };
        }
      });

      return Object.values(maxScores).sort((a, b) => b.score - a.score);
    } catch (e) {
      console.error("❌ Fallo al consultar leaderboard global", e);
      return [];
    }
  }

  public getAllGames(): Game[] {
    return GAMES;
  }
}

const supaDB = new SupaDB();
const app = express();

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

app.get("/api/game/today", async (req, res) => {
  const dailyGame = await supaDB.getDailyGame();
  res.json({ dailyGame });
});

app.post("/api/admin/set-game", async (req, res) => {
  const { gameId } = req.body;
  if (!gameId) {
     res.status(400).json({ error: "Debe proveer gameId" });
     return;
  }
  const success = await supaDB.setDailyGame(gameId);
  if (success) {
    res.json({ success: true, dailyGame: await supaDB.getDailyGame() });
  } else {
    res.status(400).json({ error: "Juego no encontrado o inválido" });
  }
});

app.post("/api/auth/login-register", async (req, res) => {
  try {
    const { nickname, pin } = req.body;
    if (!nickname || !pin) {
       res.status(400).json({ error: "Faltan parámetros: nickname o pin" });
       return;
    }
    const result = await supaDB.loginOrRegister(nickname, pin);
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json({ error: result.message });
    }
  } catch (err: any) {
    res.status(550).json({ error: `Fallo al iniciar sesión / registrar: ${err.message}` });
  }
});

app.get("/api/users/:nickname/rooms", async (req, res) => {
  try {
    const { nickname } = req.params;
    const rooms = await supaDB.getUserRooms(nickname);
    res.json({ rooms });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al obtener tus salas: ${err.message}` });
  }
});

app.post("/api/rooms/create", async (req, res) => {
  try {
    const { name, creator } = req.body;
    if (!name || !creator) {
      res.status(400).json({ error: "Falta el nombre de la sala o del creador" });
      return;
    }
    const room = await supaDB.createRoom(name, creator);
    res.json({ room });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al crear la sala en base de datos: ${err.message}` });
  }
});

app.post("/api/rooms/join", async (req, res) => {
  try {
    const { code, nickname } = req.body;
    if (!code || !nickname) {
      res.status(400).json({ error: "Falta el código de sala o tu nombre de usuario" });
      return;
    }
    const room = await supaDB.joinRoom(code, nickname);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada o inactiva" });
      return;
    }
    res.json({ room });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al unirse a la sala: ${err.message}` });
  }
});

app.get("/api/rooms/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const room = await supaDB.getRoom(code);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }
    res.json({ room });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al consultar la sala: ${err.message}` });
  }
});

app.post("/api/rooms/:code/chat", async (req, res) => {
  try {
    const { code } = req.params;
    const { sender, text } = req.body;
    if (!sender || !text) {
      res.status(400).json({ error: "Falta remitente o texto del mensaje" });
      return;
    }
    const msg = await supaDB.addMessage(code, sender, text);
    if (!msg) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }
    res.json({ message: msg });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al enviar mensaje: ${err.message}` });
  }
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

app.post("/api/rooms/:code/score", async (req, res) => {
  try {
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
    const room = await supaDB.getRoom(code);
    if (!room) {
      res.status(404).json({ error: "Sala no encontrada" });
      return;
    }

    const record = await supaDB.submitScore(player, score, gameId, code, targetWeekId);
    res.json({ success: true, score: record });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al registrar puntaje: ${err.message}` });
  }
});

// Global / local Leaderboards
app.get("/api/leaderboards", async (req, res) => {
  try {
    const gameId = req.query.gameId as string || "clicker_veloz";
    const roomId = req.query.roomId as string || undefined;
    const weekId = req.query.weekId as string || getCurrentWeekId();

    const daily = await supaDB.getWeeklyLeaderboard(gameId, roomId, weekId);
    const globalList = await supaDB.getGlobalLeaderboard(gameId, roomId);

    res.json({
      daily,
      global: globalList
    });
  } catch (err: any) {
    res.status(500).json({ error: `Fallo al obtener clasificaciones: ${err.message}` });
  }
});

// Vite Integration & Listener Setup
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Use dynamic imports to prevent packaging Vite inside production/Vercel serverless environment
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // Start standalone listener when running locally or in standard environments (like Render)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Portal de Juegos running on http://localhost:${PORT}`);
    });
  }
}

setupServer().catch(err => {
  console.error("❌ Fallo al inicializar el servidor", err);
});

// Export default app for Vercel serverless integration
export default app;
