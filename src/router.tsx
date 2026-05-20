import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/pages/layout/Layout'
import Explore from '@/pages/explore/Explore'
import ChannelPage from '@/pages/explore/ChannelPage'
import PostDetail from '@/pages/PostDetail'
import Notification from '@/pages/notification/Notification'
import User from '@/pages/user/User'
import UserProfile from '@/pages/user/UserProfile'
import FollowList from '@/pages/user/FollowList'
import SearchResult from '@/pages/search/SearchResult'
import PostManagement from '@/pages/post-management/PostManagement'
import DraftBox from '@/pages/draft-box/DraftBox'
import Publish from '@/pages/Publish'
import NotFound from '@/pages/NotFound'
import OAuthCallback from '@/pages/OAuthCallback'

import AdminLogin from '@/pages/admin/AdminLogin'
import AdminLayout from '@/pages/admin/AdminLayout'
import ApiDocs from '@/pages/admin/ApiDocs'
import AdminMonitor from '@/pages/admin/AdminMonitor'
import UserManagement from '@/pages/admin/UserManagement'
import PostManagementAdmin from '@/pages/admin/PostManagement'
import PostAudit from '@/pages/admin/PostAudit'
import CommentManagement from '@/pages/admin/CommentManagement'
import TagManagement from '@/pages/admin/TagManagement'
import LikeManagement from '@/pages/admin/LikeManagement'
import CollectionManagement from '@/pages/admin/CollectionManagement'
import FollowManagement from '@/pages/admin/FollowManagement'
import NotificationManagement from '@/pages/admin/NotificationManagement'
import SessionManagement from '@/pages/admin/SessionManagement'
import AdminSessionManagement from '@/pages/admin/AdminSessionManagement'
import AdminManagement from '@/pages/admin/AdminManagement'
import AuditManagement from '@/pages/admin/AuditManagement'
import CategoryManagement from '@/pages/admin/CategoryManagement'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/explore" replace /> },
      {
        path: 'explore',
        element: <Explore />,
        children: [
          { index: true, element: <ChannelPage /> },
          { path: ':channel', element: <ChannelPage /> },
        ],
      },
      { path: 'post', element: <PostDetail /> },
      { path: 'publish', element: <Publish /> },
      { path: 'notification', element: <Notification /> },
      { path: 'user', element: <User /> },
      { path: 'user/:userId', element: <UserProfile /> },
      {
        path: 'follow/:type',
        element: <FollowList />,
      },
      {
        path: 'search_result',
        element: <Navigate to="/search_result/all" replace />,
      },
      {
        path: 'search_result/:tab',
        element: <SearchResult />,
      },
      { path: 'post-management', element: <PostManagement /> },
      { path: 'draft-box', element: <DraftBox /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/oauth/callback',
    element: <OAuthCallback />,
  },
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/api-docs" replace /> },
      { path: 'api-docs', element: <ApiDocs /> },
      { path: 'monitor', element: <AdminMonitor /> },
      { path: 'users', element: <UserManagement /> },
      { path: 'post-audit', element: <PostAudit /> },
      { path: 'posts', element: <PostManagementAdmin /> },
      { path: 'comments', element: <CommentManagement /> },
      { path: 'categories', element: <CategoryManagement /> },
      { path: 'tags', element: <TagManagement /> },
      { path: 'likes', element: <LikeManagement /> },
      { path: 'collections', element: <CollectionManagement /> },
      { path: 'follows', element: <FollowManagement /> },
      { path: 'notifications', element: <NotificationManagement /> },
      { path: 'sessions', element: <SessionManagement /> },
      { path: 'admin-sessions', element: <AdminSessionManagement /> },
      { path: 'admins', element: <AdminManagement /> },
      { path: 'audit', element: <AuditManagement /> },
    ],
  },
])
