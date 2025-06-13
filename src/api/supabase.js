// Supabase 配置
const SUPABASE_URL = 'https://fqixvvcjzdlhohvyxgav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaXh2dmNqemRsaG9odnl4Z2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjc2NzcsImV4cCI6MjA2NDk0MzY3N30.gR1MLuncTnUK6HvUUfmRkAtrvH7p1vowWr3EG8buqQI';

// 本地开发模式标志
const LOCAL_MODE = false; // 设置为false以使用真实的Supabase后端

// Supabase 客户端实例
let supabaseClient = null;

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
    return true;
  } catch (error) {
    console.error('初始化Supabase客户端时出错:', error);
    return false;
  }
}

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
      user_id: crypto.randomUUID(),
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
        .eq('user_id', testUser.user_id);
      
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

// 导出模块
export {
  supabaseClient,
  initSupabase,
  testSupabaseConnection
}; 