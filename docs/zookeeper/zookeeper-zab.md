# 🧩 ZAB 协议（ZooKeeper Atomic Broadcast）

ZAB 是 ZooKeeper 用来实现 **分布式一致性** 的核心协议，确保多个节点之间的数据 **顺序一致、原子性广播**，并具备 **崩溃恢复能力**。

## 📌 核心功能

1. **原子广播（Atomic Broadcast）**  
   确保事务请求在所有节点上以相同顺序被执行。

2. **崩溃恢复（Crash Recovery）**  
   当 Leader 宕机时，选举新的 Leader 并将其数据与其他节点同步，确保一致性。


## 🔄 工作阶段

### 1. 选举阶段（Leader Election）
- 触发场景：集群启动或 Leader 崩溃。
- 节点根据 **事务 ID（ZXID）** 进行选举，选出最新的 Leader。

### 2. 数据同步阶段（Discovery + Synchronization）
- 新 Leader 将自己的数据同步给所有 Follower。
- 确保所有存活节点的数据状态一致。

### 3. 广播阶段（Broadcast + Commit）
- 客户端写请求发给 Leader。
- Leader 发起 Proposal（提议） → 等待多数 ACK → 发出 Commit 通知。
- 所有节点应用事务，确保状态同步。

##  ZooKeeper 如何保证顺序一致性？

### 📌 1. 所有写请求由 Leader 顺序处理

- 所有写请求（create、setData、delete）只能由 **Leader 节点** 接收并发起
- Leader 按接收顺序为每个事务分配一个唯一编号，广播给集群中的 Follower

---

### 🔁 2. ZAB 协议保证事务一致传播

ZAB（ZooKeeper Atomic Broadcast）是 ZooKeeper 的核心协议，保证：

- **Proposal 广播**：Leader 将事务封装为 Proposal 广播到所有 Follower
- **多数确认**：Proposal 被多数节点（n/2 + 1）确认（ACK）后才会提交
- **Commit 提交**：Leader 再次广播 Commit 命令，所有节点按顺序提交事务

---

### 🧮 3. ZXID：事务顺序标识

每个事务都有一个全局唯一的 ZXID（ZooKeeper Transaction ID）：

- ZXID = `epoch + counter`
  - `epoch`：Leader 任期编号（每次 Leader 选举 +1）
  - `counter`：该任期内的事务计数器，自增
- 所有事务按 ZXID 有序写入 → 保证全局顺序

## 🤔 如果客户端在zookeeper写入数据同时读取会不会读到脏数据

有可能读到脏数据，当读取的节点并没有更新到最新的数据 就会读取到脏数据

[官方解释](https://zookeeper.apache.org/doc/r3.9.3/zookeeperInternals.html?utm_source=chatgpt.com#sc_consistency)
```
Consistency Guarantees
The consistency guarantees of ZooKeeper lie between sequential consistency and linearizability. In this section, we explain the exact consistency guarantees that ZooKeeper provides.

Write operations in ZooKeeper are linearizable. In other words, each write will appear to take effect atomically at some point between when the client issues the request and receives the corresponding response. This means that the writes performed by all the clients in ZooKeeper can be totally ordered in such a way that respects the real-time ordering of these writes. However, merely stating that write operations are linearizable is meaningless unless we also talk about read operations.

Read operations in ZooKeeper are not linearizable since they can return potentially stale data. This is because a read in ZooKeeper is not a quorum operation and a server will respond immediately to a client that is performing a read. ZooKeeper does this because it prioritizes performance over consistency for the read use case. However, reads in ZooKeeper are sequentially consistent, because read operations will appear to take effect in some sequential order that furthermore respects the order of each client's operations. A common pattern to work around this is to issue a sync before issuing a read. This too does not strictly guarantee up-to-date data because sync is not currently a quorum operation. To illustrate, consider a scenario where two servers simultaneously think they are the leader, something that could occur if the TCP connection timeout is smaller than syncLimit * tickTime. Note that this is unlikely to occur in practice, but should be kept in mind nevertheless when discussing strict theoretical guarantees. Under this scenario, it is possible that the sync is served by the “leader” with stale data, thereby allowing the following read to be stale as well. The stronger guarantee of linearizability is provided if an actual quorum operation (e.g., a write) is performed before a read.

Overall, the consistency guarantees of ZooKeeper are formally captured by the notion of ordered sequential consistency or OSC(U) to be exact, which lies between sequential consistency and
```
## 📊 与其他协议的关系

- 类似于 **Raft 协议**，但 ZAB 专门为 ZooKeeper 优化。
- 更适用于需要频繁广播事务日志的服务，如配置中心、元数据存储等。
