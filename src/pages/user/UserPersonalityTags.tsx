import { useState } from 'react'
import { CircleUserRound, FileEdit, Search, Hash, Paintbrush } from 'lucide-react'

interface UserPersonalityTagsProps {
  gender?: string
  zodiacSign?: string
  mbti?: string
  education?: string
  major?: string
  interests?: string[]
}

export default function UserPersonalityTags({
  gender,
  zodiacSign,
  mbti,
  education,
  major,
  interests,
}: UserPersonalityTagsProps) {
  const [showAllInterests, setShowAllInterests] = useState(false)

  const tags: Array<{ icon: React.ReactNode; label: string; value?: string }> = []
  if (gender) tags.push({ icon: <CircleUserRound size={14} />, label: '性别', value: gender })
  if (zodiacSign) tags.push({ icon: <Hash size={14} />, label: '星座', value: zodiacSign })
  if (mbti) tags.push({ icon: <Paintbrush size={14} />, label: 'MBTI', value: mbti })
  if (education) tags.push({ icon: <FileEdit size={14} />, label: '学历', value: education })
  if (major) tags.push({ icon: <Search size={14} />, label: '专业', value: major })

  if (tags.length === 0 && (!interests || interests.length === 0)) return null

  const displayInterests = showAllInterests ? interests : interests?.slice(0, 5)

  return (
    <div className="personality-tags">
      <style>{`
        .personality-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 0;
        }
        .personality-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background-color: var(--bg-color-secondary);
          border-radius: 12px;
          font-size: 12px;
          color: var(--text-color-secondary);
          border: 1px solid var(--border-color-primary);
        }
        .personality-tag.interest {
          background-color: var(--primary-color-shadow);
          border-color: transparent;
          color: var(--primary-color);
        }
        .personality-tag .tag-icon {
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
        .show-more-tag {
          padding: 4px 10px;
          font-size: 12px;
          color: var(--text-color-tag);
          cursor: pointer;
          background: none;
          border: none;
        }
        .show-more-tag:hover {
          opacity: 0.8;
        }
      `}</style>
      {tags.map((tag, i) => (
        <span key={i} className="personality-tag">
          <span className="tag-icon">{tag.icon}</span>
          {tag.label}: {tag.value}
        </span>
      ))}
      {displayInterests?.map((interest, i) => (
        <span key={`interest-${i}`} className="personality-tag interest">
          {interest}
        </span>
      ))}
      {interests && interests.length > 5 && !showAllInterests && (
        <button className="show-more-tag" onClick={() => setShowAllInterests(true)}>
          +{interests.length - 5} 更多
        </button>
      )}
      {showAllInterests && interests && interests.length > 5 && (
        <button className="show-more-tag" onClick={() => setShowAllInterests(false)}>
          收起
        </button>
      )}
    </div>
  )
}
