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
### 正常到达屏障 
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
### 重置屏障
```java
public class CyclicBarrierResetDemo {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    public static void main(String[] args) throws InterruptedException {
        CyclicBarrier barrier = new CyclicBarrier(3, () -> {
            log("所有线程到达屏障，执行 barrierAction");
        });

        Runnable task = () -> {
            try {
                String name = Thread.currentThread().getName();
                log(name + " 等待屏障");
                if ("Thread-1".equals(name)) {
                    Thread.sleep(500);
                    Thread.currentThread().interrupt();
                }

                barrier.await();
                log(name + " 通过屏障");

            } catch (Exception e) {
                log(Thread.currentThread().getName() + " 异常: " + e);
                log(" 屏障是否损坏: " + barrier.isBroken());
            }
        };

        // 启动第一轮线程（Thread-1 中断）
        for (int i = 0; i < 3; i++) {
            new Thread(task, "Thread-" + i).start();
        }

        // 等待线程完成出错
        Thread.sleep(2000);

        log("主线程调用 reset()");
        barrier.reset();

        // 启动第二轮线程
        for (int i = 3; i < 6; i++) {
            new Thread(() -> {
                try {
                    String name = Thread.currentThread().getName();
                    log(name + " 第二轮等待屏障");
                    barrier.await();
                    log(name + " 第二轮通过屏障");
                } catch (Exception e) {
                    log(Thread.currentThread().getName() + " 第二轮异常: " + e);
                }
            }, "Thread-" + i).start();
        }
    }

    private static void log(String message) {
        System.out.println("[" + LocalTime.now().format(TIME_FORMATTER) + "] " + message);
    }
}
```
输出如下
```log
[00:44:11] Thread-2 等待屏障
[00:44:11] Thread-1 等待屏障
[00:44:11] Thread-0 等待屏障
[00:44:12] Thread-0 异常: java.util.concurrent.BrokenBarrierException
[00:44:12] Thread-2 异常: java.util.concurrent.BrokenBarrierException
[00:44:12] Thread-1 异常: java.lang.InterruptedException
[00:44:12]  屏障是否损坏: true
[00:44:12]  屏障是否损坏: true
[00:44:12]  屏障是否损坏: true
[00:44:13] 主线程调用 reset()
[00:44:13] Thread-3 第二轮等待屏障
[00:44:13] Thread-4 第二轮等待屏障
[00:44:13] Thread-5 第二轮等待屏障
[00:44:13] 所有线程到达屏障，执行 barrierAction
[00:44:13] Thread-3 第二轮通过屏障
[00:44:13] Thread-5 第二轮通过屏障
[00:44:13] Thread-4 第二轮通过屏障
```
## 📘 5. 用途举例
- 多线程并行计算之后合并结果
