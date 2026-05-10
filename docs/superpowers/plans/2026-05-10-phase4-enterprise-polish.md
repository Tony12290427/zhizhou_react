# Phase 4: 企业级打磨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 从"能跑"升级到"企业级" — AI 搜索前端对接、后端测试、性能压测、API 文档、部署文档

**Architecture:** 不改现有 API，补齐质量基础设施。Phase 4a 核心增强（AI搜索+测试+文档），Phase 4b 性能可观测性（压测+监控），Phase 4c 文档部署（可选）

---

## Phase 4a: 核心增强（2-3天）

### Task 1: AI 搜索前端对接

**Files:** `src/lib/api/index.ts`, `src/pages/search/SearchResult.tsx`

后端已有 `GET /search/ai?q=&topK=` 返回 SSE 流（`data: [HTML]...`, `data: [ARTICLES]...`, `data: [DONE]`）。

- 在 `index.ts` 添加 `searchApi.aiSearch(query, topK)` — 使用 EventSource 或 fetch 读取 SSE 流
- 在 SearchResult 页面集成：搜索结果区域显示流式 AI 回答 + 引用文章卡片
- Markdown 渲染（使用现有的 ContentRenderer 或 react-markdown）

### Task 2: 后端测试覆盖

**Files:** `src/test/java/com/arknow/`

**@WebMvcTest（10个，每 Controller 1个）：**
| 测试文件 | 验证点 |
|---------|--------|
| `AuthControllerTest.java` | `POST /auth/login` 成功返回 token + 401无效密码 |
| `KnowPostControllerTest.java` | `GET /knowposts/feed` 返回分页 posts |
| `CommentControllerTest.java` | `POST /comments` 创建评论 + `DELETE /comments/{id}` 删除 |
| `RelationControllerTest.java` | `POST /relation/follow` 关注成功 |
| `ActionControllerTest.java` | `POST /action/like` 点赞成功 |
| `ProfileControllerTest.java` | `GET /profile/{id}` 返回用户信息 |
| `NotificationControllerTest.java` | `GET /notifications` 返回列表 |
| `SearchControllerTest.java` | `GET /search?keyword=` 返回搜索结果 |
| `CollectionControllerTest.java` | `GET /collections` 返回收藏夹 |
| `AdminAuthControllerTest.java` | `POST /admin/auth/login` 管理员登录 + 403非管理员 |

**@SpringBootTest 冒烟测试（3个核心端点）：**
| 测试文件 | 验证点 |
|---------|--------|
| `FeedSmokeTest.java` | Feed 端点真实 HTTP 请求返回 200 + items[] |
| `AuthSmokeTest.java` | 注册→登录→获取用户信息 完整流程 |
| `PostDetailSmokeTest.java` | 帖子详情返回完整字段（title, content, author） |

**覆盖率目标：** 整体 > 60%，Controller 层 > 80%

### Task 3: API 文档

**Files:** AdminApiDocsController.java（已有骨架）

- 填充所有端点的请求/响应示例
- 按模块分组：Auth / Posts / Comments / Relations / Actions / Collections / Notifications / Search / Profile / Admin
- `/admin/api-docs` 可访问

---

## Phase 4b: 性能与可观测性（1-2天）

### Task 4: 性能压测

**Files:** 新建 `benchmark/` 目录

**使用 K6（JavaScript DSL，比 JMeter 更轻量）编写：**

```
benchmark/
├── k6-script.js       # 主压测脚本
├── scenarios.json     # 压测场景配置
└── report.md          # 压测报告
```

**压测场景（k6-script.js）：**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 预热
    { duration: '1m',  target: 100 },  // 爬升
    { duration: '1m',  target: 100 },  // 稳态
    { duration: '30s', target: 0 },    // 冷却
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // P95 < 500ms
    http_req_failed: ['rate<0.01'],    // 错误率 < 1%
  },
};

export default function() {
  // Feed (高频)
  const feed = http.get('http://localhost:8090/api/v1/knowposts/feed?page=1&size=20');
  check(feed, { 'feed 200': (r) => r.status === 200 });
  sleep(1);

  // Post detail (中频)
  const detail = http.get('http://localhost:8090/api/v1/knowposts/detail/310746918873600000');
  check(detail, { 'detail 200': (r) => r.status === 200 });
  sleep(2);

  // Search (低频)
  const search = http.get('http://localhost:8090/api/v1/search?keyword=技术&page=1&size=10');
  check(search, { 'search 200': (r) => r.status === 200 });
  sleep(3);
}
```

**压测报告包含：** 总请求数、QPS、P50/P95/P99 延迟、错误率、缓存命中率（从 `/actuator/metrics` 读取）

**目标：** Feed QPS > 500，P95 < 200ms（缓存热）

### Task 5: 监控验证

**Files:** 验证现有 Micrometer + Actuator 配置

- `/actuator/metrics` 验证自定义指标暴露（cache hit rate, QPS）
- `/actuator/health` 健康检查
- 确认 Resilience4j 熔断器指标可见

### Task 6: Sentry 错误追踪验证

**Files:** `src/lib/observability.ts`

- 验证 Sentry SDK 初始化正确
- 验证 Web Vitals 上报
- 手动触发测试错误确认 Sentry dashboard 收到

---

## Phase 4c: 文档与部署（可选，1-2天）

### Task 7: Docker Compose 部署

**Files:** 新建 `docker-compose.yml`, `.env.example`

**服务清单：**
```yaml
services:
  mysql:       mysql:8.0,  port 3306,  volume ./db/schema.sql:/docker-entrypoint-initdb.d/
  redis:       redis:7-alpine, port 6379
  elasticsearch: elasticsearch:8.x, port 9200,  env discovery.type=single-node, xpack.security.enabled=false
  kafka:       (可选，如果 ES 索引通过直接 API 调用同步则可省略)
  backend:     maven:3.9-eclipse-temurin-21, port 8090,  depends on mysql+redis+es
  frontend:    node:20-alpine, port 5173,  depends on backend
```

**`.env.example` 模板：**
```
DB_URL=jdbc:mysql://mysql:3306/arkknow
DB_USER=root
DB_PASS=
REDIS_HOST=redis
ES_HOST=elasticsearch
JWT_PRIVATE_KEY_PATH=/app/private.pem
OSS_ENDPOINT=
OSS_BUCKET=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

**README 部署指南：**
```bash
# 1. 克隆仓库
git clone <repo-url> && cd zhizhou_react

# 2. 复制环境变量
cp .env.example .env  # 编辑填入 API Key

# 3. 启动所有服务
docker-compose up -d

# 4. 访问
# 前端: http://localhost:5173
# 后端: http://localhost:8090
# Admin: http://localhost:5173/admin/login
```

**验收标准：** 新成员从 git clone 到看到 Feed 页面 < 10 分钟

### Task 8: 技术文档更新

**Files:** `ARCHITECTURE.md`, `README.md`

- 更新架构图（补充 Admin 模块）
- README 加入：项目简介、技术栈、启动步骤、API 概览
- 补充 Phase 1-3 新增的 API 端点说明

### Task 9: PWA 离线验证

**Files:** `vite.config.ts`

- 验证 `vite-plugin-pwa` Service Worker 配置
- 离线页面可访问已缓存的 Feed/帖子

---

## Risks

| Risk | Mitigation |
|------|-----------|
| AI 搜索 SSE 前端对接可能涉及复杂流处理 | 先用 fetch + ReadableStream，EventSource 作为备选 |
| 压测需要调优 JVM/连接池参数 | Phase 4b 只做压测+记录，不作为性能优化任务 |
| Sentry 如未配置 DSN 则跳过 | 只验证配置存在，不强制接入 |

---

## Success Criteria

| 指标 | 目标 | 验证方法 |
|------|------|---------|
| AI 搜索可用 | 输入关键词 → 流式返回 AI 回答 + 引用文章 | 浏览器手动测试 |
| 后端测试覆盖率 | > 60%（Controller 层 > 80%） | `mvn test` + JaCoCo report |
| Feed QPS | > 500（缓存热） | `k6 run benchmark/k6-script.js` |
| Feed P95 延迟 | < 200ms（缓存热） | K6 报告 |
| API 文档 | `/admin/api-docs` 列出所有端点 | curl 验证 |
| 部署耗时 | 新人 < 10 分钟 | `docker-compose up -d` + 计时 |
| TypeScript 错误 | 0 新增 | `npx tsc --noEmit` |

## What Already Exists

- `GET /search/ai?q=&topK=` SSE 端点 — 后端已有，只需前端对接
- Micrometer + `/actuator/metrics` — Spring Boot Actuator 已配置，验证即可
- `AdminApiDocsController` — Phase 3b 已创建骨架，填充内容即可
- `vite-plugin-pwa` — 已在 ARCHITECTURE.md 技术栈中，验证配置
- Resilience4j 熔断器 — 后端已集成（LLM 调用保护）

## NOT in Scope

- 性能优化（连接池调优、ES 索引优化、缓存预热）— Phase 4b 只做压测，不做性能优化
- 生产环境 CI/CD（GitHub Actions / Jenkins）— 项目定位为 Demo，非生产部署
- Grafana Dashboard 搭建 — 可选，只验证 `/actuator/metrics` 端点暴露
- 国际化 i18n — 纯中文 UI
- E2E 测试（Playwright/Cypress）— Phase 4 仅覆盖后端单元测试
- CDN 部署 / 域名配置 / HTTPS — 非本阶段范围
