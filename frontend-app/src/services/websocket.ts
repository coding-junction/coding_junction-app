import { ROOT_URL } from './api';

const WS_URL = ROOT_URL.replace(/^http/, 'ws') + '/ws';

let ws: WebSocket | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();
let reconnectInterval = 3000;
let isConnecting = false;

export const connectWebSocket = () => {
  if (ws || isConnecting) return;
  isConnecting = true;

  console.log('[WS] Connecting to', WS_URL);
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[WS] Connected successfully');
    isConnecting = false;
    reconnectInterval = 3000;
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WS] Message received:', data);
      const type = data.type;
      if (type && listeners.has(type)) {
        listeners.get(type)?.forEach((callback) => callback(data));
      }
    } catch (e) {
      console.log('[WS] Non-JSON message received:', event.data);
    }
  };

  ws.onerror = (error) => {
    console.log('[WS] Error:', error);
  };

  ws.onclose = () => {
    console.log('[WS] Connection closed, reconnecting in', reconnectInterval, 'ms');
    ws = null;
    isConnecting = false;
    setTimeout(() => {
      connectWebSocket();
    }, reconnectInterval);
    reconnectInterval = Math.min(reconnectInterval * 2, 30000);
  };
};

export const disconnectWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

export const addWSListener = (type: string, callback: (data: any) => void) => {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)?.add(callback);
};

export const removeWSListener = (type: string, callback: (data: any) => void) => {
  if (listeners.has(type)) {
    listeners.get(type)?.delete(callback);
    if (listeners.get(type)?.size === 0) {
      listeners.delete(type);
    }
  }
};
