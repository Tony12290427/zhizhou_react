import { useCallback } from 'react'
import EmojiPickerReact, {
  type EmojiClickData,
  type EmojiStyle,
  type Theme,
  type CategoriesConfig,
} from 'emoji-picker-react'
import { useThemeStore } from '@/stores/theme-store'

interface EmojiPickerProps {
  onSelect: (emoji: EmojiClickData) => void
  className?: string
}

const categoriesConfig: CategoriesConfig = [
  { category: 'smileys_people', name: '笑脸和人物' },
  { category: 'animals_nature', name: '动物和自然' },
  { category: 'food_drink', name: '食物和饮料' },
  { category: 'activities', name: '活动' },
  { category: 'travel_places', name: '旅行和地点' },
  { category: 'objects', name: '物品' },
  { category: 'symbols', name: '符号' },
  { category: 'flags', name: '旗帜' },
]

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const actualTheme = useThemeStore((state) => state.actualTheme)
  const theme: Theme = actualTheme === 'dark' ? 'dark' : 'light'

  const handleSelect = useCallback(
    (emoji: EmojiClickData) => {
      onSelect(emoji)
    },
    [onSelect]
  )

  return (
    <div className={className}>
      <EmojiPickerReact
        onEmojiClick={handleSelect}
        autoFocusSearch={false}
        theme={theme}
        searchPlaceHolder="搜索表情"
        categories={categoriesConfig}
        emojiStyle={'native' as EmojiStyle}
        lazyLoadEmojis
      />
    </div>
  )
}
