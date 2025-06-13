// 导入 Supabase 客户端
import { supabaseClient } from './supabase.js';

// 获取提示词列表
async function getPrompts(limit = 10, page = 0) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    // 如果是使用模拟客户端，直接返回模拟数据
    if (supabaseClient.isLocalMode) {
      const mockPrompts = supabaseClient.getMockPrompts?.() || [];
      return { data: mockPrompts, error: null };
    }
    
    // 计算偏移量
    const offset = page * limit;
    
    // 查询提示词列表
    const { data: prompts, error } = await supabaseClient
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('获取提示词列表失败:', error);
      return { data: null, error: error.message };
    }
    
    // 如果没有提示词数据，直接返回
    if (!prompts || prompts.length === 0) {
      return { data: [], error: null };
    }
    
    // 获取所有用户ID
    const userIds = [...new Set(prompts.map(p => p.user_id))];
    
    // 查询用户资料
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('user_id', userIds);
    
    if (profilesError) {
      console.error('获取用户资料失败:', profilesError);
      // 即使获取用户资料失败，也继续返回提示词数据
    }
    
    // 将用户资料与提示词数据合并
    const promptsWithProfiles = prompts.map(prompt => {
      const profile = profiles?.find(p => p.user_id === prompt.user_id);
      return {
        ...prompt,
        profiles: profile ? {
          username: profile.username,
          avatar_url: profile.avatar_url
        } : null
      };
    });
    
    return { data: promptsWithProfiles, error: null };
  } catch (error) {
    console.error('获取提示词列表过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 获取提示词详情
async function getPromptById(id) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    // 如果是使用模拟客户端，直接从本地数据中查找
    if (supabaseClient.isLocalMode) {
      const mockPrompt = supabaseClient.getMockPromptById?.(id);
      if (mockPrompt) {
        return { data: mockPrompt, error: null };
      } else {
        return { data: null, error: '提示词不存在' };
      }
    }
    
    // 查询提示词详情
    const { data: prompt, error } = await supabaseClient
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('获取提示词详情失败:', error);
      return { data: null, error: error.message };
    }
    
    if (!prompt) {
      return { data: null, error: '提示词不存在' };
    }
    
    // 查询用户资料
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', prompt.user_id)
      .single();
    
    if (profileError) {
      console.error('获取用户资料失败:', profileError);
      // 即使获取用户资料失败，也继续返回提示词数据
    }
    
    // 合并提示词和用户资料
    const promptWithProfile = {
      ...prompt,
      profiles: profile ? {
        username: profile.username,
        avatar_url: profile.avatar_url
      } : null
    };
    
    return { data: promptWithProfile, error: null };
  } catch (error) {
    console.error('获取提示词详情过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 上传图片
async function uploadImage(file) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    if (!file) {
      return { data: null, error: '未选择文件' };
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `prompts/${fileName}`;
    
    const { data, error } = await supabaseClient.storage
      .from('images')
      .upload(filePath, file);
    
    if (error) {
      console.error('上传图片失败:', error);
      return { data: null, error: error.message };
    }
    
    // 获取公共URL
    const { data: urlData } = supabaseClient.storage
      .from('images')
      .getPublicUrl(filePath);
    
    return { data: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('上传图片过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 保存提示词
async function savePrompt(promptData) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    // 检查用户是否已登录
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('用户未登录:', userError);
      return { data: null, error: '请先登录' };
    }
    
    // 如果存在prompt_text字段，将其重命名为prompt
    if (promptData.prompt_text) {
      promptData.prompt = promptData.prompt_text;
      delete promptData.prompt_text;
    }
    
    // 添加用户ID和创建时间
    const data = {
      ...promptData,
      user_id: userData.user.id,
      created_at: new Date().toISOString()
    };
    
    const { data: result, error } = await supabaseClient
      .from('prompts')
      .insert([data])
      .select();
    
    if (error) {
      console.error('保存提示词失败:', error);
      return { data: null, error: error.message };
    }
    
    return { data: result[0], error: null };
  } catch (error) {
    console.error('保存提示词过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 点赞提示词
async function likePrompt(promptId) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    // 检查用户是否已登录
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('用户未登录:', userError);
      return { data: null, error: '请先登录' };
    }
    
    // 检查是否已点赞
    const { data: existingLike, error: checkError } = await supabaseClient
      .from('likes')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('prompt_id', promptId)
      .maybeSingle();
    
    if (checkError) {
      console.error('检查点赞状态失败:', checkError);
      return { data: null, error: checkError.message };
    }
    
    let result;
    
    if (existingLike) {
      // 取消点赞
      const { error: deleteError } = await supabaseClient
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (deleteError) {
        console.error('取消点赞失败:', deleteError);
        return { data: null, error: deleteError.message };
      }
      
      result = { action: 'unliked' };
    } else {
      // 添加点赞
      const { data: likeData, error: insertError } = await supabaseClient
        .from('likes')
        .insert([{
          user_id: userData.user.id,
          prompt_id: promptId
        }])
        .select();
      
      if (insertError) {
        console.error('点赞失败:', insertError);
        return { data: null, error: insertError.message };
      }
      
      result = { action: 'liked', data: likeData[0] };
    }
    
    // 更新提示词的点赞数
    const { data: countData, error: countError } = await supabaseClient
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('prompt_id', promptId);
    
    if (countError) {
      console.error('获取点赞数失败:', countError);
      return { data: result, error: null };
    }
    
    const likeCount = countData.length;
    
    // 更新提示词表中的点赞数
    const { error: updateError } = await supabaseClient
      .from('prompts')
      .update({ likes: likeCount })
      .eq('id', promptId);
    
    if (updateError) {
      console.error('更新点赞数失败:', updateError);
    }
    
    result.count = likeCount;
    return { data: result, error: null };
  } catch (error) {
    console.error('点赞过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 收藏提示词
async function collectPrompt(promptId) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return { data: null, error: '系统错误: Supabase客户端未初始化' };
    }
    
    // 检查用户是否已登录
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('用户未登录:', userError);
      return { data: null, error: '请先登录' };
    }
    
    // 检查是否已收藏
    const { data: existingCollect, error: checkError } = await supabaseClient
      .from('collections')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('prompt_id', promptId)
      .maybeSingle();
    
    if (checkError) {
      console.error('检查收藏状态失败:', checkError);
      return { data: null, error: checkError.message };
    }
    
    let result;
    
    if (existingCollect) {
      // 取消收藏
      const { error: deleteError } = await supabaseClient
        .from('collections')
        .delete()
        .eq('id', existingCollect.id);
      
      if (deleteError) {
        console.error('取消收藏失败:', deleteError);
        return { data: null, error: deleteError.message };
      }
      
      result = { action: 'uncollected' };
    } else {
      // 添加收藏
      const { data: collectData, error: insertError } = await supabaseClient
        .from('collections')
        .insert([{
          user_id: userData.user.id,
          prompt_id: promptId
        }])
        .select();
      
      if (insertError) {
        console.error('收藏失败:', insertError);
        return { data: null, error: insertError.message };
      }
      
      result = { action: 'collected', data: collectData[0] };
    }
    
    // 更新提示词的收藏数
    const { data: countData, error: countError } = await supabaseClient
      .from('collections')
      .select('id', { count: 'exact' })
      .eq('prompt_id', promptId);
    
    if (countError) {
      console.error('获取收藏数失败:', countError);
      return { data: result, error: null };
    }
    
    const collectCount = countData.length;
    
    // 更新提示词表中的收藏数
    const { error: updateError } = await supabaseClient
      .from('prompts')
      .update({ collects: collectCount })
      .eq('id', promptId);
    
    if (updateError) {
      console.error('更新收藏数失败:', updateError);
    }
    
    result.count = collectCount;
    return { data: result, error: null };
  } catch (error) {
    console.error('收藏过程中出错:', error);
    return { data: null, error: error.message || '未知错误' };
  }
}

// 导出模块
export {
  getPrompts,
  getPromptById,
  uploadImage,
  savePrompt,
  likePrompt,
  collectPrompt
}; 