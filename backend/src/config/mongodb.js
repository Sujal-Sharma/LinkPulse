const mongoose = require('mongoose')
const config = require('./index')
const logger = require('../utils/logger')

async function connectMongoDB() {
  try {
    mongoose.set('strictQuery', false)

    await mongoose.connect(config.mongodb.uri, {
      ...config.mongodb.options,
      serverSelectionTimeoutMS: 15000,
      family: 4,
      directConnection: false,
    })

    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message })
    })

  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message })
    process.exit(1)
  }
}

async function closeMongoDB() {
  await mongoose.connection.close()
  logger.info('MongoDB connection closed')
}

module.exports = { connectMongoDB, closeMongoDB }
