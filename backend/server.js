// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const dynamicRoutes = require('./routes/dynamicRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares (usando Express built-in, NO body-parser)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Usar Express built-in en lugar de body-parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', dynamicRoutes);

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Rutas básicas
app.get('/', (req, res) => {
  res.json({
    message: 'Dynamic DB Admin API - Sin ORM',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de prueba para API
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
async function startServer() {
  try {
    console.log('🔄 Iniciando servidor...');
    
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      console.log('\n✅ Servidor iniciado exitosamente!');
      console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log('\n🎯 ¡Listo para recibir peticiones!');
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

// Manejo de señales de cierre
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

startServer();