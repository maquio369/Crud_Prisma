// src/components/Dashboard.jsx - Versión completa con Modal 2x2
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import Modal from './Modal';
import RecordForm from './RecordForm';

const Dashboard = () => {
  const [tables, setTables] = useState([]);
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
  
  // 🚀 NUEVO: Estados para el modal 2x2
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Cargar tablas al montar el componente
  useEffect(() => {
    loadTables();
  }, []);

  // 🚀 FUNCIÓN PARA CARGAR DATOS ANALÍTICOS
  const loadAnalyticsData = async (tableName) => {
    try {
      // Simular carga de datos analíticos
      const mockData = {
        tableName,
        totalRecords: pagination.total || 0,
        columnsCount: schema?.columns?.length || 0,
        lastModified: new Date().toISOString(),
        relations: schema?.foreignKeys?.length || 0,
        indexes: schema?.columns?.filter(col => col.is_primary_key)?.length || 0,
        recentActivity: [
          { action: 'CREATE', user: 'Admin', timestamp: new Date(Date.now() - 1000 * 60 * 2) },
          { action: 'UPDATE', user: 'User123', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
          { action: 'DELETE', user: 'Admin', timestamp: new Date(Date.now() - 1000 * 60 * 60) }
        ]
      };
      setAnalyticsData(mockData);
      setShowAnalyticsModal(true);
    } catch (error) {
      showNotification('Error al cargar análisis: ' + error.message, 'error');
    }
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTables();
      setTables(response.data.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar las tablas: ' + err.message);
      console.error('Error loading tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTable = async (tableName) => {
    try {
      setLoading(true);
      setSelectedTable(tableName);
      
      const [schemaResponse, recordsResponse] = await Promise.all([
        apiService.getTableSchema(tableName),
        apiService.getRecords(tableName, { limit: 50 })
      ]);
      
      setSchema(schemaResponse.data.data);
      setRecords(recordsResponse.data.data);
      setPagination(recordsResponse.data.pagination);
      
      console.log('✅ Tabla cargada:', tableName);
      console.log('📊 Registros con FK resueltas:', recordsResponse.data.data);
      
      setError(null);
    } catch (err) {
      setError('Error al cargar la tabla: ' + err.message);
      console.error('Error loading table:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (page) => {
    if (!selectedTable) return;
    
    try {
      setLoading(true);
      const response = await apiService.getRecords(selectedTable, { 
        page, 
        limit: pagination.limit,
      });
      
      setRecords(response.data.data);
      setPagination(response.data.pagination);
      
    } catch (err) {
      setError('Error al cargar la página: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleCreateRecord = async (data) => {
    try {
      setCrudLoading(true);
      await apiService.createRecord(selectedTable, data);
      
      await selectTable(selectedTable);
      setShowCreateModal(false);
      
      showNotification('Registro creado exitosamente', 'success');
    } catch (err) {
      showNotification('Error al crear registro: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEditRecord = async (data) => {
    try {
      setCrudLoading(true);
      const primaryKey = schema.primaryKey;
      const recordId = selectedRecord[primaryKey];
      
      await apiService.updateRecord(selectedTable, recordId, data);
      
      await selectTable(selectedTable);
      setShowEditModal(false);
      setSelectedRecord(null);
      
      showNotification('Registro actualizado exitosamente', 'success');
    } catch (err) {
      showNotification('Error al actualizar registro: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    try {
      setCrudLoading(true);
      const primaryKey = schema.primaryKey;
      const recordId = selectedRecord[primaryKey];
      
      await apiService.deleteRecord(selectedTable, recordId);
      
      await selectTable(selectedTable);
      setShowDeleteModal(false);
      setSelectedRecord(null);
      
      showNotification('Registro eliminado exitosamente', 'success');
    } catch (err) {
      showNotification('Error al eliminar registro: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCrudLoading(false);
    }
  };

  const openEditModal = (record) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const openDeleteModal = (record) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-6 right-6 p-4 rounded-xl shadow-2xl z-50 transform transition-all duration-500 ease-out ${
      type === 'success' 
        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' 
        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
    } max-w-sm backdrop-blur-sm border border-white/20`;
    
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            ${type === 'success' ? '✓' : '✕'}
          </div>
        </div>
        <div class="flex-1 font-medium">${message}</div>
      </div>
    `;
    
    notification.style.transform = 'translateX(100%) scale(0.8)';
    notification.style.opacity = '0';
    
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0) scale(1)';
      notification.style.opacity = '1';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%) scale(0.8)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 4000);
  };

  // 🎯 FUNCIÓN MEJORADA PARA RENDERIZAR VALORES DE CELDAS
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

  const renderTablesList = () => (
    <div className="w-80 bg-gradient-to-br from-slate-50 to-gray-100 border-r border-gray-200/60 backdrop-blur-sm">
      <div className="p-6 border-b border-gray-200/60 bg-white/50">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📊</span>
          </div>
          <span>Tablas</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">{tables.length} tablas disponibles</p>
      </div>
      
      <div className="p-4 h-full overflow-y-auto">
        {loading && !selectedTable && (
          <div className="flex items-center justify-center p-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {tables.map((table) => (
            <div
              key={table.table_name}
              onClick={() => selectTable(table.table_name)}
              className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                selectedTable === table.table_name
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:bg-white hover:shadow-lg hover:border-blue-200'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
                selectedTable === table.table_name 
                  ? 'bg-gradient-to-r from-white/20 to-transparent opacity-100' 
                  : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-50 to-transparent'
              }`}></div>
              
              <div className="relative">
                <div className={`font-semibold text-lg mb-2 ${
                  selectedTable === table.table_name ? 'text-white' : 'text-gray-900'
                }`}>
                  {table.table_name}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
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
          ))}
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
              
              <button className="flex items-center space-x-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Buscar</span>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
                <p className="text-gray-600 mb-4">Esta tabla no contiene datos</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                >
                  Crear primer registro
                </button>
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
                      
                      {schema.columns.filter(col => !col.is_primary_key).map((column) => {
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
                            'clave': 'Contraseña',
                            'documentos': 'Documentos'
                          };
                          return translations[columnName] || columnName.charAt(0).toUpperCase() + columnName.slice(1);
                        };

                        return (
                          <th
                            key={column.column_name}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {getColumnDisplayName(column.column_name)}
                          </th>
                        );
                      })}
                      
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => {
                      const primaryKey = schema.primaryKey;
                      const recordId = record[primaryKey];

                      return (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            <div className="flex items-center space-x-2">
                              <span className="text-yellow-600">🔑</span>
                              <span>{recordId}</span>
                            </div>
                          </td>

                          {schema.columns
                            .filter(column => !column.is_primary_key)
                            .map(column => (
                              <td 
                                key={column.column_name} 
                                className="px-6 py-4 whitespace-nowrap text-sm"
                              >
                                {renderCellValue(record, column)}
                              </td>
                            ))}
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => openEditModal(record)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                                title="Editar registro"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => openDeleteModal(record)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                                title="Eliminar registro"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
                <span className="font-medium">{pagination.total}</span> resultados
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadPage(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Anterior
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => loadPage(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Oops! Algo salió mal</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadTables();
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header principal */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/60">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💾</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Dynamic DB Admin
                </h1>
                <p className="text-gray-600 mt-1">
                  Administrador de base de datos • Estilo Prisma Studio
                </p>
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
                  <span className="text-gray-700 font-medium">{tables.length} tablas</span>
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

      {/* Modales existentes */}
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
    </div>
  );
};

export default Dashboard;