// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

console.log('Iniciando configuración de base de datos...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para ejecutar queries con manejo de errores
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    console.log('Ejecutando query:', query.substring(0, 100) + '...');
    const result = await client.query(query, params);
    console.log('Query ejecutada exitosamente, filas afectadas:', result.rowCount);
    return result;
  } catch (error) {
    console.error('Error en la query de base de datos:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Función para transacciones
const executeTransaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Iniciando transacción...');
    
    const results = [];
    for (const { query, params } of queries) {
      const result = await client.query(query, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    console.log('Transacción completada exitosamente');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en transacción, haciendo rollback:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Función de prueba de conexión
const testConnection = async () => {
  try {
    const result = await executeQuery('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Conexión a PostgreSQL exitosa');
    console.log('Hora actual:', result.rows[0].current_time);
    console.log('Versión PostgreSQL:', result.rows[0].pg_version.split(' ')[0]);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  executeQuery,
  executeTransaction,
  testConnection
};