// services/crudService.js
const { executeQuery, executeTransaction } = require("../config/database");
const SchemaService = require("./schemaService");
//const AdvancedFilterService = require("./advancedFilterService"); // 🚀 NUEVO: Servicio de filtros avanzados

class CrudService {
  // CREATE - Insertar nuevo registro
  static async create(tableName, data) {
    console.log(`📝 Creando nuevo registro en tabla: ${tableName}`);
    console.log("Datos recibidos:", data);

    const schema = await SchemaService.getTableSchema(tableName);

    // Filtrar solo las columnas que existen en la tabla y tienen valores
    const validColumns = schema.columns.filter((col) => {
      const hasValue =
        data.hasOwnProperty(col.column_name) &&
        data[col.column_name] !== null &&
        data[col.column_name] !== undefined &&
        data[col.column_name] !== "";

      // Excluir primary key si es serial/autoincrement
      const isAutoIncrement = col.is_primary_key && col.is_identity;
      console.log("🅰️ isAutoIncrement: ", isAutoIncrement);

      return hasValue && !isAutoIncrement;
    });

    if (validColumns.length === 0) {
      throw new Error("No se proporcionaron datos válidos para insertar");
    }

    const columns = validColumns.map((col) => col.column_name);
    const values = validColumns.map((col) => data[col.column_name]);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    console.log("Columnas a insertar:", columns);
    console.log("Valores a insertar:", values);

    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *;
    `;

    const result = await executeQuery(query, values);
    console.log("✅ Registro creado exitosamente");
    return result.rows[0];
  }

  // READ - Obtener registros con paginación y filtros (CON AUTO-INCLUDE DE FOREIGN KEYS Y FILTROS AVANZADOS)
  static async read(tableName, options = {}) {
    console.log(`📖 Leyendo registros de tabla: ${tableName}`);
    console.log("Opciones:", options);

    const {
      page = 1,
      limit = 50,
      filters = {},
      include = [],
      orderBy = null,
      orderDirection = "ASC",
      autoIncludeForeignKeys = true, // Por defecto incluir FK automáticamente
      advancedFilter = null, // 🚀 NUEVO: Filtros avanzados
    } = options;

    const schema = await SchemaService.getTableSchema(tableName);
    const offset = (page - 1) * limit;

    // Auto-incluir todas las foreign keys
    let finalInclude = [...include];

    if (
      autoIncludeForeignKeys &&
      schema.foreignKeys &&
      schema.foreignKeys.length > 0
    ) {
      const autoForeignTables = schema.foreignKeys
        .map((fk) => fk.foreign_table_name)
        .filter((tableName) => !include.includes(tableName));

      finalInclude = [...include, ...autoForeignTables];
      console.log("🔗 Auto-incluyendo foreign keys:", autoForeignTables);
    }

    // Construir WHERE clause para filtros
    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    // Agregar filtro automático para soft delete
    const softDeleteColumn = schema.columns.find(
      (col) =>
        col.column_name === "esta_borrado" ||
        col.column_name === "deleted" ||
        col.column_name === "is_deleted"
    );

    if (
      softDeleteColumn &&
      !filters.hasOwnProperty(softDeleteColumn.column_name)
    ) {
      whereConditions.push(
        `${tableName}.${softDeleteColumn.column_name} = $${paramCount}`
      );
      params.push(false);
      paramCount++;
    }

    // Filtros del usuario (filtros simples tradicionales)
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        const columnInfo = schema.columns.find(
          (col) => col.column_name === column
        );
        console.log(
          `🔍 Aplicando filtro para ${column}: ${value}`,
          "~~~~~~>",
          columnInfo
        );
        if (typeof value === "boolean") {
          console.log(`🔍 Aplicando filtro para ${column}: ${value}`,
          "~~-->",Boolean(value));
        }
        if (columnInfo) {

          //solo nombreCampo, usar iLIKE
          if (typeof value === "string" && columnInfo.data_type === "text") {
            whereConditions.push(`${tableName}.${column} ILIKE $${paramCount}`);
            params.push(`%${value}%`);
          } 
          paramCount++;
        }else {
          
            //diferente de campoCon~CondicionAñadida
            //hacer split con caracter ~ para separar campo de operador
            let conditions1 = (column + "~" + value).split("~"); // { field, operator, value } = condition
            let conditions={
              field: conditions1[0],
              operator: conditions1[1],
              value: value}
            console.log(`>>>Aplicando filtro para No-columnInfo: ${value}`,"~~~>",conditions1);
            //const condicionArray = column ? column.split('~') : [];
            //construir y agregar condicion where
            //AdvancedFilterService.buildConditionClause(conditions,tableName, paramCount);
            
            const { clause, conditionParams, newParamCount } =
              this.buildConditionClause(
                conditions,
                tableName,
                paramCount
              );

            if (clause) {
              console.log("🔍 Agregando condición:*---->", clause);
              whereConditions.push(clause);
              params.push(conditionParams);
              paramCount = newParamCount;
              /*
              // Agregar operador lógico si no es la primera condición
              if (i > 0 && condition.logicalOperator) {
                conditionClauses.push(`${condition.logicalOperator} ${clause}`);
              } else {
                conditionClauses.push(clause);
              }
              
              params.push(...conditionParams);
              currentParamCount = newParamCount;*/
            }

            /*
            //agregar condicion a whereConditions
            whereConditions.push(`${tableName}.${column} = $${paramCount}`);
            
            params.push(value);
            */
          }
      }
    });

    // 🚀 PROCESAR FILTROS AVANZADOS
    // ===============================================
    if (advancedFilter) {
      console.log("🔧 Aplicando filtros avanzados...");

      const advancedResult = AdvancedFilterService.processAdvancedFilters(
        { advancedFilter }, // Pasar el filtro avanzado en el formato esperado
        tableName,
        whereConditions,
        params,
        paramCount
      );

      whereConditions = advancedResult.whereConditions;
      params = advancedResult.params;
      paramCount = advancedResult.paramCount;

      console.log("✅ Filtros avanzados aplicados:", {
        conditionsCount: whereConditions.length,
        paramsCount: params.length,
        finalParamCount: paramCount,
      });
    }
    // ===============================================

    // Construir SELECT y JOINs para incluir relaciones
    let selectColumns = `${tableName}.*`;
    let joinClauses = "";

    if (finalInclude.length > 0) {
      console.log("Incluyendo relaciones:", finalInclude);
      const joins = [];
      const additionalSelects = [];

      for (const relation of finalInclude) {
        const fkColumn = schema.foreignKeys.find(
          (fk) => fk.foreign_table_name === relation
        );

        if (fkColumn) {
          // Sin _autoref para las referencias FK de otras entidades
          const alias = `${
            tableName === relation ? relation + "_autoref" : relation
          }`; // _autoref necesario para la autoreferencia
          joins.push(`
            LEFT JOIN ${relation} ${alias} 
            ON ${tableName}.${fkColumn.column_name} = ${alias}.${fkColumn.foreign_column_name}
          `);

          // Obtener esquema de la tabla relacionada
          const relatedSchema = await SchemaService.getTableSchema(relation);

          // 🎯 ESTA ES LA PARTE CLAVE: Encontrar la columna de display correcta
          const displayColumn = this.findDisplayColumn(relatedSchema);
          const fkColumnDesc = fkColumn.foreign_column_desc
            ? fkColumn.foreign_column_desc
            : `${alias}.${displayColumn}`;

          // Incluir la columna de display
          additionalSelects.push(
            `${fkColumnDesc} as ${fkColumn.column_name}_display`
            /*`${alias}.${relatedSchema.primaryKey} as ${alias}_${relatedSchema.primaryKey}`,
            `${fkColumnDesc} as ${alias}_${displayColumn}`*/
          );
        }
      }

      joinClauses = joins.join(" ");
      if (additionalSelects.length > 0) {
        selectColumns += ", " + additionalSelects.join(", ");
      }
    }

    // ORDER BY
    let orderByClause = "";
    if (orderBy) {
      const validColumn = schema.columns.find(
        (col) => col.column_name === orderBy
      );
      if (validColumn) {
        orderByClause = `ORDER BY ${tableName}.${orderBy} ${orderDirection}`;
      }
    } else if (schema.primaryKey) {
      orderByClause = `ORDER BY ${tableName}.${schema.primaryKey} ${orderDirection}`;
    }

    // Query principal
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

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

    const countParams = params.slice(0, -2);

    console.log("Query principal:", mainQuery);
    console.log("Parámetros:", params);

    // Ejecutar queries
    const [dataResult, countResult] = await Promise.all([
      executeQuery(mainQuery, params),
      executeQuery(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    //const processedData = dataResult.rows;
    // 🚀 POST-PROCESAMIENTO: Crear campos _display para cada FK
    const processedData = dataResult.rows.map((row) => {
      const processedRow = { ...row };

      // Para cada foreign key, crear un campo virtual con el nombre legible
      if (autoIncludeForeignKeys && schema.foreignKeys) {
        schema.foreignKeys.forEach((fk) => {
          const alias = `${fk.foreign_table_name}`; //_data

          // Buscar la columna de display en los resultados
          const displayValue = Object.keys(row).find(
            (key) =>
              key.startsWith(`${alias}_`) &&
              !key.endsWith(`_${fk.foreign_column_name}`) // No el ID
          );

          if (displayValue && row[displayValue]) {
            // Crear campo virtual: id_rol_display = "Administrador"
            processedRow[`${fk.column_name}_display`] = row[displayValue];
          }
        });
      }

      return processedRow;
    });

    console.log(
      `✅ Se obtuvieron ${dataResult.rows.length} registros de ${total} totales`
    );

    return {
      data: processedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getOptionsList(
    foreign_column_name,
    foreign_column_desc,
    foreign_table_name
  ) {
    console.log(`📜 get Options List: ${foreign_table_name}`);
    const mainQuery = `
      SELECT ${foreign_column_name} as optionvalue, trim(${foreign_column_desc}) as optiontext 
      FROM ${foreign_table_name} 
      WHERE esta_borrado='false' ORDER BY optionText ASC 
      LIMIT 1976;
    `;
    const r = await executeQuery(mainQuery);
    console.log(
      `💬 get Options List ${foreign_table_name}[${r.rows.length}]:`,
      r.rows
    );
    return r.rows;
  }

  // ========== MÉTODOS HELPER ==========
  static findDisplayColumn(schema) {
    // Prioridades para encontrar la mejor columna de display
    const priorities = [
      // Primera prioridad:
      //(col) => ["apellido1"].includes(col.column_name.toLowerCase()),

      // prioridad secundaria: primer columna de texto que no sea primary key
      (col) => col.data_type === "text" && !col.is_primary_key,

      // Última opción: columnas varchar que no sean primary key
      (col) =>
        (col.data_type === "character varying" ||
          col.data_type === "varchar") &&
        !col.is_primary_key,
    ];

    // Buscar por prioridades
    for (const priority of priorities) {
      const found = schema.columns.find(priority);
      if (found) {
        console.log(
          `📝 Columna de display encontrada: ${found.column_name} (${found.data_type})`
        );
        return found.column_name;
      }
    }

    // Si no encuentra nada, usar la primary key como último recurso
    console.log(
      "⚠️ No se encontró columna de display apropiada, usando primary key"
    );
    return schema.primaryKey;
  }

  static async findDisplayColumnName(tableName) {
    const schema = await SchemaService.getTableSchema(tableName);
    return this.findDisplayColumn(schema);
  }

  // READ ONE - Obtener un registro específico
  static async readOne(tableName, id, include = []) {
    console.log(
      `📖 Obteniendo registro individual de ${tableName} con ID: ${id}`
    );

    const schema = await SchemaService.getTableSchema(tableName);

    if (!schema.primaryKey) {
      throw new Error(`La tabla ${tableName} no tiene primary key`);
    }

    const options = {
      filters: { [schema.primaryKey]: id },
      include,
      limit: 1,
    };

    const result = await this.read(tableName, options);
    return result.data[0] || null;
  }

  // UPDATE - Actualizar registro
  static async update(tableName, id, data) {
    console.log(`📝 Actualizando registro en tabla: ${tableName}, ID: ${id}`);
    console.log("Datos para actualizar:", data);

    const schema = await SchemaService.getTableSchema(tableName);

    if (!schema.primaryKey) {
      throw new Error(`La tabla ${tableName} no tiene primary key`);
    }

    // Filtrar solo las columnas que existen y no son primary key
    const validColumns = schema.columns.filter(
      (col) =>
        data.hasOwnProperty(col.column_name) &&
        !col.is_primary_key &&
        data[col.column_name] !== null &&
        data[col.column_name] !== undefined
    );

    if (validColumns.length === 0) {
      throw new Error("No se proporcionaron datos válidos para actualizar");
    }

    const setClauses = validColumns.map(
      (col, index) => `${col.column_name} = $${index + 1}`
    );
    const values = validColumns.map((col) => data[col.column_name]);
    values.push(id); // Para el WHERE

    console.log(
      "Columnas a actualizar:",
      validColumns.map((c) => c.column_name)
    );
    console.log("Valores:", values);

    const query = `
      UPDATE ${tableName}
      SET ${setClauses.join(", ")}
      WHERE ${schema.primaryKey} = $${values.length}
      RETURNING *;
    `;

    const result = await executeQuery(query, values);

    if (result.rows.length === 0) {
      throw new Error(
        `No se encontró registro con ID ${id} en la tabla ${tableName}`
      );
    }

    console.log("✅ Registro actualizado exitosamente");
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
    const softDeleteColumn = schema.columns.find(
      (col) =>
        col.column_name === "esta_borrado" ||
        col.column_name === "deleted" ||
        col.column_name === "is_deleted"
    );

    let query;
    if (softDeleteColumn) {
      // Soft delete
      console.log(
        `Realizando soft delete usando columna: ${softDeleteColumn.column_name}`
      );
      query = `
        UPDATE ${tableName}
        SET ${softDeleteColumn.column_name} = true
        WHERE ${schema.primaryKey} = $1
        RETURNING *;
      `;
    } else {
      // Hard delete
      console.log("Realizando hard delete (eliminación física)");
      query = `
        DELETE FROM ${tableName}
        WHERE ${schema.primaryKey} = $1
        RETURNING *;
      `;
    }

    const result = await executeQuery(query, [id]);

    if (result.rows.length === 0) {
      throw new Error(
        `No se encontró registro con ID ${id} en la tabla ${tableName}`
      );
    }

    console.log("✅ Registro eliminado exitosamente");
    return result.rows[0];
  }

  // Obtener opciones para campos de foreign key
  static async getForeignKeyOptions(tableName, columnName) {
    console.log(`🔗🔗 Obteniendo opciones para FK: ${tableName}.${columnName}`);

    const schema = await SchemaService.getTableSchema(tableName);
    const fkColumn = schema.foreignKeys.find(
      (fk) => fk.column_name === columnName
    );

    if (!fkColumn) {
      throw new Error(`La columna ${columnName} no es una foreign key`);
    }

    console.log(
      `🏴‍☠️🏴‍☠️🏴‍☠️ Obteniendo opciones para FK: ${fkColumn.foreign_column_desc}-${fkColumn.column_desc}`
    );
    console.log(
      `🏴‍☠️🏴‍☠️🏴‍☠️ Obteniendo opciones para FK: ${fkColumn.foreign_table_name}-${fkColumn.foreign_column_desc}-${fkColumn.foreign_column_name}`
    );

    const foreignSchema = await SchemaService.getTableSchema(
      fkColumn.foreign_table_name
    );

    // Usar el nuevo método helper
    const displayColumn = fkColumn.foreign_column_desc
      ? fkColumn.foreign_column_desc
      : this.findDisplayColumn(foreignSchema);

    const options = await this.getOptionsList(
      fkColumn.foreign_column_name,
      displayColumn,
      fkColumn.foreign_table_name
    );

    console.log(
      `💬✅ opciones para ${fkColumn.foreign_table_name}[${options.length}]`,
      options
    );

    return {
      options: options.map((item) => ({
        value: item["optionvalue"],
        label: item["optiontext"] || item[fkColumn.foreign_column_name],
        data: item,
      })),
      displayColumn,
      valueColumn: "value",
    };
  }
  // Construir cláusula individual según el operador
  static buildConditionClause(condition, tableName, paramCount) {
    const { field, operator, value } = condition;
    /*
    const field = condition[0];
    const operator = condition[1];
    const value = condition[2];
    */
    const columnRef = `${tableName}.${field}`;
    let clause = "";
    let params = [];
    let currentParamCount = paramCount;
    console.log(condition, "+ operator>>>>", field, operator, value);
    switch (operator) {
      case "equal":
      case "=":
        clause = `${columnRef} = $${currentParamCount}`;
        params.push(value);
        currentParamCount++;
        break;

      case "not_equal":
      case "!=":
        clause = `${columnRef} != $${currentParamCount}`;
        params.push(value);
        currentParamCount++;
        break;

      case "gt":
      case ">":
        clause = `${columnRef} > $${currentParamCount}`;
        params.push(value);
        currentParamCount++;
        break;

      case "lt":
      case "<":
        clause = `${columnRef} < $${currentParamCount}`;
        params.push(value);
        console.log(columnRef, " < ", value, " $", currentParamCount);
        currentParamCount++;
        break;

      case "gte":
      case ">=":
        clause = `${columnRef} >= $${currentParamCount}`;
        params.push(value);
        currentParamCount++;
        break;

      case "lte":
      case "<=":
        clause = `${columnRef} <= $${currentParamCount}`;
        params.push(value);
        currentParamCount++;
        break;

      case "LIKE":
        clause = `${columnRef} ILIKE $${currentParamCount}`;
        params.push(`%${value}%`);
        currentParamCount++;
        break;

      case "NOT_LIKE":
        clause = `${columnRef} NOT ILIKE $${currentParamCount}`;
        params.push(`%${value}%`);
        currentParamCount++;
        break;

      case "STARTS_WITH":
        clause = `${columnRef} ILIKE $${currentParamCount}`;
        params.push(`${value}%`);
        currentParamCount++;
        break;

      case "ENDS_WITH":
        clause = `${columnRef} ILIKE $${currentParamCount}`;
        params.push(`%${value}`);
        currentParamCount++;
        break;

      case "IS_NULL":
        clause = `${columnRef} IS NULL`;
        break;

      case "IS_NOT_NULL":
        clause = `${columnRef} IS NOT NULL`;
        break;

      case "BETWEEN":
        if (value && value.includes(",")) {
          const [min, max] = value.split(",");
          if (min && max) {
            clause = `${columnRef} BETWEEN $${currentParamCount} AND $${
              currentParamCount + 1
            }`;
            params.push(min.trim(), max.trim());
            currentParamCount += 2;
          }
        }
        break;

      default:
        console.warn(`Operador no soportado: ${operator}`);
        break;
    }
    console.log("🔧 Cláusula:", clause, "   🅿 Parámetros:", params);
    return {
      clause,
      conditionParams: value,
      newParamCount: currentParamCount,
    };
  }
}

module.exports = CrudService;
