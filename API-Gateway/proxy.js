const { createProxyMiddleware } = require('http-proxy-middleware');

const setupProxies = (app, routes) => {
    routes.forEach(route => {
        if (route.proxy) {
            console.log(`Setting up proxy for ${route.url} -> ${route.proxy.target}`);
            app.use(route.url, createProxyMiddleware(route.proxy));
        }
    });
};

module.exports = { setupProxies };