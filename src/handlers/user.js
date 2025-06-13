// 导入依赖
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  createUserProfile,
  getUserProfile,
  resendVerificationEmail,
  signInWithProvider
} from '../api/auth.js';
import { showMessage, showLoading, hideLoading, updateUserUI, showConfirm } from '../utils/ui.js';

// 初始化用户相关处理器
function initUserHandlers() {
  // 登录表单处理
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  
  // 注册表单处理
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }
  
  // 登出按钮处理
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogoutClick);
  }
  
  // 重发验证邮件按钮
  const resendButton = document.getElementById('resend-verification');
  if (resendButton) {
    resendButton.addEventListener('click', handleResendVerification);
  }
  
  // 社交登录按钮
  setupSocialLoginButtons();
}

// 处理登录表单提交
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  // 获取表单数据
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  // 表单验证
  if (!email || !password) {
    showMessage('请填写所有必填字段', 'warning');
    return;
  }
  
  try {
    // 显示加载中
    showLoading('登录中...');
    
    // 调用登录API
    const authData = await handleLogin(email, password);
    
    // 检查登录结果
    if (!authData || !authData.user) {
      hideLoading();
      showMessage('登录失败，请稍后重试', 'error');
      return;
    }
    
    console.log('登录成功，用户ID:', authData.user.id);
    
    // 获取用户资料
    let profile = await getUserProfile(authData.user.id);
    
    // 如果没有资料，尝试创建
    if (!profile) {
      console.log('未找到用户资料，尝试创建...');
      
      // 从用户元数据中获取用户名
      const username = authData.user.user_metadata?.username || 
                       authData.user.email.split('@')[0];
      
      // 创建用户资料
      const createdProfile = await createUserProfile(authData.user.id, username);
      
      if (createdProfile && createdProfile[0]) {
        profile = createdProfile[0];
      }
    }
    
    // 合并用户数据和资料
    const userData = {
      ...authData.user,
      ...profile
    };
    
    // 隐藏加载中
    hideLoading();
    
    // 更新UI
    updateUserUI(userData);
    
    // 关闭登录模态框
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.style.display = 'none';
    }
    
    showMessage('登录成功，欢迎回来！', 'success');
    
    // 刷新页面或重定向
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    hideLoading();
    showMessage(error.message || '登录失败', 'error');
    console.error('登录错误:', error);
    
    // 如果是邮箱未验证错误，显示重发验证邮件选项
    if (error.message.includes('邮箱未验证')) {
      const resendContainer = document.getElementById('resend-container');
      if (resendContainer) {
        resendContainer.style.display = 'block';
        
        // 存储当前邮箱，用于重发验证
        const resendButton = document.getElementById('resend-verification');
        if (resendButton) {
          resendButton.setAttribute('data-email', email);
        }
      }
    }
  }
}

// 处理注册表单提交
async function handleRegisterSubmit(event) {
  event.preventDefault();
  
  // 获取表单数据
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const username = document.getElementById('register-username').value;
  
  // 表单验证
  if (!email || !password || !confirmPassword || !username) {
    showMessage('请填写所有必填字段', 'warning');
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('两次输入的密码不一致', 'warning');
    return;
  }
  
  try {
    // 显示加载中
    showLoading('注册中...');
    
    // 调用注册API
    const authData = await handleRegister(email, password, username);
    
    // 隐藏加载中
    hideLoading();
    
    // 检查注册结果
    if (!authData) {
      showMessage('注册失败，请稍后重试', 'error');
      return;
    }
    
    // 检查是否需要邮箱验证
    if (authData.user && !authData.session) {
      showMessage('注册成功！请查收邮箱完成验证', 'success');
      
      // 显示验证提示
      const verificationContainer = document.getElementById('verification-container');
      if (verificationContainer) {
        verificationContainer.style.display = 'block';
        
        // 存储邮箱用于重发验证
        const resendButton = document.getElementById('resend-verification');
        if (resendButton) {
          resendButton.setAttribute('data-email', email);
        }
      }
      
      // 切换到登录表单
      const registerForm = document.getElementById('register-form');
      const loginForm = document.getElementById('login-form');
      
      if (registerForm && loginForm) {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
      }
    } else {
      // 自动登录成功
      showMessage('注册成功！', 'success');
      
      // 尝试创建用户资料
      if (authData.user) {
        await createUserProfile(authData.user.id, username);
      }
      
      // 更新UI
      updateUserUI({
        ...authData.user,
        username: username
      });
      
      // 关闭注册模态框
      const registerModal = document.getElementById('register-modal');
      if (registerModal) {
        registerModal.style.display = 'none';
      }
      
      // 刷新页面或重定向
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    hideLoading();
    showMessage(error.message || '注册失败', 'error');
    console.error('注册错误:', error);
  }
}

// 处理登出点击
async function handleLogoutClick(event) {
  event.preventDefault();
  
  try {
    // 确认是否登出
    const confirmed = await showConfirm('确定要退出登录吗？');
    
    if (!confirmed) {
      return;
    }
    
    // 显示加载中
    showLoading('退出登录中...');
    
    // 调用登出API
    await handleLogout();
    
    // 隐藏加载中
    hideLoading();
    
    // 更新UI
    updateUserUI(null);
    
    showMessage('已退出登录', 'info');
    
    // 刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    hideLoading();
    showMessage(error.message || '退出登录失败', 'error');
    console.error('退出登录错误:', error);
  }
}

// 处理重发验证邮件
async function handleResendVerification(event) {
  event.preventDefault();
  
  // 获取存储的邮箱
  const email = event.target.getAttribute('data-email');
  
  if (!email) {
    showMessage('未找到邮箱地址', 'error');
    return;
  }
  
  try {
    // 显示加载中
    showLoading('发送验证邮件中...');
    
    // 调用重发验证邮件API
    await resendVerificationEmail(email);
    
    // 隐藏加载中
    hideLoading();
    
    showMessage('验证邮件已发送，请查收', 'success');
  } catch (error) {
    hideLoading();
    showMessage(error.message || '发送验证邮件失败', 'error');
    console.error('发送验证邮件错误:', error);
  }
}

// 设置社交登录按钮
function setupSocialLoginButtons() {
  // Google登录
  const googleButton = document.getElementById('google-login');
  if (googleButton) {
    googleButton.addEventListener('click', () => handleSocialLogin('google'));
  }
  
  // GitHub登录
  const githubButton = document.getElementById('github-login');
  if (githubButton) {
    githubButton.addEventListener('click', () => handleSocialLogin('github'));
  }
  
  // 微信登录
  const wechatButton = document.getElementById('wechat-login');
  if (wechatButton) {
    wechatButton.addEventListener('click', () => handleSocialLogin('wechat'));
  }
}

// 处理社交登录
async function handleSocialLogin(provider) {
  try {
    // 显示加载中
    showLoading(`正在使用${provider}登录...`);
    
    // 调用第三方登录API
    await signInWithProvider(provider);
    
    // 由于OAuth会重定向，这里不需要隐藏加载中
  } catch (error) {
    hideLoading();
    showMessage(error.message || `${provider}登录失败`, 'error');
    console.error(`${provider}登录错误:`, error);
  }
}

// 导出模块
export {
  initUserHandlers
}; 