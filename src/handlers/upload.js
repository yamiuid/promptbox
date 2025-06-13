// 导入依赖
import { uploadImage, savePrompt } from '../api/prompts.js';
import { showMessage, showLoading, hideLoading } from '../utils/ui.js';

// 初始化上传功能
function initUploadHandlers() {
  const uploadButton = document.getElementById('upload-button');
  const fileInput = document.getElementById('image-upload');
  
  if (!uploadButton || !fileInput) {
    console.warn('找不到上传相关元素');
    return;
  }
  
  // 点击上传按钮触发文件选择
  uploadButton.addEventListener('click', () => {
    // 打开上传模态框
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
      uploadModal.style.display = 'flex';
      uploadModal.style.opacity = '1';
      uploadModal.style.visibility = 'visible';
    }
  });
  
  // 文件选择后处理上传
  fileInput.addEventListener('change', handleFileUpload);
  
  // 设置拖放区域
  setupDragAndDrop();
  
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
    const tags = Array.from(tagElements || []).map(el => el.textContent);
    
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
    const existingTags = Array.from(tagsContainer.querySelectorAll('.tag')).map(tag => tag.textContent);
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

// 处理文件上传
async function handleFileUpload(event) {
  const file = event.target.files[0];
  
  if (!file) {
    return;
  }
  
  try {
    // 验证文件类型
    if (!validateFileType(file)) {
      showMessage('只支持上传图片文件（JPEG, PNG, GIF, WEBP）', 'error');
      return;
    }
    
    // 验证文件大小
    if (!validateFileSize(file)) {
      showMessage('文件大小不能超过5MB', 'error');
      return;
    }
    
    // 显示加载中
    showLoading('正在上传图片...');
    
    // 调用上传API
    const { data, error } = await uploadImage(file);
    
    // 隐藏加载中
    hideLoading();
    
    if (error) {
      showMessage('上传失败: ' + error, 'error');
      return;
    }
    
    // 上传成功，显示图片并设置URL
    showMessage('上传成功', 'success');
    
    // 更新预览图
    updateImagePreview(data);
    
    // 更新表单中的图片URL字段
    updateImageUrlField(data);
    
    // 清空文件输入，以便可以重新选择同一文件
    event.target.value = '';
  } catch (error) {
    hideLoading();
    showMessage('上传过程中出错: ' + error.message, 'error');
    console.error('上传错误:', error);
  }
}

// 验证文件类型
function validateFileType(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
}

// 验证文件大小
function validateFileSize(file, maxSizeMB = 5) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// 更新图片预览
function updateImagePreview(imageUrl) {
  const previewContainer = document.getElementById('image-preview');
  
  if (!previewContainer) {
    return;
  }
  
  // 清空预览容器
  previewContainer.innerHTML = '';
  
  // 创建图片元素
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = '上传的图片';
  img.style.maxWidth = '100%';
  img.style.maxHeight = '300px';
  img.style.borderRadius = '4px';
  
  // 添加到预览容器
  previewContainer.appendChild(img);
  previewContainer.style.display = 'block';
}

// 更新图片URL字段
function updateImageUrlField(imageUrl) {
  const imageUrlField = document.getElementById('image-url');
  
  if (imageUrlField) {
    imageUrlField.value = imageUrl;
    
    // 触发change事件，以便表单验证可以感知到变化
    const event = new Event('change', { bubbles: true });
    imageUrlField.dispatchEvent(event);
  }
}

// 设置拖放上传
function setupDragAndDrop() {
  const dropZone = document.getElementById('upload-area');
  
  if (!dropZone) {
    return;
  }
  
  // 阻止默认拖放行为
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // 高亮显示拖放区域
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  // 取消高亮显示
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  // 处理拖放文件
  dropZone.addEventListener('drop', handleDrop, false);
}

// 阻止默认事件
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// 高亮拖放区域
function highlight() {
  const dropZone = document.getElementById('upload-area');
  if (dropZone) {
    dropZone.classList.add('highlight');
  }
}

// 取消高亮
function unhighlight() {
  const dropZone = document.getElementById('upload-area');
  if (dropZone) {
    dropZone.classList.remove('highlight');
  }
}

// 处理拖放文件
function handleDrop(e) {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  
  // 创建一个合成事件对象
  const event = {
    target: {
      files: [file],
      value: '' // 用于后续清空
    }
  };
  
  // 处理文件上传
  handleFileUpload(event);
}

// 导出模块
export {
  initUploadHandlers
}; 