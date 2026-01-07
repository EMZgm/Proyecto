require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

// =====================================================
// 1. CONFIGURACIÓN CORS
// =====================================================
const allowedOrigin = process.env.FRONTEND_URL || '*';

const corsOptions = {
  origin: allowedOrigin,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// =====================================================
// 2. CONEXIÓN A BASE DE DATOS (RENDER & LOCAL)
// =====================================================
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL 
  : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false 
});

// =====================================================
// 3. MIDDLEWARE DE SEGURIDAD (JWT)
// =====================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acceso denegado: Falta token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// =====================================================
// 4. RUTAS DE AUTENTICACIÓN Y USUARIO
// =====================================================
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Insertamos usuario (el monthly_limit tendrá el valor default 0 o lo que hayas puesto en SQL)
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', 
      [email, hash]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya existe' });
    res.status(500).json({ error: 'Error en el servidor al registrar' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '2h' }
    );
    
    // [CAMBIO IMPORTANTE] Ahora devolvemos también el monthly_limit
    res.json({ 
        token, 
        user: { 
            id: user.id, 
            email: user.email,
            monthly_limit: user.monthly_limit || 0 // Enviamos el límite (o 0 si es null)
        } 
    });
  } catch (err) { res.status(500).json({ error: 'Error en login' }); }
});

// [NUEVA RUTA] Actualizar el límite de presupuesto
app.put('/update-limit', authenticateToken, async (req, res) => {
  const { limit } = req.body;
  const userId = req.user.userId;

  try {
    // Actualizamos el campo monthly_limit en la base de datos
    await pool.query('UPDATE users SET monthly_limit = $1 WHERE id = $2', [limit, userId]);
    res.json({ message: 'Límite actualizado', limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar límite' });
  }
});

// =====================================================
// 5. GESTIÓN DE CAMPOS DINÁMICOS (FORM FIELDS)
// =====================================================
const ensureDefaultFields = async (userId, context) => {
  const check = await pool.query('SELECT * FROM form_fields WHERE user_id = $1 AND context = $2', [userId, context]);
  if (check.rowCount === 0) {
    const defaults = context === 'expense' 
      ? [
          { key: 'description', label: 'Descripción', type: 'text', core: true, order: 0 },
          { key: 'amount', label: 'Monto ($)', type: 'number', core: true, order: 1 },
          { key: 'category', label: 'Categoría', type: 'select', core: true, order: 2 }
        ]
      : [
          { key: 'description', label: 'Descripción', type: 'text', core: true, order: 0 },
          { key: 'amount', label: 'Monto ($)', type: 'number', core: true, order: 1 }
        ];
    for (const d of defaults) {
      await pool.query(
        'INSERT INTO form_fields (user_id, context, field_key, label, type, is_core, is_enabled, ordering) VALUES ($1, $2, $3, $4, $5, $6, true, $7)', 
        [userId, context, d.key, d.label, d.type, d.core, d.order]
      );
    }
  }
};

app.get('/form-fields/:context', authenticateToken, async (req, res) => {
  try {
    const { context } = req.params;
    await ensureDefaultFields(req.user.userId, context); 
    const result = await pool.query('SELECT * FROM form_fields WHERE user_id = $1 AND context = $2 AND is_enabled = true ORDER BY ordering ASC, id ASC', [req.user.userId, context]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error obteniendo campos' }); }
});

app.post('/form-fields', authenticateToken, async (req, res) => {
  try {
    const { context, label, type } = req.body;
    if (!label) return res.status(400).json({ error: 'Nombre requerido' });
    
    const field_key = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    
    const maxOrder = await pool.query('SELECT MAX(ordering) as max_val FROM form_fields WHERE user_id = $1 AND context = $2', [req.user.userId, context]);
    const nextOrder = (maxOrder.rows[0].max_val || 0) + 1;

    const newField = await pool.query('INSERT INTO form_fields (user_id, context, field_key, label, type, is_core, ordering) VALUES ($1, $2, $3, $4, $5, false, $6) RETURNING *', [req.user.userId, context, field_key, label, type, nextOrder]);
    res.json(newField.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error creando campo' }); }
});

app.put('/form-fields/reorder', authenticateToken, async (req, res) => {
  try {
    const { orderedIds } = req.body; 
    for (let i = 0; i < orderedIds.length; i++) {
        await pool.query('UPDATE form_fields SET ordering = $1 WHERE id = $2 AND user_id = $3', [i, orderedIds[i], req.user.userId]);
    }
    res.json({ message: 'Orden actualizado' });
  } catch (err) { res.status(500).json({ error: 'Error reordenar' }); }
});

app.delete('/form-fields/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query('SELECT is_core, field_key FROM form_fields WHERE id = $1', [req.params.id]);
    if (check.rowCount === 0) return res.status(404).json({error: 'No encontrado'});
    
    if (check.rows[0].is_core) {
      if (check.rows[0].field_key === 'amount') return res.status(400).json({error: 'Monto es obligatorio.'});
      await pool.query('UPDATE form_fields SET is_enabled = false WHERE id = $1', [req.params.id]);
    } else {
      await pool.query('DELETE FROM form_fields WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    }
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error borrar' }); }
});

// =====================================================
// 6. GASTOS (CRUD)
// =====================================================
app.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const formData = req.body;
    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    const description = formData.description || '';
    const category = formData.category || 'Varios';
    
    const custom_data = { ...formData };
    delete custom_data.amount; delete custom_data.description; delete custom_data.category;

    if (amount <= 0) return res.status(400).json({error: 'Monto requerido'});

    const r = await pool.query('INSERT INTO expenses (amount, description, category, custom_data, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [amount, description, category, custom_data, userId]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error creando gasto' }); }
});

app.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const formData = req.body;
    
    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    const description = formData.description || '';
    const category = formData.category || 'Varios';
    
    const custom_data = { ...formData };
    delete custom_data.amount; delete custom_data.description; delete custom_data.category;

    if (amount <= 0) return res.status(400).json({error: 'Monto requerido'});

    const result = await pool.query(
      'UPDATE expenses SET amount=$1, description=$2, category=$3, custom_data=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [amount, description, category, custom_data, id, userId]
    );
    
    if (result.rowCount === 0) return res.status(404).json({error: 'Gasto no encontrado'});
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error editando gasto' }); }
});

app.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;

    let query = 'SELECT * FROM expenses WHERE user_id = $1';
    let params = [userId];

    if (startDate && endDate) {
      query += ' AND created_at::DATE BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

app.delete('/expenses/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]); 
        res.json({msg:'ok'});
    } catch (err) { res.status(500).json({error: 'Error borrando gasto'}); }
});

// =====================================================
// 7. INGRESOS (CRUD)
// =====================================================
app.post('/incomes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const formData = req.body;
    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    const description = formData.description || '';
    
    const custom_data = { ...formData };
    delete custom_data.amount; delete custom_data.description;

    if (amount <= 0) return res.status(400).json({error: 'Monto requerido'});

    const r = await pool.query('INSERT INTO incomes (amount, description, custom_data, user_id) VALUES ($1, $2, $3, $4) RETURNING *', [amount, description, custom_data, userId]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error creando ingreso' }); }
});

app.put('/incomes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const formData = req.body;
    
    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    const description = formData.description || '';
    
    const custom_data = { ...formData };
    delete custom_data.amount; delete custom_data.description;

    if (amount <= 0) return res.status(400).json({error: 'Monto requerido'});

    const result = await pool.query(
      'UPDATE incomes SET amount=$1, description=$2, custom_data=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [amount, description, custom_data, id, userId]
    );
    
    if (result.rowCount === 0) return res.status(404).json({error: 'Ingreso no encontrado'});
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error editando ingreso' }); }
});

app.get('/incomes', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM incomes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]); 
        res.json(r.rows);
    } catch (err) { res.status(500).json({error: 'Error obteniendo ingresos'}); }
});

app.delete('/incomes/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]); 
        res.json({msg:'ok'});
    } catch (err) { res.status(500).json({error: 'Error borrando ingreso'}); }
});

// =====================================================
// 8. CATEGORÍAS
// =====================================================
app.get('/categories', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categories WHERE user_id = $1', [req.user.userId]); 
        res.json(r.rows);
    } catch (err) { res.status(500).json({error: 'Error obteniendo categorías'}); }
});

app.post('/categories', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query('INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING *', [req.body.name, req.user.userId]); 
        res.json(r.rows[0]);
    } catch (err) { res.status(500).json({error: 'Error creando categoría'}); }
});

app.delete('/categories/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]); 
        res.json({msg:'ok'});
    } catch (err) { res.status(500).json({error: 'Error borrando categoría'}); }
});

// =====================================================
// 9. INICIAR SERVIDOR
// =====================================================
app.listen(port, () => {
    console.log(`Backend corriendo en puerto ${port}`);
});