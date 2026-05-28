-- Script SQL para habilitar políticas de acceso público (RLS)
-- Pega y ejecuta esto en el SQL Editor de Supabase si tienes RLS activo
-- y quieres que funcione directamente con la clave pública (anon key) sin redeploy.

-- 1. Políticas para la tabla "users"
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en users" ON users;
CREATE POLICY "Permitir todo en users" ON users FOR ALL USING (true) WITH CHECK (true);

-- 2. Políticas para la tabla "rooms"
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en rooms" ON rooms;
CREATE POLICY "Permitir todo en rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- 3. Políticas para la tabla "room_members"
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en room_members" ON room_members;
CREATE POLICY "Permitir todo en room_members" ON room_members FOR ALL USING (true) WITH CHECK (true);

-- 4. Políticas para la tabla "scores"
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en scores" ON scores;
CREATE POLICY "Permitir todo en scores" ON scores FOR ALL USING (true) WITH CHECK (true);

-- 5. Políticas para la tabla "app_settings"
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en app_settings" ON app_settings;
CREATE POLICY "Permitir todo en app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
