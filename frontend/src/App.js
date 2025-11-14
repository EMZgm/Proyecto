import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './AuthPage'; // Nuevo componente
import ExpenseManager from './ExpenseManager'; // Nuevo componente

function App() {
  // Intentamos leer el token guardado en el navegador
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Efecto para guardar/borrar el token del localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Función de Logout
  const handleLogout = () => {
    setToken(null);
  };

  return (
    <div className="container">
      {token ? (
        // Si hay token, mostramos el Gestor de Gastos
        <ExpenseManager token={token} onLogout={handleLogout} />
      ) : (
        // Si NO hay token, mostramos la página de Login/Registro
        <AuthPage onLoginSuccess={setToken} />
      )}
    </div>
  );
}

export default App;