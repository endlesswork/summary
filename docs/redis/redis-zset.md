### zset

zset（有序集合）是一种非常常用的数据结构，它结合了哈希表和跳表的特性，提供了对元素进行排序的能力。zset中的每个元素都会关联一个浮动的分数（score），元素是根据分数的大小进行排序的，因此能够快速执行一些基于排名的操作

zset特点

1.唯一性：zset中的每个元素是唯一的

2.有序性：zset中的元素根据分数进行排序，分数可以是任意浮动的数字

3.高效性：Redis使用跳表（skip list）来实现zset，因此zset支持高效的插入、删除和查询操作，特别是对于范围查询（如按分数区间查询）非常高效

#### redis日常用到指令如下

1. ZADD key score member 
添加元素到zset里面
```
##  a的分数为10
127.0.0.1:6379> ZADD myzset 10 "a"
(integer) 1
127.0.0.1:6379> ZADD myzset 8 "b"
(integer) 1
127.0.0.1:6379> ZADD myzset 11 "c"
(integer) 1
```
2. ZSCORE key member：获取指定元素的分数
```
127.0.0.1:6379> ZSCORE myzset "a"
"10"
```
3. RANK key member：返回元素的排名（从0开始），分数低的元素排名低

ZREVRANK key member：返回元素的反向排名（从0开始），分数高的元素排名低
```
127.0.0.1:6379> ZRANK myzset "b"
(integer) 0
127.0.0.1:6379> ZRANK myzset "a"
(integer) 1
```
4. ZRANGE key start stop [WITHSCORES] 按照分数从小到大获取下标从start到stop的元素

ZREVRANGE key start stop [WITHSCORES]：返回zset中指定范围内的元素，按分数从大到小排列
```
127.0.0.1:6379> ZRANGE myzset 0 1 WITHSCORES
1) "b"
2) "8"
3) "a"
4) "10"
```
5. ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]：返回指定分数范围内的元素。

ZREVRANGEBYSCORE key max min [WITHSCORES] [LIMIT offset count]：返回指定分数范围内的元素，按分数从大到小排列
```
127.0.0.1:6379> ZRANGEBYSCORE myzset 8 10
1) "b"
2) "a"
```
6. ZCARD key：返回zset中元素的数量
```
127.0.0.1:6379> ZCARD myzset
(integer) 3
```
7. ZREM key member [member ...]：从zset中移除指定的元素
```
127.0.0.1:6379> ZREM myzset "c"
(integer) 1
```

#### zset 数据结构

前面说了 zset 结合了哈希表和跳表的特性, 在它的内部保存了 一份由元素与分数构成的哈希结构，一份根据分数排序的跳表
上面 ZSCORE key member：获取指定元素的分数 它就利用了哈希的结构.

跳表是一种 多层级链表结构，主要用来快速根据分数查询到指定或者区间内的元素。 这里我们看下跳表的数据结构





#### SpringBoot使用如下

比如我们有一个根据用户进入时间排序的
```java
public class ZSetDemo {

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    @Resource
    private ObjectMapper objectMapper;

    private final String ZSET_KEY = "user:join:zset";

    // 用户加入（添加到 ZSet）
    @PostMapping("/join")
    public void join(@RequestBody User user) {
        double score = System.currentTimeMillis();
        String json = toJson(user);
        redisTemplate.opsForZSet().add(ZSET_KEY, json, score);
        log.info("User joined: {}, time: {}", user.getName(), score);
    }

    // 获取加入的用户列表（按时间倒序）
    @GetMapping("/list")
    public List<User> list() {
        Set<ZSetOperations.TypedTuple<Object>> result =
                redisTemplate.opsForZSet().reverseRangeWithScores(ZSET_KEY, 0, -1);
        return (result != null) ?
                result.stream()
                        .map(t -> toObject((String) t.getValue(), User.class))
                        .toList()
                : Collections.emptyList();
    }
    // 获取制定数量的用户列表
    @GetMapping("/top")
    public List<User> getTop(@RequestParam(defaultValue = "5") int limit) {
        Set<Object> raw = redisTemplate.opsForZSet().reverseRange(ZSET_KEY, 0, limit - 1);
        if (raw != null) {
            return raw.stream().map(o -> toObject((String) o, User.class)).collect(Collectors.toList());
        }
        return null;
    }


    // 用户离开（从 ZSet 删除）
    @PostMapping("/leave")
    public void leave(@RequestBody User user) {
        String json = toJson(user);
        redisTemplate.opsForZSet().remove(ZSET_KEY, json);
        log.info("User left: {}", user.getName());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    private <T> T toObject(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

}
```

