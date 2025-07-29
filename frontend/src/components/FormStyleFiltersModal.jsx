// frontend/src/components/FormStyleFiltersModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const FormStyleFiltersModal = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  schema, 
  currentFilters = {},
  tableName 
}) => {
  const [filters, setFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    if (isOpen && schema) {
      initializeFilters();
    }
  }, [isOpen, schema]);

  // Inicializar filtros vacíos
  const initializeFilters = () => {
    if (!schema || !schema.columns) {
      console.warn('Schema no disponible para inicializar filtros');
      return;
    }

    console.log('🔍 DEBUG - Schema recibido:', {
      tableName: schema.tableName,
      totalColumns: schema.columns.length,
      columns: schema.columns
    });

    const initialFilters = {};
    const filterableColumns = getFilterableColumns();

    console.log(`🔍 DEBUG - ${filterableColumns.length} columnas filtrables encontradas`);

    filterableColumns.forEach((column, index) => {
      // Validación más robusta
      if (!column || !column.column_name) {
        console.warn('Columna inválida encontrada:', column);
        return;
      }

      // Usar data_type con fallback
      const dataType = column.data_type || 'text';

      initialFilters[column.column_name] = {
        operator: getDefaultOperator(dataType),
        value: '',
        value2: '', 
        connector: index < filterableColumns.length - 1 ? 'AND' : null,
        column: {
          ...column,
          data_type: dataType // Asegurar que data_type esté definido
        }
      };
    });

    setFilters(initialFilters);
    updateActiveCount(initialFilters);
  };

  // Obtener operador por defecto según tipo de campo
  const getDefaultOperator = (dataType) => {
    if (!dataType) {
      console.warn('data_type no definido, usando operador por defecto');
      return '=';
    }

    switch (dataType) {
      case 'text':
      case 'varchar':
      case 'character varying':
        return 'like';
      case 'date':
      case 'timestamp':
      case 'datetime':
      case 'timestamp without time zone':
      case 'timestamp with time zone':
        return '='; // Por defecto "igual a" para fechas
      default:
        return '=';
    }
  };

  // Obtener operadores disponibles por tipo - MEJORADO con mejor presentación
  const getOperators = (dataType) => {
    if (!dataType) {
      return [
        { value: '=', label: '= Igual a', icon: '🟰' },
        { value: 'like', label: '≈ Contiene', icon: '🔍' },
        { value: '!=', label: '≠ Diferente de', icon: '🚫' }
      ];
    }

    // 🗓 OPERADORES ESPECIALES PARA FECHAS
    if (dataType === 'date' || dataType === 'timestamp' || dataType === 'datetime' || 
        dataType === 'timestamp without time zone' || dataType === 'timestamp with time zone') {
      return [
        { value: 'M', label: '🗓 Mes de', icon: '📅', title: 'Filtrar por mes específico' },
        { value: 'between', label: '// Entre fechas', icon: '📊', title: 'Rango de fechas' },
        { value: '=', label: '= Igual a', icon: '🟰', title: 'Fecha exacta' },
        { value: '>=', label: '≥ Desde', icon: '⬆️', title: 'Desde esta fecha en adelante' },
        { value: '<=', label: '≤ Hasta', icon: '⬇️', title: 'Hasta esta fecha' }
      ];
    }

    // Operadores para números
    if (dataType === 'integer' || dataType === 'numeric') {
      return [
        { value: '=', label: '= Igual a', icon: '🟰' },
        { value: '!=', label: '≠ Diferente de', icon: '🚫' },
        { value: '>', label: '> Mayor que', icon: '⬆️' },
        { value: '<', label: '< Menor que', icon: '⬇️' },
        { value: '>=', label: '≥ Mayor o igual', icon: '⤴️' },
        { value: '<=', label: '≤ Menor o igual', icon: '⤵️' }
      ];
    }

    // Operadores para texto
    return [
      { value: '=', label: '= Igual a', icon: '🟰' },
      { value: 'like', label: '≈ Contiene', icon: '🔍' },
      { value: '!=', label: '≠ Diferente de', icon: '🚫' },
      { value: '>=', label: '≥ Mayor o igual', icon: '⤴️' },
      { value: '<=', label: '≤ Menor o igual', icon: '⤵️' }
    ];
  };

  // Obtener las columnas filtrables
  const getFilterableColumns = () => {
    if (!schema || !schema.columns) {
      console.warn('Schema o columns no disponible');
      return [];
    }
    
    return schema.columns.filter(col => {
      // Validación básica de columna
      if (!col || !col.column_name) {
        console.warn('Columna sin column_name:', col);
        return false;
      }

      if (col.is_primary_key) return false;
      
      const systemColumns = ['created_at', 'updated_at', 'fecha_creacion', 'fecha_actualizacion'];
      if (systemColumns.includes(col.column_name)) return false;
      
      // ✅ AGREGADO: timestamp without time zone
      const dataType = col.data_type || 'text';
      const filterableTypes = [
        'text', 'varchar', 'character varying', 
        'integer', 'numeric', 'boolean', 
        'date', 'timestamp', 'datetime',
        'timestamp without time zone',
        'timestamp with time zone'
      ];
      
      return filterableTypes.includes(dataType);
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

  // Actualizar filtro
  const updateFilter = (fieldName, updates) => {
    const newFilters = {
      ...filters,
      [fieldName]: {
        ...filters[fieldName],
        ...updates
      }
    };
    
    setFilters(newFilters);
    updateActiveCount(newFilters);
  };

  // Actualizar contador de filtros activos
  const updateActiveCount = (currentFilters = filters) => {
    const count = Object.values(currentFilters).filter(filter => 
      filter.value && filter.value.trim() !== ''
    ).length;
    setActiveFiltersCount(count);
  };

  // Renderizar input dinámico según operador - ✨ MEJORADO PARA FECHAS
  const renderValueInput = (fieldName, filter) => {
    const column = filter.column || {};
    const operator = filter.operator || '=';
    const value = filter.value || '';
    const dataType = column.data_type || 'text';

    // 🗓 CAMPOS DE FECHA - Lógica especial
    const isDateField = ['date', 'timestamp', 'datetime', 'timestamp without time zone', 'timestamp with time zone'].includes(dataType);

    if (isDateField) {
      switch (operator) {
        case 'M': // Mes específico
          const meses = [
            { value: '01', label: 'Enero' },
            { value: '02', label: 'Febrero' },
            { value: '03', label: 'Marzo' },
            { value: '04', label: 'Abril' },
            { value: '05', label: 'Mayo' },
            { value: '06', label: 'Junio' },
            { value: '07', label: 'Julio' },
            { value: '08', label: 'Agosto' },
            { value: '09', label: 'Septiembre' },
            { value: '10', label: 'Octubre' },
            { value: '11', label: 'Noviembre' },
            { value: '12', label: 'Diciembre' }
          ];

          return (
            <div className="flex items-center space-x-2 flex-1">
              <select
                value={value}
                onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1"
              >
                <option value="">Seleccionar mes...</option>
                {meses.map(mes => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                📅 {value ? meses.find(m => m.value === value)?.label || 'Mes' : 'Mes'}
              </div>
            </div>
          );

        case 'between': // Rango de fechas
          const values = value ? value.split(' - ') : ['', ''];
          return (
            <div className="flex items-center space-x-2 flex-1">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Desde:</label>
                <input
                  type="date"
                  value={values[0] || ''}
                  onChange={(e) => updateFilter(fieldName, { 
                    value: `${e.target.value} - ${values[1] || ''}` 
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center justify-center mt-5">
                <span className="text-gray-400 text-sm font-bold">→</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Hasta:</label>
                <input
                  type="date"
                  value={values[1] || ''}
                  onChange={(e) => updateFilter(fieldName, { 
                    value: `${values[0] || ''} - ${e.target.value}` 
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          );

        case '=': // Fecha exacta
        case '>=': // Desde fecha
        case '<=': // Hasta fecha
        default:
          return (
            <div className="flex items-center space-x-2 flex-1">
              <input
                type="date"
                value={value}
                onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1"
              />
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {operator === '=' ? '📅 Exacta' : 
                 operator === '>=' ? '📅 Desde' : 
                 operator === '<=' ? '📅 Hasta' : '📅'}
              </div>
            </div>
          );
      }
    }

    // 🔢 CAMPOS NUMÉRICOS
    const inputType = dataType === 'integer' || dataType === 'numeric' ? 'number' : 'text';
    
    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
        placeholder={`Filtrar por ${getColumnDisplayName(fieldName).toLowerCase()}...`}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1"
      />
    );
  };

  // Construir query para el backend
  const buildFilterQuery = () => {
    const activeFilters = {};
    const connectors = [];

    Object.entries(filters).forEach(([fieldName, filter]) => {
      if (filter.value && filter.value.trim() !== '') {
        activeFilters[fieldName] = {
          operator: filter.operator,
          value: filter.value,
          value2: filter.value2 || null
        };

        if (filter.connector) {
          connectors.push({
            field: fieldName,
            connector: filter.connector
          });
        }
      }
    });

    return {
      filters: activeFilters,
      connectors: connectors
    };
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    const filterQuery = buildFilterQuery();
    onApplyFilters(filterQuery);
    onClose();
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    const clearedFilters = { ...filters };
    Object.keys(clearedFilters).forEach(key => {
      clearedFilters[key] = {
        ...clearedFilters[key],
        value: '',
        value2: ''
      };
    });
    
    setFilters(clearedFilters);
    setActiveFiltersCount(0);
    onApplyFilters({});
    onClose();
  };

  const filterableColumns = getFilterableColumns();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔍 Filtros de Búsqueda - ${tableName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🔍</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Filtrar Registros</h4>
              <p className="text-sm text-gray-600">
                Configura los filtros para cada campo. Los campos vacíos se ignoran.
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {activeFiltersCount} campo{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Encabezados de columnas */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg border">
          <div className="col-span-3 text-sm font-medium text-gray-700">Campo</div>
          <div className="col-span-3 text-sm font-medium text-gray-700">Operador</div>
          <div className="col-span-4 text-sm font-medium text-gray-700">Valor</div>
          <div className="col-span-2 text-sm font-medium text-gray-700">Unir con</div>
        </div>

        {/* Lista de filtros */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {filterableColumns.length > 0 ? (
            filterableColumns.map((column, index) => {
              if (!column || !column.column_name) {
                return null;
              }

              const fieldName = column.column_name;
              const filter = filters[fieldName] || {};
              const operators = getOperators(column.data_type || 'text');
              const hasValue = filter.value && filter.value.trim() !== '';
              const isLastField = index === filterableColumns.length - 1;

              return (
                <div 
                  key={fieldName}
                  className={`grid grid-cols-12 gap-4 p-4 border rounded-lg transition-all duration-200 ${
                    hasValue ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Nombre del Campo */}
                  <div className="col-span-3 flex items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {getColumnDisplayName(fieldName)}
                      </span>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {column.data_type || 'text'}
                        </span>
                        {schema.foreignKeys?.some(fk => fk.column_name === fieldName) && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            🔗 FK
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selector de Operador */}
                  <div className="col-span-3 flex items-center">
                    <select
                      value={filter.operator || getDefaultOperator(column.data_type || 'text')}
                      onChange={(e) => updateFilter(fieldName, { operator: e.target.value, value: '', value2: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input de Valor */}
                  <div className="col-span-4 flex items-center">
                    {renderValueInput(fieldName, filter)}
                  </div>

                  {/* Selector AND/OR */}
                  <div className="col-span-2 flex items-center">
                    {!isLastField ? (
                      <select
                        value={filter.connector || 'AND'}
                        onChange={(e) => updateFilter(fieldName, { connector: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="AND">🔗 Y (AND)</option>
                        <option value="OR">🔄 O (OR)</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Final</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">📋</span>
              <p>No hay campos filtrables disponibles</p>
            </div>
          )}
        </div>

        {/* Vista previa de filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-medium text-green-900 mb-2">Filtros activos:</h5>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters)
                .filter(([_, filter]) => filter.value && filter.value.trim() !== '')
                .map(([fieldName, filter], index, array) => (
                  <div key={fieldName} className="flex items-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      <strong>{getColumnDisplayName(fieldName)}</strong> {
                        getOperators(filter.column?.data_type || 'text').find(op => op.value === filter.operator)?.label || filter.operator
                      } <em>{
                        filter.operator === 'between' ? 
                        `${filter.value}` : 
                        filter.value}
                      </em>
                    </span>
                    {index < array.length - 1 && (
                      <span className="text-green-600 font-bold mx-2">
                        {filter.connector === 'OR' ? 'O' : 'Y'}
                      </span>
                    )}
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
            <span>Limpiar filtros</span>
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
              disabled={activeFiltersCount === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>
                {activeFiltersCount > 0 
                  ? `Aplicar ${activeFiltersCount} Filtro${activeFiltersCount !== 1 ? 's' : ''}` 
                  : 'Aplicar Filtros'
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FormStyleFiltersModal;