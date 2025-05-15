
这里我们先举个例子
## Runnable
``` java
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
## FutureTask
### get() 
```java
public class FutureTaskDemo implements Runnable{

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
        FutureTaskDemo futureTaskDemo = new FutureTaskDemo();
        FutureTask futureTask = new FutureTask(futureTaskDemo, "done");
        Thread thread = new Thread(futureTask);
        thread.start();
        //我们可以尝试吧这一段 try catch 注释掉，看下结果
        try {
            System.out.printf("主线程: %s 时间: %s 结果: %s\n",
                    Thread.currentThread().getName(),getDate(), futureTask.get());
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (ExecutionException e) {
            e.printStackTrace();
        }
        System.out.printf("主线程 %s 结束: %s \n", Thread.currentThread().getName(),getDate());
    }
}
```
结果如下，可以看到主线程一直被阻塞直到子线程任务完成
```log
主线程 main 开始: 2019-05-26 :05:29:25 
子线程 Thread-0 开始: 2019-05-26 :05:29:25 
子线程 Thread-0 结束: 2019-05-26 :05:29:30 
主线程: main 时间: 2019-05-26 :05:29:25 结果: done
主线程 main 结束: 2019-05-26 :05:29:30 
```
### cancel()
```java
public class FutureTaskInterruptDemo {
    public static void main(String[] args) throws Exception {
        Callable<String> task = () -> {
            try {
                System.out.println("任务开始执行，准备睡眠10秒...");
                for (int i = 0; i < 10; i++) {
                    // 每秒检测一次中断标志
                    Thread.sleep(1000);
                    if (Thread.currentThread().isInterrupted()) {
                        System.out.println("任务检测到中断，准备退出...");
                        throw new InterruptedException("任务被中断");
                    }
                }
                return "任务正常完成";
            } catch (InterruptedException e) {
                System.out.println("任务捕获到 InterruptedException，处理中断逻辑");
                throw e;
            }
        };

        FutureTask<String> futureTask = new FutureTask<>(task);
        Thread taskThread = new Thread(futureTask);
        taskThread.start();

        Thread.sleep(3000);
        System.out.println("主线程发出中断信号");
        // true 表示允许中断正在执行的任务
        futureTask.cancel(true);

        try {
            String result = futureTask.get();
            System.out.println("任务结果：" + result);
        } catch (CancellationException e) {
            System.out.println("任务被取消了");
        } catch (ExecutionException e) {
            System.out.println("任务异常：" + e.getCause());
        }
    }
}
```
