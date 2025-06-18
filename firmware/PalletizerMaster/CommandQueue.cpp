#include "CommandQueue.h"

CommandQueue::CommandQueue(int maxSize) : maxSize(maxSize), head(0), tail(0), count(0) {
    queue = new String[maxSize];
}

bool CommandQueue::enqueue(const String& command) {
    if (count >= maxSize) return false;
    
    queue[tail] = command;
    tail = (tail + 1) % maxSize;
    count++;
    return true;
}

String CommandQueue::dequeue() {
    if (count == 0) return "";
    
    String command = queue[head];
    head = (head + 1) % maxSize;
    count--;
    return command;
}

void CommandQueue::clear() {
    head = 0;
    tail = 0;
    count = 0;
}