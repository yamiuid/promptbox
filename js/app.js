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
    console.log('ANON_KEY长度:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0);
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase配置不完整，请检查SUPABASE_URL和SUPABASE_ANON_KEY');
    }
    
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase库未加载，请检查网络连接');
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (!supabaseClient) {
      throw new Error('Supabase客户端创建失败');
    }
    
    console.log('Supabase客户端初始化完成');
    
    // 检查用户登录状态
    checkAuthState();
  } catch (error) {
    console.error('Supabase初始化失败:', error);
    alert('Supabase初始化失败: ' + error.message + '\n请检查控制台获取更多信息');
  }
}

// 检查用户登录状态
async function checkAuthState() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    
    if (data.user) {
      console.log('用户已登录:', data.user.email);
      updateUIForLoggedInUser(data.user);
    } else {
      console.log('用户未登录');
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('获取用户状态错误:', error);
    updateUIForLoggedOutUser();
  }
}

// 更新UI显示已登录用户
function updateUIForLoggedInUser(user) {
  // 获取用户按钮元素
  const userButton = document.getElementById('user-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  // 隐藏登录/注册选项，显示用户相关选项
  if (userDropdown) {
    userDropdown.innerHTML = `
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">个人中心</a>
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的收藏</a>
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的上传</a>
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">设置</a>
      <div class="border-t border-gray-100 my-1"></div>
      <a href="#" id="logout-button" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">退出登录</a>
    `;
    
    // 添加退出登录事件监听
    document.getElementById('logout-button').addEventListener('click', handleLogout);
  }
  
  // 启用上传按钮
  const uploadButton = document.getElementById('upload-button');
  if (uploadButton) {
    uploadButton.addEventListener('click', openUploadModal);
  }
}

// 更新UI显示未登录状态
function updateUIForLoggedOutUser() {
  // 获取用户按钮元素
  const userDropdown = document.getElementById('user-dropdown');
  
  // 显示登录/注册选项
  if (userDropdown) {
    userDropdown.innerHTML = `
      <a href="#" id="login-button" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">登录</a>
      <a href="#" id="register-button" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">注册</a>
    `;
    
    // 添加登录和注册事件监听
    document.getElementById('login-button').addEventListener('click', openLoginModal);
    document.getElementById('register-button').addEventListener('click', openRegisterModal);
  }
  
  // 上传按钮点击时提示登录
  const uploadButton = document.getElementById('upload-button');
  if (uploadButton) {
    uploadButton.addEventListener('click', promptLogin);
  }
}

// 处理登录
async function handleLogin(email, password) {
  try {
    console.log('开始登录流程，邮箱:', email);
    
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
    
    if (error) throw error;
    
    console.log('登录成功:', data);
    closeLoginModal();
    checkAuthState();
    return true;
  } catch (error) {
    console.error('登录错误详情:', error);
    let errorMsg = error.message || '未知错误';
    
    // 处理常见错误
    if (errorMsg.includes('Invalid login credentials')) {
      errorMsg = '邮箱或密码错误';
    } else if (errorMsg.includes('Email not confirmed')) {
      errorMsg = '邮箱未验证，请检查邮箱完成验证';
    }
    
    showError('登录失败: ' + errorMsg);
    return false;
  }
}

// 处理注册
async function handleRegister(email, password, username) {
  try {
    console.log('开始注册流程，邮箱:', email, '用户名:', username);
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      showError('系统错误: Supabase客户端未初始化');
      return false;
    }
    
    // 注册用户
    console.log('调用Supabase auth.signUp...');
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    
    console.log('Supabase auth.signUp返回:', JSON.stringify(authData, null, 2), authError);
    
    if (authError) {
      console.error('Supabase注册错误:', authError);
      
      // 处理常见错误
      let errorMsg = authError.message || '注册失败';
      if (errorMsg.includes('already registered')) {
        errorMsg = '该邮箱已注册，请直接登录或使用其他邮箱';
      } else if (errorMsg.includes('password')) {
        errorMsg = '密码不符合要求，请使用至少6位的强密码';
      } else if (errorMsg.includes('email')) {
        errorMsg = '邮箱格式不正确，请检查';
      }
      
      showError(errorMsg);
      throw authError;
    }
    
    // 如果注册成功，创建用户配置
    if (authData && authData.user) {
      console.log('用户创建成功，ID:', authData.user.id, '，开始创建用户配置...');
      
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{ 
          id: authData.user.id, 
          username,
          avatar_url: null,
          bio: null
        }]);
        
      if (profileError) {
        console.error('创建用户配置失败:', profileError);
        
        // 尝试删除已创建的用户
        try {
          await supabaseClient.auth.admin.deleteUser(authData.user.id);
          console.log('已删除不完整的用户记录');
        } catch (deleteError) {
          console.error('无法删除不完整的用户记录:', deleteError);
        }
        
        throw new Error('创建用户配置失败: ' + profileError.message);
      }
      
      console.log('用户配置创建成功');
      showSuccess('注册成功！请查收验证邮件完成注册');
      closeRegisterModal();
      return true;
    } else {
      console.warn('注册返回数据异常:', authData);
      showError('注册异常，请联系管理员');
      return false;
    }
  } catch (error) {
    console.error('注册流程错误:', error);
    return false;
  }
}

// 处理退出登录
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    
    console.log('退出登录成功');
    checkAuthState();
  } catch (error) {
    console.error('退出登录错误:', error.message);
    showError('退出登录失败: ' + error.message);
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
  alert(message); // 简单起见，使用alert。实际项目中应使用更友好的提示
}

function showSuccess(message) {
  alert(message); // 简单起见，使用alert。实际项目中应使用更友好的提示
}

function openLoginModal() {
  // 创建登录模态框
  const loginModalHTML = `
    <div id="login-modal" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">登录</h3>
          <button id="close-login-modal" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <form id="login-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input type="email" id="login-email" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" id="login-password" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
          </div>
          <button type="submit" class="w-full bg-primary text-white py-2 rounded !rounded-button hover:bg-opacity-90 transition">登录</button>
        </form>
        <div class="mt-4 text-center text-sm">
          <p>还没有账号？ <a href="#" id="switch-to-register" class="text-primary hover:underline">注册</a></p>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loginModalHTML);
  
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
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.remove();
  }
}

function openRegisterModal() {
  // 创建注册模态框
  const registerModalHTML = `
    <div id="register-modal" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">注册</h3>
          <button id="close-register-modal" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <form id="register-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input type="text" id="register-username" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input type="email" id="register-email" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" id="register-password" class="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
          </div>
          <button type="submit" class="w-full bg-primary text-white py-2 rounded !rounded-button hover:bg-opacity-90 transition">注册</button>
        </form>
        <div class="mt-4 text-center text-sm">
          <p>已有账号？ <a href="#" id="switch-to-login" class="text-primary hover:underline">登录</a></p>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', registerModalHTML);
  
  // 绑定事件
  document.getElementById('close-register-modal').addEventListener('click', closeRegisterModal);
  document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    closeRegisterModal();
    openLoginModal();
  });
  
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    await handleRegister(email, password, username);
  });
}

function closeRegisterModal() {
  const modal = document.getElementById('register-modal');
  if (modal) {
    modal.remove();
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

// 初始化功能
document.addEventListener('DOMContentLoaded', function() {
  console.log('页面加载完成，准备初始化应用');
  
  // 检查Supabase是否已加载
  if (typeof supabase !== 'undefined') {
    console.log('Supabase库已加载，开始初始化');
    // 初始化Supabase
    initSupabase();
  } else {
    console.error('Supabase 未加载，请确保已引入Supabase JS库');
    alert('应用加载错误：缺少必要的组件。请刷新页面或联系管理员。');
  }
  
  // 初始化UI事件
  initUIEvents();
  
  // 初始化上传模态框
  initUploadModal();
  
  // 默认展示示例数据
  console.log('加载示例数据');
  loadDemoData();
});

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

// 初始化UI事件
function initUIEvents() {
  // 用户按钮点击事件
  const userButton = document.getElementById('user-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userButton && userDropdown) {
    // 移除可能存在的旧事件监听器（通过克隆并替换元素）
    const newUserButton = userButton.cloneNode(true);
    userButton.parentNode.replaceChild(newUserButton, userButton);
    
    // 添加新的事件监听器
    newUserButton.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      userDropdown.classList.toggle('show');
    });
    
    // 阻止下拉菜单点击事件冒泡
    userDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // 点击其他区域关闭下拉菜单
  document.addEventListener('click', function() {
    if (userDropdown) {
      userDropdown.classList.remove('show');
    }
  });
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