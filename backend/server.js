require('dotenv').config(); // Carga el archivo .env
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

// --- Middlewares
app.use(cors());
app.use(express.json());

// --- Conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Probar conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar con la base de datos', err.stack);
  } else {
    console.log('Conexión a la DB (Gastos) exitosa en:', res.rows[0].now);
  }
});

// --- API Endpoints para Gastos ---

// GET /expenses (Obtener todos los gastos)
app.get('/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// POST /expenses (Crear un nuevo gasto)
app.post('/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;

    // Validación
    if (!description || !amount) {
      return res.status(400).json({ error: 'La descripción y el monto son obligatorios' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    const newExpense = await pool.query(
      'INSERT INTO expenses (description, amount, category) VALUES ($1, $2, $3) RETURNING *',
      [description, parsedAmount, category]
    );

    res.status(201).json(newExpense.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear el gasto' });
  }
});

// DELETE /expenses/:id (Borrar un gasto)
app.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);

    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json({ message: 'Gasto eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
});

// --- Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de Gastos corriendo en http://localhost:${port}`);
});