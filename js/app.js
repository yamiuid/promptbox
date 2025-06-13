// Supabase配置
// 请替换为你在Supabase项目设置中获取的实际URL和匿名密钥
const SUPABASE_URL = 'https://fqixvvcjzdlhohvyxgav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaXh2dmNqemRsaG9odnl4Z2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjc2NzcsImV4cCI6MjA2NDk0MzY3N30.gR1MLuncTnUK6HvUUfmRkAtrvH7p1vowWr3EG8buqQI';
let supabaseClient;

// 初始化Supabase客户端
function initSupabase() {
  try {
    console.log('开始初始化Supabase客户端...');
    console.log('URL:', SUPABASE_URL);
    console.log('ANON_KEY长度:', SUPABASE_ANON_KEY.length);
    
    // 检查参数
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase配置参数缺失');
      return false;
    }
    
    // 创建客户端
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    
    // 检查客户端是否创建成功
    if (!supabaseClient) {
      console.error('Supabase客户端创建失败');
      return false;
    }
    
    console.log('Supabase客户端初始化完成');
    
    // 添加认证状态变化监听
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth状态变化:', event);
      if (session) {
        console.log('会话有效，用户ID:', session.user.id);
      } else {
        console.log('无有效会话');
      }
      
      // 根据认证状态更新UI
      if (event === 'SIGNED_IN') {
        updateUIForLoggedInUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        updateUIForLoggedOutUser();
      }
    });
    
    return true;
  } catch (error) {
    console.error('初始化Supabase客户端时出错:', error);
    return false;
  }
}

// 检查用户登录状态
async function checkAuthState() {
  try {
    console.log('检查用户登录状态...');
    
    // 如果Supabase客户端未初始化，则初始化
    if (!supabaseClient) {
      console.warn('Supabase客户端未初始化，尝试初始化');
      initSupabase();
      return; // initSupabase会再次调用checkAuthState
    }
    
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.error('获取用户状态错误:', error);
      updateUIForLoggedOutUser();
      return;
    }
    
    if (data.user) {
      console.log('用户已登录:', data.user.email);
      await updateUIForLoggedInUser(data.user);
    } else {
      console.log('用户未登录');
      updateUIForLoggedOutUser();
    }
    
    // 设置会话过期监听
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth状态变化:', event);
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        updateUIForLoggedOutUser();
      } else if (event === 'SIGNED_IN' && session) {
        updateUIForLoggedInUser(session.user);
      }
    });
  } catch (error) {
    console.error('检查用户状态时出错:', error);
    updateUIForLoggedOutUser();
  }
}

// 更新UI为已登录状态
async function updateUIForLoggedInUser(user) {
  try {
    console.log('更新UI为已登录状态，用户:', user);
    
    // 获取UI元素
    const userDropdown = document.getElementById('user-dropdown');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const userButton = document.getElementById('user-button');
    const loginRegisterContainer = document.querySelector('.flex.space-x-2'); // 包含登录和注册按钮的容器
    
    // 隐藏登录/注册按钮，显示用户头像
    if (loginButton) loginButton.classList.add('hidden');
    if (registerButton) registerButton.classList.add('hidden');
    if (loginRegisterContainer) loginRegisterContainer.classList.add('hidden');
    if (userButton) {
      userButton.classList.remove('hidden');
      // 确保用户按钮可见
      userButton.style.display = 'flex';
    }
    
    // 设置默认用户头像
    let userInitial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
    
    // 尝试从用户元数据获取用户名
    if (user.user_metadata && user.user_metadata.username) {
      userInitial = user.user_metadata.username.charAt(0).toUpperCase();
    }
    
    // 尝试从Supabase获取用户资料
    let profile = await getUserProfile(user.id);
    
    // 如果没有找到用户资料，尝试创建一个
    if (!profile && user.user_metadata && user.user_metadata.username) {
      console.log('未找到用户资料，尝试创建一个');
      const username = user.user_metadata.username;
      const createdProfile = await createUserProfile(user.id, username);
      if (createdProfile && createdProfile.length > 0) {
        console.log('成功创建用户资料:', createdProfile);
        profile = createdProfile[0];
      } else {
        console.error('创建用户资料失败');
      }
    }
    
    if (profile) {
      console.log('使用用户资料更新UI:', profile);
      // 如果有用户名，使用首字母
      if (profile.username) {
        userInitial = profile.username.charAt(0).toUpperCase();
      }
      
      // 更新用户头像
      if (profile.avatar_url) {
        userButton.innerHTML = `<img src="${profile.avatar_url}" alt="用户头像" class="w-full h-full rounded-full object-cover">`;
      } else {
        userButton.innerHTML = `
          <div class="w-full h-full flex items-center justify-center bg-blue-500 text-white rounded-full">
            ${userInitial}
          </div>
        `;
      }
      
      // 更新下拉菜单中的用户名
      const usernameElement = userDropdown.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = profile.username || user.email;
      }
    } else {
      console.log('使用默认信息更新UI');
      
      // 使用默认头像
      userButton.innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-blue-500 text-white rounded-full">
          ${userInitial}
        </div>
      `;
      
      // 更新下拉菜单中的用户名，使用邮箱或元数据中的用户名
      const usernameElement = userDropdown.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = user.user_metadata?.username || user.email;
      }
    }
    
    // 更新下拉菜单中的邮箱
    const emailElement = userDropdown.querySelector('.email');
    if (emailElement) {
      emailElement.textContent = user.email;
    }
    
    // 绑定退出登录按钮事件
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      // 移除旧的事件监听器
      const newLogoutButton = logoutButton.cloneNode(true);
      logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
      
      // 添加新的事件监听器
      newLogoutButton.addEventListener('click', handleLogout);
    }
    
    // 显示成功消息
    showSuccess('欢迎回来！');
  } catch (error) {
    console.error('更新UI出错:', error);
  }
}

// 更新UI为未登录状态
function updateUIForLoggedOutUser() {
  try {
    console.log('更新UI为未登录状态');
    
    // 获取UI元素
    const userDropdown = document.getElementById('user-dropdown');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const userButton = document.getElementById('user-button');
    const loginRegisterContainer = document.querySelector('.flex.space-x-2'); // 包含登录和注册按钮的容器
    
    // 隐藏用户头像，显示登录/注册按钮
    if (userButton) userButton.classList.add('hidden');
    if (loginButton) loginButton.classList.remove('hidden');
    if (registerButton) registerButton.classList.remove('hidden');
    if (loginRegisterContainer) loginRegisterContainer.classList.remove('hidden');
    
    console.log('用户下拉菜单元素:', userDropdown ? '已找到' : '未找到');
    console.log('登录按钮元素:', loginButton ? '已找到' : '未找到');
    console.log('注册按钮元素:', registerButton ? '已找到' : '未找到');
    
    // 绑定登录和注册按钮事件
    if (loginButton) {
      // 移除旧的事件监听器
      const newLoginButton = loginButton.cloneNode(true);
      loginButton.parentNode.replaceChild(newLoginButton, loginButton);
      
      // 添加新的事件监听器
      newLoginButton.addEventListener('click', openLoginModal);
    }
    
    if (registerButton) {
      // 移除旧的事件监听器
      const newRegisterButton = registerButton.cloneNode(true);
      registerButton.parentNode.replaceChild(newRegisterButton, registerButton);
      
      // 添加新的事件监听器
      newRegisterButton.addEventListener('click', openRegisterModal);
    }
  } catch (error) {
    console.error('更新UI为未登录状态时出错:', error);
  }
}

// 创建用户资料
async function createUserProfile(userId, username) {
  try {
    if (!userId || !username) {
      console.error('创建用户资料失败: 参数不完整');
      return null;
    }
    
    console.log('创建用户资料，用户ID:', userId, '用户名:', username);
    
    // 先检查用户是否已登录
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('获取会话失败:', sessionError);
      return null;
    }
    
    if (!sessionData.session) {
      console.log('用户未登录，尝试使用服务角色创建资料');
      
      // 尝试使用特殊方法创建资料
      const profileData = {
        user_id: userId,
        username: username,
        created_at: new Date().toISOString()
      };
      
      // 直接插入
      const { data, error } = await supabaseClient
        .from('profiles')
        .insert([profileData])
        .select();
      
      if (error) {
        console.error('创建用户资料失败:', error);
        console.error('错误代码:', error.code);
        console.error('错误消息:', error.message);
        return null;
      }
      
      console.log('用户资料创建成功:', data);
      return data;
    }
    
    console.log('用户已登录，使用当前会话创建资料');
    
    const profileData = {
      user_id: userId,
      username: username
    };
    
    // 尝试方法1: 直接插入
    let { data, error } = await supabaseClient
      .from('profiles')
      .insert([profileData])
      .select();
    
    if (error) {
      console.error('方法1创建用户资料失败:', error);
      console.error('错误详情:', error.details);
      console.error('错误消息:', error.message);
      
      // 尝试方法2: 使用upsert
      ({ data, error } = await supabaseClient
        .from('profiles')
        .upsert([profileData], {
          onConflict: 'user_id'
        })
        .select());
      
      if (error) {
        console.error('方法2更新用户资料失败:', error);
        console.error('错误详情:', error.details);
        console.error('错误消息:', error.message);
        return null;
      }
    }
    
    console.log('用户资料创建/更新成功:', data);
    return data;
  } catch (error) {
    console.error('创建用户资料过程中出错:', error);
    return null;
  }
}

// 处理注册
async function handleRegister(email, password, username) {
  try {
    console.log('开始注册流程，邮箱:', email, '用户名:', username);
    console.log('网络状态:', navigator.onLine ? '在线' : '离线');
    
    // 显示加载状态
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> 注册中...';
    }
    
    // 表单验证
    if (!email || !password || !username) {
      showError('请填写所有必填字段');
      
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '注册';
      }
      
      return false;
    }
    
    if (password.length < 6) {
      showError('密码长度至少需要6个字符');
      
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '注册';
      }
      
      return false;
    }
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      showError('系统错误: Supabase客户端未初始化');
      
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '注册';
      }
      
      return false;
    }
    
    // 注册用户
    console.log('调用Supabase auth.signUp...');
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Supabase客户端状态:', supabaseClient ? '已初始化' : '未初始化');
    
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        },
        emailRedirectTo: window.location.origin // 添加重定向URL
      }
    });
    
    console.log('Supabase auth.signUp返回:', JSON.stringify(authData, null, 2));
    
    if (authError) {
      console.error('Supabase注册错误:', authError);
      
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '注册';
      }
      
      // 处理常见错误
      let errorMsg = authError.message || '注册失败';
      if (errorMsg.includes('already registered')) {
        errorMsg = '该邮箱已注册，请直接登录';
      } else if (errorMsg.includes('password')) {
        errorMsg = '密码不符合要求，请使用更强的密码';
      }
      
      showError('注册失败: ' + errorMsg);
      return false;
    }
    
    // 注册成功，创建用户资料
    if (authData && authData.user) {
      console.log('用户注册成功，创建资料...', authData.user);
      console.log('用户ID:', authData.user.id);
      
      // 创建用户资料
      const profileResult = await createUserProfile(authData.user.id, username);
      if (profileResult) {
        console.log('用户资料创建成功:', profileResult);
      }
      
      // 显示成功消息
      showSuccess('注册成功！');
      
      // 关闭注册模态框
      closeRegisterModal();
      
      // 检查是否需要邮箱确认
      if (authData.session) {
        console.log('用户已登录，无需邮箱确认');
        // 自动登录用户
        updateUIForLoggedInUser(authData.user);
        return true;
      } else {
        console.log('需要邮箱确认，显示提示');
        showSuccess('注册成功！请检查邮箱完成验证后再登录');
        openLoginModal(); // 打开登录模态框
        return true;
      }
    } else {
      console.error('注册返回数据不完整');
      showError('注册过程中出现问题，请稍后再试');
      
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '注册';
      }
      
      return false;
    }
  } catch (error) {
    console.error('注册过程中出现异常:', error);
    showError('注册失败: ' + (error.message || '未知错误'));
    
    // 恢复按钮状态
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '注册';
    }
    
    return false;
  }
}

// 处理退出登录
async function handleLogout() {
  try {
    console.log('开始登出流程...');
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      showError('系统错误: Supabase客户端未初始化');
      return false;
    }
    
    // 显示加载状态
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.textContent = '登出中...';
      logoutButton.disabled = true;
    }
    
    // 调用Supabase登出
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      console.error('登出错误:', error);
      showError('登出失败: ' + (error.message || '未知错误'));
      
      // 恢复按钮状态
      if (logoutButton) {
        logoutButton.textContent = '退出登录';
        logoutButton.disabled = false;
      }
      
      return false;
    }
    
    console.log('登出成功');
    showSuccess('已成功退出登录');
    
    // 关闭用户下拉菜单
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) {
      userDropdown.classList.remove('show');
    }
    
    // 更新UI为未登录状态
    updateUIForLoggedOutUser();
    
    return true;
  } catch (error) {
    console.error('登出过程中出现异常:', error);
    showError('登出失败: ' + (error.message || '未知错误'));
    return false;
  }
}

// 上传图片
async function uploadImage(file) {
  try {
    // 获取当前用户
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('请先登录');
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // 上传文件
    const { data, error } = await supabaseClient.storage
      .from('prompt-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // 获取公共URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('prompt-images')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (error) {
    console.error('上传图片错误:', error.message);
    showError('上传图片失败: ' + error.message);
    throw error;
  }
}

// 保存提示词
async function savePrompt(promptData) {
  try {
    // 获取当前用户
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('请先登录');
    
    console.log('开始保存提示词，用户ID:', user.id);
    console.log('提示词数据:', JSON.stringify(promptData, null, 2));
    
    // 保存到数据库
    const { data, error } = await supabaseClient
      .from('prompts')
      .insert([{
        title: promptData.title || '未命名作品',
        prompt: promptData.content,
        model: promptData.model,
        image_url: promptData.imageUrl,
        user_id: user.id,
        tags: promptData.tags || [],
        parameters: promptData.parameters || {}
      }])
      .select();
      
    if (error) {
      console.error('保存提示词数据库错误:', error);
      throw error;
    }
    
    console.log('提示词保存成功:', data);
    showSuccess('作品上传成功！');
    return data[0];
  } catch (error) {
    console.error('保存提示词错误:', error.message);
    console.error('错误详情:', error);
    showError('保存失败: ' + error.message);
    return null;
  }
}

// 获取提示词列表
async function getPrompts(limit = 20, page = 0) {
  try {
    // 计算偏移量
    const offset = page * limit;
    
    // 获取提示词列表
    const { data: prompts, error } = await supabaseClient
      .from('prompts')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    console.log('获取提示词列表成功:', prompts);
    return prompts;
  } catch (error) {
    console.error('获取提示词列表错误:', error.message);
    return [];
  }
}

// 显示提示词列表
function renderPrompts(prompts) {
  const container = document.querySelector('.masonry-grid');
  if (!container) return;
  
  container.innerHTML = ''; // 清空现有内容
  
  if (prompts.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">暂无内容</div>';
    return;
  }
  
  prompts.forEach(prompt => {
    // 创建卡片HTML
    const cardHTML = `
      <div class="masonry-item">
        <div class="card bg-white rounded overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer" data-id="${prompt.id}">
          <div class="overflow-hidden">
            <img src="${prompt.image_url}" alt="${prompt.title}" class="w-full h-auto object-cover card-image">
          </div>
          <div class="p-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                  ${prompt.profiles.username ? prompt.profiles.username.charAt(0) : '?'}
                </div>
                <span class="text-sm font-medium">${prompt.profiles.username || '匿名用户'}</span>
              </div>
              <div class="flex items-center gap-3">
                <button class="like-button flex items-center gap-1 text-gray-500 hover:text-primary" data-id="${prompt.id}">
                  <div class="w-4 h-4 flex items-center justify-center">
                    <i class="ri-heart-line"></i>
                  </div>
                  <span class="text-xs">${prompt.likes || 0}</span>
                </button>
                <button class="collect-button flex items-center gap-1 text-gray-500 hover:text-primary" data-id="${prompt.id}">
                  <div class="w-4 h-4 flex items-center justify-center">
                    <i class="ri-bookmark-line"></i>
                  </div>
                  <span class="text-xs">${prompt.collects || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML += cardHTML;
  });
  
  // 重新绑定卡片点击事件
  bindCardEvents();
}

// UI 辅助函数
function showError(message) {
  console.error(message);
  
  // 获取或创建toast元素
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg opacity-0 invisible transition-opacity duration-300 z-50 max-w-md text-center';
    document.body.appendChild(toast);
  }
  
  // 设置消息和样式
  toast.textContent = message;
  toast.classList.remove('bg-green-500', 'bg-red-500');
  toast.classList.add('bg-red-500');
  
  // 显示toast
  toast.classList.remove('invisible', 'opacity-0');
  
  // 3秒后自动隐藏
  setTimeout(() => {
    toast.classList.add('invisible', 'opacity-0');
  }, 3000);
}

function showSuccess(message) {
  console.log(message);
  
  // 获取或创建toast元素
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg opacity-0 invisible transition-opacity duration-300 z-50 max-w-md text-center';
    document.body.appendChild(toast);
  }
  
  // 设置消息和样式
  toast.textContent = message;
  toast.classList.remove('bg-green-500', 'bg-red-500');
  toast.classList.add('bg-green-500');
  
  // 显示toast
  toast.classList.remove('invisible', 'opacity-0');
  
  // 3秒后自动隐藏
  setTimeout(() => {
    toast.classList.add('invisible', 'opacity-0');
  }, 3000);
}

function openLoginModal() {
  // 先检查是否已存在登录模态框，如果存在则先移除
  const existingLoginModal = document.getElementById('login-modal');
  if (existingLoginModal) {
    existingLoginModal.remove();
  }
  
  // 创建登录模态框
  const loginModalHTML = `
    <div id="login-modal" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 invisible transition-all duration-300">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-transform scale-95">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">登录</h3>
          <button id="close-login-modal" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition">
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>
        <form id="login-form" class="space-y-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="login-email">邮箱</label>
            <input type="email" id="login-email" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="请输入邮箱" required>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="login-password">密码</label>
            <div class="relative">
              <input type="password" id="login-password" class="w-full px-3 py-2 pr-10 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="请输入密码" required>
              <button type="button" class="toggle-password absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                <i class="ri-eye-off-line"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <input type="checkbox" id="remember-me" class="mr-2">
              <label for="remember-me" class="text-sm text-gray-600">记住我</label>
            </div>
            <a href="#" class="text-sm text-primary hover:underline">忘记密码？</a>
          </div>
          <div id="login-error" class="text-red-500 text-sm hidden"></div>
          <button type="submit" class="w-full bg-primary text-white py-2 rounded hover:bg-opacity-90 transition">登录</button>
        </form>
        <div class="mt-4 text-center text-sm">
          <p>还没有账号？ <a href="#" id="switch-to-register" class="text-primary hover:underline">注册</a></p>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loginModalHTML);
  
  // 获取模态框元素
  const modal = document.getElementById('login-modal');
  
  // 延迟显示模态框，以便添加过渡效果
  setTimeout(() => {
    modal.classList.remove('invisible', 'opacity-0');
    modal.querySelector('.bg-white').classList.remove('scale-95');
  }, 10);
  
  // 绑定事件
  document.getElementById('close-login-modal').addEventListener('click', closeLoginModal);
  document.getElementById('switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    closeLoginModal();
    openRegisterModal();
  });
  
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    await handleLogin(email, password);
  });
  
  // 自动聚焦邮箱输入框
  setTimeout(() => {
    document.getElementById('login-email').focus();
    
    // 绑定密码显示/隐藏功能
    const togglePasswordButtons = document.querySelectorAll('#login-modal .toggle-password');
    togglePasswordButtons.forEach(button => {
      button.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling;
        const icon = this.querySelector('i');
        
        // 切换密码显示/隐藏
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon.className = 'ri-eye-line';
        } else {
          passwordInput.type = 'password';
          icon.className = 'ri-eye-off-line';
        }
      });
    });
  }, 300);
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    // 添加过渡效果
    modal.classList.add('opacity-0');
    modal.querySelector('.bg-white').classList.add('scale-95');
    
    // 延迟移除模态框
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function openRegisterModal() {
  // 先检查是否已存在注册模态框，如果存在则先移除
  const existingRegisterModal = document.getElementById('register-modal');
  if (existingRegisterModal) {
    existingRegisterModal.remove();
  }
  
  // 创建注册模态框
  const registerModalHTML = `
    <div id="register-modal" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 invisible transition-all duration-300">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-transform scale-95">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">注册</h3>
          <button id="close-register-modal" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition">
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>
        <form id="register-form" class="space-y-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="register-username">用户名</label>
            <input type="text" id="register-username" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="请输入用户名" required>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="register-email">邮箱</label>
            <input type="email" id="register-email" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="请输入邮箱" required>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="register-password">密码</label>
            <div class="relative">
              <input type="password" id="register-password" class="w-full px-3 py-2 pr-10 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="请输入密码（至少6位）" required minlength="6">
              <button type="button" class="toggle-password absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                <i class="ri-eye-off-line"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center mb-4">
            <input type="checkbox" id="agree-terms" class="mr-2" required>
            <label for="agree-terms" class="text-sm text-gray-600">我已阅读并同意 <a href="#" class="text-primary hover:underline">服务条款</a> 和 <a href="#" class="text-primary hover:underline">隐私政策</a></label>
          </div>
          <div id="register-error" class="text-red-500 text-sm hidden"></div>
          <button type="submit" class="w-full bg-primary text-white py-2 rounded hover:bg-opacity-90 transition">注册</button>
        </form>
        <div class="mt-4 text-center text-sm">
          <p>已有账号？ <a href="#" id="switch-to-login" class="text-primary hover:underline">登录</a></p>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', registerModalHTML);
  
  // 获取模态框元素
  const modal = document.getElementById('register-modal');
  
  // 延迟显示模态框，以便添加过渡效果
  setTimeout(() => {
    modal.classList.remove('invisible', 'opacity-0');
    modal.querySelector('.bg-white').classList.remove('scale-95');
  }, 10);
  
  // 绑定事件
  document.getElementById('close-register-modal').addEventListener('click', closeRegisterModal);
  document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    closeRegisterModal();
    openLoginModal();
  });
  
  // 添加表单验证
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const agreeTerms = document.getElementById('agree-terms').checked;
    
    // 显示错误信息的函数
    const showFormError = (message) => {
      const errorElement = document.getElementById('register-error');
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    };
    
    // 表单验证
    if (!username || !email || !password) {
      showFormError('请填写所有必填字段');
      return;
    }
    
    if (password.length < 6) {
      showFormError('密码长度至少需要6个字符');
      return;
    }
    
    if (!agreeTerms) {
      showFormError('请阅读并同意服务条款和隐私政策');
      return;
    }
    
    // 隐藏错误信息
    document.getElementById('register-error').classList.add('hidden');
    
    // 处理注册
    await handleRegister(email, password, username);
  });
  
  // 自动聚焦用户名输入框
  setTimeout(() => {
    document.getElementById('register-username').focus();
    
    // 绑定密码显示/隐藏功能
    const togglePasswordButtons = document.querySelectorAll('#register-modal .toggle-password');
    togglePasswordButtons.forEach(button => {
      button.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling;
        const icon = this.querySelector('i');
        
        // 切换密码显示/隐藏
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon.className = 'ri-eye-line';
        } else {
          passwordInput.type = 'password';
          icon.className = 'ri-eye-off-line';
        }
      });
    });
  }, 300);
}

function closeRegisterModal() {
  const modal = document.getElementById('register-modal');
  if (modal) {
    // 添加过渡效果
    modal.classList.add('opacity-0');
    modal.querySelector('.bg-white').classList.add('scale-95');
    
    // 延迟移除模态框
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function promptLogin() {
  alert('请先登录后再上传作品');
  openLoginModal();
}

// 打开上传模态框
function openUploadModal() {
  const uploadModal = document.getElementById('upload-modal');
  if (uploadModal) {
    uploadModal.classList.remove('invisible', 'opacity-0');
    document.body.style.overflow = 'hidden';
  }
}

// 关闭上传模态框
function closeUploadModal() {
  const uploadModal = document.getElementById('upload-modal');
  if (uploadModal) {
    uploadModal.classList.add('invisible', 'opacity-0');
    document.body.style.overflow = '';
    
    // 重置表单
    document.getElementById('upload-form').reset();
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    document.getElementById('tags-container').innerHTML = '';
  }
}

// 初始化上传模态框
function initUploadModal() {
  // 关闭按钮事件
  const closeButton = document.getElementById('close-upload-modal');
  if (closeButton) {
    closeButton.addEventListener('click', closeUploadModal);
  }
  
  // 上传区域点击事件
  const uploadArea = document.getElementById('upload-area');
  const imageUpload = document.getElementById('image-upload');
  
  if (uploadArea && imageUpload) {
    uploadArea.addEventListener('click', () => {
      imageUpload.click();
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      if (e.dataTransfer.files.length) {
        imageUpload.files = e.dataTransfer.files;
        handleImagePreview(e.dataTransfer.files[0]);
      }
    });
    
    // 文件选择事件
    imageUpload.addEventListener('change', (e) => {
      if (e.target.files.length) {
        handleImagePreview(e.target.files[0]);
      }
    });
  }
  
  // 标签输入事件
  const tagsInput = document.getElementById('prompt-tags');
  const tagsContainer = document.getElementById('tags-container');
  
  if (tagsInput && tagsContainer) {
    tagsInput.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const tagText = tagsInput.value.trim();
        
        if (tagText) {
          addTag(tagText);
          tagsInput.value = '';
        }
      }
    });
  }
  
  // 表单提交事件
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }
}

// 处理图片预览
function handleImagePreview(file) {
  // 检查文件类型
  if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/webp')) {
    showError('请上传JPG、PNG或WEBP格式的图片');
    return;
  }
  
  // 检查文件大小（最大10MB）
  if (file.size > 10 * 1024 * 1024) {
    showError('图片大小不能超过10MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const uploadPreview = document.getElementById('upload-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    if (uploadPreview && uploadPlaceholder) {
      uploadPreview.src = e.target.result;
      uploadPreview.classList.remove('hidden');
      uploadPlaceholder.classList.add('hidden');
    }
  };
  
  reader.readAsDataURL(file);
}

// 添加标签
function addTag(text) {
  const tagsContainer = document.getElementById('tags-container');
  if (!tagsContainer) return;
  
  // 检查是否已存在相同标签
  const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag => 
    tag.querySelector('.tag-text').textContent
  );
  
  if (existingTags.includes(text)) {
    return;
  }
  
  const tagElement = document.createElement('div');
  tagElement.className = 'tag-item flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700';
  tagElement.innerHTML = `
    <span class="tag-text">${text}</span>
    <button type="button" class="remove-tag ml-2 text-gray-500 hover:text-gray-700">
      <i class="ri-close-line"></i>
    </button>
  `;
  
  tagsContainer.appendChild(tagElement);
  
  // 添加删除标签事件
  tagElement.querySelector('.remove-tag').addEventListener('click', function() {
    tagElement.remove();
  });
}

// 处理上传表单提交
async function handleUploadSubmit(e) {
  e.preventDefault();
  
  try {
    // 检查是否已登录
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      showError('请先登录后再上传作品');
      return;
    }
    
    // 获取表单数据
    const imageFile = document.getElementById('image-upload').files[0];
    const title = document.getElementById('prompt-title').value.trim();
    const content = document.getElementById('prompt-content').value.trim();
    const model = document.getElementById('prompt-model').value;
    
    // 获取标签
    const tagElements = document.getElementById('tags-container').querySelectorAll('.tag-item');
    const tags = Array.from(tagElements).map(tag => tag.querySelector('.tag-text').textContent);
    
    // 验证表单
    if (!imageFile) {
      showError('请上传图片');
      return;
    }
    
    if (!content) {
      showError('请输入提示词内容');
      return;
    }
    
    if (!model) {
      showError('请选择使用的模型');
      return;
    }
    
    // 显示上传中状态
    const submitButton = document.querySelector('#upload-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = '上传中...';
    submitButton.disabled = true;
    
    try {
      // 上传图片
      const imageUrl = await uploadImage(imageFile);
      
      // 保存提示词
      const promptData = {
        title,
        content,
        model,
        imageUrl,
        tags
      };
      
      const result = await savePrompt(promptData);
      
      if (result) {
        showSuccess('作品上传成功！');
        closeUploadModal();
        
        // 重新加载提示词列表
        loadPrompts();
      }
    } catch (error) {
      console.error('上传失败:', error);
      showError('上传失败: ' + error.message);
    } finally {
      // 恢复按钮状态
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  } catch (error) {
    console.error('提交表单错误:', error);
    showError('操作失败，请稍后再试');
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
  console.log('页面加载完成，准备初始化应用');
  
  try {
    // 确保Supabase库已加载
    if (typeof supabase === 'undefined') {
      console.error('Supabase库未加载，请检查网络连接');
      return;
    }
    
    console.log('Supabase库已加载，开始初始化');
    
    // 初始化Supabase
    const supabaseInitialized = initSupabase();
    
    // 初始化上传模态框
    initUploadModal();
    
    if (supabaseInitialized) {
      // 检查用户登录状态
      checkAuthState();
      
      // 初始化UI事件
      initUIEvents();
      
      // 加载提示词数据
      loadPrompts();
      
      // 开发环境下加载示例数据
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('加载示例数据');
        loadDemoData();
        
        // 测试Supabase连接
        testSupabaseConnection();
      }
    } else {
      console.error('Supabase初始化失败，无法继续');
      showError('系统初始化失败，请刷新页面重试');
    }
    
    // 添加全局错误处理
    window.addEventListener('error', function(event) {
      console.error('全局错误:', event.error);
    });
  } catch (error) {
    console.error('应用初始化失败:', error);
    showError('应用初始化失败: ' + error.message);
  }
});

// 测试Supabase连接
async function testSupabaseConnection() {
  console.log('测试Supabase连接...');
  
  try {
    // 测试认证
    console.log('测试认证服务...');
    const { data: authData, error: authError } = await supabaseClient.auth.getSession();
    console.log('认证服务状态:', authError ? '错误' : '正常', authData);
    
    // 测试数据库
    console.log('测试数据库服务...');
    
    // 直接查询profiles表
    console.log('检查profiles表...');
    const { data: profilesData, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('访问profiles表失败:', profilesError);
    } else {
      console.log('profiles表可访问，数据:', profilesData);
      // 检查字段
      if (profilesData && profilesData.length > 0) {
        console.log('profiles表字段:', Object.keys(profilesData[0]));
      }
    }
    
    // 检查RLS策略
    console.log('检查RLS策略...');
    const testUser = {
      user_id: 'test-' + Date.now(),  // 使用user_id而不是id
      username: 'test-user'
    };
    
    const { data: insertData, error: insertError } = await supabaseClient
      .from('profiles')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.error('测试插入失败，可能是RLS策略限制:', insertError);
      console.log('错误代码:', insertError.code);
      console.log('错误消息:', insertError.message);
    } else {
      console.log('测试插入成功:', insertData);
      
      // 清理测试数据
      const { error: deleteError } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('user_id', testUser.user_id);  // 使用user_id而不是id
      
      if (deleteError) {
        console.error('清理测试数据失败:', deleteError);
      } else {
        console.log('清理测试数据成功');
      }
    }
  } catch (error) {
    console.error('测试Supabase连接时出错:', error);
  }
}

// 加载示例数据（当Supabase未配置时）
function loadDemoData() {
  const demoData = [
    {
      id: 1,
      title: '幻想风景',
      image_url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22800%22%20viewBox%3D%220%200%20600%20800%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22600%22%20height%3D%22800%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%22300%22%20y%3D%22400%22%20style%3D%22fill%3A%23333333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A30px%3Bdominant-baseline%3Amiddle%3Btext-anchor%3Amiddle%22%3E600x800%3C%2Ftext%3E%3C%2Fsvg%3E',
      likes: 328,
      collects: 156,
      profiles: {
        username: '林晓梦',
        avatar_url: null
      }
    },
    {
      id: 2,
      title: '赛博朋克城市',
      image_url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22400%22%20viewBox%3D%220%200%20600%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22600%22%20height%3D%22400%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%22300%22%20y%3D%22200%22%20style%3D%22fill%3A%23333333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A30px%3Bdominant-baseline%3Amiddle%3Btext-anchor%3Amiddle%22%3E600x400%3C%2Ftext%3E%3C%2Fsvg%3E',
      likes: 452,
      collects: 213,
      profiles: {
        username: '陈未来',
        avatar_url: null
      }
    },
    {
      id: 3,
      title: '神秘人物肖像',
      image_url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22700%22%20viewBox%3D%220%200%20600%20700%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22600%22%20height%3D%22700%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%22300%22%20y%3D%22350%22%20style%3D%22fill%3A%23333333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A30px%3Bdominant-baseline%3Amiddle%3Btext-anchor%3Amiddle%22%3E600x700%3C%2Ftext%3E%3C%2Fsvg%3E',
      likes: 276,
      collects: 128,
      profiles: {
        username: '张奇幻',
        avatar_url: null
      }
    }
  ];
  
  renderPrompts(demoData);
}

// 移除所有可能导致文本竖排的行内样式
function cleanupInlineStyles() {
  console.log('清理行内样式...');
  const elementsWithStyle = document.querySelectorAll('[style*="writing-mode"]');
  elementsWithStyle.forEach(element => {
    element.style.removeProperty('writing-mode');
    element.style.removeProperty('text-orientation');
  });
  console.log(`已清理 ${elementsWithStyle.length} 个元素的行内样式`);
}

// 修改原有initUIEvents函数，添加对cleanupInlineStyles的调用
function initUIEvents() {
  console.log('初始化UI事件...');
  
  // 清理行内样式
  cleanupInlineStyles();
  
  try {
    // 用户按钮点击事件
    const userButton = document.getElementById('user-button');
    const userDropdown = document.getElementById('user-dropdown');
    
    console.log('用户按钮元素:', userButton ? '已找到' : '未找到');
    console.log('用户下拉菜单元素:', userDropdown ? '已找到' : '未找到');
    
    if (userButton) {
      userButton.addEventListener('click', function(e) {
        console.log('用户按钮被点击');
        e.stopPropagation(); // 阻止事件冒泡
        toggleUserDropdown();
      });
    }
    
    // 密码显示/隐藏功能
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
      button.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling;
        const icon = this.querySelector('i');
        
        // 切换密码显示/隐藏
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon.className = 'ri-eye-line';
        } else {
          passwordInput.type = 'password';
          icon.className = 'ri-eye-off-line';
        }
      });
    });
    
    // 登录按钮点击事件
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    
    console.log('登录按钮元素:', loginButton ? '已找到' : '未找到');
    console.log('注册按钮元素:', registerButton ? '已找到' : '未找到');
    
    if (loginButton) {
      loginButton.addEventListener('click', function() {
        console.log('登录按钮被点击');
        openLoginModal();
      });
    }
    
    if (registerButton) {
      registerButton.addEventListener('click', function() {
        console.log('注册按钮被点击');
        openRegisterModal();
      });
    }
    
    // 上传按钮点击事件
    const uploadButton = document.getElementById('upload-button');
    if (uploadButton) {
      uploadButton.addEventListener('click', function() {
        console.log('上传按钮被点击');
        // 检查用户是否已登录
        checkAuthState().then(isLoggedIn => {
          if (isLoggedIn) {
            openUploadModal();
          } else {
            promptLogin();
          }
        });
      });
    }
    
    // 筛选按钮点击事件
    const filterButton = document.getElementById('filter-button');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    if (filterButton && filterDropdown) {
      filterButton.addEventListener('click', function(e) {
        e.stopPropagation();
        filterDropdown.classList.toggle('show');
        
        // 点击其他地方关闭下拉菜单
        const closeDropdown = function(e) {
          if (!filterDropdown.contains(e.target) && e.target.id !== 'filter-button') {
            filterDropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
          }
        };
        
        if (filterDropdown.classList.contains('show')) {
          // 延迟添加事件监听，避免立即触发
          setTimeout(() => {
            document.addEventListener('click', closeDropdown);
          }, 0);
        }
      });
    }
    
    // 绑定模态框关闭按钮
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) {
          closeModal(modal);
        }
      });
    });
    
    // 绑定模态框背景点击关闭
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal(this);
        }
      });
    });
    
  } catch (error) {
    console.error('初始化UI事件时出错:', error);
  }
}

// 加载提示词列表
async function loadPrompts() {
  try {
    const prompts = await getPrompts();
    renderPrompts(prompts);
  } catch (error) {
    console.error('加载提示词列表失败:', error);
  }
}

// 绑定卡片事件
function bindCardEvents() {
  console.log('绑定卡片事件');
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    // 移除旧的事件监听器（通过克隆元素）
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
    
    // 添加新的点击事件
    newCard.addEventListener('click', function(e) {
      if (!e.target.closest('.like-button') && !e.target.closest('.collect-button')) {
        const id = this.getAttribute('data-id');
        if (window.openDetailModal) {
          window.openDetailModal(id);
        } else {
          console.error('openDetailModal函数未定义');
        }
      }
    });
    
    // 重新绑定点赞和收藏按钮
    const likeButton = newCard.querySelector('.like-button');
    const collectButton = newCard.querySelector('.collect-button');
    
    if (likeButton) {
      likeButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        await handleLike(this);
      });
    }
    
    if (collectButton) {
      collectButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        await handleCollect(this);
      });
    }
  });
}

// 处理点赞
async function handleLike(button) {
  // 检查用户是否登录
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    promptLogin();
    return;
  }
  
  const promptId = button.getAttribute('data-id');
  const isActive = button.classList.contains('active');
  
  try {
    if (isActive) {
      // 取消点赞
      await supabaseClient.rpc('decrement_likes', {
        p_id: promptId
      });
      
      button.classList.remove('active');
      button.querySelector('i').className = 'ri-heart-line';
      const countEl = button.querySelector('span');
      countEl.textContent = (parseInt(countEl.textContent) - 1).toString();
    } else {
      // 添加点赞
      await supabaseClient.rpc('increment_likes', {
        p_id: promptId
      });
      
      button.classList.add('active');
      button.querySelector('i').className = 'ri-heart-fill';
      const countEl = button.querySelector('span');
      countEl.textContent = (parseInt(countEl.textContent) + 1).toString();
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    showError('操作失败: ' + (error.message || '请稍后再试'));
  }
}

// 处理收藏
async function handleCollect(button) {
  // 检查用户是否登录
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    promptLogin();
    return;
  }
  
  const promptId = button.getAttribute('data-id');
  const isActive = button.classList.contains('active');
  
  try {
    if (isActive) {
      // 取消收藏
      const { error: deleteError } = await supabaseClient
        .from('collections')
        .delete()
        .eq('user_id', user.id)
        .eq('prompt_id', promptId);
        
      if (deleteError) throw deleteError;
      
      // 减少收藏计数
      await supabaseClient.rpc('decrement_collects', {
        p_id: promptId
      });
      
      button.classList.remove('active');
      button.querySelector('i').className = 'ri-bookmark-line';
      const countEl = button.querySelector('span');
      countEl.textContent = (parseInt(countEl.textContent) - 1).toString();
    } else {
      // 添加收藏
      const { error: insertError } = await supabaseClient
        .from('collections')
        .insert([{
          user_id: user.id,
          prompt_id: promptId
        }]);
        
      if (insertError) {
        console.error('收藏插入错误:', insertError);
        throw new Error(`收藏失败: ${insertError.message}`);
      }
      
      // 增加收藏计数
      await supabaseClient.rpc('increment_collects', {
        p_id: promptId
      });
      
      button.classList.add('active');
      button.querySelector('i').className = 'ri-bookmark-fill';
      const countEl = button.querySelector('span');
      countEl.textContent = (parseInt(countEl.textContent) + 1).toString();
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    showError('操作失败: ' + (error.message || '请稍后再试'));
  }
}

// 打开详情模态框
function openDetailModal(id) {
  console.log('打开详情模态框，ID:', id);
  
  // 获取模态框元素
  const modal = document.getElementById('detail-modal');
  if (!modal) {
    console.error('未找到详情模态框元素');
    return;
  }
  
  // 从示例数据或已加载的数据中查找提示词
  let prompt;
  const allCards = document.querySelectorAll('.card');
  
  // 遍历所有卡片，查找匹配的ID
  for (let i = 0; i < allCards.length; i++) {
    if (allCards[i].getAttribute('data-id') === id.toString()) {
      const card = allCards[i];
      
      // 从卡片中提取数据
      const image = card.querySelector('img').src;
      const title = card.querySelector('img').alt || '提示词详情';
      const username = card.querySelector('.flex.items-center.gap-2 span').textContent;
      const userInitial = card.querySelector('.flex.items-center.gap-2 div').textContent;
      const likes = card.querySelector('.like-button span').textContent;
      const collects = card.querySelector('.collect-button span').textContent;
      
      // 构造提示词对象
      prompt = {
        id: id,
        title: title,
        image_url: image,
        prompt: '这是一个示例提示词，包含详细的描述和参数设置。实际内容将从数据库加载。',
        negative_prompt: '低质量，模糊，扭曲，畸变，像素化',
        model: 'Midjourney v5',
        tags: ['风景', '幻想', '自然'],
        created_at: new Date().toISOString(),
        likes: parseInt(likes),
        collects: parseInt(collects),
        profiles: {
          username: username,
          avatar_initial: userInitial
        }
      };
      
      break;
    }
  }
  
  if (!prompt) {
    // 如果在卡片中未找到，尝试从Supabase加载
    if (supabaseClient) {
      supabaseClient
        .from('prompts')
        .select(`
          *,
          profiles (*)
        `)
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('加载提示词详情失败:', error);
            showError('加载详情失败');
            return;
          }
          
          if (data) {
            updateDetailModal(data);
            modal.classList.add('opacity-100', 'visible');
          } else {
            console.error('未找到ID为', id, '的提示词');
            showError('未找到相关提示词');
          }
        });
      return;
    } else {
      console.error('未找到ID为', id, '的提示词，且Supabase未初始化');
      showError('未找到相关提示词');
      return;
    }
  }
  
  // 更新模态框内容
  updateDetailModal(prompt);
  
  // 显示模态框
  modal.classList.add('opacity-100', 'visible');
  
  // 绑定关闭按钮事件
  const closeButtons = modal.querySelectorAll('.close-modal');
  closeButtons.forEach(button => {
    button.addEventListener('click', closeDetailModal);
  });
  
  // 绑定复制按钮事件
  const copyButton = document.getElementById('copy-prompt-button');
  if (copyButton) {
    copyButton.addEventListener('click', function() {
      const promptText = document.getElementById('detail-prompt').textContent;
      navigator.clipboard.writeText(promptText)
        .then(() => {
          showSuccess('提示词已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          showError('复制失败，请手动复制');
        });
    });
  }
}

// 更新详情模态框内容
function updateDetailModal(prompt) {
  document.getElementById('detail-title').textContent = prompt.title || '提示词详情';
  document.getElementById('detail-image').src = prompt.image_url;
  document.getElementById('detail-prompt').textContent = prompt.prompt || '无提示词内容';
  
  const negativeContainer = document.getElementById('detail-negative-container');
  const negativeElement = document.getElementById('detail-negative');
  
  if (prompt.negative_prompt) {
    negativeContainer.classList.remove('hidden');
    negativeElement.textContent = prompt.negative_prompt;
  } else {
    negativeContainer.classList.add('hidden');
  }
  
  document.getElementById('detail-model').textContent = prompt.model || '未知模型';
  
  // 处理标签
  const tagsContainer = document.getElementById('detail-tags');
  tagsContainer.innerHTML = '';
  
  if (prompt.tags && prompt.tags.length > 0) {
    prompt.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag px-2 py-1 bg-gray-100 rounded-full text-xs cursor-pointer';
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });
  } else {
    const noTagElement = document.createElement('span');
    noTagElement.className = 'text-gray-500 text-xs';
    noTagElement.textContent = '无标签';
    tagsContainer.appendChild(noTagElement);
  }
  
  // 处理用户信息
  if (prompt.profiles) {
    document.getElementById('detail-username').textContent = prompt.profiles.username || '匿名用户';
    const avatarElement = document.getElementById('detail-user-avatar');
    
    if (prompt.profiles.avatar_url) {
      avatarElement.innerHTML = `<img src="${prompt.profiles.avatar_url}" alt="${prompt.profiles.username}" class="w-full h-full object-cover">`;
    } else {
      const initial = prompt.profiles.avatar_initial || prompt.profiles.username?.charAt(0) || '?';
      avatarElement.textContent = initial;
    }
  }
  
  // 处理点赞和收藏数
  document.getElementById('detail-likes').textContent = prompt.likes || 0;
  document.getElementById('detail-collects').textContent = prompt.collects || 0;
  
  // 处理时间
  const timeElement = document.getElementById('detail-time');
  if (prompt.created_at) {
    const date = new Date(prompt.created_at);
    timeElement.textContent = date.toLocaleString('zh-CN');
  } else {
    timeElement.textContent = '未知时间';
  }
}

// 关闭详情模态框
function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.classList.remove('opacity-100', 'visible');
  }
}

// 将openDetailModal函数添加到全局作用域
window.openDetailModal = openDetailModal;

// 获取用户资料
async function getUserProfile(userId) {
  try {
    if (!userId) {
      console.error('获取用户资料失败: 用户ID为空');
      return null;
    }
    
    // 直接查询用户资料，使用user_id字段
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('获取用户资料失败:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('获取用户资料过程中出错:', error);
    return null;
  }
}

// 处理登录
async function handleLogin(email, password) {
  try {
    console.log('开始登录流程，邮箱:', email);
    
    // 显示加载状态
    const submitButton = document.querySelector('#login-form button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> 登录中...';
    }
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      showError('系统错误: Supabase客户端未初始化');
      return false;
    }
    
    console.log('调用Supabase auth.signInWithPassword...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    console.log('Supabase auth.signInWithPassword返回:', data ? '有数据' : '无数据', error);
    
    if (error) {
      // 恢复按钮状态
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '登录';
      }
      
      let errorMsg = error.message || '未知错误';
      
      // 处理常见错误
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = '邮箱或密码错误';
        // 检查邮箱是否已验证
        const { data: userData, error: userError } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { skipErrorProfile: true } // 尝试注册但不报错
        });
        
        if (userData && !userData.session) {
          errorMsg = '邮箱未验证，请检查邮箱完成验证后再登录';
        }
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = '邮箱未验证，请检查邮箱完成验证后再登录';
      }
      
      showError('登录失败: ' + errorMsg);
      return false;
    }
    
    console.log('登录成功:', data);
    showSuccess('登录成功！');
    closeLoginModal();
    
    // 更新UI为已登录状态
    await updateUIForLoggedInUser(data.user);
    return true;
  } catch (error) {
    console.error('登录错误详情:', error);
    
    // 恢复按钮状态
    const submitButton = document.querySelector('#login-form button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '登录';
    }
    
    let errorMsg = error.message || '未知错误';
    showError('登录失败: ' + errorMsg);
    return false;
  }
}

// 切换用户下拉菜单
function toggleUserDropdown() {
  console.log('用户按钮被点击');
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    
    // 点击其他地方关闭下拉菜单
    const closeDropdown = function(e) {
      if (!dropdown.contains(e.target) && e.target.id !== 'user-button') {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdown);
      }
    };
    
    if (!dropdown.classList.contains('hidden')) {
      // 延迟添加事件监听，避免立即触发
      setTimeout(() => {
        document.addEventListener('click', closeDropdown);
      }, 0);
    }
  }
} 