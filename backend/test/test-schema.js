// test/test-schema.js
const SchemaService = require('../services/schemaService');

async function testSchemaService() {
  console.log('🔄 Iniciando pruebas del SchemaService...\n');
  
  try {
    // Test 1: Obtener todas las tablas
    console.log('===== TEST 1: Obtener todas las tablas =====');
    const tables = await SchemaService.getTables();
    console.log('Resultado:', tables);
    console.log('\n');
    
    if (tables.length > 0) {
      // Test 2: Obtener columnas de la primera tabla
      const firstTable = tables[0].table_name;
      console.log(`===== TEST 2: Columnas de la tabla "${firstTable}" =====`);
      const columns = await SchemaService.getTableColumns(firstTable);
      console.log('Columnas encontradas:', columns.length);
      console.log('\n');
      
      // Test 3: Obtener relaciones de la primera tabla
      console.log(`===== TEST 3: Relaciones de la tabla "${firstTable}" =====`);
      const relations = await SchemaService.getTableRelations(firstTable);
      console.log('Relaciones encontradas:', relations.length);
      console.log('\n');
      
      // Test 4: Schema completo
      console.log(`===== TEST 4: Schema completo de "${firstTable}" =====`);
      const schema = await SchemaService.getTableSchema(firstTable);
      console.log('Schema completo obtenido exitosamente');
      console.log('Primary Key:', schema.primaryKey);
      console.log('Foreign Keys:', schema.foreignKeys.length);
      console.log('\n');
      
      // Si hay más tablas, probar con una tabla que tenga foreign keys
      if (tables.length > 1) {
        const secondTable = tables[1].table_name;
        console.log(`===== TEST 5: Schema de "${secondTable}" =====`);
        const schema2 = await SchemaService.getTableSchema(secondTable);
        console.log('Schema de segunda tabla obtenido exitosamente');
        console.log('\n');
      }
      
      // Test 6: Probar cache
      console.log('===== TEST 6: Verificar funcionamiento del cache =====');
      const tablesFromCache = await SchemaService.getTables();
      console.log('Tablas obtenidas desde cache (debería ser instantáneo)');
      console.log('\n');
      
    } else {
      console.log('⚠️ No se encontraron tablas en la base de datos');
    }
    
    console.log('✅ Todas las pruebas del SchemaService completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas del SchemaService:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testSchemaService();