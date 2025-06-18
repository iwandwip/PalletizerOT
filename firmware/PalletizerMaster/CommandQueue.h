#ifndef COMMAND_QUEUE_H
#define COMMAND_QUEUE_H

#include "Arduino.h"

class CommandQueue {
public:
  CommandQueue(int maxSize = 20);

  bool enqueue(const String& command);
  String dequeue();
  bool isEmpty() const {
    return count == 0;
  }
  int size() const {
    return count;
  }
  void clear();

private:
  String* queue;
  int maxSize;
  int head, tail, count;
};

#endif