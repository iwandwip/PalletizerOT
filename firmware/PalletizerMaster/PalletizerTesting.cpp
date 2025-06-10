#include "PalletizerTesting.h"

PalletizerTesting::PalletizerTesting(PalletizerRuntime* runtime)
  : runtime(runtime), resultCount(0), testCaseCount(0) {
  setupTestCases();
}

void PalletizerTesting::setupTestCases() {
  testCases[0] = {
    "Original Failing Script",
    "DETECT;G(600);Z(6000);GROUP(X(1250), T(9900), T(-2500));Z(6800);G(400);Z(6000);",
    7,
    { "DETECT", "G(600)", "Z(6000)", "GROUP(X(1250), T(9900), T(-2500))", "Z(6800)", "G(400)", "Z(6000)" }
  };

  testCases[1] = {
    "Multiple DETECT Commands",
    "DETECT;G(600);DETECT;Z(6000);DETECT;G(400);",
    6,
    { "DETECT", "G(600)", "DETECT", "Z(6000)", "DETECT", "G(400)" }
  };

  testCases[2] = {
    "DETECT with WAIT Combination",
    "DETECT;SET(1);WAIT;G(600);SET(0);DETECT;Z(6000);",
    7,
    { "DETECT", "SET(1)", "WAIT", "G(600)", "SET(0)", "DETECT", "Z(6000)" }
  };

  testCases[3] = {
    "Speed Commands Test",
    "SPEED;200;SPEED;x;500;G(600);DETECT;",
    4,
    { "SPEED;200", "SPEED;x;500", "G(600)", "DETECT" }
  };

  testCases[4] = {
    "Complex GROUP Test",
    "DETECT;GROUP(X(100,d1000), Y(50,d500), Z(30));WAIT;SET(1);",
    4,
    { "DETECT", "GROUP(X(100,d1000), Y(50,d500), Z(30))", "WAIT", "SET(1)" }
  };

  testCaseCount = 5;
}

void PalletizerTesting::test() {
  DEBUG_MGR.separator();
  DEBUG_MGR.info("TESTING", "🧪 PALLETIZER PARSING TEST SUITE");
  DEBUG_MGR.separator();

  runAllTests();
  printResults();
}

void PalletizerTesting::runAllTests() {
  resultCount = 0;

  for (int i = 0; i < testCaseCount; i++) {
    testCase(testCases[i]);
  }
}

void PalletizerTesting::testCase(const TestCase& testCase) {
  printTestHeader(testCase.name);

  String actualCommands[50];
  int actualCount = 0;

  runtime->testParseInlineCommands(testCase.script, actualCommands, actualCount);

  TestResult result;
  result.testName = testCase.name;
  result.expectedCount = testCase.expectedCount;
  result.actualCount = actualCount;
  result.passed = compareResults(testCase, actualCommands, actualCount);

  if (!result.passed) {
    if (actualCount != testCase.expectedCount) {
      result.errorMessage = "Count mismatch: expected " + String(testCase.expectedCount) + ", got " + String(actualCount);
    } else {
      result.errorMessage = "Command content mismatch";
    }
  } else {
    result.errorMessage = "";
  }

  results[resultCount++] = result;

  DEBUG_MGR.info("TEST", "📊 INPUT SCRIPT:");
  DEBUG_MGR.info("TEST", testCase.script);
  DEBUG_MGR.info("TEST", "");
  DEBUG_MGR.info("TEST", "📋 PARSED COMMANDS:");
  printParsedCommands(actualCommands, actualCount);

  printTestResult(result);
  DEBUG_MGR.info("TEST", "");
}

bool PalletizerTesting::compareResults(const TestCase& testCase, String* actualCommands, int actualCount) {
  if (actualCount != testCase.expectedCount) {
    return false;
  }

  for (int i = 0; i < actualCount; i++) {
    if (actualCommands[i] != testCase.expectedCommands[i]) {
      return false;
    }
  }

  return true;
}

void PalletizerTesting::printTestHeader(const String& testName) {
  DEBUG_MGR.info("TEST", "📝 TEST: " + testName);
  DEBUG_MGR.info("TEST", "─────────────────────────────────────────");
}

void PalletizerTesting::printTestResult(const TestResult& result) {
  String status = result.passed ? "✅ PASSED" : "❌ FAILED";
  DEBUG_MGR.info("TEST", "📊 RESULT: " + status);
  DEBUG_MGR.info("TEST", "Expected Count: " + String(result.expectedCount));
  DEBUG_MGR.info("TEST", "Actual Count: " + String(result.actualCount));

  if (!result.passed) {
    DEBUG_MGR.error("TEST", "Error: " + result.errorMessage);
  }
}

void PalletizerTesting::printParsedCommands(String* commands, int count) {
  for (int i = 0; i < count; i++) {
    DEBUG_MGR.info("TEST", "[" + String(i + 1) + "/" + String(count) + "] " + commands[i]);
  }
}

void PalletizerTesting::printResults() {
  DEBUG_MGR.separator();
  DEBUG_MGR.info("TESTING", "📈 TEST SUMMARY");
  DEBUG_MGR.separator();

  int passedCount = 0;
  int failedCount = 0;

  for (int i = 0; i < resultCount; i++) {
    String status = results[i].passed ? "✅" : "❌";
    DEBUG_MGR.info("SUMMARY", status + " " + results[i].testName);

    if (results[i].passed) {
      passedCount++;
    } else {
      failedCount++;
      DEBUG_MGR.error("SUMMARY", "   └─ " + results[i].errorMessage);
    }
  }

  DEBUG_MGR.separator();
  DEBUG_MGR.info("SUMMARY", "📊 FINAL RESULTS:");
  DEBUG_MGR.info("SUMMARY", "├─ Total Tests: " + String(resultCount));
  DEBUG_MGR.info("SUMMARY", "├─ Passed: " + String(passedCount));
  DEBUG_MGR.info("SUMMARY", "├─ Failed: " + String(failedCount));

  float successRate = (float(passedCount) / float(resultCount)) * 100.0;
  DEBUG_MGR.info("SUMMARY", "└─ Success Rate: " + String(successRate, 1) + "%");
  DEBUG_MGR.separator();

  if (failedCount == 0) {
    DEBUG_MGR.info("TESTING", "🎉 ALL TESTS PASSED! Parsing is working correctly.");
  } else {
    DEBUG_MGR.warning("TESTING", "⚠️ Some tests failed. Check parsing implementation.");
  }
}