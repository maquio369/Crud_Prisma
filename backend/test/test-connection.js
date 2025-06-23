// test/test-connection.js
const { testConnection, executeQuery } = require('../config/database');

async function runConnectionTest() {
  console.log('🔄 Iniciando prueba de conexión a PostgreSQL...\n');
  
  // Probar conexión básica
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log('\n🔄 Probando consulta a tus tablas existentes...');
    
    try {
      // Probar consulta a tabla roles
      const rolesResult = await executeQuery('SELECT COUNT(*) as total FROM roles');
      console.log('✅ Tabla "roles" encontrada, registros:', rolesResult.rows[0].total);
      
      // Probar consulta a tabla usuarios
      const usuariosResult = await executeQuery('SELECT COUNT(*) as total FROM usuarios');
      console.log('✅ Tabla "usuarios" encontrada, registros:', usuariosResult.rows[0].total);
      
      // Mostrar estructura básica
      console.log('\n📋 Verificando estructura de tablas...');
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      const tablesResult = await executeQuery(tablesQuery);
      console.log('Tablas encontradas:', tablesResult.rows.map(row => row.table_name).join(', '));
      
    } catch (error) {
      console.log('⚠️  No se pudieron encontrar las tablas roles/usuarios');
      console.log('Esto puede ser normal si aún no has configurado tu DATABASE_URL');
    }
  }
  
  console.log('\n✅ Prueba de conexión completada');
  process.exit(isConnected ? 0 : 1);
}

runConnectionTest();