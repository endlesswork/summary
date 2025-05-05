假设我们有如下代码
```java
@Slf4j
@RestController
@RequestMapping("/lock")
public class RedisLockDemo {

    @Resource
    private RedissonClient redissonClient;

    @PostMapping("/user")
    public void lockUser(@RequestParam String name) {
        RLock lock = redissonClient.getLock("myLock");
        log.info("{} 开始获取锁, time: {}", name, System.currentTimeMillis());
        try {
            // 尝试获取锁，最多等待5秒，锁自动释放时间是10秒
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                try {
                    log.info("{} 成功获取锁, time: {}", name, System.currentTimeMillis());
                    // 模拟业务逻辑
                    Thread.sleep(7000);
                } finally {
                    lock.unlock();
                    log.info("{} 释放锁, time: {}", name,  System.currentTimeMillis());
                }
            } else {
                log.info("{} 获取锁失败, time: {}", name, System.currentTimeMillis());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("{} 获取锁异常", name, e);
        }
    }

}
```
如果有2个请求 a和b 同时过来， a 抢到锁

正常应该输出如下
```
 a 开始获取锁, time: 1746289475348
 a 成功获取锁, time: 1746289475365
 b 开始获取锁, time: 1746289477146
 b 获取锁失败, time: 1746289482160
 a 释放锁,     time: 1746289482377

```
可以看到 b 在等待了大概 1746289482160- 1746289477146 = 5014 ms后会打印获取锁失败

## 🤔 如果 Thread.sleep 的时间大于10s

我们将代码修改如下
```java 
// 模拟业务逻辑
 Thread.sleep(12000);

```

如果在我们不修改代码的情况下，输出如下 

```
 a 开始获取锁, time: 1746290925414
 a 成功获取锁, time: 1746290925429
 b 开始获取锁, time: 1746290926974
 b 获取锁失败, time: 1746290931990
 java.lang.IllegalMonitorStateException: attempt to unlock lock, not locked by current thread by node id:705016b6-6daf-4292-9776-7e12990bed44 thread-id: 96
```
也就是我们如果遇到业务实际执行情况比我们加锁时间长 应该怎样办


## ✅ 使用leaseTime 为-1

leaseTime 为-1 时 默认会开启看门狗，也会保证 a 成功释放锁

## ⚙️ 我们看下 开启看门狗情况下 Redisson 分布锁的加锁过程

当使用 lock.tryLock 时 leaseTime为-1 时 会 **启动看门狗（Watchdog）**（lock.lock()也会），

我们以 a为例，假设a所在的线程a 获取锁成功后，Redisson会将UUID + ThreadId保存起来（以便于只能由加锁的线程释放锁）

看门狗 默认每 10 秒自动续期一次锁（续约时间为 30 秒），直到业务执行完成或线程退出。

b 所在的线程b 获取锁失败 进入等待（`tryLock` 支持等待时间），如果在规定等待时间内 获取不到锁，则退出等待





