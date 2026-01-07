import React, { createContext, useState, useContext } from 'react';

// 1. EL CONTEXTO
const BudgetContext = createContext();

// 2. UTILIDAD PARA CALCULAR FECHAS
const getDateRange = (type) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  // Reseteamos horas
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (type === 'daily') {
    // Ya está configurado
  } 
  else if (type === 'weekly') {
    const day = now.getDay(); // 0 Domingo, 1 Lunes...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    
    start.setDate(diff); // Lunes
    start.setHours(0, 0, 0, 0);

    end = new Date(start);
    end.setDate(start.getDate() + 6); // Domingo
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

  // --- OBTENER PRESUPUESTOS ---
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

  // --- HELPER DE ESTADO ---
  const updateActiveState = (budget) => {
    setActiveBudget(budget);
    
    let dates;
    if (budget.type === 'custom') {
      // Usamos las fechas de la BD para los personalizados
      dates = {
        startDate: budget.start_date ? budget.start_date.split('T')[0] : null,
        endDate: budget.end_date ? budget.end_date.split('T')[0] : null
      };
    } else {
      // Calculamos dinámicamente para los automáticos
      dates = getDateRange(budget.type);
    }
    
    setDateRange(dates);
  };

  // --- ACTIVAR UN PRESUPUESTO ---
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

  // --- CREAR NUEVO (Personalizado) ---
  const addBudget = async (budgetData, token) => {
    try {
      const res = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(budgetData)
      });
      
      if (res.ok) {
        await fetchBudgets(token); // Recargamos la lista para que aparezca
        return true;
      }
    } catch (err) { console.error("Error creando presupuesto", err); }
    return false;
  };

  // --- BORRAR (Solo Custom) ---
  const deleteBudget = async (id, token) => {
    try {
      const res = await fetch(`${API_URL}/budgets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        // Si el usuario borra el presupuesto que tiene activo actualmente,
        // lo cambiamos al 'monthly' para evitar errores visuales.
        if (activeBudget && activeBudget.id === id) {
            const monthly = budgets.find(b => b.type === 'monthly');
            if (monthly) switchBudget(monthly.id, token);
        }
        await fetchBudgets(token); // Recargamos la lista
      }
    } catch (err) { console.error("Error borrando presupuesto", err); }
  };

  return (
    <BudgetContext.Provider value={{ 
      budgets, 
      activeBudget, 
      dateRange, 
      loading, 
      fetchBudgets, 
      switchBudget,
      addBudget,    // <--- NUEVO
      deleteBudget  // <--- NUEVO
    }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => useContext(BudgetContext);