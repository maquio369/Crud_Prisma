// src/components/Dashboard.jsx - Código completo con sistema de filtros
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import Modal from './Modal';
import RecordForm from './RecordForm';
import FormStyleFiltersModal from './FormStyleFiltersModal';

const Dashboard = () => {
  const [tables, setTables] = useState([]); // Inicializar como array vacío
  const [selectedTable, setSelectedTable] = useState(null);
  const [records, setRecords] = useState([]);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  // Estados para modales y CRUD
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [crudLoading, setCrudLoading] = useState(false);
  
  // Estados para filtros inteligentes
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [smartFilters, setSmartFilters] = useState({}); // 🚀 NUEVO: Para almacenar filtros inteligentes

  // Cargar tablas al montar el componente
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando listado de tablas...');
      
      const response = await apiService.getTables();
      console.log('Response from API:', response); // Debug
      
      // Extraer los datos correctamente según la estructura de respuesta
      let tablesData;
      if (response.data && response.data.data) {
        // Si la respuesta tiene estructura { data: { data: [...] } }
        tablesData = response.data.data;
      } else if (response.data) {
        // Si la respuesta tiene estructura { data: [...] }
        tablesData = response.data;
      } else if (Array.isArray(response)) {
        // Si la respuesta es directamente un array
        tablesData = response;
      } else {
        // Fallback
        tablesData = [];
      }
      
      // Asegurar que tablesData es un array
      if (!Array.isArray(tablesData)) {
        console.warn('Tables data is not an array:', tablesData);
        tablesData = [];
      }
      
      setTables(tablesData);
      console.log(`✅ Se cargaron ${tablesData.length} tablas`);
    } catch (error) {
      console.error('Error loading tables:', error);
      setError('Error al cargar las tablas: ' + error.message);
      setTables([]); // Asegurar que tables sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  // 🚀 FUNCIÓN PARA APLICAR FILTROS INTELIGENTES
  const handleApplyFilters = async (smartFilterData) => {
    try {
      setLoading(true);
      setSmartFilters(smartFilterData);
      
      // Contar filtros activos
      const activeCount = Object.keys(smartFilterData).length;
      setActiveFiltersCount(activeCount);

      // Construir parámetros para el backend
      const params = {
        page: '1', // Resetear a primera página al filtrar
        limit: '50'
      };

      // Convertir filtros inteligentes al formato que espera el backend
      if (activeCount > 0) {
        // Convertir a formato simple para mantener compatibilidad
        Object.entries(smartFilterData).forEach(([field, config]) => {
          if (config.operator === 'BETWEEN' && config.value) {
            const [min, max] = config.value.split(',');
            if (min && max) {
              params[`${field}_min`] = min.trim();
              params[`${field}_max`] = max.trim();
            }
          } else if (['IS_NULL', 'IS_NOT_NULL'].includes(config.operator)) {
            params[`${field}_${config.operator.toLowerCase()}`] = 'true';
          } else {
            // Para operadores simples
            if (config.operator === 'LIKE') {
              params[field] = config.value; // El backend ya maneja LIKE automáticamente para texto
            } else {
              params[`${field}_${config.operator}`] = config.value;
            }
          }
        });
      }

      const response = await apiService.getRecords(selectedTable, params);
      console.log('Smart filter response:', response); // Debug
      
      // Extraer los datos correctamente según la estructura de respuesta
      let recordsData, paginationData;
      
      if (response.data && response.data.data) {
        recordsData = response.data.data;
        paginationData = response.data.pagination;
      } else if (response.data) {
        recordsData = response.data;
        paginationData = response.pagination;
      } else {
        recordsData = response;
        paginationData = {};
      }
      
      // Asegurar que recordsData es un array
      if (!Array.isArray(recordsData)) {
        console.warn('Smart filtered records data is not an array:', recordsData);
        recordsData = [];
      }

      setRecords(recordsData);
      setPagination(paginationData || {});
      
      // Mostrar mensaje de filtros aplicados
      if (activeCount > 0) {
        console.log(`✅ Se aplicaron ${activeCount} filtro(s) inteligente(s), encontrados ${recordsData.length} registros`);
      }
    } catch (error) {
      console.error('Error al aplicar filtros inteligentes:', error);
      setRecords([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar filtros
  const handleClearAllFilters = () => {
    setCurrentFilters({});
    setActiveFiltersCount(0);
    fetchRecords(selectedTable, 1); // Recargar datos sin filtros
  };

  const fetchSchema = async (table) => {
    try {
      console.log(`📋 Obteniendo schema de ${table}...`);
      const response = await apiService.getTableSchema(table);
      console.log('Schema response:', response); // Debug
      
      // Extraer los datos correctamente según la estructura de respuesta
      let schemaData;
      if (response.data && response.data.data) {
        schemaData = response.data.data;
      } else if (response.data) {
        schemaData = response.data;
      } else {
        schemaData = response;
      }
      
      setSchema(schemaData);
      console.log(`✅ Schema de ${table} cargado, columnas:`, schemaData.columns?.length || 0);
    } catch (error) {
      console.error('Error fetching schema:', error);
      setSchema(null);
    }
  };

  // Función modificada para mantener filtros al cambiar de página
  const fetchRecords = async (table, page = 1, maintainFilters = false) => {
    if (!table) return;
    
    try {
      setLoading(true);
      console.log(`📖 Cargando registros de ${table}, página ${page}`);
      
      // Mantener filtros actuales si se especifica
      const filters = maintainFilters ? currentFilters : {};
      
      // Construir parámetros
      const params = {
        page: page.toString(),
        limit: '50',
        ...filters
      };

      const response = await apiService.getRecords(table, params);
      console.log('Records response:', response); // Debug
      
      // Extraer los datos correctamente según la estructura de respuesta
      let recordsData, paginationData;
      
      if (response.data && response.data.data) {
        recordsData = response.data.data;
        paginationData = response.data.pagination;
      } else if (response.data) {
        recordsData = response.data;
        paginationData = response.pagination;
      } else {
        recordsData = response;
        paginationData = {};
      }
      
      // Asegurar que recordsData es un array
      if (!Array.isArray(recordsData)) {
        console.warn('Records data is not an array:', recordsData);
        recordsData = [];
      }

      setRecords(recordsData);
      setPagination(paginationData || {});
      
      console.log(`✅ Se cargaron ${recordsData.length} registros de ${table}`);
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  // Función modificada para limpiar filtros al cambiar de tabla
  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setRecords([]);
    setPagination({});
    setCurrentFilters({}); // Limpiar filtros
    setActiveFiltersCount(0); // Resetear contador
    fetchSchema(table);
    fetchRecords(table, 1);
  };

  // Función para manejar acciones CRUD
  const handleCreateRecord = async (formData) => {
    try {
      setCrudLoading(true);
      console.log('📝 Creando nuevo registro:', formData);
      
      const response = await apiService.createRecord(selectedTable, formData);
      console.log('Create response:', response); // Debug
      
      // Extraer el nuevo registro
      let newRecord;
      if (response.data && response.data.data) {
        newRecord = response.data.data;
      } else if (response.data) {
        newRecord = response.data;
      } else {
        newRecord = response;
      }
      
      console.log('✅ Registro creado exitosamente:', newRecord);
      
      setShowCreateModal(false);
      fetchRecords(selectedTable, 1, true); // Mantener filtros al refrescar
      
    } catch (error) {
      console.error('❌ Error al crear registro:', error);
      alert('Error al crear el registro: ' + (error.response?.data?.message || error.message));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEditRecord = async (formData) => {
    try {
      setCrudLoading(true);
      console.log('📝 Editando registro:', formData);
      
      const response = await apiService.updateRecord(selectedTable, selectedRecord[schema.primaryKey], formData);
      console.log('Update response:', response); // Debug
      
      // Extraer el registro actualizado
      let updatedRecord;
      if (response.data && response.data.data) {
        updatedRecord = response.data.data;
      } else if (response.data) {
        updatedRecord = response.data;
      } else {
        updatedRecord = response;
      }
      
      console.log('✅ Registro actualizado exitosamente:', updatedRecord);
      
      setShowEditModal(false);
      setSelectedRecord(null);
      fetchRecords(selectedTable, pagination.currentPage || 1, true); // Mantener filtros
      
    } catch (error) {
      console.error('❌ Error al actualizar registro:', error);
      alert('Error al actualizar el registro: ' + (error.response?.data?.message || error.message));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    try {
      setCrudLoading(true);
      console.log('🗑️ Eliminando registro ID:', selectedRecord[schema.primaryKey]);
      
      const response = await apiService.deleteRecord(selectedTable, selectedRecord[schema.primaryKey]);
      console.log('Delete response:', response); // Debug
      
      console.log('✅ Registro eliminado exitosamente');
      
      setShowDeleteModal(false);
      setSelectedRecord(null);
      fetchRecords(selectedTable, pagination.currentPage || 1, true); // Mantener filtros
      
    } catch (error) {
      console.error('❌ Error al eliminar registro:', error);
      alert('Error al eliminar el registro: ' + (error.response?.data?.message || error.message));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEditClick = (record) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const handleDeleteClick = (record) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  // 🎯 FUNCIÓN MEJORADA PARA RENDERIZAR VALORES DE CELDAS (como en tu código original)
  const renderCellValue = (record, column) => {
    const value = record[column.column_name];
    
    // 🚀 NUEVA LÓGICA: Si es FK, mostrar el texto en lugar del ID
    if (schema.foreignKeys) {
      const fkColumn = schema.foreignKeys.find(fk => fk.column_name === column.column_name);
      if (fkColumn) {
        // Buscar el campo _display correspondiente
        const displayField = `${column.column_name}_display`;
        const displayValue = record[displayField];
        
        if (displayValue) {
          return (
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 text-xs">🔗</span>
              <span className="font-medium text-gray-900">{displayValue}</span>
              <span className="text-xs text-gray-400">#{value}</span>
            </div>
          );
        }
      }
    }
    
    // Manejar otros tipos de datos
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Sin datos</span>;
    }
    
    // Boolean values
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Activo
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ✗ Inactivo
        </span>
      );
    }
    
    // Dates
    if (column.data_type === 'timestamp' || column.data_type === 'date') {
      return (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      );
    }
    
    // Email fields
    if (column.column_name.toLowerCase().includes('correo') || 
        column.column_name.toLowerCase().includes('email')) {
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 underline">
          {value}
        </a>
      );
    }
    
    // Phone fields
    if (column.column_name.toLowerCase().includes('telefono') || 
        column.column_name.toLowerCase().includes('phone')) {
      return (
        <a href={`tel:${value}`} className="text-green-600 hover:text-green-800">
          📞 {value}
        </a>
      );
    }
    
    // Primary keys
    if (column.is_primary_key) {
      return (
        <span className="inline-flex items-center space-x-1">
          <span className="text-yellow-600">🔑</span>
          <span className="font-mono text-sm font-semibold text-gray-700">{value}</span>
        </span>
      );
    }
    
    // Long text (truncate)
    if (typeof value === 'string' && value.length > 50) {
      return (
        <span className="text-sm text-gray-700" title={value}>
          {value.substring(0, 47)}...
        </span>
      );
    }
    
    // Default
    return <span className="text-sm text-gray-700">{value}</span>;
  };

  const getColumnDisplayName = (columnName) => {
    const translations = {
      'nombres': 'Nombre',
      'apellidos': 'Apellidos', 
      'correo': 'Correo',
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

  const renderTablesList = () => (
    <div className="w-80 bg-gradient-to-br from-slate-50 to-gray-100 border-r border-gray-200/60 backdrop-blur-sm">
      <div className="p-6 border-b border-gray-200/60 bg-white/50">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">📊</span>
          </div>
          <span>Tablas</span>
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {Array.isArray(tables) ? tables.length : 0} tablas disponibles
        </p>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {Array.isArray(tables) && tables.length > 0 ? (
            tables.map((table) => (
              <div
                key={table.table_name}
                onClick={() => handleTableSelect(table.table_name)}
                className={`relative cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
                  selectedTable === table.table_name
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                    : 'bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md border border-gray-200/60'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold text-sm ${
                      selectedTable === table.table_name ? 'text-white' : 'text-gray-900'
                    }`}>
                      📋 {table.table_name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className={`flex items-center space-x-1 ${
                      selectedTable === table.table_name ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      <span className="w-4 h-4 flex items-center justify-center">📈</span>
                      <span>{table.totalRecords || 0}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      selectedTable === table.table_name ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      <span className="w-4 h-4 flex items-center justify-center">🏗️</span>
                      <span>{table.columnsCount || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {table.hasSoftDelete && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTable === table.table_name 
                          ? 'bg-green-400/20 text-green-100' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        🛡️ Soft Delete
                      </span>
                    )}
                    {table.hasRelations && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTable === table.table_name 
                          ? 'bg-purple-400/20 text-purple-100' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        🔗 Relaciones
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-2xl mb-2 block">📊</span>
              <p className="text-sm">
                {loading ? 'Cargando tablas...' : 'No hay tablas disponibles'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDataTable = () => {
    if (!selectedTable || !schema) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona una tabla
            </h3>
            <p className="text-gray-600">
              Elige una tabla del menú lateral para comenzar a explorar y editar tus datos
            </p>
          </div>
        </div>
      );
    }

    const tableDisplayName = selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1);

    return (
      <div className="flex-1 bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Administración de {tableDisplayName}
              </h1>
              <div className="flex items-center text-sm text-gray-500">
                <span className="flex items-center">
                  📊 {selectedTable}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Botón Agregar */}
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Agregar</span>
              </button>
              
              {/* 🚀 BOTÓN FILTROS INTELIGENTES ACTUALIZADO */}
              <button 
                onClick={() => setShowFilterModal(true)}
                className={`flex items-center space-x-2 border transition-colors duration-200 text-sm font-medium px-4 py-2 rounded-lg ${
                  activeFiltersCount > 0
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Filtros Inteligentes</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              
              <button className="flex items-center space-x-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar</span>
              </button>

              <button className="p-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 🚀 INDICADOR DE FILTROS INTELIGENTES ACTIVOS */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg mt-4">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-700">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} inteligente{activeFiltersCount !== 1 ? 's' : ''} aplicado{activeFiltersCount !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-1">
                {Object.entries(smartFilters).slice(0, 3).map(([field, config]) => (
                  <span key={field} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {field}
                  </span>
                ))}
                {Object.keys(smartFilters).length > 3 && (
                  <span className="text-xs text-green-600">
                    +{Object.keys(smartFilters).length - 3} más
                  </span>
                )}
              </div>
              <button
                onClick={handleClearAllFilters}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Cargando datos...</p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📭</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeFiltersCount > 0 ? 'No se encontraron registros' : 'No hay registros'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeFiltersCount > 0 
                    ? 'Intenta ajustar los filtros inteligentes o limpiarlos para ver más resultados'
                    : 'Esta tabla no contiene datos'
                  }</p>
                {activeFiltersCount > 0 ? (
                  <button
                    onClick={handleClearAllFilters}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Limpiar filtros inteligentes
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Crear primer registro
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      
                      {schema.columns.filter(col => !col.is_primary_key).map((column) => (
                        <th key={column.column_name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            {schema.foreignKeys?.some(fk => fk.column_name === column.column_name) && (
                              <span className="text-purple-500">🔗</span>
                            )}
                            <span>{getColumnDisplayName(column.column_name)}</span>
                          </div>
                        </th>
                      ))}
                      
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={record[schema.primaryKey]} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1 + ((pagination.currentPage - 1) * 50)}
                        </td>
                        
                        {schema.columns.filter(col => !col.is_primary_key).map((column) => (
                          <td key={column.column_name} className="px-6 py-4 whitespace-nowrap">
                            {renderCellValue(record, column)}
                          </td>
                        ))}
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEditClick(record)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Editar registro"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(record)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Eliminar registro"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación actualizada para mantener filtros */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-700">
                      <span>
                        Mostrando {((pagination.currentPage - 1) * 50) + 1} a {Math.min(pagination.currentPage * 50, pagination.total)} de {pagination.total} registros
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => fetchRecords(selectedTable, pagination.currentPage - 1, true)}
                        disabled={pagination.currentPage <= 1}
                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Página {pagination.currentPage} de {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => fetchRecords(selectedTable, pagination.currentPage + 1, true)}
                        disabled={pagination.currentPage >= pagination.totalPages}
                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !selectedTable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-200 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTables}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header principal */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">⚡</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600">Sistema de gestión de base de datos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-blue-600">🐘</span>
                  <span className="text-gray-700 font-medium">PostgreSQL</span>
                </div>
                <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                  <span className="text-green-600">📊</span>
                  <span className="text-gray-700 font-medium">{Array.isArray(tables) ? tables.length : 0} tablas</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 font-medium">Conectado</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex h-[calc(100vh-88px)]">
        {renderTablesList()}
        {renderDataTable()}
      </div>

      {/* Modales */}
      {/* Modal Crear */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`✨ Crear nuevo registro en ${selectedTable}`}
        size="lg"
      >
        {schema && (
          <RecordForm
            tableName={selectedTable}
            schema={schema}
            onSave={handleCreateRecord}
            onCancel={() => setShowCreateModal(false)}
            isLoading={crudLoading}
          />
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`✏️ Editar registro en ${selectedTable}`}
        size="lg"
      >
        {schema && selectedRecord && (
          <RecordForm
            tableName={selectedTable}
            schema={schema}
            record={selectedRecord}
            onSave={handleEditRecord}
            onCancel={() => setShowEditModal(false)}
            isLoading={crudLoading}
          />
        )}
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="🗑️ Confirmar eliminación"
        size="md"
      >
        {selectedRecord && (
          <div>
            <div className="mb-6">
              <div className="flex items-start mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-200 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    ¿Estás seguro de eliminar este registro?
                  </h4>
                  <p className="text-gray-600">
                    Esta acción es irreversible y no se puede deshacer.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <h5 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Datos del registro:</span>
                </h5>
                <div className="grid gap-3">
                  {schema.columns.slice(0, 4).map(column => (
                    <div key={column.column_name} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <span className="font-medium text-gray-700 flex items-center space-x-2">
                        {column.is_primary_key && <span className="text-yellow-500">🔑</span>}
                        {schema.foreignKeys?.some(fk => fk.column_name === column.column_name) && <span className="text-purple-500">🔗</span>}
                        <span>{column.column_name}:</span>
                      </span>
                      <span className="text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                        {selectedRecord[column.column_name] || 'null'}
                      </span>
                    </div>
                  ))}
                  {schema.columns.length > 4 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      ... y {schema.columns.length - 4} campos más
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={crudLoading}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={crudLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-red-500/25 hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
              >
                {crudLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <span>🗑️</span>
                <span>Eliminar definitivamente</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 🚀 NUEVO: Modal Filtros Inteligentes */}
      <FormStyleFiltersModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        schema={schema}
        currentFilters={currentFilters}
        tableName={selectedTable}
      />
    </div>
  );
};

export default Dashboard;