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
    <div className="card mb-4 shadow-sm">
      <div className="card-header d-flex align-items-center">
        <span className="me-2 fs-5">🎮</span>
        <h2 className="h5 mb-0">Control Panel</h2>
      </div>
      
      <div className="card-body control-panel">
        <div className="system-controls mb-4">
          <button 
            className="btn btn-success d-flex align-items-center justify-content-center" 
            onClick={() => sendCommand('PLAY')}
          >
            <span className="me-1">▶</span> PLAY
          </button>
          <button 
            className="btn btn-warning d-flex align-items-center justify-content-center" 
            onClick={() => sendCommand('PAUSE')}
          >
            <span className="me-1">⏸</span> PAUSE
          </button>
          <button 
            className="btn btn-danger d-flex align-items-center justify-content-center" 
            onClick={() => sendCommand('STOP')}
          >
            <span className="me-1">⏹</span> STOP
          </button>
          <button 
            className="btn btn-info text-white d-flex align-items-center justify-content-center" 
            onClick={() => sendCommand('IDLE')}
          >
            <span className="me-1">⚪</span> IDLE
          </button>
          <button 
            className="btn btn-purple text-white d-flex align-items-center justify-content-center" 
            onClick={() => sendCommand('ZERO')}
          >
            <span className="me-1">⌂</span> ZERO
          </button>
        </div>

        <div className="speed-controls">
          <div className="all-axes-control mb-3">
            <label className="speed-label">All Axes Speed</label>
            <div className="speed-input-group">
              <input 
                type="range" 
                className="form-range" 
                min="10" 
                max="1000" 
                value={speedAll} 
                onChange={updateAllSpeedsSlider}
              />
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
                <span className="me-1">✓</span> Set All
              </button>
            </div>
          </div>

          {axes.map(axis => (
            <div className="axis-control" key={axis.id}>
              <label className="axis-label">{axis.name} Axis</label>
              <div className="speed-input-group">
                <input 
                  type="range" 
                  className="form-range" 
                  min="10" 
                  max="1000" 
                  value={axis.speed} 
                  onChange={(e) => updateAxisSpeedSlider(axis.id, e)}
                />
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
                  <span className="me-1">✓</span> Set
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ControlSection;