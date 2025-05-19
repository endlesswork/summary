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
		  text: '并发',
		  collapsed: true,
		  items: [
			  { text: '线程方法', link: '/thread/thread' },
			  { text: 'ReentrantLock使用样例', link: '/thread/reentrantlock-use' },
			  { text: 'ReentrantLock实现原理(JDK8)', link: '/thread/reentrantlock' },
			  { text: 'FutureTask使用样例', link: '/thread/futuretask-use' },
			  { text: 'FutureTask实现原理(JDK8)', link: '/thread/futuretask' },
			  { text: 'Semaphore使用', link: '/thread/semaphore-use' },
			  { text: 'CountDownLatch使用', link: '/thread/countdownlatch-use' },
			  { text: '线程池实现原理(JDK8)', link: '/thread/threadpool' },
		  ]
		},
		{
		  text: 'Mysql',
		  collapsed: true,
		  items: [
			{ text: '索引', link: '/mysql/index' },
			{ text: '事务', link: '/mysql/transaction' },
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
	    ]
	  },
	  {
	    text: 'SpringBoot',
	    collapsed: true,
	    items: [
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
