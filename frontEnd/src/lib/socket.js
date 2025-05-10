import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  autoConnect: false,
  withCredentials: true
});

export default socket; 