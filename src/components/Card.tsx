import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}
    >
      {children}
    </div>
  );
}