Java 将引用分为 4 种不同强度的类型：强引用、软引用、弱引用、虚引用，主要用于控制对象的生命周期及垃圾回收行为。

## ✅ 总览对比表

| 引用类型 | 类名                  | 回收时机                          | 是否可访问对象 | 典型用途               |
|----------|-----------------------|-----------------------------------|----------------|------------------------|
| 强引用   | 普通对象引用           | 永远不会被 GC 主动回收            | ✅ 是           | 一般对象持有           |
| 软引用   | `SoftReference<T>`    | 内存不足时会被 GC 回收             | ✅ 是           | 缓存（图片/对象池）     |
| 弱引用   | `WeakReference<T>`    | 一旦 GC 就会被回收                 | ✅ 是           | `ThreadLocal` 的 key   |
| 虚引用   | `PhantomReference<T>` | GC 之后通过 `ReferenceQueue` 通知 | ❌ 否           | 大对象清理、直接内存管理 |



## 🔶 1. 强引用（Strong Reference）

```java
Object obj = new Object();
```
- 只要存在强引用，GC 永远不会回收该对象。
- 最常见的引用类型，所有普通对象引用都是强引用。

## 🔷 2. 软引用（SoftReference）
```java
SoftReference<byte[]> ref = new SoftReference<>(new byte[10 * 1024 * 1024]);
```
- JVM 在内存紧张时才会回收软引用对象。
- 非常适合做缓存场景：有内存就保留，没内存就回收。

## 🔸 3. 弱引用（WeakReference）
```java
WeakReference<Object> ref = new WeakReference<>(new Object());
```
- 只要发生 GC，弱引用的对象就会被回收。
- 常用于缓存、ThreadLocal 的 key 等不影响回收的场景。

## 🔺 4. 虚引用（PhantomReference）
```java
ReferenceQueue<Object> queue = new ReferenceQueue<>();
PhantomReference<Object> ref = new PhantomReference<>(new Object(), queue);
```
- 虚引用的 get() 永远返回 null。
- 主要用于在对象回收前获得通知（配合 ReferenceQueue 使用）。
- 可用于控制资源释放/直接内存回收等高级场景。