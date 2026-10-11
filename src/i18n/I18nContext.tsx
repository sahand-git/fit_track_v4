import React, { createContext, useContext } from 'react';
import { AppLanguage } from '../types';

const I18nContext = createContext<AppLanguage>('en');

export function I18nProvider({ language, children }: { language: AppLanguage; children: React.ReactNode }) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}

export function useLanguage(): AppLanguage {
  return useContext(I18nContext);
}
