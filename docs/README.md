# 📚 PALLETIZEROT - DOCUMENTATION

**Comprehensive documentation** untuk PalletizerOT - Industrial palletizer control system dengan Modern Script Language (MSL) compiler dan ultra-lightweight ESP32 command forwarding architecture.

```
   +=============================================================================+
                      📚 DOCUMENTATION INDEX                              |
                                                                           |
   |  🏗️ Architecture  <->  🔄 System Flows  <->  📝 Version History           |
                                                                           |
   |    Project Setup    |   Technical Flows   |   Development Log         |
   |    MSL Compiler     |   Command Pipeline  |   Breaking Changes        |
   |    File Structure   |   ESP32 Integration |   Migration Guides        |
   +=============================================================================+
```

---

## 📋 **Documentation Structure**

### **01. 🏗️ [Project Structure & Architecture](./01_PROJECT_STRUCTURE.md)**
**Foundation Documentation** - Project architecture, technology stack, dan MSL compiler design

**📋 Contains:**
- Industrial palletizer system overview
- Technology stack & dependencies (Next.js 15, TypeScript, ESP32)
- Modern Script Language (MSL) architecture
- Complete project file structure
- Web client → Server → ESP32 → Arduino MEGA pipeline
- Ultra-lightweight ESP32 firmware design (99% RAM reduction)
- Development workflow & build configuration

**👥 Target Audience:** Developers, system architects, new team members

---

### **02. 🔄 [System Flows & Technical Architecture](./02_SYSTEM_FLOWS.md)**
**Technical Implementation** - Data flows, MSL compilation, dan command processing logic

**📋 Contains:**
- Modern Script Language (MSL) compilation pipeline
- Web client-based compiler architecture
- ESP32 command forwarding mechanisms
- Real-time communication flows (HTTP polling + SSE)
- Command execution pipeline (Web → Server → ESP32 → Arduino MEGA)
- Dual-arm support system architecture
- API endpoints & mDNS service discovery
- Error handling & debugging workflows

**👥 Target Audience:** System analysts, developers, technical stakeholders

---

### **03. 📝 [Version History & Changelog](./03_VERSION_HISTORY.md)**
**Development Evolution** - Architecture migration, performance optimization, dan future planning

**📋 Contains:**
- Complete architectural transformation tracking
- Migration from ESP32-heavy to web client-based processing
- Performance optimization achievements (250KB → 3KB RAM)
- Breaking changes dalam firmware architecture
- Development milestones & feature releases
- Migration guides between versions
- Future development roadmap & planning

**👥 Target Audience:** Project managers, developers, stakeholders tracking progress

---

## 🚀 **Quick Navigation**

### **🔍 Key Features Overview**
- **🧠 MSL Compiler**: Complete TypeScript-based Modern Script Language compiler in web browser
- **🔌 Ultra-Lightweight ESP32**: 99% RAM reduction (250KB → 3KB) pure command forwarder
- **🎯 Industrial Automation**: Professional palletizer control dengan 5-axis + gripper coordination
- **⚡ Real-time Interface**: Live debugging, status monitoring, dan SSE communication
- **🔄 Dual-Arm Support**: Independent script management untuk multiple robotic arms
- **🛠️ Development Tools**: ESP32 simulator, concurrent dev servers, comprehensive testing

### **📱 Technology Highlights**
- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind CSS 4
- **Backend**: Express.js + Server-Sent Events + mDNS service discovery
- **Compiler**: Custom MSL parser dengan real-time compilation dan validation
- **Firmware**: Object-oriented ESP32 firmware (3-class modular architecture)
- **Communication**: HTTP polling + Serial UART + Real-time status updates

### **🎯 System Architecture**
```
Web Client (MSL Compiler) → Node.js Server → ESP32 Forwarder → Arduino MEGA (Motors)
     ↓                          ↓               ↓                    ↓
Full MSL Processing      Command Storage    Format Bridge      5-Axis Control
TypeScript Compiler     API Endpoints      Serial Protocol    AccelStepper
```

---

## 📋 **Getting Started**

1. **📖 Start with [Project Structure](./01_PROJECT_STRUCTURE.md)** untuk understanding project architecture
2. **🔄 Continue with [System Flows](./02_SYSTEM_FLOWS.md)** untuk technical implementation details  
3. **📝 Review [Version History](./03_VERSION_HISTORY.md)** untuk development evolution context

---

**🎯 PalletizerOT adalah production-ready industrial control system** dengan optimized web-based architecture, ultra-lightweight embedded firmware, dan comprehensive Modern Script Language compiler yang mendukung complex automation scenarios dengan maximum efficiency dan professional-grade reliability.