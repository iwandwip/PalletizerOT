import React from 'react';
import '../styles/TimeoutStyles.css';

function TimeoutSection({ 
  timeoutConfig, 
  setTimeoutConfig, 
  timeoutStats, 
  timeoutConfigStatus,
  saveTimeoutConfig, 
  loadTimeoutConfig, 
  clearTimeoutStats 
}) {
  const strategyOptions = [
    { value: 0, label: 'Skip & Continue' },
    { value: 1, label: 'Pause System' },
    { value: 2, label: 'Abort & Reset' },
    { value: 3, label: 'Retry with Backoff' }
  ];

  const getSuccessRateColor = () => {
    const rate = timeoutStats.successRate;
    if (rate >= 95) return 'success-rate-excellent';
    if (rate >= 80) return 'success-rate-good';
    return 'success-rate-poor';
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
    <>
      <div className="card mb-4 shadow-sm">
        <div className="card-header d-flex align-items-center">
          <span className="me-2 fs-5">⏱️</span>
          <h2 className="h5 mb-0">Timeout Configuration</h2>
        </div>
        
        <div className="card-body">
          <div className="timeout-config-panel">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="config-section">
                  <label className="form-label">Wait Timeout</label>
                  <div className="timeout-range-container">
                    <input 
                      type="range" 
                      className="timeout-range" 
                      min="5000" 
                      max="300000" 
                      step="1000"
                      value={timeoutConfig.maxWaitTime} 
                      onChange={(e) => setTimeoutConfig({...timeoutConfig, maxWaitTime: parseInt(e.target.value)})}
                    />
                    <div className="timeout-input-group">
                      <input 
                        type="number" 
                        className="timeout-input form-control" 
                        value={timeoutConfig.maxWaitTime / 1000} 
                        onChange={(e) => setTimeoutConfig({...timeoutConfig, maxWaitTime: parseInt(e.target.value) * 1000})} 
                        min="5" 
                        max="300" 
                      />
                      <span className="timeout-unit">s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="config-section">
                  <label className="form-label">Timeout Strategy</label>
                  <select 
                    className="form-select strategy-selector" 
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
              </div>

              <div className="col-md-6">
                <div className="timeout-control-group">
                  <label className="form-label">Warning Threshold</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={timeoutConfig.maxTimeoutWarning} 
                    onChange={(e) => setTimeoutConfig({...timeoutConfig, maxTimeoutWarning: parseInt(e.target.value)})} 
                    min="1" 
                    max="20" 
                  />
                  <div className="timeout-warning-text">
                    Warning after this many consecutive timeouts
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="timeout-control-group">
                  <label className="form-label">Auto Retry Count</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={timeoutConfig.autoRetryCount} 
                    onChange={(e) => setTimeoutConfig({...timeoutConfig, autoRetryCount: parseInt(e.target.value)})} 
                    min="0" 
                    max="5" 
                  />
                  <div className="timeout-warning-text">
                    Number of automatic retries (0 = disabled)
                  </div>
                </div>
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
                <div className="timeout-actions">
                  <button className="btn btn-primary" onClick={saveTimeoutConfig}>
                    <span className="me-1">💾</span> Save Configuration
                  </button>
                  <button className="btn btn-outline-secondary" onClick={loadTimeoutConfig}>
                    <span className="me-1">🔄</span> Reload
                  </button>
                </div>
              </div>
            </div>

            {timeoutConfigStatus && (
              <div className={`command-status ${timeoutConfigStatus.type} mt-3`}>
                {timeoutConfigStatus.message}
              </div>
            )}
          </div>
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
          <div className="timeout-stats-container">
            <div className="timeout-stats-card">
              <div className="stats-value stats-success">{timeoutStats.successfulWaits}</div>
              <div className="stats-label">Successful Waits</div>
            </div>
            <div className="timeout-stats-card">
              <div className="stats-value stats-danger">{timeoutStats.totalTimeouts}</div>
              <div className="stats-label">Total Timeouts</div>
            </div>
            <div className="timeout-stats-card">
              <div className={`stats-value ${getSuccessRateColor()}`}>{timeoutStats.successRate.toFixed(1)}%</div>
              <div className="stats-label">Success Rate</div>
            </div>
            <div className="timeout-stats-card">
              <div className="stats-value stats-info">{formatDuration(timeoutStats.totalWaitTime)}</div>
              <div className="stats-label">Total Wait Time</div>
            </div>
          </div>
          
          <div className="row g-3 mt-2">
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
    </>
  );
}

export default TimeoutSection;