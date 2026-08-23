import { SQLiteDatabase } from 'expo-sqlite';
export declare class SyncEngine {
    private db;
    private nodeId;
    private syncUrl;
    private localHlc;
    constructor(db: SQLiteDatabase, nodeId: string, syncUrl: string);
    init(): Promise<void>;
    private saveLocalHlc;
    private tickHlc;
    /**
     * Pushes local changes to the remote server.
     */
    push(): Promise<void>;
    /**
     * Pulls remote changes and applies them locally.
     */
    pull(): Promise<void>;
    /**
     * Syncs both ways (Push then Pull).
     */
    sync(): Promise<void>;
}
