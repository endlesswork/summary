
## 🛡️ Kafka 如何确保消息不丢失
### 🔶 一、生产者保证机制

#### 1. `acks` 参数（确认机制）

```properties
spring.kafka.producer.acks=all
```

| acks 值 | 含义                | 风险                          | 是否推荐  |
| ------ | ----------------- | --------------------------- | ----- |
| 0      | 不等待任何确认           | 可能直接丢消息                     | ❌ 不推荐 |
| 1      | Leader 写入本地日志后即返回 | Leader 崩溃前未同步到 Follower，可能丢 | ⚠️    |
| all/-1 | 所有 ISR 成员都写入成功才返回 | 只要 ISR 有副本在，数据不丢            | ✅ 推荐  |

**acks=all 是最强的持久性保证。**
#### 2. retries 参数（失败重试）
```properties
spring.kafka.producer.retries=3
```
- 当发送失败（如网络波动、临时不可用）时自动重试。
- 仅当 acks ≠ 0 时生效（需要服务器返回错误码）。

### 🔷 二、Kafka 服务端保障机制

#### 1. 副本机制（replication.factor）
创建 Topic 时指定副本数：
```bash
kafka-topics.sh \
  --create \
  --topic my-topic \
  --replication-factor 3 \
  --partitions 10 \
  --bootstrap-server localhost:9092
```
- 每个 Partition 会复制到多个 Broker。
- Kafka 选出一个 Leader，所有写入操作先写 Leader。
- 副本之间通过 ISR 集合保持同步。

#### 2. 最小同步副本数（min.insync.replicas）
```properties
# server.properties 全局配置
min.insync.replicas=2
```
表示当 acks=all 时，ISR 中最少多少个副本写入成功才算成功。


##### 举例：
- 副本数：3，ISR 当前数量：2

- acks=all，min.insync.replicas=2 ✅ 允许写入

- 如果 ISR 降到 1，生产者写入将报错 ❌
```bash
# 创建 topic 时指定 min.insync.replicas
kafka-topics.sh --create --topic safe-topic \
  --replication-factor 3 \
  --partitions 10 \
  --config min.insync.replicas=2 \
  --bootstrap-server localhost:9092
```
⚠️ **ISR < min.insync.replicas 且 acks=all 时，Kafka 会拒绝写入。**

### 🔸 三、消费者保障机制

Kafka 消费者通过 offset 控制消费进度。

```properties
spring.kafka.consumer.enable-auto-commit=false
```
在springboot中我们需要设置不让消费者自动提交

- 如果 自动提交开启，消费者会在后台根据 auto.commit.interval.ms 定期提交 offset，无需你手动调用。

- 若关闭自动提交，并使用手动 AckMode 模式，offset 提交将在你调用 ack.acknowledge() 时发生，确保了 只有在业务处理成功之后才提交，从而避免因处理失败或宕机造成的消息丢失。


从 **Spring Kafka 2.3 版本开始**，框架默认会将 enable.auto.commit 设置为 false， 鼓励使用手动提交方式