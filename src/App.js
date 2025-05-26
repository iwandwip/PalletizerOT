import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [systemStatus, setSystemStatus] = useState('IDLE');
  const [speedAll, setSpeedAll] = useState(200);
  const [axes, setAxes] = useState([
    { id: 'x', name: 'X', speed: 200 },
    { id: 'y', name: 'Y', speed: 200 },
    { id: 'z', name: 'Z', speed: 200 },
    { id: 't', name: 'T', speed: 200 },
    { id: 'g', name: 'G', speed: 364 },
  ]);
  const [commandText, setCommandText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [writeStatus, setWriteStatus] = useState(null);
  
  const [timeoutConfig, setTimeoutConfig] = useState({
    maxWaitTime: 30000,
    strategy: 0,
    maxTimeoutWarning: 5,
    autoRetryCount: 0,
    saveToFile: true
  });
  const [timeoutStats, setTimeoutStats] = useState({
    totalTimeouts: 0,
    successfulWaits: 0,
    lastTimeoutTime: 0,
    totalWaitTime: 0,
    currentRetryCount: 0,
    successRate: 100.0
  });
  const [timeoutConfigStatus, setTimeoutConfigStatus] = useState(null);
  
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  const strategyOptions = [
    { value: 0, label: 'Skip & Continue' },
    { value: 1, label: 'Pause System' },
    { value: 2, label: 'Abort & Reset' },
    { value: 3, label: 'Retry with Backoff' }
  ];

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    document.body.setAttribute('data-bs-theme', newMode ? 'dark' : 'light');
  };

  useEffect(() => {
    document.body.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    fetch('/status')
      .then(response => response.json())
      .then(data => {
        setSystemStatus(data.status);
      })
      .catch(error => {
        console.error('Error fetching status:', error);
      });

    loadTimeoutConfig();
    loadTimeoutStats();

    const es = new EventSource('/events');
    eventSourceRef.current = es;

    es.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status') {
          setSystemStatus(data.value);
        } else if (data.type === 'timeout') {
          loadTimeoutStats();
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    es.onerror = function(err) {
      console.error('EventSource error:', err);
      setTimeout(() => {
        es.close();
        const newEventSource = new EventSource('/events');
        eventSourceRef.current = newEventSource;
      }, 5000);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const loadTimeoutConfig = () => {
    fetch('/timeout_config')
      .then(response => response.json())
      .then(data => {
        setTimeoutConfig(data);
      })
      .catch(error => {
        console.error('Error loading timeout config:', error);
      });
  };

  const loadTimeoutStats = () => {
    fetch('/timeout_stats')
      .then(response => response.json())
      .then(data => {
        setTimeoutStats(data);
      })
      .catch(error => {
        console.error('Error loading timeout stats:', error);
      });
  };

  const saveTimeoutConfig = () => {
    const formData = new URLSearchParams();
    formData.append('maxWaitTime', timeoutConfig.maxWaitTime);
    formData.append('strategy', timeoutConfig.strategy);
    formData.append('maxTimeoutWarning', timeoutConfig.maxTimeoutWarning);
    formData.append('autoRetryCount', timeoutConfig.autoRetryCount);
    formData.append('saveToFile', timeoutConfig.saveToFile);

    setTimeoutConfigStatus({
      type: 'info',
      message: 'Saving timeout configuration...',
    });

    fetch('/timeout_config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
      .then(response => response.text())
      .then(data => {
        setTimeoutConfigStatus({
          type: 'success',
          message: 'Timeout configuration saved successfully',
        });
        setTimeout(() => setTimeoutConfigStatus(null), 3000);
      })
      .catch(error => {
        console.error('Error:', error);
        setTimeoutConfigStatus({
          type: 'danger',
          message: `Error saving configuration: ${error}`,
        });
      });
  };

  const clearTimeoutStats = () => {
    fetch('/clear_timeout_stats', {
      method: 'POST',
    })
      .then(response => response.text())
      .then(data => {
        loadTimeoutStats();
        setTimeoutConfigStatus({
          type: 'success',
          message: 'Timeout statistics cleared',
        });
        setTimeout(() => setTimeoutConfigStatus(null), 3000);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  const updateAllSpeedsSlider = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    
    setSpeedAll(value);
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id !== 'g' ? { ...axis, speed: value } : axis
      )
    );
  };

  const updateAllSpeedsInput = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    
    const clampedValue = Math.max(10, Math.min(1000, value));
    
    setSpeedAll(clampedValue);
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id !== 'g' ? { ...axis, speed: clampedValue } : axis
      )
    );
  };

  const updateAxisSpeedSlider = (id, e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id === id ? { ...axis, speed: value } : axis
      )
    );
  };

  const updateAxisSpeedInput = (id, e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    
    const clampedValue = Math.max(10, Math.min(1000, value));
    
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id === id ? { ...axis, speed: clampedValue } : axis
      )
    );
  };

  const setSpeed = (axisId) => {
    const axis = axes.find(a => a.id === axisId);
    if (axis) {
      sendCommand(`SPEED;${axisId};${axis.speed}`);
    }
  };

  const setAllSpeeds = () => {
    sendCommand(`SPEED;${speedAll}`);
  };

  const sendCommand = (cmd) => {
    fetch('/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `cmd=${cmd}`,
    })
      .then(response => response.text())
      .then(data => {
        console.log('Command sent:', data);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setFileName(file ? file.name : '');
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const uploadFile = () => {
    if (!selectedFile) {
      setUploadStatus({
        type: 'danger',
        message: 'Please select a file',
      });
      return;
    }

    setUploadStatus({
      type: 'info',
      message: 'Uploading...',
    });

    const formData = new FormData();
    formData.append('file', selectedFile);

    fetch('/upload', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.text())
      .then(data => {
        console.log('Upload result:', data);
        setUploadStatus({
          type: 'success',
          message: 'File uploaded successfully. Click PLAY to execute.',
        });
      })
      .catch(error => {
        console.error('Error:', error);
        setUploadStatus({
          type: 'danger',
          message: `Error uploading file: ${error}`,
        });
      });
  };

  const saveCommands = () => {
    if (!commandText.trim()) {
      setWriteStatus({
        type: 'danger',
        message: 'Please enter commands',
      });
      return;
    }

    setWriteStatus({
      type: 'info',
      message: 'Saving...',
    });

    fetch('/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `text=${encodeURIComponent(commandText)}`,
    })
      .then(response => response.text())
      .then(data => {
        console.log('Save result:', data);
        setWriteStatus({
          type: 'success',
          message: 'Commands saved successfully. Click PLAY to execute.',
        });
      })
      .catch(error => {
        console.error('Error:', error);
        setWriteStatus({
          type: 'danger',
          message: `Error saving commands: ${error}`,
        });
      });
  };

  const getCommands = () => {
    setWriteStatus({
      type: 'info',
      message: 'Loading commands...',
    });

    fetch('/get_commands')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch commands');
        }
        return response.text();
      })
      .then(data => {
        setCommandText(data);
        setWriteStatus({
          type: 'success',
          message: 'Commands loaded successfully',
        });
      })
      .catch(error => {
        console.error('Error:', error);
        setWriteStatus({
          type: 'danger',
          message: `Error loading commands: ${error}`,
        });
      });
  };

  const downloadCommands = () => {
    window.location.href = '/download_commands';
  };

  const getStatusBadgeClass = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'bg-success';
      case 'PAUSED': return 'bg-warning';
      case 'IDLE': case 'STOPPING': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getSuccessRateColor = () => {
    const rate = timeoutStats.successRate;
    if (rate >= 95) return 'text-success';
    if (rate >= 80) return 'text-warning';
    return 'text-danger';
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  };

  const formatTimestamp = (timestamp) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-between align-items-center mb-4 p-3 bg-primary text-white rounded shadow-sm">
        <div className="d-flex align-items-center">
          <span className="fs-3 me-2">🤖</span>
          <h1 className="h4 mb-0">ESP32 Palletizer Control</h1>
        </div>
        <div className="d-flex align-items-center">
          <div className="form-check form-switch me-3">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="darkModeSwitch" 
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <label className="form-check-label" htmlFor="darkModeSwitch">
              {darkMode ? '🌙' : '☀️'}
            </label>
          </div>
          <div className="d-flex align-items-center px-3 py-1 bg-white bg-opacity-25 rounded-pill">
            <span className="me-2 text-white">Status:</span>
            <span className={`badge ${getStatusBadgeClass()} rounded-pill`}>
              {systemStatus}
            </span>
          </div>
        </div>
      </header>

      <main>
        <div className="card mb-4 shadow-sm">
          <div className="card-header d-flex align-items-center">
            <span className="me-2 fs-5">🎮</span>
            <h2 className="h5 mb-0">Control Panel</h2>
          </div>
          
          <div className="card-body">
            <div className="row mb-4 g-2">
              <div className="col-6 col-md">
                <button 
                  className="btn btn-success w-100 d-flex align-items-center justify-content-center" 
                  onClick={() => sendCommand('PLAY')}
                >
                  <span className="me-1">▶</span> PLAY
                </button>
              </div>
              <div className="col-6 col-md">
                <button 
                  className="btn btn-warning w-100 d-flex align-items-center justify-content-center" 
                  onClick={() => sendCommand('PAUSE')}
                >
                  <span className="me-1">⏸</span> PAUSE
                </button>
              </div>
              <div className="col-6 col-md">
                <button 
                  className="btn btn-danger w-100 d-flex align-items-center justify-content-center" 
                  onClick={() => sendCommand('STOP')}
                >
                  <span className="me-1">⏹</span> STOP
                </button>
              </div>
              <div className="col-6 col-md">
                <button 
                  className="btn btn-info w-100 text-white d-flex align-items-center justify-content-center" 
                  onClick={() => sendCommand('IDLE')}
                >
                  <span className="me-1">⚪</span> IDLE
                </button>
              </div>
              <div className="col-12 col-md">
                <button 
                  className="btn btn-purple w-100 text-white d-flex align-items-center justify-content-center" 
                  onClick={() => sendCommand('ZERO')}
                >
                  <span className="me-1">⌂</span> ZERO
                </button>
              </div>
            </div>

            <div className="speed-controls">
              <div className="mb-3">
                <label className="form-label text-muted small">All Axes Speed</label>
                <div className="row g-2 align-items-center">
                  <div className="col">
                    <input 
                      type="range" 
                      className="form-range" 
                      min="10" 
                      max="1000" 
                      value={speedAll} 
                      onChange={updateAllSpeedsSlider}
                    />
                  </div>
                  <div className="col-auto">
                    <input 
                      type="number" 
                      className="form-control form-control-sm" 
                      style={{width: "80px"}}
                      value={speedAll} 
                      onChange={updateAllSpeedsInput} 
                      min="10" 
                      max="1000" 
                    />
                  </div>
                  <div className="col-auto">
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={setAllSpeeds}
                    >
                      <span className="me-1">✓</span> Set All
                    </button>
                  </div>
                </div>
              </div>

              {axes.map(axis => (
                <div className="mb-3" key={axis.id}>
                  <label className="form-label text-muted small">{axis.name} Axis</label>
                  <div className="row g-2 align-items-center">
                    <div className="col">
                      <input 
                        type="range" 
                        className="form-range" 
                        min="10" 
                        max="1000" 
                        value={axis.speed} 
                        onChange={(e) => updateAxisSpeedSlider(axis.id, e)}
                      />
                    </div>
                    <div className="col-auto">
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        style={{width: "80px"}}
                        value={axis.speed} 
                        onChange={(e) => updateAxisSpeedInput(axis.id, e)} 
                        min="10" 
                        max="1000" 
                      />
                    </div>
                    <div className="col-auto">
                      <button 
                        className="btn btn-outline-primary btn-sm" 
                        onClick={() => setSpeed(axis.id)}
                      >
                        <span className="me-1">✓</span> Set
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card mb-4 shadow-sm">
          <div className="card-header d-flex align-items-center">
            <span className="me-2 fs-5">⏱️</span>
            <h2 className="h5 mb-0">Timeout Configuration</h2>
          </div>
          
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Wait Timeout</label>
                <div className="d-flex align-items-center">
                  <input 
                    type="range" 
                    className="form-range me-3" 
                    min="5000" 
                    max="300000" 
                    step="1000"
                    value={timeoutConfig.maxWaitTime} 
                    onChange={(e) => setTimeoutConfig({...timeoutConfig, maxWaitTime: parseInt(e.target.value)})}
                  />
                  <div className="input-group" style={{width: "120px"}}>
                    <input 
                      type="number" 
                      className="form-control form-control-sm" 
                      value={timeoutConfig.maxWaitTime / 1000} 
                      onChange={(e) => setTimeoutConfig({...timeoutConfig, maxWaitTime: parseInt(e.target.value) * 1000})} 
                      min="5" 
                      max="300" 
                    />
                    <span className="input-group-text">s</span>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Timeout Strategy</label>
                <select 
                  className="form-select" 
                  value={timeoutConfig.strategy}
                  onChange={(e) => setTimeoutConfig({...timeoutConfig, strategy: parseInt(e.target.value)})}
                >
                  {strategyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Warning Threshold</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={timeoutConfig.maxTimeoutWarning} 
                  onChange={(e) => setTimeoutConfig({...timeoutConfig, maxTimeoutWarning: parseInt(e.target.value)})} 
                  min="1" 
                  max="20" 
                />
                <div className="form-text">Warning after this many consecutive timeouts</div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Auto Retry Count</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={timeoutConfig.autoRetryCount} 
                  onChange={(e) => setTimeoutConfig({...timeoutConfig, autoRetryCount: parseInt(e.target.value)})} 
                  min="0" 
                  max="5" 
                />
                <div className="form-text">Number of automatic retries (0 = disabled)</div>
              </div>

              <div className="col-12">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="saveToFile"
                    checked={timeoutConfig.saveToFile}
                    onChange={(e) => setTimeoutConfig({...timeoutConfig, saveToFile: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="saveToFile">
                    Auto-save configuration to file
                  </label>
                </div>
              </div>

              <div className="col-12">
                <button className="btn btn-primary me-2" onClick={saveTimeoutConfig}>
                  <span className="me-1">💾</span> Save Configuration
                </button>
                <button className="btn btn-outline-secondary" onClick={loadTimeoutConfig}>
                  <span className="me-1">🔄</span> Reload
                </button>
              </div>
            </div>

            {timeoutConfigStatus && (
              <div className={`alert alert-${timeoutConfigStatus.type} mt-3`} role="alert">
                {timeoutConfigStatus.message}
              </div>
            )}
          </div>
        </div>

        <div className="card mb-4 shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <span className="me-2 fs-5">📊</span>
              <h2 className="h5 mb-0">Timeout Statistics</h2>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={clearTimeoutStats}>
              <span className="me-1">🧹</span> Clear
            </button>
          </div>
          
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="text-center p-3 border rounded">
                  <div className="h4 text-success">{timeoutStats.successfulWaits}</div>
                  <div className="small text-muted">Successful Waits</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 border rounded">
                  <div className="h4 text-danger">{timeoutStats.totalTimeouts}</div>
                  <div className="small text-muted">Total Timeouts</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 border rounded">
                  <div className={`h4 ${getSuccessRateColor()}`}>{timeoutStats.successRate.toFixed(1)}%</div>
                  <div className="small text-muted">Success Rate</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 border rounded">
                  <div className="h6">{formatDuration(timeoutStats.totalWaitTime)}</div>
                  <div className="small text-muted">Total Wait Time</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="small">
                  <strong>Last Timeout:</strong> {formatTimestamp(timeoutStats.lastTimeoutTime)}
                </div>
              </div>
              <div className="col-md-6">
                <div className="small">
                  <strong>Current Retry Count:</strong> {timeoutStats.currentRetryCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4 shadow-sm">
          <div className="card-header d-flex align-items-center">
            <span className="me-2 fs-5">📤</span>
            <h2 className="h5 mb-0">Upload Command File</h2>
          </div>
          
          <div className="card-body">
            <div 
              className="p-4 mb-3 border border-2 border-dashed rounded text-center cursor-pointer upload-area"
              onClick={triggerFileInput}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                className="form-control"
              />
              <div className="fs-1 mb-2 text-primary">📁</div>
              <p className="mb-1 fw-medium">Click to select a command file</p>
              <p className="small text-muted">
                {fileName ? `Selected: ${fileName}` : 'No file selected'}
              </p>
            </div>

            <button
              className="btn btn-primary"
              disabled={!selectedFile}
              onClick={uploadFile}
            >
              <span className="me-1">📤</span> Upload
            </button>

            {uploadStatus && (
              <div className={`alert alert-${uploadStatus.type} mt-3`} role="alert">
                {uploadStatus.message}
              </div>
            )}
          </div>
        </div>

        <div className="card mb-4 shadow-sm">
          <div className="card-header d-flex align-items-center">
            <span className="me-2 fs-5">📝</span>
            <h2 className="h5 mb-0">Write Commands</h2>
          </div>
          
          <div className="card-body">
            <textarea
              className="form-control mb-3 font-monospace"
              style={{height: "200px"}}
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder={`Enter commands here... Both legacy and new script formats supported!

📖 LEGACY FORMAT:
X(1,10,100),Y(1,10,100),Z(1,10,100) NEXT
X(2,20,200),Y(2,20,200),Z(2,20,200) NEXT
SET(1) NEXT WAIT NEXT SET(0)

🚀 NEW SCRIPT FORMAT:
FUNC(PICK_SEQUENCE) {
  X(100,d1000,200);
  Y(50,d500,100);
  Z(10,d1000,50);
}

FUNC(SYNC_WITH_ARM2) {
  SET(1);
  WAIT;
  SET(0);
}

CALL(PICK_SEQUENCE);
CALL(SYNC_WITH_ARM2);

🔧 MIXED FORMAT (both work together):
ZERO NEXT SPEED;500 NEXT
CALL(PICK_SEQUENCE);
SET(1) NEXT WAIT NEXT SET(0)`}
            ></textarea>

            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={saveCommands}>
                <span className="me-1">💾</span> Save Commands
              </button>
              <button className="btn btn-outline-primary" onClick={getCommands}>
                <span className="me-1">📥</span> Load Current Commands
              </button>
              <a className="btn btn-outline-primary" href="/download_commands">
                <span className="me-1">📥</span> Download Commands
              </a>
            </div>

            {writeStatus && (
              <div className={`alert alert-${writeStatus.type} mt-3`} role="alert">
                {writeStatus.message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;