
在Mysql中我们经常接触如下几种日志
## 🔁 Redo Log（重做日志）

### 1. 作用

- 保证事务提交后的数据能在宕机后恢复（**崩溃恢复**）。
- 实现 WAL（**Write-Ahead Logging**）协议，即 **先写日志再写数据页**。

---
### 2. 工作流程

1. 事务执行时，将变更记录写入 Redo Log Buffer。
2. 事务提交时，将 Redo Log Buffer 写入磁盘文件（ib_logfileX）。
3. 后台线程异步将数据页刷新到磁盘（Page Flush）。
---
### 3. 参数配置示例

```ini
innodb_log_file_size = 512M
innodb_log_files_in_group = 2
innodb_flush_log_at_trx_commit = 1
```
---
### 4. innodb_flush_log_at_trx_commit 说明：
| 值 | 行为说明                               |
| - | ---------------------------------- |
| 0 | 每秒写入并刷新 redo log，崩溃可能丢失最近一秒内的事务    |
| 1 | 每次事务提交都写入并刷新 redo log（**最安全，默认值**） |
| 2 | 每次提交写入 redo log，但每秒刷新一次（可能丢事务）     |


## 🔄 Undo Log（回滚日志）

Undo Log 是 InnoDB 存储引擎中的关键日志之一，主要用于支持事务的 **原子性** 和 **一致性读（MVCC）**。

### ✅ Undo Log 的作用

- **事务原子性**：用于回滚未完成或失败的事务操作。
- **MVCC 支持**：一致性读时需要通过 Undo Log 获取数据的历史版本，避免加锁。

### 🧩 工作机制

1. **生成**：当事务对数据进行修改时，InnoDB 会将数据被修改前的值记录到 Undo Log。
2. **使用**：
   - 如果事务失败或用户主动回滚，会使用 Undo Log 撤销已执行的操作。
   - 一致性读（非锁定读）会通过 Undo Log 获取当前读视图下的历史版本数据。
3. **清理**：事务提交后并不会立即删除 Undo Log，而是由 Purge 线程在确定没有事务再访问该 Undo Log 后异步清理。

### 📂 Undo Log 的类型

| 类型         | 说明                     |
|--------------|--------------------------|
| Insert Undo  | 删除插入的记录（用于回滚 `INSERT`） |
| Update Undo  | 撤销更新的记录（用于回滚 `UPDATE`、`DELETE`） |

---

### 💾 存储位置

- **MySQL 5.x 之前**：Undo Log 存储在共享表空间 `ibdata1` 中。
- **MySQL 8.0+**：支持将 Undo Log 存储在独立的 undo 表空间（`innodb_undo_tablespaces`）。

---

### ⚙️ 相关配置参数

| 参数名称 | 说明 |
|----------|------|
| `innodb_undo_tablespaces` | 指定 undo 表空间数量（MySQL 8.0 起） |
| `innodb_undo_log_truncate` | 是否启用 undo 日志文件自动回收 |
| `innodb_max_undo_log_size` | 单个 undo 表空间最大大小 |

---

### 🔁 与 Redo Log 的区别

| 项目       | Undo Log                            | Redo Log                       |
|------------|-------------------------------------|--------------------------------|
| 作用       | 回滚操作、支持一致性读              | 崩溃恢复（重做已提交的数据）   |
| 保证的特性 | 原子性、隔离性                      | 持久性                         |
| 写入时机   | 事务执行时生成                      | 提交事务前写入                 |
| 是否持久化 | 是                                   | 是                             |
| 依赖场景   | 回滚、MVCC                          | 崩溃恢复                       |

---

### 📌 补充：Undo Log 与 MVCC

在 InnoDB 的 MVCC 机制中：
- 每条记录都有两个隐藏列：`trx_id`（创建它的事务ID）和 `roll_pointer`（指向 Undo Log）。
- 一致性读时根据 `roll_pointer` 回溯历史版本，实现非锁读。

---

> 🧠 总结：Undo Log 是 InnoDB 实现事务回滚和一致性读的核心机制之一，配合 Redo Log 一起保证事务的原子性与持久性。

## 🧾 Binlog（二进制日志）

### 1. 作用

- 主从复制：记录主库操作供从库重放；
- 数据恢复：可用于 Point-in-Time 恢复（PITR）；
- 审计分析：追踪历史变更记录。

### 2. 存储结构

- 以事件为单位记录每个写操作；
- 文件命名如：`mysql-bin.000001`，`mysql-bin.index`

### 3. 三种格式（binlog_format）

| 格式     | 说明 |
|----------|------|
| STATEMENT | 记录 SQL 语句 |
| ROW       | 记录行级别变更 |
| MIXED     | 自动切换（默认） |

### 4. 格式对比

| 格式       | 优点       | 缺点 |
|------------|------------|------|
| STATEMENT  | 日志小     | 不一定可重放 |
| ROW        | 精确       | 日志大 |
| MIXED      | 折中方案   | 实现复杂 |

### 5. 配置示例

```ini
log-bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 100M
```

### 6. 查看命令

```sql
SHOW BINARY LOGS;
SHOW MASTER STATUS;
SHOW BINLOG EVENTS IN 'mysql-bin.000001';
```

或使用命令行工具：

```bash
mysqlbinlog mysql-bin.000001
```

---

## 🔄 三者对比与两阶段提交

| 日志       | 负责模块        | 记录方式       | 用途             | 写入时机     |
|------------|------------------|----------------|------------------|--------------|
| Redo Log   | InnoDB           | 物理变更       | 崩溃恢复         | 提交前       |
| Undo Log   | InnoDB           | 撤销信息       | 回滚与 MVCC      | 执行时       |
| Binlog     | MySQL Server 层  | SQL / 行记录   | 复制与恢复       | 提交后       |

### 两阶段提交流程
**MySQL 复制是基于 “已提交事务” 的 Binlog 传输**
1. 执行 BEGIN → 修改数据；

2. 写入 Redo Log（PREPARE）；

3. 写入 Binlog（仅写文件，不刷给从库）；

4. 写入 Redo Log（COMMIT）；

5. 事务提交完成 ✅；

6. 此时才通知 dump thread 发 Binlog 给从库。
