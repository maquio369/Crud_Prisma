// services/schemaService.js
const { executeQuery } = require('../config/database');

class SchemaService {
  // Cache para evitar consultas repetitivas
  static cache = {
    tables: null,
    columns: {},
    relations: {},
    lastUpdate: null
  };

  // Obtener todas las tablas
  static async getTables() {
    console.log('🔍 Obteniendo lista de tablas...');
    
    if (this.cache.tables && this.isCacheValid()) {
      console.log('📋 Usando tablas desde cache');
      return this.cache.tables;
    }

    const query = `
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        tableowner as table_owner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const result = await executeQuery(query);
    this.cache.tables = result.rows;
    this.cache.lastUpdate = Date.now();
    
    console.log(`✅ Se encontraron ${result.rows.length} tablas:`, 
      result.rows.map(t => t.table_name).join(', '));
    
    return result.rows;
  }

  // Obtener columnas de una tabla específica
  static async getTableColumns(tableName) {
    console.log(`🔍 Obteniendo columnas de la tabla: ${tableName}`);
    
    if (this.cache.columns[tableName] && this.isCacheValid()) {
      console.log('📋 Usando columnas desde cache');
      return this.cache.columns[tableName];
    }

    const query = `
      SELECT 
        c.column_name,
        cm.column_desc, 
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.ordinal_position,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_primary_key,
		    CASE
          WHEN attidentity='d' OR attidentity='a' THEN true 
          ELSE false 
        END as is_identity,	
        CASE 
          WHEN fk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name,
        fk.foreign_column_desc
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT attidentity,attname
        FROM pg_attribute att 
		    JOIN pg_class cl ON attrelid = cl.oid 
        WHERE cl.relname = $1
        AND attnum>0          
      ) pk_identity ON c.column_name = attname 
      LEFT JOIN (
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          des.description AS foreign_column_desc
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN pg_constraint con ON con.conname=tc.constraint_name
          LEFT JOIN pg_description des ON des.objoid = con.oid
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      ) fk ON c.column_name = fk.column_name
      LEFT JOIN (
        SELECT 
          cm.description as column_desc,cm.objsubid
        FROM pg_description cm
        JOIN pg_class c ON cm.objoid = c.oid
        WHERE c.relname = $1 
      ) cm ON c.ordinal_position = cm.objsubid
      WHERE c.table_name = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position;
    `;

    const result = await executeQuery(query, [tableName]);
    this.cache.columns[tableName] = result.rows;
    
    console.log(`✅ Se encontraron ${result.rows.length} columnas en ${tableName}`);
    console.log('Columnas:', result.rows.map(c => 
      `${c.column_name} (${c.data_type}${c.is_primary_key ? ' PK' : ''}${c.is_foreign_key ? ' FK' : ''})`
    ).join(', '));
    
    return result.rows;
  }

  // Obtener relaciones de una tabla
  static async getTableRelations(tableName) {
    console.log(`🔍 Obteniendo relaciones de la tabla: ${tableName}`);
    
    if (this.cache.relations[tableName] && this.isCacheValid()) {
      console.log('📋 Usando relaciones desde cache');
      return this.cache.relations[tableName];
    }

    const query = `
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        'FOREIGN_KEY' as relation_type
      FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public'
      
      UNION ALL
      
      SELECT 
        tc.constraint_name,
        ccu.column_name,
        kcu.table_name AS foreign_table_name,
        kcu.column_name AS foreign_column_name,
        'REFERENCED_BY' as relation_type
      FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = $1
        AND tc.table_schema = 'public';
    `;

    const result = await executeQuery(query, [tableName]);
    this.cache.relations[tableName] = result.rows;
    
    console.log(`✅ Se encontraron ${result.rows.length} relaciones para ${tableName}`);
    if (result.rows.length > 0) {
      result.rows.forEach(rel => {
        console.log(`- ${rel.relation_type}: ${rel.column_name} -> ${rel.foreign_table_name}.${rel.foreign_column_name}`);
      });
    }
    
    return result.rows;
  }

  // Obtener schema completo de una tabla
  static async getTableSchema(tableName) {
    console.log(`📊 Obteniendo schema completo de: ${tableName}`);
    
    const columns = await this.getTableColumns(tableName);
    const relations = await this.getTableRelations(tableName);
    
    const schema = {
      tableName,
      columns,
      relations,
      primaryKey: columns.find(col => col.is_primary_key)?.column_name,
      foreignKeys: columns.filter(col => col.is_foreign_key)
    };
    
    console.log(`✅ Schema de ${tableName}:`);
    console.log(`- Primary Key: ${schema.primaryKey || 'Ninguna'}`);
    console.log(`- Foreign Keys: ${schema.foreignKeys.length}`);
    console.log(`- Total columnas: ${columns.length}`);
    
    return schema;
  }

  // Validar si el cache sigue válido (5 minutos)
  static isCacheValid() {
    return this.cache.lastUpdate && (Date.now() - this.cache.lastUpdate) < 300000;
  }

  // Limpiar cache
  static clearCache() {
    console.log('🗑️ Limpiando cache del schema');
    this.cache = {
      tables: null,
      columns: {},
      relations: {},
      lastUpdate: null
    };
  }
}

module.exports = SchemaService;