## ✅ 1. 基本概念

CyclicBarrier允许一组线程互相等待，直到到达某个公共屏障点（barrier）才继续执行。
它适用于需要多个线程在某个阶段全部达到同步点之后再继续下一阶段的场景，比如多线程并行计算之后合并结果

## ✅ 2. 构造函数

```java
CyclicBarrier(int parties)
```
- parties: 指定数量的线程（parties）到达屏障后才能继续

```java
CyclicBarrier(int parties, Runnable barrierAction)
```
- 除了设置参与线程数量，还可以设置一个 屏障动作（barrierAction），在所有线程都到达屏障后由其中一个线程执行

## 🔧 3. 常用方法

| 方法名               | 作用说明                                               |
|----------------------|--------------------------------------------------------|
| `await()`            | 到达屏障并等待其他线程，一起继续执行                   |
| `await(timeout)`     | 等待指定时间，超时抛出 `TimeoutException`              |
| `getNumberWaiting()` | 获取当前正在等待的线程数量                             |
| `getParties()`       | 获取设置的总线程数（即构造时传入的 parties 数）        |
| `isBroken()`         | 检查屏障是否已被破坏（超时、异常、手动 `reset` 等原因）|
| `reset()`            | 重置屏障状态，取消所有等待线程，重新使用               |

## 🧪4. 示例代码
```java
public class CyclicBarrierDemo {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    public static void main(String[] args) {
        int threadCount = 3;

        CyclicBarrier barrier = new CyclicBarrier(threadCount, () -> {
            log("所有线程都到达屏障点，开始下一步任务...");
        });

        for (int i = 0; i < threadCount; i++) {
            final int threadNum = i;
            new Thread(() -> {
                log("线程 " + threadNum + " 正在执行任务...");
                try {
                    Thread.sleep(1000 + threadNum * 1000);
                    log("线程 " + threadNum + " 到达屏障点");
                    log("当前已到达线程数: " + barrier.getNumberWaiting());
                    // 等待其他线程到达
                    barrier.await();
                    log("线程 " + threadNum + " 继续执行后续任务");
                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    private static void log(String message) {
        System.out.println("[" + LocalTime.now().format(TIME_FORMATTER) + "] " + message);
    }

}
```
输出如下
```log
[23:35:19] 线程 0 正在执行任务...
[23:35:19] 线程 1 正在执行任务...
[23:35:19] 线程 2 正在执行任务...
[23:35:20] 线程 0 到达屏障点
[23:35:20] 当前已到达线程数: 0
[23:35:21] 线程 1 到达屏障点
[23:35:21] 当前已到达线程数: 1
[23:35:22] 线程 2 到达屏障点
[23:35:22] 当前已到达线程数: 2
[23:35:22] 所有线程都到达屏障点，开始下一步任务...
[23:35:22] 线程 2 继续执行后续任务
[23:35:22] 线程 0 继续执行后续任务
[23:35:22] 线程 1 继续执行后续任务
```
## 📘 5. 用途举例
- 多线程并行计算之后合并结果
CountDownLatch 底层基于ReentrantLock （可重入锁）+ Condition（条件队列）

# 1. 核心实现

## 核心字段
```java
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition trip = lock.newCondition();
    //需要等待的线程数
    private final int parties;
   // 所有线程到达后要执行的动作
    private final Runnable barrierCommand;
   
    private Generation generation = new Generation();
    //当前剩余未到达屏障的线程数
    private int count;

```	
## Generation类
```java
private static class Generation {
	Generation() {}                
	boolean broken;               
}

```	
`Generation` 是一个内部类，用于表示 CyclicBarrier 的“一个周期”或“一轮使用”。
- `boolean broken`: 表示这一轮是否已被破坏（中断、超时、异常等）。
### 🧠 为什么需要它？
- 避免“上一轮的线程”误进入“下一轮”的执行。
- 保证线程唤醒的准确性与屏障的一致性。
### 🚦 何时切换 Generation？
- 屏障触发成功（所有线程到齐） -> `nextGeneration()`
- 屏障被破坏（中断、异常） -> `breakBarrier()` + `nextGeneration()`（如果调用 `reset()`）
## await
```	java
public int await() throws InterruptedException, BrokenBarrierException {
	try {
		return dowait(false, 0L);
	} catch (TimeoutException toe) {
		throw new Error(toe); 
	}
}

 private int dowait(boolean timed, long nanos)
	throws InterruptedException, BrokenBarrierException,
		   TimeoutException {
	final ReentrantLock lock = this.lock;
	lock.lock();
	try {
		 //保留当前generation
		final Generation g = generation;
		if (g.broken)
			throw new BrokenBarrierException();

		if (Thread.interrupted()) {
			breakBarrier();
			throw new InterruptedException();
		}

		int index = --count;
		// 最后一个线程到达 就去执行唤醒屏障
		if (index == 0) {  
			Runnable command = barrierCommand;
			if (command != null) {
				try {
					command.run();
				} catch (Throwable ex) {
					breakBarrier();
					throw ex;
				}
			}
			nextGeneration();
			return 0;
		}
		//如果不是最后一个则执行等待
		for (;;) {
			try {
				if (!timed)
					trip.await();
				else if (nanos > 0L)
					nanos = trip.awaitNanos(nanos);
			} catch (InterruptedException ie) {
				//如果当前线程被中断，且仍在当前一代屏障上等待，且屏障未被破坏
				if (g == generation && ! g.broken) {
					breakBarrier();
					throw ie;
				} else {
					Thread.currentThread().interrupt();
				}
			}

			if (g.broken)
				throw new BrokenBarrierException();

			if (g != generation)
				return index;

			if (timed && nanos <= 0L) {
				breakBarrier();
				throw new TimeoutException();
			}
		}
	} finally {
		lock.unlock();
	}
}
```	
### 📌 步骤说明

1. **线程调用 `await()`**
   - `count--`，判断是否到达 0。
   - 如果未到达 0，线程会在 `trip.await()` 处阻塞等待。

2. **最后一个线程到达**
   - 当 `count == 0` 时，屏障被触发。
   - 如果设置了 `barrierCommand`，由最后一个到达的线程执行该任务。

3. **唤醒与重置**
   - 调用 `nextGeneration()`：
     - 调用 `trip.signalAll()` 唤醒所有等待线程
	 - 重置 `count = parties`
	 - 创建新的 `Generation` 实例

4. **异常处理**
   - 如果某个线程发生中断或超时：
     - 执行 `breakBarrier()`，将当前 `Generation` 标记为 broken
     - 所有正在等待的线程会抛出 `BrokenBarrierException`

## nextGeneration
```	java
private void nextGeneration() {
	trip.signalAll();
	count = parties;
	generation = new Generation();
}
```	
- 调用 `trip.signalAll()` 唤醒所有等待线程
- 重置 `count = parties`
- 创建新的 `Generation` 实例
## breakBarrier
```	java
private void breakBarrier() {
	generation.broken = true;
	count = parties;
	trip.signalAll();
}	
```	
## reset
手动重置屏障
```	java
public void reset() {
	final ReentrantLock lock = this.lock;
	lock.lock();
	try {
		breakBarrier();   
		nextGeneration();
	} finally {
		lock.unlock();
	}
}
```		
