# Phase 3b: Admin 扩展 Implementation Plan

**Goal:** 补齐剩余 Admin Controller — 评论/标签/分类/审计管理（Core），以及点赞/收藏/关注/通知/会话/管理员/监控/API文档（Extended）

---

## Task 1: Backend — Core Controllers (Comment, Tag, Category, Audit)

Create 4 controllers + needed mapper methods. All follow same pattern as AdminUserController.

## Task 2: Backend — Extended Controllers (Like, Collection, Follow, Notification, Session, Admin, Monitor, ApiDocs)

Create 8 controllers. Some are simple CRUD wrappers, some need Redis access.

## Task 3: Frontend — Replace remaining admin stubs

Wire up all remaining admin pages in lib/api/index.ts and verify pages.

## Task 4: Verify — compile + integration test
