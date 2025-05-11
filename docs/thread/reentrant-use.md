在开始先简单说几个概念
- 重入锁：可以多次对一个锁进行获取
- 互斥锁：有一个线程1访问了互斥锁修改的代码块，在访问期间其他线程就得等待，
也就是其他线程只能等待解锁后，其他线程才可以访问加锁代码块
- 共享锁：区别互斥锁，多个线程可以对一个加锁代码块同时访问

ReentrantLock 的特点: 可重入、可中断、可限时、公平锁、互斥锁

公平锁机制因为要维持先来先得，所以性能相对差一点
## 1、可重入lock
```java
public class ReentrantLockDemo implements Runnable {

    public static int i =0;

    public  ReentrantLock reentrantLock =new ReentrantLock();

    @Override
    public void run() {
        for (int j=0;j<10000;j++){
            //加锁2次  可重入
            reentrantLock.lock();
            reentrantLock.lock();
            try {
                i++;
            }finally {
                //保证锁可以释放掉;加锁多少次就要释放多少次，不然会死锁
                if (reentrantLock.isHeldByCurrentThread()){
                    reentrantLock.unlock();
                }
                if (reentrantLock.isHeldByCurrentThread()){
                    reentrantLock.unlock();
                }
            }
        }
    }

    public static void main(String args[]) throws InterruptedException {
        ReentrantLockDemo reentrantLockDemo = new ReentrantLockDemo();
        Thread thread1 = new Thread(reentrantLockDemo);
        Thread thread2 = new Thread(reentrantLockDemo);
        thread1.start();thread2.start();
        thread1.join();thread2.join();
        System.out.println(i);
    }
}
```
lock()：
- 1.如果当前线程可以获取到锁，则获取锁，锁数量为1
- 2.如果当前线程已经持有锁。则锁数量+1
- 3.如果当前线程获取不到锁，则等待获取

## 2、可中断的lock lockInterruptibly()

我们看个例子， 在样例中我们造就了一个死锁样例

- Thread 1 获取 reentrantLock1，然后等待获取 reentrantLock2。

- Thread 2 获取 reentrantLock2，然后等待获取 reentrantLock1。

此时，Thread 1 和 Thread 2 互相持有对方需要的锁，形成了死锁。

我们通过 DeadLockChecker.check()去检查死锁，并且中断掉死锁

**如果我们使用了lock()，这种情况下,死锁并不会被中断**
```java
public class ReentrantLockDemo2 implements Runnable{

    public  static ReentrantLock reentrantLock1 = new ReentrantLock();

    public  static ReentrantLock reentrantLock2 = new ReentrantLock();

    public  int lock;

    public ReentrantLockDemo2(int lock){
        this.lock = lock;
    }

    @Override
    public void run() {
        try {
            if (lock==1) {
                reentrantLock1.lockInterruptibly();
                Thread.sleep(1000);
                reentrantLock2.lockInterruptibly();
            }else{
                reentrantLock2.lockInterruptibly();
                Thread.sleep(1000);
                reentrantLock1.lockInterruptibly();
            }
        }catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            if (reentrantLock1.isHeldByCurrentThread()){
                reentrantLock1.unlock();
                System.out.println("锁1释放");
            }
            if (reentrantLock2.isHeldByCurrentThread()){
                reentrantLock2.unlock();
                System.out.println("锁2释放");
            }
        }
    }

    public static void main(String args[]) throws InterruptedException {
        Thread thread1= new Thread(new ReentrantLockDemo2(1));
        Thread thread2 = new Thread(new ReentrantLockDemo2(2));
        thread1.start();
        thread2.start();
        Thread.sleep(2000);
        //中断掉死锁
        DeadLockChecker.check();
    }

    public static class DeadLockChecker implements Runnable{
        @Override
        public void run() {
            ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
            long[] deadThreads = threadMXBean.findDeadlockedThreads();
            if (deadThreads != null) {
                ThreadInfo[] threadInfos = threadMXBean.getThreadInfo(deadThreads);
                for (ThreadInfo threadInfo : threadInfos) {
                    for (Thread thread1 : Thread.getAllStackTraces().keySet()) {
                        if (thread1.getId() == threadInfo.getThreadId()) {
                            thread1.interrupt();
                        }
                    }
                }
            }
        }

        public static void check(){
            Thread thread = new Thread(new DeadLockChecker());
            thread.setDaemon(true);
            thread.start();
        }

    }
```

## 3.Condition用法
condition执行前必须获取到锁
reentrantLock与condition其实类似synchronized 和wait/notify,但是前者锁的力度相对较小，并且提供了不可中断的等待方法awaitUninterruptibly
``` java
public class ConditionDemo implements Runnable{

    public  static ReentrantLock reentrantLock = new ReentrantLock();

    public static Condition condition =reentrantLock.newCondition();

    @Override
    public void run() {
        try {
            reentrantLock.lock();
            System.out.println("等待condition");
            condition.await();
            System.out.println("我又继续执行了");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            reentrantLock.unlock();
        }
    }

    public static void main(String args[]) throws InterruptedException {
        ConditionDemo conditionDemo = new ConditionDemo();
        Thread thread = new Thread(conditionDemo);
        thread.start();
        Thread.sleep(5000);
        reentrantLock.lock();
        System.out.println("我要通知condition");
        condition.signal();
        reentrantLock.unlock();
    }
}

```
结果如下
```log
等待condition
我要通知condition
我又继续执行了
```
再看个例子，加深对Condition的用法
``` java
public class ConditionDemo2 {

    public  static ReentrantLock reentrantLock = new ReentrantLock();

    public static Condition condition =reentrantLock.newCondition();

    static class ThreadDemo  implements Runnable{
        @Override
        public void run() {
            try {
                reentrantLock.lock();
                System.out.println("线程1等待condition:"+getDate());
                condition.await();
                System.out.println("线程1又继续执行了:"+getDate());
            } catch (InterruptedException e) {
                e.printStackTrace();
            }finally {
                reentrantLock.unlock();
            }
        }
    }

    static class ThreadDemo1  implements Runnable{
        @Override
        public void run() {

            System.out.println("线程2执行开始:"+getDate());
            try {
                reentrantLock.lock();
                reentrantLock.lock();
                condition.signal();
                System.out.println("线程2休眠开始:"+getDate());
                Thread.sleep(10000);
                System.out.println("线程2休眠结束:"+getDate());
            } catch (InterruptedException e) {
                e.printStackTrace();
            } finally {
                reentrantLock.unlock();
                reentrantLock.unlock();
            }
            System.out.println("线程2执行结束:"+getDate());
        }
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }

    public static void main(String []args) throws InterruptedException {
        Thread thread = new Thread(new ThreadDemo());
        Thread thread1 = new Thread(new ThreadDemo1());
        thread.start();
        Thread.sleep(1000);
        thread1.start();
    }
}
```
结果如下,可以看到await会释放掉锁（加锁2次都会释放掉），但是signal不会释放掉锁
``` log
线程1等待condition:2019-05-19 :06:28:51
线程2执行开始:2019-05-19 :06:28:52
线程2休眠开始:2019-05-19 :06:28:52
线程2休眠结束:2019-05-19 :06:29:02
线程2执行结束:2019-05-19 :06:29:02
线程1又继续执行了:2019-05-19 :06:29:02
```
