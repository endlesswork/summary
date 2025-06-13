
## 🌐 Kafka 集群

Kafka 集群通常由多个 **Broker** 节点组成。一个 Topic 可以被划分为多个 **Partition（分区）**，每个 Partition 可以分布在不同的 Broker 上，实现负载均衡和高可用。

### 📦 Partition 与 Replica

- 每个 Partition 可以设置 **副本数（replication.factor）**
- 副本可以分布在不同的 Broker 上
- Kafka 为每个 Partition 的副本选举一个 **Leader**
- 所有的 **读写操作都通过 Leader 进行**
- 其他副本称为 **Follower**，从 Leader 复制数据

## 🔄  分区副本之间数据同步机制（ISR）

Kafka 使用 ISR 机制（In-Sync Replicas）来保证数据的可靠性和一致性。

### 🧱 术语解释

| 缩写  | 含义 |
|-------|------|
| **AR** | Assigned Replicas：所有副本集合（包括 Leader 和所有 Follower） |
| **ISR** | In-Sync Replicas：当前与 Leader 保持同步的副本集合 |
| **OSR** | Out-of-Sync Replicas：未与 Leader 保持同步的副本集合 |

### 📈 示例说明

假设一个 Partition 有 **5 个副本**，其中一个是 Leader：

- 初始状态下，所有副本数据一致：
```text
  AR = 5
  ISR = 5
  OSR = 0
```  
- 如果其中一个副本因为延迟等原因未同步最新数据
```text
  AR = 5
  ISR = 4
  OSR = 1   ← AR = ISR + OSR
```
### 🔁 同步流程简述
1. Producer 将消息写入 Partition 的 Leader
2. Leader 将消息同步到 ISR 中的 Follower
3. 当满足 acks=all 且写入被 ISR 中所有副本确认，Producer 才认为消息成功写入
4. Follower 若长时间落后，将被剔除出 ISR，变为 OSR

## 🧠 LEO和HW
### 🔹 LEO（Log End Offset）
每个副本自己的**日志末尾偏移量**。
- 表示该副本当前写入的最大 offset。
- **每个副本都有自己的 LEO**。
- 即该副本“写到哪了”。
#### 📌 举例：
如果 Leader 已写入 offset = 103，Follower 只同步到了 offset = 100，则：
| **副本角色**       | **LEO** |
| ---------- | --- |
| Leader     | 103 |
| Follower A | 100 |
| Follower B | 102 |

### 🔸 HW（High Watermark，高水位）
表示**所有 ISR 副本都已经复制完成的最大 offset。**
- 只有 offset ≤ HW 的消息，才对**消费者可见**
- **所有 ISR 副本的 LEO 最小值**即为 HW
#### 📌 继续上例：
假设当前 ISR = {Leader, Follower B}，则：

| **副本角色**       | **LEO** | **ISR**            |
| ---------- | --- | -------------- |
| Leader     | 103 | ✅              |
| Follower A | 100 | ❌（落后太久，移出 ISR） |
| Follower B | 102 | ✅              |

那么：
```
HW = min(103, 102) = 102
```