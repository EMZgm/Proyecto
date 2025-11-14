import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

// Este componente recibe el 'token' y 'onLogout' desde App.js
function ExpenseManager({ token, onLogout }) {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Varios');
  const [error, setError] = useState(null);

  // === MODIFICACIÓN CLAVE ===
  // Creamos una función 'authedFetch' que incluye el token en los headers
  const authedFetch = (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Incluimos el token
    };
    return fetch(url, { ...options, headers });
  };
  // ==========================

  const fetchExpenses = () => {
    authedFetch(`${API_URL}/expenses`) // Usamos authedFetch
      .then((res) => {
        if (res.status === 401 || res.status === 403) onLogout(); // Token inválido, desloguear
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

  useEffect(() => {
    if (token) fetchExpenses();
  }, [token]);

  // Manejador para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Descripción y Monto son obligatorios');
      return;
    }

    try {
      const response = await authedFetch(`${API_URL}/expenses`, { // Usamos authedFetch
        method: 'POST',
        body: JSON.stringify({ description, amount: parseFloat(amount), category }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el gasto');
      }

      setDescription('');
      setAmount('');
      setCategory('Varios');
      setError(null);
      fetchExpenses(); 
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Manejador para borrar un gasto
  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que quieres borrar este gasto?')) {
      return;
    }

    try {
      const response = await authedFetch(`${API_URL}/expenses/${id}`, { // Usamos authedFetch
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
  
  // Duplicar... (Funciona igual, solo necesita usar authedFetch)
  const handleDuplicate = async (expenseToDuplicate) => {
    if (!window.confirm('¿Duplicar este gasto?')) return;
    const { description, amount, category } = expenseToDuplicate;
    try {
      const response = await authedFetch(`${API_URL}/expenses`, { // Usamos authedFetch
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


  // Calcular el total
  const totalAmount = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount), 
    0
  );

  return (
    <> {/* Usamos Fragment para no añadir un div extra */}
      <header>
        <h1>Mi Gestor de Gastos 💸</h1>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>

      {error && <div className="error-box">{error}</div>}

      <div className="content">
        <form onSubmit={handleSubmit} className="expense-form">
          <h2>Agregar Nuevo Gasto</h2>
          {/* ... (Tu formulario de gastos sigue igual) ... */}
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
          <div className="form-group">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Varios">Varios</option>
              <option value="Comida">Comida</option>
              <option valueT="Transporte">Transporte</option>
              <option value="Servicios">Servicios</option>
              <option value="Entretenimiento">Entretenimiento</option>
            </select>
          </div>
          <button type="submit">Guardar Gasto</button>
        </form>

        <div className="expense-list">
          <h2>Gastos Registrados</h2>
          
          <div className="total-display">
            Total Gastado: <span>${totalAmount.toFixed(2)}</span>
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
                  <span>${parseFloat(expense.amount).toFixed(2)}</span>
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
    </>
  );
}

export default ExpenseManager;