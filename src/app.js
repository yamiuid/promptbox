// 导入依赖
import { supabaseClient, initSupabase, testSupabaseConnection } from './api/supabase.js';
import { checkAuthState, getUserProfile } from './api/auth.js';
import { getPrompts, getPromptById, likePrompt, collectPrompt } from './api/prompts.js';
import { initUploadHandlers } from './handlers/upload.js';
import { initUserHandlers } from './handlers/user.js';
import { initFormHandlers } from './handlers/form.js';
import { formatDate, formatNumber, copyToClipboard, debounce } from './utils/helpers.js';
import { showMessage, showLoading, hideLoading, updateUserUI } from './utils/ui.js';

// 全局状态
const state = {
  user: null,
  currentPage: 0,
  isLoading: false,
  hasMorePrompts: true
};

// 初始化应用
async function initApp() {
  console.log('初始化应用...');
  
  try {
    // 初始化Supabase
    const initialized = initSupabase();
    
    if (!initialized) {
      console.error('Supabase初始化失败');
      showMessage('系统初始化失败，请刷新页面重试', 'error');
      return;
    }
    
    // 测试连接
    await testSupabaseConnection();
    
    // 检查用户登录状态
    const isLoggedIn = await checkAuthState();
    
    if (isLoggedIn) {
      // 获取用户信息
      await loadUserData();
    }
    
    // 初始化事件处理器
    initEventHandlers();
    
    // 添加密码显示切换功能
    initPasswordToggle();
    
    // 加载提示词列表
    await loadPrompts();
    
    console.log('应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    showMessage('应用加载失败, 请刷新页面重试', 'error');
  }
}

// 加载用户数据
async function loadUserData() {
  try {
    // 获取当前会话
    const { data: sessionData } = await supabaseClient.auth.getSession();
    
    if (sessionData?.session) {
      console.log('用户已登录');
      
      // 获取用户信息
      const { data: userData } = await supabaseClient.auth.getUser();
      
      if (userData?.user) {
        // 获取用户资料
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();
        
        // 合并用户数据和资料
        state.user = {
          ...userData.user,
          ...profileData
        };
        
        // 更新UI
        updateUserUI(state.user);
      }
    } else {
      console.log('用户未登录');
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

// 初始化事件处理器
function initEventHandlers() {
  // 初始化用户相关处理器
  initUserHandlers();
  
  // 初始化上传处理器
  initUploadHandlers();
  
  // 初始化表单处理器
  initFormHandlers();
  
  // 加载更多按钮
  const loadMoreButton = document.getElementById('load-more');
  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', handleLoadMore);
  }
  
  // 滚动加载
  window.addEventListener('scroll', debounce(handleScroll, 200));
  
  // 复制按钮
  document.addEventListener('click', handleCopyClick);
  
  // 点赞按钮
  document.addEventListener('click', handleLikeClick);
  
  // 收藏按钮
  document.addEventListener('click', handleCollectClick);
  
  // 模态框关闭按钮
  setupModalHandlers();
}

// 设置模态框处理器
function setupModalHandlers() {
  // 获取所有模态框
  const modals = document.querySelectorAll('.modal');
  
  // 获取所有打开模态框的按钮
  const openButtons = document.querySelectorAll('[data-modal]');
  
  // 获取所有关闭按钮
  const closeButtons = document.querySelectorAll('.close-modal');
  
  // 设置打开模态框事件
  openButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      
      if (modal) {
        modal.style.display = 'block';
      }
    });
  });
  
  // 设置关闭模态框事件
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // 点击模态框外部关闭
  modals.forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// 加载提示词列表
async function loadPrompts(page = 0) {
  try {
    if (state.isLoading || (!state.hasMorePrompts && page > 0)) {
      return;
    }
    
    state.isLoading = true;
    
    // 显示加载中
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
    
    // 获取提示词列表
    const { data, error } = await getPrompts(20, page);
    
    // 隐藏加载中
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    if (error) {
      console.error('加载提示词失败:', error);
      showMessage('加载提示词失败: ' + error, 'error');
      state.isLoading = false;
      return;
    }
    
    // 检查是否还有更多数据
    if (!data || data.length === 0) {
      state.hasMorePrompts = false;
      
      // 隐藏加载更多按钮
      const loadMoreButton = document.getElementById('load-more');
      if (loadMoreButton) {
        loadMoreButton.style.display = 'none';
      }
      
      // 如果是首次加载且没有数据
      if (page === 0) {
        const promptsContainer = document.getElementById('prompt-grid');
        if (promptsContainer) {
          promptsContainer.innerHTML = `
            <div class="no-data col-span-full">
              <i class="ri-image-line"></i>
              <p>暂无提示词数据</p>
              <button id="upload-empty-button" class="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium">上传第一个提示词</button>
            </div>
          `;
          
          // 添加上传按钮点击事件
          const uploadEmptyButton = document.getElementById('upload-empty-button');
          if (uploadEmptyButton) {
            uploadEmptyButton.addEventListener('click', () => {
              const uploadModal = document.getElementById('upload-modal');
              if (uploadModal) {
                uploadModal.style.display = 'flex';
                uploadModal.style.opacity = '1';
                uploadModal.style.visibility = 'visible';
              }
            });
          }
        }
      }
      
      state.isLoading = false;
      return;
    }
    
    // 更新当前页码
    state.currentPage = page;
    
    // 渲染提示词列表
    renderPrompts(data, page > 0);
    
    state.isLoading = false;
  } catch (error) {
    console.error('加载提示词过程中出错:', error);
    showMessage('加载提示词失败: ' + (error.message || '未知错误'), 'error');
    
    // 隐藏加载中
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    state.isLoading = false;
  }
}

// 渲染提示词列表
function renderPrompts(prompts, append = false) {
  const promptsContainer = document.getElementById('prompt-grid');
  
  if (!promptsContainer) {
    console.warn('找不到提示词容器元素');
    return;
  }
  
  // 如果不是追加，则清空容器
  if (!append) {
    promptsContainer.innerHTML = '';
  }
  
  // 遍历提示词数据
  prompts.forEach(prompt => {
    // 创建提示词卡片
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.setAttribute('data-id', prompt.id);
    card.style.cursor = 'pointer';
    
    // 处理标签显示
    const tagsList = prompt.tags && prompt.tags.length > 0 
      ? prompt.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')
      : '';
    
    // 设置卡片内容
    card.innerHTML = `
      <div class="prompt-image">
        <img src="${prompt.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzZiNzI4MCI+5Zu+54mH5peg5rOV5pi+56S6PC90ZXh0Pjwvc3ZnPg=='}" alt="${prompt.title}">
        <div class="model-tag">${prompt.model || 'Unknown'}</div>
      </div>
      <div class="prompt-content">
        <h3 class="prompt-title">${prompt.title}</h3>
        <div class="prompt-text">${prompt.prompt || ''}</div>
        ${tagsList ? `<div class="flex flex-wrap gap-1 my-2">${tagsList}</div>` : ''}
        <div class="prompt-meta">
          <div class="prompt-user">
            <div class="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">${(prompt.profiles?.username || '匿名用户').charAt(0)}</div>
            <span>${prompt.profiles?.username || '匿名用户'}</span>
          </div>
          <div class="prompt-time">${formatDate(prompt.created_at)}</div>
        </div>
        <div class="prompt-actions">
          <button class="action-button copy-button" data-prompt="${encodeURIComponent(prompt.prompt || '')}">
            <i class="ri-file-copy-line"></i> 复制
          </button>
          <button class="action-button like-button ${prompt.user_liked ? 'liked' : ''}" data-id="${prompt.id}">
            <i class="ri-heart-${prompt.user_liked ? 'fill' : 'line'}"></i> <span class="like-count">${formatNumber(prompt.likes || 0)}</span>
          </button>
          <button class="action-button collect-button ${prompt.user_collected ? 'collected' : ''}" data-id="${prompt.id}">
            <i class="ri-bookmark-${prompt.user_collected ? 'fill' : 'line'}"></i> <span class="collect-count">${formatNumber(prompt.collects || 0)}</span>
          </button>
        </div>
      </div>
    `;
    
    // 添加点击事件
    card.addEventListener('click', (event) => {
      // 如果点击的是按钮，不触发详情弹窗
      if (event.target.closest('.action-button')) {
        return;
      }
      
      showPromptDetail(prompt.id);
    });
    
    // 添加到容器
    promptsContainer.appendChild(card);
  });
  
  // 初始化Masonry布局
  if (window.Masonry) {
    // 等待图片加载完成后再初始化Masonry
    setTimeout(() => {
      new Masonry(promptsContainer, {
        itemSelector: '.prompt-card',
        columnWidth: '.prompt-card',
        percentPosition: true,
        transitionDuration: '0.3s'
      });
    }, 200);
  }
  
  // 如果是首次加载，添加加载更多按钮
  if (!append && prompts.length >= 20 && !document.getElementById('load-more-container')) {
    const loadMoreContainer = document.createElement('div');
    loadMoreContainer.id = 'load-more-container';
    loadMoreContainer.className = 'col-span-full flex justify-center my-8';
    loadMoreContainer.innerHTML = `
      <button id="load-more" class="px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition">
        加载更多
      </button>
    `;
    promptsContainer.appendChild(loadMoreContainer);
    
    // 添加加载更多事件
    document.getElementById('load-more').addEventListener('click', handleLoadMore);
  }
}

// 显示提示词详情
async function showPromptDetail(promptId) {
  try {
    // 显示加载中
    showLoading('加载详情中...');
    
    // 获取提示词详情
    const { data: prompt, error } = await getPromptById(promptId);
    
    // 隐藏加载中
    hideLoading();
    
    if (error || !prompt) {
      console.error('获取提示词详情失败:', error);
      showMessage('获取详情失败: ' + (error || '未知错误'), 'error');
      return;
    }
    
    // 更新详情模态框
    document.getElementById('detail-title').textContent = prompt.title;
    document.getElementById('detail-image').src = prompt.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzZiNzI4MCI+5Zu+54mH5peg5rOV5pi+56S6PC90ZXh0Pjwvc3ZnPg==';
    document.getElementById('detail-prompt').textContent = prompt.prompt || '';
    
    // 显示模型标签
    const modelTag = document.getElementById('detail-model-tag');
    if (modelTag) {
      modelTag.textContent = prompt.model || 'Unknown';
    }
    
    // 用户信息
    const username = prompt.profiles?.username || '匿名用户';
    document.getElementById('detail-username').textContent = username;
    document.getElementById('detail-user-avatar').textContent = username.charAt(0);
    
    // 负面提示词
    const negativeContainer = document.getElementById('detail-negative-container');
    const negativePrompt = document.getElementById('detail-negative');
    
    if (prompt.negative_prompt) {
      negativePrompt.textContent = prompt.negative_prompt;
      negativeContainer.style.display = 'block';
    } else {
      negativeContainer.style.display = 'none';
    }
    
    // 标签
    const tagsContainer = document.getElementById('detail-tags');
    tagsContainer.innerHTML = '';
    
    if (prompt.tags && prompt.tags.length > 0) {
      prompt.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
    } else {
      tagsContainer.innerHTML = '<span class="text-gray-400">无标签</span>';
    }
    
    // 时间
    document.getElementById('detail-time').textContent = formatDate(prompt.created_at);
    
    // 点赞和收藏数
    document.getElementById('detail-likes').textContent = formatNumber(prompt.likes || 0);
    document.getElementById('detail-collects').textContent = formatNumber(prompt.collects || 0);
    
    // 点赞和收藏状态
    const likeButton = document.getElementById('detail-like-button');
    const collectButton = document.getElementById('detail-collect-button');
    
    if (prompt.user_liked) {
      likeButton.classList.add('liked');
      likeButton.querySelector('i').className = 'ri-heart-fill';
    } else {
      likeButton.classList.remove('liked');
      likeButton.querySelector('i').className = 'ri-heart-line';
    }
    
    if (prompt.user_collected) {
      collectButton.classList.add('collected');
      collectButton.querySelector('i').className = 'ri-bookmark-fill';
    } else {
      collectButton.classList.remove('collected');
      collectButton.querySelector('i').className = 'ri-bookmark-line';
    }
    
    // 设置按钮数据
    likeButton.setAttribute('data-id', prompt.id);
    collectButton.setAttribute('data-id', prompt.id);
    
    // 复制按钮
    const copyPromptButton = document.getElementById('copy-prompt-button');
    if (copyPromptButton) {
      copyPromptButton.setAttribute('data-prompt', prompt.prompt || '');
      
      // 添加复制事件
      copyPromptButton.addEventListener('click', () => {
        navigator.clipboard.writeText(prompt.prompt || '')
          .then(() => {
            showMessage('提示词已复制到剪贴板');
          })
          .catch(err => {
            console.error('复制失败:', err);
            showMessage('复制失败', 'error');
          });
      });
    }
    
    // 复制负面提示词按钮
    const copyNegativeButton = document.getElementById('copy-negative-button');
    if (copyNegativeButton) {
      copyNegativeButton.setAttribute('data-prompt', prompt.negative_prompt || '');
      
      // 添加复制事件
      copyNegativeButton.addEventListener('click', () => {
        navigator.clipboard.writeText(prompt.negative_prompt || '')
          .then(() => {
            showMessage('负面提示词已复制到剪贴板');
          })
          .catch(err => {
            console.error('复制失败:', err);
            showMessage('复制失败', 'error');
          });
      });
    }
    
    // 显示模态框
    const detailModal = document.getElementById('detail-modal');
    detailModal.style.display = 'flex';
    setTimeout(() => {
      detailModal.style.opacity = '1';
      detailModal.style.visibility = 'visible';
    }, 10);
  } catch (error) {
    hideLoading();
    console.error('显示提示词详情时出错:', error);
    showMessage('显示详情失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 处理加载更多
function handleLoadMore() {
  if (!state.isLoading && state.hasMorePrompts) {
    loadPrompts(state.currentPage + 1);
  }
}

// 处理滚动加载
function handleScroll() {
  if (state.isLoading || !state.hasMorePrompts) {
    return;
  }
  
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  
  // 当滚动到距离底部100px时，加载更多
  if (scrollY + windowHeight >= documentHeight - 100) {
    loadPrompts(state.currentPage + 1);
  }
}

// 处理复制按钮点击
async function handleCopyClick(event) {
  const target = event.target.closest('.copy-button');
  
  if (!target) {
    return;
  }
  
  const promptText = decodeURIComponent(target.getAttribute('data-prompt'));
  
  if (!promptText) {
    showMessage('没有可复制的内容', 'warning');
    return;
  }
  
  try {
    await copyToClipboard(promptText);
    showMessage('提示词已复制到剪贴板', 'success');
    
    // 更新按钮文本
    const originalText = target.innerHTML;
    target.innerHTML = '<i class="icon-check"></i> 已复制';
    
    // 恢复按钮文本
    setTimeout(() => {
      target.innerHTML = originalText;
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    showMessage('复制失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 处理点赞按钮点击
async function handleLikeClick(event) {
  const target = event.target.closest('.like-button');
  
  if (!target) {
    return;
  }
  
  // 检查用户是否登录
  if (!state.user) {
    showMessage('请先登录', 'warning');
    
    // 打开登录模态框
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.style.display = 'block';
    }
    
    return;
  }
  
  const promptId = target.getAttribute('data-id');
  
  if (!promptId) {
    return;
  }
  
  try {
    // 乐观更新UI
    const isLiked = target.classList.contains('liked');
    const countElement = target.querySelector('.like-count');
    const currentCount = parseInt(countElement.textContent.replace(/[^0-9]/g, '') || '0');
    
    if (isLiked) {
      target.classList.remove('liked');
      countElement.textContent = formatNumber(Math.max(0, currentCount - 1));
    } else {
      target.classList.add('liked');
      countElement.textContent = formatNumber(currentCount + 1);
    }
    
    // 调用点赞API
    const { data, error } = await likePrompt(promptId);
    
    if (error) {
      // 恢复UI
      if (isLiked) {
        target.classList.add('liked');
      } else {
        target.classList.remove('liked');
      }
      countElement.textContent = formatNumber(currentCount);
      
      console.error('点赞失败:', error);
      showMessage('操作失败: ' + error, 'error');
      return;
    }
    
    // 更新计数
    if (data && typeof data.count !== 'undefined') {
      countElement.textContent = formatNumber(data.count);
    }
  } catch (error) {
    console.error('点赞过程中出错:', error);
    showMessage('操作失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 处理收藏按钮点击
async function handleCollectClick(event) {
  const target = event.target.closest('.collect-button');
  
  if (!target) {
    return;
  }
  
  // 检查用户是否登录
  if (!state.user) {
    showMessage('请先登录', 'warning');
    
    // 打开登录模态框
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.style.display = 'block';
    }
    
    return;
  }
  
  const promptId = target.getAttribute('data-id');
  
  if (!promptId) {
    return;
  }
  
  try {
    // 乐观更新UI
    const isCollected = target.classList.contains('collected');
    const countElement = target.querySelector('.collect-count');
    const currentCount = parseInt(countElement.textContent.replace(/[^0-9]/g, '') || '0');
    
    if (isCollected) {
      target.classList.remove('collected');
      countElement.textContent = formatNumber(Math.max(0, currentCount - 1));
    } else {
      target.classList.add('collected');
      countElement.textContent = formatNumber(currentCount + 1);
    }
    
    // 调用收藏API
    const { data, error } = await collectPrompt(promptId);
    
    if (error) {
      // 恢复UI
      if (isCollected) {
        target.classList.add('collected');
      } else {
        target.classList.remove('collected');
      }
      countElement.textContent = formatNumber(currentCount);
      
      console.error('收藏失败:', error);
      showMessage('操作失败: ' + error, 'error');
      return;
    }
    
    // 更新计数
    if (data && typeof data.count !== 'undefined') {
      countElement.textContent = formatNumber(data.count);
    }
  } catch (error) {
    console.error('收藏过程中出错:', error);
    showMessage('操作失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 监听认证状态变化
function setupAuthListener() {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('认证状态变化:', event);
    
    if (event === 'SIGNED_IN' && session) {
      console.log('用户已登录:', session.user.email);
      
      // 加载用户数据
      await loadUserData();
      
      // 刷新提示词列表
      loadPrompts(0);
    } else if (event === 'SIGNED_OUT') {
      console.log('用户已登出');
      
      // 清除用户状态
      state.user = null;
      
      // 更新UI
      updateUserUI(null);
      
      // 刷新提示词列表
      loadPrompts(0);
    }
  });
}

// 初始化密码显示切换功能
function initPasswordToggle() {
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 找到相邻的密码输入框
      const passwordInput = this.previousElementSibling;
      if (!passwordInput || passwordInput.type !== 'password' && passwordInput.type !== 'text') {
        console.error('无法找到密码输入框或元素类型不正确');
        return;
      }
      
      // 切换密码显示/隐藏
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.querySelector('i').className = 'ri-eye-line';
      } else {
        passwordInput.type = 'password';
        this.querySelector('i').className = 'ri-eye-off-line';
      }
    });
  });
  
  console.log('密码显示切换功能已初始化，找到按钮数量:', togglePasswordButtons.length);
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupAuthListener();
}); 