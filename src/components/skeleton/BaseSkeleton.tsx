import React from 'react';
import '../skeleton.css';

export type SkeletonType = 'user-card' | 'image-card' | 'user-item' | 'custom';
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

export interface BaseSkeletonProps {
  type?: SkeletonType;
  avatarSize?: string;
  imageHeight?: string;
  showStats?: boolean;
  showButton?: boolean;
  wrapperClass?: string;
  animation?: SkeletonAnimation;
  children?: React.ReactNode;
}

const BaseSkeleton: React.FC<BaseSkeletonProps> = ({
  type = 'user-card',
  avatarSize = '48px',
  imageHeight = '200px',
  showStats = true,
  showButton = true,
  wrapperClass = '',
  animation = 'shimmer',
  children,
}) => {
  const avatarStyle: React.CSSProperties = {
    width: avatarSize,
    height: avatarSize,
  };

  const animationClass =
    animation === 'none'
      ? 'no-animation'
      : animation === 'pulse'
        ? 'pulse-animation'
        : '';

  if (type === 'custom') {
    return (
      <div className={`skeleton-wrapper ${wrapperClass} ${animationClass}`.trim()}>
        <div className="skeleton-custom">{children}</div>
      </div>
    );
  }

  return (
    <div className={`skeleton-wrapper ${wrapperClass} ${animationClass}`.trim()}>
      {type === 'user-card' && (
        <div className="skeleton-user-card">
          <div className="skeleton-avatar" style={avatarStyle} />
          <div className="skeleton-info">
            <div className="skeleton-line" style={{ width: '80px', height: '16px', marginBottom: '6px' }} />
            <div className="skeleton-line" style={{ width: '120px', height: '12px', marginBottom: '8px' }} />
            {showStats && (
              <div className="skeleton-stats">
                <div className="skeleton-line" style={{ width: '60px', height: '12px' }} />
                <div className="skeleton-line" style={{ width: '60px', height: '12px' }} />
              </div>
            )}
          </div>
          {showButton && <div className="skeleton-button" />}
        </div>
      )}

      {type === 'image-card' && (
        <div className="skeleton-image-card">
          <div className="skeleton-image" style={{ height: imageHeight }} />
          <div className="skeleton-line" style={{ width: '90%', height: '14px', margin: '8px 0' }} />
          <div className="skeleton-footer">
            <div className="skeleton-avatar" style={{ width: '24px', height: '24px' }} />
            <div className="skeleton-line" style={{ width: '60px', height: '12px' }} />
            <div className="skeleton-line" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} />
          </div>
        </div>
      )}

      {type === 'user-item' && (
        <div className="skeleton-user-item">
          <div className="skeleton-avatar" style={avatarStyle} />
          <div className="skeleton-info">
            <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '6px' }} />
            <div className="skeleton-line" style={{ width: '40%', height: '12px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseSkeleton;
