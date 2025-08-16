import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "总结",
  description: "Java",
  //base: "summary",
  markdown: {
    math: true
  },
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],
    sidebar: [
		{
		  text: 'Java基础',
		  collapsed: true,
		  items: [
			  { text: '引用类型', link: '/base/java-reference-types' },
		  ]
		},
		{
		  text: '并发',
		  collapsed: true,
		  items: [
			  { text: '线程方法', link: '/thread/thread' },
			  { text: 'LongAdder使用', link: '/thread/longadder-use' },
			  { text: 'ReentrantLock使用样例', link: '/thread/reentrantlock-use' },
			  { text: 'ReentrantLock实现原理(JDK8)', link: '/thread/reentrantlock' },
			  { text: 'FutureTask实现原理(JDK8)', link: '/thread/futuretask' },
			  { text: 'FutureTask使用样例', link: '/thread/futuretask-use' },
			  { text: 'CompletableFuture使用样例', link: '/thread/completablefuture-use.md' },
			   { text: 'CompletableFuture实现原理(JDK21)', link: '/thread/completablefuture.md' },
			  { text: 'Semaphore使用', link: '/thread/semaphore-use' },
			  { text: 'Semaphore原理(JDK21)', link: '/thread/semaphore' },
			  { text: 'CountDownLatch使用', link: '/thread/countdownlatch-use' },
			  { text: 'CountDownLatch原理(JDK21)', link: '/thread/countdownlatch' },
			  { text: 'CyclicBarrier使用', link: '/thread/cyclicbarrier-use' },
			  { text: 'CyclicBarrier原理(JDK21)', link: '/thread/cyclicbarrier' },
			  { text: '线程池实现原理(JDK8)', link: '/thread/threadpool' },
			  { text: 'ThreadLocal', link: '/thread/thread-local' },
		  ]
		},
		{
		  text: 'Mysql',
		  collapsed: true,
		  items: [
			{ text: '索引', link: '/mysql/index' },
			{ text: '最左索引', link: '/mysql/leftmost-prefix-rule' },
			{ text: 'Index Skip-Scan', link: '/mysql/index-skip-scan' },
			{ text: '事务', link: '/mysql/transaction' },
			{ text: '日志', link: '/mysql/log' },
			{ text: '锁', link: '/mysql/lock' },
			{ text: 'MVCC', link: '/mysql/mvcc' },
			{ text: '死锁', link: '/mysql/dead-lock' },
			{ text: '一些问题', link: '/mysql/question' },
			
		  ]
		},	
      {
        text: 'Redis',
        collapsed: true,
        items: [
          { text: '持久化', link: '/redis/redis-persistence' },
          { text: 'Watch', link: '/redis/redis-watch' },
          { text: '分布式锁', link: '/redis/redis-lock' },
		  { text: '自动续期实现', link: '/redis/redis-base-lock' },
          { text: '哨兵', link: '/redis/redis-sentinel' },
          { text: '集群', link: '/redis/redis-cluster' },
          { text: 'ZSET', link: '/redis/redis-zset' },
          { text: 'BiteMap', link: '/redis/redis-bite' },
          { text: 'HyperLogLog', link: '/redis/redis-hyperloglog' },
          { text: '布隆过滤器', link: '/redis/redis-bloom' },
		  { text: '布谷鸟', link: '/redis/redis-cuckoo' },
          { text: '方案设计', link: '/redis/redis-use' },
        ]
      },
      {
        text: 'Zookeeper',
        collapsed: true,
        items: [
          { text: '简介', link: '/zookeeper/zookeeper-introduction' },
          { text: 'Zab', link: '/zookeeper/zookeeper-zab' },
          { text: 'Watch', link: '/zookeeper/zookeeper-watch' },
        ]
      },
	  {
	    text: 'Dubbo',
	    collapsed: true,
	    items: [
	    ]
	  },
	  {
	    text: 'Kafka',
	    collapsed: true,
	    items: [
			 { text: '日志文件', link: '/kafka/kafka-log' },
			 { text: 'Kafka 消息流转过程', link: '/kafka/kafka-message' },
			 { text: 'Kafka 集群', link: '/kafka/kafka-cluster' },
			 { text: 'Kafka特性', link: '/kafka/kafka-feature' },
			 { text: 'Kafka消息防丢失', link: '/kafka/kafka-ack' },
	    ]
	  },
	  {
	    text: 'SpringBoot',
	    collapsed: true,
	    items: [
			{ text: 'Eureka多级缓存', link: '/springboot/eureka' },
	    ]
	  },
      {
        text: '网络',
        collapsed: true,
        items: [
          { text: 'Http', link: '/network/http' },
          { text: 'Tcp', link: '/network/tcp' },
          { text: 'Udp', link: '/network/udp' },
          { text: 'Quic', link: '/network/quic' },
        ]
      },
      {
        text: '分布式',
        collapsed: true,
        items: [
          { text: '分布式ID', link: '/distributed/distributed-id' },
		  { text: '订单超时取消的方案', link: '/distributed/time-out-order' },
		   { text: '重复支付', link: '/distributed/duplicate-pay' },
        ]
      },
      {
        text: '计算机原理',
        collapsed: true,
        items: [
          { text: '内核态和用户态', link: '/computer/kernel-mode' },
          { text: 'DMA', link: '/computer/dma' },
          { text: '传统I/O', link: '/computer/computer-io' },
          { text: '零拷贝', link: '/computer/zero-copy' },
		  { text: 'I/O模型', link: '/computer/io-model' },
        ]
      }
	  
    ]
  }
})
