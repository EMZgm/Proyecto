import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function ExpenseManager({ token, onLogout }) {
  // --- Estados de Gastos (Original)
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Varios'); // Categoría seleccionada
  const [error, setError] = useState(null);

  // --- Estados de Ingresos (Añadido)
  const [incomes, setIncomes] = useState([]);
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');

  // --- Estados de Categorías (Añadido)
  const [userCategories, setUserCategories] = useState([]); // Categorías de la BD
  const [newCategory, setNewCategory] = useState(''); // Input para nueva categoría

  // === Función de Fetch con Auth (Original) ===
  const authedFetch = (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Incluimos el token
    };
    return fetch(url, { ...options, headers });
  };
  // ===========================================

  // === Funciones para Cargar Datos ===
  const fetchExpenses = () => {
    authedFetch(`${API_URL}/expenses`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) onLogout();
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setExpenses(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar los gastos.');
      });
  };

  const fetchIncomes = () => {
    authedFetch(`${API_URL}/incomes`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) onLogout();
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIncomes(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar los ingresos.');
      });
  };
  
  const fetchCategories = () => {
    authedFetch(`${API_URL}/categories`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) onLogout();
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUserCategories(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar las categorías.');
      });
  };

  // Efecto inicial para cargar todos los datos
  useEffect(() => {
    if (token) {
      fetchExpenses();
      fetchIncomes();
      fetchCategories(); 
    }
  }, [token]);

  // === Manejadores de Formularios (Crear) ===

  // Manejador para crear Gasto (Original)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Descripción y Monto son obligatorios');
      return;
    }
    try {
      const response = await authedFetch(`${API_URL}/expenses`, {
        method: 'POST',
        body: JSON.stringify({ description, amount: parseFloat(amount), category }),
      });
      if (!response.ok) throw new Error('Error al guardar el gasto');
      setDescription('');
      setAmount('');
      setCategory('Varios');
      setError(null);
      fetchExpenses(); // Recargar gastos
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Manejador para crear Ingreso (Añadido)
  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeDescription || !incomeAmount) {
      alert('Descripción y Monto son obligatorios');
      return;
    }
    try {
      const response = await authedFetch(`${API_URL}/incomes`, {
        method: 'POST',
        body: JSON.stringify({ description: incomeDescription, amount: parseFloat(incomeAmount) }),
      });
      if (!response.ok) throw new Error('Error al guardar el ingreso');
      setIncomeDescription('');
      setIncomeAmount('');
      setError(null);
      fetchIncomes(); // Recargar ingresos
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Manejador para crear Categoría (Añadido)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    try {
      const response = await authedFetch(`${API_URL}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: newCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear categoría');
      
      setNewCategory(''); // Limpiar input
      fetchCategories(); // Recargar la lista de categorías
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };


  // === Manejadores de Acciones (Borrar, Duplicar) ===

  // Manejador para borrar Gasto (Original)
  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que quieres borrar este gasto?')) {
      return;
    }
    try {
      const response = await authedFetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al borrar el gasto');
      setExpenses(expenses.filter(ex => ex.id !== id)); 
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };
  
  // Manejador para borrar Ingreso (Añadido)
  const handleIncomeDelete = async (id) => {
    if (!window.confirm('¿Seguro que quieres borrar este ingreso?')) {
      return;
    }
    try {
      const response = await authedFetch(`${API_URL}/incomes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al borrar el ingreso');
      setIncomes(incomes.filter(inc => inc.id !== id)); 
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Manejador para borrar Categoría (Añadido)
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Seguro que quieres borrar esta categoría? Los gastos existentes no se verán afectados.')) {
      return;
    }
    try {
      const response = await authedFetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al borrar la categoría');
      fetchCategories(); // Recargar la lista
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Duplicar Gasto (Original)
  const handleDuplicate = async (expenseToDuplicate) => {
    if (!window.confirm('¿Duplicar este gasto?')) return;
    const { description, amount, category } = expenseToDuplicate;
    try {
      const response = await authedFetch(`${API_URL}/expenses`, {
        method: 'POST',
        body: JSON.stringify({ description, amount: parseFloat(amount), category }),
      });
      if (!response.ok) throw new Error('Error al duplicar el gasto');
      setError(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };


  // === Lógica de Cálculos y Listas ===

  // --- CÁLCULOS DE TOTALES ---
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount), 
    0
  );
  
  const totalIncomes = incomes.reduce(
    (sum, income) => sum + parseFloat(income.amount),
    0
  );

  const balance = totalIncomes - totalExpenses;
  
  // --- LÓGICA DE CATEGORÍAS ---
  const defaultCategories = ['Varios', 'Comida', 'Transporte', 'Servicios', 'Entretenimiento'];
  const userCategoryNames = userCategories.map(c => c.name);
  const allCategories = [...new Set([...defaultCategories, ...userCategoryNames])].sort();

  // === RENDERIZADO DEL COMPONENTE (JSX) ===
  return (
    <> 
      <header>
        <h1>Mi Gestor de Gastos 💸</h1>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>

      {error && <div className="error-box">{error}</div>}

      {/* --- BARRA DE BALANCE (Añadida) --- */}
      <div className="balance-bar">
        <div className="balance-card income">
          <span className="balance-label">Ingresos Totales</span>
          <span className="balance-amount">${totalIncomes.toFixed(2)}</span>
        </div>
        <div className="balance-card expense">
          <span className="balance-label">Gastos Totales</span>
          <span className="balance-amount">-${totalExpenses.toFixed(2)}</span>
        </div>
        <div className="balance-card balance">
          <span className="balance-label">Balance General</span>
          <span className="balance-amount" style={{ color: balance >= 0 ? 'green' : 'red' }}>
            ${balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Contenedor principal con 2 columnas */}
      <div className="content">
        
        {/* --- Columna de Formularios --- */}
        <div className="forms-column">

          {/* FORMULARIO DE INGRESOS (Añadido) */}
          <form onSubmit={handleIncomeSubmit} className="income-form">
            <h2>Agregar Nuevo Ingreso</h2>
            <div className="form-group">
              <label>Descripción*</label>
              <input
                type="text"
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                placeholder="Ej: Salario"
              />
            </div>
            <div className="form-group">
              <label>Monto ($)*</label>
              <input
                type="number"
                step="0.01"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="Ej: 500.00"
              />
            </div>
            <button type="submit">Guardar Ingreso</button>
          </form>

          {/* FORMULARIO DE GASTOS (Modificado) */}
          <form onSubmit={handleSubmit} className="expense-form">
            <h2>Agregar Nuevo Gasto</h2>
            <div className="form-group">
              <label>Descripción*</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Almuerzo"
              />
            </div>
            <div className="form-group">
              <label>Monto ($)*</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 10.50"
              />
            </div>
            
            {/* Dropdown de Categoría (Modificado) */}
            <div className="form-group">
              <label>Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {allCategories.map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>
            
            <button type="submit">Guardar Gasto</button>
          </form>

          {/* GESTOR DE CATEGORÍAS (Añadido) */}
          <div className="category-manager">
            <h2>Administrar Categorías</h2>
            
            <form onSubmit={handleAddCategory} className="category-form">
              <div className="form-group">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nueva categoría (Ej: Gym)"
                />
                <button type="submit">+</button>
              </div>
            </form>

            <ul className="user-category-list">
              {userCategories.length === 0 && <small>No has agregado categorías.</small>}
              {userCategories.map((cat) => (
                <li key={cat.id}>
                  {cat.name}
                  <button 
                    className="delete-btn-small" 
                    title="Borrar categoría"
                    onClick={() => handleDeleteCategory(cat.id)}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>


        {/* --- Columna de Listas --- */}
        <div className="lists-column">

          {/* LISTA DE INGRESOS (Añadida) */}
          <div className="income-list">
            <h2>Ingresos Registrados</h2>
            {incomes.length === 0 ? (
              <p>No hay ingresos. ¡Agrega el primero!</p>
            ) : (
              incomes.map((income) => (
                <article key={income.id} className="income-card">
                  <div className="income-info">
                    <h3>{income.description}</h3>
                  </div>
                  <div className="income-amount">
                    <span>+${parseFloat(income.amount).toFixed(2)}</span>
                    <button 
                      className="delete-btn"
                      title="Eliminar ingreso"
                      onClick={() => handleIncomeDelete(income.id)}>
                      &times;
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* LISTA DE GASTOS (Original) */}
          <div className="expense-list">
            <h2>Gastos Registrados</h2>
            
            <div className="total-display">
              Total Gastado: <span>${totalExpenses.toFixed(2)}</span>
            </div>

            {expenses.length === 0 ? (
              <p>No hay gastos. ¡Agrega el primero!</p>
            ) : (
              expenses.map((expense) => (
                <article key={expense.id} className="expense-card">
                  <div className="expense-info">
                    <span className="category-tag">[{expense.category || 'Varios'}]</span>
                    <h3>{expense.description}</h3>
                  </div>
                  <div className="expense-amount">
                    <span>-${parseFloat(expense.amount).toFixed(2)}</span>
                    <button 
                      className="duplicate-btn"
                      title="Duplicar gasto"
                      onClick={() => handleDuplicate(expense)}>
                      +
                    </button>
                    <button 
                      className="delete-btn"
                      title="Eliminar gasto"
                      onClick={() => handleDelete(expense.id)}>
                      &times;
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default ExpenseManager;