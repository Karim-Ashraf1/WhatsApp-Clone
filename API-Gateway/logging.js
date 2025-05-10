const morgan = require("morgan");
const { createLogger } = require("../backend/shared-services/logger");

const logger = createLogger('api-gateway');

const setupLogging = (app) => {
    // HTTP request logging
    app.use(morgan('combined', {
        stream: {
            write: (message) => {
                logger.info(message.trim());
            }
        }
    }));

    // Error logging middleware
    app.use((err, req, res, next) => {
        logger.error('Unhandled error:', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
        next(err);
    });
}

exports.setupLogging = setupLogging;
exports.logger = logger;