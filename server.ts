/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';
import { decodeOSCMessage, encodeOSCMessage } from './src/utils/osc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// State for VMC Bridge
let udpPort = 39539;
let targetHost = '127.0.0.1';
let targetPort = 39540;
let udpListening = false;
let udpRxCount = 0;
let udpTxCount = 0;
let udpLastError: string | null = null;

// Create WebSocket Server for browser client streaming
const wss = new WebSocketServer({ server, path: '/ws/vmc' });

// Setup UDP Socket for standard VMC OSC
let udpSocket: dgram.Socket | null = null;

function setupUdp(port: number) {
  if (udpSocket) {
    try {
      udpSocket.close();
    } catch {
      // ignore
    }
  }

  try {
    udpSocket = dgram.createSocket('udp4');

    udpSocket.on('error', (err) => {
      console.warn(`[VMC UDP] Error: ${err.message}`);
      udpLastError = err.message;
      udpListening = false;
    });

    udpSocket.on('message', (msg, rinfo) => {
      udpRxCount++;
      try {
        const osc = decodeOSCMessage(new Uint8Array(msg));
        const payload = JSON.stringify({
          type: 'osc_packet',
          source: `${rinfo.address}:${rinfo.port}`,
          packet: osc,
          timestamp: Date.now(),
        });

        // Broadcast to all active WebSocket clients
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      } catch (e: any) {
        // Not a standard OSC message or corrupted
      }
    });

    udpSocket.on('listening', () => {
      const address = udpSocket?.address();
      udpListening = true;
      udpLastError = null;
      console.log(`[VMC UDP] Listening on ${address?.address}:${address?.port}`);
    });

    udpSocket.bind(port);
  } catch (err: any) {
    console.warn(`[VMC UDP] Could not bind UDP port ${port}: ${err.message}`);
    udpLastError = err.message;
    udpListening = false;
  }
}

// Initialize UDP
setupUdp(udpPort);

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('[VMC WS] Client connected. Total active:', wss.clients.size);

  // Send initial handshake / status
  ws.send(
    JSON.stringify({
      type: 'status',
      udpListening,
      udpPort,
      targetHost,
      targetPort,
      udpLastError,
      udpRxCount,
      udpTxCount,
      clientCount: wss.clients.size,
    })
  );

  ws.on('message', (data: any) => {
    try {
      const msg = JSON.parse(data.toString());

      // If client is broadcasting outbound VMC OSC packet to UDP
      if (msg.type === 'send_osc' && msg.packet && udpSocket) {
        try {
          const rawBuffer = encodeOSCMessage(msg.packet);
          const destHost = msg.targetHost || targetHost;
          const destPort = msg.targetPort || targetPort;

          udpSocket.send(rawBuffer, destPort, destHost, (err) => {
            if (!err) udpTxCount++;
          });
        } catch (e) {
          // encode error
        }
      } else if (msg.type === 'relay_osc') {
        // Relay OSC packet to other WS clients
        const payload = JSON.stringify({
          type: 'osc_packet',
          source: 'ws_peer',
          packet: msg.packet,
          timestamp: Date.now(),
        });
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }
    } catch {
      // ignore invalid json
    }
  });

  ws.on('close', () => {
    console.log('[VMC WS] Client disconnected');
  });
});

// REST API Endpoints
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    udpListening,
    udpPort,
    targetHost,
    targetPort,
    udpRxCount,
    udpTxCount,
    udpLastError,
    connectedClients: wss.clients.size,
    uptimeSec: process.uptime(),
  });
});

app.post('/api/vmc/config', (req: Request, res: Response) => {
  const { newUdpPort, newTargetHost, newTargetPort } = req.body;
  if (newUdpPort && typeof newUdpPort === 'number') {
    udpPort = newUdpPort;
    setupUdp(udpPort);
  }
  if (newTargetHost) targetHost = newTargetHost;
  if (newTargetPort && typeof newTargetPort === 'number') targetPort = newTargetPort;

  res.json({
    success: true,
    udpPort,
    targetHost,
    targetPort,
    udpListening,
  });
});

app.post('/api/vmc/send', (req: Request, res: Response) => {
  const { packet, host, port } = req.body;
  if (!packet || !packet.address || !udpSocket) {
    return res.status(400).json({ error: 'Missing packet or UDP socket inactive' });
  }

  try {
    const rawBuffer = encodeOSCMessage(packet);
    const destHost = host || targetHost;
    const destPort = port || targetPort;

    udpSocket.send(rawBuffer, destPort, destHost, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      udpTxCount++;
      res.json({ success: true, dest: `${destHost}:${destPort}` });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[VMC Studio] Server listening on http://localhost:${PORT}`);
  });
}

startServer();
