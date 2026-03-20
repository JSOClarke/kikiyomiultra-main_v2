import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  className = '',
  style = {},
  disabled = false,
  title = '',
}) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`btn px-3.5 py-2 rounded text-[0.9rem] font-ui transition-colors duration-200
        ${isPrimary 
          ? 'bg-primary text-bg border-none font-bold' 
          : 'bg-surface text-text border border-border font-normal'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:brightness-110 active:scale-95'}
        ${className}`}
      disabled={disabled}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}
