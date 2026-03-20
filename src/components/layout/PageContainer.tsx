import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, scrollable = true }) => {
  return (
    <main className={`flex-1 p-5 flex flex-col w-full ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {children}
    </main>
  );
};
