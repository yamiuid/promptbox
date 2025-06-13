// 显示消息提示
function showMessage(message, type = 'info', duration = 3000) {
  // 检查是否已存在消息容器
  let messageContainer = document.getElementById('message-container');
  
  if (!messageContainer) {
    // 创建消息容器
    messageContainer = document.createElement('div');
    messageContainer.id = 'message-container';
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '20px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.zIndex = '9999';
    messageContainer.style.display = 'flex';
    messageContainer.style.flexDirection = 'column';
    messageContainer.style.alignItems = 'center';
    document.body.appendChild(messageContainer);
  }
  
  // 创建消息元素
  const messageElement = document.createElement('div');
  messageElement.style.padding = '10px 20px';
  messageElement.style.margin = '5px 0';
  messageElement.style.borderRadius = '4px';
  messageElement.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.15)';
  messageElement.style.transition = 'all 0.3s ease';
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(-20px)';
  messageElement.style.fontSize = '14px';
  messageElement.textContent = message;
  
  // 根据类型设置样式
  switch (type) {
    case 'success':
      messageElement.style.backgroundColor = '#f0f9eb';
      messageElement.style.color = '#67c23a';
      messageElement.style.border = '1px solid #e1f3d8';
      break;
    case 'warning':
      messageElement.style.backgroundColor = '#fdf6ec';
      messageElement.style.color = '#e6a23c';
      messageElement.style.border = '1px solid #faecd8';
      break;
    case 'error':
      messageElement.style.backgroundColor = '#fef0f0';
      messageElement.style.color = '#f56c6c';
      messageElement.style.border = '1px solid #fde2e2';
      break;
    default:
      messageElement.style.backgroundColor = '#edf2fc';
      messageElement.style.color = '#909399';
      messageElement.style.border = '1px solid #ebeef5';
  }
  
  // 添加到容器
  messageContainer.appendChild(messageElement);
  
  // 显示动画
  setTimeout(() => {
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translateY(0)';
  }, 10);
  
  // 设置消失计时器
  setTimeout(() => {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(-20px)';
    
    // 移除元素
    setTimeout(() => {
      messageContainer.removeChild(messageElement);
      
      // 如果没有消息了，移除容器
      if (messageContainer.childElementCount === 0) {
        document.body.removeChild(messageContainer);
      }
    }, 300);
  }, duration);
}

// 显示加载中
function showLoading(message = '加载中...') {
  // 检查是否已存在加载层
  if (document.getElementById('global-loading')) {
    return;
  }
  
  // 创建加载层
  const loadingElement = document.createElement('div');
  loadingElement.id = 'global-loading';
  loadingElement.style.position = 'fixed';
  loadingElement.style.top = '0';
  loadingElement.style.left = '0';
  loadingElement.style.width = '100%';
  loadingElement.style.height = '100%';
  loadingElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
  loadingElement.style.display = 'flex';
  loadingElement.style.justifyContent = 'center';
  loadingElement.style.alignItems = 'center';
  loadingElement.style.flexDirection = 'column';
  loadingElement.style.zIndex = '9999';
  
  // 创建加载动画
  const spinner = document.createElement('div');
  spinner.style.width = '40px';
  spinner.style.height = '40px';
  spinner.style.border = '4px solid #f3f3f3';
  spinner.style.borderTop = '4px solid #3498db';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'spin 1s linear infinite';
  
  // 添加动画关键帧
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  // 创建消息文本
  const messageText = document.createElement('div');
  messageText.textContent = message;
  messageText.style.marginTop = '10px';
  messageText.style.color = '#666';
  
  // 组装加载层
  loadingElement.appendChild(spinner);
  loadingElement.appendChild(messageText);
  document.body.appendChild(loadingElement);
  
  // 阻止滚动
  document.body.style.overflow = 'hidden';
  
  return loadingElement;
}

// 隐藏加载中
function hideLoading() {
  const loadingElement = document.getElementById('global-loading');
  
  if (loadingElement) {
    // 恢复滚动
    document.body.style.overflow = '';
    
    // 移除加载层
    document.body.removeChild(loadingElement);
  }
}

// 显示确认对话框
function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    // 默认选项
    const defaultOptions = {
      title: '确认',
      confirmText: '确定',
      cancelText: '取消',
      type: 'info' // info, warning, error, success
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#fff';
    dialog.style.borderRadius = '4px';
    dialog.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.15)';
    dialog.style.width = '300px';
    dialog.style.padding = '20px';
    dialog.style.animation = 'dialog-fade-in 0.3s';
    
    // 添加动画关键帧
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dialog-fade-in {
        0% { opacity: 0; transform: translateY(-20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    // 创建标题
    const title = document.createElement('div');
    title.textContent = mergedOptions.title;
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    
    // 根据类型设置标题颜色
    switch (mergedOptions.type) {
      case 'success':
        title.style.color = '#67c23a';
        break;
      case 'warning':
        title.style.color = '#e6a23c';
        break;
      case 'error':
        title.style.color = '#f56c6c';
        break;
      default:
        title.style.color = '#409eff';
    }
    
    // 创建消息
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.marginBottom = '20px';
    messageElement.style.color = '#606266';
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = mergedOptions.cancelText;
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.marginRight = '10px';
    cancelButton.style.border = '1px solid #dcdfe6';
    cancelButton.style.backgroundColor = '#fff';
    cancelButton.style.color = '#606266';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    // 创建确认按钮
    const confirmButton = document.createElement('button');
    confirmButton.textContent = mergedOptions.confirmText;
    confirmButton.style.padding = '8px 16px';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.cursor = 'pointer';
    
    // 根据类型设置确认按钮样式
    switch (mergedOptions.type) {
      case 'success':
        confirmButton.style.backgroundColor = '#67c23a';
        break;
      case 'warning':
        confirmButton.style.backgroundColor = '#e6a23c';
        break;
      case 'error':
        confirmButton.style.backgroundColor = '#f56c6c';
        break;
      default:
        confirmButton.style.backgroundColor = '#409eff';
    }
    confirmButton.style.color = '#fff';
    
    // 添加按钮事件
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
    
    confirmButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    
    // 组装对话框
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    dialog.appendChild(title);
    dialog.appendChild(messageElement);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

// 更新用户UI
function updateUserUI(user) {
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const userInfoElement = document.getElementById('user-info');
  const userMenuElement = document.getElementById('user-menu');
  const usernameElement = document.getElementById('username');
  const avatarElement = document.getElementById('user-avatar');
  
  if (!loginButton || !registerButton || !userInfoElement) {
    console.warn('找不到用户UI元素');
    return;
  }
  
  if (user) {
    // 用户已登录
    loginButton.style.display = 'none';
    registerButton.style.display = 'none';
    userInfoElement.style.display = 'flex';
    
    // 更新用户名
    if (usernameElement) {
      usernameElement.textContent = user.username || user.email;
    }
    
    // 更新头像
    if (avatarElement) {
      if (user.avatar_url) {
        avatarElement.src = user.avatar_url;
      } else {
        // 使用默认头像或生成字母头像
        const firstLetter = (user.username || user.email || 'U').charAt(0).toUpperCase();
        avatarElement.style.backgroundColor = getRandomColor(firstLetter);
        avatarElement.style.color = '#fff';
        avatarElement.style.display = 'flex';
        avatarElement.style.justifyContent = 'center';
        avatarElement.style.alignItems = 'center';
        avatarElement.style.fontWeight = 'bold';
        avatarElement.textContent = firstLetter;
      }
    }
    
    // 设置用户菜单
    if (userMenuElement) {
      userMenuElement.style.display = 'block';
    }
  } else {
    // 用户未登录
    loginButton.style.display = 'inline-block';
    registerButton.style.display = 'inline-block';
    userInfoElement.style.display = 'none';
    
    // 隐藏用户菜单
    if (userMenuElement) {
      userMenuElement.style.display = 'none';
    }
  }
}

// 生成随机颜色（基于字符串）
function getRandomColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
    '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// 导出模块
export {
  showMessage,
  showLoading,
  hideLoading,
  showConfirm,
  updateUserUI
}; 