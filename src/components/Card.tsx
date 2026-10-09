import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** Card clicável: realce laranja e elevação no hover. */
  interativo?: boolean;
}

export function Card({ children, className = '', interativo = false, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-xl border border-neutral-200 shadow-card p-4 sm:p-5 transition-all duration-200 ${
        interativo ? 'cursor-pointer hover:border-vr-300 hover:shadow-card-hover active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}