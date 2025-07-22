## MySQL 最左前缀原则（最左索引准则）

在使用 **复合索引（联合索引）** 时，MySQL 遵循 **最左前缀原则**，这是影响索引是否生效的关键规则。


## 📌 什么是最左前缀原则？

> 当使用复合索引时，只有查询条件包含索引中最左边的字段，才能使用该索引。

例如，创建以下复合索引：

```sql
CREATE INDEX idx_name_age_sex ON users(name, age, sex);
```

这个索引会按照 (name, age, sex) 的顺序构建。

## ✅ 能使用该索引的查询示例

```sql
-- 只使用 name
SELECT * FROM users WHERE name = 'Tom';

-- 使用 name 和 age
SELECT * FROM users WHERE name = 'Tom' AND age = 18;

-- 使用全部字段
SELECT * FROM users WHERE name = 'Tom' AND age = 18 AND sex = 'M';

-- 使用 name 的前缀匹配
SELECT * FROM users WHERE name LIKE 'To%';

```

## ❌ 不能使用该索引的查询示例

```sql
-- 缺少最左列 name
SELECT * FROM users WHERE age = 18;

-- 跳过 age，只用了 name 和 sex
SELECT * FROM users WHERE name = 'Tom' AND sex = 'M';

-- name 使用了通配符前缀（无法用索引）
SELECT * FROM users WHERE name LIKE '%om';

-- age 无法使用索引
SELECT * FROM users WHERE name > 'A' AND age = 18;

```

## 🔗 最左匹配原理（匹配链）
假设索引为 (a, b, c, d)，那么以下组合 可以 使用索引：

- a
- a, b
- a, b, c
- a, b, c, d

但以下组合 不可以：

- b
- b, c
- a, c
- a, b, d （跳过 c）

## 🧠 一定会用到索引吗
以我们上面的例子举例
```sql
SELECT * FROM users WHERE name = 'Tom' AND age = 18;
```
一定会用到索引吗？
