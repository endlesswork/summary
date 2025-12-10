
线程状态图
![thread-pool-1](/image/thread/thread/thread-status.webp)

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

#### ✅ 为什么设计成这样？
这是 Java 的 设计选择，为了简化错误处理和控制流程：
- 如果你已经通过抛异常中断阻塞，就说明你已经“响应”过这个中断了。
- 所以不需要再保留中断状态，避免其他代码误判。
- 如果你需要“保留中断”，可以手动恢复它。

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
### ✅ join
用于**等待一个线程执行完毕**。当一个线程调用另一个线程的 join() 方法时，它会**阻塞自己，直到被调用的线程执行结束或被中断**

#### 源码解析（JDK21）

- synchronized (this)：锁的是被 join 的线程对象本身（例如 thread.join() 中锁的是 thread 对象）。
- isAlive()：判断目标线程是否仍然存活（尚未执行完）。
- wait()：调用的是 Object.wait()，使当前线程（调用 join 的线程）进入等待状态。

```java
public final void join() throws InterruptedException {
	join(0);
}
public final void join(long millis) throws InterruptedException {
	if (millis < 0)
		throw new IllegalArgumentException("timeout value is negative");

	if (this instanceof VirtualThread vthread) {
		if (isAlive()) {
			long nanos = MILLISECONDS.toNanos(millis);
			vthread.joinNanos(nanos);
		}
		return;
	}

	synchronized (this) {
		if (millis > 0) {
			if (isAlive()) {
				final long startTime = System.nanoTime();
				long delay = millis;
				do {
					wait(delay);
				} while (isAlive() && (delay = millis -
						 NANOSECONDS.toMillis(System.nanoTime() - startTime)) > 0);
			}
		} else {
			while (isAlive()) {
				wait(0);
			}
		}
	}
}
```
#### ❓那谁来调用 notify() 或 notifyAll()？
当目标线程执行完毕后，**JVM 会自动调用 notifyAll() 唤醒等待在该线程对象上的线程**。虽然我们在代码中看不到这一行，
但它是 **JVM 的一个内部机制**

## ✨LockSupport
### ✅ 核心方法
```java
// 阻塞当前线程
LockSupport.park();

// 唤醒指定线程
LockSupport.unpark(Thread thread);
```
### 🧠 原理：许可机制（permit）
- 每个线程最多拥有一个**“许可”**
- park()：
	- 没有许可则阻塞线程
	- 有许可则立即返回并消费该许可
- unpark(thread)：
	- 如果目标线程没被阻塞，则提前“发放许可”
	- 如果目标线程已被阻塞，则立即唤醒
	- 多次 unpark() 不会累计许可，最多只保留一个许可

### ⚠️ 注意事项
- unpark 可以在 park 之前调用，相当于“发放许可”
- 许可不会累计，多次 unpark 只有一次作用
- park 可能出现虚假唤醒，应使用循环判断条件
- park 不抛异常，但可以通过 Thread.interrupted() 检查中断状态

unpark顺序demo
```java
public class LockSupportDemo2 implements Runnable{

    public String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LockSupportDemo2(String name){
        this.name = name;
    }

    @Override
    public void run() {
        System.out.println(name + "开始执行");
        LockSupport.unpark(Thread.currentThread());
        LockSupport.park();
        System.out.println(name + "正常执行");
        System.out.println(name + "阻塞状态" + Thread.interrupted());
    }

    public static void main(String args[]) throws InterruptedException {
        LockSupportDemo2 lockSupportDemo = new LockSupportDemo2("t1");
        Thread thread1 = new Thread(lockSupportDemo);
        thread1.start();
        Thread.sleep(1000);
        System.out.println("开始执行解锁");
        LockSupport.unpark(thread1);

    }
}
```
可以看到结果,unpark会让下次park不起作用，输出如下

```log
t1开始执行
t1正常执行
t1阻塞状态false
开始执行解锁
```



