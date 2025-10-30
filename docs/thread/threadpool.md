关于线程池的类图如下
![thread-pool-1](/image/thread/threadpool/thread-pool-1.webp)
因为线程池好多方法都是ThreadPoolExecutor来实现的，这里我们先看下ThreadPoolExecutor
在文章开头我们先陈述下概念
在这篇文章中我们将我们需要提交给线程池执行的 统称为任务如：
``` java
 ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(5, 5,
                0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<Runnable>());
        for (int i=0;i<20;i++){
          //new ThreadDemo("task-"+i)就是一个任务
            threadPoolExecutor.execute(new ThreadDemo("task-"+i));
        }
```

## 一、参数
``` java
/**记录线程池状态以及数量   前三位表示线程池状态 
**初始状态为                  1110  0000  0000  0000  0000  0000  0000  0000*/
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
//线程数量统计位数29  Integer.SIZE为32
private static final int COUNT_BITS = Integer.SIZE - 3;
//线程池容量最大值 二进制     0001  1111  1111  1111  1111  1111  1111  1111 
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;
/**线程池运行状态   JAVA -1二进制为32个1 （二进制首位为1代表）
  **所以二进制为              1110  0000  0000  0000  0000  0000  0000  0000 **/
private static final int RUNNING    = -1 << COUNT_BITS;
//线程池关闭状态 二进制为     0000  0000  0000  0000  0000  0000  0000  0000
private static final int SHUTDOWN   =  0 << COUNT_BITS;
//线程池停止状态 二进制为     0010  0000  0000  0000  0000  0000  0000  0000
private static final int STOP       =  1 << COUNT_BITS;
//线程池整理状态 二进制为     0100  0000  0000  0000  0000  0000  0000  0000
private static final int TIDYING    =  2 << COUNT_BITS;
// 线程池终止状态二进制为     0110  0000  0000  0000  0000  0000  0000  0000
private static final int TERMINATED =  3 << COUNT_BITS;
//这里将一部分方法放到这里来看便于理解线程池的状态
/**返回线程池状态 ~CAPACITY取反操作   正数的补码为正数的原码
**CAPACITY的补码 ~CAPACITY 为 1110  0000  0000  0000  0000  0000  0000  0000 **/   
private static int runStateOf(int c)     { return c & ~CAPACITY; }
//返回线程个数 初始状态 ctl &CAPACITY  为0
private static int workerCountOf(int c)  { return c & CAPACITY; }
//
private static int ctlOf(int rs, int wc) { return rs | wc; }
//存放阻塞任务的队列
private final BlockingQueue<Runnable> workQueue;
//锁
private final ReentrantLock mainLock = new ReentrantLock();
//线程池中正在运行状态的线程（工作线程） 
private final HashSet<Worker> workers = new HashSet<Worker>();
//锁条件
private final Condition termination = mainLock.newCondition();
//
private int largestPoolSize;
//统计已经完成的任务
private long completedTaskCount; 
//线程工厂
private volatile ThreadFactory threadFactory;
//线程池拒绝策略
private volatile RejectedExecutionHandler handler;
//空闲线程存活时间
private volatile long keepAliveTime;
//默认为false，为false时，核心线程空闲时，仍然运行，为true 核心线程数空闲keepAliveTime时间将停止
private volatile boolean allowCoreThreadTimeOut;
//
private volatile int corePoolSize;
//线程池的最大容量，受CAPACITY影响
private volatile int maximumPoolSize;
//
private final AccessControlContext acc;
```
## 二、线程池状态及转换
在上面我们可以看到线程池有五种状态 运行、关闭、停止、整理、终止五种状态。在这里我们先简单画个状态转换图
![thread-pool-2](/image/thread/threadpool/thread-pool-2.webp)
线程池区别线程，对于线程池状态，只能单向转换，并不能像线程一样有些状态可以双向转换，我们平时操作的也是shutdown()、shutdownNow()方法，对于线程池状态由SHUTDOWN(关闭)或STOP(停止)转向TIDYING（整理）状态是由shutdown()或shutdownNow()内部进行自行整理。
shutdown()和shutdownNow()区别在于，shutdown()会等待阻塞任务队列执行完毕（能正常添加阻塞队列中任务到工作线程只可能是RUNNING 状态），shutdownNow会立即向正在运行的工作线程执行中断请求，并且不会将阻塞任务添加到工作线程。
在这里我们先看2个例子，有助于我们理解后续线程池方法（我们可以在后续很条件判断看到线程池状态判断 区分运行或关闭状态为一种情况，其他状态为另一种种情况）。
例1：
```java
public class FixedThreadPoolDemo {

    static class ThreadDemo implements Runnable{

        private String threadName;

        public ThreadDemo(String name){
            threadName= name;
        }
        @Override
        public void run() {
            Date date = new Date();
            SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
            System.out.println("当前线程运行的是："+ threadName+ ",开始时间为："+dateFormat.format(date));

            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    public static void main(String []args) throws InterruptedException {
        ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(5, 5,
                0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<Runnable>());
        for (int i=0;i<20;i++){
            threadPoolExecutor.execute(new ThreadDemo("task-"+i));
        }
        Thread.sleep(5000);
        System.out.println("开始执行shutdown");
        threadPoolExecutor.shutdown();
    }
}
```
因为我们执行的是shutdown()，所以这20个任务都会执行完毕。
``` java
当前线程运行的是：task-2,开始时间为：2019-05-18 :10:38:46
当前线程运行的是：task-0,开始时间为：2019-05-18 :10:38:46
当前线程运行的是：task-1,开始时间为：2019-05-18 :10:38:46
当前线程运行的是：task-4,开始时间为：2019-05-18 :10:38:46
当前线程运行的是：task-3,开始时间为：2019-05-18 :10:38:46
开始执行shutdown
当前线程运行的是：task-5,开始时间为：2019-05-18 :10:38:51
当前线程运行的是：task-8,开始时间为：2019-05-18 :10:38:51
当前线程运行的是：task-6,开始时间为：2019-05-18 :10:38:51
当前线程运行的是：task-7,开始时间为：2019-05-18 :10:38:51
当前线程运行的是：task-9,开始时间为：2019-05-18 :10:38:51
当前线程运行的是：task-10,开始时间为：2019-05-18 :10:38:56
当前线程运行的是：task-11,开始时间为：2019-05-18 :10:38:56
当前线程运行的是：task-13,开始时间为：2019-05-18 :10:38:56
当前线程运行的是：task-14,开始时间为：2019-05-18 :10:38:56
当前线程运行的是：task-12,开始时间为：2019-05-18 :10:38:56
当前线程运行的是：task-15,开始时间为：2019-05-18  :10:39:01
当前线程运行的是：task-18,开始时间为：2019-05-18  :10:39:01
当前线程运行的是：task-19,开始时间为：2019-05-18  :10:39:01
当前线程运行的是：task-17,开始时间为：2019-05-18  :10:39:01
当前线程运行的是：task-16,开始时间为：2019-05-18  :10:39:01
```
例2：
``` java
public class FixedThreadPoolDemo2 {

    static class ThreadDemo implements Runnable{

        private String threadName;

        public ThreadDemo(String name){
            threadName= name;
        }
        @Override
        public void run() {
            Date date = new Date();
            SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
            System.out.println("当前线程运行的是："+ threadName+ ",开始时间为："+dateFormat.format(date));

            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            Date date1 = new Date();
            System.out.println("-----当前线程运行的是："+ threadName + ",结束时间为："+dateFormat.format(date1));
        }
    }

    public static void main(String []args) throws InterruptedException {
        ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(5, 5,
                0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<Runnable>());
        for (int i=0;i<20;i++){
            threadPoolExecutor.execute(new ThreadDemo("task-"+i));
        }
        Thread.sleep(6000);
        System.out.println("开始执行shutdownNow");
        threadPoolExecutor.shutdownNow();
    }
}
```
因为我们执行shutdownNow()方法，所以我们只会执行前10个任务，在前面
[线程状态与方法](https://www.jianshu.com/p/1fe05bd73af9)我们说过interrupt()方法的用处，这里也可以看到当线程执行interrupt()将中断标记置为true，线程被sleep阻塞，则会抛出InterruptedException()异常
``` java
当前线程运行的是：task-4,开始时间为：2019-05-18  :10:43:43
当前线程运行的是：task-0,开始时间为：2019-05-18  :10:43:43
当前线程运行的是：task-3,开始时间为：2019-05-18  :10:43:43
当前线程运行的是：task-2,开始时间为：2019-05-18  :10:43:43
当前线程运行的是：task-1,开始时间为：2019-05-18  :10:43:43
-----当前线程运行的是：task-0,结束时间为：2019-05-18  :10:43:48
-----当前线程运行的是：task-3,结束时间为：2019-05-18  :10:43:48
-----当前线程运行的是：task-2,结束时间为：2019-05-18  :10:43:48
-----当前线程运行的是：task-4,结束时间为：2019-05-18  :10:43:48
-----当前线程运行的是：task-1,结束时间为：2019-05-18  :10:43:48
当前线程运行的是：task-5,开始时间为：2019-05-18  :10:43:48
当前线程运行的是：task-6,开始时间为：2019-05-18  :10:43:48
当前线程运行的是：task-8,开始时间为：2019-05-18  :10:43:48
当前线程运行的是：task-7,开始时间为：2019-05-18  :10:43:48
当前线程运行的是：task-9,开始时间为：2019-05-18  :10:43:48
开始执行shutdownNow
java.lang.InterruptedException: sleep interrupted
-----当前线程运行的是：task-5,结束时间为：2019-05-18  :10:43:49
-----当前线程运行的是：task-8,结束时间为：2019-05-18  :10:43:49
-----当前线程运行的是：task-7,结束时间为：2019-05-18  :10:43:49
-----当前线程运行的是：task-9,结束时间为：2019-05-18  :10:43:49
-----当前线程运行的是：task-6,结束时间为：2019-05-18  :10:43:49
	at java.lang.Thread.sleep(Native Method)
	at com.example.threaddemo.threadpool.FixedThreadPoolDemo2$ThreadDemo.run(FixedThreadPoolDemo2.java:31)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)
java.lang.InterruptedException: sleep interrupted
	at java.lang.Thread.sleep(Native Method)
	at com.example.threaddemo.threadpool.FixedThreadPoolDemo2$ThreadDemo.run(FixedThreadPoolDemo2.java:31)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)
```
这里再注意一点，只有线程池处于RUNNING （运行）状态时,才可以往阻塞任务队列添加任务，在这里我们要区分阻塞任务队列和工作线程。
这里看个例子
``` java
public class FixedThreadPoolDemo3 {

    static ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(5, 5,
                0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<Runnable>());

    static class ThreadDemo implements Runnable{

        private String threadName;

        public ThreadDemo(String name){
            threadName = name;
        }
        @Override
        public void run() {
            Date date = new Date();
            SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
            System.out.println("当前线程运行的是："+ threadName + ",开始时间为："+dateFormat.format(date));
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    static class AddThread implements Runnable{
        @Override
        public void run() {
            //往线程池添加任务进入
            for (int i=0;i<20;i++){
                threadPoolExecutor.execute(new ThreadDemo("task-"+i));
                System.out.println("-------------添加task-"+i);
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    }
    public static void main(String []args) throws InterruptedException {
        Thread thread = new Thread(new AddThread());
        thread.start();
        Thread.sleep(8000);
        System.out.println("开始执行shutdown");
        threadPoolExecutor.shutdown();
    }
}

```
因为只有线程池处于RUNNING （运行）状态时，才可以将多余任务放入阻塞任务队列，处于关闭状态时，线程池只能从阻塞任务队列去轮询，而不能去添加新的阻塞任务。
结果如下
``` java
-------------添加task-0
当前线程运行的是：task-0,开始时间为：2019-05-18  :01:59:38
-------------添加task-1
当前线程运行的是：task-1,开始时间为：2019-05-18  :01:59:39
-------------添加task-2
当前线程运行的是：task-2,开始时间为：2019-05-18  :01:59:40
-------------添加task-3
当前线程运行的是：task-3,开始时间为：2019-05-18  :01:59:41
-------------添加task-4
当前线程运行的是：task-4,开始时间为：2019-05-18  :01:59:42
-------------添加task-5
当前线程运行的是：task-5,开始时间为：2019-05-18  :01:59:43
-------------添加task-6
当前线程运行的是：task-6,开始时间为：2019-05-18  :01:59:44
-------------添加task-7
当前线程运行的是：task-7,开始时间为：2019-05-18  :01:59:45
开始执行shutdown
Exception in thread "Thread-0" java.util.concurrent.RejectedExecutionException: Task com.example.threaddemo.threadpool.FixedThreadPoolDemo3$ThreadDemo@426b98be rejected from java.util.concurrent.ThreadPoolExecutor@763f3e2e[Shutting down, pool size = 4, active threads = 4, queued tasks = 0, completed tasks = 4]
	at java.util.concurrent.ThreadPoolExecutor$AbortPolicy.rejectedExecution(ThreadPoolExecutor.java:2063)
	at java.util.concurrent.ThreadPoolExecutor.reject(ThreadPoolExecutor.java:830)
	at java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1379)
	at com.example.threaddemo.threadpool.FixedThreadPoolDemo3$AddThread.run(FixedThreadPoolDemo3.java:44)
	at java.lang.Thread.run(Thread.java:748)
```
## 三、内部类
### 1、Worker
``` java
 private final class Worker
        extends AbstractQueuedSynchronizer
        implements Runnable
    {
        /**序列化ID**/
        private static final long serialVersionUID = 6138294804551838833L;

        final Thread thread;
     
        Runnable firstTask;

        volatile long completedTasks;

        Worker(Runnable firstTask) {
			//先设置为 -1，防止在构造过程中被中断
            setState(-1);
            this.firstTask = firstTask;
           /**默认采用Executors中内部类DefaultThreadFactory 默认情况下会创建一个相同的线程组，
              这里这个this 把自身传入进去，这是实现线程复用的关键**/
            this.thread = getThreadFactory().newThread(this);
        }
        //这部分重写run方法，因为上面构造thread传入this，所以当thread进行start()方法时，会调用外层重写的这个run()
        public void run() {
            runWorker(this);
        }

        protected boolean isHeldExclusively() {
            return getState() != 0;
        }
         //🔥 因为我们刚开始将state状态置为-1，所以shutdown加锁会不成功
        protected boolean tryAcquire(int unused) {
            if (compareAndSetState(0, 1)) {
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;
        }

        protected boolean tryRelease(int unused) {
            setExclusiveOwnerThread(null);
            setState(0);
            return true;
        }

        public void lock()        { acquire(1); }
        public boolean tryLock()  { return tryAcquire(1); }
        public void unlock()      { release(1); }
        public boolean isLocked() { return isHeldExclusively(); }
        //这里后续shutdownNow方法会调用到
        void interruptIfStarted() {
            Thread t;
            if (getState() >= 0 && (t = thread) != null && !t.isInterrupted()) {
                try {
                    t.interrupt();
                } catch (SecurityException ignore) {
                }
            }
        }
    }

```
## 四、方法
### 1、ThreadPoolExecutor
线程池的构造方法都是通过这个构造方法实现的
```java
    public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory,
                              RejectedExecutionHandler handler) {
        if (corePoolSize < 0 ||
            maximumPoolSize <= 0 ||
            maximumPoolSize < corePoolSize ||
            keepAliveTime < 0)
            throw new IllegalArgumentException();
        if (workQueue == null || threadFactory == null || handler == null)
            throw new NullPointerException();
        this.acc = System.getSecurityManager() == null ?
                null :
                AccessController.getContext();
        this.corePoolSize = corePoolSize;
        this.maximumPoolSize = maximumPoolSize;
        this.workQueue = workQueue;
        this.keepAliveTime = unit.toNanos(keepAliveTime);
        this.threadFactory = threadFactory;
        this.handler = handler;
    }
```
### 2、execute
提交任务，如果可以线程池可以开启新的任务，则执行，否则这个任务会放到阻塞任务队列，或者拒绝任务。
```java
 public void execute(Runnable command) {
        if (command == null)
            throw new NullPointerException();
         //获取线程池状态以及数量 初始状态为线程池运行状态
        int c = ctl.get();
        /**在这里进行三步判断
        *   1.如果线程池中线程数量小于线程池核心线程数，则去尝试新增线程
        *  这里我们考虑个问题Q1 :为什么这里没有对线程池状态进行判断**/
        if (workerCountOf(c) < corePoolSize) {
            if (addWorker(command, true))
                return;
            c = ctl.get();
        }
         /**2.如果线程池处于运行状态并且可以将任务添加进入阻塞任务队列 
        *offer为各个队列实现的方法，后续文章讲解**/
        if (isRunning(c) && workQueue.offer(command)) {
            int recheck = ctl.get();
           /**如果线程不是运行状态并且可以从阻塞队列移除任务（加锁操作）
            *这里我们考虑个问题Q2:如果线程池在上面一层判断是处于运行状态，且
           *已经成功加入到阻塞队列，中间调用shutdown方法，线程池状态变为关闭
           *状态，那么此时将从阻塞队列移除掉这个任务吗？ **/
            if (! isRunning(recheck) && remove(command))
                reject(command);
           //当前线程池中工作线程数为0
            else if (workerCountOf(recheck) == 0)
             //这里因为上面已经将任务添加到阻塞任务队列，所以传null进入，等待线程轮询任务
                addWorker(null, false);
        }
        /**3.添加新增线程失败（对比maximumPoolSize ） 则执行拒绝策略**/
        else if (!addWorker(command, false))
            reject(command);
    }
```
关于问题Q2.我们可以做个例子验证下，在这个例子中我们要把ThreadPoolExecutor源码修改如下（采取将源码复制出来修改部分代码，后续会放上代码链接），具体如下
```java
/**对于ThreadPoolExecutor类中execute方法修改如下，不想直接改源码，所以采用
*的将源码复制出来**/
if (isRunning(c) && workQueue.offer(command)) {
            System.out.println("第一次判断线程池状态是否运行状态："+isRunning(c));
            //休眠一段时间，保证后续状态改变
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            int recheck = ctl.get();
            System.out.println("第二次判断线程池状态是否运行状态："+isRunning(recheck));
            if (! isRunning(recheck) && remove(command)) {
                System.out.println("####任务被拒绝");
                reject(command);
            } else if (workerCountOf(recheck) == 0) {
                addWorker(null, false);
            }
        }

public class FixedThreadPoolDemo4 {

    static ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(5, 5,
            0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<Runnable>());

    static class ThreadDemo implements Runnable{

        private String threadName;

        public ThreadDemo(String name){
            threadName = name;
        }
        @Override
        public void run() {
            Date date = new Date();
            SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
            System.out.println("当前线程运行的是："+ threadName + ",开始时间为："+dateFormat.format(date));
            try {
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            Date date1 = new Date();
            System.out.println("-----当前线程运行的是："+ threadName + ",结束时间为："+dateFormat.format(date1));
        }
    }

    static class AddThread implements Runnable{
        @Override
        public void run() {
            //往线程池添加任务进入
            for (int i=0;i<20;i++){
                System.out.println("-------------添加task-"+i+"开始");
                threadPoolExecutor.execute(new ThreadDemo("task-"+i));
                System.out.println("-------------添加task-"+i+"结束");
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
             }
        }
    }

    static class UpdateThread implements Runnable{

        @Override
        public void run() {
            Date date = new Date();
            SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
            System.out.println("执行线程池关闭开始时间："+dateFormat.format(date));
            threadPoolExecutor.shutdown();
            Date date1 = new Date();
            System.out.println("执行线程池关闭关闭时间："+dateFormat.format(date));
        }
    }
    public static void main(String []args) throws InterruptedException {
        Thread thread = new Thread(new AddThread());
        thread.start();
        Thread.sleep(6000);
        Thread thread1 = new Thread(new UpdateThread());
        thread1.start();
    }
}
```
因为我们在第二次读取线程池状态前进行了shutdown操作，所以导致线程池直接拒绝任务，结果如下（对于其中的空指针异常可以忽略，因为在复制出来的ThreadPoolExecutor类代码部分要reject()引用jre原来的类,为了编译通过将传递对象置为空）。
```java
-------------添加task-0开始
-------------添加task-0结束
当前线程运行的是：task-0,开始时间为：2019-05-18 :02:25:10
-------------添加task-1开始
-------------添加task-1结束
当前线程运行的是：task-1,开始时间为：2019-05-18 :02:25:11
-------------添加task-2开始
-------------添加task-2结束
当前线程运行的是：task-2,开始时间为：2019-05-18 :02:25:12
-------------添加task-3开始
-------------添加task-3结束
当前线程运行的是：task-3,开始时间为：2019-05-18 :02:25:13
-------------添加task-4开始
-------------添加task-4结束
当前线程运行的是：task-4,开始时间为：2019-05-18 :02:25:14
-------------添加task-5开始
第一次判断线程池状态是否运行状态：true
执行线程池关闭开始时间：2019-05-18 :02:25:16
执行线程池关闭关闭时间：2019-05-18 :02:25:16
第二次判断线程池状态是否运行状态：false
####任务被拒绝
Exception in thread "Thread-0" java.lang.NullPointerException
-----当前线程运行的是：task-0,结束时间为：2019-05-18 :02:25:20
	at com.example.threaddemo.util.ThreadPoolExecutor$AbortPolicy.rejectedExecution(ThreadPoolExecutor.java:1859)
	at com.example.threaddemo.util.ThreadPoolExecutor.reject(ThreadPoolExecutor.java:563)
	at com.example.threaddemo.util.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1138)
	at com.example.threaddemo.threadpool.FixedThreadPoolDemo4$AddThread.run(FixedThreadPoolDemo4.java:50)
	at java.lang.Thread.run(Thread.java:748)
-----当前线程运行的是：task-1,结束时间为：2019-05-18 :02:25:21
-----当前线程运行的是：task-2,结束时间为：2019-05-18 :02:25:22
-----当前线程运行的是：task-3,结束时间为：2019-05-18 :02:25:23
-----当前线程运行的是：task-4,结束时间为：2019-05-18 :02:25:24

```
关于execute方法流程图如下
![thread-pool-3](/image/thread/threadpool/thread-pool-3.webp)

**线程池创建线程可以简化为以下**
```
提交任务
   ↓
[1] 当前线程数 < corePoolSize ?
       ├─ 是：创建核心线程
       └─ 否：
            ↓
[2] 队列未满 ?
       ├─ 是：任务进入队列等待
       └─ 否：
            ↓
[3] 当前线程数 < maximumPoolSize ?
       ├─ 是：创建非核心线程
       └─ 否：拒绝任务（执行拒绝策略）

```



### 3、addWorker
addWorker向线程池新增线程，返回true代表线程新增并且启动成功。
以下几种情况会添加失败
- 1.线程池处于停止、整理、终止状态 
- 2.线程池状态为关闭状态 , firstTask 不为空或者workQueue为空
- 3.线程池线程数大于核心线程数或者最大线程数 （core决定）
```java
 private boolean addWorker(Runnable firstTask, boolean core) {
        retry:
        for (;;) {
            int c = ctl.get();
            int rs = runStateOf(c);
            /***  condition1
              ** 1.rs>=SHUTDOWN  线程池处于者停止、整理、终止、关闭状态
             **   2.! (rs == SHUTDOWN &&firstTask == null &&! workQueue.isEmpty())
             **    这个表达式会为true是以下几种情况：
             **    --线程池处于停止、整理、终止状态  
             **    --  firstTask 不为空，线程池状态为 关闭状态   
             **    -- workQueue 为空，线程池状态为 关闭状态   
             **  整体表达式成立的话是以下三种情况中一种或者多种
             **    --线程池处于停止、整理、终止状态  
             **    --firstTask 不为空 ，线程池状态为关闭状态      
             **    --workQueue 为空，线程池状态为关闭状态   
             **  整体表达式不成立是以下几种情况之一
             **   --线程池处于运行状态
             **   --线程池处于关闭状态且firstTask =null且workQueue不为空
             **  我们之前在二、线程池状态及转换中简单介绍了线程池状态，对于可以
             **  添加到工作线程，只可能是线程是处于运行状态或者线程池关闭状态
             **对于关机状态而言，我们只能添加阻塞队列中的任务到工作线程，这也
            ** 印证了我们之前的问题 Q1
             ***/
            if (rs >= SHUTDOWN &&
                ! (rs == SHUTDOWN &&
                   firstTask == null &&
                   ! workQueue.isEmpty()))
                return false;

            for (;;) {
                int wc = workerCountOf(c);
             //判断是否超出工作线程最大值
                if (wc >= CAPACITY ||
                    wc >= (core ? corePoolSize : maximumPoolSize))
                    return false;
                //CAS操作成功，则跳出循环
                if (compareAndIncrementWorkerCount(c))
                    break retry;
                c = ctl.get();  
               //如果线程池状态发生改变，则去检查是否符合condition1
                if (runStateOf(c) != rs)
                    continue retry;
            }
        }

        boolean workerStarted = false;
        boolean workerAdded = false;
        Worker w = null;
        try {
            w = new Worker(firstTask);
            final Thread t = w.thread;
            if (t != null) {
                final ReentrantLock mainLock = this.mainLock;
                mainLock.lock();
                try {
                    int rs = runStateOf(ctl.get());
                    //线程池处于运行中状态或者线程池处于关闭状态并且firstTask 为null
                    if (rs < SHUTDOWN ||
                        (rs == SHUTDOWN && firstTask == null)) {
                        if (t.isAlive()) 
                            throw new IllegalThreadStateException();
                        workers.add(w);
                        int s = workers.size();            
                        if (s > largestPoolSize)
                            largestPoolSize = s;
                        workerAdded = true;
                    }
                } finally {
                    mainLock.unlock();
                }
                if (workerAdded) {
                  //因为前面判断了核心线程数和最大线程数，所以只有有限个核心线程数或者最大线程数线程可以启动
                    t.start();
                    workerStarted = true;
                }
            }
        } finally {
            if (! workerStarted)
               //处理失败线程
                addWorkerFailed(w);
        }
        return workerStarted;
    }
```
关于此方法流程图如下

![thread-pool-4](/image/thread/threadpool/thread-pool-4.webp)

### 4、runWorker

前面在内部类说了下，创建 `Worker` 时构建 `thread` 会将自身传入进去，所以当 `thread` 调用 `start` 方法，会调用 `Worker` 中的 `run` 方法，`run` 方法调用 `runWorker()` 方法。也就是说，我们创建了多少个线程（取决于 `corePoolSize`、`maximumPoolSize`），就会执行多少次 `runWorker()` 方法。

我们提交给线程池的任务就是 `firstTask`，这里我们强调一个概念，虽然我们提交给线程池的任务一般都是实现 `Runnable` 接口或者继承 `Thread` 类，但是我们没有 `start()` 这些实例，所以这些任务还是单纯的实例，并不是线程。

我们执行任务的 `run()` 方法，和执行普通方法没有什么差别。这样我们才能在方法中轮询任务（如果不是这样的话，我们每次在方法中新启线程，对于新的线程我们是没法做到栈同步）。

换句话说，如果我们任务实现的 `Runnable` 接口包含一个 `test` 方法，如果下面源码中 `task.run()`，换成 `task.test()`，我们只需要在我们任务重写 `test` 方法中实现我们的逻辑，提交到线程池也是会正常执行的（这个例子有个前提是线程 `start` 方法也会调用 `test` 方法）。

```java
    final void runWorker(Worker w) {
        Thread wt = Thread.currentThread();
        Runnable task = w.firstTask;
        w.firstTask = null;
		// 🔥 这里将 state 从 -1 改成 0，使 tryLock() 可用,也可以被中断
        w.unlock(); 
        boolean completedAbruptly = true;
        try {
            while (task != null || (task = getTask()) != null) {
				// 🔒 state = 1，表示线程正在执行任务
                w.lock();
               /**Thread.interrupted() 保证清除线程中断状态
                **这个表达式保证线程池处于运行或关闭状态 中断状态标记清除
                **线程池处于停止、整理、终止状态 线程中断
                **/
                if ((runStateAtLeast(ctl.get(), STOP) ||
                     (Thread.interrupted() &&
                      runStateAtLeast(ctl.get(), STOP))) &&
                    !wt.isInterrupted())
                    wt.interrupt();
                try {
                    beforeExecute(wt, task);
                    Throwable thrown = null;
                    try {
                       //这个和执行普通方法没有什么区别，并不是线程start方法后需要调用 run方法
                        task.run();
                    } catch (RuntimeException x) {
                        thrown = x; throw x;
                    } catch (Error x) {
                        thrown = x; throw x;
                    } catch (Throwable x) {
                        thrown = x; throw new Error(x);
                    } finally {
                        afterExecute(task, thrown);
                    }
                } finally {
                    task = null;
                    w.completedTasks++;
					// 🔓 state = 0，任务执行完释放锁
                    w.unlock();
                }
            }
            //判断线程有没有发生异常
            completedAbruptly = false;
        } finally {
            processWorkerExit(w, completedAbruptly);
        }
    }
```
### 5、getTask
获取阻塞队列中的任务
这个方法中包含对keepAliveTime判断，如果当前阻塞队列没有任务，我们设置了keepAliveTime，则阻塞队列会在有限时间内做出返回，如果我们不设置，则会一直等待直到有新的任务加入（在此期间会一直执行在 workQueue.take()，导致线程中代码不往下执行，所以线程不会被回收），


**其实这个里面我们还可以看到一个信息，代码中判断当前活跃线程数大于核心线程数（非核心线程数），才会空闲销毁线程，
其实也是是 核心和非核心线程是通过 当前活跃线程数判断的**
```java
    private Runnable getTask() {
        boolean timedOut = false; // Did the last poll() time out?

        for (;;) {
            int c = ctl.get();
            int rs = runStateOf(c);

            /** 有2种情况会不通过，也就是我们上面说的 线程状态分为2种 大多数情况下
              **1.线程处于运行状态
              **2.线程处于关闭状态而且阻塞队列不为空*/
            if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
                decrementWorkerCount();
                return null;
            }
            int wc = workerCountOf(c);

            // 判断当前工作线程数大于核心线程数或allowCoreThreadTimeOut 
            boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;
             // 当前工作线程数大于最大线程数
            if ((wc > maximumPoolSize || (timed && timedOut))
                && (wc > 1 || workQueue.isEmpty())) {
                if (compareAndDecrementWorkerCount(c))
                    return null;
                continue;
            }

            try {
                Runnable r = timed ?
                    /**阻塞队列各自实现类实现  ，后续讲解（这些方法会在阻塞队列中移除掉任务）
                      *poll 如果当前队列为空，则等待keepAliveTime时间返回
                      *take队列为空，则一直等待
                      *这个是实现线程池工作线程空闲时间基础
                      * 如果我们没有设置keepAliveTime，则当任务执行完毕，线程池中线程* 
                      *会一直等待新的任务**/                     
                    workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
                    workQueue.take();
                if (r != null)
                    return r;
                timedOut = true;
            } catch (InterruptedException retry) {
                timedOut = false;
            }
        }
    }
```
### 6、processWorkerExit
 当线程中没有任务时执行整理线程
```java
    private void processWorkerExit(Worker w, boolean completedAbruptly) {
      //线程发生异常，线程数减一
       if (completedAbruptly) 
            decrementWorkerCount();

        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            //统计任务完成数
            completedTaskCount += w.completedTasks;
           // 
           workers.remove(w);
        } finally {
            mainLock.unlock();
        }
       //整理线程池
        tryTerminate();

        int c = ctl.get();
        //线程池处于运行或者关闭状态去检查存活线程数量，维持一个空的线程
        if (runStateLessThan(c, STOP)) {
            if (!completedAbruptly) {
                int min = allowCoreThreadTimeOut ? 0 : corePoolSize;
                if (min == 0 && ! workQueue.isEmpty())
                    min = 1;
                if (workerCountOf(c) >= min)
                    return;
            }
            addWorker(null, false);
        }
    }
```
### 7、tryTerminate
```java
    final void tryTerminate() {
        for (;;) {
            int c = ctl.get();
             /**排除 1、线程池处于运行状态   2、线程池处于整理状态 
               *     3、线程池处于终止状态   4、线程池处于关闭状态但是阻塞队列不为空**/
            if (isRunning(c) ||
                runStateAtLeast(c, TIDYING) ||
                (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty()))
                return;
            if (workerCountOf(c) != 0) { 
               //尝试去中断工作线程
                interruptIdleWorkers(ONLY_ONE);
                return;
            }

            final ReentrantLock mainLock = this.mainLock;
            mainLock.lock();
           //提供一些方法以供后续子类使用
            try {
                if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {
                    try {
                        terminated();
                    } finally {
                        ctl.set(ctlOf(TERMINATED, 0));
                        termination.signalAll();
                    }
                    return;
                }
            } finally {
                mainLock.unlock();
            }
        }
    }
```
### 8、shutdown
这里我们看下前面说shutdown方法和shutdownNow方法区别
```java
    public void shutdown() {
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            //检查权限
            checkShutdownAccess();
          //线程池状态置为 关闭状态
            advanceRunState(SHUTDOWN);
            interruptIdleWorkers();
           //子类实现
            onShutdown(); 
        } finally {
            mainLock.unlock();
        }
        tryTerminate();
    }

  private void interruptIdleWorkers() {
        interruptIdleWorkers(false);
    }
//尝试去中断线程
  private void interruptIdleWorkers(boolean onlyOne) {
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            for (Worker w : workers) {
                Thread t = w.thread;
                /**注意这里调用内部类tryLock方法 ,因为我们刚开始将state状态置为-1，所 
                    *以shutdown加锁会不成功,直到队列中任务执行完毕，线程被删除**/
                if (!t.isInterrupted() && w.tryLock()) {
                    try {
                        t.interrupt();
                    } catch (SecurityException ignore) {
                    } finally {
                        w.unlock();
                    }
                }
                if (onlyOne)
                    break;
            }
        } finally {
            mainLock.unlock();
        }
    }


```
### 9、shutdownNow
```java
    public List<Runnable> shutdownNow() {
        List<Runnable> tasks;
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            checkShutdownAccess();
           //线程池状态置为停止
            advanceRunState(STOP);
            interruptWorkers();
            tasks = drainQueue();
        } finally {
            mainLock.unlock();
        }
        tryTerminate();
        return tasks;
    }

    private void interruptWorkers() {
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            for (Worker w : workers)
                w.interruptIfStarted();
        } finally {
            mainLock.unlock();
        }
    }

    void interruptIfStarted() {
            Thread t;
            if (getState() >= 0 && (t = thread) != null && !t.isInterrupted()) {
                try {
                    //直接中断线程
                    t.interrupt();
                } catch (SecurityException ignore) {
                }
            }
        }
 
```
Worker 中的 state 变化流转
```
Worker() 构造     →  state = -1
   ↓
runWorker() 开始   →  state = 0  (w.unlock())
   ↓
执行任务时         →  state = 1  (w.lock())
   ↓
任务执行完         →  state = 0  (w.unlock())
```
shutdown 和 shutdownNow最主要区别是 tryLock的处理


示例代码地址https://github.com/endlesswork/thread-demo