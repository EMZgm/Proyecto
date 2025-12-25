import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title
);

function ExpensesChart({ expenses, incomes, hiddenCategories = [], onToggleCategory }) {
  
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeIncomes = Array.isArray(incomes) ? incomes : [];

  const { chartData, categoryStats } = useMemo(() => {
    const categoriesMap = {};
    const totalInc = safeIncomes.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // 1. Mapeo de datos completo
    safeExpenses.forEach(exp => {
      let catName = exp.category || (exp.custom_data && exp.custom_data.category) || 'Varios';
      catName = String(catName).trim(); 
      const amount = parseFloat(exp.amount) || 0;

      if (categoriesMap[catName]) {
        categoriesMap[catName] += amount;
      } else {
        categoriesMap[catName] = amount;
      }
    });

    const allLabels = Object.keys(categoriesMap);
    
    // 2. Calcular Total Visible
    const totalVisibleExp = allLabels.reduce((sum, label) => {
        if (hiddenCategories.includes(label)) return sum; 
        return sum + categoriesMap[label];
    }, 0);

    // 3. Datos para Gráficos
    // Para el gráfico de Torta, si está oculto pasamos null, pero mantenemos la etiqueta
    const pieValues = allLabels.map(label => {
        return hiddenCategories.includes(label) ? null : categoriesMap[label];
    });

    // 4. Datos para Tarjetas (Stats)
    const statsArray = allLabels.map((label, index) => {
        const amount = categoriesMap[label];
        const isHidden = hiddenCategories.includes(label);
        const percentage = (!isHidden && totalVisibleExp > 0) 
            ? ((amount / totalVisibleExp) * 100).toFixed(1) 
            : '0.0';
            
        return { 
            name: label, 
            amount, 
            percentage, 
            isHidden,
            colorIndex: index 
        };
    });

    // Ordenar stats
    statsArray.sort((a, b) => {
        if (a.isHidden && !b.isHidden) return 1;
        if (!a.isHidden && b.isHidden) return -1;
        return b.amount - a.amount;
    });

    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#E7E9ED', '#76D7C4', '#F1948A', '#BB8FCE', '#85C1E9', '#F7DC6F'
    ];

    return {
      categoryStats: statsArray,
      chartData: {
        pieData: {
          labels: allLabels, 
          datasets: [
            {
              data: pieValues, 
              backgroundColor: backgroundColors,
              borderWidth: 1,
            },
          ],
        },
        barData: {
          labels: ['Balance Actual'],
          datasets: [
            {
              label: 'Ingresos',
              data: [totalInc],
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
              label: 'Gastos Visibles',
              data: [totalVisibleExp],
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
          ],
        }
      }
    };
  }, [safeExpenses, safeIncomes, hiddenCategories]);

  if (safeExpenses.length === 0 && safeIncomes.length === 0) {
    return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No hay datos suficientes para mostrar gráficos.</p>
        </div>
    );
  }

  // --- OPCIONES ESPECÍFICAS PARA LA TORTA (CATEGORÍAS) ---
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 10 },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          // Generador personalizado para asegurar que muestre las CATEGORÍAS y el tachado
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                const isHidden = data.datasets[0].data[i] === null;

                return {
                  text: label, // ¡Aquí forzamos el nombre de la categoría!
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  hidden: isHidden,
                  index: i,
                  textDecoration: isHidden ? 'line-through' : undefined
                };
              });
            }
            return [];
          }
        },
        onClick: (e, legendItem, legend) => {
            // Lógica para ocultar/mostrar categoría al dar clic en la leyenda
            const index = legendItem.index;
            const catName = legend.chart.data.labels[index];
            if (onToggleCategory) onToggleCategory(catName);
        }
      },
      tooltip: {
          filter: (tooltipItem) => tooltipItem.raw !== null
      }
    }
  };

  // --- OPCIONES ESPECÍFICAS PARA LAS BARRAS (BALANCE) ---
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 10 },
    scales: { y: { beginAtZero: true } },
    plugins: {
      legend: {
        position: 'bottom', // Leyenda abajo
        labels: { boxWidth: 12, padding: 20 }
        // Aquí NO usamos el generador personalizado, usamos el defecto (Ingresos vs Gastos)
      }
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', paddingBottom: '20px' }}>
      
      {/* 1. DETALLE DE GASTOS (TARJETAS CLICABLES) */}
      <div style={{ borderBottom: '2px solid #f1f1f1', paddingBottom: '25px', marginBottom: '30px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {categoryStats.map((stat) => (
                <div 
                    key={stat.name} 
                    onClick={() => onToggleCategory && onToggleCategory(stat.name)}
                    style={{ 
                        background: stat.isHidden ? '#f0f0f0' : '#f9f9f9', 
                        opacity: stat.isHidden ? 0.6 : 1,
                        cursor: 'pointer',
                        padding: '10px 15px', 
                        borderRadius: '8px', 
                        borderLeft: `5px solid ${stat.isHidden ? '#ccc' : chartData.pieData.datasets[0].backgroundColor[stat.colorIndex % 12]}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    title="Clic para mostrar/ocultar"
                >
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: stat.isHidden ? '#999' : '#555', display: 'flex', justifyContent: 'space-between' }}>
                        {stat.name}
                        {stat.isHidden && <span style={{fontSize:'0.8rem'}}>👁️‍🗨️</span>}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: stat.isHidden ? '#999' : '#000' }}>
                            ${stat.amount.toFixed(2)}
                        </span>
                        
                        {!stat.isHidden ? (
                            <span style={{ fontSize: '0.85rem', color: '#7f8c8d', background: '#e0e0e0', padding: '2px 6px', borderRadius: '4px' }}>
                                {stat.percentage}%
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>
                                (Oculto)
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '40px', 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        width: '100%' 
      }}>
        
        {/* Torta - Usa pieOptions */}
        <div style={{ width: '100%', maxWidth: '400px', height: '400px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>Por Categoría</h4>
          <Pie data={chartData.pieData} options={pieOptions} />
        </div>

        {/* Barras - Usa barOptions */}
        <div style={{ width: '100%', maxWidth: '450px', height: '400px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>Balance General</h4>
          <Bar data={chartData.barData} options={barOptions} />
        </div>
      </div>

    </div>
  );
}

export default ExpensesChart;