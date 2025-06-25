import React from 'react'

interface LoadingSkeletonProps {
  variant?: 'possibility' | 'compact'
  className?: string
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'possibility',
  className = '',
}) => {
  if (variant === 'compact') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 flex items-center gap-3 min-h-[50px]">
          {/* Icon skeleton */}
          <div className="w-6 h-6 bg-[#2a2a2a] rounded-md flex-shrink-0"></div>

          {/* Model name skeleton */}
          <div className="w-20 h-3 bg-[#2a2a2a] rounded flex-shrink-0"></div>

          {/* Content skeleton */}
          <div className="flex-1 space-y-1">
            <div className="w-3/4 h-3 bg-[#2a2a2a] rounded"></div>
            <div className="w-1/2 h-3 bg-[#2a2a2a] rounded"></div>
          </div>

          {/* Badges skeleton */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="w-8 h-5 bg-[#2a2a2a] rounded"></div>
            <div className="w-8 h-5 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 min-h-[170px] flex flex-col gap-3">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Provider icon skeleton */}
            <div className="w-6 h-6 bg-[#2a2a2a] rounded-md flex-shrink-0"></div>

            {/* Model info skeleton */}
            <div className="flex flex-col gap-1">
              <div className="w-16 h-3 bg-[#2a2a2a] rounded"></div>
              <div className="w-12 h-2 bg-[#2a2a2a] rounded"></div>
            </div>
          </div>

          {/* Status skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#2a2a2a] rounded-full"></div>
            <div className="w-12 h-3 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="w-full h-3 bg-[#2a2a2a] rounded"></div>
          <div className="w-5/6 h-3 bg-[#2a2a2a] rounded"></div>
          <div className="w-4/6 h-3 bg-[#2a2a2a] rounded"></div>
          <div className="w-3/6 h-3 bg-[#2a2a2a] rounded"></div>
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Priority badge skeleton */}
            <div className="w-12 h-5 bg-[#2a2a2a] rounded"></div>

            {/* System instruction badge skeleton (sometimes) */}
            <div className="w-16 h-5 bg-[#2a2a2a] rounded opacity-60"></div>
          </div>

          <div className="flex items-center gap-2">
            {/* Temperature badge skeleton */}
            <div className="w-8 h-5 bg-[#2a2a2a] rounded"></div>

            {/* Probability badge skeleton */}
            <div className="w-8 h-5 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shimmer effect component for enhanced loading animation
export const ShimmerSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'possibility',
  className = '',
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <LoadingSkeleton variant={variant} />

      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
    </div>
  )
}

// Grid of loading skeletons for initial loading state
export const LoadingSkeletonGrid: React.FC<{
  count?: number
  variant?: 'possibility' | 'compact'
  useShimmer?: boolean
}> = ({ count = 6, variant = 'possibility', useShimmer = false }) => {
  const SkeletonComponent = useShimmer ? ShimmerSkeleton : LoadingSkeleton

  return (
    <div className="flex flex-col gap-2 max-w-[1200px] mx-auto">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonComponent key={index} variant={variant} />
      ))}
    </div>
  )
}

export default LoadingSkeleton
