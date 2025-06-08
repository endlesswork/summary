**LongAdder 是一种高并发下比 AtomicLong 更高效的计数器实现**，通过“分段累加”减少竞争

它对写入操作（increment, add）是**线程安全**的。读取时（sum()）不是强一致的，但通常满足统计精度要求
## 📌 使用示例
```java
public class LongAdderDemo {
    public static void main(String[] args) throws InterruptedException {
        LongAdder adder = new LongAdder();
        Runnable task = () -> {
            for (int i = 0; i < 100; i++) {
                adder.increment();
            }
        };
        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("最终计数值：" + adder.sum());
    }
}
```
输出如下
```
最终计数值：200
```