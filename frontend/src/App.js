import React, { useState, useEffect } from 'react';
import './App.css'; 

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); 
  const [category, setCategory] = useState('Varios'); 
  const [error, setError] = useState(null);

  // Cargar gastos al iniciar
  const fetchExpenses = () => {
    fetch(`${API_URL}/expenses`)
      .then((res) => res.json())
      .then((data) => setExpenses(data))
      .catch((err) => {
        console.error(err);
        setError('Error al cargar los gastos.');
      });
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Manejador para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Descripción y Monto son obligatorios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount: parseFloat(amount), category }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el gasto');
      }

      // Limpiar formulario
      setDescription('');
      setAmount('');
      setCategory('Varios');
      setError(null);
      fetchExpenses(); // Volver a cargar la lista
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
      const response = await fetch(`${API_URL}/expenses/${id}`, {
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

  const handleDuplicate = async (expenseToDuplicate) => {
    if (!window.confirm('¿Duplicar este gasto?')) {
      return;
    }

    // Usamos los datos del gasto que queremos duplicar
    const { description, amount, category } = expenseToDuplicate;

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Creamos un nuevo gasto con los mismos datos
        body: JSON.stringify({ description, amount: parseFloat(amount), category }),
      });

      if (!response.ok) {
        throw new Error('Error al duplicar el gasto');
      }
      
      setError(null);
      fetchExpenses(); // Recargamos la lista para ver el gasto duplicado
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
    <div className="container">
      <header>
        <h1>Mi Gestor de Gastos</h1>
      </header>

      {error && <div className="error-box">{error}</div>}

      <div className="content">
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
          <div className="form-group">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Varios">Varios</option>
              <option value="Comida">Comida</option>
              <option value="Transporte">Transporte</option>
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
                  
                  {/* ==  NUEVO BOTÓN DE DUPLICAR  == */}
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
  );
}

export default App;