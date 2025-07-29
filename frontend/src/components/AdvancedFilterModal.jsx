import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const AdvancedFilterModal = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  schema, 
  currentFilters = {},
  tableName 
}) => {
  // Estructura de filtro: { conditions: [], logicalOperator: 'AND' }
  const [filterGroups, setFilterGroups] = useState([
    { 
      id: 1, 
      conditions: [{ id: 1, field: '', operator: '', value: '', logicalOperator: 'AND' }],
      groupOperator: 'AND'
    }
  ]);
  
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Convertir filtros actuales al nuevo formato si existen
      if (Object.keys(currentFilters).length > 0) {
        convertCurrentFilters();
      }
      updateActiveCount();
    }
  }, [isOpen, currentFilters]);

  // Obtener operadores según el tipo de campo
  const getOperatorsByType = (dataType) => {
    const baseOperators = [
      { value: '=', label: 'Igual a (=)', icon: '🟰' },
      { value: '!=', label: 'Diferente de (≠)', icon: '🚫' },
    ];

    const textOperators = [
      { value: 'LIKE', label: 'Contiene', icon: '🔍' },
      { value: 'NOT_LIKE', label: 'No contiene', icon: '⛔' },
      { value: 'STARTS_WITH', label: 'Empieza con', icon: '▶️' },
      { value: 'ENDS_WITH', label: 'Termina con', icon: '◀️' },
      { value: 'IS_NULL', label: 'Está vacío', icon: '🈳' },
      { value: 'IS_NOT_NULL', label: 'No está vacío', icon: '✅' },
    ];

    const numericOperators = [
      { value: '>', label: 'Mayor que (>)', icon: '⬆️' },
      { value: '<', label: 'Menor que (<)', icon: '⬇️' },
      { value: '>=', label: 'Mayor o igual (≥)', icon: '⤴️' },
      { value: '<=', label: 'Menor o igual (≤)', icon: '⤵️' },
      { value: 'BETWEEN', label: 'Entre (rango)', icon: '↔️' },
    ];

    const dateOperators = [
      { value: '>', label: 'Después del', icon: '📅⬆️' },
      { value: '<', label: 'Antes del', icon: '📅⬇️' },
      { value: '>=', label: 'Desde', icon: '📅▶️' },
      { value: '<=', label: 'Hasta', icon: '📅◀️' },
      { value: 'BETWEEN', label: 'Entre fechas', icon: '📅↔️' },
    ];

    const booleanOperators = [
      { value: '=', label: 'Es', icon: '🔘' },
    ];

    switch (dataType) {
      case 'text':
      case 'varchar':
      case 'character varying':
        return [...baseOperators, ...textOperators];
      
      case 'integer':
      case 'numeric':
      case 'decimal':
      case 'float':
        return [...baseOperators, ...numericOperators];
      
      case 'date':
      case 'timestamp':
        return [...baseOperators, ...dateOperators];
      
      case 'boolean':
        return booleanOperators;
      
      default:
        return baseOperators;
    }
  };

  // Obtener las columnas filtrables
  const getFilterableColumns = () => {
    if (!schema || !schema.columns) return [];
    
    return schema.columns.filter(col => {
      if (col.is_primary_key) return false;
      const systemColumns = ['created_at', 'updated_at', 'fecha_creacion', 'fecha_actualizacion'];
      if (systemColumns.includes(col.column_name)) return false;
      const filterableTypes = ['text', 'varchar', 'character varying', 'integer', 'numeric', 'boolean', 'date', 'timestamp'];
      return filterableTypes.includes(col.data_type);
    });
  };

  // Obtener el nombre display de la columna
  const getColumnDisplayName = (columnName) => {
    const translations = {
      'nombres': 'Nombre', 'apellidos': 'Apellidos', 'correo': 'Correo Electrónico',
      'usuario': 'Usuario', 'id_rol': 'Rol', 'rol': 'Rol', 'esta_borrado': 'Estado',
      'descripcion': 'Descripción', 'activo': 'Activo', 'estado': 'Estado',
      'telefono': 'Teléfono', 'direccion': 'Dirección', 'fecha_nacimiento': 'Fecha de Nacimiento',
      'salario': 'Salario', 'departamento': 'Departamento', 'cargo': 'Cargo',
      'codigo': 'Código', 'nombre': 'Nombre', 'precio': 'Precio',
      'cantidad': 'Cantidad', 'categoria': 'Categoría'
    };
    
    return translations[columnName] || 
           columnName.charAt(0).toUpperCase() + 
           columnName.slice(1).replace(/_/g, ' ');
  };

  // Convertir filtros actuales al nuevo formato
  const convertCurrentFilters = () => {
    const conditions = Object.entries(currentFilters).map((entry, index) => ({
      id: Date.now() + index,
      field: entry[0],
      operator: 'LIKE',
      value: entry[1],
      logicalOperator: index === 0 ? 'AND' : 'AND'
    }));

    if (conditions.length > 0) {
      setFilterGroups([{
        id: Date.now(),
        conditions,
        groupOperator: 'AND'
      }]);
    }
  };

  // Actualizar contador de filtros activos
  const updateActiveCount = () => {
    const count = filterGroups.reduce((total, group) => {
      return total + group.conditions.filter(cond => 
        cond.field && cond.operator && (cond.value || ['IS_NULL', 'IS_NOT_NULL'].includes(cond.operator))
      ).length;
    }, 0);
    setActiveFiltersCount(count);
  };

  // Agregar nueva condición a un grupo
  const addCondition = (groupId) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, {
            id: Date.now(),
            field: '',
            operator: '',
            value: '',
            logicalOperator: 'AND'
          }]
        };
      }
      return group;
    }));
  };

  // Eliminar condición
  const removeCondition = (groupId, conditionId) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        const newConditions = group.conditions.filter(cond => cond.id !== conditionId);
        return {
          ...group,
          conditions: newConditions.length > 0 ? newConditions : [{ 
            id: Date.now(), field: '', operator: '', value: '', logicalOperator: 'AND' 
          }]
        };
      }
      return group;
    }));
  };

  // Actualizar condición
  const updateCondition = (groupId, conditionId, field, value) => {
    setFilterGroups(groups => groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(cond => {
            if (cond.id === conditionId) {
              return { ...cond, [field]: value };
            }
            return cond;
          })
        };
      }
      return group;
    }));
    setTimeout(updateActiveCount, 0);
  };

  // Agregar nuevo grupo
  const addGroup = () => {
    setFilterGroups([...filterGroups, {
      id: Date.now(),
      conditions: [{ id: Date.now(), field: '', operator: '', value: '', logicalOperator: 'AND' }],
      groupOperator: 'AND'
    }]);
  };

  // Eliminar grupo
  const removeGroup = (groupId) => {
    if (filterGroups.length > 1) {
      setFilterGroups(groups => groups.filter(group => group.id !== groupId));
    }
  };

  // Actualizar operador de grupo
  const updateGroupOperator = (groupId, operator) => {
    setFilterGroups(groups => groups.map(group => 
      group.id === groupId ? { ...group, groupOperator: operator } : group
    ));
  };

  // Renderizar input según el tipo de operador
  const renderValueInput = (condition, group) => {
    const column = getFilterableColumns().find(col => col.column_name === condition.field);
    if (!column) return null;

    const updateValue = (value) => {
      updateCondition(group.id, condition.id, 'value', value);
    };

    // Operadores que no necesitan valor
    if (['IS_NULL', 'IS_NOT_NULL'].includes(condition.operator)) {
      return (
        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500">
          Sin valor requerido
        </div>
      );
    }

    // Operador BETWEEN (rango)
    if (condition.operator === 'BETWEEN') {
      const values = condition.value ? condition.value.split(',') : ['', ''];
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            type={column.data_type === 'integer' ? 'number' : column.data_type === 'date' ? 'date' : 'text'}
            placeholder="Desde"
            value={values[0] || ''}
            onChange={(e) => updateValue(`${e.target.value},${values[1] || ''}`)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type={column.data_type === 'integer' ? 'number' : column.data_type === 'date' ? 'date' : 'text'}
            placeholder="Hasta"
            value={values[1] || ''}
            onChange={(e) => updateValue(`${values[0] || ''},${e.target.value}`)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );
    }

    // Campo booleano
    if (column.data_type === 'boolean') {
      return (
        <select
          value={condition.value}
          onChange={(e) => updateValue(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar...</option>
          <option value="true">Verdadero</option>
          <option value="false">Falso</option>
        </select>
      );
    }

    // Input por defecto
    const inputType = column.data_type === 'integer' ? 'number' : 
                     column.data_type === 'date' ? 'date' : 'text';
    
    return (
      <input
        type={inputType}
        placeholder="Valor..."
        value={condition.value}
        onChange={(e) => updateValue(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  // Construir query para el backend
  const buildFilterQuery = () => {
    const query = {
      groups: filterGroups.map(group => ({
        operator: group.groupOperator,
        conditions: group.conditions.filter(cond => 
          cond.field && cond.operator && (cond.value || ['IS_NULL', 'IS_NOT_NULL'].includes(cond.operator))
        ).map(cond => ({
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
          logicalOperator: cond.logicalOperator
        }))
      })).filter(group => group.conditions.length > 0)
    };
    
    return query;
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    const filterQuery = buildFilterQuery();
    onApplyFilters(filterQuery);
    onClose();
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setFilterGroups([{
      id: Date.now(),
      conditions: [{ id: Date.now(), field: '', operator: '', value: '', logicalOperator: 'AND' }],
      groupOperator: 'AND'
    }]);
    setActiveFiltersCount(0);
    onApplyFilters({});
    onClose();
  };

  const filterableColumns = getFilterableColumns();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔧 Filtros Avanzados - ${tableName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🔧</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Constructor de Filtros Avanzado</h4>
              <p className="text-sm text-gray-600">
                Crea condiciones complejas usando operadores relacionales y lógicos
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {activeFiltersCount} condición{activeFiltersCount !== 1 ? 'es' : ''} activa{activeFiltersCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Grupos de Filtros */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {filterGroups.map((group, groupIndex) => (
            <div key={group.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Header del Grupo */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Grupo {groupIndex + 1}
                  </span>
                  {groupIndex > 0 && (
                    <select
                      value={group.groupOperator}
                      onChange={(e) => updateGroupOperator(group.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="AND">Y (AND)</option>
                      <option value="OR">O (OR)</option>
                    </select>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => addCondition(group.id)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                  >
                    + Condición
                  </button>
                  {filterGroups.length > 1 && (
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                    >
                      × Eliminar Grupo
                    </button>
                  )}
                </div>
              </div>

              {/* Condiciones del Grupo */}
              <div className="space-y-3">
                {group.conditions.map((condition, condIndex) => (
                  <div key={condition.id} className="flex items-center space-x-2 bg-white p-3 rounded border">
                    {/* Operador Lógico */}
                    {condIndex > 0 && (
                      <select
                        value={condition.logicalOperator}
                        onChange={(e) => updateCondition(group.id, condition.id, 'logicalOperator', e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 w-16"
                      >
                        <option value="AND">Y</option>
                        <option value="OR">O</option>
                      </select>
                    )}

                    {/* Campo */}
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(group.id, condition.id, 'field', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar campo...</option>
                      {filterableColumns.map(col => (
                        <option key={col.column_name} value={col.column_name}>
                          {getColumnDisplayName(col.column_name)} ({col.data_type})
                        </option>
                      ))}
                    </select>

                    {/* Operador */}
                    {condition.field && (
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(group.id, condition.id, 'operator', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar operador...</option>
                        {getOperatorsByType(
                          filterableColumns.find(col => col.column_name === condition.field)?.data_type
                        ).map(op => (
                          <option key={op.value} value={op.value}>
                            {op.icon} {op.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Valor */}
                    {condition.operator && (
                      <div className="flex-1">
                        {renderValueInput(condition, group)}
                      </div>
                    )}

                    {/* Eliminar Condición */}
                    <button
                      onClick={() => removeCondition(group.id, condition.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar condición"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Botón Agregar Grupo */}
        <div className="text-center">
          <button
            onClick={addGroup}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            + Agregar Grupo
          </button>
        </div>

        {/* Preview de la Query */}
        {activeFiltersCount > 0 && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Vista previa de filtros:</h5>
            <div className="text-sm text-gray-700 font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
              {JSON.stringify(buildFilterQuery(), null, 2)}
            </div>
          </div>
        )}

        {/* Footer con botones */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleClearFilters}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Limpiar todo</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Aplicar Filtros</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AdvancedFilterModal;