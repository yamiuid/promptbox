// 导入依赖
import { savePrompt } from '../api/prompts.js';
import { showMessage, showLoading, hideLoading } from '../utils/ui.js';
import { supabaseClient } from '../api/supabase.js';

// 初始化表单处理
function initFormHandlers() {
  // 处理上传表单提交
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }
  
  // 初始化标签输入
  initTagsInput();
}

// 处理上传表单提交
async function handleUploadSubmit(event) {
  event.preventDefault();
  
  try {
    // 检查用户是否已登录
    const { data: sessionData } = await supabaseClient.auth.getSession();
    
    if (!sessionData?.session) {
      showMessage('请先登录后再上传', 'warning');
      
      // 关闭上传模态框
      const uploadModal = document.getElementById('upload-modal');
      if (uploadModal) {
        uploadModal.style.opacity = '0';
        uploadModal.style.visibility = 'hidden';
        setTimeout(() => {
          uploadModal.style.display = 'none';
        }, 300);
      }
      
      // 打开登录模态框
      const loginModal = document.getElementById('login-modal');
      if (loginModal) {
        loginModal.style.display = 'flex';
        loginModal.style.opacity = '1';
        loginModal.style.visibility = 'visible';
      }
      
      return;
    }
    
    // 获取表单数据
    const title = document.getElementById('prompt-title').value;
    const promptText = document.getElementById('prompt-text').value;
    const negativePrompt = document.getElementById('negative-prompt').value;
    const model = document.getElementById('model-select').value;
    const imageUrl = document.getElementById('image-url')?.value;
    const isPublic = document.getElementById('is-public')?.checked;
    
    // 获取标签
    const tagsContainer = document.getElementById('tags-container');
    const tagElements = tagsContainer?.querySelectorAll('.tag');
    const tags = Array.from(tagElements || []).map(el => el.querySelector('span').textContent);
    
    // 表单验证
    if (!title || !promptText) {
      showMessage('请填写标题和提示词', 'warning');
      return;
    }
    
    // 显示加载中
    showLoading('正在保存提示词...');
    
    // 准备提交数据
    const promptData = {
      title,
      prompt: promptText,
      negative_prompt: negativePrompt || null,
      model: model || null,
      image_url: imageUrl || null,
      is_public: isPublic !== false,
      tags: tags.length > 0 ? tags : null
    };
    
    // 调用保存API
    const { data, error } = await savePrompt(promptData);
    
    // 隐藏加载中
    hideLoading();
    
    if (error) {
      showMessage('保存失败: ' + error, 'error');
      return;
    }
    
    // 保存成功
    showMessage('提示词保存成功', 'success');
    
    // 关闭模态框
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
      uploadModal.style.opacity = '0';
      uploadModal.style.visibility = 'hidden';
      setTimeout(() => {
        uploadModal.style.display = 'none';
      }, 300);
    }
    
    // 重置表单
    event.target.reset();
    
    // 清空标签容器
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
    }
    
    // 清空图片预览
    const previewContainer = document.getElementById('image-preview');
    if (previewContainer) {
      previewContainer.innerHTML = '';
      previewContainer.style.display = 'none';
    }
    
    // 刷新提示词列表
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    hideLoading();
    showMessage('保存过程中出错: ' + (error.message || '未知错误'), 'error');
    console.error('保存错误:', error);
  }
}

// 初始化标签输入
function initTagsInput() {
  const tagInput = document.getElementById('tag-input');
  const addTagButton = document.getElementById('add-tag-button');
  const tagsContainer = document.getElementById('tags-container');
  
  if (!tagInput || !addTagButton || !tagsContainer) {
    return;
  }
  
  // 添加标签函数
  const addTag = () => {
    const tagText = tagInput.value.trim();
    
    if (!tagText) {
      return;
    }
    
    // 检查是否已存在相同标签
    const existingTags = Array.from(tagsContainer.querySelectorAll('.tag')).map(tag => tag.querySelector('span').textContent);
    if (existingTags.includes(tagText)) {
      showMessage('该标签已存在', 'warning');
      return;
    }
    
    // 检查标签数量限制
    if (existingTags.length >= 5) {
      showMessage('最多只能添加5个标签', 'warning');
      return;
    }
    
    // 创建标签元素
    const tag = document.createElement('div');
    tag.className = 'tag px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center';
    tag.innerHTML = `
      <span>${tagText}</span>
      <button type="button" class="remove-tag ml-1 text-gray-500 hover:text-gray-700">
        <i class="ri-close-line"></i>
      </button>
    `;
    
    // 添加删除事件
    const removeButton = tag.querySelector('.remove-tag');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        tag.remove();
      });
    }
    
    // 添加到容器
    tagsContainer.appendChild(tag);
    
    // 清空输入框
    tagInput.value = '';
  };
  
  // 点击添加按钮
  addTagButton.addEventListener('click', addTag);
  
  // 回车添加标签
  tagInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  });
}

// 导出模块
export {
  initFormHandlers
}; 