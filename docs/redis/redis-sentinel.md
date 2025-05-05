## Sentinel（哨岗、哨兵）

Sentinel 是 Redis 的高可用性（High Availability）解决方案。

**（Sentinel 本质上只是一个运行在特殊模式下的Redis服务器,所以启动Sentinel的第一步,就是初始化一个普通的 Redis服务器,一旦 Redis 启动为 Sentinel 模式，它就不再是一个主节点或从节点的 Redis 服务器，而是一个独立的 Sentinel 实例，不具备数据存储功能）**

由一个或多个 Sentinel 实例（instance）组成的 Sentinel 系统（system），可以监视任意多个主服务器，以及这些主服务器属下的所有从服务器。

当被监视的主服务器进入下线状态时，Sentinel 会自动将该主服务器属下的某个从服务器升级为新的主服务器，然后由新的主服务器代替已下线的主服务器继续处理命令请求。

![redis-sentinel](/image/redis/redis-sentinel1.png)

如图所示，此时server1为主节点 ，server2、server3、server4 为从节点

Sentinel 监控 server1、server2、server3、server4

server2、server3、server4正从 server1复制数据

