
Bitmap是什么？

本质上是一个连续的二进制数组（bit数组），每个位（bit）只能是 0 或 1。

Redis 里用一个字符串（string类型）模拟出来的，非常省空间

#### 日常使用

因为 Bitmap 1个bit 只占 1位（不是1字节，是1位！）

```
所以 1亿 个元素也就占 11.92mb

100000000/8/1024/1024 = 11.92

```

所以 Bitmap 特别适合统计那些只有2个状态的大批量数据

比如要统计用户在线 
```
## 设置1000位置为1
127.0.0.1:6379> SETBIT mybitmap 1000 1
(integer) 0
127.0.0.1:6379> SETBIT mybitmap 1001 0
(integer) 0
127.0.0.1:6379> SETBIT mybitmap 1002 1
(integer) 0
## 统计有多少个1
127.0.0.1:6379> BITCOUNT mybitmap
(integer) 2
```


