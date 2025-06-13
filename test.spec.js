const { test, expect } = require('@playwright/test');

test('测试注册和登录功能', async ({ page }) => {
  // 打开网站
  await page.goto('http://localhost:8081');
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 测试注册功能
  console.log('开始测试注册功能...');
  
  // 点击注册按钮打开注册模态框
  await page.click('text=注册');
  await page.waitForSelector('#registerModal.show');
  
  // 生成随机用户名和密码
  const username = `testuser_${Math.floor(Math.random() * 10000)}`;
  const password = 'Test@123';
  
  // 填写注册表单
  await page.fill('#registerUsername', username);
  await page.fill('#registerPassword', password);
  
  // 测试密码显示/隐藏功能
  await page.click('#registerModal .toggle-password');
  
  // 检查密码是否变为可见
  const passwordInputType = await page.$eval('#registerPassword', el => el.type);
  console.log(`密码输入框类型: ${passwordInputType}`);
  
  // 再次点击，恢复为密码模式
  await page.click('#registerModal .toggle-password');
  
  // 提交注册表单
  await page.click('#registerSubmit');
  
  // 等待注册成功消息
  await page.waitForSelector('.toast-body:has-text("注册成功")');
  console.log('注册成功!');
  
  // 等待toast消失
  await page.waitForTimeout(3000);
  
  // 测试登录功能
  console.log('开始测试登录功能...');
  
  // 点击登录按钮打开登录模态框
  await page.click('text=登录');
  await page.waitForSelector('#loginModal.show');
  
  // 填写登录表单
  await page.fill('#loginUsername', username);
  await page.fill('#loginPassword', password);
  
  // 测试密码显示/隐藏功能
  await page.click('#loginModal .toggle-password');
  
  // 检查密码是否变为可见
  const loginPasswordInputType = await page.$eval('#loginPassword', el => el.type);
  console.log(`登录密码输入框类型: ${loginPasswordInputType}`);
  
  // 再次点击，恢复为密码模式
  await page.click('#loginModal .toggle-password');
  
  // 提交登录表单
  await page.click('#loginSubmit');
  
  // 等待登录成功消息
  await page.waitForSelector('.toast-body:has-text("登录成功")');
  console.log('登录成功!');
  
  // 验证用户已登录
  await page.waitForSelector('.user-info:has-text("' + username + '")');
  console.log('验证用户信息显示成功!');
  
  // 测试完成
  console.log('测试完成!');
}); 