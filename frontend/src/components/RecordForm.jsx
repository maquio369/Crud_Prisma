// src/components/RecordForm.jsx
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

  const renderField = (column) => {
    const value = formData[column.column_name] ?? '';
    const error = errors[column.column_name];
    const isRequired = column.is_nullable === 'NO' && !column.column_default;
    
    // Skip auto-increment primary keys
    if (column.is_primary_key && column.column_default?.includes('nextval')) {
      return null;
    }

    // Skip primary key in edit mode
    if (isEdit && column.is_primary_key) {
      return (
        <div key={column.column_name} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔑 {column.column_name} (Primary Key)
          </label>
          <input
            type="text"
            value={value}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            La clave primaria no se puede modificar
          </p>
        </div>
      );
    }

    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    return (
      <div key={column.column_name} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center space-x-2">
            <span>
              {column.is_foreign_key && '🔗 '}
              {column.column_name}
            </span>
            {isRequired && <span className="text-red-500">*</span>}
          </div>
          <span className="text-xs font-normal text-gray-500">
            {column.data_type}
            {column.character_maximum_length && ` (max: ${column.character_maximum_length})`}
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
              {loadingOptions ? 'Cargando opciones...' : 'Selecciona una opción'}
            </option>
            {foreignKeyOptions[column.column_name]?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : column.data_type === 'boolean' ? (
          /* Boolean Checkbox */
          <div className="flex items-center space-x-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleInputChange(column.column_name, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {value ? 'Verdadero' : 'Falso'}
              </span>
            </label>
          </div>
        ) : column.data_type === 'text' ? (
          /* Text Area for long text */
          <textarea
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            rows={3}
            className={baseInputClasses}
            placeholder={`Ingresa ${column.column_name}...`}
          />
        ) : (
          /* Regular Input */
          <input
            type={column.data_type === 'integer' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleInputChange(column.column_name, e.target.value)}
            className={baseInputClasses}
            placeholder={`Ingresa ${column.column_name}...`}
          />
        )}

        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-96 overflow-y-auto pr-2">
        {schema.columns.map(column => renderField(column))}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || loadingOptions}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          <span>{isEdit ? 'Actualizar' : 'Crear'} registro</span>
        </button>
      </div>
    </form>
  );
};

export default RecordForm;