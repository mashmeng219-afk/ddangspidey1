import React, { createContext, useContext } from 'react';
import { useArchiveData } from '../hooks/useArchiveData';

type ArchiveContextValue = ReturnType<typeof useArchiveData>;

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const value = useArchiveData();
  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive(): ArchiveContextValue {
  const ctx = useContext(ArchiveContext);
  if (!ctx) {
    throw new Error('useArchive must be used inside ArchiveProvider');
  }
  return ctx;
}
