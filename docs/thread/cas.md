CAS是一种原子操作，常用于实现无锁并发编程。ReentrantLock就使用到


## ✅ 优点
- 避免使用传统的重量级锁（如 synchronized）
- 线程安全，性能高
- 可实现高并发下的无锁操作

## ❌ 缺点
- ABA 问题， 一个变量从 A 变成 B 又变成 A，CAS 无法识别中间发生过变化
- 循环时间长，CPU 开销大， CAS 失败时会自旋重试，若长时间失败将消耗大量 CPU
- 只能操作单个变量，多变量的原子性无法通过 CAS 保证

### 🛠 ABA解决
**AtomicStampedReference通过给变量加一个“版本戳（stamp）”，确保其值和版本同时匹配才更新**
```java
public class AtomicStampedReferenceDemo {
    public static void main(String[] args) {
        String initialRef = "A";
        int initialStamp = 0;

        AtomicStampedReference<String> atomicRef = new AtomicStampedReference<>(initialRef, initialStamp);
        System.out.println("初始化 value: " + atomicRef.getReference());
        System.out.println("初始化 stamp: " + atomicRef.getStamp());

        // 模拟线程1读取
        String expectedRef = atomicRef.getReference();
        int expectedStamp = atomicRef.getStamp();

        // 模拟线程2修改值 A -> B -> A
        atomicRef.compareAndSet("A", "B", expectedStamp, expectedStamp + 1);
        atomicRef.compareAndSet("B", "A", expectedStamp + 1, expectedStamp + 2);

        System.out.println("expectedRef value: " + expectedRef);
        System.out.println("expectedStamp value: " +expectedStamp);
        // 线程1尝试 CAS
        boolean success = atomicRef.compareAndSet(expectedRef, "C", expectedStamp, expectedStamp + 1);

        System.out.println("CAS success: " + success);
        System.out.println("Current value: " + atomicRef.getReference());
        System.out.println("Current stamp: " + atomicRef.getStamp());
    }
}

```
可以看到 输出如下

虽然值仍然是 "A"，但因为 stamp 已经变成了 2，所以线程1的 CAS 操作失败了。这样就成功避免了 ABA 问题。
```log
初始化 value: A
初始化 stamp: 0
expectedRef value: A
expectedStamp value: 0
CAS success: false
Current value: A
Current stamp: 2
```
### 🛠 循环过多问题
- 加入重试次数限制
- 使用 Thread.yield() 或 Thread.sleep() 暂缓自旋
- 随失败次数增加，延迟重试时间
- 降低热点竞争
	- 将一个热点变量拆分为多个（如 LongAdder、Striped 类设计）
	- 增加分区或槽位分担写入压力（分段锁思路）
- 使用锁作为退路
### 🛠 只能操作单个变量
- 使用ReentrantLock锁等
- 使用AtomicReference
	- ✅ 优点：保持无锁特性，多个字段原子更新
	- ❌ 缺点：会频繁创建新对象；适合读多写少的场景
- 使用 VarHandle （JDK 9+）
	- 比较复杂，不常用
- 使用更高级的并发结构（如 STM / Akka / 再设计）

#### AtomicReference
```java
public class AtomicReferenceDemo {

    @Data
    static class Account {
        int balance;
        int points;

        public Account(int balance, int points) {
            this.balance = balance;
            this.points = points;
        }

    }
    // 原子引用，管理 Account 对象
    private static final AtomicReference<Account> accountRef =
            new AtomicReference<>(new Account(100, 200));

    public static void main(String[] args) {
        System.out.println("初始化: " + accountRef.get());

        Account oldAccount = accountRef.get();
        Account firstAccount = new Account(
                oldAccount.balance + 50,
                oldAccount.points + 100
        );
        // 第一次尝试原子更新余额和积分
        boolean firstSuccess = accountRef.compareAndSet(oldAccount, firstAccount);
        System.out.println("第一次更新成功？" + firstSuccess);
        System.out.println("accountRef 值: " + accountRef.get());
        //第二次尝试原子更新余额和积分
        Account secondAccount = new Account(
                oldAccount.balance + 50,
                oldAccount.points + 100
        );
        boolean secondSuccess = accountRef.compareAndSet(oldAccount, secondAccount);
        System.out.println("第二次更新成功？" + secondSuccess);
        System.out.println("accountRef 值: " + accountRef.get());
    }
}
```
输出如下
```
初始化: AtomicReferenceDemo.Account(balance=100, points=200)
第一次更新成功？true
accountRef 值: AtomicReferenceDemo.Account(balance=150, points=300)
第二次更新成功？false
accountRef 值: AtomicReferenceDemo.Account(balance=150, points=300)

```
