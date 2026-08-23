import express from 'express';
import cors from 'cors';
import { ServerSyncEngine } from '@sync-engine/server';
import { SyncPushRequest } from '@sync-engine/core';
import { MemoryAdapter } from './memory-adapter';

const app = express();
app.use(cors());
app.use(express.json());

const adapter = new MemoryAdapter();
const engine = new ServerSyncEngine(adapter, 'SERVER_01');

app.post('/push', async (req, res) => {
  try {
    const pushReq = req.body as SyncPushRequest;
    await engine.handlePush(pushReq);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Push error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/pull', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    const lastHlc = (req.query.lastHlc as string) || null;
    const response = await engine.handlePull(clientId, lastHlc);
    res.json(response);
  } catch (err: any) {
    console.error('Pull error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  await engine.init();
  app.listen(PORT, () => {
    console.log(`Sync Server listening on port ${PORT}`);
  });
}

start();
