// test-server.js
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware básico
app.use(express.json());

// Ruta simple
app.get('/', (req, res) => {
  res.json({ message: 'Servidor básico funcionando' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor de prueba corriendo en http://localhost:${PORT}`);
});