import { useInView } from 'react-intersection-observer'

export function useIntersectionObserver(options?: {
  rootMargin?: string
  threshold?: number
}) {
  const { ref, inView } = useInView({
    rootMargin: options?.rootMargin,
    threshold: options?.threshold,
    triggerOnce: true,
  })
  return { ref, isIntersecting: inView }
}
