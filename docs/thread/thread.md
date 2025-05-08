## 🧵 Java Thread 方法
```java
// 启动线程
thread.start();

// 线程执行体（不要直接调用）
thread.run();

// 让当前线程睡眠指定毫秒数
Thread.sleep(1000);

// 等待目标线程执行完毕
thread.join();

// 当前线程让出 CPU（不一定有效）
Thread.yield();

// 向线程发送中断信号
thread.interrupt();

// 判断线程是否被中断（不会清除标志）
thread.isInterrupted();

// 判断并清除中断标志（静态方法）
Thread.interrupted();

// 判断线程是否还活着
thread.isAlive();

// 设置为守护线程（必须在 start() 之前）
thread.setDaemon(true);
```

### ✅ start() 的控制权在 操作系统（JVM 调度器）
- start() 把线程提交给 JVM 和操作系统调度。
- 它会进入就绪状态，但什么时候真正运行是不确定的，取决于操作系统的线程调度策略。
- 不等于立刻执行，也可能排队等很久。

### ✅ interrupt() 的控制权在 线程本身
- interrupt() 只是设置一个中断标志位，不会强制终止线程。
- 线程是否终止，要靠线程自己检查这个标志并做出响应。
- 所以中断是一种“温和地建议线程停止”的方式