# 前端全交互 /browse 测试 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 用 /browse 在真实浏览器中测试所有 17 类前端交互模块，发现并修复所有 UI 层 Bug

**Architecture:** 每场景: goto → snapshot → click/fill → js验证 → console检查 → network检查。分 3 个 Phase 执行，每 Phase 包含多个 Task

---

## Phase 1: 核心社交闭环（场景 1-7）

### Task 1: Feed 瀑布流

**文件:** 无需修改，纯测试验证

- [ ] **1.1 Feed 加载** — `goto /explore` → 验证 `.channel-tab` 有 6 个标签（推荐/关注/技术/生活/美食/旅行）→ 验证 WaterfallFlow 渲染帖子卡片 → 验证 LazyImage empty src = 0
```bash
$B goto http://localhost:5173/explore
$B js "document.querySelectorAll('.channel-tab').length"  # 期望 6
$B js "document.querySelectorAll('img').length > 0"       # 期望 true
$B js "document.querySelectorAll('img[src=\"\"]').length"  # 期望 0
```

- [ ] **1.2 Feed 滚动加载** — 初始图片数 → `scroll` → 等待 2s → 图片数应增加
```bash
$B js "document.querySelectorAll('img').length"  # 记录初始值
$B scroll
sleep 2
$B js "document.querySelectorAll('img').length"  # 应该 > 初始值
```

- [ ] **1.3 频道切换** — 点击非默认频道标签 → 验证 active 类变化 → 验证 Feed 内容变化
```bash
$B snapshot -i -c | grep "频道标签"
$B click @eN  # 点击第二个频道
sleep 2
$B js "document.querySelector('.channel-tab.active')?.textContent"
```

### Task 2: 帖子详情

**文件:** 无需修改，纯测试验证

- [ ] **2.1 DetailCard 弹窗** — Feed 中点击帖子卡片 → 验证弹窗打开 → 验证标题/内容/作者渲染
```bash
$B click @c16  # 第一个帖子卡片
sleep 3
$B js "document.querySelector('h1,h2,[class*=title]')?.textContent"  # 应该有标题
$B js "document.querySelector('[class*=author],[class*=nickname]')?.textContent"  # 作者
```

- [ ] **2.2 帖子详情页面路由** — `goto /post?id=310746918873600000` → 验证页面渲染 → 验证评论数显示
```bash
$B goto "http://localhost:5173/post?id=310746918873600000"
$B text | grep "条评论"
```

- [ ] **2.3 标签点击** — 帖子详情中点击标签 → 验证跳转到搜索页
```bash
$B click ".tag-item, [class*=tag]"  # 点击第一个标签
sleep 2
$B url  # 应该包含 /search_result
```

### Task 3: 登录/注册

**文件:** 无需修改，纯测试验证

- [ ] **3.1 登录弹窗出现** — 清除登录态 → 点击"登录" → 验证 dialog=1
```bash
$B js "localStorage.clear()"
$B reload
$B snapshot -i -c | grep "登录"
$B click @eN  # 登录按钮
sleep 2
$B js "document.querySelectorAll('[role=dialog]').length"  # 期望 1
```

- [ ] **3.2 弹窗居中** — 验证 dialog 在视口中央
```bash
$B js "const d=document.querySelector('[role=dialog]');JSON.stringify(d.getBoundingClientRect())"
# y 应该 ≈ (viewportHeight - dialogHeight) / 2
```

- [ ] **3.3 输入框正常** — 验证手机号输入框 + 密码输入框存在
```bash
$B js "document.querySelectorAll('[role=dialog] input').length"  # 期望 >= 2
```

- [ ] **3.4 API 登录成功** — 通过 API 登录 → 验证 token 存储 → 刷新后 UI 变化
```bash
$B js "fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifierType:'PHONE',identifier:'13988888888',password:'Test1234'})}).then(r=>r.json()).then(d=>{if(d.token){localStorage.setItem('token',d.token.accessToken);localStorage.setItem('refreshToken',d.token.refreshToken)}})"
sleep 2
$B reload
$B js "localStorage.getItem('token') ? 'LOGGED IN' : 'NOT'"  # 期望 LOGGED IN
```

### Task 4: 点赞/取消点赞

**文件:** 无需修改，纯测试验证

- [ ] **4.1 点赞** — 点击 `.like-button` → 验证 class 变为 `active` → 验证 `POST /action/like → 200`
```bash
$B js "document.querySelector('.like-button').click()"
sleep 2
$B js "document.querySelector('.like-button.active') ? 'LIKED' : 'NOT'"  # 期望 LIKED
$B network | grep "action/like"  # 应该看到 200
```

- [ ] **4.2 取消点赞** — 再次点击 → 验证 class 移除 `active` → `POST /action/unlike → 200`
```bash
$B js "document.querySelector('.like-button.active').click()"
sleep 2
$B js "document.querySelector('.like-button.active') ? 'STILL' : 'UNLIKED'"  # 期望 UNLIKED
```

### Task 5: 收藏

**文件:** 无需修改，纯测试验证

- [ ] **5.1 收藏** — 点击收藏按钮 → 验证 `POST /action/fav → 200`
- [ ] **5.2 取消收藏** — 再次点击 → `POST /action/unfav → 200`

### Task 6: 评论

**文件:** 无需修改，纯测试验证

- [ ] **6.1 发布评论** — 帖子详情页 → contenteditable 输入文字 → 点击发送 → 验证评论出现 + API 200
```bash
$B js "const div=document.querySelector('[contenteditable=true]');div.focus();div.textContent='browse测试评论';div.dispatchEvent(new Event('input',{bubbles:true}))"
$B js "const btn=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('发送')&&!b.disabled);if(btn)btn.click()"
sleep 3
$B text | grep "browse测试评论"  # 应该出现
$B network | grep "POST.*comments"  # 应该看到 200
```

- [ ] **6.2 评论数更新** — 验证 "共 X 条评论" 数字增加
- [ ] **6.3 回复评论** — 点击某条评论的"回复" → 验证输入框获得焦点
- [ ] **6.4 删除评论** — 自己的评论出现"删除"按钮 → 点击 → 验证评论消失

### Task 7: 关注

**文件:** 无需修改，纯测试验证

- [ ] **7.1 关注** — 点击 `.follow-btn` → 验证 `POST /relation/follow → 200`
- [ ] **7.2 取消关注** — 再次点击 → `POST /relation/unfollow → 200`

---

## Phase 2: 用户功能 + 搜索（场景 8-13）

### Task 8: 搜索

- [ ] **8.1 关键词搜索** — 搜索框输入"技术" → Enter → 验证跳转 `/search_result/all?keyword=技术`
- [ ] **8.2 AI 搜索** — 切换到"AI"Tab → 验证 SSE 流式返回 HTML
- [ ] **8.3 搜索 Tab 切换** — 切换到"用户"Tab → 验证用户列表渲染

### Task 9: 个人资料

- [ ] **9.1 查看自己资料** — `goto /user` → 验证昵称/关注/粉丝数
- [ ] **9.2 查看他人资料** — `goto /user/10` → 验证正确显示（不是"用户不存在"）
- [ ] **9.3 编辑资料弹窗** — 点击"编辑资料" → EditProfileModal 出现

### Task 10: 通知

- [ ] **10.1 通知列表** — `goto /notification` → 验证 4 个 Tab 渲染
- [ ] **10.2 一键已读** — 点击 → `POST /notifications/read-all → 200`

### Task 11: 发布

- [ ] **11.1 发布页面** — `goto /publish` → 验证完整表单渲染（不是 TODO）
- [ ] **11.2 频道标签** — 验证图片/视频上传 Tab 可切换
- [ ] **11.3 草稿保存** — 输入内容 → 点击"存草稿"

### Task 12: 笔记管理

- [ ] **12.1 笔记列表** — `goto /post-management` → 验证列表 + 分页
- [ ] **12.2 删除确认** — 点击删除 → ConfirmDialog 出现

### Task 13: 草稿箱

- [ ] **13.1 草稿箱** — `goto /draft-box` → 验证列表或空状态

---

## Phase 3: Admin + 导航 + 错误边界（场景 14-17）

### Task 14: Admin 后台

- [ ] **14.1 Admin 登录页** — `goto /admin/login` → 验证表单
- [ ] **14.2 Admin 用户管理** — 登录后 → `goto /admin/users` → 验证 DataTable + 数据
- [ ] **14.3 Admin 帖子审核** — `goto /admin/post-audit` → 验证列表

### Task 15: 导航路由

- [ ] **15.1 Header 导航** — 点击 Logo/发布/通知/我 → 验证跳转正确 URL
- [ ] **15.2 Footer 导航（移动端）** — viewport 375x812 → 验证底部导航可见
- [ ] **15.3 Sidebar（桌面端）** — viewport 1280x720 → 验证侧边栏 + 所有导航项

### Task 16: 主题

- [ ] **16.1 主题切换** — 验证 `data-theme` 属性在 light/dark 间切换

### Task 17: 错误边界

- [ ] **17.1 404 页面** — `goto /nonexistent` → 验证显示"页面不存在"
- [ ] **17.2 空状态** — 草稿箱空 → "暂无草稿"；搜索无结果 → "没有找到相关内容"

---

## 验证标准

每个 Task 完成后检查：
- [ ] 无新增 console 错误（忽略预存的 ERR_NAME_NOT_RESOLVED, email config stub）
- [ ] 所有 API 调用返回 200/201/204
- [ ] DOM 状态符合预期
- [ ] TypeScript 编译 0 新错误

## 执行顺序

Phase 1 → Phase 2 → Phase 3，每 Phase 内按 Task 编号顺序执行
