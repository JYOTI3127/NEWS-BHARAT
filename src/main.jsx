import { createRoot, hydrateRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { HelmetProvider } from "react-helmet-async";
import { fetchArticles, fetchCategories } from './lib/api.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  }
})

void queryClient.prefetchQuery({
  queryKey: ['articles'],
  queryFn: fetchArticles,
});

void queryClient.prefetchQuery({
  queryKey: ['categories'],
  queryFn: fetchCategories,
});

const rootElement = document.getElementById('root');

const app = (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </HelmetProvider>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
