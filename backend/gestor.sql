CREATE DATABASE gestor;

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO expenses (description, amount, category) VALUES 
('Transporte UTM', 2.30, 'Transporte');

INSERT INTO expenses (description, amount, category) VALUES 
('Almuerzo encebollado', 2.25, 'Comida');