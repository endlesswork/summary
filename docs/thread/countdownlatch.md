CountDownLatch 底层也是基于AQS来实现的

# 1. 核心实现
## Sync
它也是实现了AQS
### tryAcquireShared
- state = 0 返回1
- 否则 返回 -1

### tryReleaseShared
- 不断尝试以 CAS 的方式将 state 减 1
- 如果已经是 0，，返回 false 
- 如果减到 0，返回 true
```java
private static final class Sync extends AbstractQueuedSynchronizer {
	private static final long serialVersionUID = 4982264981922014374L;

	Sync(int count) {
		setState(count);
	}

	int getCount() {
		return getState();
	}

	protected int tryAcquireShared(int acquires) {
		return (getState() == 0) ? 1 : -1;
	}
	
	protected boolean tryReleaseShared(int releases) {
		for (;;) {
			int c = getState();
			if (c == 0)
				return false;
			int nextc = c - 1;
			if (compareAndSetState(c, nextc))
				return nextc == 0;
		}
	}
}

```		
## await
```	java
public void await() throws InterruptedException {
	sync.acquireSharedInterruptibly(1);
}
```	
AQS类中
- tryAcquireShared(arg) 调用上面Sync中 tryAcquireShared
可以看到这一步中
- tryAcquireShared 返回的小于0 ，证明state不为0
- 则将线程挂起放入等待队列
```	java	
public final void acquireSharedInterruptibly(int arg)
	throws InterruptedException {
	if (Thread.interrupted() ||
		(tryAcquireShared(arg) < 0 &&
		 acquire(null, arg, true, true, false, 0L) < 0))
		throw new InterruptedException();
}
```	

## countDown
```	java
public void countDown() {
	sync.releaseShared(1);
}
```	
AQS类中
- tryReleaseShared(arg) 调用上面Sync中 tryReleaseShared
可以看到 如果 state扣减为 0 则会通知挂起的线程
```	java
public final boolean releaseShared(int arg) {
	if (tryReleaseShared(arg)) {
		signalNext(head);
		return true;
	}
	return false;
}
private static void signalNext(Node h) {
	Node s;
	if (h != null && (s = h.next) != null && s.status != 0) {
		s.getAndUnsetStatus(WAITING);
		LockSupport.unpark(s.waiter);
	}
}
```	
## 🧠 总结

因为 CountDownLatch中的state只能扣减为0，也不能重置，所以前面会说 **CountDownLatch 是一次性的，计数器为 0 后不能重置**

### 🟡 `await()`

1. 调用 AQS 的 `acquireSharedInterruptibly(1)`
2. 内部调用 `tryAcquireShared(1)` 判断是否可以通过：
   - 若 `state == 0`，**立即返回**
   - 否则，**当前线程加入等待队列并阻塞**
3. 一旦其他线程调用 `countDown()` 并将 `state` 减为 0，则唤醒当前线程

### 🟢 `countDown()`

1. 调用 AQS 的 `releaseShared(1)`
2. 内部调用 `tryReleaseShared(1)`：
   - 通过 CAS 将 `state` 减 1
   - 如果减到 0，返回 `true`
3. 若返回 `true`，调用 `signalNext(head)` 唤醒等待线程