import React from 'react';
import '../styles/HeaderStyles.css';

function HeaderSection({ darkMode, toggleDarkMode, systemStatus }) {
  const getStatusBadgeClass = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'bg-success';
      case 'PAUSED': return 'bg-warning';
      case 'IDLE': case 'STOPPING': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  return (
    <header className="header-container d-flex justify-content-between align-items-center p-3 text-white">
      <div className="d-flex align-items-center">
        <span className="header-logo me-2">🤖</span>
        <h1 className="header-title mb-0">ESP32 Palletizer Control</h1>
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="theme-toggle-container">
          <button 
            className="theme-toggle" 
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
        <div className="status-container d-flex align-items-center px-3 py-2 rounded-pill">
          <span className="connection-indicator connected"></span>
          <span className="me-2 text-white fw-bold">Status:</span>
          <span className={`status-badge ${getStatusBadgeClass()}`}>
            {systemStatus}
          </span>
        </div>
      </div>
    </header>
  );
}

export default HeaderSection;