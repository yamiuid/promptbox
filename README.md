# AI绘画提示词收集平台

这是一个AI绘画提示词收集和分享平台，用户可以上传自己的AI绘画作品、分享提示词，并浏览他人分享的内容。

## 在线演示

访问：[https://promptbox.vercel.app](https://promptbox.vercel.app)

## 项目功能

- 瀑布流展示AI绘画作品
- 提示词详情查看
- 用户注册/登录系统
- 图片上传及提示词分享
- 点赞与收藏功能
- 标签筛选
- 响应式设计，支持移动端和桌面端

## 技术栈

- 前端：HTML, CSS (Tailwind CSS), JavaScript
- 后端：Supabase (PostgreSQL数据库, 身份认证, 存储)
- 部署：Vercel

## 本地开发设置

### 前提条件

- [Supabase](https://supabase.io) 账户
- 基本的HTML/CSS/JavaScript知识

### 步骤1：克隆仓库

```bash
git clone https://github.com/yourusername/promptbox.git
cd promptbox
```

### 步骤2：创建Supabase项目

1. 前往 [Supabase](https://supabase.io) 并登录
2. 创建一个新项目
3. 记下项目URL和匿名秘钥(anon key)

### 步骤3：设置Supabase表和存储

1. 在Supabase项目中，创建以下数据表：

**profiles表**
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用RLS (行级安全)
alter table profiles enable row level security;

-- 创建安全策略
create policy "允许公开读取" on profiles for select using (true);
create policy "允许用户更新自己的配置" on profiles for update using (auth.uid() = id);
```

**prompts表**
```sql
create table prompts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  prompt text not null,
  model text,
  image_url text not null,
  likes integer default 0,
  collects integer default 0,
  views integer default 0,
  tags text[] default '{}',
  parameters jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用RLS
alter table prompts enable row level security;

-- 创建安全策略
create policy "允许公开读取" on prompts for select using (true);
create policy "允许用户创建" on prompts for insert with check (auth.uid() = user_id);
create policy "允许用户更新自己的记录" on prompts for update using (auth.uid() = user_id);
create policy "允许用户删除自己的记录" on prompts for delete using (auth.uid() = user_id);
```

**collections表**
```sql
create table collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  prompt_id uuid references prompts not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, prompt_id)
);

-- 启用RLS
alter table collections enable row level security;

-- 创建安全策略
create policy "允许用户读取自己的收藏" on collections for select using (auth.uid() = user_id);
create policy "允许用户添加收藏" on collections for insert with check (auth.uid() = user_id);
create policy "允许用户删除自己的收藏" on collections for delete using (auth.uid() = user_id);
```

2. 创建以下存储桶：

- 创建一个名为`prompt-images`的公共存储桶用于存储上传的图片
- 设置适当的CORS策略和安全规则

3. 创建以下数据库函数：

**点赞计数函数**
```sql
create or replace function increment_likes(p_id uuid)
returns void as $$
begin
  update prompts set likes = likes + 1 where id = p_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_likes(p_id uuid)
returns void as $$
begin
  update prompts set likes = greatest(0, likes - 1) where id = p_id;
end;
$$ language plpgsql security definer;
```

**收藏计数函数**
```sql
create or replace function increment_collects(p_id uuid)
returns void as $$
begin
  update prompts set collects = collects + 1 where id = p_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_collects(p_id uuid)
returns void as $$
begin
  update prompts set collects = greatest(0, collects - 1) where id = p_id;
end;
$$ language plpgsql security definer;
```

### 步骤4：配置前端应用

1. 打开`js/app.js`文件
2. 将Supabase配置更新为你的项目URL和匿名秘钥：

```javascript
// Supabase配置
const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

### 步骤5：运行应用

由于是纯前端应用，你可以使用任何HTTP服务器运行它：

```bash
# 如果你有Node.js，可以使用http-server
npx http-server
```

或者直接在浏览器中打开`index.html`文件。

## 部署到Vercel

1. 创建一个GitHub仓库并推送代码
2. 在Vercel中导入该仓库
3. 按照提示完成部署

## 注意事项

- 确保在生产环境中设置适当的安全措施和权限
- 根据需要调整存储桶的CORS策略
- 考虑添加图片压缩和优化功能以提高性能

## 贡献

欢迎提交问题和拉取请求。

## 许可证

MIT 