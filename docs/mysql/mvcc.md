MVCC是数据库中常见的一种并发控制机制，广泛应用于 **MySQL（InnoDB 引擎）、PostgreSQL** 等数据库系统中，
用于实现**高并发下的读写操作不会互相阻塞，提高性能。**


## 🔎 读操作分类

| 读类型 | 是否使用 MVCC | 是否加锁 | 场景 |
|--------|----------------|-----------|------|
| 快照读（Snapshot Read） | ✅ 是 | ❌ 否 | 普通 `SELECT` |
| 当前读（Current Read） | ❌ 否 | ✅ 是 | `SELECT ... FOR UPDATE`、`UPDATE`、`DELETE` |

## 📌 核心思想
- 每次修改数据时不直接覆盖原始数据，而是保留多个版本（快照）。
- 读取操作基于 **一致性视图（Read View）**，读取符合当前事务可见性的历史版本。
- 避免加锁的读，提高性能。

## 🛠 InnoDB 中 MVCC 的实现

InnoDB 通过以下三个组件实现 MVCC：

### 1. 隐藏字段（每行数据自动维护）

- `trx_id`：最近一次修改该行的事务 ID。
- `roll_pointer`：指向 undo log 的指针，用于查找旧版本。

### 2. Undo Log（撤销日志）

- `UPDATE/DELETE` 时会生成 undo log 保存旧版本。
- 支持回滚和历史版本访问（MVCC 使用场景）。

### 3. Read View（一致性读视图）

- 每个事务在第一次执行快照读时创建。
- 维护当前活跃事务的 ID 列表（`m_ids`）和最大事务 ID（`up_limit_id`）。
- 用于判断某条记录版本是否对当前事务可见。
#### 🔍 快照读的trx_id会出现在 m_ids吗
**不会**
- Read View 的 m_ids 是在快照读发生那一刻，记录的：
>“所有其他未提交事务的 ID”
- 当前事务虽然分配了 trx_id，但：
>InnoDB 生成 Read View 时，不会把“自己”加入到 m_ids 中。

**RR（Repeatable Read，MySQL InnoDB 默认）级别下在快照读的过程中，即使m_ids中某些事务已经提交了，但是并不会更新 m_ids列表**
## 📖 可见性规则

某行数据是否对当前事务 T 可见，主要判断其 `trx_id` 与 Read View 的关系：
- m_ids：当前活跃事务 ID 列表（未提交事务）
- min_trx_id（up_limit_id）：m_ids 中最小的事务 ID。
- max_trx_id（low_limit_id）：当前事务启动时已分配的最大事务 ID + 1。
- creator_trx_id：当前事务 ID。

| 规则编号 | 条件                      | 说明                 | 结果    |
| ---- | ----------------------- | ------------------ | ----- |
| R1   | `trx_id` < `min_trx_id` | 提交时间早于所有活跃事务       | ✅ 可见  |
| R2   | `trx_id` ∈ `m_ids`      | 属于活跃事务             | ❌ 不可见 |
| R3   | `trx_id` > `max_trx_id` | 是后面才开始的事务          | ❌ 不可见 |
| R4   | `trx_id` = 当前事务 ID      | ✅ 可见               |       |
| 其他   | 否则                      | 处于 Read View 不可见区间 | ❌ 不可见 |

## 🎯 Read View 生成时机

| 隔离级别                | Read View 生成时机 | 每次 SELECT 是否生成新视图 | 是否可重复读 |
| ------------------- | -------------- | ----------------- | ------ |
| RC（Read Committed）  | 每次执行 SELECT 时  | ✅ 是               | ❌ 否    |
| RR（Repeatable Read） | 第一次 SELECT 时   | ❌ 否（整个事务共用一个视图）   | ✅ 是    |


### 🔹 RC（Read Committed）
- 每次执行 SELECT，都会重新生成一个 Read View
- 看到的是 “当前已经提交的最新数据”
- 不会看到未提交数据
- 多次查询同一行可能读到不同版本

### 🔸 RR（Repeatable Read，MySQL InnoDB 默认）
- 在事务执行第一次快照读时生成一个 Read View
- 该视图贯穿整个事务生命周期
- 后续所有快照读都基于这个 Read View，读到的是当时快照的数据
- 确保了同一个事务内多次读取同一行记录，结果一致（可重复读）


