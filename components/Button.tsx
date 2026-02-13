import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'clock-in' | 'clock-out';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Base styles: Bold, uppercase, tracking-widest for readability
  const baseStyles = "font-sans font-black tracking-widest transition-all duration-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg";
  
  const variants = {
    primary: "bg-levant-gold text-levant-black border-2 border-levant-gold hover:bg-white hover:text-black hover:border-white",
    secondary: "bg-neutral-800 text-white border-2 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-700",
    danger: "bg-red-900/20 text-red-500 border-2 border-red-900/50 hover:bg-red-900 hover:text-white hover:border-red-500",
    outline: "bg-transparent border-2 border-levant-gold text-levant-gold hover:bg-levant-gold hover:text-black",
    
    // Special massive buttons for clocking
    'clock-in': "bg-gradient-to-br from-levant-gold to-yellow-600 text-black border-none shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:brightness-110",
    'clock-out': "bg-neutral-900 text-neutral-400 border-2 border-neutral-700 hover:border-red-500 hover:text-red-500 hover:bg-neutral-800"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs rounded-lg",
    md: "px-6 py-3 text-sm rounded-xl",
    lg: "px-8 py-4 text-base rounded-2xl",
    xl: "px-10 py-6 text-xl rounded-2xl w-full" // Massive for touch targets
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
