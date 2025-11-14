-- 1. CREAR TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,      -- Usaremos email como 'username'
  password_hash TEXT NOT NULL,   -- NUNCA guardar la contraseña, solo el hash
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. MODIFICAR TABLA DE GASTOS
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Esta es la línea clave:
  -- Cada gasto está enlazado a un 'user_id'
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- (Opcional) Crear un índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);