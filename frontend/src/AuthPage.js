import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

// Este componente maneja tanto el Login como el Registro
function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true); // Controla si es Login o Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = isLogin ? `${API_URL}/login` : `${API_URL}/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }

      if (isLogin) {
        // Si fue login exitoso, llamamos a la función del App.js
        onLoginSuccess(data.token);
      } else {
        // Si fue registro exitoso, le decimos al usuario que ahora inicie sesión
        alert('¡Registro exitoso! Ahora, por favor inicia sesión.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        
        {error && <div className="error-box">{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>
        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit">{isLogin ? 'Entrar' : 'Crear Cuenta'}</button>
        
        <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin 
            ? '¿No tienes cuenta? Regístrate' 
            : '¿Ya tienes cuenta? Inicia sesión'}
        </p>
      </form>
    </div>
  );
}

export default AuthPage;