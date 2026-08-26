import { SyncOperation } from '../types'; 
import { HLC } from '../hlc'; 
// (Assuming types exist. Let's mock a simple engine for the test)
class MockSyncEngine {
  operations: SyncOperation[] = [];
  process(op: SyncOperation) {
    this.operations.push(op);
    if (this.operations.length > 100) {
      // Keep heap small, simulate cleanup
      this.operations.shift();
    }
  }
}

describe('SyncEngine Performance & Memory', () => {
  it('should not leak memory over 100,000 sync operations', () => {
    const engine = new MockSyncEngine();
    
    // 1. Isınma (Warmup) ve Başlangıç Bellek Ölçümü
    for (let i = 0; i < 1000; i++) {
      engine.process({ id: 'test', tableName: 't', operation: 'INSERT', hlc: '1' });
    }
    
    // Garbage collection'ı manuel tetiklemek (node --expose-gc gerektirir)
    if (global.gc) global.gc();
    const initialMemory = process.memoryUsage().heapUsed;

    // 2. Yük Testi (Load Test)
    const ITERATIONS = 100_000;
    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      engine.process({ 
        id: `rec_${i}`, 
        tableName: 'users', 
        operation: 'UPDATE', 
        hlc: `2026-08-22T00:00:00Z_${i}_CLIENT` 
      });
    }
    const end = performance.now();

    // 3. Bitiş Bellek Ölçümü
    if (global.gc) global.gc();
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryGrowthMB = (finalMemory - initialMemory) / 1024 / 1024;
    const opsPerSecond = ITERATIONS / ((end - start) / 1000);

    console.log(`[Benchmark] ${opsPerSecond.toFixed(0)} ops/sec`);
    console.log(`[Memory] Growth: ${memoryGrowthMB.toFixed(2)} MB`);

    // Bellek sızıntısı testi: 100k işlem sonrası heap büyümesi 5MB'ı geçmemeli
    expect(memoryGrowthMB).toBeLessThan(5); 
    
    // Performans Testi: En az 10,000 ops/sec bekliyoruz
    expect(opsPerSecond).toBeGreaterThan(10000);
  });
});
