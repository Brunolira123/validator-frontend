import type { ReactNode } from 'react';

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
      {children}
    </div>
  );
}
