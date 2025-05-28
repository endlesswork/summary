## 🧠 什么是死锁？

死锁是一种系统层面上互相等待资源的**循环依赖**，MySQL 会自动检测并终止其中一个事务以解除死锁。


## 🔁 死锁发生的常见原因

- 并发事务以不同顺序访问相同资源
- 唯一键插入冲突
- 外键约束导致锁依赖
- 使用范围锁（如 `SELECT ... FOR UPDATE`）时发生间隙锁竞争
- 自增键冲突
- 应用自动重试机制叠加导致锁堆积

## 💥 死锁示例：交叉更新

两个事务更新相同的两行记录，但顺序不同，形成循环等待。

```sql
-- 假设 user 表中有 id=1 和 id=2 两条记录

-- 事务A
BEGIN;
UPDATE user SET name = '张三' WHERE id = 1;
-- 假设这里暂停执行
UPDATE user SET name = '李四' WHERE id = 2;

-- 事务B
BEGIN;
UPDATE user SET name = '王五' WHERE id = 2;
-- 假设这里暂停执行
UPDATE user SET name = '朱七' WHERE id = 1;
```
事务A持有 id=1 的行锁，等待 id=2；事务B持有 id=2 的行锁，等待 id=1，构成死锁。


