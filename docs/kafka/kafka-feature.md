## 🧠 Kafka为什么这么快
kafka 运用了**零拷贝、顺序写、页缓存、批量处理**

- 消息通道自身是有序的，并不会像mysql那样跨区块查找数据，它所需要读写的数据都是连续的.它可以很好利用顺序读写和页缓存
- 另外它的数据也不需要用户态处理，可以更好利用零拷贝

