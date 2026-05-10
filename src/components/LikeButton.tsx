import { useState, useCallback } from 'react'
import { Heart } from 'lucide-react'
import clsx from 'clsx'

interface LikeButtonProps {
  isLiked: boolean
  size?: 'small' | 'medium' | 'large'
  onClick?: (willBeLiked: boolean, event: React.MouseEvent) => void
  className?: string
}

export function LikeButton({
  isLiked,
  size = 'medium',
  onClick,
  className,
}: LikeButtonProps) {
  const [scaling, setScaling] = useState(false)
  const [showRing, setShowRing] = useState(false)

  const iconSizeMap: Record<string, number> = {
    small: 16,
    medium: 20,
    large: 24,
  }
  const iconSize = iconSizeMap[size] || 20

  const ringSizeMap: Record<string, number> = {
    small: 16,
    medium: 20,
    large: 24,
  }
  const ringSize = ringSizeMap[size] || 20

  const triggerAnimation = useCallback((willBeLiked: boolean) => {
    setScaling(false)
    setShowRing(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScaling(true)
        if (willBeLiked) {
          setShowRing(true)
        }
      })
    })
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const willBeLiked = !isLiked
      triggerAnimation(willBeLiked)
      onClick?.(willBeLiked, e)
    },
    [isLiked, onClick, triggerAnimation]
  )

  const onScaleEnd = useCallback(() => {
    setScaling(false)
  }, [])

  const onRingEnd = useCallback(() => {
    setShowRing(false)
  }, [])

  return (
    <button
      className={clsx(
        'like-button',
        { active: isLiked },
        size,
        className
      )}
      onClick={handleClick}
    >
      <span className="like-btn-wrapper">
        {showRing && (
          <span
            className="like-ring"
            style={{ width: ringSize, height: ringSize }}
            onAnimationEnd={onRingEnd}
          />
        )}
        <Heart
          className={clsx({ liked: isLiked, scaling })}
          size={iconSize}
          fill={isLiked ? '#ff4757' : 'none'}
          strokeWidth={2}
          onAnimationEnd={onScaleEnd as any}
          style={{
            color: isLiked ? '#ff4757' : undefined,
          }}
        />
      </span>
      <style>{`
        .like-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-color-secondary);
          transition: color 0.2s ease;
          padding: 0;
          border-radius: 4px;
        }
        .like-button:hover {
          color: var(--text-color-primary);
        }
        .like-btn-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .liked {
          color: #ff4757 !important;
        }
        .scaling {
          animation: likeScale 0.5s linear both;
        }
        .like-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          border: 1px solid #ff4757;
          background: transparent;
          transform: translate(-50%, -50%) scale(0);
          animation: likeRing 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes likeScale {
          0%   { transform: scale(1); }
          30%  { transform: scale(0.5); }
          50%  { transform: scale(1.2); }
          80%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes likeRing {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `}</style>
    </button>
  )
}
