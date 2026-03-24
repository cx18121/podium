import type { CSSProperties } from 'react';

interface PrimaryButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: CSSProperties;
}

export function PrimaryButton({ onClick, children, size = 'md', type = 'button', disabled, style }: PrimaryButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-primary-sm' : size === 'lg' ? 'btn-primary-lg' : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`btn-primary ${sizeClass} focus-ring`.trim()}
    >
      {children}
    </button>
  );
}
