import UserCard from './UserCard'
import type { UserInfo } from '@/types/user'

interface UserListProps {
  users: UserInfo[]
  loading?: boolean
}

export default function UserList({ users, loading }: UserListProps) {
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color-tertiary)' }}>
        搜索用户中...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-color-tertiary)' }}>
        未找到相关用户
      </div>
    )
  }

  return (
    <div className="user-list">
      <style>{`
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px 0;
        }
      `}</style>
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
