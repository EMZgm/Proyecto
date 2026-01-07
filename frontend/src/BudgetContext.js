import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. EL CONTEXTO
const BudgetContext = createContext();

// 2. UTILIDAD PARA CALCULAR FECHAS
const getDateRange = (type) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (type === 'daily') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

// 3. EL PROVEEDOR
export const BudgetProvider = ({ children }) => {
  const [budgets, setBudgets] = useState([]);
  const [activeBudget, setActiveBudget] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const fetchBudgets = async (token) => {
    try {
      const res = await fetch(`${API_URL}/budgets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      setBudgets(data);

      const active = data.find(b => b.is_active);
      if (active) {
        updateActiveState(active);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error cargando presupuestos", err);
      setLoading(false);
    }
  };

  const updateActiveState = (budget) => {
    setActiveBudget(budget);
    const dates = getDateRange(budget.type);
    setDateRange(dates);
  };

  const switchBudget = async (budgetId, token) => {
    try {
      const res = await fetch(`${API_URL}/budgets/activate/${budgetId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedBudget = await res.json();
      
      const newBudgets = budgets.map(b => ({
        ...b,
        is_active: b.id === updatedBudget.id
      }));
      
      setBudgets(newBudgets);
      updateActiveState(updatedBudget);
    } catch (err) {
      console.error("Error cambiando presupuesto", err);
    }
  };

  return (
    <BudgetContext.Provider value={{ 
      budgets, 
      activeBudget, 
      dateRange, 
      loading, 
      fetchBudgets, 
      switchBudget 
    }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => useContext(BudgetContext);