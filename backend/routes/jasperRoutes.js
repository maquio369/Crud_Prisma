// backend/routes/jasperRoutes.js
const express = require('express');
const JasperController = require('../controllers/jasperController');

const router = express.Router();

// ===== RUTAS PARA REPORTES JASPERREPORTS =====

// Health check de JasperReports Server
router.get('/health', JasperController.healthCheck);

// Listar reportes disponibles
router.get('/list', JasperController.listReports);

// Generar reporte específico de años
router.get('/anos', JasperController.generateAniosReport);

// Generar reporte genérico para cualquier tabla
router.get('/table/:tableName', JasperController.generateTableReport);

// Previsualizar reporte en HTML
router.get('/preview/:reportName', JasperController.previewReport);

// ===== RUTAS ADICIONALES PARA FUNCIONALIDADES AVANZADAS =====

// Generar reporte con POST (para parámetros complejos)
router.post('/generate', async (req, res) => {
  try {
    const { reportPath, format = 'pdf', parameters = {} } = req.body;
    
    const jasperService = require('../services/jasperService');
    const result = await jasperService.generateReport(reportPath, format, parameters);
    
    if (result.success) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.data.length
      });
      
      res.send(Buffer.from(result.data));
    }
    
  } catch (error) {
    console.error('❌ Error en POST generate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte',
      message: error.message
    });
  }
});

// Ruta para obtener parámetros de un reporte específico
router.get('/parameters/:reportName', async (req, res) => {
  try {
    // Aquí podrías implementar lógica para obtener
    // los parámetros disponibles de un reporte
    res.json({
      success: true,
      message: 'Funcionalidad de parámetros en desarrollo',
      reportName: req.params.reportName
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo parámetros del reporte',
      message: error.message
    });
  }
});

module.exports = router;