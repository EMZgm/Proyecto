import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function ExpenseManager({ token, onLogout }) {
  const [view, setView] = useState('dashboard');
  
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [expenseFields, setExpenseFields] = useState([]);
  const [incomeFields, setIncomeFields] = useState([]);

  // Estados de formularios (CREAR)
  const [expenseForm, setExpenseForm] = useState({});
  const [incomeForm, setIncomeForm] = useState({});

  // === ESTADO PARA LA EDICIÓN (NUEVO) ===
  const [editingItem, setEditingItem] = useState(null); // El objeto que estamos editando
  const [editForm, setEditForm] = useState({}); // Los datos del formulario de edición

  // Configuración
  const [newFieldName, setNewFieldName] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // Refs Drag & Drop
  const dragItem = useRef();
  const dragOverItem = useRef();

  const authedFetch = (url, options = {}) => {
    const headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    return fetch(url, { ...options, headers });
  };

  const loadData = () => {
    authedFetch(`${API_URL}/expenses`).then(r => r.json()).then(setExpenses);
    authedFetch(`${API_URL}/incomes`).then(r => r.json()).then(setIncomes);
    authedFetch(`${API_URL}/categories`).then(r => r.json()).then(setCategories);
    authedFetch(`${API_URL}/form-fields/expense`).then(r => r.json()).then(setExpenseFields);
    authedFetch(`${API_URL}/form-fields/income`).then(r => r.json()).then(setIncomeFields);
  };

  useEffect(() => { if (token) loadData(); }, [token]);

  // === LÓGICA DE REORDENAMIENTO (Drag & Drop) ===
  const saveOrder = async (items) => {
    const orderedIds = items.map(i => i.id);
    await authedFetch(`${API_URL}/form-fields/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) });
  };

  const handleSort = (context) => {
    const isExpense = context === 'expense';
    let _items = [...(isExpense ? expenseFields : incomeFields)];
    const draggedItemContent = _items.splice(dragItem.current, 1)[0];
    _items.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null; dragOverItem.current = null;
    if (isExpense) setExpenseFields(_items); else setIncomeFields(_items);
    saveOrder(_items);
  };

  const moveItem = (index, direction, context) => {
    const isExpense = context === 'expense';
    let _items = [...(isExpense ? expenseFields : incomeFields)];
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === _items.length - 1) return;
    const temp = _items[index];
    _items[index] = _items[index + direction];
    _items[index + direction] = temp;
    if (isExpense) setExpenseFields(_items); else setIncomeFields(_items);
    saveOrder(_items);
  };

  const onDragStart = (e, index) => { dragItem.current = index; e.target.classList.add('dragging-item'); };
  const onDragEnter = (e, index) => { dragOverItem.current = index; };
  const onDragEnd = (e, context) => { e.target.classList.remove('dragging-item'); handleSort(context); };

  // ==========================================
  // MANEJADORES DE DATOS (CRUD)
  // ==========================================

  // --- ABRIR MODAL DE EDICIÓN ---
  const openEditModal = (item, type) => {
    // Aplanamos los datos: sacamos lo que está en 'custom_data' al nivel raíz
    // para que el formulario lo entienda fácilmente.
    const flatData = {
      ...item,
      ...(item.custom_data || {})
    };
    setEditingItem({ ...flatData, type }); // Guardamos el tipo (expense/income) para saber a qué URL enviar
    setEditForm(flatData); // Llenamos el formulario
  };

  // --- GUARDAR EDICIÓN ---
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const url = editingItem.type === 'expense' 
      ? `${API_URL}/expenses/${editingItem.id}` 
      : `${API_URL}/incomes/${editingItem.id}`;

    const res = await authedFetch(url, { method: 'PUT', body: JSON.stringify(editForm) });
    
    if (res.ok) {
      setEditingItem(null); // Cerrar modal
      loadData(); // Recargar lista
    } else {
      alert('Error al actualizar.');
    }
  };

  // --- CREAR NUEVO ---
  const handleCreateChange = (e, context) => {
    const { name, value } = e.target;
    if (context === 'expense') setExpenseForm({ ...expenseForm, [name]: value });
    else setIncomeForm({ ...incomeForm, [name]: value });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e, context) => {
    e.preventDefault();
    const url = context === 'expense' ? `${API_URL}/expenses` : `${API_URL}/incomes`;
    const body = context === 'expense' ? expenseForm : incomeForm;
    const res = await authedFetch(url, { method: 'POST', body: JSON.stringify(body) });
    if (res.ok) {
      context === 'expense' ? setExpenseForm({}) : setIncomeForm({});
      loadData();
    } else { alert('Error al guardar.'); }
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('¿Borrar elemento?')) { await authedFetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' }); loadData(); }
  };

  // --- CONFIGURACIÓN ---
  const handleAddField = async (context) => {
    if (!newFieldName) return;
    await authedFetch(`${API_URL}/form-fields`, { method: 'POST', body: JSON.stringify({ context, label: newFieldName, type: 'text' }) });
    setNewFieldName(''); loadData();
  };
  const handleDeleteField = async (id) => {
    if (window.confirm('¿Ocultar/Eliminar campo?')) { await authedFetch(`${API_URL}/form-fields/${id}`, { method: 'DELETE' }); loadData(); }
  };
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    await authedFetch(`${API_URL}/categories`, { method: 'POST', body: JSON.stringify({ name: newCatName }) });
    setNewCatName(''); loadData();
  };
  const handleDeleteCategory = async (id) => {
    if (window.confirm('¿Borrar categoría?')) { await authedFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' }); loadData(); }
  };

  // Helpers
  const getFieldLabel = (key, context) => {
    const fields = context === 'expense' ? expenseFields : incomeFields;
    const found = fields.find(f => f.field_key === key);
    return found ? found.label : key;
  };
  const allCats = [...new Set(['Varios', ...categories.map(c => c.name)])];
  const totalInc = incomes.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalExp = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // RENDERIZADOR DE FORMULARIOS (Reutilizable para Crear y Editar)
  const renderForm = (fields, context, state, handleChange) => (
    <>
      {fields.map(field => (
        <div key={field.id} className="form-group">
          <label>{field.label}</label>
          {field.type === 'select' ? (
            <select name={field.field_key} value={state[field.field_key] || ''} onChange={(e) => handleChange(e, context)}>
              <option value="">Seleccione...</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input
              type={field.field_key === 'amount' ? 'number' : 'text'}
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

  // === RENDERIZADOR DE ITEMS EN LISTA (Diseño Limpio) ===
  const renderItemContent = (item, type) => {
    // Juntamos todos los datos en un solo objeto para iterar
    const allData = { ...item, ...item.custom_data };
    
    // Obtenemos los campos configurados para saber el orden correcto
    const fieldsConfig = type === 'expense' ? expenseFields : incomeFields;

    return (
      <div className="item-details">
        {/* Iteramos sobre la configuración para respetar el orden del usuario */}
        {fieldsConfig.map(field => {
          const value = allData[field.field_key];
          if (!value) return null; // Si no hay dato, no mostramos nada

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

  // === VISTA: CONFIGURACIÓN ===
  if (view.startsWith('settings_')) {
    const isExpense = view === 'settings_expense';
    const context = isExpense ? 'expense' : 'income';
    const fields = isExpense ? expenseFields : incomeFields;

    return (
      <div className="content settings-view">
        <header className="settings-header">
          <button onClick={() => setView('dashboard')} className="back-btn">⬅ Volver</button>
          <h2>⚙️ Configuración {isExpense ? 'Gastos' : 'Ingresos'}</h2>
        </header>
        <div className="settings-grid">
          <div className="settings-card">
            <h3>Orden de Campos</h3>
            <ul className="sortable-list">
              {fields.map((f, index) => (
                <li key={f.id} draggable onDragStart={(e) => onDragStart(e, index)} onDragEnter={(e) => dragOverItem.current = index} onDragEnd={(e) => onDragEnd(e, context)} onDragOver={(e) => e.preventDefault()} className="draggable-item">
                  <div className="drag-handle">☰</div>
                  <div className="field-info"><strong>{f.label}</strong>{f.is_core && <small>(Default)</small>}</div>
                  <div className="field-actions">
                    <div className="arrow-controls">
                      <button onClick={() => moveItem(index, -1, context)} disabled={index===0}>▲</button>
                      <button onClick={() => moveItem(index, 1, context)} disabled={index===fields.length-1}>▼</button>
                    </div>
                    {f.field_key !== 'amount' ? <button onClick={() => handleDeleteField(f.id)} className="delete-btn">&times;</button> : <span style={{opacity:0.3, padding:'0 10px'}}>🔒</span>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mini-form" style={{marginTop: 20}}>
              <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Nuevo Campo..." />
              <button onClick={() => handleAddField(context)}>+</button>
            </div>
          </div>
          {isExpense && fields.find(f => f.field_key === 'category') && (
            <div className="settings-card">
              <h3>Categorías</h3>
              <ul>{categories.map(c => <li key={c.id}>{c.name} <button onClick={() => handleDeleteCategory(c.id)} className="delete-btn">&times;</button></li>)}</ul>
              <form onSubmit={handleAddCategory} className="mini-form"><input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva..." /><button type="submit">+</button></form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === VISTA: DASHBOARD ===
  return (
    <>
      <header>
        <h1>Mi Gestor 💸</h1>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>
      
      <div className="balance-bar">
        <div className="balance-card income"><span>Ingresos</span><span>+${totalInc.toFixed(2)}</span></div>
        <div className="balance-card expense"><span>Gastos</span><span>-${totalExp.toFixed(2)}</span></div>
        <div className="balance-card balance"><span>Balance</span><span style={{color:(totalInc - totalExp)>=0?'#27ae60':'#c0392b'}}>${(totalInc - totalExp).toFixed(2)}</span></div>
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
            <h3>Ingresos</h3>
            {incomes.map(inc => (
              <article key={inc.id} className="income-card">
                {renderItemContent(inc, 'income')}
                <div className="card-actions">
                  <button onClick={() => openEditModal(inc, 'income')} className="edit-btn">✏️</button>
                  <button onClick={() => handleDelete('incomes', inc.id)} className="delete-btn">&times;</button>
                </div>
              </article>
            ))}
          </div>
          <div className="expense-list">
            <h3>Gastos</h3>
            {expenses.map(exp => (
              <article key={exp.id} className="expense-card">
                {renderItemContent(exp, 'expense')}
                <div className="card-actions">
                  <button onClick={() => openEditModal(exp, 'expense')} className="edit-btn">✏️</button>
                  <button onClick={() => handleDelete('expenses', exp.id)} className="delete-btn">&times;</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* === MODAL DE EDICIÓN === */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar {editingItem.type === 'expense' ? 'Gasto' : 'Ingreso'}</h2>
            <form onSubmit={handleUpdate}>
              {renderForm(
                editingItem.type === 'expense' ? expenseFields : incomeFields, 
                editingItem.type, 
                editForm, 
                handleEditChange
              )}
              <div className="modal-buttons">
                <button type="button" onClick={() => setEditingItem(null)} className="cancel-btn">Cancelar</button>
                <button type="submit" className="save-btn">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpenseManager;