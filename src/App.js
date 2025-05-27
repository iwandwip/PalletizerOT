import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './GlobalStyles.css';
import './styles/HeaderStyles.css';
import './styles/ControlStyles.css';
import './styles/TimeoutStyles.css';
import './styles/CommandStyles.css';

import HeaderSection from './components/HeaderSection';
import ControlSection from './components/ControlSection';
import TimeoutSection from './components/TimeoutSection';
import CommandSection from './components/CommandSection';
import { ApiService } from './utils/ApiService';
import { EventService } from './utils/EventService';
import { 
  getThemeFromStorage, 
  setThemeToStorage, 
  applyTheme, 
  clampSpeed,
  createStatusMessage,
  clearStatusMessage
} from './utils/Helpers';

function App() {
  const [darkMode, setDarkMode] = useState(getThemeFromStorage());
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
  const [eventService] = useState(new EventService());

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    setThemeToStorage(newMode);
    applyTheme(newMode);
  };

  const sendCommand = async (cmd) => {
    try {
      const result = await ApiService.sendCommand(cmd);
      console.log('Command sent:', result);
    } catch (error) {
      console.error('Error sending command:', error);
    }
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
    const value = clampSpeed(parseInt(e.target.value, 10));
    setSpeedAll(value);
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id !== 'g' ? { ...axis, speed: value } : axis
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
    const value = clampSpeed(parseInt(e.target.value, 10));
    setAxes(prevAxes => 
      prevAxes.map(axis => 
        axis.id === id ? { ...axis, speed: value } : axis
      )
    );
  };

  const setSpeed = async (axisId) => {
    const axis = axes.find(a => a.id === axisId);
    if (axis) {
      await sendCommand(`SPEED;${axisId};${axis.speed}`);
    }
  };

  const setAllSpeeds = async () => {
    await sendCommand(`SPEED;${speedAll}`);
  };

  const loadTimeoutConfig = async () => {
    try {
      const data = await ApiService.getTimeoutConfig();
      setTimeoutConfig(data);
    } catch (error) {
      console.error('Error loading timeout config:', error);
    }
  };

  const loadTimeoutStats = async () => {
    try {
      const data = await ApiService.getTimeoutStats();
      setTimeoutStats(data);
    } catch (error) {
      console.error('Error loading timeout stats:', error);
    }
  };

  const saveTimeoutConfig = async () => {
    setTimeoutConfigStatus(createStatusMessage('info', 'Saving timeout configuration...'));
    
    try {
      await ApiService.saveTimeoutConfig(timeoutConfig);
      setTimeoutConfigStatus(createStatusMessage('success', 'Timeout configuration saved successfully'));
      clearStatusMessage(setTimeoutConfigStatus);
    } catch (error) {
      console.error('Error saving timeout config:', error);
      setTimeoutConfigStatus(createStatusMessage('danger', `Error saving configuration: ${error}`));
    }
  };

  const clearTimeoutStats = async () => {
    try {
      await ApiService.clearTimeoutStats();
      await loadTimeoutStats();
      setTimeoutConfigStatus(createStatusMessage('success', 'Timeout statistics cleared'));
      clearStatusMessage(setTimeoutConfigStatus);
    } catch (error) {
      console.error('Error clearing timeout stats:', error);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadStatus(createStatusMessage('danger', 'Please select a file'));
      return;
    }

    setUploadStatus(createStatusMessage('info', 'Uploading...'));

    try {
      const result = await ApiService.uploadFile(selectedFile);
      setUploadStatus(createStatusMessage('success', 'File uploaded successfully. Click PLAY to execute.'));
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus(createStatusMessage('danger', `Error uploading file: ${error}`));
    }
  };

  const saveCommands = async () => {
    if (!commandText.trim()) {
      setWriteStatus(createStatusMessage('danger', 'Please enter commands'));
      return;
    }

    setWriteStatus(createStatusMessage('info', 'Saving...'));

    try {
      await ApiService.saveCommands(commandText);
      setWriteStatus(createStatusMessage('success', 'Commands saved successfully. Click PLAY to execute.'));
    } catch (error) {
      console.error('Error saving commands:', error);
      setWriteStatus(createStatusMessage('danger', `Error saving commands: ${error}`));
    }
  };

  const getCommands = async () => {
    setWriteStatus(createStatusMessage('info', 'Loading commands...'));

    try {
      const data = await ApiService.getCommands();
      setCommandText(data);
      setWriteStatus(createStatusMessage('success', 'Commands loaded successfully'));
    } catch (error) {
      console.error('Error loading commands:', error);
      setWriteStatus(createStatusMessage('danger', `Error loading commands: ${error}`));
    }
  };

  const downloadCommands = () => {
    ApiService.downloadCommands();
  };

  useEffect(() => {
    applyTheme(darkMode);
  }, [darkMode]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const statusData = await ApiService.getStatus();
        setSystemStatus(statusData.status);
        
        await loadTimeoutConfig();
        await loadTimeoutStats();
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();

    const handleMessage = (data) => {
      eventService.handleStatusUpdate(data, setSystemStatus);
      eventService.handleTimeoutEvent(data, loadTimeoutStats);
    };

    const handleError = (err) => {
      console.error('EventSource connection error:', err);
    };

    eventService.connect(handleMessage, handleError);

    return () => {
      eventService.disconnect();
    };
  }, [eventService]);

  return (
    <div className="container py-4">
      <HeaderSection 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        systemStatus={systemStatus}
      />
      
      <ControlSection 
        sendCommand={sendCommand}
        speedAll={speedAll}
        setSpeedAll={setSpeedAll}
        axes={axes}
        setAxes={setAxes}
        updateAllSpeedsSlider={updateAllSpeedsSlider}
        updateAllSpeedsInput={updateAllSpeedsInput}
        updateAxisSpeedSlider={updateAxisSpeedSlider}
        updateAxisSpeedInput={updateAxisSpeedInput}
        setSpeed={setSpeed}
        setAllSpeeds={setAllSpeeds}
      />
      
      <TimeoutSection 
        timeoutConfig={timeoutConfig}
        setTimeoutConfig={setTimeoutConfig}
        timeoutStats={timeoutStats}
        timeoutConfigStatus={timeoutConfigStatus}
        saveTimeoutConfig={saveTimeoutConfig}
        loadTimeoutConfig={loadTimeoutConfig}
        clearTimeoutStats={clearTimeoutStats}
      />
      
      <CommandSection 
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        fileName={fileName}
        setFileName={setFileName}
        uploadStatus={uploadStatus}
        setUploadStatus={setUploadStatus}
        commandText={commandText}
        setCommandText={setCommandText}
        writeStatus={writeStatus}
        setWriteStatus={setWriteStatus}
        uploadFile={uploadFile}
        saveCommands={saveCommands}
        getCommands={getCommands}
        downloadCommands={downloadCommands}
      />
    </div>
  );
}

export default App;