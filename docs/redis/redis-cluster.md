## redis集群重新分片

Redis 集群的重新分片操作是由 Redis 的集群管理软件 redis-trib 负责执行的， Redis 提供了进行重新分片所需的所有命令，
而 redis-trib 则通过向源节点和目标节点发送命令来进行重新分片操作。 

```
redis-trib 对集群的单个槽slot进行重新分片的步骤如下： 
1.   redis-trib对目标节点发送 CLUSTER SETSLOT <slot> IMPORTING <source_id>命令，让目标节点准备好从源节点导入（import）属于槽slot的键值对。
2.  redis-trib对源节点发送CLUSTER SETSLOT <slot> MIGRATING <target_id> 命令，源节点准备好将属于槽slot 的键值对迁移（migrate）至目标节点。
3.  redis-trib向源节点发送CLUSTER GETKEYSINSLOT <slot> <count>命令，获得最多count个属于槽slot的键值对的键名（key name）。
4.  对于步骤3获得的每个键名，redis-trib都向源节点发送一个MIGRATE <target_ip> <target_port> <key_name> 0 <timeout>命令，
5.  将被选中的键原子地从源节点迁移到目标节点。
6.  重复执行步骤3和步骤4，直到源节点保存的所有属于槽slot的键值对都被迁移到目标节点为止，每次迁移键的过程如下图所示
7.  redis-trib 向集群中的任意一个节点发送CLUSTER SETSLOT <slot> NODE <target_id>命令，将槽 slot指派给目标节点，
   这一指派信息会通过消息发送至整个集群，最终集群中的所有节点都会知道槽slot已经指派给了目标节点
```

![redis-trib](/image/redis/redis-trib.png)

如果重新分片涉及多个哈希槽，那么redis-trib将对每个给定的槽分别执行上面给出的步骤。

假设我们有三台redis集群（不考虑从机器），node0（127.0.0.1：7000）、node1（127.0.0.1：7001）、node2（127.0.0.1：7002），现在我们需要新加一台node3（127.0.0.1：7003）机器，这时候会发现重新分片。
假设槽8000（存在多个key，key0、key1、key2）、8001需要从node2迁移到node3上，对应上面过程中，node2 就为源节点， node3 为目标节点。

如果在这个重新分片的过程，刚好请求的key在发生转移的过程，因为源节点记录了要迁移的目标节点，即使请求到源节点上，这个key并不存在与源节点，此时会返回一个ASK错误，并将请求转发给key存在目标节点。

## Gossip 协议

Gossip 协议（Gossip Protocol）是一种分布式系统中用于**信息传播、节点状态同步**的协议，类似人类传播“八卦”的方式：一个节点告诉几个节点，这几个节点再告诉其他节点，最终信息扩散至整个系统。

### 一、核心原理

- 每个节点定期随机选择一个或多个其他节点
- 交换自己的状态信息以及其他节点的信息（gossip）
- 最终实现整个集群状态的同步（最终一致性）
---

### 二、优缺点

#### ✅ 优点
- 高可扩展性（支持上千个节点）
- 高容错性（节点宕机不影响信息传播）
- 结构简单，实现方便
- 支持最终一致性

#### ❌ 缺点
- 信息同步存在延迟
- 会产生重复传播（带来网络负担）
- 不保证强一致性

---

### 三、Redis Cluster 中的 Gossip 应用

#### 1. 作用
- 发现其他节点
- 传播节点状态（在线、PFAIL、FAIL）
- 维护集群拓扑
- 协助主从切换的投票

#### 2. 机制
- 节点周期性发送 `PING` 消息，随机选中其他节点
- 携带 gossip section（其他节点的状态）
- 接收方响应 `PONG`，也带 gossip section
- 多节点检测某节点不可达 → 标记为 `PFAIL`
- 超过半数节点确认 → 标记为 `FAIL` 并传播

#### 3. 例子：主节点宕机
- 多次 `PING` 不通后标记其为 PFAIL （主观下线）
- Gossip 快速传播该状态
- 过半节点同意后标记为 FAIL （客观下线）
- 触发从节点选主流程（投票）

## Redis Cluster 脑裂问题

### 📌 什么是脑裂（Split-Brain）

Redis Cluster 中的脑裂是指由于网络分区或节点通信异常，导致**两个主节点同时对外服务**，从而产生**数据不一致或数据丢失**的问题。

---

### 🧠 脑裂场景示意

节点 A（原主）与其他节点断联，节点 B（从）被集群投票为新的主节点

此时 A 和 B 都认为自己是主节点，可能同时接受客户端写入

---

### 🛡 Redis Cluster 降低脑裂风险的机制

- **主观下线（PFAIL）与客观下线（FAIL）**
  - 节点通信失败后，需由**多数主节点投票**才能判定为 FAIL。
- **Gossip 协议**
  - 所有节点周期性交换状态，传播失联信息。
- **故障转移限制**
  - 只有多数节点存活时才允许从节点转主。
- **cluster-node-timeout 参数**
  - 控制多长时间未响应判定为失败，默认 15 秒，建议 ≥5 秒。
---

### ✅ 缓解脑裂的建议做法

- 设置合理的 `cluster-node-timeout`
- 写入后加 `WAIT` 命令提升复制确认：
  ```redis
  SET key value
  WAIT 1 1000
- 使用集群感知客户端（如 JedisCluster、Redisson）

- 业务端进行幂等性、去重、乐观锁设计

- 关键场景考虑使用强一致系统（如 etcd、Zookeeper、TiKV）



## 一些在集群中运用到的知识

### Hash Tag

Hash Tag 就是 key 中用 {} 包起来的一部分内容。
在 Redis Cluster 中，每个 key 会被分配到一个槽位（slot），这个槽是通过 CRC16(key) % 16384 算出来的。
但是，如果你在 key 中写了 {...}，Redis 只对花括号中的内容进行哈希计算

```
"user:{1001}:name"
"user:{1001}:age"
```
Redis 会对 {1001} 做哈希计算，而不是整个 key。这样这两个 key 会被放到同一个槽上。

同理 我们运用到Hash Tag 不合理的话就会导致某个hash槽负载过大


Hash Tag 计算 示例
```java
import io.lettuce.core.cluster.SlotHash;

public class SlotHashExample {
    public static void main(String[] args) {
        System.out.println(SlotHash.getSlot("user:{1001}:name"));
        System.out.println(SlotHash.getSlot("user:{1001}:age"));
    }
}
```
