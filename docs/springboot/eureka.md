
Eureka 是 Netflix 提供的服务注册与发现组件。为了提高性能、减少服务端压力，Eureka Server 和 Client 实现了多级缓存机制。

## 🧱 一、简述

- **Eureka Server**：服务注册中心，管理所有服务实例信息。
- **Eureka Client**：服务提供方和调用方，定期向 Server 拉取服务注册表。

## 📦 二、Eureka Server 缓存机制（三级缓存）

### ✅ 1. 一级缓存：读写缓存（ReadWrite Cache）

- **数据结构**：`ConcurrentHashMap<String, Lease<InstanceInfo>>`
- **内容**：包含所有注册的服务实例（实时数据）
- **特点**：读写均实时更新，作为注册表主数据源
- **触发更新**：注册（register）、下线（cancel）、续约（renew）

---

### ✅ 2. 二级缓存：只读缓存（ReadOnly Cache）

- **类名**：`ResponseCacheImpl`
- **数据结构**：内部维护一个 `ConcurrentMap<Key, Value>`
- **刷新频率**：默认每 30 秒从一级缓存同步一次
- **作用**：缓解对主缓存的并发读取压力

**配置项**：

```properties
eureka.server.responseCacheUpdateIntervalMs=30000
```
### ✅ 3. 三级缓存：压缩缓存（GZIP Cache）
- **作用**：缓存压缩后的 JSON 响应数据
- **触发条件**：客户端请求带有 Accept-Encoding: gzip 时
- **好处**：减少网络传输流量，加快客户端获取注册表的速度

## 🖥️ 三、Eureka Client 本地缓存机制
### ✅ 本地注册表缓存（Local Registry Cache）
- **维护类**：DiscoveryClient
- **作用**：缓存从 Eureka Server 拉取的注册信息
- **刷新周期**：默认每 30 秒拉取一次（增量获取）
```properties
eureka.client.registryFetchIntervalSeconds=30
```
**一个服务注册到 Eureka Server 上后，默认情况下最多需要约 60 秒才能被其它服务发现。
eureka.server.responseCacheUpdateIntervalMs
+ 
eureka.client.registryFetchIntervalSeconds=60s**
- 意义：
	- 降低对 Server 的依赖
	- 在服务中心宕机时仍可访问本地缓存中的服务（弱依赖）
## 🔄 四、缓存更新机制对比表
| 缓存层级         | 所在地    | 刷新方式          | 用途             |
| ------------ | ------ | ------------- | -------------- |
| 一级缓存（读写缓存）   | Server | 实时更新          | 主存储，处理注册/下线等变更 |
| 二级缓存（只读缓存）   | Server | 定时从一级缓存同步     | 提高读取性能         |
| 三级缓存（GZIP缓存） | Server | 跟随只读缓存更新      | 提升传输效率         |
| 本地缓存         | Client | 定时从 Server 拉取 | 提高可用性，离线支持     |

 