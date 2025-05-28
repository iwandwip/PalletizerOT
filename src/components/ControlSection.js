import React from 'react';
import '../styles/ControlStyles.css';

function ControlSection({ 
  sendCommand, 
  speedAll, 
  setSpeedAll, 
  axes, 
  setAxes, 
  updateAllSpeedsSlider, 
  updateAllSpeedsInput,
  updateAxisSpeedSlider,
  updateAxisSpeedInput,
  setSpeed,
  setAllSpeeds 
}) {
  return (
    <div className="dashboard-grid">
      <div className="control-panel-card">
        <div className="control-panel-header">
          <span className="me-2">🎮</span>
          System Controls
        </div>
        <div className="system-controls-grid">
          <button 
            className="btn btn-success" 
            onClick={() => sendCommand('PLAY')}
          >
            <span>▶</span> PLAY
          </button>
          <button 
            className="btn btn-warning" 
            onClick={() => sendCommand('PAUSE')}
          >
            <span>⏸</span> PAUSE
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => sendCommand('STOP')}
          >
            <span>⏹</span> STOP
          </button>
          <button 
            className="btn btn-info text-white" 
            onClick={() => sendCommand('IDLE')}
          >
            <span>⚪</span> IDLE
          </button>
          <button 
            className="btn btn-purple text-white" 
            onClick={() => sendCommand('ZERO')}
          >
            <span>⌂</span> ZERO
          </button>
        </div>
      </div>

      <div className="control-panel-card">
        <div className="control-panel-header">
          <span className="me-2">⚡</span>
          Speed Control
        </div>
        <div className="speed-matrix-container">
          <div className="speed-all-control">
            <div className="speed-all-label">All Axes Speed</div>
            <div className="speed-input-row">
              <input 
                type="range" 
                className="form-range flex-grow-1" 
                min="10" 
                max="1000" 
                value={speedAll} 
                onChange={updateAllSpeedsSlider}
              />
              <div className="speed-input-group">
                <input 
                  type="number" 
                  className="speed-input form-control" 
                  value={speedAll} 
                  onChange={updateAllSpeedsInput} 
                  min="10" 
                  max="1000" 
                />
                <button 
                  className="btn btn-primary speed-set-btn" 
                  onClick={setAllSpeeds}
                >
                  Set All
                </button>
              </div>
            </div>
          </div>

          <div className="speed-matrix-grid">
            {axes.map(axis => (
              <div className="speed-axis-card" key={axis.id}>
                <div className="axis-label">{axis.name}</div>
                <input 
                  type="range" 
                  className="form-range" 
                  min="10" 
                  max="1000" 
                  value={axis.speed} 
                  onChange={(e) => updateAxisSpeedSlider(axis.id, e)}
                />
                <div className="speed-input-group">
                  <input 
                    type="number" 
                    className="speed-input form-control" 
                    value={axis.speed} 
                    onChange={(e) => updateAxisSpeedInput(axis.id, e)} 
                    min="10" 
                    max="1000" 
                  />
                  <button 
                    className="btn btn-outline-primary speed-set-btn" 
                    onClick={() => setSpeed(axis.id)}
                  >
                    Set
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="control-panel-card">
        <div className="control-panel-header">
          <span className="me-2">⚡</span>
          Quick Actions
        </div>
        <div className="quick-actions-card">
          <div className="quick-actions-grid">
            <div className="action-item text-center">
              <div className="action-icon">🏠</div>
              <div className="action-label">Home All</div>
            </div>
            <div className="action-item text-center">
              <div className="action-icon">⚡</div>
              <div className="action-label">Max Speed</div>
            </div>
            <div className="action-item text-center">
              <div className="action-icon">🔄</div>
              <div className="action-label">Reset</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlSection;