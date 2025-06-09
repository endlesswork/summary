LongAdder**继承了 Striped64**，并**借助它完成核心功能（分段计数、CAS、自旋扩容等）**

## 📌 方法总览
| 方法名              | 功能说明                     |
| ---------------- | ------------------------ |
| `add(long x)`    | 累加指定的值                   |
| `increment()`    | 等价于 `add(1)`             |
| `decrement()`    | 等价于 `add(-1)`            |
| `sum()`          | 返回当前总和（非原子）              |
| `reset()`        | 重置 `base` 和所有 `Cell` 为 0 |
| `sumThenReset()` | 先求和再重置                   |
## 核心变量
Striped64 类中
```java
transient volatile Cell[] cells;  // 分段数组
transient volatile long base;     // 基础值
transient volatile int cellsBusy; // 锁标识，用于初始化或扩容 cells
```