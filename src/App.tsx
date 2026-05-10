import { Outlet } from 'react-router-dom'
import { useSystemTheme } from '@/hooks/use-system-theme'

export default function App() {
  useSystemTheme()
  return <Outlet />
}
