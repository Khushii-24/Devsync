import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootErrorBoundary from "./components/common/RootErrorBoundary";
import App from "./App";
import "./index.css";

// import "./testWS";
// QueryClient holds the cache for all server state.
// staleTime: 1min means data stays "fresh" for 1 minute before React Query
// considers it stale and refetches in the background.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1, // retry failed requests once before showing an error
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);