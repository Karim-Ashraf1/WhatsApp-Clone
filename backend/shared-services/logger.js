const winston = require('winston');
const { format } = winston;
const Transport = require('winston-transport');
const dgram = require('dgram');
const os = require('os');

class GraylogTransport extends Transport {
  constructor(options) {
    super(options);
    this.client = dgram.createSocket('udp4');
    this.host = options.host || 'graylog';
    this.port = options.port || 12201;
    this.serviceName = options.serviceName || 'unknown-service';
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const message = {
      version: '1.1',
      host: os.hostname(),
      short_message: info.message,
      full_message: info.stack || info.message,
      timestamp: Date.now() / 1000,
      level: this.levelToSyslog(info.level),
      _service: this.serviceName,
      ...info
    };

    const buffer = Buffer.from(JSON.stringify(message));
    this.client.send(buffer, 0, buffer.length, this.port, this.host, (err) => {
      if (err) {
        console.error('Error sending log to Graylog:', err);
      }
      callback();
    });
  }

  levelToSyslog(level) {
    const levels = {
      error: 3,
      warn: 4,
      info: 6,
      debug: 7
    };
    return levels[level] || 6;
  }
}

const createLogger = (serviceName) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      }),
      new GraylogTransport({
        serviceName,
        host: process.env.GRAYLOG_HOST || 'graylog',
        port: parseInt(process.env.GRAYLOG_PORT || '12201')
      })
    ]
  });

  return logger;
};

module.exports = { createLogger }; 