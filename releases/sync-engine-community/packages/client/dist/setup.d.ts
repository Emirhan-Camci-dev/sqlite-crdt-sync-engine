import { SQLiteDatabase } from 'expo-sqlite';
export declare const SYNC_OPERATIONS_TABLE = "_sync_operations";
export declare const SYNC_STATE_TABLE = "_sync_state";
/**
 * Initializes the required tracking tables in the SQLite database.
 */
export declare function initializeSyncTables(db: SQLiteDatabase): Promise<void>;
/**
 * Adds synchronization triggers to a specific table.
 * Assuming the table has an 'id' primary key of type TEXT or INTEGER.
 * @param db The Expo SQLite Database instance.
 * @param tableName Name of the table to track.
 * @param columns List of column names in the table to serialize into JSON.
 */
export declare function trackTable(db: SQLiteDatabase, tableName: string, columns: string[]): Promise<void>;
