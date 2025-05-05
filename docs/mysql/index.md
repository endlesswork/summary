# MySQL 索引种类

1. **普通索引（Normal Index）**：最基础的索引类型，没有唯一性约束，仅用于加速查询。  
   示例：CREATE INDEX idx_column ON table_name(column_name);

2. **唯一索引（Unique Index）**：要求索引列的值必须唯一（允许一个 NULL），用于约束数据的唯一性，如邮箱、用户名等字段。  
   示例：CREATE UNIQUE INDEX idx_unique_column ON table_name(column_name);

3. **主键索引（Primary Key Index）**：一种特殊的唯一索引，不允许 NULL，每张表只能有一个主键。在 InnoDB 中是聚簇索引（Clustered Index），数据按主键顺序存储。  
   示例：CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50));

4. **联合索引（Composite Index）**：一个索引包含多个列（最多16列），遵循“最左前缀原则”：查询必须从最左边字段开始连续使用，索引才会生效。  
   示例：CREATE INDEX idx_multi ON orders(user_id, create_time);  
   可用：SELECT * FROM orders WHERE user_id = 1;  
   可用：SELECT * FROM orders WHERE user_id = 1 AND create_time > '2024-01-01';  
   无效：SELECT * FROM orders WHERE create_time > '2024-01-01';

5. **全文索引（Fulltext Index）**：用于全文检索，适用于 CHAR、VARCHAR、TEXT 字段。使用 MATCH ... AGAINST 语法进行模糊匹配，MyISAM 和 InnoDB（5.6+）支持。  
   示例：CREATE TABLE articles (id INT PRIMARY KEY, title VARCHAR(200), content TEXT, FULLTEXT(content));  
   查询：SELECT * FROM articles WHERE MATCH(content) AGAINST('数据库 引擎');

6. **空间索引（Spatial Index）**：用于地理空间数据类型（如 POINT、GEOMETRY），适用于 MyISAM 和 InnoDB（5.7+）引擎。常配合 GIS 函数使用。  
   示例：CREATE TABLE locations (id INT PRIMARY KEY, name VARCHAR(100), position POINT, SPATIAL INDEX(position));

7. **前缀索引（Prefix Index）**：对字符串字段只索引前 N 个字符，适用于 BLOB/TEXT 或长字符串字段，节省空间但不支持排序或全值比较。  
   示例：CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(255), INDEX idx_email_prefix(email(10)));

8. **哈希索引（Hash Index）**：基于哈希表实现，仅适用于 MEMORY 引擎。查询性能极高，但仅支持等值匹配，不支持范围查询、排序、模糊搜索等操作。  
   示例：CREATE TABLE sessions (sid CHAR(32), data TEXT, INDEX

# 问题
## 索引越多越好吗

不是，涉及到数据增删改都会导致重新计算索引，如果索引很多，反而会加重服务器负担
