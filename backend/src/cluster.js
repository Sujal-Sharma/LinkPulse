/**
 * Cluster mode — spawns one worker per CPU core for maximum throughput.
 *
 * NOTE: On Render/Railway free tier, disable cluster to avoid memory limits.
 * Use: node src/index.js (not this file)
 * Cluster is for dedicated servers / local performance testing.
 *
 * With cluster: 4-core machine → 4x throughput
 * Trade-off: shared state (counters, sessions) must go through Redis — by design.
 */

require('dotenv').config()

const cluster = require('cluster')
const os = require('os')
const logger = require('./utils/logger')

if (cluster.isMaster || cluster.isPrimary) {
  const numCPUs = os.cpus().length
  logger.info(`Master ${process.pid} forking ${numCPUs} workers`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...`)
    cluster.fork()
  })

  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`)
  })

} else {
  // Worker process — run the full Express app
  require('./index')
  logger.info(`Worker ${process.pid} started`)
}
