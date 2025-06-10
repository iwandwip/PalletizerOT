#ifndef PALLETIZER_TESTING_H
#define PALLETIZER_TESTING_H

#include "Arduino.h"
#include "PalletizerRuntime.h"
#include "DebugManager.h"

class PalletizerTesting {
public:
  struct TestCase {
    String name;
    String script;
    int expectedCount;
    String expectedCommands[10];
  };

  struct TestResult {
    String testName;
    bool passed;
    int expectedCount;
    int actualCount;
    String errorMessage;
  };

  PalletizerTesting(PalletizerRuntime* runtime);
  void test();
  void testCase(const TestCase& testCase);
  void printResults();
  void runAllTests();
  
private:
  PalletizerRuntime* runtime;
  TestResult results[10];
  int resultCount;
  
  bool compareResults(const TestCase& testCase, String* actualCommands, int actualCount);
  void printTestHeader(const String& testName);
  void printTestResult(const TestResult& result);
  void printParsedCommands(String* commands, int count);
  void setupTestCases();
  
  static const int MAX_TEST_CASES = 10;
  TestCase testCases[MAX_TEST_CASES];
  int testCaseCount;
};

#endif