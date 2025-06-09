import path from 'path'

export const config = {
  esp32: {
    host: process.env.ESP32_HOST || '192.168.59.68',
    port: process.env.ESP32_PORT || '80',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  storage: {
    base: path.join(process.cwd(), 'storage'),
    scripts: path.join(process.cwd(), 'storage', 'scripts'),
    logs: path.join(process.cwd(), 'storage', 'logs'),
    config: path.join(process.cwd(), 'storage', 'config'),
  },
  
  system: {
    maxLogEntries: 1000,
    logRotationSizeMB: 10,
    defaultTimeout: 30000,
    maxCommandQueueSize: 100,
  },
  
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
  }
}

export const ESP32_ENDPOINTS = {
  execute: `http://${config.esp32.host}:${config.esp32.port}/execute`,
  status: `http://${config.esp32.host}:${config.esp32.port}/status`,
  heartbeat: `http://${config.esp32.host}:${config.esp32.port}/ping`,
}