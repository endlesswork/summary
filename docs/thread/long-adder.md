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
```java
static final class Cell {
	volatile long value;
	Cell(long x) { value = x; }
	final boolean cas(long cmp, long val) {
		return VALUE.weakCompareAndSetRelease(this, cmp, val);
	}
	final void reset() {
		VALUE.setVolatile(this, 0L);
	}
	final void reset(long identity) {
		VALUE.setVolatile(this, identity);
	}
	final long getAndSet(long val) {
		return (long)VALUE.getAndSet(this, val);
	}

	private static final VarHandle VALUE;
	static {
		try {
			MethodHandles.Lookup l = MethodHandles.lookup();
			VALUE = l.findVarHandle(Cell.class, "value", long.class);
		} catch (ReflectiveOperationException e) {
			throw new ExceptionInInitializerError(e);
		}
	}
}
```

```java
public void add(long x) {
	Cell[] cs; long b, v; int m; Cell c;
	if ((cs = cells) != null || !casBase(b = base, b + x)) {
		int index = getProbe();
		boolean uncontended = true;
		if (cs == null || (m = cs.length - 1) < 0 ||
			(c = cs[index & m]) == null ||
			!(uncontended = c.cas(v = c.value, v + x)))
			longAccumulate(x, null, uncontended, index);
	}
}
```
```java
final void longAccumulate(long x, LongBinaryOperator fn,
                              boolean wasUncontended, int index) {
        if (index == 0) {
            ThreadLocalRandom.current(); 
            index = getProbe();
            wasUncontended = true;
        }
        for (boolean collide = false;;) {       
            Cell[] cs; Cell c; int n; long v;
            if ((cs = cells) != null && (n = cs.length) > 0) {
                if ((c = cs[(n - 1) & index]) == null) {
                    if (cellsBusy == 0) {       
                        Cell r = new Cell(x);   
                        if (cellsBusy == 0 && casCellsBusy()) {
                            try {               
                                Cell[] rs; int m, j;
                                if ((rs = cells) != null &&
                                    (m = rs.length) > 0 &&
                                    rs[j = (m - 1) & index] == null) {
                                    rs[j] = r;
                                    break;
                                }
                            } finally {
                                cellsBusy = 0;
                            }
                            continue;          
                        }
                    }
                    collide = false;
                }
                else if (!wasUncontended)       
                    wasUncontended = true;      
                else if (c.cas(v = c.value,
                               (fn == null) ? v + x : fn.applyAsLong(v, x)))
                    break;
                else if (n >= NCPU || cells != cs)
                    collide = false;            
                else if (!collide)
                    collide = true;
                else if (cellsBusy == 0 && casCellsBusy()) {
                    try {
                        if (cells == cs)        
                            cells = Arrays.copyOf(cs, n << 1);
                    } finally {
                        cellsBusy = 0;
                    }
                    collide = false;
                    continue;                   
                }
                index = advanceProbe(index);
            }
            else if (cellsBusy == 0 && cells == cs && casCellsBusy()) {
                try {                          
                    if (cells == cs) {
                        Cell[] rs = new Cell[2];
                        rs[index & 1] = new Cell(x);
                        cells = rs;
                        break;
                    }
                } finally {
                    cellsBusy = 0;
                }
            }
            else if (casBase(v = base,
                             (fn == null) ? v + x : fn.applyAsLong(v, x)))
                break;
        }
    }


```