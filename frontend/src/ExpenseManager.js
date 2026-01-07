import React, { useState, useEffect, useRef } from 'react';
import ExpensesChart from './ExpensesChart';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ExpenseManager({ token, onLogout }) {
  const [view, setView] = useState('dashboard');
  const [showChart, setShowChart] = useState(true); 

  // === FILTROS ===
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hiddenCategories, setHiddenCategories] = useState([]);

  // Datos
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [expenseFields, setExpenseFields] = useState([]);
  const [incomeFields, setIncomeFields] = useState([]);

  // Formularios
  const [expenseForm, setExpenseForm] = useState({});
  const [incomeForm, setIncomeForm] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Configuración
  const [newFieldName, setNewFieldName] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const dragItem = useRef();
  const dragOverItem = useRef();

  // === FETCH HELPER ===
  const authedFetch = async (url, options = {}) => {
    const headers = { 
      ...options.headers, 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token'); 
        onLogout(); 
        return null; 
      }
      return response;
    } catch (error) {
      console.error("Error de red:", error);
      return null;
    }
  };

  // =========================================================
  // === LÓGICA DE TEXTO PURO (SIN new Date) ===
  // =========================================================

  // 1. Extraer "YYYY-MM-DD" cortando el string. 
  // NO convierte horas, NO usa zona horaria.
  const getDateString = (anyString) => {
    if (!anyString) return '';
    // Toma solo los primeros 10 caracteres: "2025-12-24"
    return String(anyString).substring(0, 10);
  };

  // 2. Formato Visual Manual (DD/MM/YYYY)
  const formatDateVisual = (dateString) => {
    const cleanDate = getDateString(dateString); // "2025-12-24"
    if (!cleanDate || cleanDate.length !== 10) return cleanDate;

    const [year, month, day] = cleanDate.split('-');
    // Mapeo manual de meses para evitar errores de índice
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  };

  // 3. Fecha de HOY como texto simple
  const getTodayString = () => {
    const d = new Date();
    // Aquí sí usamos new Date() solo para obtener los números de hoy en tu PC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // =========================================================

  // === CARGA DE DATOS ===
  const fetchFilteredExpenses = async () => {
    const res = await authedFetch(`${API_URL}/expenses`);
    if (!res) return;

    if (res.ok) {
        let data = await res.json();
        data = Array.isArray(data) ? data : [];

        // FILTRO: TEXTO vs TEXTO
        if (startDate && endDate) {
            data = data.filter(item => {
                // "2025-12-24"
                const itemDate = getDateString(item.date || item.created_at);
                // Comparación alfabética funciona perfecto con formato ISO
                return itemDate >= startDate && itemDate <= endDate;
            });
        }
        setExpenses(data);
    }
  };

  const fetchFilteredIncomes = async () => {
    const res = await authedFetch(`${API_URL}/incomes`);
    if (!res) return;

    if (res.ok) {
        let data = await res.json();
        data = Array.isArray(data) ? data : [];

        if (startDate && endDate) {
            data = data.filter(item => {
                const itemDate = getDateString(item.date || item.created_at);
                return itemDate >= startDate && itemDate <= endDate;
            });
        }
        setIncomes(data);
    }
  };

  const loadData = async () => {
    fetchFilteredExpenses(); 
    fetchFilteredIncomes();  
    
    const catRes = await authedFetch(`${API_URL}/categories`);
    if (catRes && catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data) ? data : []);
    }

    const expFieldRes = await authedFetch(`${API_URL}/form-fields/expense`);
    if (expFieldRes && expFieldRes.ok) setExpenseFields(await expFieldRes.json());

    const incFieldRes = await authedFetch(`${API_URL}/form-fields/income`);
    if (incFieldRes && incFieldRes.ok) setIncomeFields(await incFieldRes.json());
  };

  useEffect(() => { 
    if (token) loadData(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // === HELPERS DE CÁLCULO ===
  const safeCategories = Array.isArray(categories) ? categories : [];
  const allCats = [...new Set(['Varios', ...safeCategories.map(c => c.name)])];

  const handleToggleCategory = (catName) => {
    setHiddenCategories(prev => {
      if (prev.includes(catName)) return prev.filter(c => c !== catName);
      return [...prev, catName];
    });
  };

  const handleFilterDate = (e) => {
    e.preventDefault();
    fetchFilteredExpenses();
    fetchFilteredIncomes();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setHiddenCategories([]); 
    authedFetch(`${API_URL}/expenses`).then(r => r.json()).then(d => setExpenses(Array.isArray(d) ? d : []));
    authedFetch(`${API_URL}/incomes`).then(r => r.json()).then(d => setIncomes(Array.isArray(d) ? d : []));
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const expensesFilteredByCat = safeExpenses.filter(e => {
      const cat = e.category || (e.custom_data && e.custom_data.category) || 'Varios';
      return !hiddenCategories.includes(String(cat).trim());
  });

  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const totalInc = safeIncomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  
  const totalExp = expensesFilteredByCat.reduce((sum, e) => {
    return sum + (parseFloat(e.amount) || 0);
  }, 0);

  // === DRAG & DROP / CONFIG ===
  const saveOrder = async (items) => { const orderedIds = items.map(i => i.id); await authedFetch(`${API_URL}/form-fields/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }); };
  const handleSort = (context) => { const isExpense = context === 'expense'; let _items = [...(isExpense ? expenseFields : incomeFields)]; const draggedItemContent = _items.splice(dragItem.current, 1)[0]; _items.splice(dragOverItem.current, 0, draggedItemContent); dragItem.current = null; dragOverItem.current = null; if (isExpense) setExpenseFields(_items); else setIncomeFields(_items); saveOrder(_items); };
  const moveItem = (index, direction, context) => { const isExpense = context === 'expense'; let _items = [...(isExpense ? expenseFields : incomeFields)]; if (direction === -1 && index === 0) return; if (direction === 1 && index === _items.length - 1) return; const temp = _items[index]; _items[index] = _items[index + direction]; _items[index + direction] = temp; if (isExpense) setExpenseFields(_items); else setIncomeFields(_items); saveOrder(_items); };
  const onDragStart = (e, index) => { dragItem.current = index; e.target.classList.add('dragging-item'); };
  const onDragEnd = (e, context) => { e.target.classList.remove('dragging-item'); handleSort(context); };
  
  // === CRUD ===
  const openEditModal = (item, type) => { 
    const flatData = { ...item, ...(item.custom_data || {}) }; 
    // Al editar, simplemente cargamos el string cortado en el input
    if (flatData.date) flatData.date = getDateString(flatData.date);
    
    setEditingItem({ ...flatData, type }); 
    setEditForm(flatData); 
  };
  
  const handleUpdate = async (e) => { 
      e.preventDefault(); 
      if (!editingItem) return; 
      const body = { ...editForm };
      
      if (!body.date) body.date = getTodayString();
      
      const url = editingItem.type === 'expense' ? `${API_URL}/expenses/${editingItem.id}` : `${API_URL}/incomes/${editingItem.id}`; 
      const res = await authedFetch(url, { method: 'PUT', body: JSON.stringify(body) }); 
      if (res && res.ok) { setEditingItem(null); loadData(); } 
      else { alert('Error al actualizar.'); } 
  };
  
  const handleCreateChange = (e, context) => { const { name, value } = e.target; if (context === 'expense') setExpenseForm({ ...expenseForm, [name]: value }); else setIncomeForm({ ...incomeForm, [name]: value }); };
  const handleEditChange = (e) => { setEditForm({ ...editForm, [e.target.name]: e.target.value }); };
  
  const handleSubmit = async (e, context) => { 
      e.preventDefault(); 
      const url = context === 'expense' ? `${API_URL}/expenses` : `${API_URL}/incomes`; 
      const body = context === 'expense' ? { ...expenseForm } : { ...incomeForm };
      
      // Si no puso fecha, poner hoy (texto simple)
      if (!body.date) body.date = getTodayString();

      const res = await authedFetch(url, { method: 'POST', body: JSON.stringify(body) }); 
      if (res && res.ok) { 
          context === 'expense' ? setExpenseForm({}) : setIncomeForm({}); 
          loadData(); 
      } else { alert('Error al guardar.'); } 
  };

  const handleDelete = async (type, id) => { if (window.confirm('¿Borrar elemento?')) { await authedFetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' }); loadData(); } };
  const handleAddField = async (context) => { if (!newFieldName) return; await authedFetch(`${API_URL}/form-fields`, { method: 'POST', body: JSON.stringify({ context, label: newFieldName, type: 'text' }) }); setNewFieldName(''); loadData(); };
  const handleDeleteField = async (id) => { if (window.confirm('¿Eliminar campo?')) { await authedFetch(`${API_URL}/form-fields/${id}`, { method: 'DELETE' }); loadData(); } };
  const handleAddCategory = async (e) => { e.preventDefault(); if (!newCatName) return; await authedFetch(`${API_URL}/categories`, { method: 'POST', body: JSON.stringify({ name: newCatName }) }); setNewCatName(''); loadData(); };
  const handleDeleteCategory = async (id) => { if (window.confirm('¿Borrar categoría?')) { await authedFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' }); loadData(); } };

  // === RENDERS ===
  const renderForm = (fields, context, state, handleChange) => (
    <>
      {Array.isArray(fields) && fields.map(field => (
        <div key={field.id} className="form-group">
          <label>{field.label}</label>
          {field.type === 'select' ? (
            <select name={field.field_key} value={state[field.field_key] || ''} onChange={(e) => handleChange(e, context)}>
              <option value="">Seleccione...</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input 
              type={field.field_key === 'amount' ? 'number' : (field.field_key === 'date' ? 'date' : 'text')}
              step={field.field_key === 'amount' ? '0.01' : undefined}
              name={field.field_key}
              value={state[field.field_key] || ''}
              onChange={(e) => handleChange(e, context)}
              placeholder={field.label}
              className={!field.is_core ? 'dynamic-input' : ''}
            />
          )}
        </div>
      ))}
    </>
  );

  const renderItemContent = (item, type) => {
    const allData = { ...item, ...item.custom_data };
    const fieldsConfig = type === 'expense' ? expenseFields : incomeFields;
    if (!Array.isArray(fieldsConfig)) return null;

    const dateValue = allData.date || allData.created_at || item.date || item.created_at;

    return (
      <div className="item-details">
        {dateValue && (
            <div className="item-date">
                📅 <span>{formatDateVisual(dateValue)}</span>
            </div>
        )}
        {fieldsConfig.map(field => {
          const value = allData[field.field_key];
          if (!value || field.field_key === 'date') return null; 
          return (
            <div key={field.id} className="field-row">
              <span className="field-label">{field.label}:</span>
              <span className="field-value">{value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // VISTA SETTINGS
  if (view.startsWith('settings_')) {
    const isExpense = view === 'settings_expense';
    const context = isExpense ? 'expense' : 'income';
    const fields = isExpense ? expenseFields : incomeFields;
    const safeFields = Array.isArray(fields) ? fields : [];

    return (
      <div className="content settings-view">
        <header className="settings-header">
          <button onClick={() => setView('dashboard')} className="back-btn">⬅ Volver</button>
          <h2>⚙️ Configuración {isExpense ? 'Gastos' : 'Ingresos'}</h2>
        </header>
        <div className="settings-grid">
          <div className="settings-card">
            <h3>Campos del Formulario</h3>
            <ul className="sortable-list">
              {safeFields.map((f, index) => (
                <li key={f.id} draggable onDragStart={(e) => onDragStart(e, index)} onDragEnter={(e) => dragOverItem.current = index} onDragEnd={(e) => onDragEnd(e, context)} onDragOver={(e) => e.preventDefault()} className="draggable-item">
                  <div className="drag-handle">☰</div>
                  <div className="field-info"><strong>{f.label}</strong></div>
                  <div className="arrow-controls"><button onClick={() => moveItem(index, -1, context)} disabled={index === 0}>▲</button><button onClick={() => moveItem(index, 1, context)} disabled={index === fields.length - 1}>▼</button>{f.field_key !== 'amount' && <button onClick={() => handleDeleteField(f.id)} className="delete-btn" style={{width:'20px', height:'20px', fontSize:'0.7rem', marginLeft: '5px'}}>&times;</button>}</div>
                </li>
              ))}
            </ul>
            <div className="mini-form"><input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Nuevo Campo..." /><button onClick={() => handleAddField(context)}>+</button></div>
          </div>
          {isExpense && safeFields.find(f => f.field_key === 'category') && (
            <div className="settings-card">
              <h3>Categorías</h3>
              <ul>{safeCategories.map(c => <li key={c.id}>{c.name} <button onClick={() => handleDeleteCategory(c.id)} className="delete-btn" style={{width:'24px', height:'24px'}}>&times;</button></li>)}</ul>
              <form onSubmit={handleAddCategory} className="mini-form"><input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva..." /><button type="submit">+</button></form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VISTA DASHBOARD
  return (
    <>
      <header>
        <h1>Mi bolsillo</h1>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>

      {/* BALANCE */}
      <div className="balance-bar">
        <div className="balance-card income"><span>Ingresos</span><span>+${totalInc.toFixed(2)}</span></div>
        <div className="balance-card expense"><span>Gastos</span><span>-${totalExp.toFixed(2)}</span></div>
        <div className="balance-card balance">
          <span>Balance</span>
          <span style={{ color: (totalInc - totalExp) >= 0 ? 'var(--success)' : '#c0392b' }}>
            ${(totalInc - totalExp).toFixed(2)}
          </span>
        </div>
      </div>

      {/* FILTROS (Limpio, usa clases CSS) */}
      <div className="filters-container">
          <strong>📅 Filtrar por Fecha:</strong>
          <input type="date" className="date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{color: '#999'}}>—</span>
          <input type="date" className="date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button onClick={handleFilterDate} className="filter-btn">Ver</button>
          {(startDate || endDate) && (<button onClick={clearFilters} className="clear-btn">Limpiar</button>)}
      </div>

      <div className="content">
        <div className="forms-column">
          <form onSubmit={(e) => handleSubmit(e, 'income')} className="income-form">
            <div className="form-header"><h2>Añadir Ingreso</h2><button type="button" className="gear-btn" onClick={() => setView('settings_income')}>⚙️</button></div>
            {renderForm(incomeFields, 'income', incomeForm, handleCreateChange)}
            <button type="submit">Guardar</button>
          </form>
          
          <form onSubmit={(e) => handleSubmit(e, 'expense')} className="expense-form">
            <div className="form-header"><h2>Nuevo Gasto</h2><button type="button" className="gear-btn" onClick={() => setView('settings_expense')}>⚙️</button></div>
            {renderForm(expenseFields, 'expense', expenseForm, handleCreateChange)}
            <button type="submit">Guardar</button>
          </form>
        </div>

        <div className="lists-column">
          <div className="income-list">
             <h3>Ingresos Recientes {startDate ? '(Filtrados)' : ''}</h3>
             {Array.isArray(safeIncomes) && safeIncomes.length > 0 ? (
               safeIncomes.map(inc => (
                 <article key={inc.id} className="income-card">
                   {renderItemContent(inc, 'income')}
                   <div className="card-actions"><button onClick={() => openEditModal(inc, 'income')} className="edit-btn">✏️</button><button onClick={() => handleDelete('incomes', inc.id)} className="delete-btn">&times;</button></div>
                 </article>
               ))
             ) : (<p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No hay ingresos registrados</p>)}
          </div>
          
          <div className="expense-list">
            <h3>Gastos Recientes {hiddenCategories.length > 0 || startDate ? '(Filtrados)' : ''}</h3>
            {Array.isArray(expensesFilteredByCat) && expensesFilteredByCat.length > 0 ? (
              expensesFilteredByCat.map(exp => (
                <article key={exp.id} className="expense-card">
                  {renderItemContent(exp, 'expense')}
                  <div className="card-actions"><button onClick={() => openEditModal(exp, 'expense')} className="edit-btn">✏️</button><button onClick={() => handleDelete('expenses', exp.id)} className="delete-btn">&times;</button></div>
                </article>
              ))
            ) : (<p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No hay gastos para mostrar</p>)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', marginBottom: '40px' }}>
        <button className="toggle-chart-btn" onClick={() => setShowChart(!showChart)}>
            <span>📊 Visualización y Categorías</span><span>{showChart ? '🔼' : '🔽'}</span>
        </button>

        {showChart && (
            <div className="chart-section">
                <div className="category-filter-area">
                    <div style={{display:'flex', flexDirection:'column', gap: '5px'}}>
                        <strong>🏷️ Categorías Visibles:</strong>
                        <div className="category-chips">
                            {allCats.map(cat => {
                              const isChecked = !hiddenCategories.includes(cat);
                              return (
                                <label key={cat} className="cat-chip" style={{ opacity: isChecked ? 1 : 0.6 }}>
                                    <input type="checkbox" checked={isChecked} onChange={() => handleToggleCategory(cat)} />
                                    <span style={{ textDecoration: isChecked ? 'none' : 'line-through' }}>{cat}</span>
                                </label>
                              );
                            })}
                            {allCats.length === 0 && <span style={{color: '#999'}}>No hay categorías aún</span>}
                        </div>
                    </div>
                    {hiddenCategories.length > 0 && (
                        <button onClick={() => setHiddenCategories([])} className="show-all-link">Mostrar Todas</button>
                    )}
                </div>
                <ExpensesChart expenses={safeExpenses} incomes={safeIncomes} hiddenCategories={hiddenCategories} onToggleCategory={handleToggleCategory} currentTotalExp={totalExp} />
            </div>
        )}
      </div>

      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar {editingItem.type === 'expense' ? 'Gasto' : 'Ingreso'}</h2>
            <form onSubmit={handleUpdate}>
              {renderForm(editingItem.type === 'expense' ? expenseFields : incomeFields, editingItem.type, editForm, handleEditChange)}
              <div className="modal-buttons"><button type="button" onClick={() => setEditingItem(null)} className="cancel-btn">Cancelar</button><button type="submit" className="save-btn">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpenseManager;