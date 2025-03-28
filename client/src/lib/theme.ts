// Common colors used throughout the app
export const theme = {
  colors: {
    primary: '#6B4EFF',
    secondary: '#2AC76A',
    accent: '#FFCD1F',
    danger: '#FF5A5A',
    dark: '#333333',
    light: '#F9F9F9'
  },
  gradients: {
    primaryGradient: 'linear-gradient(90deg, #6B4EFF, #9B7DFF)',
    accentGradient: 'linear-gradient(135deg, #FFCD1F, #FF9A3F)',
    dangerGradient: 'linear-gradient(90deg, #FF5A5A, #FF8080)'
  }
};

export const tailwindClasses = {
  // Button variants
  arcadeButton: "arcade-btn font-bold py-3 px-4 rounded-xl transition-all",
  primaryButton: "bg-[#6B4EFF] hover:bg-opacity-90 text-white",
  secondaryButton: "bg-[#2AC76A] hover:bg-opacity-90 text-white",
  dangerButton: "bg-[#FF5A5A] hover:bg-opacity-90 text-white",
  outlineButton: "bg-white border-2 border-gray-200 hover:border-[#6B4EFF] text-[#333333]",
  
  // Card and container styles
  card: "bg-white rounded-3xl shadow-md p-6",
  pageContainer: "flex-1 container mx-auto p-4",
  
  // Badge styles
  badge: "rounded-full px-3 py-1 text-sm font-bold",
  primaryBadge: "bg-[#6B4EFF] bg-opacity-10 text-[#6B4EFF]",
  accentBadge: "bg-[#FFCD1F] text-yellow-800",
  
  // Avatar styles
  avatar: "rounded-full flex items-center justify-center",
  primaryAvatar: "bg-[#6B4EFF] text-white",
  
  // Progress bar
  progressBar: "progress-bar",
  progressValue: "progress-value"
};
