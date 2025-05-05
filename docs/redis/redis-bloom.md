
在日常的开发中，我们为了预防缓存击穿经常会用到布隆过滤器，在这里介绍下布隆过滤器

布隆过滤器（Bloom Filter）是一种空间效率极高的概率型数据结构，用于判断一个元素是否在一个集合中。它的最大特点是：

1.可能误判为存在（即“假阳性”）；

2.绝不会误判为不存在（即“假阴性”为0）；

3.空间占用远小于哈希集合（如 Set）；

4.查询和插入的时间复杂度都是 O(k)，k 是哈希函数的个数，通常也很小。

#### 为什么它拥有这些特点

布隆过滤器底层为位数组，计算插入时多个哈希函数对元素取 hash，标记多个位置为 1，

如图所示

元素a 经过hash函数（这里k为3）计算得到位置为 1、2、3

![redis-trib](/image/redis/redis-bloom1.png)

元素b 经过hash函数计算得到位置为 1、2、5（3这个位置已经被元素a标记了）

![redis-trib](/image/redis/redis-bloom2.png)


假设 我们有以下元素和他们标记的位置

元素 | 函数1| 函数2| 函数3
---|---|---|---
a | 1 | 2| 3
b | 1 | 2| 5
c | 1 | 2| 6
d | 1 | 3| 5
e | 1 | 3| 6
f | 2 | 3| 6

我们插入6个元素 标记了 1、2、3、5、6 这个五个位置，这也是为什么空间占用远小于哈希集合（如 Set）

布隆过滤器查找元素存不存在 会计算这个元素得到的hash位置，然后判断这些位置是不是被标记为1

假设这时候 我们需要查找一个 g有没有插入过，但是这个元素计算出位置为 3、5、6 因为这三个位置已经被其他元素标价，
这也是为什么可能误判为存在和绝不会误判为不存在。

同时这也导致布隆过滤器一个特点 无法删除元素，因为他只将位置标记为1，并没有记录谁标记了这个位置，有多少个元素标记了这个位置


#### redis日常用到指令如下

Redis 本身不内置布隆过滤器，但可以通过 Redis 模块 RedisBloom 来使用

```
## 创建1个容量为1000 误判率1%的
127.0.0.1:6379> BF.RESERVE mybloom 0.01 1000

## 添加
127.0.0.1:6379> BF.ADD mybloom "a"
(integer) 1
## 判断存在
127.0.0.1:6379> BF.EXISTS mybloom "a"
(integer) 1
## 判断不存在
127.0.0.1:6379> BF.EXISTS mybloom "d"
(integer) 0
```

#### SpringBoot使用如下

springboot的 RedisTemplate 并不支持 bloom 需要引入 redisson

```java
@RestController
@RequestMapping("/bloom")
public class BloomDemo {

    private final BloomService bloomService;

    public BloomDemo(BloomService bloomService) {
        this.bloomService = bloomService;
    }

    @PostMapping("/add")
    public Boolean add(@RequestParam String item) {
        return  bloomService.add(item);
    }

    @GetMapping("/check")
    public Boolean check(@RequestParam String item) {
        return bloomService.mightContain(item);
    }
}

```

```java
@Service
public class BloomService {

    private final RBloomFilter<String> bloomFilter;

    public BloomService(RedissonClient redissonClient) {
        this.bloomFilter = redissonClient.getBloomFilter("myBloomTest");
        // 初始化：预期元素数量与误判率
        bloomFilter.tryInit(100000L, 0.01);
    }

    public boolean add(String value) {
        return bloomFilter.add(value);
    }

    public boolean mightContain(String value) {
        return bloomFilter.contains(value);
    }

}

```