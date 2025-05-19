## ✅ 1. 基本概念

CountDownLatch 通过一个计数器（初始值由构造函数指定）来控制线程的等待：
- 每调用一次 countDown()，计数器减一
- 当计数器变为 0 时，所有调用过 await() 的线程才会继续执行

## ✅ 2. 构造函数

```java
public CountDownLatch(int count)
```
- count: 初始计数，表示需要等待的事件数量

## 🔧 3. 常用方法

| 方法 | 说明 |
|------|------|
| `void await()` | 当前线程阻塞，直到计数为 0 |
| `boolean await(long timeout, TimeUnit unit)` | 在指定时间内等待计数为 0，超时返回 `false` |
| `void countDown()` | 计数减 1 |
| `long getCount()` | 返回当前计数值（Java 1.8+） |

## 🧪4. 示例代码
```java
public class CountDownLatchDemo {

    public static CountDownLatch countDownLatch = new CountDownLatch(1);

    static class ThreadDemo implements Runnable{
        public String name;

        public ThreadDemo(String name){
            this.name = name;
        }

        @Override
        public void run() {
            System.out.println(name+"开始"+getDate());
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            countDownLatch.countDown();
            System.out.println(name+"结束"+getDate());
        }
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }
    public static void main(String []args) throws InterruptedException {
        Thread thread1 = new Thread(new ThreadDemo("t1"));
        thread1.start();
        countDownLatch.await();
        System.out.println("主线程执行完毕"+getDate());
    }
}
```
输出如下,可以看到主线程在等待子线程执行完毕
```log
t1开始2025-05-20 :12:39:02
主线程执行完毕2025-05-20 :12:39:04
t1结束2025-05-20 :12:39:04
```
## 📘 5. 用途举例
- 主线程等待子线程完成任务（如并行加载资源）

## ⚠ 6.️ 注意事项
- CountDownLatch 是一次性的，计数器为 0 后不能重置。
- 若需循环使用，请考虑使用 CyclicBarrier 或 Semaphore。
- countDown() 可被多个线程调用。
- 如果 await() 先执行，会一直阻塞直到计数为 0。

