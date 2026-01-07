import React from 'react';
import { useBudget } from './BudgetContext';

const BudgetSelector = () => {
  const { budgets, activeBudget, switchBudget, loading } = useBudget();
  const token = localStorage.getItem('token');

  if (loading) return <span>Cargando...</span>;

  const handleChange = (e) => {
    const newId = e.target.value;
    switchBudget(newId, token);
  };

  return (
    <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f4f8', borderRadius: '8px' }}>
      <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Modo Presupuesto:</label>
      <select 
        value={activeBudget?.id || ''} 
        onChange={handleChange}
        style={{ padding: '5px', borderRadius: '4px' }}
      >
        {budgets.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.type === 'monthly' ? 'Mes' : b.type === 'daily' ? 'Día' : 'Año'})
          </option>
        ))}
      </select>
      
      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
        {activeBudget?.type === 'daily' && "Mostrando solo datos de HOY"}
        {activeBudget?.type === 'monthly' && "Mostrando datos de ESTE MES"}
        {activeBudget?.type === 'yearly' && "Mostrando datos de ESTE AÑO"}
      </div>
    </div>
  );
};

export default BudgetSelector;