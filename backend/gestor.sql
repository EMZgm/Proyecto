-- ==============================================================
-- BASE DE DATOS FINAL: GESTOR DE GASTOS (DINÁMICO + ORDENABLE)
-- ==============================================================

-- 1. TABLA DE USUARIOS
-- Maneja el inicio de sesión
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE CATEGORÍAS
-- Opciones para el desplegable "Categoría" en Gastos
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  -- Evita que un usuario cree dos categorías con el mismo nombre
  UNIQUE(user_id, name) 
);

-- 3. TABLA DE CONFIGURACIÓN DE CAMPOS (CEREBRO DEL SISTEMA)
-- Define qué campos se muestran en los formularios y EN QUÉ ORDEN
CREATE TABLE form_fields (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 'expense' o 'income' (Para saber a qué formulario pertenece)
  context VARCHAR(50) NOT NULL, 
  
  -- Identificador interno (ej: 'amount', 'lugar', 'cliente')
  field_key VARCHAR(50) NOT NULL, 
  
  -- Nombre visible (ej: 'Monto ($)', 'Lugar de compra')
  label VARCHAR(100) NOT NULL,    
  
  -- Tipo de input (ej: 'text', 'number', 'select')
  type VARCHAR(50) NOT NULL,      
  
  -- TRUE si es un campo vital (Monto, Descripción), FALSE si es personalizado
  is_core BOOLEAN DEFAULT FALSE,  
  
  -- Si es FALSE, el campo no se muestra (borrado lógico)
  is_enabled BOOLEAN DEFAULT TRUE, 
  
  -- ESTA ES LA NUEVA COLUMNA: Controla la posición en la lista (0, 1, 2...)
  ordering INTEGER DEFAULT 0,     
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE GASTOS
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Campos Físicos (Core)
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT, 
  category TEXT, 
  
  -- Campos Dinámicos (Aquí se guardan los valores de tus campos extra)
  custom_data JSONB DEFAULT '{}', 
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE INGRESOS
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Campos Físicos (Core)
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  
  -- Campos Dinámicos
  custom_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. ÍNDICES (Para optimizar la velocidad de la App)
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_incomes_user ON incomes(user_id);
CREATE INDEX idx_form_fields_user ON form_fields(user_id);
CREATE INDEX idx_form_fields_ordering ON form_fields(user_id, context, ordering);

ALTER TABLE users ADD COLUMN monthly_limit NUMERIC(10, 2) DEFAULT 0;