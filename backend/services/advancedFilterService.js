// backend/services/advancedFilterService.js
// Servicio para procesar filtros avanzados con operadores relacionales y lógicos

class AdvancedFilterService {
  // Construir WHERE clause a partir de filtros avanzados
  static buildAdvancedWhereClause(filterQuery, tableName, paramCount = 1) {
    if (
      !filterQuery ||
      !filterQuery.groups ||
      filterQuery.groups.length === 0
    ) {
      return { whereClause: "", params: [], paramCount };
    }

    const { whereClause, params, newParamCount } = this.processGroups(
      filterQuery.groups,
      tableName,
      paramCount
    );

    return {
      whereClause: whereClause ? `WHERE ${whereClause}` : "",
      params,
      paramCount: newParamCount,
    };
  }

  // Procesar grupos de condiciones
  static processGroups(groups, tableName, paramCount) {
    const groupClauses = [];
    let params = [];
    let currentParamCount = paramCount;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      if (group.conditions && group.conditions.length > 0) {
        const { clause, groupParams, newParamCount } = this.processConditions(
          group.conditions,
          tableName,
          currentParamCount
        );

        if (clause) {
          // Si hay múltiples condiciones en el grupo, envolverlas en paréntesis
          const groupClause =
            group.conditions.length > 1 ? `(${clause})` : clause;

          // Agregar operador de grupo si no es el primer grupo
          if (i > 0 && group.groupOperator) {
            groupClauses.push(`${group.groupOperator} ${groupClause}`);
          } else {
            groupClauses.push(groupClause);
          }

          params.push(...groupParams);
          currentParamCount = newParamCount;
        }
      }
    }

    return {
      whereClause: groupClauses.join(" "),
      params,
      paramCount: currentParamCount,
    };
  }

  // Procesar condiciones individuales
  static processConditions(conditions, tableName, paramCount) {
    const conditionClauses = [];
    let params = [];
    let currentParamCount = paramCount;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];

      if (condition.field && condition.operator) {
        const { clause, conditionParams, newParamCount } =
          this.buildConditionClause(condition, tableName, currentParamCount);

        if (clause) {
          // Agregar operador lógico si no es la primera condición
          if (i > 0 && condition.logicalOperator) {
            conditionClauses.push(`${condition.logicalOperator} ${clause}`);
          } else {
            conditionClauses.push(clause);
          }

          params.push(...conditionParams);
          currentParamCount = newParamCount;
        }
      }
    }

    return {
      clause: conditionClauses.join(" "),
      groupParams: params,
      newParamCount: currentParamCount,
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
      conditionParams: params,
      newParamCount: currentParamCount,
    };
  }

  // Procesar filtros en el CrudService
  static processAdvancedFilters(
    options,
    tableName,
    whereConditions,
    params,
    paramCount
  ) {
    // Verificar si hay filtros avanzados
    if (options.advancedFilter) {
      try {
        const filterQuery =
          typeof options.advancedFilter === "string"
            ? JSON.parse(options.advancedFilter)
            : options.advancedFilter;

        console.log(
          "🔧 Procesando filtros avanzados:",
          JSON.stringify(filterQuery, null, 2)
        );

        const {
          whereClause,
          params: advancedParams,
          paramCount: newParamCount,
        } = this.buildAdvancedWhereClause(filterQuery, tableName, paramCount);

        if (whereClause) {
          // Remover el "WHERE" del inicio ya que se agregará después
          const clauseWithoutWhere = whereClause.replace(/^WHERE\s+/, "");
          whereConditions.push(clauseWithoutWhere);
          params.push(...advancedParams);
          paramCount = newParamCount;
        }

        console.log("✅ Filtros avanzados procesados:", {
          whereClause: clauseWithoutWhere,
          paramCount: newParamCount,
          paramsAdded: advancedParams.length,
        });
      } catch (error) {
        console.error("❌ Error procesando filtros avanzados:", error);
      }
    }

    return { whereConditions, params, paramCount };
  }
}

module.exports = AdvancedFilterService;
