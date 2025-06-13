Kafka 是一个分布式的、基于日志的消息系统。所谓“持久化”，就是 Kafka 会将生产者发送的消息顺序写入磁盘上的日志文件中，这样即使 Kafka 服务器重启，数据也不会丢失。

## 🗂️ 一、日志文件的物理结构

假设我们有个Topic  message-topic 分区为2

Kafka 会在磁盘形成以下目录结构的文件
```bash
/tmp/kafka-logs/
├── message-topic-0/
│   ├── 00000000000000000000.log         ✅ 消息数据文件（Log Segment）
│   ├── 00000000000000000000.index       🔍 偏移量索引
│   ├── 00000000000000000000.timeindex   🕒 时间索引
│   ├── 00000000000000001000.log         
│   ├── 00000000000000001000.index       
│   ├── 00000000000000001000.timeindex   
│   └── leader-epoch-checkpoint          🧭 epoch 变更历史
├── message-topic-1/
│   └── ...

```
## 📌 各个文件含义
在Kafka日志文件中，*.log、*.index、 *.timeindex 都是成对出现，因为滚动机制，在每个分区内存在多个这样的成对文件组合
### *.log 文件

Kafka 真正存储消息的文件。
- 因为滚动机制，每个分区包含多个这个样的文件
- 文件名表示该段的第一个消息的 offset
	例如：00000000000000000000.log 表示从 offset 0 开始，00000000000000001000.log 表示从offset 1000 开始。
- 格式：文件内是多个记录，每条记录包含 offset、timestamp、key、value 等。
- 每个分区下消息是有序的

#### ✅ 示例结构
00000000000000000000.log
```log
[offset: 0][timestamp: 1747759812000][key: user0][value: message0]
[offset: 1][timestamp: 1747759813000][key: user0][value: message1]
...
[offset: 50][timestamp: 1747759842000][key: user0][value: message50]
```
00000000000000001000.log
```log
[offset: 1000][timestamp: 1747759912000][key: user0][value: messagexx0]
[offset: 1001][timestamp: 1747759913100][key: user0][value: messagexx1]
...
[offset: 1050][timestamp: 1747759992000][key: user0][value: messagexx50]
```
---
### *.index 文件

- 保存的是 offset 到 .log 文件中位置的物理地址之间的映射。
- 可以快速定位某个 offset 的消息在 .log 文件中的 byte 位置。
- Kafka 每隔 index.interval.bytes（默认4KB）就记录一条索引。
- 它是一种稀疏索引，不会为每条日志都建立索引信息。
#### ✅ 示例结构
00000000000000000000.index 
```index
offset: 0  → position: 0
offset: 10 → position: 4000
offset: 19 → position: 7900
...
offset: 50 → position: 36000
```
假设我们要查找offset= 12的数据，我们先通过00000000000000000000.index找到 offset: 10对应的物理地址，然后再向后遍历，便能快速得到offset= 12的数据

---

### *.timeindex 文件

- 保存的是时间戳到 offset 的映射。
- 用于查找某个时间之后的第一条消息，支持基于时间的查询。
- 它也是一种稀疏索引，不会为每条日志都建立索引信息。
#### ✅ 示例结构
00000000000000000000.timeindex
```timeindex
timestamp: 1747759812000 → offset: 0
timestamp: 1747759813000 → offset: 8
...
timestamp:1747759842000 → offset: 50
```
#### ✅ 对比：*.index vs *.timeindex
| 文件类型         | 作用                               | 索引类型   | 索引内容                 |
| ------------ | -------------------------------- | ------ | -------------------- |
| `*.index`     | 根据 offset 快速定位 `.log` 中的 byte 位置 | ✅ 稀疏索引 | `offset → position`  |
| `*.timeindex` | 根据时间戳快速定位 offset（再去查 `.log`）     | ✅ 稀疏索引 | `timestamp → offset` |

---
### leader-epoch-checkpoint

- Kafka 使用 Leader Epoch（任期）机制来处理副本同步。
- 文件记录了历史 leader epoch 以及该 epoch 对应的起始 offset。
- 主要用于副本一致性校验和故障恢复。

## 💡 保证kafka消息有序的两种方式
| 方式                  | 原理                                        | 应用场景                       |
| ------------------- | ----------------------------------------- | -------------------------- |
| **1. 所有消息用同一个 key** | Kafka 会将同一个 key 的消息始终发送到同一个分区中 | 对某类数据（如某个用户、某个订单）保持顺序      |
| **2. 所有消息发送到同一个分区** | 即使没有 key，只要指定 partition，Kafka 保证该分区内的写入顺序 | 对整个 topic 的消息顺序要求较高（吞吐会受限） |
