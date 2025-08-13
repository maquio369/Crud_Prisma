// controllers/dynamicController.js
const SchemaService = require('../services/schemaService');
const CrudService = require('../services/crudService');

class DynamicController {
  
  // ===== CONTROLADORES DE SCHEMA =====
  
  // Obtener lista de todas las tablas
  static async getTables(req, res) {
    try {
      console.log('🔍 GET /api/tables - Obteniendo lista de tablas');
      
      const tables = await SchemaService.getTables();
      
      // Enriquecer con información adicional
      const enrichedTables = await Promise.all(
        tables.map(async (table) => {
          try {
            const schema = await SchemaService.getTableSchema(table.table_name);
            const recordCount = await CrudService.read(table.table_name, { limit: 1 });
            
            return {
              ...table,
              primaryKey: schema.primaryKey,
              foreignKeysCount: schema.foreignKeys.length,
              columnsCount: schema.columns.length,
              totalRecords: recordCount.pagination.total,
              hasRelations: schema.relations.length > 0,
              hasSoftDelete: schema.columns.some(col => 
                col.column_name === 'esta_borrado' || 
                col.column_name === 'deleted' || 
                col.column_name === 'is_deleted'
              )
            };
          } catch (error) {
            console.warn(`No se pudo obtener info adicional para ${table.table_name}:`, error.message);
            return table;
          }
        })
      );
      
      res.json({
        success: true,
        data: enrichedTables,
        total: enrichedTables.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo tablas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener lista de tablas',
        message: error.message
      });
    }
  }
  
  // Obtener schema completo de una tabla
  static async getTableSchema(req, res) {
    try {
      const { tableName } = req.params;
      //console.log(`🔍 GET /api/tables/${tableName}/schema`);
      
      const schema = await SchemaService.getTableSchema(tableName);
      
      res.json({
        success: true,
        data: schema,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error obteniendo schema de ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener schema de la tabla',
        message: error.message
      });
    }
  }
  
  // ===== CONTROLADORES CRUD =====
  
  // Obtener registros con filtros, paginación e includes
  static async getRecords(req, res) {
    try {
      const { tableName } = req.params;
      const {
        page = 1,
        limit = 50,
        orderBy,
        orderDirection = 'ASC',
        include,
        ...filters
      } = req.query;
      
      console.log(`📖 GET /api/tables/${tableName}`, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        include: include?.split(',') || []
      });
      
      // Validar que la tabla existe
      const tables = await SchemaService.getTables();
      const tableExists = tables.some(t => t.table_name === tableName);
      
      if (!tableExists) {
        return res.status(404).json({
          success: false,
          error: 'Tabla no encontrada',
          message: `La tabla '${tableName}' no existe`
        });
      }
      
      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 1000), // Límite máximo de seguridad
        orderBy,
        orderDirection: orderDirection.toUpperCase(),
        include: include ? include.split(',') : [],
        filters: Object.keys(filters).reduce((acc, key) => {
          // Filtrar parámetros vacíos
          if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
            acc[key] = filters[key];
          }
          return acc;
        }, {})
      };
      
      const result = await CrudService.read(tableName, options);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        filters: options.filters,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error obteniendo registros de ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener registros',
        message: error.message
      });
    }
  }
  
  // Obtener un registro específico
  static async getRecord(req, res) {
    try {
      const { tableName, id } = req.params;
      const { include } = req.query;
      
      console.log(`📖 GET /api/tables/${tableName}/${id}`);
      
      const includeArray = include ? include.split(',') : [];
      const record = await CrudService.readOne(tableName, id, includeArray);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado',
          message: `No se encontró registro con ID ${id} en la tabla ${tableName}`
        });
      }
      
      res.json({
        success: true,
        data: record,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error obteniendo registro ${req.params.id} de ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener registro',
        message: error.message
      });
    }
  }
  
  // Crear nuevo registro
  static async createRecord(req, res) {
    try {
      const { tableName } = req.params;
      const data = req.body;
      
      console.log(`📝 POST /api/tables/${tableName}`, data);
      
      // Validar que se enviaron datos
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Datos requeridos',
          message: 'Se requieren datos para crear el registro'
        });
      }
      
      const newRecord = await CrudService.create(tableName, data);
      
      res.status(201).json({
        success: true,
        data: newRecord,
        message: 'Registro creado exitosamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error creando registro en ${req.params.tableName}:`, error);
      
      // Errores específicos de base de datos
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Violación de restricción única',
          message: 'Ya existe un registro con estos valores únicos'
        });
      }
      
      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Violación de clave foránea',
          message: 'El valor de la clave foránea no existe en la tabla referenciada'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al crear registro',
        message: error.message
      });
    }
  }
  
  // Actualizar registro existente
  static async updateRecord(req, res) {
    try {
      const { tableName, id } = req.params;
      const data = req.body;
      
      console.log(`📝 PUT /api/tables/${tableName}/${id}`, data);
      
      // Validar que se enviaron datos
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Datos requeridos',
          message: 'Se requieren datos para actualizar el registro'
        });
      }
      
      const updatedRecord = await CrudService.update(tableName, id, data);
      
      res.json({
        success: true,
        data: updatedRecord,
        message: 'Registro actualizado exitosamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error actualizando registro ${req.params.id} en ${req.params.tableName}:`, error);
      
      if (error.message.includes('No se encontró registro')) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado',
          message: error.message
        });
      }
      
      // Errores específicos de base de datos
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Violación de restricción única',
          message: 'Ya existe un registro con estos valores únicos'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al actualizar registro',
        message: error.message
      });
    }
  }
  
  // Eliminar registro
  static async deleteRecord(req, res) {
    try {
      const { tableName, id } = req.params;
      
      console.log(`🗑️ DELETE /api/tables/${tableName}/${id}`);
      
      const deletedRecord = await CrudService.delete(tableName, id);
      
      res.json({
        success: true,
        data: deletedRecord,
        message: 'Registro eliminado exitosamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error eliminando registro ${req.params.id} de ${req.params.tableName}:`, error);
      
      if (error.message.includes('No se encontró registro')) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado',
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al eliminar registro',
        message: error.message
      });
    }
  }
  
  // ===== CONTROLADORES DE UTILIDADES =====
  
  // Obtener opciones para foreign keys
  static async getForeignKeyOptions(req, res) {
    try {
      const { tableName, columnName } = req.params;
      
      //console.log(`🔗 GET /api/tables/${tableName}/foreign-key-options/${columnName}`);
      
      const options = await CrudService.getForeignKeyOptions(tableName, columnName);
      
      res.json({
        success: true,
        data: options,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error obteniendo opciones FK para ${req.params.tableName}.${req.params.columnName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener opciones de clave foránea',
        message: error.message
      });
    }
  }
  
  // Validar datos antes de enviar
  static async validateData(req, res) {
    try {
      const { tableName } = req.params;
      const data = req.body;
      
      console.log(`✅ POST /api/tables/${tableName}/validate`);
      
      const schema = await SchemaService.getTableSchema(tableName);
      const errors = [];
      
      // Validaciones básicas basadas en el schema
      for (const column of schema.columns) {
        const value = data[column.column_name];
        
        // Required fields
        if (column.is_nullable === 'NO' && !column.column_default && 
            (value === null || value === undefined || value === '')) {
          errors.push({
            field: column.column_name,
            message: `El campo ${column.column_name} es requerido`
          });
        }
        
        // Data type validation
        if (value !== null && value !== undefined && value !== '') {
          if (column.data_type === 'integer' && !Number.isInteger(Number(value))) {
            errors.push({
              field: column.column_name,
              message: `El campo ${column.column_name} debe ser un número entero`
            });
          }
          
          if (column.data_type === 'boolean' && typeof value !== 'boolean') {
            errors.push({
              field: column.column_name,
              message: `El campo ${column.column_name} debe ser verdadero o falso`
            });
          }
        }
      }
      
      res.json({
        success: true,
        valid: errors.length === 0,
        errors,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error validando datos para ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al validar datos',
        message: error.message
      });
    }
  }
  
  // Búsqueda avanzada
  static async searchRecords(req, res) {
    try {
      const { tableName } = req.params;
      const { query, fields, ...otherOptions } = req.body;
      
      console.log(`🔍 POST /api/tables/${tableName}/search`);
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query requerido',
          message: 'Se requiere un término de búsqueda'
        });
      }
      
      const schema = await SchemaService.getTableSchema(tableName);
      const searchFields = fields || schema.columns
        .filter(col => col.data_type === 'text')
        .map(col => col.column_name);
      
      // Construir filtros de búsqueda
      const searchFilters = {};
      searchFields.forEach(field => {
        searchFilters[field] = query;
      });
      
      const options = {
        filters: searchFilters,
        ...otherOptions
      };
      
      const result = await CrudService.read(tableName, options);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        searchQuery: query,
        searchFields,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error en búsqueda de ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error en la búsqueda',
        message: error.message
      });
    }
  }
}

module.exports = DynamicController;