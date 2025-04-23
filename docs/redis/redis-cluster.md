## redis集群
### redis集群重新分片

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

如果重新分片涉及多个槽，那么redis-trib将对每个给定的槽分别执行上面给出的步骤。

假设我们有三台redis集群（不考虑从机器），node0（127.0.0.1：7000）、node1（127.0.0.1：7001）、node2（127.0.0.1：7002），现在我们需要新加一台node3（127.0.0.1：7003）机器，这时候会发现重新分片。
假设槽8000（存在多个key，key0、key1、key2）、8001需要从node2迁移到node3上，对应上面过程中，node2 就为源节点， node3 为目标节点。

如果在这个重新分片的过程，刚好请求的key在发生转移的过程，因为源节点记录了要迁移的目标节点，即使请求到源节点上，这个key并不存在与源节点，此时会返回一个ASK错误，并将请求转发给key存在目标节点。