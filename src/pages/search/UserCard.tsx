import FollowButton from '@/components/FollowButton'
import VerifiedBadge from '@/components/VerifiedBadge'
import type { UserInfo } from '@/types/user'
import { useNavigate } from 'react-router-dom'

interface UserCardProps {
  user: UserInfo
}

export default function UserCard({ user }: UserCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/user/${user.user_id}`)
  }

  return (
    <div className="user-card" onClick={handleClick}>
      <style>{`
        .user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          border: 1px solid var(--border-color-secondary);
        }
        .user-card:hover {
          background-color: var(--bg-color-secondary);
        }
        .user-card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .user-card-info {
          flex: 1;
          min-width: 0;
        }
        .user-card-name {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-color-primary);
          margin-bottom: 2px;
        }
        .user-card-bio {
          font-size: 13px;
          color: var(--text-color-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        .user-card-stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--text-color-tertiary);
          margin-top: 2px;
        }
        .user-card-follow {
          flex-shrink: 0;
        }
      `}</style>
      <img
        src={user.avatar || '/avatar.png'}
        alt={user.nickname}
        className="user-card-avatar"
        onError={(e) => { (e.target as HTMLImageElement).src = '/avatar.png' }}
      />
      <div className="user-card-info">
        <div className="user-card-name">
          {user.nickname}
          <VerifiedBadge verified={user.verified} size="small" />
        </div>
        {user.bio && <div className="user-card-bio">{user.bio}</div>}
        <div className="user-card-stats">
          <span>{user.follow_count} 关注</span>
          <span>{user.fans_count} 粉丝</span>
          <span>{user.like_count} 获赞</span>
        </div>
      </div>
      <div className="user-card-follow" onClick={(e) => e.stopPropagation()}>
        <FollowButton userId={user.id} isFollowing={user.isFollowing || false} size="small" />
      </div>
    </div>
  )
}
