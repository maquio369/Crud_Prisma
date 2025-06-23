// src/components/Loading.jsx
const Loading = ({ size = 'md', text = 'Cargando...', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const Spinner = () => (
    <div className="relative">
      <div className={`animate-spin rounded-full border-4 border-gray-200 ${sizeClasses[size]}`}></div>
      <div className={`animate-spin rounded-full border-4 border-blue-600 border-t-transparent absolute top-0 left-0 ${sizeClasses[size]}`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <Spinner />
          {text && (
            <p className="mt-4 text-gray-600 font-medium">{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="text-center">
        <Spinner />
        {text && (
          <p className="mt-2 text-gray-600 text-sm">{text}</p>
        )}
      </div>
    </div>
  );
};

// Componente para skeleton loading
export const Skeleton = ({ className = '', lines = 1, width = 'full' }) => {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };

  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded ${widthClasses[width]} ${
            index > 0 ? 'mt-2' : ''
          }`}
        />
      ))}
    </div>
  );
};

// Componente para tabla skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="table-header">
                <Skeleton width="3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="table-cell">
                  <Skeleton width={colIndex === 0 ? '1/2' : 'full'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente para card skeleton
export const CardSkeleton = () => {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1">
          <Skeleton width="3/4" />
          <Skeleton width="1/2" className="mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton width="full" />
        <Skeleton width="full" />
      </div>
    </div>
  );
};

export default Loading;