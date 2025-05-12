关于看门狗自动续期，也就是为什么看门狗知道某个持有锁的线程还在运行，这里我们看下代码

### Redisso中的RedissonBaseLock类
####  ExpirationEntry内部类
```java
 /**保存所有需要自动续约的锁信息**/
private static final ConcurrentMap<String, ExpirationEntry> EXPIRATION_RENEWAL_MAP = new ConcurrentHashMap();


public static class ExpirationEntry {
	private final Map<Long, Integer> threadIds = new LinkedHashMap();
	private volatile Timeout timeout;
	private final WrappedLock lock = new WrappedLock();

	public void addThreadId(long threadId) {
		this.lock.execute(() -> this.threadIds.compute(threadId, (t, counter) -> {
				counter = (Integer)Optional.ofNullable(counter).orElse(0);
				counter = counter + 1;
				return counter;
			}));
	}

	public boolean hasNoThreads() {
		return (Boolean)this.lock.execute(() -> this.threadIds.isEmpty());
	}

	public Long getFirstThreadId() {
		return (Long)this.lock.execute(() -> this.threadIds.isEmpty() ? null : (Long)this.threadIds.keySet().iterator().next());
	}

	public void removeThreadId(long threadId) {
		this.lock.execute(() -> this.threadIds.compute(threadId, (t, counter) -> {
				if (counter == null) {
					return null;
				} else {
					counter = counter - 1;
					return counter == 0 ? null : counter;
				}
			}));
	}

	public void setTimeout(Timeout timeout) {
		this.timeout = timeout;
	}

	public Timeout getTimeout() {
		return this.timeout;
	}
}
```
#### 自动续约入口 scheduleExpirationRenewal()
```java
protected void scheduleExpirationRenewal(long threadId) {
	ExpirationEntry entry = new ExpirationEntry();
	ExpirationEntry oldEntry = (ExpirationEntry)EXPIRATION_RENEWAL_MAP.putIfAbsent(this.getEntryName(), entry);
	if (oldEntry != null) {
		oldEntry.addThreadId(threadId);
	} else {
		entry.addThreadId(threadId);

		try {
			this.renewExpiration();
		} finally {
			if (Thread.currentThread().isInterrupted()) {
				this.cancelExpirationRenewal(threadId, (Boolean)null);
			}

		}
	}

}
```