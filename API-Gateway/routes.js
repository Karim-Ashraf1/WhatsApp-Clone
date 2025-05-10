const ROUTES = [
    {
        url: '/api/auth',
        auth: false,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 20
        },
        proxy: {
            target: process.env.USER_SERVICE_URL || "http://user-service:5001",
            changeOrigin: true,
            pathRewrite: {
                [`^/api/auth`]: '/api/auth',
            },
        }
    },
    {
        url: '/api/users',
        auth: true,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 50
        },
        proxy: {
            target: process.env.USER_SERVICE_URL || "http://user-service:5001",
            changeOrigin: true,
            pathRewrite: {
                [`^/api/users`]: '/api/users',
            },
        }
    },
    {
        url: '/api/messages',
        auth: true,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 100
        },
        proxy: {
            target: process.env.MESSAGE_SERVICE_URL || "http://message-service:5002",
            changeOrigin: true,
            pathRewrite: {
                [`^/api/messages`]: '/api/messages',
            },
        }
    },
    {
        url: '/api/audio',
        auth: true,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 50
        },
        proxy: {
            target: "http://audio-service:5003",
            changeOrigin: true,
            pathRewrite: {
                [`^/api/audio/upload`]: '/upload',
                [`^/api/audio/messages`]: '/messages',
                [`^/api/audio/(.*)`]: '/$1'
            },
        }
    },
    {
        url: '/video-compression',
        auth: false,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 5
        },
        proxy: {
            target: "http://video-compression-service:8080",
            changeOrigin: true,
            pathRewrite: {
                [`^/video-compression`]: '',
            },
        }
    },
    {
        url: '/image-compression',
        auth: true,
        rateLimit: {
            windowMs: 60 * 1000,
            max: 10
        },
        proxy: {
            target: "http://image-compression-service:8081",
            changeOrigin: true,
            pathRewrite: {
                [`^/image-compression`]: '',
            },
        }
    }
]

// Log the routes configuration
console.log('Route configurations:');
ROUTES.forEach(route => {
    console.log(`${route.url} -> ${route.proxy.target}`);
});

exports.ROUTES = ROUTES;