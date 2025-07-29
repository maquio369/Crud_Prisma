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

    const initialFilters = {};
    const filterableColumns = getFilterableColumns();

    filterableColumns.forEach((column, index) => {
      // Verificar que la columna tenga las propiedades necesarias
      if (!column || !column.column_name || !column.data_type) {
        console.warn('Columna inválida encontrada:', column);
        return;
      }

      initialFilters[column.column_name] = {
        operator: getDefaultOperator(column.data_type),
        value: '',
        value2: '', // Para rangos de fecha
        connector: index < filterableColumns.length - 1 ? 'AND' : null, // Último campo no tiene connector
        column: column
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
        return '=';
      default:
        return '=';
    }
  };

  // Obtener operadores disponibles por tipo
  const getOperators = (dataType) => {
    if (!dataType) {
      // Operadores por defecto si no hay data_type
      return [
        { value: '=', label: '=', title: 'Igual a' },
        { value: 'like', label: '≈', title: 'Contiene' },
        { value: '!=', label: '≠', title: 'Diferente de' }
      ];
    }

    if (dataType === 'date' || dataType === 'timestamp') {
      return [
        { value: 'M', label: '🗓', title: 'Mes de' },
        { value: 'between', label: '//', title: 'Entre las fechas de' },
        { value: '=', label: '=', title: 'Igual a' }
      ];
    }

    // Para campos generales
    return [
      { value: '=', label: '=', title: 'Igual a' },
      { value: 'like', label: '≈', title: 'Contiene' },
      { value: '!=', label: '≠', title: 'Diferente de' },
      { value: '>=', label: '≥', title: 'Mayor o igual que' },
      { value: '<=', label: '≤', title: 'Menor o igual que' }
    ];
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

  // Renderizar input dinámico según operador
  const renderDynamicInput = (fieldName, filter) => {
    if (!filter || !filter.column) {
      return (
        <input
          type="text"
          value=""
          disabled
          placeholder="Error: columna no válida"
          className="px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-500 text-sm flex-1"
        />
      );
    }

    const { operator, value, value2, column } = filter;
    const isDate = column.data_type === 'date' || column.data_type === 'timestamp';

    if (isDate) {
      switch (operator) {
        case 'M': // Mes
          return (
            <select
              value={value}
              onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Seleccionar mes...</option>
              <option value="01">Enero</option>
              <option value="02">Febrero</option>
              <option value="03">Marzo</option>
              <option value="04">Abril</option>
              <option value="05">Mayo</option>
              <option value="06">Junio</option>
              <option value="07">Julio</option>
              <option value="08">Agosto</option>
              <option value="09">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          );

        case 'between': // Entre fechas
          return (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={value}
                onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                style={{ width: '140px' }}
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={value2}
                onChange={(e) => updateFilter(fieldName, { value2: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                style={{ width: '140px' }}
              />
            </div>
          );

        case '=': // Fecha específica
          return (
            <input
              type="date"
              value={value}
              onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              style={{ width: '140px' }}
            />
          );
      }
    }

    // Para campos generales
    if (column.data_type === 'boolean') {
      return (
        <select
          value={value}
          onChange={(e) => updateFilter(fieldName, { value: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">Seleccionar...</option>
          <option value="true">Verdadero</option>
          <option value="false">Falso</option>
        </select>
      );
    }

    // Input por defecto
    const inputType = (column.data_type === 'integer' || column.data_type === 'numeric') ? 'number' : 'text';
    
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

        // Agregar connector si no es el último campo
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
      size="lg"
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
                Llena los campos que deseas usar para filtrar. Los campos vacíos se ignoran.
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {activeFiltersCount} campo{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Formulario de filtros */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {filterableColumns.length > 0 ? (
            filterableColumns.map((column, index) => {
              if (!column || !column.column_name) {
                return null; // Saltar columnas inválidas
              }

              const fieldName = column.column_name;
              const filter = filters[fieldName] || {};
              const operators = getOperators(column.data_type);
              const hasValue = filter.value && filter.value.trim() !== '';
              const isLastField = index === filterableColumns.length - 1;

              return (
                <div 
                  key={fieldName}
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    hasValue ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Label del campo */}
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center space-x-2">
                      <span>{getColumnDisplayName(fieldName)}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {column.data_type || 'unknown'}
                      </span>
                      {schema.foreignKeys?.some(fk => fk.column_name === fieldName) && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          🔗 FK
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Fila de filtro */}
                  <div className="flex items-center space-x-3">
                    {/* Selector de operador */}
                    <select
                      value={filter.operator || getDefaultOperator(column.data_type)}
                      onChange={(e) => updateFilter(fieldName, { operator: e.target.value, value: '', value2: '' })}
                      className="border-0 bg-transparent text-teal-600 font-bold text-lg focus:ring-0 focus:outline-none cursor-pointer"
                      style={{ appearance: 'none' }}
                      title={operators.find(op => op.value === (filter.operator || getDefaultOperator(column.data_type)))?.title}
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value} title={op.title}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Input dinámico */}
                    <div className="flex-1">
                      {renderDynamicInput(fieldName, filter)}
                    </div>

                    {/* Selector Y/O (excepto para el último campo) */}
                    {!isLastField && (
                      <select
                        value={filter.connector || 'AND'}
                        onChange={(e) => updateFilter(fieldName, { connector: e.target.value })}
                        className="border-0 bg-transparent text-teal-600 font-bold focus:ring-0 focus:outline-none cursor-pointer"
                        style={{ appearance: 'none' }}
                      >
                        <option value="AND">Y</option>
                        <option value="OR">O</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-2xl mb-2 block">📭</span>
              <p>No hay campos filtrables disponibles</p>
            </div>
          )}
        </div>

        {/* Preview de filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Vista previa de filtros:</h5>
            <div className="space-y-1">
              {Object.entries(filters)
                .filter(([_, filter]) => filter.value && filter.value.trim() !== '')
                .map(([fieldName, filter], index, array) => (
                  <div key={fieldName} className="text-sm">
                    <span className="font-medium text-blue-600">{getColumnDisplayName(fieldName)}</span>
                    <span className="text-gray-500 mx-2">
                      {getOperators(filter.column.data_type).find(op => op.value === filter.operator)?.title}
                    </span>
                    <span className="text-gray-700">
                      {filter.operator === 'between' ? 
                        `${filter.value} a ${filter.value2}` : 
                        filter.value}
                    </span>
                    {index < array.length - 1 && (
                      <span className="text-teal-600 font-bold ml-2">
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