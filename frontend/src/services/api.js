// src/services/api.js (versión mejorada)
import axios from 'axios';

// Configuración desde variables de entorno
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const CONNECTION_TIMEOUT = parseInt(import.meta.env.VITE_CONNECTION_TIMEOUT) || 10000;
const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONNECTION_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logging en desarrollo
api.interceptors.request.use(
  (config) => {
    if (IS_DEV_MODE) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers
      });
    }
    return config;
  },
  (error) => {
    if (IS_DEV_MODE) {
      console.error('❌ API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (IS_DEV_MODE) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
        timing: response.headers['x-response-time']
      });
    }
    return response;
  },
  (error) => {
    if (IS_DEV_MODE) {
      console.error('❌ API Response Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      });
    }

    // Manejar errores de conexión
    if (error.code === 'ECONNABORTED') {
      error.message = 'Tiempo de espera agotado. Verifica la conexión con el servidor.';
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      error.message = 'Error de conexión. Verifica que el servidor backend esté ejecutándose.';
    } else if (error.response?.status >= 500) {
      error.message = 'Error interno del servidor. Intenta nuevamente más tarde.';
    }

    return Promise.reject(error);
  }
);

// Función para reintentar requests automáticamente
const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (IS_DEV_MODE) {
        console.warn(`🔄 Retry attempt ${i + 1}/${maxRetries} for failed request`);
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Servicios de API con manejo de errores mejorado
export const apiService = {
  // Tablas
  getTables: () => retryRequest(() => api.get('/tables')),
  getTableSchema: (tableName) => api.get(`/tables/${encodeURIComponent(tableName)}/schema`),
  
  // CRUD con validación de parámetros
  getRecords: (tableName, params = {}) => {
    // Validar parámetros
    const validatedParams = {
      ...params,
      limit: Math.min(params.limit || 50, 200), // Máximo 200 registros
      page: Math.max(params.page || 1, 1), // Mínimo página 1
    };
    
    return api.get(`/tables/${encodeURIComponent(tableName)}`, { params: validatedParams });
  },
  
  getRecord: (tableName, id, params = {}) => {
    if (!id) throw new Error('ID is required');
    return api.get(`/tables/${encodeURIComponent(tableName)}/${encodeURIComponent(id)}`, { params });
  },
  
  createRecord: (tableName, data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Valid data object is required');
    }
    return api.post(`/tables/${encodeURIComponent(tableName)}`, data);
  },
  
  updateRecord: (tableName, id, data) => {
    if (!id) throw new Error('ID is required');
    if (!data || typeof data !== 'object') {
      throw new Error('Valid data object is required');
    }
    return api.put(`/tables/${encodeURIComponent(tableName)}/${encodeURIComponent(id)}`, data);
  },
  
  deleteRecord: (tableName, id) => {
    if (!id) throw new Error('ID is required');
    return api.delete(`/tables/${encodeURIComponent(tableName)}/${encodeURIComponent(id)}`);
  },
  
  // Utilidades
  getForeignKeyOptions: (tableName, columnName) => {
    if (!tableName || !columnName) {
      throw new Error('Table name and column name are required');
    }
    return api.get(`/tables/${encodeURIComponent(tableName)}/foreign-key-options/${encodeURIComponent(columnName)}`);
  },
  
  validateData: (tableName, data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Valid data object is required');
    }
    return api.post(`/tables/${encodeURIComponent(tableName)}/validate`, data);
  },
  
  searchRecords: (tableName, searchData) => {
    if (!searchData || typeof searchData !== 'object') {
      throw new Error('Valid search data is required');
    }
    return api.post(`/tables/${encodeURIComponent(tableName)}/search`, searchData);
  },

  // Método para verificar la salud del backend
  healthCheck: () => {
    const healthUrl = import.meta.env.VITE_BACKEND_HEALTH_URL || 'http://localhost:3001/health';
    return axios.get(healthUrl, { timeout: 5000 });
  },

  // Métodos de conveniencia para manejo de errores
  handleApiError: (error, customMessage = '') => {
    const message = customMessage || error.message || 'Error desconocido';
    
    if (IS_DEV_MODE) {
      console.error('API Error Details:', {
        message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
    }

    // Retornar un objeto de error estructurado
    return {
      message,
      status: error.response?.status,
      code: error.code,
      isNetworkError: !error.response,
      isServerError: error.response?.status >= 500,
      isClientError: error.response?.status >= 400 && error.response?.status < 500,
      details: error.response?.data
    };
  },

  // Método para cancelar requests
  createCancelToken: () => axios.CancelToken.source(),
  
  // Método para verificar si un error es de cancelación
  isCancel: (error) => axios.isCancel(error)
};

// Función helper para construir URLs de manera segura
export const buildApiUrl = (endpoint, params = {}) => {
  const url = new URL(endpoint, API_BASE_URL);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Exportar configuración para uso en otros módulos
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: CONNECTION_TIMEOUT,
  isDev: IS_DEV_MODE
};

export default api;