// src/components/Modal.jsx - Actualizado para soportar formularios 2x2
import { useEffect } from 'react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', 
  layout = 'default',
  showFooter = false, // Cambiado a false por defecto para formularios
  footerActions = null
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',  // Más ancho para formularios 2x2
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-7xl'
  };

  // Si es layout 2x2, usar tamaño más grande por defecto
  const modalSize = layout === '2x2' ? '2xl' : size;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop mejorado */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeClasses[modalSize]} transform transition-all duration-300 scale-100 max-h-[90vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header mejorado */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl flex-shrink-0">
            <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📋</span>
              </span>
              <span>{title}</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content con scroll optimizado para formularios */}
          <div className={`${layout === '2x2' ? 'p-6' : 'p-6'} overflow-y-auto flex-1`}>
            {layout === '2x2' ? (
              // Layout 2x2 para analytics
              <div className="grid grid-cols-2 gap-6 min-h-[500px]">
                {Array.isArray(children) ? (
                  children.slice(0, 4).map((child, index) => (
                    <div 
                      key={index}
                      className={`
                        rounded-xl p-6 border-2 transition-all duration-200 hover:shadow-lg
                        ${index === 0 ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300' : ''}
                        ${index === 1 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:border-green-300' : ''}
                        ${index === 2 ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300' : ''}
                        ${index === 3 ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:border-orange-300' : ''}
                      `}
                    >
                      {child}
                    </div>
                  ))
                ) : (
                  // Si children no es array, crear cuadrantes de ejemplo
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-lg">
                      {children}
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:border-green-300 transition-all duration-200 hover:shadow-lg">
                      <div className="text-center text-gray-600">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-xl">📊</span>
                        </div>
                        <h4 className="font-semibold mb-2">Cuadrante 2</h4>
                        <p className="text-sm">Contenido personalizable</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-lg">
                      <div className="text-center text-gray-600">
                        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-xl">⚙️</span>
                        </div>
                        <h4 className="font-semibold mb-2">Cuadrante 3</h4>
                        <p className="text-sm">Opciones adicionales</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 hover:shadow-lg">
                      <div className="text-center text-gray-600">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-xl">🚀</span>
                        </div>
                        <h4 className="font-semibold mb-2">Cuadrante 4</h4>
                        <p className="text-sm">Acciones rápidas</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Layout normal para formularios
              children
            )}
          </div>

          {/* Footer condicional */}
          {showFooter && (
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
              {footerActions || (
                <>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg font-medium"
                  >
                    <span>✓</span>
                    <span>Aceptar</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;