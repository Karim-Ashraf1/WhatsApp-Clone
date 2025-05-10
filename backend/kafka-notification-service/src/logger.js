/**
 * Logger Module
 * Provides structured logging for the notification service
 */

const winston = require('winston');

let logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'kafka-notification-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

/**
 * Initialize the logger with environment-specific settings
 */
function initLogger() {
  const environment = process.env.NODE_ENV || 'development';
  
  // Set log level based on environment
  if (environment === 'production') {
    logger.level = 'warn';
  } else if (environment === 'test') {
    logger.level = 'error';
  } else {
    logger.level = 'debug';
  }
  
  logger.info(`Logger initialized in ${environment} environment`);
}

module.exports = {
  logger,
  initLogger
}; 