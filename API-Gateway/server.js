const express = require('express');

const { ROUTES } = require("./routes");
const { setupLogging } = require("./logging");
const { setupRateLimit } = require("./ratelimit");
const { setupProxies } = require("./proxy");
const { setupAuth } = require("./auth");

const app = express();
const port = process.env.PORT || 5000;

setupLogging(app);
setupRateLimit(app, ROUTES);
setupAuth(app, ROUTES);
setupProxies(app, ROUTES);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'API Gateway',
  });
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('\nService URLs:');
  ROUTES.forEach(route => {
    if (route.proxy) {
      console.log(`${route.url} -> ${route.proxy.target}`);
    }
  });
  console.log('\nFrontend URL:', process.env.FRONTEND_URL);
});