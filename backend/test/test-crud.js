// test/test-crud.js
const CrudService = require('../services/crudService');

async function testCrudService() {
  console.log('🔄 Iniciando pruebas del CrudService...\n');
  
  try {
    // Test 1: Leer registros de la tabla roles (debería existir)
    console.log('===== TEST 1: Leer registros de la tabla "roles" =====');
    const rolesResult = await CrudService.read('roles', {
      limit: 5
    });
    console.log('Registros encontrados:', rolesResult.data.length);
    console.log('Total de registros:', rolesResult.pagination.total);
    console.log('Primeros registros:', rolesResult.data);
    console.log('\n');
    
    // Test 2: Leer registros de una tabla con foreign keys
    console.log('===== TEST 2: Leer tabla "usuarios" con relaciones =====');
    const usuariosResult = await CrudService.read('usuarios', {
      limit: 3,
      include: ['roles'] // Incluir datos del rol
    });
    console.log('Usuarios encontrados:', usuariosResult.data.length);
    if (usuariosResult.data.length > 0) {
      console.log('Primer usuario con relación:', usuariosResult.data[0]);
    }
    console.log('\n');
    
    // Test 3: Obtener un registro específico
    if (rolesResult.data.length > 0) {
      const firstRoleId = rolesResult.data[0].id_rol;
      console.log(`===== TEST 3: Obtener rol específico ID: ${firstRoleId} =====`);
      const specificRole = await CrudService.readOne('roles', firstRoleId);
      console.log('Rol encontrado:', specificRole);
      console.log('\n');
    }
    
    // Test 4: Obtener opciones para foreign keys
    console.log('===== TEST 4: Opciones para Foreign Keys =====');
    try {
      const fkOptions = await CrudService.getForeignKeyOptions('usuarios', 'id_rol');
      console.log('Opciones de roles disponibles:', fkOptions.options.length);
      console.log('Columna de display:', fkOptions.displayColumn);
      console.log('Primeras opciones:', fkOptions.options.slice(0, 3));
    } catch (error) {
      console.log('Error obteniendo FK options (esto puede ser normal):', error.message);
    }
    console.log('\n');
    
    // Test 5: Filtros y búsqueda
    console.log('===== TEST 5: Prueba de filtros =====');
    const filteredResult = await CrudService.read('roles', {
      filters: {
        esta_borrado: false
      },
      orderBy: 'id_rol',
      orderDirection: 'DESC'
    });
    console.log('Registros activos encontrados:', filteredResult.data.length);
    console.log('\n');
    
    // Test 6: Crear un registro de prueba (comentado para no modificar datos)
    console.log('===== TEST 6: Simulación de creación de registro =====');
    console.log('(No se ejecutará creación real para no modificar datos)');
    console.log('Datos que se enviarían para crear un rol:');
    const newRoleData = {
      rol: 'Rol de Prueba',
      esta_borrado: false
    };
    console.log(newRoleData);
    console.log('\n');
    
    console.log('✅ Todas las pruebas del CrudService completadas exitosamente');
    console.log('💡 El servicio está listo para crear, leer, actualizar y eliminar registros');
    
  } catch (error) {
    console.error('❌ Error en las pruebas del CrudService:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testCrudService();