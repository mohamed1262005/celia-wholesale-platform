import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import App from './App.tsx';
import { queryClient, queryPersister, CACHEABLE_KEYS } from './lib/queryClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: 'celia-v1', // غيّر الرقم لو عدلت شكل البيانات وعاوز تمسح كاش كل الأجهزة
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' &&
            CACHEABLE_KEYS.includes(String(query.queryKey[0])),
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>
);