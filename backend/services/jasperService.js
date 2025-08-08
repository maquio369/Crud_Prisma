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
      // Primer paso: Obtener formulario de login
      const loginFormResponse = await axios.get(`${this.jasperServerUrl}/login.html`);
      
      // Segundo paso: Hacer login con credenciales
      const response = await axios.post(
        `${this.jasperServerUrl}/j_spring_security_check`,
        new URLSearchParams({
          'j_username': 'jasperadmin',
          'j_password': 'jasperadmin'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          maxRedirects: 0,
          validateStatus: (status) => status < 400 || status === 302
        }
      );
      
      return response.headers['set-cookie'];
    } catch (error) {
      console.error('❌ Error de autenticación:', error.message);
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
// Modificación del método generateAniosReport en jasperService.js
// Solo cambiar este método específico:

// Método específico para el reporte de años
async generateAniosReport(filters = {}) {
  console.log('📊 Filtros recibidos para reporte de años:', filters);
  
  const reportPath = '/Años/Anos';
  
  // 🚀 NUEVO: Procesar filtros del Dashboard
  const parameters = {};
  
  // Procesar filtro de descripción (LIKE)
  if (filters.descripcion) {
    parameters['P_DESCRIPCION'] = filters.descripcion;
    console.log('🔍 Filtro descripción aplicado:', filters.descripcion);
  }
  
  // Procesar filtro de estado (booleano)
  if (filters.esta_borrado !== undefined) {
    parameters['P_ESTADO'] = filters.esta_borrado;
    console.log('🔍 Filtro estado aplicado:', filters.esta_borrado);
  }
  
  // Procesar filtro de clave año
  if (filters.clave_año_del_gasto) {
    parameters['P_CLAVE_ANO'] = filters.clave_año_del_gasto;
    console.log('🔍 Filtro clave año aplicado:', filters.clave_año_del_gasto);
  }
  
  // Procesar filtro de ID (si viene)
  if (filters.id_año_del_gasto) {
    parameters['P_ID_ANO'] = filters.id_año_del_gasto;
    console.log('🔍 Filtro ID aplicado:', filters.id_año_del_gasto);
  }
  
  // Agregar parámetros adicionales
  parameters['FECHA_GENERACION'] = new Date().toISOString().split('T')[0];
  
  // Si hay filtros aplicados, agregar indicador
  const hasFilters = Object.keys(filters).length > 0;
  if (hasFilters) {
    parameters['TITULO_EXTRA'] = `Filtrado por: ${Object.keys(filters).join(', ')}`;
    console.log('📋 Reporte con filtros aplicados:', Object.keys(filters));
  }
  
  console.log('🚀 Parámetros finales enviados a JasperReports:', parameters);
  
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
      const response = await axios.get(`${this.jasperServerUrl}/login.html`, {
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


