const winston = require('winston');


let logger = winston.createLogger({
  level: 'info',                          // How detailed our logs should be
  format: winston.format.json(),          // Log format
  defaultMeta: { service: 'kafka-notification-service' },  // Tag all logs with our service name
  transports: [
    // Output logs to the console
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


function initLogger() {
  const environment = process.env.NODE_ENV || 'development';

  if (environment === 'production') {
    logger.level = 'warn';         // Only warnings and errors
  } else if (environment === 'test') {
    logger.level = 'error';        // Only errors
  } else {
    logger.level = 'debug';        // All logs including debug info
  }
  
  logger.info(`Logger initialized in ${environment} environment`);
}

module.exports = {
  logger,
  initLogger
}; 