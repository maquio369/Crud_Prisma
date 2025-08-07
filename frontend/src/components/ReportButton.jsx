// frontend/src/components/ReportButton.jsx
import { useState } from 'react';

const ReportButton = ({ tableName, filters = {} }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      console.log(`📊 Generando reporte para tabla: ${tableName}`);
      
      // URL específica para el reporte de años
      let reportUrl = '/api/reports/anos';
      
      // Agregar filtros como query parameters si existen
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      
      const fullUrl = params.toString() ? `${reportUrl}?${params.toString()}` : reportUrl;
      
      // Como usas rutas relativas, no necesitamos URL completa
      console.log('🔗 URL del reporte:', fullUrl);
      
      // Realizar petición y descargar PDF (usando ruta relativa)
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Convertir respuesta a blob
      const blob = await response.blob();
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_años_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Reporte descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      
      // Mostrar error al usuario
      const errorMessage = error.message || 'Error desconocido al generar reporte';
      alert(`Error al generar el reporte:\n${errorMessage}\n\nVerifica la consola para más detalles.`);
      
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generateReport}
      disabled={isGenerating}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
        ${isGenerating 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300' 
          : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg border border-red-600'
        }
      `}
      title={isGenerating ? 'Generando reporte...' : 'Generar reporte PDF de años'}
    >
      {isGenerating ? (
        <>
          {/* Spinner de carga */}
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Generando...</span>
        </>
      ) : (
        <>
          {/* Ícono de PDF */}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <span>Generar PDF</span>
        </>
      )}
    </button>
  );
};

export default ReportButton;