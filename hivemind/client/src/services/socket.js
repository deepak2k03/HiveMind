import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const SOCKET_KEY = '__hivemind_socket__';

const buildSocket = () =>
  io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket'],
    auth: {},
  });

const globalScope = globalThis;
if (!globalScope[SOCKET_KEY]) {
  globalScope[SOCKET_KEY] = buildSocket();
}

export const socket = globalScope[SOCKET_KEY];

export const setSocketToken = (token) => {
  socket.auth = token ? { token } : {};

  // Refresh connection so the new handshake auth is applied.
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
};

socket.on('connect', () => {
  console.log('🟢 Connected to HiveMind Coordinator:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔴 Disconnected from Coordinator:', reason);
});