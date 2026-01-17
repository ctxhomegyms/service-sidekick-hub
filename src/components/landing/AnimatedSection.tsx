import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

type AnimationType = 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale-up';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
}

const animationStyles: Record<AnimationType, { initial: string; visible: string }> = {
  'fade-up': {
    initial: 'opacity-0 translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'fade-in': {
    initial: 'opacity-0',
    visible: 'opacity-100',
  },
  'fade-left': {
    initial: 'opacity-0 -translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'fade-right': {
    initial: 'opacity-0 translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'scale-up': {
    initial: 'opacity-0 scale-95',
    visible: 'opacity-100 scale-100',
  },
};

export function AnimatedSection({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  const styles = animationStyles[animation];

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out',
        isVisible ? styles.visible : styles.initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
  staggerDelay?: number;
  animation?: AnimationType;
  isVisible?: boolean;
}

export function AnimatedItem({
  children,
  className,
  index = 0,
  staggerDelay = 100,
  animation = 'fade-up',
  isVisible = false,
}: AnimatedItemProps) {
  const styles = animationStyles[animation];

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? styles.visible : styles.initial,
        className
      )}
      style={{
        transitionDelay: `${index * staggerDelay}ms`,
      }}
    >
      {children}
    </div>
  );
}
