# OOP Architecture - New Firmware Design

## Overview

Firmware baru menggunakan **Object-Oriented Programming (OOP)** mengikuti pola yang sama dengan old firmware, namun dioptimalkan untuk arsitektur server-based.

## Design Patterns Implemented

### 1. **Singleton Pattern**
```cpp
// Global system coordinator
PalletizerBridge* PalletizerBridge::getInstance();
PalletizerSlave* PalletizerSlave::getInstance();
```

### 2. **Observer Pattern** 
```cpp
// Event-driven communication between components
void setStateChangeCallback(void (*callback)(SystemState));
void setErrorCallback(void (*callback)(const String&));
```

### 3. **Command Pattern**
```cpp
// Command parsing and execution
bool processCommand(const String& command);
ParsedCommand parseCommand(const String& command);
bool executeCommand(const ParsedCommand& cmd);
```

### 4. **Dependency Injection**
```cpp
// Constructor injection for loose coupling
CommandParser(MotorController* motorController);
SerialBridge(HardwareSerial* serial, int rxPin, int txPin);
```

## ESP32 Master Architecture

### **Main Coordinator: PalletizerBridge**
```
PalletizerBridge (Singleton)
├── WebSocketClient (Server Communication)
├── SerialBridge (Arduino Communication)  
├── CommandQueue (Buffer Management)
└── StatusManager (Health Monitoring)
```

### **Class Responsibilities**

#### **PalletizerBridge**
- **Pattern**: Singleton + Facade
- **Role**: System coordinator and main entry point
- **Responsibilities**:
  - Component lifecycle management
  - State machine coordination
  - Event distribution via Observer pattern

#### **WebSocketClient** 
- **Pattern**: Observer + Strategy
- **Role**: Server communication layer
- **Responsibilities**:
  - WiFi connection management
  - WebSocket connection to laptop server
  - JSON message parsing/sending
  - Connection health monitoring

#### **SerialBridge**
- **Pattern**: Bridge + Observer
- **Role**: Arduino communication layer
- **Responsibilities**:
  - Serial communication with Arduino Mega
  - Command transmission and response parsing
  - Buffer management and flow control

#### **CommandQueue**
- **Pattern**: Queue + Strategy
- **Role**: Command buffering and prioritization
- **Responsibilities**:
  - Priority-based command queuing
  - Flow control and rate limiting
  - Emergency command handling

#### **StatusManager**
- **Pattern**: Observer + Repository
- **Role**: System health and metrics
- **Responsibilities**:
  - Health monitoring and diagnostics
  - Performance metrics collection
  - Status reporting and broadcasting

## Arduino Mega Slave Architecture

### **Main Coordinator: PalletizerSlave**
```
PalletizerSlave (Singleton)
├── MotorController (5-Axis Control)
├── CommandParser (Command Processing)
└── SlaveStatusManager (Health Monitoring)
```

### **Class Responsibilities**

#### **PalletizerSlave**
- **Pattern**: Singleton + Facade
- **Role**: System coordinator for motor control
- **Responsibilities**:
  - Component lifecycle management
  - Serial communication with ESP32
  - State machine for motor operations

#### **MotorController**
- **Pattern**: Strategy + Observer
- **Role**: 5-axis stepper motor control
- **Responsibilities**:
  - Individual and coordinated motor control
  - Synchronized group movements
  - Position tracking and reporting
  - Motion state management

#### **CommandParser**
- **Pattern**: Command + Interpreter
- **Role**: Command processing engine
- **Responsibilities**:
  - Serial command parsing and validation
  - Parameter extraction and validation
  - Command execution coordination
  - Response generation

#### **SlaveStatusManager**
- **Pattern**: Observer + Monitor
- **Role**: System health and diagnostics
- **Responsibilities**:
  - Performance monitoring (loop frequency, memory)
  - Error tracking and reporting
  - Health status determination

## Communication Flow

### **Server → ESP32 Master**
```json
WebSocket JSON Messages:
{
  "cmd": "MOVE",
  "data": {"X": 1000, "Y": 2000, "speed": 1500}
}
```

### **ESP32 Master → Arduino Slave**
```
Serial Text Protocol:
M X1000 Y2000 S1500 A500
G X500 Y500 Z100 S1000
H
E
```

### **Arduino Slave → ESP32 Master**
```
Status Responses:
P X1000 Y2000 Z100 T0 G0    // Position
B                            // Busy
D                            // Done
E Error message             // Error
```

## Key OOP Benefits

### **1. Modularity**
- Each class has single responsibility
- Easy to test individual components
- Clear separation of concerns

### **2. Maintainability**
- Changes isolated to specific classes
- Observer pattern reduces coupling
- Consistent error handling patterns

### **3. Extensibility**
- Easy to add new command types
- Plugin-like architecture for new features
- Strategy pattern allows algorithm swapping

### **4. Reliability**
- Singleton pattern prevents multiple instances
- Observer pattern ensures consistent state updates
- Command pattern provides transaction-like operations

## Memory Management

### **ESP32 Master**
- **Heap Usage**: ~60KB (WebSocket + JSON buffers)
- **Stack Usage**: ~8KB per task
- **Static Usage**: ~40KB (class instances)
- **Total**: ~108KB / 320KB (33% usage)

### **Arduino Mega**
- **SRAM Usage**: ~4KB (motor controllers + buffers)
- **Flash Usage**: ~50KB (code + constants)
- **Total**: 4KB / 8KB SRAM (50% usage)

## Error Handling Strategy

### **Hierarchical Error Propagation**
```
Component Error → Local Handler → Observer Notification → System Response
```

### **Recovery Mechanisms**
- **Connection Loss**: Auto-reconnect with exponential backoff
- **Command Errors**: Validation + graceful degradation
- **Motor Errors**: Emergency stop + status reporting
- **Memory Issues**: Cleanup + resource management

## Testing Strategy

### **Unit Testing**
- Individual class testing in isolation
- Mock objects for dependencies
- State machine validation

### **Integration Testing**
- Component interaction testing
- End-to-end command flow
- Error propagation validation

### **Performance Testing**
- Memory usage profiling
- Loop frequency monitoring
- Response time measurement

This OOP architecture provides a solid foundation for maintainable, scalable, and reliable palletizer control system.