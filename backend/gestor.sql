-- ==============================================================
-- 1. TABLA DE USUARIOS
-- ==============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- 2. TABLA DE CONFIGURACIÓN DE PRESUPUESTOS (ACTUALIZADA)
-- Incluye soporte para 'weekly' y nombres de fechas simplificados
-- ==============================================================
CREATE TABLE budget_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Nombre visible: "Presupuesto Diario", "Viaje a Cancún", etc.
  name VARCHAR(50) NOT NULL,
  
  -- Tipo de lógica. AHORA INCLUYE 'weekly'
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  
  -- El límite de dinero asignado a este presupuesto
  limit_amount NUMERIC(12, 2) DEFAULT 0,
  
  -- Fechas específicas (Solo se usan si type es 'custom')
  start_date DATE,
  end_date DATE,
  
  -- Define cuál es el que se muestra actualmente en el Dashboard
  is_active BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- 3. TABLA DE CATEGORÍAS
-- ==============================================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name) 
);

-- ==============================================================
-- 4. TABLA DE CAMPOS DINÁMICOS (FORM FIELDS)
-- ==============================================================
CREATE TABLE form_fields (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context VARCHAR(50) NOT NULL, -- 'expense' o 'income'
  field_key VARCHAR(50) NOT NULL, 
  label VARCHAR(100) NOT NULL,    
  type VARCHAR(50) NOT NULL,      
  is_core BOOLEAN DEFAULT FALSE,  
  is_enabled BOOLEAN DEFAULT TRUE, 
  ordering INTEGER DEFAULT 0,     
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- 5. TABLA DE GASTOS
-- ==============================================================
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT, 
  category TEXT, 
  custom_data JSONB DEFAULT '{}', 
  date DATE DEFAULT CURRENT_DATE, 
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- 6. TABLA DE INGRESOS
-- ==============================================================
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  custom_data JSONB DEFAULT '{}',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- 7. ÍNDICES (VELOCIDAD)
-- ==============================================================
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_incomes_user ON incomes(user_id);
CREATE INDEX idx_budget_configs_user ON budget_configs(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- ==============================================================
-- 8. AUTOMATIZACIÓN (TRIGGER)
-- Crea Diario, Semanal, Mensual y Anual automáticamente
-- ==============================================================

CREATE OR REPLACE FUNCTION create_default_budgets()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Crear Presupuesto DIARIO (Inactivo)
    INSERT INTO budget_configs (user_id, name, type, limit_amount, is_active)
    VALUES (NEW.id, 'Presupuesto Diario', 'daily', 0, FALSE);

    -- 2. Crear Presupuesto SEMANAL (Inactivo) <-- NUEVO
    INSERT INTO budget_configs (user_id, name, type, limit_amount, is_active)
    VALUES (NEW.id, 'Presupuesto Semanal', 'weekly', 0, FALSE);

    -- 3. Crear Presupuesto MENSUAL (ACTIVO por defecto)
    INSERT INTO budget_configs (user_id, name, type, limit_amount, is_active)
    VALUES (NEW.id, 'Presupuesto Mensual', 'monthly', 0, TRUE);

    -- 4. Crear Presupuesto ANUAL (Inactivo)
    INSERT INTO budget_configs (user_id, name, type, limit_amount, is_active)
    VALUES (NEW.id, 'Presupuesto Anual', 'yearly', 0, FALSE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_budgets_on_register
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_budgets();