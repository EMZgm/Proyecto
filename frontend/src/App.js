import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './AuthPage'; 
import ExpenseManager from './ExpenseManager'; 
import { BudgetProvider } from './BudgetContext'; // <--- 1. IMPORTAR EL PROVIDER

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
        // Si hay token, envolvemos el Gestor con el Provider
        // <--- 2. ENVOLVER AQUÍ
        <BudgetProvider>
            <ExpenseManager token={token} onLogout={handleLogout} />
        </BudgetProvider>
      ) : (
        // Si NO hay token, mostramos la página de Login/Registro
        <AuthPage onLoginSuccess={setToken} />
      )}
    </div>
  );
}

export default App;