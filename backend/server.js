require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Para hashear contraseñas
const jwt = require('jsonwebtoken'); // Para crear tokens

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

// ===========================================
// ==   ENDPOINTS DE AUTENTICACIÓN  ==
// ===========================================

// --- REGISTRO DE USUARIO ---
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Guardar en la base de datos
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, password_hash]
    );

    res.status(201).json(newUser.rows[0]);

  } catch (err) {
    // Manejar error de "email ya existe" (código 23505 en Postgres)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- LOGIN DE USUARIO ---
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    // 1. Buscar al usuario
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 2. Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Crear el token (JWT)
    const tokenPayload = { userId: user.id, email: user.email };
    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' } // El token expira en 1 hora
    );

    res.json({ token, user: { id: user.id, email: user.email } });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ===========================================
// ==   MIDDLEWARE DE AUTENTICACIÓN  ==
// ===========================================

// Esta función revisará el token en CADA petición protegida
const authenticateToken = (req, res, next) => {
  // El token viene en el header: 'Authorization: Bearer <TOKEN>'
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Token no provisto' }); // No hay token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' }); // Token expiró o es falso
    }

    // Si el token es válido, guardamos los datos del usuario en 'req'
    // para usarlo en las siguientes funciones
    req.user = userPayload; 
    next(); // Permite que la petición continúe
  });
};


// ==================================================
// ==   API Endpoints para Gastos (Protegidos)  ==
// ==================================================

// --- OBTENER GASTOS (Solo los del usuario logueado) ---
app.get('/expenses', authenticateToken, async (req, res) => {
  try {
    // Obtenemos el ID del usuario desde el token (que el middleware puso en req.user)
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// --- CREAR GASTO (Asignado al usuario logueado) ---
app.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description, amount, category } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    const newExpense = await pool.query(
      'INSERT INTO expenses (description, amount, category, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, parsedAmount, category, userId] // Añadimos userId
    );

    res.status(201).json(newExpense.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear el gasto' });
  }
});

// --- BORRAR GASTO (Solo si pertenece al usuario logueado) ---
app.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Modificamos el query para ASEGURARNOS que el usuario solo borra sus propios gastos
    const deleteOp = await pool.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *', 
      [id, userId]
    );

    if (deleteOp.rowCount === 0) {
      // Esto significa que el gasto no existe, O no le pertenece al usuario
      return res.status(404).json({ error: 'Gasto no encontrado o no autorizado' });
    }

    res.json({ message: 'Gasto eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
});

// =======================================================
// ==   NUEVO: API Endpoints para Ingresos (Protegidos)  ==
// =======================================================

// --- OBTENER INGRESOS (Solo los del usuario logueado) ---
app.get('/incomes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM incomes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener ingresos' });
  }
});

// --- CREAR INGRESO (Asignado al usuario logueado) ---
app.post('/incomes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description, amount } = req.body; // Los ingresos solo necesitan descripción y monto

    if (!description || !amount) {
      return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    const newIncome = await pool.query(
      'INSERT INTO incomes (description, amount, user_id) VALUES ($1, $2, $3) RETURNING *',
      [description, parsedAmount, userId]
    );

    res.status(201).json(newIncome.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear el ingreso' });
  }
});

// --- BORRAR INGRESO (Solo si pertenece al usuario logueado) ---
app.delete('/incomes/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const deleteOp = await pool.query(
      'DELETE FROM incomes WHERE id = $1 AND user_id = $2 RETURNING *', 
      [id, userId]
    );

    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ error: 'Ingreso no encontrado o no autorizado' });
    }

    res.json({ message: 'Ingreso eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar el ingreso' });
  }
});

// ========================================================
// ==   NUEVO: API Endpoints para Categorías (Protegidos)  ==
// ========================================================

// --- OBTENER TODAS LAS CATEGORÍAS DEL USUARIO ---
app.get('/categories', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// --- CREAR UNA NUEVA CATEGORÍA ---
app.post('/categories', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const newCategory = await pool.query(
      'INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );

    res.status(201).json(newCategory.rows[0]);
  } catch (err) {
    // Manejar error de "categoría ya existe" (código 23505)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Esa categoría ya existe' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// --- BORRAR UNA CATEGORÍA ---
app.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const deleteOp = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada o no autorizada' });
    }

    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
});
// --- Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de Gastos (con Auth) corriendo en http://localhost:${port}`);
});