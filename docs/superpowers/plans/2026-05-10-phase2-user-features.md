# Phase 2: 用户功能完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 补齐用户相关功能 — 个人资料编辑、密码修改、邮箱绑定、账号注销、个性标签、草稿箱、单条通知删除

**Architecture:** 后端新增 7 个 API（email bind/unbind, account delete, personality tags, notification delete），前端去掉对应 stub 并完善 UI 对接

**Tech Stack:** Spring Boot 3.2 + MyBatis (backend), React 19 + Zustand (frontend)

---

## Task 1: Backend — Add Personality Tags API

**Files:**
- Modify: `src/main/java/com/arknow/profile/api/ProfileController.java`
- Modify: `src/main/java/com/arknow/user/mapper/UserMapper.java`

ProfileController already has GET/PATCH for profile. Add tags endpoints that read/write the `tagsJson` column on `users` table.

- [ ] Add `GET /api/v1/profile/{userId}/tags` — returns parsed tags array
- [ ] Add `PUT /api/v1/profile/{userId}/tags` — updates `tagsJson` column
- [ ] Verify: `mvn compile -q`

---

## Task 2: Backend — Add Notification Delete API

**Files:**
- Modify: `src/main/java/com/arknow/notification/mapper/NotificationMapper.java`
- Modify: `src/main/java/com/arknow/notification/api/NotificationController.java`

- [ ] Add `deleteById(long id, long userId)` to NotificationMapper
- [ ] Add `DELETE /api/v1/notifications/{id}` to NotificationController
- [ ] Verify: `mvn compile -q`

---

## Task 3: Backend — Add Email Bind/Unbind API

**Files:**
- Modify: `src/main/java/com/arknow/auth/api/AuthController.java`
- Modify: `src/main/java/com/arknow/auth/service/AuthService.java`

- [ ] Add `POST /api/v1/auth/email/bind` (body: `{ email, code }`) — verify code then update user email
- [ ] Add `POST /api/v1/auth/email/unbind` — clear user email
- [ ] Verify: `mvn compile -q`

---

## Task 4: Backend — Add Account Deletion API

**Files:**
- Modify: `src/main/java/com/arknow/auth/api/AuthController.java`
- Modify: `src/main/java/com/arknow/auth/service/AuthService.java`

- [ ] Add `DELETE /api/v1/auth/account` — soft-delete user, revoke all tokens
- [ ] Verify: `mvn compile -q`

---

## Task 5: Frontend — Replace Phase 2 Stubs in API Layer

**Files:**
- Modify: `src/lib/api/index.ts`

Replace stubs:
- `userApi.deleteAccount` → `request.delete('/auth/account')`
- `userApi.getUserPersonalityTags` → `request.get('/profile/' + userId + '/tags')`
- `notificationApi.deleteNotification` → `request.delete('/notifications/' + id)`
- `authApi.bindEmail` → `request.post('/auth/email/bind', data)`
- `authApi.unbindEmail` → `request.post('/auth/email/unbind')`
- `authApi.sendResetCode` → `request.post('/auth/send-code', { target, scene: 'RESET_PASSWORD' })`
- `authApi.resetPassword` → `request.post('/auth/password/reset', data)`

---

## Task 6: Frontend — Wire Up User Profile & Security Modals

**Files:**
- Modify: `src/stores/user-store.ts` (add updateProfile method)
- Modify: `src/stores/change-password-store.ts`
- Modify: `src/stores/account-security-store.ts`
- Modify: `src/modals/EditProfileModal.tsx`
- Modify: `src/modals/ChangePasswordModal.tsx`
- Modify: `src/modals/AccountSecurityModal.tsx`

Connect stores and modals to real API calls. Password change already has backend API from Phase 1.

---

## Task 7: Frontend — Wire Up Draft Box & Notification Delete

**Files:**
- Modify: `src/pages/draft-box/DraftBox.tsx`
- Verify notification delete UI works with the store

---

## Task 8: Integration Test & Commit

- Restart backend, run curl tests against new endpoints
- Verify frontend compiles with 0 TS errors
