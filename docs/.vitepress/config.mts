import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "总结",
  description: "A VitePress Site",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],
    sidebar: [
      {
        text: 'Redis',
        collapsed: true,
        items: [
          { text: '持久化', link: '/redis/redis-persistence' },
          { text: '集群', link: '/redis/redis-cluster' },
          { text: 'ZSET', link: '/redis/redis-zset' },
          { text: 'BiteMap', link: '/redis/redis-bite' },
          { text: '布隆过滤器', link: '/redis/redis-bloom' },
          { text: '方案设计', link: '/redis/redis-use' },
        ]
      }
    ]
  }
})
