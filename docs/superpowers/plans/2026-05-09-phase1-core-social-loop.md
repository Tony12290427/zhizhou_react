# Phase 1: 核心社交闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the core social loop — Feed, Post Detail, Comments, Likes, Follow, Publish — between zhizhou_react and zhizhou_be, making the app fully demoable.

**Architecture:** Add 2 missing backend APIs (password change, comment delete). Fix data format mismatches between backend raw DTOs and frontend store expectations. Rewrite Publish.tsx to use real OSS upload + draft→confirm→publish flow. Replace all stubs in the API layer with real calls.

**Tech Stack:** Spring Boot 3.2 + MyBatis (backend), React 19 + TanStack Query + Zustand + Axios (frontend)

---

### Task 1: Backend — Add Password Change API

**Files:**
- Create: `src/main/java/com/arknow/auth/api/dto/PasswordChangeRequest.java`
- Modify: `src/main/java/com/arknow/auth/api/AuthController.java`
- Modify: `src/main/java/com/arknow/auth/service/AuthService.java`

- [ ] **Step 1: Write PasswordChangeRequest DTO**

```java
package com.arknow.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswordChangeRequest(
    @NotBlank String oldPassword,
    @NotBlank String newPassword
) {}
```

- [ ] **Step 2: Add changePassword to AuthService**

In `AuthService.java`, add after the `resetPassword` method (line 249):

```java
/**
 * Changes the authenticated user's password.
 * <p>
 * Requires the current password for verification. After change, all existing
 * refresh tokens are revoked — the user must re-login on all devices.
 */
public void changePassword(long userId, String oldPassword, String newPassword) {
    User user = findUserById(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.IDENTIFIER_NOT_FOUND));
    if (!StringUtils.hasText(user.getPasswordHash())) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "当前账号未设置密码，请先通过验证码设置密码");
    }
    if (!passwordEncoder.matches(oldPassword.trim(), user.getPasswordHash())) {
        throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "原密码错误");
    }
    validatePassword(newPassword);
    user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
    userService.updatePassword(user);
    refreshTokenStore.revokeAll(userId);
}
```

- [ ] **Step 3: Add endpoint to AuthController**

In `AuthController.java`, add after the `resetPassword` method (line 82):

```java
/** Changes the authenticated user's password. Revokes all existing refresh tokens. */
@PostMapping("/password/change")
public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request,
                                           @AuthenticationPrincipal Jwt jwt) {
    long userId = Long.parseLong(jwt.getClaimAsString("uid"));
    authService.changePassword(userId, request.oldPassword(), request.newPassword());
    return ResponseEntity.noContent().build();
}
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd /Users/chuntingli/zhizhou_be && mvn compile -q`
Expected: BUILD SUCCESS

---

### Task 2: Backend — Add Comment Delete API

**Files:**
- Modify: `src/main/java/com/arknow/comment/mapper/CommentMapper.java`
- Modify: `src/main/java/com/arknow/comment/api/CommentController.java`

- [ ] **Step 1: Add delete method to CommentMapper**

In `CommentMapper.java`, add after `countReplies`:

```java
int deleteById(@Param("id") long id, @Param("userId") long userId);
```

- [ ] **Step 2: Check if CommentMapper.xml exists, add SQL if needed**

Run: `find /Users/chuntingli/zhizhou_be/src/main/resources -name "CommentMapper.xml" 2>/dev/null`
If no XML file exists (annotation-based mapper), add annotation to the interface method:

```java
@Delete("DELETE FROM comments WHERE id = #{id} AND user_id = #{userId}")
int deleteById(@Param("id") long id, @Param("userId") long userId);
```

If XML exists, add:

```xml
<delete id="deleteById">
    DELETE FROM comments WHERE id = #{id} AND user_id = #{userId}
</delete>
```

- [ ] **Step 3: Add delete endpoint to CommentController**

In `CommentController.java`, add after the `create` method:

```java
@DeleteMapping("/{id}")
public Map<String, Boolean> delete(@PathVariable long id,
                                   @AuthenticationPrincipal Jwt jwt) {
    long uid = Long.parseLong(jwt.getClaimAsString("uid"));
    int rows = mapper.deleteById(id, uid);
    if (rows == 0) {
        throw new com.arknow.common.exception.BusinessException(
            com.arknow.common.exception.ErrorCode.BAD_REQUEST, "评论不存在或无权删除");
    }
    return Map.of("success", true);
}
```

Add imports:
```java
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd /Users/chuntingli/zhizhou_be && mvn compile -q`
Expected: BUILD SUCCESS

---

### Task 3: Frontend — Fix Comment API Response Format

**Files:**
- Modify: `src/lib/api/comment.ts`
- Modify: `src/stores/comment-store.ts`

- [ ] **Step 1: Read current comment backend response format**

The backend `CommentController.list()` returns:
```json
{ "items": [...], "total": N, "offset": N }
```

Backend returns `Comment` objects with fields: `id`, `postId`, `userId`, `parentId`, `content`, `createdAt`, plus joined fields `nickname`, `userAvatar`.

- [ ] **Step 2: Rewrite commentApi.getComments to normalize response**

In `src/lib/api/comment.ts`, replace the `getComments` function:

```typescript
import request from '@/lib/request'

export const commentApi = {
  async getComments(postId: number | string, params?: Record<string, unknown>) {
    const raw: any = await request.get('/comments', {
      params: { postId, offset: 0, limit: 20, ...params },
    })
    // Backend returns { items: Comment[], total: number, offset: number }
    const items = raw?.items || []
    return {
      success: true,
      data: {
        comments: items.map((c: any) => ({
          id: c.id,
          user_id: c.userId,
          user_auto_id: c.userId,
          nickname: c.nickname || '匿名用户',
          user_avatar: c.userAvatar || '',
          content: c.content,
          created_at: c.createdAt,
          parent_id: c.parentId || null,
          reply_count: c.replyCount || 0,
          like_count: 0,
          liked: false,
        })),
        pagination: { total: raw?.total || items.length, offset: raw?.offset || 0 },
      },
    }
  },

  async getReplies(commentId: number | string, params?: Record<string, unknown>) {
    const raw: any = await request.get(`/comments/${commentId}/replies`, {
      params: { offset: 0, limit: 10, ...params },
    })
    const items = raw?.items || []
    return {
      success: true,
      data: {
        comments: items.map((c: any) => ({
          id: c.id,
          user_id: c.userId,
          user_auto_id: c.userId,
          nickname: c.nickname || '匿名用户',
          user_avatar: c.userAvatar || '',
          content: c.content,
          created_at: c.createdAt,
          parent_id: c.parentId || null,
          reply_count: c.replyCount || 0,
          like_count: 0,
          liked: false,
        })),
        pagination: { total: raw?.total || items.length },
      },
    }
  },

  async createComment(data: { postId: number; content: string; parentId?: number }) {
    const raw: any = await request.post('/comments', data)
    // Backend returns the created Comment directly
    return {
      success: true,
      data: {
        id: raw.id,
        user_id: raw.userId,
        nickname: raw.nickname || '匿名用户',
        user_avatar: raw.userAvatar || '',
        content: raw.content,
        created_at: raw.createdAt,
        parent_id: raw.parentId || null,
        reply_count: 0,
        like_count: 0,
        liked: false,
      },
    }
  },

  async deleteComment(commentId: number | string) {
    await request.delete(`/comments/${commentId}`)
    return { success: true }
  },
}
```

- [ ] **Step 3: Update comment-store.ts to use the normalized format**

In `src/stores/comment-store.ts`, the `fetchComments` method at line 162 uses `response.data.comments`. Update line 168 to handle the normalized response:

Replace lines 162-169:
```typescript
const response = await commentApi.getComments(postId, apiParams)

if (!response) {
  console.error(`笔记[${postId}]评论获取失败，响应为空`)
  throw new Error('响应数据为空')
}

if (response.success && response.data && response.data.comments) {
  const parentComments: CommentUser[] = response.data.comments.map((comment: any) => ({
```

With:
```typescript
const response = await commentApi.getComments(postId, apiParams)

if (!response) {
  console.error(`笔记[${postId}]评论获取失败，响应为空`)
  throw new Error('响应数据为空')
}

if (response.success && response.data?.comments) {
  const parentComments: CommentUser[] = (response.data.comments || []).map((comment: any) => ({
```

- [ ] **Step 4: Verify frontend compiles**

Run: `cd /Users/chuntingli/zhizhou_react && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors related to comment files

---

### Task 4: Frontend — Wire Up Publish Flow with Real OSS Uploads

**Files:**
- Modify: `src/pages/Publish.tsx`
- Modify: `src/lib/api/posts.ts`

- [ ] **Step 1: Replace createPost stub in posts.ts**

In `src/lib/api/posts.ts`, replace lines 183-185:

```typescript
export async function createPost(_data: Record<string, unknown>) {
  return { success: false, message: 'Post creation requires OSS presigned upload workflow' }
}
```

With:

```typescript
/**
 * Create and publish a post via zhizhou_be.
 * Flow: upload media → POST /knowposts/drafts → POST /knowposts/{id}/content/confirm → POST /knowposts/{id}/publish
 */
export async function createPost(postData: Record<string, unknown>): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    // Step 1: Create draft
    const draft: any = await request.post('/knowposts/drafts')
    const postId = draft?.id
    if (!postId) return { success: false, message: '创建草稿失败' }

    // Step 2: Upload media files and get URLs
    const imageUrls: any[] = []
    const images = (postData.images as any[]) || []
    for (const img of images) {
      if (img.file instanceof File) {
        const presign: any = await request.post('/storage/presign', {
          filename: img.file.name,
          contentType: img.file.type || 'image/png',
        })
        if (presign.url) {
          await fetch(presign.url, {
            method: 'PUT',
            body: img.file,
            headers: { 'Content-Type': img.file.type || 'image/png' },
          })
          imageUrls.push({ url: presign.publicUrl || presign.url.split('?')[0], originalName: img.file.name, size: img.file.size })
        }
      } else if (img.url) {
        imageUrls.push(img)
      }
    }

    let videoUrl: string | null = null
    const video = postData.video as any
    if (video) {
      if (video.file instanceof File) {
        const presign: any = await request.post('/storage/presign', {
          filename: video.file.name,
          contentType: video.file.type || 'video/mp4',
        })
        if (presign.url) {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', presign.url)
            xhr.setRequestHeader('Content-Type', video.file.type || 'video/mp4')
            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
            xhr.onerror = () => reject(new Error('Network error'))
            xhr.send(video.file)
          })
          videoUrl = presign.publicUrl || presign.url.split('?')[0]
        }
      } else if (video.url) {
        videoUrl = video.url
      }
    }

    // Step 3: Confirm content
    const imgUrls = imageUrls.map((i: any) => i.url)
    const tags = (postData.tags as string[]) || []
    await request.post(`/knowposts/${postId}/content/confirm`, {
      title: postData.title,
      content: postData.content,
      description: (postData.content as string)?.substring(0, 200) || '',
      imgUrls: JSON.stringify(imgUrls),
      videoUrl: videoUrl || null,
      tags: JSON.stringify(tags),
      category: (postData.category_id as number) || 0,
    })

    // Step 4: Publish
    await request.post(`/knowposts/${postId}/publish`)

    return { success: true, data: { id: postId }, message: '发布成功' }
  } catch (error: any) {
    console.error('Publish failed:', error)
    return { success: false, message: error?.message || '发布失败' }
  }
}
```

- [ ] **Step 2: Replace updatePost stub in posts.ts**

Replace lines 191-193:

```typescript
export async function updatePost(postId: number, data: Record<string, unknown>) {
  try {
    await request.patch(`/knowposts/${postId}`, {
      title: data.title,
      description: (data.content as string)?.substring(0, 200) || '',
      tags: JSON.stringify(data.tags || []),
    })
    return { success: true, data: { id: postId } }
  } catch (error: any) {
    return { success: false, message: error?.message || '更新失败' }
  }
}
```

- [ ] **Step 3: Replace deletePost stub in posts.ts**

Replace `deletePost` function:

```typescript
export async function deletePost(postId: number) {
  try {
    await request.delete(`/knowposts/${postId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error?.message || '删除失败' }
  }
}
```

- [ ] **Step 4: Fix Publish.tsx image handling to pass File objects**

In `src/pages/Publish.tsx`, the `handlePublish` at line 242 builds `mediaData` using `{ url: img.preview, name: img.file.name }`. The File objects are available via `uploadedImages[i].file`. Update lines 260-264 to pass File objects to `createPost`:

Replace lines 258-268:
```typescript
let mediaData: any[] = []

if (uploadType === 'image') {
  // Upload images
  showMessage('正在上传图片...', 'info')
  // In a real app, this would use the upload API
  mediaData = uploadedImages.map((img) => ({ url: img.preview, name: img.file.name }))
} else if (uploadType === 'video' && videoFile) {
  showMessage('正在上传视频...', 'info')
  mediaData = { url: videoPreview, name: videoFile.name }
}
```

With:
```typescript
let mediaData: any[] = []

if (uploadType === 'image') {
  showMessage('正在上传图片...', 'info')
  mediaData = uploadedImages.map((img) => ({ file: img.file, url: img.preview, name: img.file.name }))
} else if (uploadType === 'video' && videoFile) {
  showMessage('正在上传视频...', 'info')
  mediaData = { file: videoFile, url: videoPreview, name: videoFile.name }
}
```

- [ ] **Step 5: Fix Publish.tsx handleSaveDraft media handling**

Apply the same change to `handleSaveDraft` at lines 319-326 — include `file` reference:

Replace lines 321-326:
```typescript
let mediaData: any[] = []
if (uploadType === 'image') {
  mediaData = uploadedImages.map((img) => ({ url: img.preview, name: img.file.name }))
} else if (uploadType === 'video' && videoFile) {
  mediaData = { url: videoPreview, name: videoFile.name }
}
```

With:
```typescript
let mediaData: any[] = []
if (uploadType === 'image') {
  mediaData = uploadedImages.map((img) => ({ file: img.file, url: img.preview, name: img.file.name }))
} else if (uploadType === 'video' && videoFile) {
  mediaData = { file: videoFile, url: videoPreview, name: videoFile.name }
}
```

- [ ] **Step 6: Fix import in Publish.tsx**

The Publish.tsx imports `createPost, getPostDetail, updatePost` from `@/lib/api/posts`. Verify these now match the real implementations. The `createPost` now expects File objects in the media arrays.

- [ ] **Step 7: Verify frontend compiles**

Run: `cd /Users/chuntingli/zhizhou_react && npx tsc --noEmit 2>&1 | head -30`
Expected: No new TypeScript errors

---

### Task 5: Frontend — Replace API Stubs with Real Calls

**Files:**
- Modify: `src/lib/api/index.ts`

- [ ] **Step 1: Replace changePassword stub**

In `src/lib/api/index.ts`, find `userApi.changePassword` (around line 114):

Replace:
```typescript
changePassword(_userId: number, _data: Record<string, unknown>) {
  return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
},
```

With:
```typescript
changePassword(_userId: number, data: Record<string, unknown>) {
  return request.post('/auth/password/change', {
    oldPassword: data.oldPassword || (data as any).old_password,
    newPassword: data.newPassword || (data as any).new_password,
  })
},
```

- [ ] **Step 2: Replace deletePost stub**

Find `postApi.deletePost` (around line 246):

Replace:
```typescript
deletePost(_postId: number) {
  return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
},
```

With:
```typescript
deletePost(postId: number) {
  return request.delete(`/knowposts/${postId}`)
},
```

- [ ] **Step 3: Replace getUserCollections stub**

Find `postApi.getUserCollections` (around line 272):

Replace:
```typescript
getUserCollections(_userId: number, _params: Record<string, unknown> = {}) {
  return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
},
```

With:
```typescript
getUserCollections(_userId: number, _params: Record<string, unknown> = {}) {
  return request.get('/collections')
},
```

- [ ] **Step 4: Fix commentApi.deleteComment in lib/api/index.ts**

Find the stub at `commentApi.deleteComment` (around line 345). The same endpoint should be active after Task 2. Ensure it calls:

```typescript
deleteComment(commentId: number) {
  return request.delete(`/comments/${commentId}`)
},
```

- [ ] **Step 5: Verify compile**

Run: `cd /Users/chuntingli/zhizhou_react && npx tsc --noEmit 2>&1 | head -20`

---

### Task 6: Frontend — Fix Feed Data Flow (postApi response format)

**Files:**
- Modify: `src/lib/api/index.ts` (the `postApi.getPosts` section)
- Modify: `src/stores/channel-store.ts`

- [ ] **Step 1: Check the backend feed response format**

The backend `GET /knowposts/feed` returns:
```json
{ "items": [{ "id": N, "title": "...", "description": "...", "coverImage": "...", "authorNickname": "...", "authorAvatar": "...", "likeCount": N, "favoriteCount": N, "commentCount": N, "liked": false, "faved": false, "isTop": false, "createdAt": "..." }], "page": 1, "size": 20, "hasMore": true, "total": N }
```

- [ ] **Step 2: Verify feed data flows to WaterfallFlow**

In `src/stores/channel-store.ts`, check that the posts array from `getPostList` flows correctly into the `WaterfallFlow` component. The channel store calls `getPostList` which returns `{ posts: TransformedPost[], pagination: {...}, hasMore: boolean }`. Each `TransformedPost` has `image` (coverImage), `title`, `author`, `avatar`, `like_count`, `comment_count`, etc. The `PostItem` component renders these fields.

Run: `cd /Users/chuntingli/zhizhou_react && npx tsc --noEmit 2>&1 | grep -i "channel\|postItem\|waterfall" | head -10`
Expected: No errors

---

### Task 7: Integration Smoke Test — Verify End-to-End

- [ ] **Step 1: Start backend**

```bash
cd /Users/chuntingli/zhizhou_be && mvn spring-boot:run &
```

- [ ] **Step 2: Verify backend endpoints**

```bash
# Feed
curl -s http://localhost:8080/api/v1/knowposts/feed?page=1\&size=2 | head -c 200

# Password change (should fail without auth → 401)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/password/change -H 'Content-Type: application/json' -d '{"oldPassword":"old","newPassword":"new"}'
# Expected: 401

# Comment delete (should fail without auth → 401)
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:8080/api/v1/comments/1
# Expected: 401
```

- [ ] **Step 3: Start frontend**

```bash
cd /Users/chuntingli/zhizhou_react && npm run dev &
```

- [ ] **Step 4: Open browser and verify**

1. Open `http://localhost:5173`
2. Verify Feed loads (waterfall grid shows posts)
3. Click a post → verify detail page shows content, author, comments
4. Open browser console → check for errors

- [ ] **Step 5: Verify browser console has no "Not available" errors**

All `Promise.reject({ success: false, message: 'Not available in zhizhou_be' })` stubs replaced in Phase 1 should no longer trigger.

---

### Task 8: Commit

```bash
cd /Users/chuntingli/zhizhou_be
git add -A
git commit -m "feat: add password/change and comment delete APIs for Phase 1"

cd /Users/chuntingli/zhizhou_react
git add -A
git commit -m "feat: wire up core social loop - publish flow, comment API format, replace stubs"
```
