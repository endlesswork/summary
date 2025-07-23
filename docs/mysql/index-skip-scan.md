## 📚 MySQL Index Skip-Scan

`Index Skip-Scan` 是 MySQL(8.0+) 在不满足最左前缀原则的情况下，仍然尝试使用复合索引的一种优化策略。


## ✅ 使用条件

- 查询 **未包含复合索引的最左列**；
- 复合索引的 **最左列基数较低**（distinct 值少）；
- 查询中使用了中间或尾部字段的 **等值或范围条件**。

---

## 📌 示例

```sql
CREATE INDEX idx_name_age_sex ON users(name, age, sex);
```
查询：

```sql
SELECT * FROM users WHERE age = 30;
```
该查询未使用最左列 name，但如果 name 的基数较低，MySQL 可能会使用 Index Skip-Scan。

MySQL 内部行为类似于：

```sql
SELECT * FROM users WHERE name = 'Tom' AND age = 30
UNION ALL
SELECT * FROM users WHERE name = 'Jerry' AND age = 30
UNION ALL
SELECT * FROM users WHERE name = 'Anna' AND age = 30;
```
## 🔍 执行计划

假设我们有以下数据

| ID  | Name  | Age | Sex |
|-----|-------|-----|-----|
| 1   | Tom   | 30  | M   |
| 2   | Tom   | 25  | M   |
| 3   | Tom   | 30  | F   |
| 4   | Jerry | 30  | M   |
| 5   | Jerry | 25  | F   |
| 6   | Anna  | 30  | F   |
| 7   | Anna  | 22  | F   |
| 8   | Bob   | 30  | M   |
| 9   | Bob   | 28  | M   |
| 10  | Lisa  | 30  | F   |
| 11  | Lucy  | 25  | F   |
| 12  | John  | 30  | M   |
| 13  | John  | 22  | M   |
| 14  | Zoe   | 27  | F   |
| 15  | Zoe   | 30  | F   |

当我们执行sql
```sql
EXPLAIN SELECT * FROM users WHERE age = 30 AND sex = 'F';
```
| id | select\_type | table | type  | key                 | key\_len | ref  | rows | filtered | Extra                    |
| -- | ------------ | ----- | ----- | ------------------- | -------- | ---- | ---- | -------- | ------------------------ |
| 1  | SIMPLE       | users | index | idx\_name\_age\_sex | 207      | NULL | 15   | 6.67     | Using where; Using index |


