import { DatabaseAdapter } from '@sync-engine/server';
import { SyncOperation } from '@sync-engine/core';

export class MemoryAdapter implements DatabaseAdapter {
  private latestHlc: string | null = null;
  private operations: SyncOperation[] = [];
  
  // tableName -> recordId -> data (JSON)
  private tables: Record<string, Record<string, any>> = {};
  
  // tableName -> recordId -> hlc string
  private recordHlcs: Record<string, Record<string, string>> = {};

  async getLatestHlc(): Promise<string | null> {
    return this.latestHlc;
  }

  async saveLatestHlc(hlc: string): Promise<void> {
    this.latestHlc = hlc;
  }

  async getOperationsSince(hlc: string | null): Promise<SyncOperation[]> {
    if (!hlc) return this.operations;
    // Basic string comparison works for HLCs
    return this.operations.filter(op => op.hlc > hlc);
  }

  async saveOperation(op: SyncOperation): Promise<void> {
    this.operations.push(op);
    this.operations.sort((a, b) => a.hlc > b.hlc ? 1 : -1);
  }

  async applyInsertOrUpdate(tableName: string, id: string, data: any): Promise<void> {
    if (!this.tables[tableName]) {
      this.tables[tableName] = {};
    }
    // UPSERT
    this.tables[tableName][id] = { ...(this.tables[tableName][id] || {}), ...data };
  }

  async applyDelete(tableName: string, id: string): Promise<void> {
    if (this.tables[tableName]) {
      delete this.tables[tableName][id];
    }
  }

  async getRecordHlc(tableName: string, id: string): Promise<string | null> {
    if (this.recordHlcs[tableName] && this.recordHlcs[tableName][id]) {
      return this.recordHlcs[tableName][id];
    }
    return null;
  }

  async saveRecordHlc(tableName: string, id: string, hlc: string): Promise<void> {
    if (!this.recordHlcs[tableName]) {
      this.recordHlcs[tableName] = {};
    }
    this.recordHlcs[tableName][id] = hlc;
  }
}
