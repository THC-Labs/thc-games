-- Script SQL para recrear la base de datos de THC Games en Supabase
-- Puedes pegar y ejecutar este script completo en el Editor SQL de Supabase (SQL Editor).

-- 1. Limpieza de tablas existentes (en orden inverso de dependencias)
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Creación de la tabla de Usuarios
CREATE TABLE users (
    nickname text PRIMARY KEY,
    pin text NOT NULL, -- PIN de 4 dígitos (guardado como texto de forma segura)
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Creación de la tabla de Salas (Rooms)
CREATE TABLE rooms (
    code text PRIMARY KEY, -- Código de acceso único de 5 caracteres
    name text NOT NULL,
    creator text NOT NULL REFERENCES users(nickname) ON DELETE CASCADE,
    players jsonb DEFAULT '[]'::jsonb, -- Almacena array de jugadores [{nickname, joinedAt}]
    messages jsonb DEFAULT '[]'::jsonb, -- Almacena historial de chat de la sala
    notifications jsonb DEFAULT '[]'::jsonb, -- Almacena alertas de sala
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Creación de la tabla de Relación de Miembros (User Rooms Sidebar mapping)
CREATE TABLE room_members (
    nickname text NOT NULL REFERENCES users(nickname) ON DELETE CASCADE,
    room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    PRIMARY KEY (nickname, room_code)
);

-- 5. Creación de la tabla de Puntajes (Leaderboards)
CREATE TABLE scores (
    id text PRIMARY KEY,
    player text NOT NULL REFERENCES users(nickname) ON DELETE CASCADE,
    score integer NOT NULL,
    game_id text NOT NULL,
    room_id text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    timestamp timestamp with time zone NOT NULL,
    week_id text NOT NULL,
    -- Restricción para asegurar que un jugador solo tiene una marca registrada por juego/sala/semana
    CONSTRAINT unique_player_game_room_week UNIQUE (player, game_id, room_id, week_id)
);

-- 6. Creación de la tabla de Ajustes de la App (para forzar juego del día)
CREATE TABLE app_settings (
    key text PRIMARY KEY,
    value text
);

-- 7. Desactivación de Row Level Security (RLS) en todas las tablas
-- Esto es crítico para que las peticiones anónimas basadas en nickname/PIN desde Express funcionen directamente.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
