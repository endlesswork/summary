
MySQL 支持四种事务隔离级别，用于控制多个事务并发执行时的数据一致性行为。不同隔离级别主要影响脏读、不可重复读和幻读等并发问题的发生与否。


## ✅ 四种事务隔离级别对比

| 隔离级别                        | 脏读（Dirty Read） | 不可重复读（Non-repeatable Read） | 幻读（Phantom Read） |
|--------------------------------|--------------------|----------------------------------|----------------------|
| **READ UNCOMMITTED（读未提交）** | ✅ 可能发生         | ✅ 可能发生                       | ✅ 可能发生           |
| **READ COMMITTED（读已提交）**   | ❌ 不会发生         | ✅ 可能发生                       | ✅ 可能发生           |
| **REPEATABLE READ（可重复读）** | ❌ 不会发生         | ❌ 不会发生                       | ✅（InnoDB 可避免）    |
| **SERIALIZABLE（串行化）**     | ❌ 不会发生         | ❌ 不会发生                       | ❌ 不会发生           |


## 📌 隔离级别详解

### 1. READ UNCOMMITTED（读未提交）
- 允许读取其他事务尚未提交的数据。
- **可能产生问题**：
  - 脏读 ✅
  - 不可重复读 ✅
  - 幻读 ✅

### 2. READ COMMITTED（读已提交）
- 每次读取都是其他事务已提交的数据。
- Oracle 的默认隔离级别。
- **可能产生问题**：
  - 脏读 ❌
  - 不可重复读 ✅
  - 幻读 ✅
#### 示例（不可重复读）
```sql
-- 事务 A
START TRANSACTION;
SELECT age FROM users WHERE id = 1; -- 假设结果为 18

-- 事务 B
START TRANSACTION;
UPDATE users SET age = 18 WHERE id = 1;
COMMIT;

-- 事务 A（继续）
SELECT age FROM users WHERE id = 1; -- 结果为 19，发生不可重复读

```

### 3. REPEATABLE READ（可重复读）
- 同一事务中，多次读取结果保持一致。
- MySQL InnoDB 的默认隔离级别。
- **可能产生问题**：
  - 脏读 ❌
  - 不可重复读 ❌
  - 幻读 ✅（但 InnoDB 使用 Next-Key Lock 避免）

### 4. SERIALIZABLE（串行化）
- 最严格的隔离级别，事务完全串行化执行。
- 每个事务对表中的数据加锁，防止其他事务读写。
- **可能产生问题**：
  - 脏读 ❌
  - 不可重复读 ❌
  - 幻读 ❌

