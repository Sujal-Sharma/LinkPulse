const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')

const { combine, timestamp, colorize, printf, json, errors } = winston.format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `${ts} [${level}] ${message}${metaStr}`
  })
)

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
)

const transports = []

// Console transport
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    silent: process.env.NODE_ENV === 'test',
  })
)

// Daily rotate file (all logs)
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: prodFormat,
    })
  )

  // Error-only file
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: prodFormat,
    })
  )
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exitOnError: false,
})

module.exports = logger
