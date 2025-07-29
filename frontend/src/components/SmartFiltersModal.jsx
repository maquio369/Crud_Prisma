// frontend/src/components/SmartFiltersModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const SmartFiltersModal = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  schema, 
  currentFilters = {},
  tableName 
}) => {
  const [fieldFilters, setFieldFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    if (isOpen && schema) {
      initializeFilters();
    }
  }, [isOpen, schema]);

  // Inicializar filtros con configuración por defecto
  const initializeFilters = () => {
    const filterableColumns = getFilterableColumns();
    const initialFilters = {};

    filterableColumns.forEach(column => {
      const defaultConfig = getDefaultFilterConfig(column);
      
      // Si hay filtros actuales, usarlos
      const existingValue = currentFilters[column.column_name];
      
      initialFilters[column.column_name] = {
        ...defaultConfig,
        value: existingValue || defaultConfig.value,
        active: !!existingValue // Activar si ya tiene valor
      };
    });

    setFieldFilters(initialFilters);
    updateActiveCount(initialFilters);
  };

  // Obtener configuración por defecto según el tipo de campo
  const getDefaultFilterConfig = (column) => {
    const baseConfig = {
      active: false,
      value: '',
      operator: '=',
      column: column
    };

    switch (column.data_type) {
      case 'text':
      case 'varchar':
      case 'character varying':
        return {
          ...baseConfig,
          operator: 'LIKE',
          placeholder: `Buscar en ${getColumnDisplayName(column.column_name)}...`
        };
      
      case 'integer':
      case 'numeric':
      case 'decimal':
      case 'float':
        return {
          ...baseConfig,
          operator: '=',
          placeholder: `Valor numérico...`
        };
      
      case 'date':
      case 'timestamp':
        return {
          ...baseConfig,
          operator: '>=',
          placeholder: 'Seleccionar fecha...'
        };
      
      case 'boolean':
        return {
          ...baseConfig,
          operator: '=',
          value: 'true',
          placeholder: 'Verdadero/Falso'
        };
      
      default:
        return baseConfig;
    }
  };

  // Obtener operadores disponibles por tipo de campo
  const getAvailableOperators = (dataType) => {
    const commonOperators = [
      { value: '=', label: 'Igual a', symbol: '=' },
      { value: '!=', label: 'Diferente de', symbol: '≠' }
    ];

    const textOperators = [
      { value: 'LIKE', label: 'Contiene', symbol: '⊃' },
      { value: 'NOT_LIKE', label: 'No contiene', symbol: '⊅' },
      { value: 'STARTS_WITH', label: 'Empieza con', symbol: '▶' },
      { value: 'ENDS_WITH', label: 'Termina con', symbol: '◀' },
      { value: 'IS_NULL', label: 'Está vacío', symbol: '∅' },
      { value: 'IS_NOT_NULL', label: 'No está vacío', symbol: '≠∅' }
    ];

    const numericOperators = [
      { value: '>', label: 'Mayor que', symbol: '>' },
      { value: '<', label: 'Menor que', symbol: '<' },
      { value: '>=', label: 'Mayor o igual', symbol: '≥' },
      { value: '<=', label: 'Menor o igual', symbol: '≤' },
      { value: 'BETWEEN', label: 'Entre', symbol: '↔' }
    ];

    const dateOperators = [
      { value: '>', label: 'Después de', symbol: '>' },
      { value: '<', label: 'Antes de', symbol: '<' },
      { value: '>=', label: 'Desde', symbol: '≥' },
      { value: '<=', label: 'Hasta', symbol: '≤' },
      { value: 'BETWEEN', label: 'Entre fechas', symbol: '↔' }
    ];

    switch (dataType) {
      case 'text':
      case 'varchar':
      case 'character varying':
        return [...textOperators, ...commonOperators];
      
      case 'integer':
      case 'numeric':
      case 'decimal':
      case 'float':
        return [...commonOperators, ...numericOperators];
      
      case 'date':
      case 'timestamp':
        return [...commonOperators, ...dateOperators];
      
      case 'boolean':
        return [{ value: '=', label: 'Es', symbol: '=' }];
      
      default:
        return commonOperators;
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

  // Actualizar filtro de un campo específico
  const updateFieldFilter = (fieldName, updates) => {
    const newFilters = {
      ...fieldFilters,
      [fieldName]: {
        ...fieldFilters[fieldName],
        ...updates
      }
    };
    
    setFieldFilters(newFilters);
    updateActiveCount(newFilters);
  };

  // Alternar activación de un filtro
  const toggleFilter = (fieldName) => {
    updateFieldFilter(fieldName, { active: !fieldFilters[fieldName]?.active });
  };

  // Actualizar contador de filtros activos
  const updateActiveCount = (filters = fieldFilters) => {
    const count = Object.values(filters).filter(filter => 
      filter.active && 
      (filter.value || ['IS_NULL', 'IS_NOT_NULL'].includes(filter.operator))
    ).length;
    setActiveFiltersCount(count);
  };

  // Renderizar input según el tipo de campo y operador
  const renderValueInput = (fieldName, filter) => {
    const { column, operator, value, placeholder } = filter;

    // Operadores que no necesitan valor
    if (['IS_NULL', 'IS_NOT_NULL'].includes(operator)) {
      return (
        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500">
          Sin valor requerido
        </div>
      );
    }

    // Operador BETWEEN (rango)
    if (operator === 'BETWEEN') {
      const values = value ? value.split(',') : ['', ''];
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            type={column.data_type === 'integer' ? 'number' : column.data_type === 'date' ? 'date' : 'text'}
            placeholder="Desde"
            value={values[0] || ''}
            onChange={(e) => updateFieldFilter(fieldName, { 
              value: `${e.target.value},${values[1] || ''}` 
            })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <input
            type={column.data_type === 'integer' ? 'number' : column.data_type === 'date' ? 'date' : 'text'}
            placeholder="Hasta"
            value={values[1] || ''}
            onChange={(e) => updateFieldFilter(fieldName, { 
              value: `${values[0] || ''},${e.target.value}` 
            })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      );
    }

    // Campo booleano
    if (column.data_type === 'boolean') {
      return (
        <select
          value={value}
          onChange={(e) => updateFieldFilter(fieldName, { value: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => updateFieldFilter(fieldName, { value: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    );
  };

  // Construir query para el backend
  const buildFilterQuery = () => {
    const activeFilters = Object.entries(fieldFilters)
      .filter(([_, filter]) => 
        filter.active && 
        (filter.value || ['IS_NULL', 'IS_NOT_NULL'].includes(filter.operator))
      )
      .reduce((acc, [fieldName, filter]) => {
        acc[fieldName] = {
          operator: filter.operator,
          value: filter.value
        };
        return acc;
      }, {});

    return activeFilters;
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    const filterQuery = buildFilterQuery();
    onApplyFilters(filterQuery);
    onClose();
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    const clearedFilters = { ...fieldFilters };
    Object.keys(clearedFilters).forEach(key => {
      clearedFilters[key] = {
        ...clearedFilters[key],
        active: false,
        value: clearedFilters[key].column.data_type === 'boolean' ? 'true' : ''
      };
    });
    
    setFieldFilters(clearedFilters);
    setActiveFiltersCount(0);
    onApplyFilters({});
    onClose();
  };

  // Activar filtros rápidos (preset común)
  const handleQuickFilter = (type) => {
    const updatedFilters = { ...fieldFilters };
    
    switch (type) {
      case 'text_search':
        // Activar todos los campos de texto con LIKE
        Object.keys(updatedFilters).forEach(key => {
          const filter = updatedFilters[key];
          if (['text', 'varchar', 'character varying'].includes(filter.column.data_type)) {
            updatedFilters[key] = { ...filter, active: true, operator: 'LIKE' };
          }
        });
        break;
      
      case 'active_records':
        // Activar filtro de registros activos
        Object.keys(updatedFilters).forEach(key => {
          const filter = updatedFilters[key];
          if (['esta_borrado', 'activo', 'active'].includes(filter.column.column_name)) {
            updatedFilters[key] = { 
              ...filter, 
              active: true, 
              operator: '=',
              value: filter.column.column_name === 'esta_borrado' ? 'false' : 'true'
            };
          }
        });
        break;
    }
    
    setFieldFilters(updatedFilters);
    updateActiveCount(updatedFilters);
  };

  const filterableColumns = getFilterableColumns();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🎯 Filtros Inteligentes - ${tableName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header con información */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Filtros por Campo</h4>
              <p className="text-sm text-gray-600">
                Cada campo tiene configuración por defecto. Activa y personaliza según necesites.
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('text_search')}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
          >
            🔍 Activar búsqueda en textos
          </button>
          <button
            onClick={() => handleQuickFilter('active_records')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
          >
            ✅ Solo registros activos
          </button>
        </div>

        {/* Lista de campos con filtros */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {filterableColumns.map(column => {
            const fieldName = column.column_name;
            const filter = fieldFilters[fieldName] || {};
            const isActive = filter.active;
            const operators = getAvailableOperators(column.data_type);

            return (
              <div
                key={fieldName}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  isActive 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Toggle */}
                  <div className="flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleFilter(fieldName)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  {/* Información del campo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">
                        {getColumnDisplayName(fieldName)}
                      </h5>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {column.data_type}
                      </span>
                      {schema.foreignKeys?.some(fk => fk.column_name === fieldName) && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          🔗 FK
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {fieldName}
                    </p>
                  </div>

                  {/* Configuración del filtro */}
                  {isActive && (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Selector de operador */}
                      <select
                        value={filter.operator || '='}
                        onChange={(e) => updateFieldFilter(fieldName, { operator: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.symbol} {op.label}
                          </option>
                        ))}
                      </select>

                      {/* Input de valor */}
                      <div className="md:col-span-2">
                        {renderValueInput(fieldName, filter)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview de filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Filtros que se aplicarán:</h5>
            <div className="space-y-1">
              {Object.entries(fieldFilters)
                .filter(([_, filter]) => filter.active && (filter.value || ['IS_NULL', 'IS_NOT_NULL'].includes(filter.operator)))
                .map(([fieldName, filter]) => (
                  <div key={fieldName} className="text-sm text-gray-700 bg-white px-3 py-2 rounded border">
                    <span className="font-medium">{getColumnDisplayName(fieldName)}</span>
                    <span className="text-gray-500 mx-2">
                      {getAvailableOperators(filter.column.data_type).find(op => op.value === filter.operator)?.symbol}
                    </span>
                    <span className="text-green-600">
                      {['IS_NULL', 'IS_NOT_NULL'].includes(filter.operator) ? 
                        'Sin valor' : 
                        filter.value || 'Sin valor'}
                    </span>
                  </div>
                ))}
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
            <span>Limpiar todos</span>
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Aplicar Filtros ({activeFiltersCount})</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SmartFiltersModal;