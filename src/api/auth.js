// 导入 Supabase 客户端
import { supabaseClient } from './supabase.js';

// 检查用户登录状态
async function checkAuthState() {
  try {
    console.log('检查用户登录状态...');
    
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      return false;
    }
    
    const { data, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('获取用户状态错误:', error);
      return false;
    }
    
    if (data.session) {
      console.log('用户已登录:', data.user.email);
      return true;
    } else {
      console.log('用户未登录');
      return false;
    }
  } catch (error) {
    console.error('检查用户状态时出错:', error);
    return false;
  }
}

// 处理登录
async function handleLogin(email, password) {
  try {
    console.log('开始登录流程，邮箱:', email);
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      throw new Error('系统错误: Supabase客户端未初始化');
    }
    
    console.log('调用Supabase auth.signInWithPassword...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    console.log('Supabase auth.signInWithPassword返回:', data ? '有数据' : '无数据', error);
    
    if (error) {
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
      
      throw new Error(errorMsg);
    }
    
    return data;
  } catch (error) {
    console.error('登录错误详情:', error);
    throw error;
  }
}

// 处理注册
async function handleRegister(email, password, username) {
  try {
    console.log('开始注册流程，邮箱:', email, '用户名:', username);
    console.log('网络状态:', navigator.onLine ? '在线' : '离线');
    
    // 表单验证
    if (!email || !password || !username) {
      throw new Error('请填写所有必填字段');
    }
    
    if (password.length < 6) {
      throw new Error('密码长度至少需要6个字符');
    }
    
    // 检查Supabase客户端是否已初始化
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      throw new Error('系统错误: Supabase客户端未初始化');
    }
    
    // 注册用户
    console.log('调用Supabase auth.signUp...');
    
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
      
      // 处理常见错误
      let errorMsg = authError.message || '注册失败';
      if (errorMsg.includes('already registered')) {
        errorMsg = '该邮箱已注册，请直接登录';
      } else if (errorMsg.includes('password')) {
        errorMsg = '密码不符合要求，请使用更强的密码';
      }
      
      throw new Error(errorMsg);
    }
    
    return authData;
  } catch (error) {
    console.error('注册过程中出现异常:', error);
    throw error;
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

// 处理退出登录
async function handleLogout() {
  try {
    console.log('开始退出登录...');
    
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      throw new Error('系统错误: Supabase客户端未初始化');
    }
    
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      console.error('退出登录失败:', error);
      throw new Error('退出登录失败: ' + error.message);
    }
    
    console.log('退出登录成功');
    return true;
  } catch (error) {
    console.error('退出登录过程中出错:', error);
    throw error;
  }
}

// 重新发送验证邮件
async function resendVerificationEmail(email) {
  try {
    if (!email) {
      throw new Error('请输入邮箱地址');
    }
    
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      throw new Error('系统错误: Supabase客户端未初始化');
    }
    
    console.log('重新发送验证邮件到:', email);
    
    const { data, error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error('发送验证邮件失败:', error);
      throw new Error('发送验证邮件失败: ' + (error.message || '未知错误'));
    }
    
    console.log('验证邮件发送成功:', data);
    return data;
  } catch (error) {
    console.error('发送验证邮件过程中出错:', error);
    throw error;
  }
}

// 使用第三方登录
async function signInWithProvider(provider) {
  try {
    if (!supabaseClient) {
      console.error('Supabase客户端未初始化');
      throw new Error('系统错误: Supabase客户端未初始化');
    }
    
    console.log(`尝试使用${provider}登录...`);
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error(`${provider}登录失败:`, error);
      throw new Error(`${provider}登录失败: ` + (error.message || '未知错误'));
    }
    
    console.log(`${provider}登录请求成功:`, data);
    return data;
  } catch (error) {
    console.error(`${provider}登录过程中出错:`, error);
    throw error;
  }
}

// 导出模块
export {
  checkAuthState,
  handleLogin,
  handleRegister,
  createUserProfile,
  getUserProfile,
  handleLogout,
  resendVerificationEmail,
  signInWithProvider
}; 