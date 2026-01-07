import React, { useState } from 'react';
import { useBudget } from './BudgetContext';

const BudgetSelector = () => {
  // Traemos también addBudget y deleteBudget del contexto
  const { budgets, activeBudget, switchBudget, addBudget, deleteBudget, loading, dateRange } = useBudget();
  const token = localStorage.getItem('token');

  // Estado para el Modal de Crear Nuevo
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', amount: '', start: '', end: '' });

  if (loading) return <div style={styles.loading}>Cargando presupuestos...</div>;

  // --- HANDLERS ---
  const handleChange = (e) => {
    const newId = parseInt(e.target.value);
    switchBudget(newId, token);
  };

  const handleDelete = async () => {
    if (!activeBudget) return;
    if (activeBudget.type !== 'custom') {
        alert("No puedes borrar los presupuestos predeterminados (Mensual, Semanal, etc).");
        return;
    }
    
    const confirm = window.confirm(`¿Seguro que quieres eliminar el presupuesto "${activeBudget.name}"? Se perderá el historial de este evento.`);
    if (confirm) {
        await deleteBudget(activeBudget.id, token);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.start || !formData.end) return alert("Completa los campos");

    // Preparamos el objeto para el backend
    const payload = {
        name: formData.name,
        type: 'custom', // Importante
        limit_amount: parseFloat(formData.amount) || 0,
        start_date: formData.start,
        end_date: formData.end
    };

    const success = await addBudget(payload, token);
    if (success) {
        setShowModal(false);
        setFormData({ name: '', amount: '', start: '', end: '' });
    } else {
        alert("Error creando presupuesto");
    }
  };

  // Función visual fecha
  const formatDate = (dateString) => {
    if (!dateString) return '--/--/----';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <>
        <div style={styles.container}>
        
        {/* Encabezado */}
        <div style={styles.header}>
            <div style={styles.headerLeft}>
                <div style={styles.iconWrapper}>📊</div>
                <div>
                    <h3 style={styles.title}>Modo de Visualización</h3>
                    <p style={styles.subtitle}>Elige periodo o crea uno personalizado</p>
                </div>
            </div>
            {/* Botón para crear nuevo (Viaje, Proyecto...) */}
            <button onClick={() => setShowModal(true)} style={styles.addButton} title="Crear nuevo presupuesto personalizado">
                + Nuevo
            </button>
        </div>

        {/* Grupo de Control: Select + Borrar */}
        <div style={styles.controlGroup}>
            <select 
                value={activeBudget?.id || ''} 
                onChange={handleChange}
                style={styles.select}
            >
                {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                    {b.name} {b.type === 'custom' ? '(Personalizado)' : ''}
                </option>
                ))}
            </select>
            
            {/* Botón Borrar (Solo aparece si es custom) */}
            {activeBudget?.type === 'custom' && (
                <button onClick={handleDelete} style={styles.deleteButton} title="Borrar este presupuesto">
                    🗑️
                </button>
            )}
        </div>
        
        {/* Badge de Fechas */}
        <div style={styles.dateBadge}>
            <span style={styles.dateIcon}>📅</span>
            <span style={styles.dateText}>
                 
                Rango: <strong>{formatDate(dateRange.startDate)}</strong> al <strong>{formatDate(dateRange.endDate)}</strong>
            </span>
        </div>

        </div>

        {/* --- MODAL SIMPLE PARA CREAR --- */}
        {showModal && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <h3>✈️ Nuevo Presupuesto Personalizado</h3>
                    <p style={{fontSize:'0.9rem', color:'#666', marginBottom:'15px'}}>Ideal para viajes, bodas o proyectos específicos.</p>
                    
                    <form onSubmit={handleCreateSubmit} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <input 
                            placeholder="Nombre (ej: Viaje a España)" 
                            style={styles.input} 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                        />
                         
                        <input 
                            placeholder="Límite de Gasto (Opcional)" 
                            type="number"
                            style={styles.input} 
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                        />
                        <div style={{display:'flex', gap:'10px'}}>
                            <div style={{flex:1}}>
                                <label style={{fontSize:'0.8rem'}}>Inicio</label>
                                <input type="date" style={styles.input} value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} required />
                            </div>
                            <div style={{flex:1}}>
                                <label style={{fontSize:'0.8rem'}}>Fin</label>
                                <input type="date" style={styles.input} value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} required />
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancelar</button>
                            <button type="submit" style={styles.saveBtn}>Crear</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </>
  );
};

// --- ESTILOS ---
const styles = {
  container: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    marginBottom: '30px',
    border: '1px solid #f0f0f0',
    maxWidth: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // Separa titulo del boton +
    marginBottom: '15px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
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
    display: 'flex',
    gap: '10px',
  },
  select: {
    flex: 1, // Ocupa todo el espacio menos el botón de borrar
    padding: '12px 15px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  },
  addButton: {
    background: '#0284c7',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '5px 12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  deleteButton: {
    background: '#fee2e2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    width: '45px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdf4',
    border: '1px solid #dcfce7',
    color: '#166534',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    gap: '8px'
  },
  dateIcon: { fontSize: '1rem' },
  loading: { padding: '20px', textAlign: 'center', color: '#64748b' },

  // Estilos del Modal
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '15px',
  },
  saveBtn: {
    padding: '10px 20px',
    background: '#0284c7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    cursor: 'pointer',
  }
};

export default BudgetSelector;