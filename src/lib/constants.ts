export const APP_CONFIG = {
  name: 'ESP32 Palletizer Control',
  version: '1.0.0',
  description: 'Modern palletizer control interface with advanced robotics management',
  author: 'Palletizer Team',
  repository: 'https://github.com/username/esp32-palletizer-control'
} as const

export const NETWORK_CONFIG = {
  defaultIP: '192.168.4.1',
  fallbackIP: '192.168.1.100',
  ports: {
    http: 80,
    websocket: 81
  },
  timeouts: {
    request: 10000,
    connection: 5000,
    retry: 2000
  },
  retries: {
    maxAttempts: 5,
    backoffMultiplier: 2
  }
} as const

export const AXIS_CONFIG = {
  axes: ['x', 'y', 'z', 't', 'g'] as const,
  colors: {
    x: 'bg-red-500',
    y: 'bg-green-500',
    z: 'bg-blue-500',
    t: 'bg-yellow-500',
    g: 'bg-purple-500'
  },
  names: {
    x: 'X-Axis',
    y: 'Y-Axis', 
    z: 'Z-Axis',
    t: 'T-Axis',
    g: 'G-Axis'
  },
  descriptions: {
    x: 'Horizontal movement',
    y: 'Vertical movement',
    z: 'Depth movement',
    t: 'Rotation/Tool axis',
    g: 'Gripper/Auxiliary'
  }
} as const

export const SPEED_CONFIG = {
  limits: {
    min: 10,
    max: 3000,
    emergency: 1000,
    step: 10
  },
  defaults: {
    x: 2000,
    y: 1500,
    z: 1000,
    t: 800,
    g: 1200,
    emergency: 500
  },
  categories: {
    precision: { min: 50, max: 200 },
    normal: { min: 200, max: 800 },
    fast: { min: 800, max: 1500 },
    maximum: { min: 1500, max: 3000 }
  }
} as const

export const TIMEOUT_CONFIG = {
  defaults: {
    maxWaitTime: 30000,
    strategy: 0,
    maxTimeoutWarning: 5,
    autoRetryCount: 0,
    saveToFile: true
  },
  limits: {
    minWaitTime: 5000,
    maxWaitTime: 300000,
    maxWarning: 20,
    maxRetries: 5
  },
  strategies: [
    { value: 0, label: 'Skip & Continue', icon: '⏭️' },
    { value: 1, label: 'Pause System', icon: '⏸️' },
    { value: 2, label: 'Abort & Reset', icon: '🛑' },
    { value: 3, label: 'Retry with Backoff', icon: '🔄' }
  ]
} as const

export const COMMAND_CONFIG = {
  types: {
    NONE: 0,
    RUN: 1,
    ZERO: 2,
    SETSPEED: 6,
    SET: 7,
    WAIT: 8,
    GROUP: 9
  },
  systemCommands: ['IDLE', 'PLAY', 'PAUSE', 'STOP', 'ZERO'] as const,
  maxParameters: 5,
  delayPrefix: 'd'
} as const

export const DEBUG_CONFIG = {
  levels: ['ERROR', 'WARNING', 'INFO', 'DEBUG'] as const,
  colors: {
    ERROR: 'text-red-500',
    WARNING: 'text-yellow-500',
    INFO: 'text-blue-500',
    DEBUG: 'text-gray-500'
  },
  maxBufferSize: 1000,
  refreshInterval: 1000,
  duplicateThreshold: 100
} as const

export const UI_CONFIG = {
  themes: ['light', 'dark', 'auto'] as const,
  languages: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' }
  ],
  debounceDelays: {
    search: 300,
    input: 500,
    resize: 150
  },
  animation: {
    duration: 200,
    easing: 'ease-in-out'
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  }
} as const

export const FILE_CONFIG = {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['text/plain', 'application/json'],
  extensions: ['.txt', '.json'],
  encoding: 'utf-8'
} as const

export const VALIDATION_CONFIG = {
  script: {
    maxLength: 50000,
    maxLines: 1000,
    maxFunctions: 50
  },
  axis: {
    minPosition: -50000,
    maxPosition: 50000,
    minStep: 1,
    maxStep: 1000
  },
  network: {
    ipPattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    ssidMaxLength: 32,
    passwordMinLength: 8
  }
} as const

export const STORAGE_KEYS = {
  theme: 'palletizer_theme',
  speedLimits: 'palletizer_speed_limits',
  systemPrefs: 'palletizer_system_prefs',
  recentFiles: 'palletizer_recent_files',
  windowState: 'palletizer_window_state',
  debugSettings: 'palletizer_debug_settings'
} as const

export const ERROR_MESSAGES = {
  network: {
    connectionFailed: 'Failed to connect to ESP32 device',
    timeout: 'Request timeout - device may be offline',
    invalidResponse: 'Invalid response from device'
  },
  file: {
    uploadFailed: 'Failed to upload file',
    invalidFormat: 'Invalid file format',
    tooLarge: 'File size exceeds maximum limit'
  },
  command: {
    invalidSyntax: 'Invalid command syntax',
    executionFailed: 'Command execution failed',
    queueFull: 'Command queue is full'
  },
  system: {
    emergencyActive: 'Emergency stop is active',
    axisNotHomed: 'Axis is not homed',
    speedExceeded: 'Speed limit exceeded'
  }
} as const

export const SUCCESS_MESSAGES = {
  file: {
    uploaded: 'File uploaded successfully',
    saved: 'File saved successfully',
    loaded: 'File loaded successfully'
  },
  command: {
    executed: 'Command executed successfully',
    queued: 'Command added to queue'
  },
  system: {
    connected: 'Connected to device',
    homed: 'Axis homed successfully',
    speedSet: 'Speed updated successfully'
  }
} as const

export const SCRIPT_TEMPLATES = {
  basic: `X(100,d1000,200);
Y(50,d500,100);
Z(10,d2000);`,
  
  group: `GROUP(X(100,d1000,200), Y(50,d500,100), Z(10));
GROUP(X(400,d800), Y(150,d600));`,
  
  functions: `FUNC(PICK_SEQUENCE) {
  GROUP(X(100,d500), Y(50,d300));
  Z(10,d1000);
}

FUNC(PLACE_SEQUENCE) {
  Z(80,d500);
  GROUP(X(400,d800), Y(150,d600));
  Z(100,d1000);
}

CALL(PICK_SEQUENCE);
SET(1);
SET(0);
CALL(PLACE_SEQUENCE);`,
  
  automation: `FUNC(HOME_ALL) {
  ZERO;
  SPEED;200;
}

FUNC(PICK_AND_PLACE) {
  GROUP(X(100,d1000,200), Y(50,d500,100));
  Z(5,d1000);
  SET(1);
  Z(80,d500);
  GROUP(X(400,d1000,500), Y(150,d500,200));
  Z(100,d1000);
  SET(0);
}

CALL(HOME_ALL);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);`
} as const

export const NOTIFICATION_CONFIG = {
  duration: {
    success: 3000,
    info: 5000,
    warning: 7000,
    error: 10000
  },
  position: 'top-right' as const,
  maxVisible: 5,
  animationDuration: 300
} as const

export const PERFORMANCE_CONFIG = {
  updateInterval: 1000,
  maxDataPoints: 100,
  warningThresholds: {
    cpuUsage: 80,
    memoryUsage: 90,
    temperature: 70,
    latency: 100
  }
} as const