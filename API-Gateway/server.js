require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const httpProxy = require('http-proxy');
const http = require('http');

const {ROUTES} = require("./routes");

const {setupLogging} = require("./logging");
const {setupRateLimit} = require("./ratelimit");
const {setupProxies} = require("./proxy");
const {setupAuth} = require("./auth");

// Print environment variables for debugging (without sensitive info)
console.log('Environment:');
console.log('PORT:', process.env.PORT || 5000);
console.log('USER_SERVICE_URL:', process.env.USER_SERVICE_URL || 'http://localhost:5001');
console.log('MESSAGE_SERVICE_URL:', process.env.MESSAGE_SERVICE_URL || 'http://localhost:5002');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:5173');
console.log('JWT_SECRET present:', process.env.JWT_SECRET ? 'Yes' : 'No');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Create WebSocket proxy with more detailed configuration
const wsProxy = httpProxy.createProxyServer({
  target: process.env.MESSAGE_SERVICE_URL || 'http://message-service:5002',
  ws: true,
  changeOrigin: true,
  xfwd: true,
  secure: false, // For development
  prependPath: false
});

// Add detailed error handling for WebSocket proxy
wsProxy.on('error', (err, req, res) => {
  console.error('WebSocket proxy error:', err);
  console.error('WebSocket proxy error details:', {
    url: req?.url,
    headers: req?.headers,
    method: req?.method
  });
  
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('WebSocket proxy error');
  }
});

// Add special handlers for Socket.IO
wsProxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`WS Proxy Request: ${req.method} ${req.url}`);
});

wsProxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`WS Proxy Response: ${proxyRes.statusCode} for ${req.url}`);
});

// Configure middleware
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Gateway error:', err);
  res.status(500).json({ 
    message: 'Internal server error in API Gateway',
    error: err.message 
  });
});

// Setup API Gateway features
setupLogging(app);
setupRateLimit(app, ROUTES);
setupAuth(app, ROUTES);
setupProxies(app, ROUTES);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

// Debug endpoint to check if gateway is running
app.get('/debug', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      routes: ROUTES.map(r => r.url),
      services: {
        user: process.env.USER_SERVICE_URL || 'http://localhost:5001',
        message: process.env.MESSAGE_SERVICE_URL || 'http://localhost:5002'
      }
    });
});

// Handle WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  console.log('WebSocket connection received at API Gateway:', req.url);
  
  // Special handling for socket.io
  if (req.url.startsWith('/socket.io/')) {
    console.log('Proxying Socket.IO connection to message service');
  }
  
  wsProxy.ws(req, socket, head, (err) => {
    if (err) {
      console.error('WebSocket upgrade error:', err);
      socket.end();
    }
  });
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(port, () => {
    console.log(`API Gateway running at http://localhost:${port}`);
});