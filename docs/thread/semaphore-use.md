## ✅ 1. 基本概念
- Semaphore 本质是一个“许可”计数器；
- 初始化时设定最多可用的许可数（比如 3）；
- 每次 acquire() 获取一个许可；
- 每次 release() 归还一个许可；
- 当许可用完时，其他线程会阻塞，直到有线程释放

## ✅ 2. 构造函数
```java
// 创建一个具有给定许可数量的信号量（非公平）
Semaphore(int permits)

// 创建一个具有给定许可数量和公平策略的信号量
Semaphore(int permits, boolean fair)
```
## 🔧 3. 常用方法

| 方法 | 说明 |
|------|------|
| `acquire()` | 获取一个许可，若无可用许可，则当前线程阻塞直到获取成功。 |
| `acquire(int n)` | 获取 `n` 个许可，若不足则阻塞直到获取到足够的许可。 |
| `tryAcquire()` | 尝试获取一个许可，不阻塞，获取不到立即返回 `false`。 |
| `tryAcquire(long timeout, TimeUnit unit)` | 在指定时间内尝试获取许可，获取不到则返回 `false`。 |
| `release()` | 释放一个许可，唤醒一个正在等待的线程（如果有）。 |
| `release(int n)` | 释放 `n` 个许可。 |
| `availablePermits()` | 返回当前可用的许可数量。 |
| `getQueueLength()` | 返回有多少线程正在等待许可。 |

## 🧪4. 示例代码
```java
public class SemaphoreDemo  implements Runnable{
    public static Semaphore semaphore = new Semaphore(2);

    public String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public SemaphoreDemo(String name){
        this.name = name;
    }

    @Override
    public void run() {
        try {
            System.out.println(name + "开始：" +getDate());
            semaphore.acquire();
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            semaphore.release();
            System.out.println(name + "结束：" +getDate());
        }
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }


    public static void  main(String []args){
        // 采用线程池模拟3个线程
        ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor) Executors.newFixedThreadPool(3);
        for (int i = 0; i<6; i++){
            threadPoolExecutor.execute(new SemaphoreDemo("task"+i));
        }
    }
}

```
可以看到因为信号量的限制，最终消耗15s
```log
task2开始：2025-05-19 :10:42:00
task0开始：2025-05-19 :10:42:00
task1开始：2025-05-19 :10:42:00
task2结束：2025-05-19 :10:42:05
task0结束：2025-05-19 :10:42:05
task3开始：2025-05-19 :10:42:05
task4开始：2025-05-19 :10:42:05
task1结束：2025-05-19 :10:42:10
task3结束：2025-05-19 :10:42:10
task5开始：2025-05-19 :10:42:10
task5结束：2025-05-19 :10:42:15
task4结束：2025-05-19 :10:42:15
```
## 📘 5. 用途举例
- 控制并发线程数（如限制接口并发访问量）
- 实现对象池、连接池等资源复用场景
- 控制同时访问某个文件、IO 资源的线程数量