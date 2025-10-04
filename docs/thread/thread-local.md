在分布式系统中，一个请求往往会经过多个服务、多个线程。为了能跟踪整个请求的调用链，我们需要一个 **traceId**，而 ThreadLocal 则是保存 traceId 的常用手段，方便日志记录时自动打印。

## 🧠 为什么使用 ThreadLocal？
在以下场景中，ThreadLocal 非常有用：
- 避免多线程间共享变量带来的线程安全问题。
- 每个线程需要独立的数据副本，例如：
	- 用户登录信息（如 UserContext）
	- 数据库连接（如事务管理）
	- 日期格式化器（如 SimpleDateFormat，非线程安全）

## ✅ 使用样例
```java
public class ThreadLocalDemo {

    static class RunnableDemo implements Runnable {
        @Override
        public void run() {
            ThreadLocal<String> threadLocal = new ThreadLocal<>();
            threadLocal.set("thread hello");
            System.out.println("RunnableDemo:" + threadLocal.get());
            threadLocal.remove();
        }
    }

    public static void main(String[] args) {
        ThreadLocal<String> threadLocal = new ThreadLocal<>();
        new Thread(new RunnableDemo()).start();
        threadLocal.set("hello");
        System.out.println("主线程:" + threadLocal.get());
        threadLocal.remove();
    }
}
```
输出如下
```log
RunnableDemo:thread hello
主线程:hello
```
### 使用方式总结：
- set(T value)：为当前线程设置一个变量副本。
- get()：获取当前线程的变量副本。
- remove()：移除当前线程的变量，建议手动调用，避免内存泄漏。

## ⚙️ ThreadLocal 的原理
### set
以当前线程为key
```java
public void set(T value) {
	set(Thread.currentThread(), value);
	if (TRACE_VTHREAD_LOCALS) {
		dumpStackIfVirtualThread();
	}
}
private void set(Thread t, T value) {
	ThreadLocalMap map = getMap(t);
	if (map != null) {
		map.set(this, value);
	} else {
		createMap(t, value);
	}
}
ThreadLocalMap getMap(Thread t) {
	return t.threadLocals;
}
```
这个t.threadLocals对应的是Thread类中
```java
public class Thread {
    ThreadLocal.ThreadLocalMap threadLocals;
}
```
也就是每个线程在自己内部维持了一个ThreadLocalMap实例，保证了线程隔离

## 🔥 内存泄漏问题
**ThreadLocal 之所以会导致内存泄漏，根本原因就是：**

1. **ThreadLocalMap 与线程生命周期绑定**  
   - 每个 `Thread` 对象内部都有一个 `ThreadLocalMap`（字段 `threadLocals`）。  
   - `ThreadLocalMap` 的生命周期和线程一致。  
   - 普通线程结束 → `Thread` 被回收 → `ThreadLocalMap` 也会被回收 → 不会有问题。  

2. **线程池线程不会轻易结束**  
   - 在线程池中，线程会被复用，长期存在。  
   - 因此 `ThreadLocalMap` 也会一直存在。  

3. **Key 弱引用 + Value 强引用**  
   - 如果 `ThreadLocalMap` 中某个 entry 的 **key（弱引用）** 被 GC 回收了，  
   - 但 **value（强引用对象）** 仍然存在，且没有触发 `remove()` 清理，  
   - 那么这个 value 就会一直“挂”在 `ThreadLocalMap` 中存活。  里一直存活。


