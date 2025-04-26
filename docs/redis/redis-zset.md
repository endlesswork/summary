### zset

zset（有序集合）是一种非常常用的数据结构，它结合了哈希表和跳表的特性，提供了对元素进行排序的能力。zset中的每个元素都会关联一个浮动的分数（score），元素是根据分数的大小进行排序的，因此能够快速执行一些基于排名的操作

zset特点

1.唯一性：zset中的每个元素是唯一的

2.有序性：zset中的元素根据分数进行排序，分数可以是任意浮动的数字

3.高效性：Redis使用跳表（skip list）来实现zset，因此zset支持高效的插入、删除和查询操作，特别是对于范围查询（如按分数区间查询）非常高效

#### SpringBoot使用如下

比如我们有一个根据用户进入时间排序的
```
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

