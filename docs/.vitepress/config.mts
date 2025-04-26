import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "总结",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Redis',
        items: [
          { text: '持久化', link: '/redis/redis-persistence' },
          { text: '集群', link: '/redis/redis-cluster' },
          { text: 'ZSET', link: '/redis/redis-zset' },
          { text: '布隆过滤器', link: '/redis/redis-bloom' },
          { text: '日常使用', link: '/redis/redis-use' },
        ]
      }
    ]
  }
})
