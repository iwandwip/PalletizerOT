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

🚀 NEW SCRIPT FORMAT:
FUNC(PICK_SEQUENCE) {
  X(100,d1000,200);
  Y(50,d500,100);
  Z(10,d1000,50);
}

CALL(PICK_SEQUENCE);

🔧 MIXED FORMAT:
ZERO NEXT SPEED;500 NEXT
CALL(PICK_SEQUENCE);`;

  return (
    <div className="command-interface">
      <div className="command-card">
        <div className="command-card-header">
          <span>📤</span>
          Upload Command File
        </div>
        
        <div className="command-card-body">
          <div 
            className="upload-zone"
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div className="upload-content">
              <div className="upload-icon">📁</div>
              <div className="upload-text">Click to select a command file</div>
              <div className="upload-subtext">
                Drag & drop your .txt file here or click to browse
              </div>
              {fileName && (
                <div className="file-selected">
                  <span>📄</span>
                  Selected: {fileName}
                </div>
              )}
            </div>
          </div>

          <div className="upload-actions">
            <button
              className="btn btn-primary action-btn"
              disabled={!selectedFile}
              onClick={uploadFile}
            >
              <span>📤</span> Upload File
            </button>
            <button
              className="btn btn-outline-secondary action-btn"
              onClick={() => fileInputRef.current.click()}
            >
              <span>📂</span> Browse
            </button>
          </div>

          {uploadStatus && (
            <div className={`status-message ${uploadStatus.type}`}>
              {uploadStatus.message}
            </div>
          )}
        </div>
      </div>

      <div className="command-card">
        <div className="command-card-header">
          <span>📝</span>
          Command Editor
        </div>
        
        <div className="command-card-body">
          <div className="editor-container">
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
              <span>💾</span> Save Commands
            </button>
            <button className="btn btn-outline-primary action-btn" onClick={getCommands}>
              <span>📥</span> Load Commands
            </button>
            <a className="btn btn-outline-primary action-btn" href="/download_commands">
              <span>📥</span> Download
            </a>
          </div>

          {writeStatus && (
            <div className={`status-message ${writeStatus.type}`}>
              {writeStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandSection;