InnoDB 存储引擎为了实现高并发事务处理，采用了多种锁机制，包括行锁、间隙锁、意向锁、表锁、元数据锁等。

## 🔒 1. 行锁（Record Lock）

- **定义**：锁定某一条已存在的记录。
- **触发条件**：
  - 精确匹配索引列的 DML/SELECT FOR UPDATE 语句。
- **示例**：

```sql
SELECT * FROM users WHERE id = 5 FOR UPDATE;
UPDATE users SET name = 'aaa' WHERE id = 5;
```
- 说明：其他事务不能修改这条记录，直到当前事务提交或回滚。

## 🔒 2. 间隙锁（Gap Lock）
- **定义**：锁定两条索引记录之间的间隙，为了防止幻读而引入的锁。它锁住的是 **索引记录之间的间隙**，并不会锁定具体的记录。
- **触发条件**：
	- 事务隔离级别为 REPEATABLE READ。
	- 使用范围查询且带索引（不是主键等值）。
	- 语句为 SELECT ... FOR UPDATE、UPDATE 等。

- **示例**：
```sql
SELECT * FROM users WHERE id > 5 AND id < 10 FOR UPDATE;
DELETE FROM users WHERE id > 5 AND id < 10;
```
- 说明：如果 id 是主键或有索引，会锁住 id 在 (5,10) 之间的空隙，防止插入 id=6、7、8、9 等记录。如果id<5并不存在记录，则锁住(-∞,10)
**会向前“扩展”到前一条记录，如果没有，就锁到负无穷（-∞），**

## 🔒 3. Next-Key 锁（Record + Gap）
- **定义**：行锁 + 间隙锁，锁住记录本身及其前方间隙。
- **触发条件**：
	- 默认使用 REPEATABLE READ 隔离级别。

	- 对索引列进行范围或等值查询。

	- 使用 SELECT ... FOR UPDATE、UPDATE、DELETE。
- **示例**：
```sql
SELECT * FROM users WHERE id > 5 AND id <= 10 FOR UPDATE;
DELETE FROM users WHERE id > 5 AND id <= 10;
```
- 说明：假设id< 10的最前面一个数是5会锁住 id 在 (5,10] 之间的范围，如果id<10并不存在记录，则锁住(-∞,10]
**会向前“扩展”到前一条记录，如果没有，就锁到负无穷（-∞），**


## 🔒 4. 意向锁（Intention Lock）
- **定义**：表级锁，表示事务打算对某些行加锁。从而实现**行锁与表锁的兼容性管理。**
- 类型：
	- IS（意向共享锁）：表示将对某些行加共享锁
	- IX（意向排他锁）：表示将对某些行加排他锁
- **触发条件**：
	- 在加行锁前，InnoDB 自动添加意向锁
	
- **示例**：IS
```sql
-- 事务A
START TRANSACTION;
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;
```
- 行级加了：S 锁（共享锁）
- 表级自动加：IS 意向共享锁

- **示例**：IX
```sql
-- 事务B
START TRANSACTION;
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```
- 行级加了：X 锁（排他锁）
- 表级自动加：IX 意向排他锁
### 可兼容性
|    | IS | IX | S | X | LOCK TABLE WRITE |
| -- | -- | -- | - | - | ---------------- |
| IS | ✔  | ✔  | ✔ | ❌ | ❌                |
| IX | ✔  | ✔  | ❌ | ❌ | ❌                |
| S  | ✔  | ❌  | ✔ | ❌ | ❌                |
| X  | ❌  | ❌  | ❌ | ❌ | ❌                |


### 🧠 注意点
- ✅ 意向锁不会锁住任何具体数据，只是一个“标志”。
- ✅ 它告诉数据库引擎：“我在这张表的一部分记录上加了锁，别来加整张表的锁！”
- ❌ 你不能直接控制意向锁，它是 InnoDB 自动加的。

## 🔒 5. 表锁（Table Lock）
- **定义**：显式锁定整张表，阻止其他事务读写。
- **触发条件**：
	- 使用 LOCK TABLES 显式加锁
	
- **示例**
```sql
LOCK TABLES
```

## 🔒 6.  元数据锁（MDL - Metadata Lock）
- **定义**：保护表结构的锁，防止 DDL 与 DML 冲突。
- **触发条件**：
	- 访问表（SELECT/INSERT/UPDATE 等）时自动加锁
- **示例**
```sql
-- 会话1
BEGIN;
SELECT * FROM users WHERE id = 1;

-- 会话2（阻塞）
ALTER TABLE users ADD COLUMN sex INT;
```
- **说明：**只要表在事务中未提交，其他线程不能修改表结构。

## 数据引擎对比

| 锁类型                | 是否 InnoDB 专属   | 是否 MyISAM 有     |
| ------------------ | -------------- | --------------- |
| ✅ 行锁（Record Lock）  | ✔️ 仅 InnoDB 支持 | ❌（MyISAM 只有表锁）  |
| ✅ 间隙锁（Gap Lock）    | ✔️ InnoDB 特有   | ❌               |
| ✅ Next-Key 锁       | ✔️ InnoDB 专属   | ❌               |
| ✅ 意向锁（Intent Lock） | ✔️ InnoDB 专属   | ❌               |
| ❌ 表锁（LOCK TABLE）   | ✅ 所有存储引擎都支持    | ✔️ MyISAM 主要锁类型 |
