import React from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import './skeleton.css';

export type VerifiedBadgeSize = 'mini' | 'small' | 'medium' | 'large';

export interface VerifiedBadgeProps {
  verified?: number | string;
  title?: string;
  size?: VerifiedBadgeSize;
}

function getTitle(verified: number | string, propTitle: string): string {
  const v = Number(verified);
  if (v === 1) return '官方认证账号';
  if (v === 2) return '个人认证账号';
  return propTitle;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  verified = 0,
  title: propTitle = '官方认证账号',
  size = 'medium',
}) => {
  const v = Number(verified);
  if (v !== 1 && v !== 2) return null;

  const sizeClass = `verified-badge--${size}`;
  const badgeTitle = getTitle(verified, propTitle);
  const isOfficial = v === 1;

  return (
    <span
      className={`verified-badge ${isOfficial ? 'verified-badge--official' : 'verified-badge--personal'} ${sizeClass}`}
    >
      {isOfficial ? (
        <ShieldCheck />
      ) : (
        <BadgeCheck />
      )}
      <span className="tooltip">{badgeTitle}</span>
    </span>
  );
};

export { VerifiedBadge }
export default VerifiedBadge;
