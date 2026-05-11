import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { RotateCw } from 'lucide-react'

interface FloatingBtnProps {
  onRefresh: () => void
}

export default function FloatingBtn({ onRefresh }: FloatingBtnProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const location = useLocation()

  const handleClick = () => {
    setIsSpinning(true)
    onRefresh()
    setTimeout(() => setIsSpinning(false), 700)
  }

  // Reset spinning state on route change
  useEffect(() => {
    setIsSpinning(false)
  }, [location.pathname])

  return (
    <>
      <style>{`
        .floating-btn {
          position: fixed;
          bottom: 80px;
          right: 24px;
          z-index: 50;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          box-shadow: 0 2px 12px var(--shadow-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-color-secondary);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .floating-btn:hover {
          color: var(--text-color-primary);
          box-shadow: 0 4px 16px var(--shadow-color);
          transform: scale(1.05);
        }
        .floating-btn:active {
          transform: scale(0.95);
        }
        .floating-btn .spin {
          animation: spin 0.7s ease-in-out;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <button
        className="floating-btn"
        onClick={handleClick}
        title="刷新"
        aria-label="刷新内容"
      >
        <RotateCw size={20} className={isSpinning ? 'spin' : ''} />
      </button>
    </>
  )
}
