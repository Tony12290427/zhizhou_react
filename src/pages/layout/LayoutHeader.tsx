import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Menu, Info, Keyboard, ShieldCheck, Sun, Moon, Settings, LogOut, LogIn } from 'lucide-react'
import SearchDropdown from './SearchDropdown'
import { useSearchHistoryStore } from '@/stores/search-history-store'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { useAboutStore } from '@/stores/about-store'
import { useAccountSecurityStore } from '@/stores/account-security-store'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { ColorPickerMenuItem } from '@/components/menu/ColorPickerMenuItem'

const logoUrl = '/zhizhou.svg'

export default function LayoutHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchHistoryStore = useSearchHistoryStore()

  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 695)
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 960)

  const [showSearch, setShowSearch] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [isSearchEditMode, setIsSearchEditMode] = useState(false)

  const displaySearch = isLargeScreen || showSearch

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 695)
      setShowSidebar(window.innerWidth > 960)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Watch route changes for search page entry/exit
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const newPath = location.pathname
    const wasInSearchPage = prevPathRef.current?.startsWith('/search_result')
    const isInSearchPage = newPath.startsWith('/search_result')

    if (isInSearchPage && !wasInSearchPage) {
      const keyword = searchParams.get('keyword') || ''
      if (keyword && isLargeScreen) {
        setSearchText(keyword)
      }
    } else if (!isInSearchPage && wasInSearchPage) {
      if (isLargeScreen) {
        setSearchText('')
      }
    }
    prevPathRef.current = newPath
  }, [location.pathname, searchParams, isLargeScreen])

  // Watch keyword changes while on search page
  useEffect(() => {
    if (location.pathname.startsWith('/search_result') && isLargeScreen) {
      setSearchText(searchParams.get('keyword') || '')
    }
  }, [searchParams, location.pathname, isLargeScreen])

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSearchEditMode) return
      const target = e.target as HTMLElement
      const searchContainer = target.closest('.search-bar-container')
      if (!searchContainer && showSearchDropdown) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showSearchDropdown, isSearchEditMode])

  const handleSearchFocus = useCallback(() => {
    setShowSearchDropdown(true)
  }, [])

  const handleSearchBlur = useCallback(() => {
    if (isSearchEditMode) return
    setTimeout(() => {
      if (!isSearchEditMode) {
        setShowSearchDropdown(false)
      }
    }, 200)
  }, [isSearchEditMode])

  const openSearch = useCallback(() => {
    setShowSearch(true)
  }, [])

  const closeSearch = useCallback(() => {
    setShowSearch(false)
    setShowSearchDropdown(false)
    setSearchText('')
  }, [])

  const clearInput = useCallback(() => {
    setSearchText('')
    setShowSearchDropdown(true)
    // Focus the input
    setTimeout(() => {
      const input = document.querySelector('.search-bar input') as HTMLInputElement
      if (input) input.focus()
    }, 0)
  }, [])

  const handleSearch = useCallback(
    (keyword: string | null = null) => {
      const searchKeyword = (typeof keyword === 'string' ? keyword : searchText).trim()

      navigate({
        pathname: '/search_result/all',
        search: searchKeyword ? `?keyword=${encodeURIComponent(searchKeyword)}` : '',
      })

      if (searchKeyword) {
        searchHistoryStore.addSearchRecord(searchKeyword)
        setSearchText(searchKeyword)
      }

      setShowSearchDropdown(false)

      if (!isLargeScreen) {
        closeSearch()
      }
    },
    [searchText, navigate, searchHistoryStore, isLargeScreen, closeSearch]
  )

  const handleDropdownSearch = useCallback(
    (keyword: string) => {
      handleSearch(keyword)
    },
    [handleSearch]
  )

  const handleEditModeChange = useCallback((isEditMode: boolean) => {
    setIsSearchEditMode(isEditMode)
  }, [])

  const handleFocusSearch = useCallback(() => {
    setTimeout(() => {
      const input = document.querySelector('.search-bar input') as HTMLInputElement
      if (input) input.focus()
    }, 0)
  }, [])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  return (
    <header>
      <div className="header-container">
        {displaySearch ? (
          <>
            {isLargeScreen && (
              <div className="logo" onClick={() => navigate('/')}>
                <img src={logoUrl} alt="知舟" />
              </div>
            )}
            <div className={`search-row${isLargeScreen ? ' large-screen' : ' small-screen'}`}>
              <div className="search-bar-container">
                <div className="search-bar">
                  <input
                    value={searchText}
                    type="text"
                    placeholder="搜索知舟"
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                  />
                  <div className="input-controls">
                    <div
                      className="clear-btn"
                      style={{ visibility: searchText ? 'visible' : 'hidden' }}
                      onClick={clearInput}
                    >
                      <X size={20} className="btn-icon" />
                    </div>
                    <div className="search-btn" onClick={() => handleSearch()}>
                      <Search size={20} className="btn-icon" />
                    </div>
                  </div>
                </div>
                <SearchDropdown
                  visible={showSearchDropdown}
                  searchText={searchText}
                  onSearch={handleDropdownSearch}
                  onEditModeChange={handleEditModeChange}
                  onFocusSearch={handleFocusSearch}
                  onClose={() => setShowSearchDropdown(false)}
                />
              </div>
              {!isLargeScreen && (
                <div className="cancel-btn" onClick={closeSearch}>
                  取消
                </div>
              )}
            </div>
            {isLargeScreen && !showSidebar && (
              <div className="header-right">
                <DropdownMenuBtn />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="logo" onClick={() => navigate('/')}>
              <img src={logoUrl} alt="知舟" />
            </div>
            <div className="header-right">
              <div onClick={openSearch} className="circle-btn">
                <Search size={20} className="btn-icon" />
              </div>
              {!showSidebar && <DropdownMenuBtn />}
            </div>
          </>
        )}
      </div>

      <style>{`
        header {
          height: 72px;
          background: var(--bg-color-primary);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          width: 100%;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }

        .header-container {
          max-width: 1500px;
          margin: 0 auto;
          height: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          width: 100%;
        }

        .logo {
          width: 68.32px;
          height: 32px;
          background: var(--primary-color);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .logo img {
          width: 50px;
          height: 24px;
          filter: brightness(0) invert(1);
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .circle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: transparent;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          border: none;
        }

        .circle-btn:hover {
          background: var(--bg-color-secondary);
        }

        .btn-icon {
          color: var(--text-color-secondary);
        }

        .btn-icon:hover,
        .circle-btn:hover .btn-icon {
          color: var(--text-color-primary);
        }

        .search-row {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          height: 40px;
        }

        .search-row.large-screen {
          width: 465px;
          max-width: 500px;
          margin: 0 auto;
          flex-grow: 0;
        }

        @media (min-width: 696px) {
          .header-container {
            justify-content: space-between;
            position: relative;
          }

          .header-right {
            margin-left: auto;
          }

          .search-row.large-screen {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1;
          }
        }

        .search-bar-container {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-color-secondary);
          border-radius: 999px;
          height: 40px;
          padding: 0 15px;
          position: relative;
          box-sizing: border-box;
          transition: background-color 0.2s ease;
        }

        .search-bar input {
          border: none;
          outline: none;
          background: transparent;
          flex: 1 1 0%;
          font-size: 16px;
          min-width: 0;
          color: var(--text-color-primary);
          caret-color: var(--primary-color);
          padding-right: 80px;
        }

        .search-bar input::placeholder {
          color: var(--text-color-quaternary);
        }

        .input-controls {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          width: 60px;
        }

        .clear-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          visibility: hidden;
          margin-right: 8px;
        }

        .search-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: auto;
        }

        .search-row .cancel-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: transparent;
          text-align: center;
          width: 64px;
          height: 40px;
          font-size: 16px;
          color: var(--text-color-secondary);
          margin-left: 12px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .search-row .cancel-btn:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }

        .header-dropdown {
          right: 0;
          left: auto;
        }
      `}</style>
    </header>
  )
}

/** Header dropdown menu - matches Vue CommonMenu */
function DropdownMenuBtn() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const userStore = useUserStore()
  const authStore = useAuthStore()
  const themeStore = useThemeStore()
  const aboutStore = useAboutStore()
  const accountSecurityStore = useAccountSecurityStore()
  const keyboardShortcutsStore = useKeyboardShortcutsStore()

  const isLoggedIn = userStore.isLoggedIn()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await userStore.logout()
      window.location.reload()
    } catch (error) {
      console.error('退出登录失败:', error)
    }
    setOpen(false)
  }, [userStore])

  const handleMenuAction = useCallback((action: string) => {
    setOpen(false)
    if (action === 'about') {
      aboutStore.openAboutModal()
    } else if (action === 'keyboardShortcuts') {
      keyboardShortcutsStore.openKeyboardShortcutsModal()
    } else if (action === 'accountSecurity') {
      accountSecurityStore.openAccountSecurityModal()
    } else if (action === 'logout') {
      handleLogout()
    } else if (action === 'login') {
      authStore.openLoginModal()
    }
  }, [aboutStore, keyboardShortcutsStore, accountSecurityStore, authStore, handleLogout])

  return (
    <div className="dropdown-container" ref={ref} style={{ position: 'relative' }}>
      <div className="circle-btn" onClick={() => setOpen(!open)}>
        <Menu size={20} className="btn-icon" />
      </div>
      {open && (
        <div className="header-dropdown-menu">
          <div className="dropdown-item" onClick={() => handleMenuAction('about')}>
            <Info size={18} style={{ marginRight: 12 }} />
            关于知舟
          </div>
          <div className="dropdown-item" onClick={() => handleMenuAction('keyboardShortcuts')}>
            <Keyboard size={18} style={{ marginRight: 12 }} />
            键盘快捷键
          </div>
          {isLoggedIn && (
            <div className="dropdown-item" onClick={() => handleMenuAction('accountSecurity')}>
              <ShieldCheck size={18} style={{ marginRight: 12 }} />
              账号与安全
            </div>
          )}
          <div className="dropdown-divider-header" />
          <ColorPickerMenuItem />
          <div className="theme-switcher-header">
            <span className="theme-label-header">深色模式</span>
            <div className="theme-toggle-track-header">
              <div
                className="theme-toggle-indicator-header"
                style={{
                  transform: `translateX(${themeStore.currentTheme === 'dark' ? 28 : themeStore.currentTheme === 'light' ? 0 : 56}px)`,
                }}
              />
              <button
                className={`theme-toggle-option-header${themeStore.currentTheme === 'light' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); themeStore.setTheme('light') }}
                title="浅色模式"
              >
                <Sun size={14} />
              </button>
              <button
                className={`theme-toggle-option-header${themeStore.currentTheme === 'dark' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); themeStore.setTheme('dark') }}
                title="深色模式"
              >
                <Moon size={14} />
              </button>
              <button
                className={`theme-toggle-option-header${themeStore.currentTheme === 'system' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); themeStore.setTheme('system') }}
                title="跟随系统"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
          <div className="dropdown-divider-header" />
          {isLoggedIn ? (
            <div className="dropdown-item" onClick={() => handleMenuAction('logout')}>
              <LogOut size={18} style={{ marginRight: 12 }} />
              退出登录
            </div>
          ) : (
            <div className="dropdown-item" onClick={() => handleMenuAction('login')}>
              <LogIn size={18} style={{ marginRight: 12 }} />
              登录/注册
            </div>
          )}
        </div>
      )}

      <style>{`
        .dropdown-container {
          position: relative;
        }
        .circle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: transparent;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          border: none;
        }
        .circle-btn:hover {
          background: var(--bg-color-secondary);
        }
        .btn-icon {
          color: var(--text-color-secondary);
        }
        .circle-btn:hover .btn-icon {
          color: var(--text-color-primary);
        }
        .header-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          min-width: 200px;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--shadow-color);
          padding: 2px 0;
          z-index: 1001;
          animation: dropdownDown 0.2s ease;
        }
        @keyframes dropdownDown {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .dropdown-item {
          cursor: pointer;
          transition: background-color 0.2s ease;
          border-radius: 8px;
          margin: 2px 4px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: var(--text-color-primary);
          font-size: 16px;
          line-height: 1;
        }
        .dropdown-item:hover {
          background: var(--bg-color-secondary);
        }
        .dropdown-divider-header {
          height: 1px;
          background: var(--border-color-primary);
          margin: 4px 16px;
        }
        .theme-switcher-header {
          padding: 8px 4px;
          margin: 4px;
          border-radius: 999px;
        }
        .theme-label-header {
          font-size: 16px;
          color: var(--text-color-primary);
          font-weight: 400;
          padding: 4px 12px;
          display: block;
          margin-bottom: 8px;
        }
        .theme-toggle-track-header {
          position: relative;
          display: flex;
          background: var(--bg-color-secondary);
          border-radius: 16px;
          padding: 2px;
          border: 1px solid var(--border-color-primary);
          margin: 0 12px;
          width: fit-content;
        }
        .theme-toggle-indicator-header {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 26px;
          height: 26px;
          background: var(--bg-color-primary);
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          z-index: 1;
        }
        .theme-toggle-option-header {
          position: relative;
          width: 28px;
          height: 28px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
          color: var(--text-color-tertiary);
        }
        .theme-toggle-option-header:hover {
          color: var(--text-color-secondary);
        }
        .theme-toggle-option-header.active {
          color: var(--text-color-primary);
        }
      `}</style>
    </div>
  )
}
