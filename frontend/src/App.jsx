// src/App.jsx
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationSystem';
import Loading from './components/Loading';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    checkBackendConnection();
  }, [retryCount]);

  const checkBackendConnection = async () => {
    try {
      setBackendStatus('checking');
      
      // Agregar timeout más corto para mejor UX
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:3001/health', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus('error');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (backendStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto">
              <span className="text-3xl">💾</span>
            </div>
            <div className="absolute -bottom-2 -right-2">
              <Loading size="md" text="" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Conectando con Dynamic DB Admin
          </h2>
          
          <p className="text-gray-600 mb-4">
            Verificando conexión con el servidor backend...
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Endpoint:</span> http://localhost:3001
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                Intento {retryCount + 1}...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (backendStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔌</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Backend no disponible
          </h2>
          
          <p className="text-gray-600 mb-8 text-lg">
            No se pudo conectar con el servidor backend
          </p>
          
          <div className="glass-effect rounded-xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-yellow-600 text-sm">⚡</span>
              </span>
              Pasos para solucionarlo:
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <div>
                  <span className="font-medium">Verificar el servidor backend</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Asegúrate de que el servidor esté ejecutándose en el puerto 3001
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <div>
                  <span className="font-medium">Ejecutar el backend</span>
                  <div className="mt-2 p-2 bg-gray-900 rounded-md">
                    <code className="text-green-400 text-sm">cd backend && npm run dev</code>
                  </div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <div>
                  <span className="font-medium">Verificar las dependencias</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Ejecuta <code className="bg-gray-200 px-1 rounded">npm install</code> en la carpeta backend
                  </p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRetry}
              className="btn-primary flex items-center justify-center space-x-2 transform hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reintentar conexión</span>
            </button>
            
            <button
              onClick={() => window.open('http://localhost:3001/health', '_blank')}
              className="btn-secondary flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Probar endpoint</span>
            </button>
          </div>
          
          {retryCount > 2 && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">💡 Sugerencia:</span> Si el problema persiste, 
                verifica que no haya otro proceso usando el puerto 3001 o revisa los logs del servidor.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Dashboard />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;