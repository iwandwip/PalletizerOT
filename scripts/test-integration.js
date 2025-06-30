#!/usr/bin/env node

/**
 * Integration Test Script for PalletizerOT System
 * Tests the complete flow: Web Interface → Node.js Server → ESP32 → Arduino MEGA
 */

const http = require('http');
const { MSLCompiler } = require('../src/compiler');

const SERVER_URL = 'http://localhost:3006';

// Test MSL scripts
const testScripts = {
  simple: `
X(100);
Y(50);
Z(10);
`,
  
  group: `
GROUP(X(100), Y(50), Z(10));
`,
  
  function: `
FUNC(PICK) {
  Z(100);
  X(200);
  Y(50);
  G(1);
}

CALL(PICK);
`,
  
  complex: `
FUNC(PICK_SEQUENCE) {
  Z(100, 500);
  X(200, 1000);
  Y(50, 500);
  GROUP(X(100), Y(50), Z(10));
  G(600, 200);
}

FUNC(PLACE_SEQUENCE) {
  Z(80);
  GROUP(X(400), Y(150));
  Z(100, 1000);
  G(400);
}

CALL(PICK_SEQUENCE);
WAIT;
CALL(PLACE_SEQUENCE);
`
};

class IntegrationTester {
  constructor() {
    this.compiler = new MSLCompiler();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting PalletizerOT Integration Tests\n');
    
    try {
      // Test 1: Compiler functionality
      await this.testCompiler();
      
      // Test 2: Server connectivity
      await this.testServerConnection();
      
      // Test 3: Script compilation and saving
      await this.testScriptSaving();
      
      // Test 4: Hybrid format generation
      await this.testHybridGeneration();
      
      // Test 5: ESP32 polling simulation
      await this.testESP32Polling();
      
      // Test 6: Control commands
      await this.testControlCommands();
      
      // Test 7: Status monitoring
      await this.testStatusMonitoring();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      process.exit(1);
    }
  }

  async testCompiler() {
    console.log('📝 Testing MSL Compiler...');
    
    for (const [name, script] of Object.entries(testScripts)) {
      try {
        // Test text compilation
        const textResult = this.compiler.compileToText(script);
        const commandsResult = this.compiler.compileToCommands(script);
        
        // Test hybrid compilation
        const hybridResult = this.compiler.compileToHybrid(script);
        
        this.addResult(`Compiler ${name}`, true, {
          textCommands: textResult.split('\n').length,
          commands: commandsResult.length,
          hybridSteps: hybridResult.stepCount
        });
        
        console.log(`  ✅ ${name}: ${commandsResult.length} commands → ${hybridResult.stepCount} hybrid steps`);
        
      } catch (error) {
        this.addResult(`Compiler ${name}`, false, error.message);
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    }
    console.log();
  }

  async testServerConnection() {
    console.log('🌐 Testing Server Connection...');
    
    try {
      const response = await this.makeRequest('GET', '/health');
      const isHealthy = response.status === 'ok';
      
      this.addResult('Server Health', isHealthy, response);
      console.log(isHealthy ? '  ✅ Server is healthy' : '  ❌ Server health check failed');
      
    } catch (error) {
      this.addResult('Server Health', false, error.message);
      console.log(`  ❌ Server connection failed: ${error.message}`);
    }
    console.log();
  }

  async testScriptSaving() {
    console.log('💾 Testing Script Saving...');
    
    for (const [name, script] of Object.entries(testScripts)) {
      try {
        const response = await this.makeRequest('POST', '/api/script/save', {
          script,
          format: 'msl',
          armId: 'arm1'
        });
        
        const success = response.success && response.scriptId && response.stepCount > 0;
        
        this.addResult(`Save ${name}`, success, {
          scriptId: response.scriptId,
          commandCount: response.commandCount,
          stepCount: response.stepCount
        });
        
        console.log(success 
          ? `  ✅ ${name}: ${response.commandCount} commands, ${response.stepCount} steps`
          : `  ❌ ${name}: ${response.error || 'Unknown error'}`
        );
        
      } catch (error) {
        this.addResult(`Save ${name}`, false, error.message);
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    }
    console.log();
  }

  async testHybridGeneration() {
    console.log('🔧 Testing Hybrid Format Generation...');
    
    try {
      const testScript = testScripts.complex;
      const response = await this.makeRequest('POST', '/api/script/save', {
        script: testScript,
        format: 'msl'
      });
      
      const hasHybridData = response.compiledData && 
                           response.compiledData.hybridScript && 
                           response.compiledData.hybridScript.steps;
      
      if (hasHybridData) {
        const hybridScript = response.compiledData.hybridScript;
        console.log(`  ✅ Hybrid format generated: ${hybridScript.stepCount} steps`);
        console.log(`  📋 Sample steps:`, hybridScript.steps.slice(0, 3).map(s => 
          `${s.action}:${s.axis || 'N/A'}:${s.position || s.duration || 'N/A'}`
        ).join(', '));
        
        this.addResult('Hybrid Generation', true, {
          stepCount: hybridScript.stepCount,
          format: hybridScript.format
        });
      } else {
        throw new Error('Hybrid script not found in response');
      }
      
    } catch (error) {
      this.addResult('Hybrid Generation', false, error.message);
      console.log(`  ❌ Hybrid generation failed: ${error.message}`);
    }
    console.log();
  }

  async testESP32Polling() {
    console.log('📡 Testing ESP32 Polling Simulation...');
    
    try {
      // First, save a script
      await this.makeRequest('POST', '/api/script/save', {
        script: testScripts.simple,
        format: 'msl'
      });
      
      // Then poll for it
      const pollResponse = await this.makeRequest('GET', '/api/script/poll');
      
      const hasNewScript = pollResponse.hasNewScript;
      const hasHybridScript = pollResponse.hybridScript && pollResponse.hybridScript.steps;
      
      this.addResult('ESP32 Polling', hasNewScript && hasHybridScript, {
        hasNewScript,
        hasHybridScript,
        stepCount: pollResponse.hybridScript?.stepCount || 0
      });
      
      console.log(hasNewScript && hasHybridScript
        ? `  ✅ ESP32 polling successful: ${pollResponse.hybridScript.stepCount} steps`
        : `  ❌ ESP32 polling failed: no script or hybrid data`
      );
      
    } catch (error) {
      this.addResult('ESP32 Polling', false, error.message);
      console.log(`  ❌ ESP32 polling failed: ${error.message}`);
    }
    console.log();
  }

  async testControlCommands() {
    console.log('🎮 Testing Control Commands...');
    
    const commands = ['start', 'pause', 'resume', 'stop', 'zero'];
    
    for (const command of commands) {
      try {
        const response = await this.makeRequest('POST', `/api/control/${command}`);
        const success = response.success;
        
        this.addResult(`Control ${command}`, success, response.message);
        console.log(success 
          ? `  ✅ ${command}: ${response.message}`
          : `  ❌ ${command}: ${response.error || 'Failed'}`
        );
        
      } catch (error) {
        this.addResult(`Control ${command}`, false, error.message);
        console.log(`  ❌ ${command}: ${error.message}`);
      }
    }
    console.log();
  }

  async testStatusMonitoring() {
    console.log('📊 Testing Status Monitoring...');
    
    try {
      const response = await this.makeRequest('GET', '/api/status');
      
      const hasRequiredFields = response.hasOwnProperty('esp32Connected') &&
                               response.hasOwnProperty('hasScript') &&
                               response.hasOwnProperty('isRunning');
      
      this.addResult('Status Monitoring', hasRequiredFields, {
        esp32Connected: response.esp32Connected,
        hasScript: response.hasScript,
        isRunning: response.isRunning
      });
      
      console.log(hasRequiredFields
        ? `  ✅ Status: ESP32=${response.esp32Connected}, Script=${response.hasScript}, Running=${response.isRunning}`
        : `  ❌ Status monitoring failed: missing required fields`
      );
      
    } catch (error) {
      this.addResult('Status Monitoring', false, error.message);
      console.log(`  ❌ Status monitoring failed: ${error.message}`);
    }
    console.log();
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, SERVER_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(5000);

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  addResult(test, success, details) {
    this.testResults.push({ test, success, details });
  }

  printResults() {
    console.log('📋 Test Results Summary');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.success && typeof result.details === 'string') {
        console.log(`   Error: ${result.details}`);
      }
    });
    
    console.log(`\n🎯 Result: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! System integration successful.');
    } else {
      console.log('⚠️  Some tests failed. Check the issues above.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;