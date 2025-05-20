Semaphore 底层是基于AQS来实现的

# 1. 核心实现
## Sync
```java
abstract static class Sync extends AbstractQueuedSynchronizer {
	private static final long serialVersionUID = 1192457210091910933L;
	
	Sync(int permits) {
		//初始化许可数
		setState(permits);
	}

	final int getPermits() {
		return getState();
	}
	//尝试获取许可证，返回负数则失败
	final int nonfairTryAcquireShared(int acquires) {
		for (;;) {
			int available = getState();
			int remaining = available - acquires;
			if (remaining < 0 ||
				compareAndSetState(available, remaining))
				return remaining;
		}
	}

	protected final boolean tryReleaseShared(int releases) {
		for (;;) {
			int current = getState();
			int next = current + releases;
			if (next < current) 
				throw new Error("Maximum permit count exceeded");
			if (compareAndSetState(current, next))
				return true;
		}
	}

	final void reducePermits(int reductions) {
		for (;;) {
			int current = getState();
			int next = current - reductions;
			if (next > current) 
				throw new Error("Permit count underflow");
			if (compareAndSetState(current, next))
				return;
		}
	}

	final int drainPermits() {
		for (;;) {
			int current = getState();
			if (current == 0 || compareAndSetState(current, 0))
				return current;
		}
	}
}
```
## 非公平实现
```java
static final class NonfairSync extends Sync {
	private static final long serialVersionUID = -2694183684443567898L;

	NonfairSync(int permits) {
		super(permits);
	}

	protected int tryAcquireShared(int acquires) {
		return nonfairTryAcquireShared(acquires);
	}
}
```
## acquire()
当我们在demo中调用acquire()时
```java	
public void acquire() throws InterruptedException {
	sync.acquireSharedInterruptibly(1);
}
```	
当我们获取不到信号量时，就将线程加入AQS的等待队列
```java	
public final void acquireSharedInterruptibly(int arg)
	throws InterruptedException {
	if (Thread.interrupted() ||
		(tryAcquireShared(arg) < 0 &&
		 acquire(null, arg, true, true, false, 0L) < 0))
		throw new InterruptedException();
}
```		
## 公平实现
可以看到和非公平的区别是调用 hasQueuedPredecessors() **如果队列前面有线程，自己不能插队**
```java
static final class FairSync extends Sync {
	private static final long serialVersionUID = 2014338818796000944L;

	FairSync(int permits) {
		super(permits);
	}

	protected int tryAcquireShared(int acquires) {
		for (;;) {
			if (hasQueuedPredecessors())
				return -1;
			int available = getState();
			int remaining = available - acquires;
			if (remaining < 0 ||
				compareAndSetState(available, remaining))
				return remaining;
		}
	}
}
```	
AQS类中，判断有没有等待的线程
```	java
public final boolean hasQueuedPredecessors() {
	Thread first = null; Node h, s;
	if ((h = head) != null && ((s = h.next) == null ||
							   (first = s.waiter) == null ||
							   s.prev == null))
		first = getFirstQueuedThread(); 
	return first != null && first != Thread.currentThread();
}
```	
## release()
- 公平锁和非公平锁释放锁过程一致只是将许可数 state 加回来（CAS 增加）；
- 成功返回 true，让 AQS 去唤醒等待队列中的线程。

## 🧠 总结

### 🟡 非公平锁（默认实现）
- 调用 `acquire` 时：
  - 直接尝试获取许可（通过 CAS 扣减 `state`）；
  - 如果获取成功，立即返回；
  - 如果获取失败（即剩余许可小于请求量），则加入 AQS 同步队列中等待。

### 🟢 公平锁（构造时传入 `true`）
- 调用 `acquire` 时：
  - 首先调用 `hasQueuedPredecessors()` 检查是否有排队线程；
  - 如果有排队线程，直接放弃尝试，加入队列；
  - 如果没有排队线程，再尝试 CAS 扣减许可。
