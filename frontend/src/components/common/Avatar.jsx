import React from 'react';

// Generates a deterministic background color based on string hash
function stringToHslColor(str, s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function Avatar({ name = 'User', userId = '', size = 'md', className = '' }) {
  const initials = (name || 'U').trim().slice(0, 2).toUpperCase();
  const bgHsl = stringToHslColor(userId || name);

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base font-extrabold',
  }[size] || 'w-8 h-8 text-xs';

  return (
    <div
      style={{ backgroundColor: bgHsl }}
      className={`rounded-full text-white font-bold flex items-center justify-center shrink-0 shadow-xs select-none border border-white/20 ${sizeClasses} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}
