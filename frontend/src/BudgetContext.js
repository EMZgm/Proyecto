import React, { createContext, useState, useContext } from 'react';

// 1. EL CONTEXTO
const BudgetContext = createContext();

// 2. UTILIDAD PARA CALCULAR FECHAS (Ahora incluye SEMANAL)
const getDateRange = (type) => {
  const now = new Date();
  let start = new Date(now); // Copiamos la fecha actual
  let end = new Date(now);

  // Reseteamos horas para evitar problemas de zona horaria en comparaciones
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (type === 'daily') {
    // Ya está configurado (hoy 00:00 a hoy 23:59)
  } 
  else if (type === 'weekly') {
    // Calcular el Lunes de esta semana
    const day = now.getDay(); // 0 es Domingo, 1 es Lunes...
    // Si es domingo (0), restamos 6 días. Si es otro día, restamos (day - 1)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    
    start.setDate(diff); // Establecer al Lunes
    start.setHours(0, 0, 0, 0);

    end = new Date(start);
    end.setDate(start.getDate() + 6); // Lunes + 6 días = Domingo
    end.setHours(23, 59, 59, 999);
  }
  else if (type === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } 
  else if (type === 'yearly') {
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

  // LOGICA ACTUALIZADA PARA CUSTOM
  const updateActiveState = (budget) => {
    setActiveBudget(budget);
    
    let dates;
    if (budget.type === 'custom') {
      // Si es personalizado, usamos las fechas fijas que vienen de la BD
      // Asegúrate de que tu BD devuelva start_date y end_date en formato YYYY-MM-DD
      dates = {
        startDate: budget.start_date ? budget.start_date.split('T')[0] : null,
        endDate: budget.end_date ? budget.end_date.split('T')[0] : null
      };
    } else {
      // Si es estándar (diario, semanal, mensual, anual), calculamos dinámicamente
      dates = getDateRange(budget.type);
    }
    
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