// backend/services/jasperService.js
const axios = require('axios');

class JasperService {
  constructor() {
    // URL del servidor JasperReports (desde variable de entorno)
    this.jasperServerUrl = process.env.JASPER_SERVER_URL || 'http://jasperreports-server:8080';
    this.jasperApiUrl = `${this.jasperServerUrl}/rest_v2`;
    
    // Credenciales
    this.credentials = {
      username: 'jasperadmin',
      password: 'jasperadmin'
    };
  }

  // Autenticación con JasperReports Server
  async authenticate() {
    try {
      const response = await axios.post(
        `${this.jasperServerUrl}/rest_v2/login`,
        null,
        {
          auth: this.credentials,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.headers['set-cookie'];
    } catch (error) {
      console.error('❌ Error de autenticación con JasperReports:', error.message);
      throw new Error('No se pudo conectar con JasperReports Server');
    }
  }

  // Generar reporte en formato PDF
  async generateReport(reportPath, format = 'pdf', parameters = {}) {
    try {
      console.log(`📊 Generando reporte: ${reportPath}`);
      
      // Autenticar
      const cookies = await this.authenticate();
      
      // Construir parámetros de la URL
      const params = new URLSearchParams();
      Object.keys(parameters).forEach(key => {
        params.append(key, parameters[key]);
      });
      
      // URL del reporte
      const reportUrl = `${this.jasperApiUrl}/reports${reportPath}.${format}`;
      
      console.log('🔗 URL del reporte:', reportUrl);
      console.log('📋 Parámetros:', parameters);
      
      // Generar reporte
      const response = await axios.get(`${reportUrl}?${params.toString()}`, {
        headers: {
          'Cookie': cookies ? cookies.join('; ') : '',
          'Accept': format === 'pdf' ? 'application/pdf' : 'application/octet-stream'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 segundos timeout
      });
      
      console.log('✅ Reporte generado exitosamente');
      
      return {
        success: true,
        data: response.data,
        contentType: format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
        filename: `reporte_${Date.now()}.${format}`
      };
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      throw new Error(`Error al generar reporte: ${error.message}`);
    }
  }

  // Método específico para el reporte de años
  async generateAniosReport(filters = {}) {
    const reportPath = '/CRUD_Reports/Reporte_Anos'; // Ajusta la ruta según donde subiste tu reporte
    
    // Parámetros opcionales para filtrar el reporte
    const parameters = {
      // Si quieres filtrar por estado específico
      ...(filters.estado && { ESTADO_FILTER: filters.estado }),
      
      // Si quieres filtrar por rango de años
      ...(filters.anioDesde && { ANIO_DESDE: filters.anioDesde }),
      ...(filters.anioHasta && { ANIO_HASTA: filters.anioHasta }),
      
      // Parámetro de fecha de generación
      FECHA_GENERACION: new Date().toISOString().split('T')[0]
    };
    
    return this.generateReport(reportPath, 'pdf', parameters);
  }

  // Listar reportes disponibles en el servidor
  async listReports() {
    try {
      const cookies = await this.authenticate();
      
      const response = await axios.get(
        `${this.jasperApiUrl}/resources?type=reportUnit`,
        {
          headers: {
            'Cookie': cookies ? cookies.join('; ') : '',
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Error listando reportes:', error.message);
      throw new Error('Error al obtener lista de reportes');
    }
  }

  // Verificar estado del servidor JasperReports
  async healthCheck() {
    try {
      const response = await axios.get(`${this.jasperServerUrl}/rest_v2`, {
        timeout: 5000
      });
      
      return {
        status: 'healthy',
        url: this.jasperServerUrl,
        response: response.status
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        url: this.jasperServerUrl,
        error: error.message
      };
    }
  }
}


module.exports = new JasperService();


