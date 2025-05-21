InnoDB 存储引擎为了实现高并发事务处理，采用了多种锁机制，包括行锁、间隙锁、意向锁、表锁、元数据锁等。本文梳理各种锁的类型、触发条件及应用场景。

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
- 说明：会锁住 id 在 (5,10) 之间的空隙，防止插入 id=7 等记录。
## 🔒 3. Next-Key 锁（Record + Gap）
- **定义**：行锁 + 间隙锁，锁住记录本身及其前方间隙。
- **触发条件**：
	- 默认使用 REPEATABLE READ 隔离级别。

	- 对索引列进行范围或等值查询。

	- 使用 SELECT ... FOR UPDATE、UPDATE、DELETE。
- **示例**：
```sql
SELECT * FROM users WHERE id > 5 AND id < 10 FOR UPDATE;
```
- 说明：会锁住 id 在 (5,10) 之间的空隙，防止插入 id=7 等记录。