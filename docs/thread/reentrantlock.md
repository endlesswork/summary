ReentrantLock是公平锁、可重入锁
ReentrantLock是通过AQS实现的，内部类Sync继承AbstractQueuedSynchronizer，几个内部类的关系图如下
![image.png](https://upload-images.jianshu.io/upload_images/15302255-04b2f99dcf7b08e5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/15302255-0bcad707bd67a4a6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
FairSync和NonfairSync继承Sync，
初始化ReentrantLock时，如果不指定公平锁，ReentrantLock默认为非公平锁
# 一、参数
```
    //独占模式的线程拥有者，位于AbstractOwnableSynchronizer类中
    private transient Thread exclusiveOwnerThread;
     /**FIFO队列中的头Node 位于AbstractQueuedSynchronizer类中**/
    private transient volatile Node head;
     /***FIFO队列中的尾Node 位于AbstractQueuedSynchronizer类中**/
    private transient volatile Node tail;
   /***当前锁状态 位于AbstractQueuedSynchronizer类中**/
    private volatile int state;
```
# 二、内部类
## 1、AbstractQueuedSynchronizer内部类Node 
```
    static final class Node {
       //表示Node处于共享模式
        static final Node SHARED = new Node();
        //独占模式 始终为空
        static final Node EXCLUSIVE = null;
        //因为异常情况需要清除node队列状态
        static final int CANCELLED =  1;
        //线程处于阻塞状态 ，等待被唤醒，一般先将waitStatus=-1然后LockSupport.park()
        static final int SIGNAL    = -1;
       //调用condition.await 存放条件等待队列状态
        static final int CONDITION = -2;
     //共享模式使用
        static final int PROPAGATE = -3;
         //节点等待状态 也就是上面说的 1 、-1、-2、-3
        volatile int waitStatus;
       //链表节点上一个节点
        volatile Node prev;
       //链表节点下一个节点
        volatile Node next;
       //当前线程
        volatile Thread thread;
       //
        Node nextWaiter;

        final boolean isShared() {
            return nextWaiter == SHARED;
        }

        final Node predecessor() throws NullPointerException {
            Node p = prev;
            if (p == null)
                throw new NullPointerException();
            else
                return p;
        }

        Node() {    
        }

        Node(Thread thread, Node mode) {     
            this.nextWaiter = mode;
            this.thread = thread;
        }

        Node(Thread thread, int waitStatus) { 
            this.waitStatus = waitStatus;
            this.thread = thread;
        }
    }
```
## 2、AbstractQueuedSynchronizer内部类ConditionObject 
在这里我们看下为什么我们在操作await和signal时候需要获取到锁（这是锁肯定要实现的功能，在不考虑共享锁情况下，多线程并发处理临界条件，本质上还是让一个线程去每次读写临界条件，其他线程就得挂起，试想如果await不需要获取锁就可以操作其他线程持有的锁，这样代码就会变得极难控制）
```
public class ConditionObject implements Condition, java.io.Serializable {
        private static final long serialVersionUID = 1173984872572414699L;
        /**条件队列的第一个节点 */
        private transient Node firstWaiter;
        /** 条件队列的最后一个节点 */
        private transient Node lastWaiter;

        public ConditionObject() { }

    }


```
# 三、方法实现
## 1.lock()非公平锁实现
lock()实现，如果获取到锁则state+1，获取不到则放入到双向链表，
```
final void lock() {
    /**如果state初始值为0（代表没有加锁），则更新为1，并且将当前线程对象
     **保存exclusiveOwnerThread中**/
    if (compareAndSetState(0, 1))
        setExclusiveOwnerThread(Thread.currentThread());
    else
        acquire(1);
}
//AbstractQueuedSynchronizer类中
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
       //当前线程中断
        selfInterrupt();
}  
//NonfairSync内部类中
protected final boolean tryAcquire(int acquires) {
    return nonfairTryAcquire(acquires);
}

final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        /**有可能存在上一个线程占用，但是当前线程没在lock()里面获取到锁
         **运行到这里发现锁空闲，则直接加锁*/
        if (compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    /**如果锁已经被占用，并且当前线程和加锁线程一致，则重复加锁（可重入
     **锁），state+1
     **getExclusiveOwnerThread()获取到的是exclusiveOwnerThread的值*/
    else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0) // overflow
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    //其他情况返回失败
    return false;
}
    //添加等待队列   
    private Node addWaiter(Node mode) {
        /**构建当前线程的Node对象，Node.EXCLUSIVE始终为null所以mode也为null
         **   node .nextWaiter = null;
         **  node .thread = Thread.currentThread();**/
        Node node = new Node(Thread.currentThread(), mode);
        //第一个进入队列时，tail为null
        Node pred = tail;
       //也是实现和enq一样的队列
       if (pred != null) {
            node.prev = pred;
            if (compareAndSetTail(pred, node)) {
                //注意点Note1：
                pred.next = node;
                return node;
            }
        }
        enq(node);
        return node;
    }

    private Node enq(final Node node) {
        for (;;) {
            Node t = tail;
            if (t == null) { 
                //第一次进入队列的线程 会将AQS的 head和 tail 指向new node();
                if (compareAndSetHead(new Node()))
                    tail = head;
            } else {
               /**下面这一段代码比较绕
                ** t指向tail地址
                ** node 中prev 指向了t,
                ** compareAndSetTail(t, node) 其实相当于将 tail 指向了node的地址
                ** t中next 指向node
                ** 最终结果为 head中next 指向node
                **  tail 指向 node
                ** node的prev指向head
                **/
                node.prev = t;
                if (compareAndSetTail(t, node)) {
                    t.next = node;
                    return t;
                }
            }
        }
    }
```
假设我们有线程t0、t1、t2、t3、t4都去获取锁，只有t0获取到锁
多线程情况下addWaiter最终形成链表队列如下 node1即为返回的node节点
![](https://upload-images.jianshu.io/upload_images/15302255-8f896ef5b3c8fda9.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
承接acquireQueued()
这个方法主要尝试去获取锁，如果获取不到则将线程阻塞。等待被唤醒
```
    final boolean acquireQueued(final Node node, int arg) {
        boolean failed = true;
        try {
            boolean interrupted = false;
            for (;;) {
                //获取node prev节点
                final Node p = node.predecessor();
                //如果这个双向链表第一个元素指向head ，并且可以正常获取到锁
                if (p == head && tryAcquire(arg)) {
                   //Note2：即head变为链表第一个元素，双向链表head节点在这里进行改变
                    setHead(node);
                    p.next = null; // help GC
                    failed = false;
                    return interrupted;
                }
                /**链表中waitStatus初始状态都为0，这里存在几种情况
                 ** 1.链表队列waitStatus初始为0，进入shouldParkAfterFailedAcquire(p,                                 
                **  node) waitStatus为-1，第二次进入shouldParkAfterFailedAcquire，返回              
                **true，并且执行parkAndCheckInterrupt()，阻塞当前线程，interrupted =         
                **true,也意味着尝试几次获取不到锁，当前线程阻塞
                **
                **/
                if (shouldParkAfterFailedAcquire(p, node) &&
                    parkAndCheckInterrupt())
                    interrupted = true;
            }
        } finally {
            //如果出错,放到后面方法讲解
            if (failed)
                cancelAcquire(node);
        }
    }

    private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
        int ws = pred.waitStatus;
        if (ws == Node.SIGNAL)
            return true;
        /**Note3：跳过已经被标记取消的连续节点
            *如果pred和它之前的节点都是被标记取消的，则在队列中删除掉这些连续的节点**/  
        if (ws > 0) {
            do {
                node.prev = pred = pred.prev;
            } while (pred.waitStatus > 0);
            pred.next = node;
        } else {
            /**
             ** 将pred节点的状态值置为 -1 有可能失败*/
            compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
        }
        return false;
    }

    private final boolean parkAndCheckInterrupt() {
       //这里this指的是ReentrantLock类中FairSync或NonfairSync，park确保线程挂起
        LockSupport.park(this);
        //确保中断标识被清除
        return Thread.interrupted();
    }
  
```
在这一步结束后，假设t1和t2、t3、t4都没获取到锁，锁等待队列可能如下，和之前比waitStatus发生变化
![image.png](https://upload-images.jianshu.io/upload_images/15302255-c6b9caf14684b5e8.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
这里注意一点如果假设to释放锁，t1获取到锁，则锁等待队列如下,注意head中waitStatus的变化，也就是我们上面说的Note2：(node2节点获取到了锁，才会将head变为node1,并将node1 thread属性=null)。

![image.png](https://upload-images.jianshu.io/upload_images/15302255-0e28f3d07c55099e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 2.unLock()非公平实现
```
  public void unlock() {
        sync.release(1);
    }
  
  public final boolean release(int arg) {
       //重入锁最后一次解锁 tryRelease(arg)才会返回true，所以去唤醒其他等待的线程
        if (tryRelease(arg)) {
            Node h = head;
            if (h != null && h.waitStatus != 0)
              //唤醒线程
                unparkSuccessor(h);
            return true;
        }
        return false;
    }
  //确保当前线程持有的锁释放 state值减一 
  protected final boolean tryRelease(int releases) {
            int c = getState() - releases;
            //这里判断是当前线程持有锁,才释放
            if (Thread.currentThread() != getExclusiveOwnerThread())
                throw new IllegalMonitorStateException();
            boolean free = false;
            if (c == 0) {
                free = true;
                setExclusiveOwnerThread(null);
            }
            setState(c);
            return free;
        }
       // Note4：尝试去唤醒一个距离node最近的节点，注意这个获取节点方式，是去获取node之后距离node最近的节点
  private void unparkSuccessor(Node node) {
        int ws = node.waitStatus;
         //会将head节点状态赋值0
        if (ws < 0)
            compareAndSetWaitStatus(node, ws, 0);
        Node s = node.next;
      //找出需要被唤醒的节点
        if (s == null || s.waitStatus > 0) {
            s = null;
            for (Node t = tail; t != null && t != node; t = t.prev)
                if (t.waitStatus <= 0)
                    s = t;
        }
        if (s != null)
            LockSupport.unpark(s.thread);
    }

```
## 3.cancelAcquire
因为异常情况清除等待锁队列中的已经被标记取消的节点，执行完毕之后，等待锁队列中可能存在被标记取消的节点
分为以下三种情况
 - 1.node为tail节点，则直接node置空，则等待锁队列head的next直接指向为null
 - 2.node为head的后继节点，则去唤醒一个距离node最近的节点（这个节点在队列中node之后），等待锁队列仍会存在被标记取消的节点（waitStatus =1）
- 3.如果不是上面2种情况，则在队列中将node节点移除
这三种情况都会移除掉node前面已经被标记取消的节点（代码while循环）
```
  //因为异常情况
     private void cancelAcquire(Node node) {
        if (node == null)
            return;

        node.thread = null;

        Node pred = node.prev;
       /**循环清除node前面waitStatus >0的节点,即已经取消的节点,
         *这个循环只是将node的prev指向上一个waitStatus<0的节点pred,
         *但是并未将pred节点的next指向node**/
        while (pred.waitStatus > 0)
            node.prev = pred = pred.prev;
        //pred的next并没有指向node （predNext可能为node，也可能不为node）
        Node predNext = pred.next;

        node.waitStatus = Node.CANCELLED;
       //node如果为尾节点，尾节点清除，即将pred的next指向null
        if (node == tail && compareAndSetTail(node, pred)) {
            compareAndSetNext(pred, predNext, null);
        } else {
            int ws;
            if (pred != head &&
                ((ws = pred.waitStatus) == Node.SIGNAL ||
                 (ws <= 0 && compareAndSetWaitStatus(pred, ws, Node.SIGNAL))) &&
                pred.thread != null) {
                Node next = node.next;
                /**如果node后继节点正常，则直接跳过node，将pred的next指向node的 
                  * next,也就在等待锁队列不存在next节点**/
                if (next != null && next.waitStatus <= 0)
                    compareAndSetNext(pred, predNext, next);
            } else {
            	  /**因为如果pred为头结点 pred的next一定指向node，所以无需处理next
                     *尝试去唤醒一个距离node最近的节点（这个节点在队列中node之后）*/
                unparkSuccessor(node);
            }
            //有点不懂这里的含义，直接node.next = null  也可以GC回收，而且next指向自己
            node.next = node; // help GC
        }
    }
```
这里我们考虑一种情况因为我们上述说的情况中，我们说的上述情况2，并不会在等待锁队列中移除掉被标记取消的节点，而且next指向了自己，这在等待锁队列可能形成如下情况
![image.png](https://upload-images.jianshu.io/upload_images/15302255-060438bed9dbe3cb.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

此时我们往等待锁队列添加节点，因为Note1：的缘故，所以添加队列如下
![image.png](https://upload-images.jianshu.io/upload_images/15302255-701b8b642d1fc17b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
我们在Note3：也会帮助我们跳过那些标记取消节点，
并且在 Note4：我们会从tail往前查找
## 4.lock()公平实现
```
     final void lock() {
           acquire(1);
     }
     public final void acquire(int arg) {
        if (!tryAcquire(arg) &&
            acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
            selfInterrupt();
    }
```
tryAcquire调用FairSync中tryAcquire()方法，这个方法加锁成功后返回true
```
    protected final boolean tryAcquire(int acquires) {
            final Thread current = Thread.currentThread();
            int c = getState();
            if (c == 0) {
                if (!hasQueuedPredecessors() &&
                    compareAndSetState(0, acquires)) {
                    setExclusiveOwnerThread(current);
                    return true;
                }
            }
            //重入锁
            else if (current == getExclusiveOwnerThread()) {
                int nextc = c + acquires;
                if (nextc < 0)
                    throw new Error("Maximum lock count exceeded");
                setState(nextc);
                return true;
            }
            return false;
        }
    }
   /**返回false有几种情况:
     **1、head=tail 队列中没有线程节点
     **2、head的next节点不为null并且next节点中线程为当前线程**/
    public final boolean hasQueuedPredecessors() {

        Node t = tail; // Read fields in reverse initialization order
        Node h = head;
        Node s;
        return h != t &&
            ((s = h.next) == null || s.thread != Thread.currentThread());
    }

```
剩下调用和非公平锁相同
## 5.unLock()公平实现
unlock公平锁和非公平锁实现相同
## 6.condition.await()
当前线程挂起，并将锁释放
```
	 //ConditionObject内部类中
	public final void await() throws InterruptedException {
		  if (Thread.interrupted())
		      throw new InterruptedException();
		 //添加到条件等待队列列尾
		  Node node = addConditionWaiter();
		 //释放当前锁，这也是为什么我们需要获取到锁才能用await方法
		  int savedState = fullyRelease(node);
		  int interruptMode = 0;
		  while (!isOnSyncQueue(node)) {
             //将当前线程挂起，等待有线程通知执行
		      LockSupport.park(this);
          /**有线程通知的话继续执行***/
		      if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
		          break;
		  }
		  if (acquireQueued(node, savedState) && interruptMode != THROW_IE)
		      interruptMode = REINTERRUPT;
		  if (node.nextWaiter != null) 
              //移除等待队列中
		      unlinkCancelledWaiters();
		  if (interruptMode != 0)
		      reportInterruptAfterWait(interruptMode);
	}
	//ConditionObject内部类中 添加到条件等待队列列尾  
	private Node addConditionWaiter() {
	    Node t = lastWaiter;
	    // If lastWaiter is cancelled, clean out.
	    if (t != null && t.waitStatus != Node.CONDITION) {
	        unlinkCancelledWaiters();
	        t = lastWaiter;
	    }
	    Node node = new Node(Thread.currentThread(), Node.CONDITION);
	    if (t == null)
	        firstWaiter = node;
	    else
	        t.nextWaiter = node;
	    lastWaiter = node;
	    return node;
	}  
```
这里我们看下while循环表达式
```      
    /**AbstractQueuedSynchronizer类中   判断node是否在条件等待队列，
      *在条件等待队列中 node.prev始终为null,**/
    final boolean isOnSyncQueue(Node node) {
        if (node.waitStatus == Node.CONDITION || node.prev == null)
            return false;
        if (node.next != null) 
            return true;

        return findNodeFromTail(node);
    }
/**AbstractQueuedSynchronizer类中  从后循环等待锁队列，**/
    private boolean findNodeFromTail(Node node) {
        Node t = tail;
        for (;;) {
            if (t == node)
                return true;
            if (t == null)
                return false;
            t = t.prev;
        }
    }
```
这里我们看下checkInterruptWhileWaiting
```
  /**ConditionObject类中方法  
   **线程未中断返回0 
  ** 线程在通知之前中断返回 THROW_IE    -1
  ** 线程在通知之后中断返回 REINTERRUPT   1
**/
  private int checkInterruptWhileWaiting(Node node) {
            return Thread.interrupted() ?
                (transferAfterCancelledWait(node) ? THROW_IE : REINTERRUPT) :
                0;
        }

    final boolean transferAfterCancelledWait(Node node) {
         //节点在收到通知之前发生中断，因为通知会将节点置为0，这种情况我们后续说明
        if (compareAndSetWaitStatus(node, Node.CONDITION, 0)) {
            enq(node);
            return true;
        }
      //节点状态不是CONDITION，则可能已经被通知，等待进入锁等待队列过程
        while (!isOnSyncQueue(node))
            Thread.yield();
        return false;
    }
```
acquireQueued即我们上面提到获取锁
我们再看下reportInterruptAfterWait，前面我们提到如果在通知之前线程已经被中断了，返回THROW_IE   ，则我们应该抛出中断异常，否则在通知之后，我们去响应中断
```
        private void reportInterruptAfterWait(int interruptMode)
            throws InterruptedException {
           
            if (interruptMode == THROW_IE)
                throw new InterruptedException();
            else if (interruptMode == REINTERRUPT)
                selfInterrupt();
        }

```
关于上面所说的通知之前线程已经被中断了我们举个例子说明下,这个例子是中断发生在通知之前
```
public class ConditionDemo5 {

    public  static ReentrantLock reentrantLock = new ReentrantLock();

    public static Condition condition =reentrantLock.newCondition();

    static class ThreadDemo  implements Runnable{
        @Override
        public void run() {
            try {
                reentrantLock.lock();
                System.out.println("线程等待condition:"+getDate());
                condition.await();
                System.out.println("线程又继续执行了:"+getDate());
            } catch (InterruptedException e) {
                e.printStackTrace();
            }finally {
                reentrantLock.unlock();
                System.out.println("线程执行完毕:"+getDate());

            }
        }
    }

    public static String getDate(){
        Date date = new Date();
        SimpleDateFormat dateFormat= new SimpleDateFormat("yyyy-MM-dd :hh:mm:ss");
        return  dateFormat.format(date);
    }

    public static void main(String []args) throws InterruptedException {
        Thread thread = new Thread(new ThreadDemo());
        thread.start();
        Thread.sleep(2000);
        thread.interrupt();
    }
}
```
结果如下
```
线程等待condition:2019-08-29 :08:48:56
线程执行完毕:2019-08-29 :08:48:58
java.lang.InterruptedException
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.reportInterruptAfterWait(AbstractQueuedSynchronizer.java:2014)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2048)
	at com.example.consumerdemoone.thread2.ConditionDemo5$ThreadDemo.run(ConditionDemo5.java:26)
	at java.lang.Thread.run(Thread.java:748)
```

## 7.condition.signal()
条件通知，将一个条件等待队列中节点移除，并将节点放入锁等待队列。
```
   public final void signal() {
            if (!isHeldExclusively())
                throw new IllegalMonitorStateException();
            Node first = firstWaiter;
            if (first != null)
                doSignal(first);
     }
   //去通知一个条件等待队列节点进入锁等待队列，并将节点从条件等待队列中移除
    private void doSignal(Node first) {
         //do while至少执行一次  
        do {
            if ( (firstWaiter = first.nextWaiter) == null)
                lastWaiter = null;
            first.nextWaiter = null;
        } while (!transferForSignal(first) &&
                 (first = firstWaiter) != null);
    }
      /**此方法位于AbstractQueuedSynchronizer类中,将条件等待队列中的节点入队到 
          *锁等待队列，成功返回true，失败返回false**/
   final boolean transferForSignal(Node node) {
        // 查看节点状态有没有发生改变
        if (!compareAndSetWaitStatus(node, Node.CONDITION, 0))
            return false;
        //将之前存在于条件等待队列中的节点入队到锁等待队列，重新去竞争锁
        Node p = enq(node);
        int ws = p.waitStatus;
        if (ws > 0 || !compareAndSetWaitStatus(p, ws, Node.SIGNAL))
            LockSupport.unpark(node.thread);
        return true;
    }
```
# 四、总结
最后我们总结下ReentrantLock，假设我们有线程t0、t1、t2、t3、t4四个线程去获取锁，t0获取到锁，那么此时等待锁获取的队列为
![image.png](https://upload-images.jianshu.io/upload_images/15302255-537d655ecbffb525.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
假设t0执行完毕释放掉锁，t1获取锁时发生异常，那么此时等待锁获取的队列为
![image.png](https://upload-images.jianshu.io/upload_images/15302255-d408974d8234cda4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
t2获取到锁，此时等待锁获取的队列为（Note3：帮我们移除掉被标记取消的节点）
![image.png](https://upload-images.jianshu.io/upload_images/15302255-0859b5acbdbdedc5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
此时t2执行 condition.await()，则条件等待队列如下(为了对应上我们将条件等待队列中持有t2的线程定义为cnode2)，会释放掉锁
![image.png](https://upload-images.jianshu.io/upload_images/15302255-eea4e33a27feac8f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
此时t3获取到锁，则锁等待队列为
![image.png](https://upload-images.jianshu.io/upload_images/15302255-ba3d8b07fd03c35e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
假设t2执行 condition.await()，此时条件等待队列如下
![image.png](https://upload-images.jianshu.io/upload_images/15302255-b7d7affbb8316787.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
假设线程t4获取到锁，则锁等待队列为
![image.png](https://upload-images.jianshu.io/upload_images/15302255-a87b09f5ee8bc102.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
此时若t4执行了2次condition.signal()或者signalAll()方法，则条件等待队列清空，
firstWaiter和lastWaiter分别指向null，添加t2和t3线程进入锁等待队列，锁等待队列如下
![image.png](https://upload-images.jianshu.io/upload_images/15302255-ddcfa24fde84186e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
然后t2和t3分别等待t4释放锁后去获取锁
















 