import { useEffect, useRef, useCallback } from 'react';

// ============================================================
// Placeholder paths (mirrors Vue: ~/assets/imgs/{avatar,未加载}.png)
// Served from public/ — matches the Vite public directory
// ============================================================
const DEFAULT_AVATAR = '/avatar.png';
const DEFAULT_PLACEHOLDER = '/zhizhou-placeholder.jpg';

// ============================================================
// ImageLoadQueue (global singleton)
// maxConcurrent: 4 — same as the Vue source
// ============================================================
interface QueueTask {
  task: () => Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
}

class ImageLoadQueue {
  private maxConcurrent: number;
  private running = 0;
  private queue: QueueTask[] = [];

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent;
  }

  add(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift()!;

    try {
      await task();
      resolve();
    } catch (error) {
      reject(error as Error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

const globalImageQueue = new ImageLoadQueue(4);

// ============================================================
// StuckItemManager (global singleton)
// Tracks pending images, checks every 5s for stuck items (>10s)
// ============================================================
interface StuckItemInfo {
  addedAt: number;
  checked: boolean;
  el: HTMLImageElement;
  src: string;
  isAvatar: boolean;
}

class StuckItemManager {
  private pendingItems = new Map<HTMLImageElement, StuckItemInfo>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;

  addItem(el: HTMLImageElement, src: string, isAvatar: boolean): void {
    this.pendingItems.set(el, {
      addedAt: Date.now(),
      checked: false,
      el,
      src,
      isAvatar,
    });
    this.startChecking();
  }

  removeItem(el: HTMLImageElement): void {
    this.pendingItems.delete(el);
    if (this.pendingItems.size === 0) {
      this.stopChecking();
    }
  }

  clearAll(): void {
    this.pendingItems.clear();
    this.stopChecking();
  }

  private startChecking(): void {
    if (this.checkInterval || this.isChecking) return;

    this.checkInterval = setInterval(() => {
      this.checkStuckItems();
    }, 5000);
  }

  private stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkStuckItems(): void {
    if (this.isChecking) return;
    this.isChecking = true;

    const now = Date.now();
    for (const [, info] of this.pendingItems) {
      if (now - info.addedAt > 10000 && !info.checked) {
        if (this.isElementInViewport(info.el)) {
          this.forceLoadImage(info);
          info.checked = true;
        }
      }
    }

    this.isChecking = false;
  }

  private isElementInViewport(el: HTMLImageElement): boolean {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < window.innerHeight + 100 &&
      rect.bottom > -100 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  private forceLoadImage(info: StuckItemInfo): void {
    const { el, src, isAvatar } = info;
    const placeholderImg = isAvatar ? DEFAULT_AVATAR : DEFAULT_PLACEHOLDER;
    const img = new Image();

    img.onload = () => {
      el.src = src;
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.classList.add('fade-in');
      el.dispatchEvent(new Event('load'));
      this.removeItem(el);
    };

    img.onerror = () => {
      el.src = placeholderImg;
      el.alt = '图片加载失败';
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.dispatchEvent(new Event('load'));
      this.removeItem(el);
    };

    // 5-second timeout, then show placeholder
    const timer = setTimeout(() => {
      if (!el.src || el.src.startsWith('data:') || el.src.startsWith('blob:')) {
        el.src = placeholderImg;
        el.alt = '图片加载超时';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.dispatchEvent(new Event('load'));
        this.removeItem(el);
      }
    }, 5000);

    // Clean up timer on success/failure
    const cleanup = () => clearTimeout(timer);
    img.addEventListener('load', cleanup, { once: true });
    img.addEventListener('error', cleanup, { once: true });

    img.src = src;
  }
}

const stuckItemManager = new StuckItemManager();

// ============================================================
// loadImageImmediately — first-screen images, no queue, 3s timeout
// ============================================================
function loadImageImmediately(
  el: HTMLImageElement,
  src: string,
  isAvatar: boolean,
): void {
  const placeholderImg = isAvatar ? DEFAULT_AVATAR : DEFAULT_PLACEHOLDER;
  const img = new Image();

  const timeout = setTimeout(() => {
    img.onload = null;
    img.onerror = null;
    el.src = placeholderImg;
    el.alt = '图片加载超时';
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.dispatchEvent(new Event('load'));
    stuckItemManager.removeItem(el);
  }, 3000);

  img.onload = () => {
    clearTimeout(timeout);
    el.src = src;
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.classList.add('fade-in');
    el.dispatchEvent(new Event('load'));
    stuckItemManager.removeItem(el);
  };

  img.onerror = () => {
    clearTimeout(timeout);
    el.src = placeholderImg;
    el.alt = '图片加载失败';
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.dispatchEvent(new Event('load'));
    stuckItemManager.removeItem(el);
  };

  img.src = src;
}

// ============================================================
// Props
// ============================================================
export interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  isAvatar?: boolean;
  isFirstScreen?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

// ============================================================
// LazyImage Component
// ============================================================
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  isAvatar = false,
  isFirstScreen = false,
  onLoad,
  onError,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prevSrcRef = useRef(src);

  // ---- Queue-based load (used when element scrolls into view) ----
  const loadViaQueue = useCallback(
    (el: HTMLImageElement, imgSrc: string, avatar: boolean) => {
      const placeholderImg = avatar ? DEFAULT_AVATAR : DEFAULT_PLACEHOLDER;

      globalImageQueue
        .add(() => {
          return new Promise<void>((resolve, reject) => {
            const img = new Image();

            const loadTimeout = setTimeout(() => {
              img.onload = null;
              img.onerror = null;
              reject(new Error('加载超时'));
            }, 8000);

            img.onload = () => {
              clearTimeout(loadTimeout);
              el.src = imgSrc;
              el.style.opacity = '1';
              el.style.visibility = 'visible';
              el.classList.add('fade-in');
              el.dispatchEvent(new Event('load'));
              stuckItemManager.removeItem(el);
              resolve();
            };

            img.onerror = () => {
              clearTimeout(loadTimeout);
              el.src = placeholderImg;
              el.alt = '图片加载失败';
              el.style.opacity = '1';
              el.style.visibility = 'visible';
              el.dispatchEvent(new Event('load'));
              stuckItemManager.removeItem(el);
              resolve();
            };

            img.src = imgSrc;
          });
        })
        .catch(() => {
          el.src = placeholderImg;
          el.alt = '图片加载失败';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.dispatchEvent(new Event('load'));
          stuckItemManager.removeItem(el);
        });
    },
    [],
  );

  // ---- Main mount / update logic ----
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    // Handle src changes (Vue "updated" hook equivalent)
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;

      // Re-trigger lazy loading on src change
      if (el.src !== src) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.classList.remove('fade-in');
        stuckItemManager.addItem(el, src, isAvatar);

        // Stop existing observer
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      }
    }

    // If already loaded correctly, skip
    if (el.src === src && el.complete && (el as HTMLImageElement).naturalWidth > 0) {
      return;
    }

    // Set initial state
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.transition = 'opacity 0.3s ease';
    el.dataset.src = src;

    // Register with StuckItemManager
    stuckItemManager.addItem(el, src, isAvatar);

    // ---- Determine initial loading strategy ----
    const rect = el.getBoundingClientRect();
    const isInViewport =
      rect.top < window.innerHeight + 100 &&
      rect.bottom > -100 &&
      rect.left < window.innerWidth &&
      rect.right > 0;

    // isFirstScreen prop OR element already in viewport → load immediately
    if (isFirstScreen || isInViewport) {
      loadImageImmediately(el, src, isAvatar);
      return;
    }

    // Otherwise: use IntersectionObserver + queue
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          loadViaQueue(el, src, isAvatar);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // preload 100px before visible
        threshold: 0.1,      // trigger when at least 10% visible
      },
    );

    observer.observe(el);
    observerRef.current = observer;

    // ---- 1-second backup check ----
    const backupTimer = setTimeout(() => {
      // If still not loaded and element is in viewport, force load
      if (
        !el.src ||
        el.src.startsWith('data:') ||
        el.style.opacity === '0'
      ) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 50 && r.bottom > -50) {
          loadImageImmediately(el, src, isAvatar);
        }
      }
    }, 1000);

    // ---- Cleanup ----
    return () => {
      clearTimeout(backupTimer);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      stuckItemManager.removeItem(el);
    };
  }, [src, isAvatar, isFirstScreen, loadViaQueue]);

  // ---- Attach onLoad/onError handlers ----
  const handleLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);

  // Build class names
  const classNames = [
    'lazy-image',
    isAvatar ? 'lazy-avatar' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <img
      ref={imgRef}
      src={isAvatar ? DEFAULT_AVATAR : DEFAULT_PLACEHOLDER}
      alt={alt}
      className={classNames}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

export default LazyImage;
