export const formatDuration = (ms) => {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
};

export const formatTimestamp = (timestamp) => {
  if (timestamp === 0) return 'Never';
  return new Date(timestamp).toLocaleTimeString();
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'RUNNING': return 'bg-success';
    case 'PAUSED': return 'bg-warning';
    case 'IDLE': case 'STOPPING': return 'bg-danger';
    default: return 'bg-secondary';
  }
};

export const getSuccessRateColor = (rate) => {
  if (rate >= 95) return 'text-success';
  if (rate >= 80) return 'text-warning';
  return 'text-danger';
};

export const validateSpeedInput = (value) => {
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return false;
  return numValue >= 10 && numValue <= 1000;
};

export const clampSpeed = (value, min = 10, max = 1000) => {
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return min;
  return Math.max(min, Math.min(max, numValue));
};

export const validateTimeoutValue = (value) => {
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return false;
  return numValue >= 5 && numValue <= 300;
};

export const clampTimeout = (value, min = 5, max = 300) => {
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return min;
  return Math.max(min, Math.min(max, numValue));
};

export const isValidFileType = (file) => {
  return file && file.type === 'text/plain';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

export const parseCommandText = (text) => {
  if (!text || text.trim().length === 0) return null;
  
  const hasFunction = text.includes('FUNC(') || text.includes('CALL(');
  const hasLegacy = text.includes('NEXT') || text.includes(',');
  
  return {
    hasFunction,
    hasLegacy,
    isScript: hasFunction && text.includes('{') && text.includes('}'),
    isLegacy: hasLegacy && !hasFunction,
    isMixed: hasFunction && hasLegacy,
    lineCount: text.split('\n').length,
    charCount: text.length
  };
};

export const getThemeFromStorage = () => {
  return localStorage.getItem('theme') === 'dark';
};

export const setThemeToStorage = (isDark) => {
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

export const applyTheme = (isDark) => {
  document.body.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
};

export const createStatusMessage = (type, message) => ({
  type,
  message,
  timestamp: Date.now()
});

export const clearStatusMessage = (setStatus, delay = 3000) => {
  setTimeout(() => setStatus(null), delay);
};