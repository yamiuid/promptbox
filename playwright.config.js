// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './',
  /* 每次测试的超时时间 */
  timeout: 30 * 1000,
  /* 每个断言的超时时间 */
  expect: {
    timeout: 5000
  },
  /* 运行测试的并发数 */
  fullyParallel: false,
  /* 失败重试次数 */
  retries: 0,
  /* 并发工作进程数 */
  workers: 1,
  /* 测试报告 */
  reporter: 'html',
  /* 共享设置 */
  use: {
    /* 浏览器视口大小 */
    viewport: { width: 1280, height: 720 },
    /* 每个测试的截图 */
    screenshot: 'only-on-failure',
    /* 收集跟踪以便调试 */
    trace: 'on-first-retry',
    /* 启用视频录制 */
    video: 'on-first-retry',
  },
  /* 配置项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}); 