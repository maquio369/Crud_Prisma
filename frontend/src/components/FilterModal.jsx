import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const FilterModal = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  schema, 
  currentFilters = {},
  tableName 
}) => {
  const [filters, setFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
      setActiveFilters(Object.keys(currentFilters).filter(key => currentFilters[key] !== '').length);
    }
  }, [isOpen, currentFilters]);

  // Obtener las columnas filtrables (excluyendo primary keys y algunas columnas sistema)
  const getFilterableColumns = () => {
    if (!schema || !schema.columns) return [];
    
    return schema.columns.filter(col => {
      // Excluir primary keys
      if (col.is_primary_key) return false;
      
      // Excluir columnas de sistema comunes
      const systemColumns = ['created_at', 'updated_at', 'fecha_creacion', 'fecha_actualizacion'];
      if (systemColumns.includes(col.column_name)) return false;
      
      // Incluir solo tipos de datos filtrables
      const filterableTypes = ['text', 'varchar', 'character varying', 'integer', 'boolean', 'date', 'timestamp'];
      return filterableTypes.includes(col.data_type);
    });
  };

  // Obtener el nombre display de la columna
  const getColumnDisplayName = (columnName) => {
    const translations = {
      'nombres': 'Nombre',
      'apellidos': 'Apellidos', 
      'correo': 'Correo Electrónico',
      'usuario': 'Usuario',
      'id_rol': 'Rol',
      'rol': 'Rol',
      'esta_borrado': 'Estado',
      'descripcion': 'Descripción',
      'activo': 'Activo',
      'estado': 'Estado',
      'telefono': 'Teléfono',
      'direccion': 'Dirección',
      'fecha_nacimiento': 'Fecha de Nacimiento',
      'salario': 'Salario',
      'departamento': 'Departamento',
      'cargo': 'Cargo',
      'codigo': 'Código',
      'nombre': 'Nombre',
      'precio': 'Precio',
      'cantidad': 'Cantidad',
      'categoria': 'Categoría'
    };
    
    return translations[columnName] || 
           columnName.charAt(0).toUpperCase() + 
           columnName.slice(1).replace(/_/g, ' ');
  };

  // Manejar cambios en los filtros
  const handleFilterChange = (columnName, value) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[columnName];
    } else {
      newFilters[columnName] = value;
    }
    
    setFilters(newFilters);
    setActiveFilters(Object.keys(newFilters).filter(key => newFilters[key] !== '').length);
  };

  // Renderizar el input según el tipo de columna
  const renderFilterInput = (column) => {
    const { column_name, data_type, is_foreign_key } = column;
    const currentValue = filters[column_name] || '';

    // Campo booleano
    if (data_type === 'boolean') {
      return (
        <select
          value={currentValue}
          onChange={(e) => handleFilterChange(column_name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      );
    }

    // Campo numérico
    if (data_type === 'integer' || data_type === 'numeric') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Mínimo"
            value={filters[`${column_name}_min`] || ''}
            onChange={(e) => handleFilterChange(`${column_name}_min`, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Máximo"
            value={filters[`${column_name}_max`] || ''}
            onChange={(e) => handleFilterChange(`${column_name}_max`, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );
    }

    // Campo de fecha
    if (data_type === 'date' || data_type === 'timestamp') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filters[`${column_name}_from`] || ''}
            onChange={(e) => handleFilterChange(`${column_name}_from`, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            value={filters[`${column_name}_to`] || ''}
            onChange={(e) => handleFilterChange(`${column_name}_to`, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );
    }

    // Campo de texto (por defecto)
    return (
      <input
        type="text"
        placeholder={`Buscar por ${getColumnDisplayName(column_name).toLowerCase()}...`}
        value={currentValue}
        onChange={(e) => handleFilterChange(column_name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setFilters({});
    setActiveFilters(0);
    onApplyFilters({});
    onClose();
  };

  const filterableColumns = getFilterableColumns();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔍 Filtrar ${tableName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header con información */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🔍</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Filtros de búsqueda</h4>
              <p className="text-sm text-gray-600">
                Configura los filtros para encontrar registros específicos
              </p>
            </div>
          </div>
          {activeFilters > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {activeFilters} filtro{activeFilters !== 1 ? 's' : ''} activo{activeFilters !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="max-h-96 overflow-y-auto">
          <div className="grid gap-4">
            {filterableColumns.length > 0 ? (
              filterableColumns.map((column) => (
                <div key={column.column_name} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {getColumnDisplayName(column.column_name)}
                    <span className="text-xs text-gray-500 ml-2">
                      ({column.data_type})
                    </span>
                  </label>
                  {renderFilterInput(column)}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">🚫</span>
                <p>No hay columnas filtrables disponibles en esta tabla</p>
              </div>
            )}
          </div>
        </div>

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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Aplicar filtros</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FilterModal;