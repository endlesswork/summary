
## 先运行一个主线程和子线程
```java
public class RunnableDemo implements Runnable{

    @Override
    public void run() {
        System.out.printf("子线程 %s 开始: %s \n", Thread.currentThread().getName(),getDate());
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.printf("子线程 %s 结束: %s \n", Thread.currentThread().getName(),getDate());
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }

    public static void main(String []args){
        System.out.printf("主线程 %s 开始: %s \n", Thread.currentThread().getName(),getDate());
        RunnableDemo runnableDemo = new RunnableDemo();
        Thread thread = new Thread(runnableDemo);
        thread.start();
        System.out.printf("主线程 %s 结束: %s \n", Thread.currentThread().getName(),getDate());
    }
}
```
结果如下
```log
主线程 main 开始: 2019-05-25 :11:06:46 
主线程 main 结束: 2019-05-25 :11:06:46 
子线程 Thread-0 开始: 2019-05-25 :11:06:46 
子线程 Thread-0 结束: 2019-05-25 :11:06:51 
```
## join()
如果我们在thread.start();后面加入join方法，示例如下
```java
public class RunnableDemo implements Runnable{

    @Override
    public void run() {
        System.out.printf("子线程 %s 开始: %s \n", Thread.currentThread().getName(),getDate());
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.printf("子线程 %s 结束: %s \n", Thread.currentThread().getName(),getDate());
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }

    public static void main(String []args){
        System.out.printf("主线程 %s 开始: %s \n", Thread.currentThread().getName(),getDate());
        RunnableDemo runnableDemo = new RunnableDemo();
        Thread thread = new Thread(runnableDemo);
        thread.start();
        //这里是我们新增的
        try {
            thread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.printf("主线程 %s 结束: %s \n", Thread.currentThread().getName(),getDate());
    }
}
```
结果如下
```log
主线程 main 开始: 2019-05-25 :11:21:56 
子线程 Thread-0 开始: 2019-05-25 :11:21:56 
子线程 Thread-0 结束: 2019-05-25 :11:22:01 
主线程 main 结束: 2019-05-25 :11:22:01 
```
会发现主线会等待子线程执行完毕

## 🧵 Thread.join() 的运行原理

join() 本质上是让**当前线程等待另一个线程终止**，普通线程底层通过 wait() 和 notifyAll() 实现线程间的协作。

### join()底层源码

```java
 public final void join(long millis) throws InterruptedException {
        if (millis < 0)
            throw new IllegalArgumentException("timeout value is negative");
		/**虚拟线程走虚拟线程的逻辑**/		
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
					//进入循环等待，直到线程终止 or 超时
                    final long startTime = System.nanoTime();
                    long delay = millis;
                    do {
                        wait(delay);
                    } while (isAlive() && (delay = millis -
                             NANOSECONDS.toMillis(System.nanoTime() - startTime)) > 0);
                }
            } else {
				//无限等待（等同于 join()）
                while (isAlive()) {
                    wait(0);
                }
            }
        }
    }
```

```java
   public final void wait(long timeoutMillis) throws InterruptedException {
        //用于跟踪线程阻塞的时间
		long comp = Blocker.begin();
        try {
			// wait等待
            wait0(timeoutMillis);
        } catch (InterruptedException e) {
            Thread thread = Thread.currentThread();
			//如果是虚拟线程，它的中断状态要通过 getAndClearInterrupt() 清除
            if (thread.isVirtual())
                thread.getAndClearInterrupt();
            throw e;
        } finally {
            Blocker.end(comp);
        }
    }
```

### 子线程结束后如何唤醒主线程？
当子线程运行结束时（正常结束或抛异常结束），**JVM 内部会自动调用 notifyAll()** 唤醒等待它的线程