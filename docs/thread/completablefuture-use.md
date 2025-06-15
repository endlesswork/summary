这里我们先看个demo，等待三个线程全部执行完统一计算结果
```java
public class CompletableFutureDemo {
    public static void main(String[] args) {

        ExecutorService executor = Executors.newFixedThreadPool(3);
        long start = System.currentTimeMillis();

        // 模拟三个不同耗时的任务
        CompletableFuture<Integer> future1 = CompletableFuture.supplyAsync(() -> {
            sleep(1000);
            return 10;
        }, executor);

        CompletableFuture<Integer> future2 = CompletableFuture.supplyAsync(() -> {
            sleep(2000);
            return 20;
        }, executor);

        CompletableFuture<Integer> future3 = CompletableFuture.supplyAsync(() -> {
            sleep(3000);
            return 30;
        }, executor);

        System.out.println("开始时间: " + getDate());

        // 使用 thenCombine 合并 future1 和 future2 的结果
        CompletableFuture<Integer> combined12 = future1.thenCombine(future2, (a, b) -> {
            System.out.println("thenCombine 执行时间: " + getDate() + "，future1 + future2 = " + (a + b));
            return a + b;
        });

        // 等待全部完成
        CompletableFuture<Void> all = CompletableFuture.allOf(future1, future2, future3);
        System.out.println("执行了allOf: " + getDate());

        all.thenRun(() -> {
            try {
                int result1 = future1.get();
                int result2 = future2.get();
                int result3 = future3.get();

                int sum = result1 + result2 + result3;
                System.out.println("结束时间: " + getDate() + "，三个结果相加为: " + sum);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                executor.shutdown();
            }
        }).join(); // 等待所有任务完成
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {}
    }

    private static String getDate() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
    }
}
```
结果如下
```log
开始时间: 2025-06-15 23:54:58
执行了allOf: 2025-06-15 23:54:58
thenCombine 执行时间: 2025-06-15 23:55:00，future1 + future2 = 30
结束时间: 2025-06-15 23:55:01，三个结果相加为: 60
```

## 🧩 一、创建异步任务

| 方法                         | 返回值                       | 功能          | 是否有返回结果 |
| -------------------------- | ------------------------- | ----------- | ------- |
| `runAsync(Runnable)`       | `CompletableFuture<Void>` | 异步执行任务，无返回值 | 否       |
| `runAsync(Runnable, Executor)`       | `CompletableFuture<Void>` | 异步执行任务，无返回值 | 否       |
| `supplyAsync(Supplier<T>)` | `CompletableFuture<T>`    | 异步执行任务，有返回值 | ✅       |
| `supplyAsync(Supplier, Executor)` | `CompletableFuture<T>`    | 异步执行任务，有返回值 | ✅       |

## 🔗 二、任务完成后的处理（串行）

| 方法                         | 功能            | 是否可获取上一步结果 | 是否返回新值 |
| -------------------------- | ------------- | ---------- | ------ |
| `thenRun(Runnable)`        | 执行任务，不关心结果    | ❌          | ❌      |
| `thenAccept(Consumer<T>)`  | 消费上一步结果       | ✅          | ❌      |
| `thenApply(Function<T,R>)` | 转换上一步结果并返回新结果 | ✅          | ✅      |

## 🔄 三、任务组合（并行）

| 方法                                 | 功能              | 示例  |
| ---------------------------------- | --------------- | --- |
| `thenCombine(f2, (r1, r2) -> ...)` | 合并两个结果          | 相加等 |
| `thenAcceptBoth(f2, BiConsumer)`   | 同时消费两个结果，无返回    | 打印  |
| `runAfterBoth(f2, Runnable)`       | 两个都完成后执行，无参数无返回 |     |
| `applyToEither(f2, Function)`      | 任一完成后，处理其结果并返回  |     |
| `acceptEither(f2, Consumer)`       | 任一完成后，消费其结果     |     |
| `runAfterEither(f2, Runnable)`     | 任一完成后，执行        |     |

## 🧠 四、异常处理

| 方法                                       | 功能           | 是否能改变结果 |
| ---------------------------------------- | ------------ | ------- |
| `exceptionally(Function<Throwable, T>)`  | 捕获异常并返回默认值   | ✅       |
| `handle(BiFunction<T, Throwable, R>)`    | 正常和异常都处理     | ✅       |
| `whenComplete(BiConsumer<T, Throwable>)` | 仅执行副作用，不修改结果 | ❌       |

## 🧮 五、多任务协同（批量）

| 方法                                     | 功能                |
| -------------------------------------- | ----------------- |
| `CompletableFuture.allOf(f1, f2, ...)` | 等全部任务完成，返回 `Void` |
| `CompletableFuture.anyOf(f1, f2, ...)` | 任一任务完成，返回其结果      |

## ⏱ 六、其他辅助方法

| 方法                 | 功能                |
| ------------------ | ----------------- |
| `get()` / `join()` | 获取结果（`join` 不抛异常） |
| `complete(value)`  | 主动完成任务（手动设置结果）    |
| `cancel(true)`     | 取消任务              |
