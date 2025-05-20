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
## 公平实现
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