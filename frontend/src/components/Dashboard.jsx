// src/components/Dashboard.jsx - Mejoras para mostrar nombres de FK

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
  const [foreignKeyMappings, setForeignKeyMappings] = useState({}); // NUEVO: Para mapear FK
  
  // Estados para modales y CRUD (mantener igual)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [crudLoading, setCrudLoading] = useState(false);

  // Cargar tablas al montar el componente
  useEffect(() => {
    loadTables();
  }, []);

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
      
      // Cargar schema y registros en paralelo
      const [schemaResponse, recordsResponse] = await Promise.all([
        apiService.getTableSchema(tableName),
        apiService.getRecords(tableName, { limit: 50 })
      ]);
      
      setSchema(schemaResponse.data.data);
      setRecords(recordsResponse.data.data);
      setPagination(recordsResponse.data.pagination);
      
      // NUEVO: Guardar mappings de foreign keys si existen
      if (recordsResponse.data.foreignKeyMappings) {
        setForeignKeyMappings(recordsResponse.data.foreignKeyMappings);
      } else {
        setForeignKeyMappings({});
      }
      
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
        limit: pagination.limit 
      });
      setRecords(response.data.data);
      setPagination(response.data.pagination);
      
      // NUEVO: Actualizar mappings si es necesario
      if (response.data.foreignKeyMappings) {
        setForeignKeyMappings(response.data.foreignKeyMappings);
      }
    } catch (err) {
      setError('Error al cargar la página: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations (mantener igual)
  const handleCreateRecord = async (data) => {
    try {
      setCrudLoading(true);
      await apiService.createRecord(selectedTable, data);
      
      // Recargar datos
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
    // Función de notificación (mantener igual)
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

  // MEJORADO: Función para renderizar valores de celda con FK resueltas
  const renderCellValue = (value, column, record) => {
    if (value === null || value === undefined) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 italic">
          null
        </span>
      );
    }

    // NUEVO: Si es una foreign key y tenemos el mapping, mostrar el nombre
    if (column.is_foreign_key && foreignKeyMappings[column.column_name]) {
      const displayField = foreignKeyMappings[column.column_name];
      const displayValue = record[displayField];
      
      return (
        <div className="flex flex-col">
          <span className="font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
            {displayValue || 'Sin nombre'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            ID: {value}
          </span>
        </div>
      );
    }

    if (column.data_type === 'boolean') {
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
            : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800'
        }`}>
          <span className="mr-1">{value ? '✓' : '✗'}</span>
          {value ? 'true' : 'false'}
        </span>
      );
    }

    if (column.is_primary_key) {
      return (
        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {value}
        </span>
      );
    }

    // Formatear fechas
    if (column.data_type.includes('timestamp') || column.data_type.includes('date')) {
      try {
        const date = new Date(value);
        return (
          <span className="text-gray-700 text-sm">
            {date.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        );
      } catch {
        return <span className="text-gray-900">{String(value)}</span>;
      }
    }

    return <span className="text-gray-900">{String(value)}</span>;
  };

  // Función para renderizar tabla de datos (mantener la mayoría igual, solo cambiar renderCellValue)
  const renderDataTable = () => {
    if (!selectedTable || !schema) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Bienvenido a Dynamic DB Admin
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Selecciona una tabla de la lista lateral para comenzar a explorar y editar tus datos
            </p>
            <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Conectado</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span>{tables.length} tablas detectadas</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200/60 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">🗂️</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedTable}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>{pagination.total || 0} registros</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>{schema.columns.length} columnas</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>PK: {schema.primaryKey || 'Ninguna'}</span>
                  </span>
                  {Object.keys(foreignKeyMappings).length > 0 && (
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span>{Object.keys(foreignKeyMappings).length} FK resueltas</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadTables()}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center space-x-2 shadow-sm"
              >
                <span className="w-4 h-4">🔄</span>
                <span>Actualizar</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:scale-105"
              >
                <span className="w-4 h-4">➕</span>
                <span>Nuevo registro</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de datos */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-lg text-gray-600 font-medium">No hay registros en esta tabla</p>
                <p className="text-gray-500 mt-1">Crea el primer registro para comenzar</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                  <tr>
                    {schema.columns.map((column) => (
                      <th
                        key={column.column_name}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <span>{column.column_name}</span>
                          <div className="flex space-x-1">
                            {column.is_primary_key && (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                                🔑
                              </span>
                            )}
                            {column.is_foreign_key && (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 text-purple-600 rounded-full text-xs">
                                🔗
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-normal text-gray-500 mt-1 normal-case">
                          <span className="px-2 py-1 bg-gray-200 rounded-md mr-2">{column.data_type}</span>
                          {column.is_nullable === 'NO' && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-xs">Requerido</span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {records.map((record, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100"
                    >
                      {schema.columns.map((column) => (
                        <td
                          key={column.column_name}
                          className="px-6 py-4 text-sm"
                        >
                          <div className="max-w-xs overflow-hidden">
                            {renderCellValue(record[column.column_name], column, record)}
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openEditModal(record)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                            title="Editar registro"
                          >
                            <span className="w-4 h-4 block">✏️</span>
                          </button>
                          <button 
                            onClick={() => openDeleteModal(record)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                            title="Eliminar registro"
                          >
                            <span className="w-4 h-4 block">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="bg-gradient-to-r from-white to-gray-50 border-t border-gray-200/60 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                <span className="font-medium">Página {pagination.page}</span> de {pagination.totalPages} • 
                <span className="font-medium ml-1">{pagination.total}</span> registros totales
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => loadPage(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center space-x-2"
                >
                  <span>←</span>
                  <span>Anterior</span>
                </button>
                <button
                  onClick={() => loadPage(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center space-x-2"
                >
                  <span>Siguiente</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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

      {/* Modales */}
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
                        {column.is_foreign_key && <span className="text-purple-500">🔗</span>}
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