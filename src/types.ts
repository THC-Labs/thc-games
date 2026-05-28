export interface Player {
  nickname: string;
  joinedAt: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface ScoreRecord {
  id: string;
  player: string;
  score: number;
  gameId: string;
  roomId: string;
  date: string;
  timestamp: string;
  weekId?: string; // Partition high scores by week
}

export interface WeekConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  games: string[];
}

export interface RoomNotification {
  id: string;
  type: 'join' | 'score' | 'chat_alert';
  message: string;
  timestamp: string;
}

export interface Room {
  code: string;
  name: string;
  creator: string;
  players: Player[];
  messages: Message[];
  notifications: RoomNotification[];
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  instructions: string;
  genre: string;
}
