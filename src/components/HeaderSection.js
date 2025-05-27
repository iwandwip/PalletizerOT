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
    <header className="header-container d-flex justify-content-between align-items-center mb-4 p-3 text-white shadow-sm">
      <div className="d-flex align-items-center">
        <span className="header-logo me-2">🤖</span>
        <h1 className="header-title h4 mb-0">ESP32 Palletizer Control</h1>
      </div>
      <div className="d-flex align-items-center">
        <div className="theme-toggle-container me-3">
          <button 
            className="theme-toggle" 
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
        <div className="status-container d-flex align-items-center px-3 py-1 rounded-pill">
          <span className="connection-indicator connected"></span>
          <span className="me-2 text-white">Status:</span>
          <span className={`status-badge ${getStatusBadgeClass()} rounded-pill`}>
            {systemStatus}
          </span>
        </div>
      </div>
    </header>
  );
}

export default HeaderSection;