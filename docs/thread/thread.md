
线程状态图
![thread-pool-1](/image/thread/thread/thread-status.webp)

## 🧵 Java Thread 方法
```java
// 启动线程
thread.start();

// 线程执行体（不要直接调用）
thread.run();

// 让当前线程睡眠指定毫秒数
Thread.sleep(1000);

// 等待目标线程执行完毕
thread.join();

// 当前线程让出 CPU（不一定有效）
Thread.yield();

// 向线程发送中断信号
thread.interrupt();

// 判断线程是否被中断（不会清除标志）
thread.isInterrupted();

// 判断并清除中断标志（静态方法）
Thread.interrupted();

// 判断线程是否还活着
thread.isAlive();

// 设置为守护线程（必须在 start() 之前）
thread.setDaemon(true);
```
### ✅ start() 的控制权在 操作系统（JVM 调度器）
- start() 把线程提交给 JVM 和操作系统调度。
- 它会进入就绪状态，但什么时候真正运行是不确定的，取决于操作系统的线程调度策略。
- 不等于立刻执行，也可能排队等很久。

### ✅ interrupt() 的控制权在 线程本身
- interrupt() 只是设置一个中断标志位，不会强制终止线程。
- 线程是否终止，要靠线程自己检查这个标志并做出响应。
- 所以中断是一种“温和地建议线程停止”的方式
- **如果线程被Object.wait, Thread.join和Thread.sleep三种方法之一阻塞，会不断查询线程的中断标记，如果为true，则停止阻塞并抛出InterruptedException异常。如果为false，则继续阻塞。
注意一点，在调用Object.wait, Thread.join和Thread.sleep方法之后，会清除掉中断标记，如果我们还需要中断标记，需要再次对线程进行interrupt()方法**

我们看个interrupt()、isInterrupted() 与 Thread.interrupted() 示例
```java
public class InterruptDemo extends Thread {
    @Override
    public void run() {
        Thread.currentThread().interrupt();
        System.out.println("子线程执行中断请求结果1："+Thread.currentThread().isInterrupted());
        System.out.println("子线程执行中断请求结果2："+Thread.currentThread().isInterrupted());
    }

    public static void main(String  []args) throws InterruptedException {
        InterruptDemo interruptDemo = new InterruptDemo();
        interruptDemo.start();
        Thread.sleep(1000);
        Thread.currentThread().interrupt();
        System.out.println("主线程执行中断请求结果1："+Thread.currentThread().isInterrupted());
        System.out.println("主线程执行中断请求结果2："+Thread.currentThread().isInterrupted());
        System.out.println("主线程执行中断请求结果3："+Thread.interrupted());
        //因为Thread会重置主线程终端状态所以第二次请求为false
        System.out.println("主线程执行中断请求结果4："+Thread.interrupted());
        
    }
}
```
结果如下,这种情况可以看到主线程第二次请求interrupted()为false
```log
子线程执行中断请求结果1：true
子线程执行中断请求结果2：true
主线程执行中断请求结果1：true
主线程执行中断请求结果2：true
主线程执行中断请求结果3：true
主线程执行中断请求结果4：false
```
interrupt() 中断后恢复示例
```java
public class InterruptDemo2 extends Thread {
    @Override
    public void run() {
        while(!Thread.currentThread().isInterrupted()){
            try {
                System.out.println("线程执行休眠开始");
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }finally {
               //可以尝试注掉这句话
                Thread.currentThread().interrupt();
            }
        }
    }

    public static void main(String  []args) throws InterruptedException {
        InterruptDemo2 interruptDemo = new InterruptDemo2();
        interruptDemo.start();
        Thread.sleep(1000);
        System.out.println("主线程睡眠结束");
        interruptDemo.interrupt();
        System.out.println("执行中断请求");
    }
}
```
结果如下
```log
线程执行休眠开始
主线程睡眠结束
java.lang.InterruptedException: sleep interrupted
执行中断请求
    at java.lang.Thread.sleep(Native Method)
    at com.example.consumerdemoone.thread2.InterruptDemo2.run(InterruptDemo2.java:15)
	结果如下
```
**如果我们注释掉 Thread.currentThread().interrupt(), 线程会一直认为自己“没有被中断”, 会一直循环**
```log
线程执行休眠开始
java.lang.InterruptedException: sleep interrupted
主线程睡眠结束
    at java.lang.Thread.sleep(Native Method)
执行中断请求
线程执行休眠开始
    at com.example.consumerdemoone.thread2.InterruptDemo2.run(InterruptDemo2.java:15)
线程执行休眠开始
线程执行休眠开始
线程执行休眠开始
线程执行休眠开始
线程执行休眠开始
```

## 🧩 Object 类中的线程协作方法
### 1. `wait()`
- 当前线程进入等待状态，直到被其他线程唤醒
- **必须在持有该对象锁的同步块或方法中调用（也就是要在 synchronized(obj) 块中）**，否则抛 IllegalMonitorStateException
- 调用后线程会：
   - **释放该对象的锁（monitor）**
   - 挂起等待（进入对象的等待队列）
- 被唤醒后，**必须重新竞争锁才能继续执行**。

看一个例子
```java
public class WaitDemo {

    public static void main(String []args) throws InterruptedException {
        WaitDemo waitDemo = new WaitDemo();
        Thread thread1 = new Thread("t1"){
            @Override
            public void run(){
                synchronized (waitDemo){
                    try {
                        System.out.println("t1进入等待");
                        waitDemo.wait();
                       //我们没有写对象的唤醒，所以这句话不会输出出来
                        System.out.println("t1等待结束");
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }

            }
        };

        Thread thread2 = new Thread("t2"){
            @Override
            public void run(){
                synchronized (waitDemo){
                   //因为wait会释放掉waitDemo的内置锁，所以可以显示这句话会第二输出
                    System.out.println("t2进来了");
                }
            }
        };
        thread1.start();
        Thread.sleep(1000);
        thread2.start();

    }

}
```
输出如下
```log
t1进入等待
t2进来了
```

### 2. `notifyAll()`
- 最多等待指定毫秒数，超时后自动唤醒

### 3. `wait(long timeout, int nanos)`
- 更高精度的等待时间，实际等待时间约为：timeout + nanos / 1_000_000 毫秒

### 4. `notify()`
- **同样必须在持有对象锁（即 synchronized 块或方法中）时调用**
- **与wait区别，notify退出同步块，锁才会被释放**
- **唤醒一个在该对象上 wait() 的线程（具体哪个线程由 JVM 决定）**
- 被唤醒的线程会进入就绪状态，等待重新竞争锁

### 5. `notifyAll()`
- 唤醒所有在该对象上 wait() 的线程

我们看个 notify的例子
```java
public class NotifyDemo {

    public static void main(String []args) throws InterruptedException {
        NotifyDemo notifyDemo = new NotifyDemo();
        Thread thread1 = new Thread("t1"){
            @Override
            public void run(){
                synchronized (notifyDemo){
                    try {
                        System.out.println("t1进入等待"+System.currentTimeMillis());
                        notifyDemo.wait();
                        System.out.println("t1等待结束"+System.currentTimeMillis());
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        };

        Thread thread2 = new Thread("t2"){
            @Override
            public void run(){
                synchronized (notifyDemo){
                    System.out.println("t2进来了"+System.currentTimeMillis());
                    notifyDemo.notify();
                    try {
                        Thread.sleep(10000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    System.out.println("t2执行完毕了"+System.currentTimeMillis());
                }
            }
        };
        thread1.start();
        Thread.sleep(1000);
        thread2.start();
    }
}
```

```
t1进入等待1564909412115
t2进来了1564909413116
t2执行完毕了1564909423117
t1等待结束1564909423117
```
**t1进入等待  -> t1 线程持有锁，调用 wait() 后释放锁，进入等待状态** 
**t2进来了   -> t2 获取锁后调用 notify()，唤醒 t1，但 t1 还不能立即执行**   
**t2执行完毕了 -> t2 睡 10 秒，期间锁未释放，t1 虽然被唤醒但还在等待锁**   
**t1等待结束  -> t2 释放锁后，t1 重新竞争到锁，继续执行** 


