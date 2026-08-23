"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const server_1 = require("@sync-engine/server");
const memory_adapter_1 = require("./memory-adapter");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const adapter = new memory_adapter_1.MemoryAdapter();
const engine = new server_1.ServerSyncEngine(adapter, 'SERVER_01');
app.post('/push', async (req, res) => {
    try {
        const pushReq = req.body;
        await engine.handlePush(pushReq);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Push error:', err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/pull', async (req, res) => {
    try {
        const clientId = req.query.clientId;
        const lastHlc = req.query.lastHlc || null;
        const response = await engine.handlePull(clientId, lastHlc);
        res.json(response);
    }
    catch (err) {
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
