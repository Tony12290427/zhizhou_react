import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import clsx from 'clsx'

export interface Tab {
  id: string | number
  label: string
}

interface TabContainerProps {
  tabs: Tab[]
  activeTab?: string | number
  enableDrag?: boolean
  onChange?: (tab: Tab) => void
  className?: string
}

export function TabContainer({
  tabs,
  activeTab,
  enableDrag = false,
  onChange,
  className,
}: TabContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabItemRefs = useRef<(HTMLDivElement | null)[]>([])

  const [activeId, setActiveId] = useState<string | number>(
    activeTab ?? (tabs.length > 0 ? tabs[0].id : '')
  )
  const [sliderLeft, setSliderLeft] = useState(0)
  const [sliderWidth, setSliderWidth] = useState(0)

  const [isDown, setIsDown] = useState(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  const updateSlider = useCallback(() => {
    requestAnimationFrame(() => {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeId)
      if (activeIndex === -1) return
      const tabEl = tabItemRefs.current[activeIndex]
      const containerEl = containerRef.current
      if (!tabEl || !containerEl) return

      const tabRect = tabEl.getBoundingClientRect()
      const containerRect = containerEl.getBoundingClientRect()

      if (containerRect.width === 0 || tabRect.width === 0) {
        setTimeout(updateSlider, 50)
        return
      }

      setSliderLeft(tabRect.left - containerRect.left + containerEl.scrollLeft)
      setSliderWidth(tabRect.width)
    })
  }, [activeId, tabs])

  // Sync activeTab prop
  useEffect(() => {
    if (activeTab !== undefined) {
      setActiveId(activeTab)
    }
  }, [activeTab])

  // Update slider when activeId or tabs change
  useEffect(() => {
    updateSlider()
  }, [activeId, tabs, updateSlider])

  // Resize and scroll listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onResize = () => updateSlider()
    const onScroll = () => updateSlider()

    window.addEventListener('resize', onResize)
    container.addEventListener('scroll', onScroll)

    // IntersectionObserver: update when container becomes visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(updateSlider)
          }
        })
      }
    )
    observer.observe(container)

    return () => {
      window.removeEventListener('resize', onResize)
      container.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [updateSlider])

  const handleTabClick = useCallback(
    (item: Tab) => {
      if (activeId === item.id) return
      setActiveId(item.id)
      onChange?.(item)
    },
    [activeId, onChange]
  )

  // Drag handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enableDrag) return
      const container = containerRef.current
      if (!container) return
      setIsDown(true)
      dragStartX.current = e.pageX - container.offsetLeft
      dragScrollLeft.current = container.scrollLeft
      container.classList.add('dragging')
    },
    [enableDrag]
  )

  const onMouseLeave = useCallback(() => {
    if (!enableDrag) return
    setIsDown(false)
    containerRef.current?.classList.remove('dragging')
  }, [enableDrag])

  const onMouseUp = useCallback(() => {
    if (!enableDrag) return
    setIsDown(false)
    containerRef.current?.classList.remove('dragging')
  }, [enableDrag])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enableDrag || !isDown) return
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      const x = e.pageX - container.offsetLeft
      const walk = x - dragStartX.current
      container.scrollLeft = dragScrollLeft.current - walk
    },
    [enableDrag, isDown]
  )

  const sliderStyle = useMemo(
    () => ({
      left: `${sliderLeft}px`,
      width: `${sliderWidth}px`,
    }),
    [sliderLeft, sliderWidth]
  )

  return (
    <div
      ref={containerRef}
      className={clsx('tab-container', className)}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
    >
      {tabs.map((item, index) => (
        <div
          key={item.id}
          id={String(item.id)}
          ref={(el) => { tabItemRefs.current[index] = el }}
          className={clsx('tab-item', { active: activeId === item.id })}
          onClick={() => handleTabClick(item)}
        >
          {item.label}
        </div>
      ))}
      <div className="tab-slider" style={sliderStyle} />
      <style>{`
        .tab-container {
          position: relative;
          height: 85px;
          background: var(--bg-color-primary);
          display: flex;
          align-items: center;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          padding: 0 12px;
          box-sizing: border-box;
          width: 100%;
          max-width: 100vw;
          margin-left: 12px;
          transition: background-color 0.3s ease;
        }
        .tab-container::-webkit-scrollbar {
          display: none;
        }
        .tab-container.dragging {
          cursor: grabbing;
        }
        .tab-item {
          height: 40px;
          font-size: 16px;
          color: var(--text-color-secondary);
          cursor: pointer;
          background: transparent;
          border-radius: 999px;
          text-align: center;
          line-height: 40px;
          display: inline-block;
          flex-shrink: 0;
          user-select: none;
          padding: 0 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
          position: relative;
          z-index: 2;
        }
        .tab-item:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }
        @media (hover: none) {
          .tab-item:hover {
            background: transparent;
            color: var(--text-color-secondary);
          }
          .tab-item.active:hover {
            color: var(--text-color-primary);
          }
        }
        .tab-item.active {
          color: var(--text-color-primary);
          font-weight: bold;
          background: transparent;
          transition: color 0.3s ease;
        }
        .tab-slider {
          position: absolute;
          height: 40px;
          border-radius: 20px;
          background: var(--bg-color-secondary);
          transition: left 0.25s ease-out, width 0.25s ease-out, background-color 0.3s ease;
          z-index: 1;
          bottom: 22.5px;
        }
      `}</style>
    </div>
  )
}
