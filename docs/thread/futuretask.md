首先我们看下FutureTask与其他接口的关系图

![futuretask](/image/thread/futuretask/futuretask.webp)

可以看到FutureTask实现了RunnableFuture，RunnableFuture继承了Runnable和Future接口。
### 在我们的demo例子中 FutureTask如何得知线程执行完毕的。

```java
    //FutureTask类
    private volatile int state;
    private static final int NEW          = 0;
    private static final int COMPLETING   = 1;
    private static final int NORMAL       = 2;
    private static final int EXCEPTIONAL  = 3;
    private static final int CANCELLED    = 4;
    private static final int INTERRUPTING = 5;
    private static final int INTERRUPTED  = 6;
    //当我们new出来FutureTask时候，这个state为0
    public FutureTask(Runnable runnable, V result) {
        //调用了Executors中的方法
        this.callable = Executors.callable(runnable, result);
        this.state = NEW;       
    }
```
```java
  // Executors类
  public static <T> Callable<T> callable(Runnable task, T result) {
        if (task == null)
            throw new NullPointerException();
        return new RunnableAdapter<T>(task, result);
    }
   static final class RunnableAdapter<T> implements Callable<T> {
        final Runnable task;
        final T result;
        RunnableAdapter(Runnable task, T result) {
            this.task = task;
            this.result = result;
        } 
        //在重写call方法中会调用task的run方法。
        public T call() {
            task.run();
            return result;
        }
    }
```
我们执行线程start之后，因为FutureTask实现了RunnableFuture，RunnableFuture继承了Runnable和Future接口，所以我们会运行到FutureTask的run方法。
```java
    // FutureTask类
    public void run() {
        if (state != NEW ||
            !UNSAFE.compareAndSwapObject(this, runnerOffset,
                                         null, Thread.currentThread()))
            return;
        try {
            Callable<V> c = callable;
            if (c != null && state == NEW) {
                V result;
                boolean ran;
                try {
                    /*call会调用call中Runnable的run方法,所以 call会调用我们demo中 
                      重写的run方法 */
                    result = c.call();
                    ran = true;
                } catch (Throwable ex) {
                    result = null;
                    ran = false;
                    setException(ex);
                }
               //如果正确执行完run的内容，则去置state的状态
                if (ran)
                    set(result);
            }
        } finally {
            runner = null;
            int s = state;
            if (s >= INTERRUPTING)
                handlePossibleCancellationInterrupt(s);
        }
    }
   //修改state装填并且唤醒挂起的线程
   protected void set(V v) {
        if (UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)) {
            outcome = v;
            UNSAFE.putOrderedInt(this, stateOffset, NORMAL); 
            finishCompletion();
        }
    }
   //当任务执行完毕会唤醒所有挂起的线程，这里的waiters是一个链表
    private void finishCompletion() {
        for (WaitNode q; (q = waiters) != null;) {
           // CAS直接将挂起线程链表waiters指向为空
            if (UNSAFE.compareAndSwapObject(this, waitersOffset, q, null)) {
                 //唤醒所有挂起的线程
                for (;;) {
                    Thread t = q.thread;
                    if (t != null) {
                        q.thread = null;
                        LockSupport.unpark(t);
                    }
                    WaitNode next = q.next;
                    if (next == null)
                        break;
                    q.next = null; 
                    q = next;
                }
                break;
            }
        }
        done();
        callable = null;      
    }
```
在demo中，当我们执行FutureTask类的get方法时
```java
  public V get() throws InterruptedException, ExecutionException {
        int s = state;
        if (s <= COMPLETING)
            s = awaitDone(false, 0L);
        return report(s);
    }
 // 获取state的状态
   private int awaitDone(boolean timed, long nanos)
        throws InterruptedException {
        final long deadline = timed ? System.nanoTime() + nanos : 0L;
        WaitNode q = null;
        boolean queued = false;
        for (;;) {
            if (Thread.interrupted()) {
                removeWaiter(q);
                throw new InterruptedException();
            }
            int s = state;
            //如果处于已经完成或者异常状态，直接返回
            if (s > COMPLETING) {
                if (q != null)
                    q.thread = null;
                return s;
            }
            //如果处于COMPLETING，则让线程再次参与竞争cpu
            else if (s == COMPLETING) 
                Thread.yield();
            else if (q == null)
                q = new WaitNode();
            else if (!queued)
                //形成一个后进先出的链表
                queued = UNSAFE.compareAndSwapObject(this, waitersOffset,
                                                     q.next = waiters, q);
            else if (timed) {
                nanos = deadline - System.nanoTime();
                if (nanos <= 0L) {
                    removeWaiter(q);
                    return state;
                }
                  //线程挂起
                LockSupport.parkNanos(this, nanos);
            }
            else
              //线程挂起
                LockSupport.park(this);
        }
    }
```
在上面的源码中，我们可以看出来，awaitDone方法中我们会对比当前state，如果state==new，我们会将线程挂起，等待finishCompletion方法中唤醒挂起的线程。
```java
private V report(int s) throws ExecutionException {
        Object x = outcome;
        //如果线程正确执行完毕，则返回结果，否则抛出异常
        if (s == NORMAL)
            return (V)x;
        if (s >= CANCELLED)
            throw new CancellationException();
        throw new ExecutionException((Throwable)x);
    }
```