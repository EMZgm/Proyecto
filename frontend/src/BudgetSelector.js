import React from 'react';
import { useBudget } from './BudgetContext';

const BudgetSelector = () => {
  const { budgets, activeBudget, switchBudget, loading, dateRange } = useBudget();
  const token = localStorage.getItem('token');

  if (loading) return <div style={styles.loading}>Cargando presupuestos...</div>;

  const handleChange = (e) => {
    const newId = e.target.value;
    switchBudget(newId, token);
  };

  // Función para que las fechas se vean bonitas (DD/MM/AAAA)
  const formatDate = (dateString) => {
    if (!dateString) return '--/--/----';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={styles.container}>
      
      {/* Encabezado e Icono */}
      <div style={styles.header}>
        <div style={styles.iconWrapper}>📊</div>
        <div>
            <h3 style={styles.title}>Modo de Visualización</h3>
            <p style={styles.subtitle}>Elige qué periodo de tiempo analizar</p>
        </div>
      </div>

      {/* Selector Estilizado */}
      <div style={styles.controlGroup}>
        <select 
            value={activeBudget?.id || ''} 
            onChange={handleChange}
            style={styles.select}
        >
            {budgets.map((b) => (
            <option key={b.id} value={b.id}>
                {b.name}
            </option>
            ))}
        </select>
      </div>
      
      {/* Badge de Fechas (Reemplaza el texto feo) */}
      <div style={styles.dateBadge}>
        <span style={styles.dateIcon}>📅</span>
        <span style={styles.dateText}>
            Mostrando: <strong>{formatDate(dateRange.startDate)}</strong> al <strong>{formatDate(dateRange.endDate)}</strong>
        </span>
      </div>

    </div>
  );
};

// --- ESTILOS EN JS (Para no ensuciar tu CSS global) ---
const styles = {
  container: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    marginBottom: '30px',
    border: '1px solid #f0f0f0',
    maxWidth: '100%',
    transition: 'transform 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    gap: '12px'
  },
  iconWrapper: {
    background: '#e0f2fe',
    color: '#0284c7',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#64748b',
  },
  controlGroup: {
    marginBottom: '15px',
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: '12px 15px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none', // Intenta ocultar la flecha nativa fea en algunos navegadores
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 15px center',
    backgroundSize: '16px',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdf4', // Fondo verde muy claro
    border: '1px solid #dcfce7',
    color: '#166534', // Texto verde oscuro
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    gap: '8px'
  },
  dateIcon: {
    fontSize: '1rem',
  },
  dateText: {
    textAlign: 'center',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#64748b',
    fontStyle: 'italic',
  }
};

export default BudgetSelector;