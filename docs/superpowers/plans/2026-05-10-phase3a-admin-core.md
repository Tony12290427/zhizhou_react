# Phase 3a: Admin 核心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 建立 Admin 后台核心 — 管理员认证 + 用户管理 + 帖子审核

**Architecture:** Admin 复用现有 JWT 体系，`users` 表加 `role` 列。AdminAuthController 校验 role claim。新增 AdminUser/AdminPost Controller。

---

## Task 1: Backend — Add role column + seed admin

**Files:** schema.sql, User.java, UserMapper.java/xml
- `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'`
- Add `role` field to User domain
- Insert seed admin user (phone=admin, role=ADMIN)

---

## Task 2: Backend — AdminAuthController

**Files:** Create AdminAuthController.java, AdminAuthService.java
- `POST /api/v1/admin/auth/login` — login + check role=ADMIN
- `POST /api/v1/admin/auth/refresh` — refresh token
- `POST /api/v1/admin/auth/logout` — logout
- `GET /api/v1/admin/auth/me` — current admin info

---

## Task 3: Backend — AdminUserController

**Files:** Create AdminUserController.java
- `GET /api/v1/admin/users` — paginated list + search
- `GET /api/v1/admin/users/{id}` — user detail
- `PUT /api/v1/admin/users/{id}` — ban/unban
- `DELETE /api/v1/admin/users/{id}` — delete user
- `POST /api/v1/admin/users/batch-delete` — batch delete

---

## Task 4: Backend — AdminPostController

**Files:** Create AdminPostController.java
- `GET /api/v1/admin/posts` — paginated + status filter
- `GET /api/v1/admin/posts/{id}` — post detail
- `DELETE /api/v1/admin/posts/{id}` — delete
- `POST /api/v1/admin/posts/batch-delete` — batch
- `POST /api/v1/admin/posts/{id}/audit` — approve/reject

---

## Task 5: Frontend — Admin API layer + AdminLogin wiring

**Files:** `src/lib/api/index.ts`, `src/pages/admin/AdminLogin.tsx`, `src/pages/admin/AdminLayout.tsx`
- Replace admin auth stubs (login, me, logout, refresh)
- Wire AdminLogin to /admin/auth/login
- AdminLayout role check

---

## Task 6: Frontend — Admin User/Post management pages

**Files:** `src/lib/api/index.ts`, UserManagement.tsx, PostManagement.tsx, PostAudit.tsx
- Replace admin user/post stubs
- Wire pages to real API calls

---

## Task 7: Integration test + verify
