// services/crudService.js
const { executeQuery, executeTransaction } = require('../config/database');
const SchemaService = require('./schemaService');

class CrudService {
  
  // CREATE - Insertar nuevo registro
  static async create(tableName, data) {
    console.log(`📝 Creando nuevo registro en tabla: ${tableName}`);
    console.log('Datos recibidos:', data);
    
    const schema = await SchemaService.getTableSchema(tableName);
    
    // Filtrar solo las columnas que existen en la tabla y tienen valores
    const validColumns = schema.columns.filter(col => {
      const hasValue = data.hasOwnProperty(col.column_name) && 
                      data[col.column_name] !== null && 
                      data[col.column_name] !== undefined && 
                      data[col.column_name] !== '';
      
      // Excluir primary key si es serial/autoincrement
      const isAutoIncrement = col.is_primary_key && 
                             col.column_default && 
                             col.column_default.includes('nextval');
      
      return hasValue && !isAutoIncrement;
    });
    
    if (validColumns.length === 0) {
      throw new Error('No se proporcionaron datos válidos para insertar');
    }
    
    const columns = validColumns.map(col => col.column_name);
    const values = validColumns.map(col => data[col.column_name]);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    console.log('Columnas a insertar:', columns);
    console.log('Valores a insertar:', values);
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;
    
    const result = await executeQuery(query, values);
    console.log('✅ Registro creado exitosamente');
    return result.rows[0];
  }

  // READ - Obtener registros con paginación y filtros (CON AUTO-INCLUDE DE FOREIGN KEYS)
  static async read(tableName, options = {}) {
    console.log(`📖 Leyendo registros de tabla: ${tableName}`);
    console.log('Opciones:', options);
    
    const {
      page = 1,
      limit = 50,
      filters = {},
      include = [],
      orderBy = null,
      orderDirection = 'ASC',
      autoIncludeForeignKeys = true // NUEVA OPCIÓN - por defecto true
    } = options;

    const schema = await SchemaService.getTableSchema(tableName);
    const offset = (page - 1) * limit;
    
    // ========== NUEVA LÓGICA: AUTO-INCLUDE DE TODAS LAS FOREIGN KEYS ==========
    let finalInclude = [...include];
    
    if (autoIncludeForeignKeys && schema.foreignKeys && schema.foreignKeys.length > 0) {
      // Agregar automáticamente todas las tablas de foreign keys que no estén ya incluidas
      const autoForeignTables = schema.foreignKeys
        .map(fk => fk.foreign_table_name)
        .filter(tableName => !include.includes(tableName));
      
      finalInclude = [...include, ...autoForeignTables];
      console.log('🔗 Auto-incluyendo foreign keys:', autoForeignTables);
    }
    // ========================================================================
    
    // Construir WHERE clause para filtros
    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    // Agregar filtro automático para soft delete si existe
    const softDeleteColumn = schema.columns.find(col => 
      col.column_name === 'esta_borrado' || 
      col.column_name === 'deleted' || 
      col.column_name === 'is_deleted'
    );
    
    if (softDeleteColumn && !filters.hasOwnProperty(softDeleteColumn.column_name)) {
      whereConditions.push(`${tableName}.${softDeleteColumn.column_name} = $${paramCount}`);
      params.push(false);
      paramCount++;
    }

    // Filtros proporcionados por el usuario
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const columnInfo = schema.columns.find(col => col.column_name === column);
        if (columnInfo) {
          if (typeof value === 'string' && columnInfo.data_type === 'text') {
            whereConditions.push(`${tableName}.${column} ILIKE $${paramCount}`);
            params.push(`%${value}%`);
          } else {
            whereConditions.push(`${tableName}.${column} = $${paramCount}`);
            params.push(value);
          }
          paramCount++;
        }
      }
    });

    // Construir SELECT y JOINs para incluir relaciones
    let selectColumns = `${tableName}.*`;
    let joinClauses = '';

    if (finalInclude.length > 0) {
      console.log('Incluyendo relaciones:', finalInclude);
      const joins = [];
      const additionalSelects = [];

      for (const relation of finalInclude) {
        const fkColumn = schema.foreignKeys.find(fk => 
          fk.foreign_table_name === relation
        );
        
        if (fkColumn) {
          const alias = `${relation}_data`;
          joins.push(`
            LEFT JOIN ${relation} ${alias} 
            ON ${tableName}.${fkColumn.column_name} = ${alias}.${fkColumn.foreign_column_name}
          `);
          
          // Obtener columnas de la tabla relacionada
          const relatedSchema = await SchemaService.getTableSchema(relation);
          
          // ========== NUEVA LÓGICA: SOLO INCLUIR COLUMNAS IMPORTANTES ==========
          // Buscar la columna más importante para mostrar (nombre, título, etc.)
          const displayColumn = this.findDisplayColumn(relatedSchema);
          
          // Incluir solo el ID y la columna de display
          const importantColumns = [
            `${alias}.${relatedSchema.primaryKey} as ${alias}_${relatedSchema.primaryKey}`,
            `${alias}.${displayColumn} as ${alias}_${displayColumn}`
          ];
          
          additionalSelects.push(importantColumns.join(', '));
          // ====================================================================
        }
      }

      joinClauses = joins.join(' ');
      if (additionalSelects.length > 0) {
        selectColumns += ', ' + additionalSelects.join(', ');
      }
    }

    // Construir ORDER BY
    let orderByClause = '';
    if (orderBy) {
      const validColumn = schema.columns.find(col => col.column_name === orderBy);
      if (validColumn) {
        orderByClause = `ORDER BY ${tableName}.${orderBy} ${orderDirection}`;
      }
    } else if (schema.primaryKey) {
      orderByClause = `ORDER BY ${tableName}.${schema.primaryKey} ${orderDirection}`;
    }

    // Query principal
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const mainQuery = `
      SELECT ${selectColumns}
      FROM ${tableName}
      ${joinClauses}
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1};
    `;

    params.push(limit, offset);

    // Query de conteo
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${tableName}
      ${whereClause};
    `;

    const countParams = params.slice(0, -2); // Excluir limit y offset

    console.log('Query principal:', mainQuery);
    console.log('Parámetros:', params);

    // Ejecutar ambas queries
    const [dataResult, countResult] = await Promise.all([
      executeQuery(mainQuery, params),
      executeQuery(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // ========== NUEVA LÓGICA: POST-PROCESAMIENTO PARA MOSTRAR NOMBRES ==========
    const processedData = dataResult.rows.map(row => {
      const processedRow = { ...row };
      
      // Para cada foreign key, crear un campo virtual con el nombre legible
      if (autoIncludeForeignKeys && schema.foreignKeys) {
        schema.foreignKeys.forEach(fk => {
          const alias = `${fk.foreign_table_name}_data`;
          const displayColumnName = `${alias}_${this.findDisplayColumnName(fk.foreign_table_name)}`;
          
          if (row[displayColumnName]) {
            // Crear campo virtual: ID_ROL_display = "Administrador"
            processedRow[`${fk.column_name}_display`] = row[displayColumnName];
          }
        });
      }
      
      return processedRow;
    });
    // ========================================================================

    console.log(`✅ Se obtuvieron ${dataResult.rows.length} registros de ${total} totales`);

    return {
      data: processedData, // Retorna datos procesados con nombres legibles
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // ========== NUEVOS MÉTODOS HELPER ==========
  static findDisplayColumn(schema) {
    // Buscar columnas que podrían servir como display
    const displayColumns = schema.columns.filter(col => 
      col.column_name.includes('nombre') ||
      col.column_name.includes('name') ||
      col.column_name.includes('titulo') ||
      col.column_name.includes('title') ||
      col.column_name.includes('descripcion') ||
      col.column_name.includes('description') ||
      (col.data_type === 'text' && !col.is_primary_key)
    );

    // Si no hay columnas de display obvias, usar la primera columna text
    return displayColumns.length > 0 
      ? displayColumns[0].column_name 
      : schema.columns.find(col => col.data_type === 'text')?.column_name ||
        schema.primaryKey;
  }

  static async findDisplayColumnName(tableName) {
    const schema = await SchemaService.getTableSchema(tableName);
    return this.findDisplayColumn(schema);
  }
  // ==========================================

  // READ ONE - Obtener un registro específico
  static async readOne(tableName, id, include = []) {
    console.log(`📖 Obteniendo registro individual de ${tableName} con ID: ${id}`);
    
    const schema = await SchemaService.getTableSchema(tableName);
    
    if (!schema.primaryKey) {
      throw new Error(`La tabla ${tableName} no tiene primary key`);
    }

    const options = {
      filters: { [schema.primaryKey]: id },
      include,
      limit: 1
    };

    const result = await this.read(tableName, options);
    return result.data[0] || null;
  }

  // UPDATE - Actualizar registro
  static async update(tableName, id, data) {
    console.log(`📝 Actualizando registro en tabla: ${tableName}, ID: ${id}`);
    console.log('Datos para actualizar:', data);
    
    const schema = await SchemaService.getTableSchema(tableName);
    
    if (!schema.primaryKey) {
      throw new Error(`La tabla ${tableName} no tiene primary key`);
    }

    // Filtrar solo las columnas que existen y no son primary key
    const validColumns = schema.columns.filter(col => 
      data.hasOwnProperty(col.column_name) && 
      !col.is_primary_key &&
      data[col.column_name] !== null &&
      data[col.column_name] !== undefined
    );

    if (validColumns.length === 0) {
      throw new Error('No se proporcionaron datos válidos para actualizar');
    }

    const setClauses = validColumns.map((col, index) => 
      `${col.column_name} = $${index + 1}`
    );
    const values = validColumns.map(col => data[col.column_name]);
    values.push(id); // Para el WHERE

    console.log('Columnas a actualizar:', validColumns.map(c => c.column_name));
    console.log('Valores:', values);

    const query = `
      UPDATE ${tableName}
      SET ${setClauses.join(', ')}
      WHERE ${schema.primaryKey} = $${values.length}
      RETURNING *;
    `;

    const result = await executeQuery(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`No se encontró registro con ID ${id} en la tabla ${tableName}`);
    }
    
    console.log('✅ Registro actualizado exitosamente');
    return result.rows[0];
  }

  // DELETE - Eliminar registro (soft delete si existe el campo)
  static async delete(tableName, id) {
    console.log(`🗑️ Eliminando registro de tabla: ${tableName}, ID: ${id}`);
    
    const schema = await SchemaService.getTableSchema(tableName);
    
    if (!schema.primaryKey) {
      throw new Error(`La tabla ${tableName} no tiene primary key`);
    }

    // Verificar si existe campo para soft delete
    const softDeleteColumn = schema.columns.find(col => 
      col.column_name === 'esta_borrado' || 
      col.column_name === 'deleted' || 
      col.column_name === 'is_deleted'
    );

    let query;
    if (softDeleteColumn) {
      // Soft delete
      console.log(`Realizando soft delete usando columna: ${softDeleteColumn.column_name}`);
      query = `
        UPDATE ${tableName}
        SET ${softDeleteColumn.column_name} = true
        WHERE ${schema.primaryKey} = $1
        RETURNING *;
      `;
    } else {
      // Hard delete
      console.log('Realizando hard delete (eliminación física)');
      query = `
        DELETE FROM ${tableName}
        WHERE ${schema.primaryKey} = $1
        RETURNING *;
      `;
    }

    const result = await executeQuery(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`No se encontró registro con ID ${id} en la tabla ${tableName}`);
    }
    
    console.log('✅ Registro eliminado exitosamente');
    return result.rows[0];
  }

  // Obtener opciones para campos de foreign key
  static async getForeignKeyOptions(tableName, columnName) {
    console.log(`🔗 Obteniendo opciones para FK: ${tableName}.${columnName}`);
    
    const schema = await SchemaService.getTableSchema(tableName);
    const fkColumn = schema.foreignKeys.find(fk => fk.column_name === columnName);
    
    if (!fkColumn) {
      throw new Error(`La columna ${columnName} no es una foreign key`);
    }

    const foreignSchema = await SchemaService.getTableSchema(fkColumn.foreign_table_name);
    
    // Usar el nuevo método helper
    const displayColumn = this.findDisplayColumn(foreignSchema);

    const options = await this.read(fkColumn.foreign_table_name, {
      limit: 1000, // Límite alto para opciones
      orderBy: displayColumn,
      autoIncludeForeignKeys: false // No incluir FKs en las opciones
    });

    console.log(`✅ Se obtuvieron ${options.data.length} opciones para ${fkColumn.foreign_table_name}`);

    return {
      options: options.data.map(item => ({
        value: item[fkColumn.foreign_column_name],
        label: item[displayColumn] || item[fkColumn.foreign_column_name],
        data: item
      })),
      displayColumn,
      valueColumn: fkColumn.foreign_column_name
    };
  }
}

module.exports = CrudService;