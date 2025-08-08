// backend/controllers/jasperController.js
const jasperService = require('../services/jasperService');

class JasperController {
  // Generar reporte de años
  static async generateAniosReport(req, res) {
  try {
    console.log('📊 Solicitud de reporte de años recibida');
    console.log('Query params:', req.query);
    
    // 🚀 CORRECCIÓN: Usar TODOS los query params como filtros
    const filters = { ...req.query }; // Tomar todos los parámetros
    
    console.log('🔍 Filtros procesados para el reporte:', filters);
    
    // Generar reporte usando JasperService
    const result = await jasperService.generateAniosReport(filters);
    
    if (result.success) {
      // Configurar headers para descarga de PDF
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.data.length
      });
      
      // Enviar el PDF
      res.send(Buffer.from(result.data));
      
      console.log('✅ Reporte enviado exitosamente');
    } else {
      throw new Error('Error en la generación del reporte');
    }
    
  } catch (error) {
    console.error('❌ Error en generateAniosReport:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
  
  
  
  // Generar reporte genérico para cualquier tabla
  static async generateTableReport(req, res) {
    try {
      const { tableName } = req.params;
      const { format = 'pdf' } = req.query;
      
      console.log(`📊 Generando reporte para tabla: ${tableName}`);
      
      // Ruta del reporte (ajusta según tu estructura en JasperReports)
      const reportPath = `/CRUD_Reports/Reporte_${tableName}`;
      
      // Parámetros del reporte
      const parameters = {
        ...req.query,
        TABLA_NOMBRE: tableName,
        FECHA_GENERACION: new Date().toISOString().split('T')[0]
      };
      
      const result = await jasperService.generateReport(reportPath, format, parameters);
      
      if (result.success) {
        res.set({
          'Content-Type': result.contentType,
          'Content-Disposition': `attachment; filename="reporte_${tableName}_${Date.now()}.${format}"`,
          'Content-Length': result.data.length
        });
        
        res.send(Buffer.from(result.data));
        console.log(`✅ Reporte de ${tableName} enviado exitosamente`);
      }
      
    } catch (error) {
      console.error(`❌ Error generando reporte de ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al generar reporte',
        message: error.message
      });
    }
  }
  
  // Previsualizar reporte en HTML (útil para debug)
  static async previewReport(req, res) {
    try {
      const { reportName } = req.params;
      const reportPath = `/CRUD_Reports/${reportName}`;
      
      const result = await jasperService.generateReport(reportPath, 'html', req.query);
      
      if (result.success) {
        res.set('Content-Type', 'text/html');
        res.send(result.data);
      }
      
    } catch (error) {
      console.error('❌ Error en preview:', error);
      res.status(500).json({
        success: false,
        error: 'Error al previsualizar reporte',
        message: error.message
      });
    }
  }
  
  // Listar reportes disponibles
  static async listReports(req, res) {
    try {
      const reports = await jasperService.listReports();
      
      res.json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error listando reportes:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener reportes',
        message: error.message
      });
    }
  }
  
  // Health check de JasperReports Server
  static async healthCheck(req, res) {
    try {
      const health = await jasperService.healthCheck();
      
      res.json({
        success: true,
        jasperReports: health,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error en health check:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando JasperReports',
        message: error.message
      });
    }
  }
}


module.exports = JasperController;
