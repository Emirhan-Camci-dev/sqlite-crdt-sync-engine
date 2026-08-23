import { SQLiteDatabase } from 'expo-sqlite';

export const SYNC_OPERATIONS_TABLE = '_sync_operations';
export const SYNC_STATE_TABLE = '_sync_state';

/**
 * Initializes the required tracking tables in the SQLite database.
 */
export async function initializeSyncTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${SYNC_OPERATIONS_TABLE} (
      internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL,
      tableName TEXT NOT NULL,
      operation TEXT NOT NULL,
      hlc TEXT NOT NULL,
      data TEXT
    );
    
    CREATE TABLE IF NOT EXISTS ${SYNC_STATE_TABLE} (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

/**
 * Adds synchronization triggers to a specific table.
 * Assuming the table has an 'id' primary key of type TEXT or INTEGER.
 * @param db The Expo SQLite Database instance.
 * @param tableName Name of the table to track.
 * @param columns List of column names in the table to serialize into JSON.
 */
export async function trackTable(db: SQLiteDatabase, tableName: string, columns: string[]) {
  const jsonObjStr = columns.map(c => `'${c}', new.${c}`).join(', ');
  
  // Note: HLC logic needs to be injected by the app or we use a placeholder that gets updated on query,
  // but standard SQLite triggers don't easily generate HLCs. 
  // Often, we just use a local timestamp/counter or handle it via application-level hooks.
  // For a purely SQLite trigger approach, we will use a temporary placeholder and rewrite it in the application layer,
  // or we write a custom SQLite function (not available in standard expo-sqlite),
  // OR we just use a basic timestamp in SQLite and upgrade it to HLC before sending.
  
  // To keep it simple, we use a basic date string as a temporary HLC placeholder.
  
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_${tableName}_insert
    AFTER INSERT ON ${tableName}
    BEGIN
      INSERT INTO ${SYNC_OPERATIONS_TABLE} (id, tableName, operation, hlc, data)
      VALUES (new.id, '${tableName}', 'INSERT', 'LOCAL_PENDING_' || strftime('%Y-%m-%dT%H:%M:%S.%fZ', 'now'), json_object(${jsonObjStr}));
    END;
    
    CREATE TRIGGER IF NOT EXISTS trg_${tableName}_update
    AFTER UPDATE ON ${tableName}
    BEGIN
      INSERT INTO ${SYNC_OPERATIONS_TABLE} (id, tableName, operation, hlc, data)
      VALUES (new.id, '${tableName}', 'UPDATE', 'LOCAL_PENDING_' || strftime('%Y-%m-%dT%H:%M:%S.%fZ', 'now'), json_object(${jsonObjStr}));
    END;
    
    CREATE TRIGGER IF NOT EXISTS trg_${tableName}_delete
    AFTER DELETE ON ${tableName}
    BEGIN
      INSERT INTO ${SYNC_OPERATIONS_TABLE} (id, tableName, operation, hlc, data)
      VALUES (old.id, '${tableName}', 'DELETE', 'LOCAL_PENDING_' || strftime('%Y-%m-%dT%H:%M:%S.%fZ', 'now'), NULL);
    END;
  `);
}
