import React from 'react';
import BaseSkeleton, { type SkeletonType, type SkeletonAnimation } from './BaseSkeleton';
import '../skeleton.css';

export type SkeletonLayout = 'vertical' | 'grid' | 'waterfall';

export interface SkeletonListProps {
  count?: number;
  type?: SkeletonType;
  avatarSize?: string;
  imageHeight?: string | string[];
  showStats?: boolean;
  showButton?: boolean;
  layout?: SkeletonLayout;
  listClass?: string;
  itemClass?: string;
  animation?: SkeletonAnimation;
}

function getImageHeight(
  index: number,
  type: SkeletonType,
  imageHeight: string | string[],
): string {
  if (type !== 'image-card') return Array.isArray(imageHeight) ? imageHeight[0] ?? '200px' : imageHeight;

  if (Array.isArray(imageHeight)) {
    return imageHeight[index % imageHeight.length];
  }

  if (imageHeight === 'random') {
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 480) {
        const heights = ['120px', '140px', '160px', '180px', '150px', '170px'];
        return heights[index % heights.length];
      } else if (window.innerWidth <= 768) {
        const heights = ['150px', '180px', '210px', '240px', '190px', '220px'];
        return heights[index % heights.length];
      } else {
        const heights = ['180px', '220px', '260px', '300px', '240px', '280px'];
        return heights[index % heights.length];
      }
    }
    return imageHeight;
  }

  return imageHeight;
}

const layoutClassMap: Record<SkeletonLayout, string> = {
  grid: 'grid-layout',
  waterfall: 'waterfall-layout',
  vertical: '',
};

const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 6,
  type = 'user-card',
  avatarSize = '48px',
  imageHeight = '200px',
  showStats = true,
  showButton = true,
  layout = 'vertical',
  listClass = '',
  itemClass = '',
  animation = 'shimmer',
}) => {
  const layoutClass = layout !== 'vertical' ? layoutClassMap[layout] : '';

  return (
    <div className={`skeleton-list ${layoutClass} ${listClass}`.trim()}>
      {Array.from({ length: count }, (_, index) => (
        <BaseSkeleton
          key={index}
          type={type}
          avatarSize={avatarSize}
          imageHeight={getImageHeight(index, type, imageHeight)}
          showStats={showStats}
          showButton={showButton}
          wrapperClass={itemClass}
          animation={animation}
        />
      ))}
    </div>
  );
};

export default SkeletonList;
