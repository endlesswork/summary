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
## 内部类Cell
Cell 内部采用了 volatile long类型变量

### cas(long cmp, long val)
原子操作：如果当前 value 等于 cmp，就将其更新为 val 并返回 true，否则返回 false。这是实现无锁并发的核心。

### reset()
重置。原子性地将 value 的值设置为 0。

### getAndSet(long val)
获取并设置。原子操作：将 value 设置为新值 val，同时返回它之前旧的值。

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
	//为 cas 方法以及其他原子方法（如 getAndSet）进行一次性的、高效的底层准备工作
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
## add()
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
## longAccumulate()
Striped64类中方法
```java
final void longAccumulate(long x, LongBinaryOperator fn,
                              boolean wasUncontended, int index) {
		//初始化当前线程的探针值						    
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