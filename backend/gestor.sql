-- =============================================
-- SCRIPT COMPLETO DE BASE DE DATOS (POSTGRESQL)
-- =============================================

-- 1. TABLA DE USUARIOS (FUNDAMENTAL PARA EL LOGIN Y LA ASOCIACIÓN)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

---

-- 2. TABLA DE GASTOS (FEATURE ORIGINAL)
-- El campo 'category' se mantiene como TEXT para guardar el nombre de la categoría, 
-- ya sea una por defecto o una personalizada.
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  -- Clave Foránea: Enlaza a la tabla de usuarios. Si el usuario se borra, sus gastos también.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT, 
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

---

-- 3. TABLA DE INGRESOS (AÑADIDA)
CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  -- Clave Foránea: Enlaza a la tabla de usuarios.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

---

-- 4. TABLA DE CATEGORÍAS PERSONALIZADAS (AÑADIDA)
-- Se usa para que el usuario pueda administrar las opciones del dropdown.
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  -- Clave Foránea: Enlaza a la tabla de usuarios.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Restricción ÚNICA: Evita que un mismo usuario tenga dos categorías con el mismo nombre.
  UNIQUE(user_id, name), 
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

---

-- (OPCIONAL) ÍNDICES PARA MEJORAR LA VELOCIDAD DE BÚSQUEDA
-- Recomendado para las consultas que buscan datos por usuario.
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);