import React, { useRef } from 'react';
import '../styles/CommandStyles.css';

function CommandSection({ 
  selectedFile, 
  setSelectedFile, 
  fileName, 
  setFileName, 
  uploadStatus, 
  setUploadStatus,
  commandText, 
  setCommandText, 
  writeStatus, 
  setWriteStatus,
  uploadFile, 
  saveCommands, 
  getCommands, 
  downloadCommands 
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setFileName(file ? file.name : '');
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const commandPlaceholder = `Enter commands here... Both legacy and new script formats supported!

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
SET(1) NEXT WAIT NEXT SET(0)`;

  return (
    <>
      <div className="card mb-4 shadow-sm">
        <div className="card-header d-flex align-items-center">
          <span className="me-2 fs-5">📤</span>
          <h2 className="h5 mb-0">Upload Command File</h2>
        </div>
        
        <div className="card-body command-section">
          <div className="upload-container">
            <div 
              className="upload-area p-4 mb-3 text-center cursor-pointer"
              onClick={triggerFileInput}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📁</div>
              <p className="upload-text mb-1">Click to select a command file</p>
              <p className="upload-subtext">
                {fileName ? (
                  <span className="file-name">Selected: {fileName}</span>
                ) : (
                  'No file selected'
                )}
              </p>
            </div>

            <div className="upload-actions">
              <button
                className="btn btn-primary action-btn"
                disabled={!selectedFile}
                onClick={uploadFile}
              >
                <span className="me-1">📤</span> Upload
              </button>
            </div>

            {uploadStatus && (
              <div className={`command-status ${uploadStatus.type}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-4 shadow-sm">
        <div className="card-header d-flex align-items-center">
          <span className="me-2 fs-5">📝</span>
          <h2 className="h5 mb-0">Write Commands</h2>
        </div>
        
        <div className="card-body command-section">
          <div className="command-editor-container">
            <div className="editor-toolbar">
              <div className="editor-info">Command Editor</div>
              <div className="format-badges">
                <span className="format-badge legacy">Legacy</span>
                <span className="format-badge script">Script</span>
              </div>
            </div>
            
            <textarea
              className="command-editor form-control"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder={commandPlaceholder}
            ></textarea>
          </div>

          <div className="command-actions">
            <button className="btn btn-primary action-btn" onClick={saveCommands}>
              <span className="me-1">💾</span> Save Commands
            </button>
            <button className="btn btn-outline-primary action-btn" onClick={getCommands}>
              <span className="me-1">📥</span> Load Current Commands
            </button>
            <a className="btn btn-outline-primary action-btn" href="/download_commands">
              <span className="me-1">📥</span> Download Commands
            </a>
          </div>

          {writeStatus && (
            <div className={`command-status ${writeStatus.type}`}>
              {writeStatus.message}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CommandSection;