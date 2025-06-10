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
│   ├── 00000000000000000100.log         
│   ├── 00000000000000000100.index       
│   ├── 00000000000000000100.timeindex   
│   └── leader-epoch-checkpoint          🧭 epoch 变更历史
├── message-topic-1/
│   └── ...

```
## 📌 各个文件含义
在Kafka日志文件中，*.log、*.index、 *.timeindex 都是成对出现，在每个分区内存在多个这样的成对文件组合
### *.log 文件
Kafka 真正存储消息的文件。
- 文件名表示该段的第一个消息的 offset

### *.index 文件

### *.timeindex 文件

### leader-epoch-checkpoint
