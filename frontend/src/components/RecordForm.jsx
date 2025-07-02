// src/components/RecordForm.jsx - Con layout 2x2 para los campos
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const RecordForm = ({ 
  tableName, 
  schema, 
  record = null, 
  onSave, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({});
  const [foreignKeyOptions, setForeignKeyOptions] = useState({});
  const [errors, setErrors] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  const isEdit = !!record;

  useEffect(() => {
    initializeForm();
    loadForeignKeyOptions();
  }, [schema, record]);

  const initializeForm = () => {
    const initialData = {};
    
    schema.columns.forEach(column => {
      if (isEdit && record) {
        // Modo edición: usar datos del registro
        initialData[column.column_name] = record[column.column_name] ?? '';
      } else {
        // Modo creación: valores por defecto
        if (column.is_primary_key && column.column_default?.includes('nextval')) {
          // Primary key auto-increment: no incluir
          return;
        }
        
        if (column.column_default) {
          if (column.data_type === 'boolean') {
            initialData[column.column_name] = column.column_default === 'true';
          } else {
            initialData[column.column_name] = column.column_default;
          }
        } else if (column.data_type === 'boolean') {
          initialData[column.column_name] = false;
        } else {
          initialData[column.column_name] = '';
        }
      }
    });
    
    setFormData(initialData);
  };

  const loadForeignKeyOptions = async () => {
    const fkColumns = schema.foreignKeys;
    if (fkColumns.length === 0) return;

    setLoadingOptions(true);
    const options = {};

    try {
      await Promise.all(
        fkColumns.map(async (fkColumn) => {
          try {
            const response = await apiService.getForeignKeyOptions(
              tableName, 
              fkColumn.column_name
            );
            options[fkColumn.column_name] = response.data.data.options;
          } catch (error) {
            console.error(`Error loading FK options for ${fkColumn.column_name}:`, error);
            options[fkColumn.column_name] = [];
          }
        })
      );

      setForeignKeyOptions(options);
    } catch (error) {
      console.error('Error loading foreign key options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));

    // Limpiar error del campo al cambiar el valor
    if (errors[columnName]) {
      setErrors(prev => ({
        ...prev,
        [columnName]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    schema.columns.forEach(column => {
      const value = formData[column.column_name];
      
      // Skip auto-increment primary keys
      if (column.is_primary_key && column.column_default?.includes('nextval')) {
        return;
      }

      // Required field validation
      if (column.is_nullable === 'NO' && !column.column_default) {
        if (value === null || value === undefined || value === '') {
          newErrors[column.column_name] = `${column.column_name} es requerido`;
        }
      }

      // Type validation
      if (value !== null && value !== undefined && value !== '') {
        if (column.data_type === 'integer') {
          const numValue = Number(value);
          if (!Number.isInteger(numValue)) {
            newErrors[column.column_name] = 'Debe ser un número entero';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Preparar datos para envío
    const dataToSend = {};
    
    schema.columns.forEach(column => {
      const value = formData[column.column_name];
      
      // Skip auto-increment primary keys in create mode
      if (!isEdit && column.is_primary_key && column.column_default?.includes('nextval')) {
        return;
      }

      // Skip primary key in edit mode
      if (isEdit && column.is_primary_key) {
        return;
      }

      // Only include non-empty values
      if (value !== null && value !== undefined && value !== '') {
        if (column.data_type === 'integer') {
          dataToSend[column.column_name] = parseInt(value);
        } else if (column.data_type === 'boolean') {
          dataToSend[column.column_name] = Boolean(value);
        } else {
          dataToSend[column.column_name] = value;
        }
      } else if (column.data_type === 'boolean') {
        dataToSend[column.column_name] = Boolean(value);
      }
    });

    onSave(dataToSend);
  };

  // 🎯 FUNCIÓN PARA OBTENER NOMBRE AMIGABLE DE COLUMNAS
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
      'clave': 'Contraseña',
      'documentos': 'Documentos',
      'telefono': 'Teléfono',
      'fecha_creacion': 'Fecha de Creación',
      'fecha_actualizacion': 'Última Actualización'
    };
    return translations[columnName] || columnName.charAt(0).toUpperCase() + columnName.slice(1);
  };

  // 🎯 FUNCIÓN PARA RENDERIZAR CAMPO INDIVIDUAL
  const renderField = (column) => {
    const value = formData[column.column_name] ?? '';
    const error = errors[column.column_name];
    const isRequired = column.is_nullable === 'NO' && !column.column_default;
    const displayName = getColumnDisplayName(column.column_name);
    
    // Skip auto-increment primary keys
    if (column.is_primary_key && column.column_default?.includes('nextval')) {
      return null;
    }

    // Skip primary key in edit mode (mostrar como disabled)
    if (isEdit && column.is_primary_key) {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600">🔑</span>
              <span>{displayName} (ID)</span>
            </div>
          </label>
          <input
            type="text"
            value={value}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">
            La clave primaria no se puede modificar
          </p>
        </div>
      );
    }

    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
    }`;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <div className="flex items-center space-x-2">
            <span>
              {column.is_foreign_key && <span className="text-purple-600">🔗</span>}
              <span>{displayName}</span>
            </span>
            {isRequired && <span className="text-red-500 text-lg">*</span>}
          </div>
          <span className="text-xs font-normal text-gray-500 mt-1 block">
            {column.data_type}
            {column.character_maximum_length && ` (máx: ${column.character_maximum_length})`}
            {!isRequired && ' (opcional)'}
          </span>
        </label>

        {/* Foreign Key Select */}
        {column.is_foreign_key ? (
          <select
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            className={baseInputClasses}
            disabled={loadingOptions}
          >
            <option value="">
              {loadingOptions ? 'Cargando opciones...' : `Selecciona ${displayName.toLowerCase()}`}
            </option>
            {foreignKeyOptions[column.column_name]?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : column.data_type === 'boolean' ? (
          /* Boolean Toggle mejorado */
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleInputChange(column.column_name, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm text-gray-700 font-medium">
                {value ? 'Activo' : 'Inactivo'}
              </span>
            </label>
          </div>
        ) : column.data_type === 'text' || column.column_name === 'descripcion' ? (
          /* Text Area for long text */
          <textarea
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            rows={3}
            className={baseInputClasses}
            placeholder={`Describe ${displayName.toLowerCase()}...`}
          />
        ) : column.column_name === 'clave' ? (
          /* Password field */
          <input
            type="password"
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            className={baseInputClasses}
            placeholder="Ingresa la contraseña..."
          />
        ) : (
          /* Regular Input */
          <input
            type={
              column.data_type === 'integer' ? 'number' : 
              column.column_name.includes('correo') || column.column_name.includes('email') ? 'email' :
              column.column_name.includes('telefono') || column.column_name.includes('phone') ? 'tel' :
              'text'
            }
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            className={baseInputClasses}
            placeholder={`Ingresa ${displayName.toLowerCase()}...`}
          />
        )}

        {error && (
          <p className="text-red-500 text-xs flex items-center space-x-1">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  };

  // 🎯 FILTRAR COLUMNAS VISIBLES (excluir auto-increment PKs)
  const visibleColumns = schema.columns.filter(column => {
    // En modo creación, excluir auto-increment primary keys
    if (!isEdit && column.is_primary_key && column.column_default?.includes('nextval')) {
      return false;
    }
    return true;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 🎯 GRILLA 2x2 PARA LOS CAMPOS */}
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        {visibleColumns.length <= 4 ? (
          // Si hay 4 o menos campos, usar grilla 2x2
          <div className="grid grid-cols-2 gap-6">
            {visibleColumns.map(column => (
              <div key={column.column_name}>
                {renderField(column)}
              </div>
            ))}
          </div>
        ) : (
          // Si hay más de 4 campos, usar grilla 2x2 pero con scroll
          <div className="grid grid-cols-2 gap-6">
            {visibleColumns.map(column => (
              <div key={column.column_name}>
                {renderField(column)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🎯 INFORMACIÓN ADICIONAL */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start space-x-3">
          <span className="text-blue-600 text-lg">💡</span>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Información del formulario
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Campos marcados con <span className="text-red-500">*</span> son obligatorios</p>
              <p>• Los campos FK 🔗 requieren seleccionar una opción válida</p>
              {isEdit && <p>• La clave primaria 🔑 no se puede modificar</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 BOTONES DE ACCIÓN MEJORADOS */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || loadingOptions}
          className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
          <span>{isEdit ? '✏️' : '✨'}</span>
          <span>{isEdit ? 'Actualizar' : 'Crear'} registro</span>
        </button>
      </div>
    </form>
  );
};

export default RecordForm;