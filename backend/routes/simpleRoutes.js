// routes/simpleRoutes.js
const express = require('express');
const router = express.Router();

// Ruta de prueba simple
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Rutas funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;