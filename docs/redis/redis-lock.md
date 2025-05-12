这里我们看个例子，假设我们有如下代码
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

如果在我们不修改代码的情况下，输出如下，之所以这样是 实际业务比redis刚开始设置分布式锁加锁时间要长，分布式锁没有续期

```
 a 开始获取锁, time: 1746290925414
 a 成功获取锁, time: 1746290925429
 b 开始获取锁, time: 1746290926974
 b 获取锁失败, time: 1746290931990
 java.lang.IllegalMonitorStateException: attempt to unlock lock, not locked by current thread by node id:705016b6-6daf-4292-9776-7e12990bed44 thread-id: 96
```
### 🟢 **会开启看门狗的情况（自动续期）**

| 方法调用                                 | 是否开启 | 原因说明 |
|------------------------------------------|----------|-----------|
| `lock()`                                  | ✅ 是     | 没指定过期时间，使用默认 30 秒并自动续期 |
| `tryLock()`                               | ✅ 是     | 无参数版本，默认使用 30 秒并自动续期 |
| `tryLock(waitTime, unit)`                 | ✅ 是     | 只设置了等待时间，未设置持锁时间 |
| `lockInterruptibly()`                     | ✅ 是     | 没有设置过期时间，默认续期 |

- 🔁 **续期频率**：每 10 秒；
- 🕒 **锁默认过期时间**：30 秒；
- 🧵 **条件**：仅当未显式指定 `leaseTime`。

---

### 🔴 **不会开启看门狗的情况（不自动续期）**

| 方法调用                                           | 是否开启 | 原因说明 |
|----------------------------------------------------|----------|-----------|
| `lock(leaseTime, unit)`                            | ❌ 否     | 显式设置了过期时间 |
| `tryLock(waitTime, leaseTime, unit)`               | ❌ 否     | 显式设置了持锁时间 |
| `tryLock(leaseTime, unit)`（某些重载）             | ❌ 否     | 显式指定了 leaseTime |

- ⏱️ **锁在 leaseTime 后自动释放**；
- 🔒 **不会续期**，适合业务执行时间明确的场景。


## ⚙️ 我们看下 开启看门狗情况下 Redisson 分布锁的加锁过程

### 🔑 1. 加锁原理

加锁时的 Lua 脚本逻辑：
- Redis key 的结构为：myLock，value 是一个 JSON 字符串，记录了 UUID + 线程ID 和 重入次数。
- 使用 SETNX 实现锁的原子加锁，如果 key 不存在，则设置成功，锁被获取。
- 如果锁已存在，并且是 当前线程加的锁，则表示是重入，直接将重入次数加 1。
- 如果是其他线程持有锁，则当前线程进入等待。
示例 Lua 脚本逻辑：
```lua
if (redis.call('exists', KEYS[1]) == 0) then
  redis.call('hset', KEYS[1], ARGV[2], 1)
  redis.call('pexpire', KEYS[1], ARGV[1])
  return nil
end
```
- KEYS[1] 是锁名
- ARGV[1] 是过期时间（默认 30s）
- ARGV[2] 是线程标识（UUID + 线程 ID）

### 🔁 2. 自动续期机制

- 加锁成功后，Redisson 会为该锁开启一个 “看门狗定时任务”；
- 每隔 10 秒，Redisson 会检查该线程是否还持有锁（判断的依据是定时检查这个分布式锁key 是否还存在，存在则给它续约）；
- 如果还持有，就发送一个 Lua 脚本，将锁的过期时间延长回 30 秒；
- 如果锁已经释放或者线程关闭，该定时任务就会自动停止

🔧 实现方式（Lua 脚本核心续期）
```lua
if (redis.call("hexists", KEYS[1], ARGV[1]) == 1) then
  redis.call("pexpire", KEYS[1], ARGV[2])
  return 1
end
return 0
```
- KEYS[1] 是锁的 Redis key；

- ARGV[1] 是当前线程的标识（UUID + ThreadId）；

- ARGV[2] 是新的过期时间（30 秒）；

该脚本会判断：当前线程是否仍然持有锁，如果是，就重新设置锁的过期时间

### 🔓 3. 解锁原理
解锁时会判断：

- 当前线程是否是锁的持有者（通过比较线程唯一标识 UUID + 线程 ID）。

- 是的话就减少重入次数，如果次数为 0，就删除这个 key。

- 不是当前线程的锁，则抛出 IllegalMonitorStateException 异常。

同样通过 Lua 脚本保证解锁的原子性：
```lua
if (redis.call('hexists', KEYS[1], ARGV[1]) == 0) then
  return nil
end

local counter = redis.call('hincrby', KEYS[1], ARGV[1], -1)
if (counter > 0) then
  redis.call('pexpire', KEYS[1], ARGV[2])
  return 0
else
  redis.call('del', KEYS[1])
  return 1
end

```

