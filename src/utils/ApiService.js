export const ApiService = {
  async sendCommand(cmd) {
    const response = await fetch('/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `cmd=${cmd}`,
    });
    return response.text();
  },

  async getStatus() {
    const response = await fetch('/status');
    return response.json();
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
    return response.text();
  },

  async saveCommands(text) {
    const response = await fetch('/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `text=${encodeURIComponent(text)}`,
    });
    return response.text();
  },

  async getCommands() {
    const response = await fetch('/get_commands');
    if (!response.ok) {
      throw new Error('Failed to fetch commands');
    }
    return response.text();
  },

  async downloadCommands() {
    window.location.href = '/download_commands';
  },

  async getTimeoutConfig() {
    const response = await fetch('/timeout_config');
    return response.json();
  },

  async saveTimeoutConfig(config) {
    const formData = new URLSearchParams();
    formData.append('maxWaitTime', config.maxWaitTime);
    formData.append('strategy', config.strategy);
    formData.append('maxTimeoutWarning', config.maxTimeoutWarning);
    formData.append('autoRetryCount', config.autoRetryCount);
    formData.append('saveToFile', config.saveToFile);

    const response = await fetch('/timeout_config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    return response.text();
  },

  async getTimeoutStats() {
    const response = await fetch('/timeout_stats');
    return response.json();
  },

  async clearTimeoutStats() {
    const response = await fetch('/clear_timeout_stats', {
      method: 'POST',
    });
    return response.text();
  },

  async getWifiInfo() {
    const response = await fetch('/wifi_info');
    return response.json();
  }
};