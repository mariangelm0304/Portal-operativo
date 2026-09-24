import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { FiltrosAdminProvider } from "./context/FiltrosAdminContext";
import "./styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FiltrosAdminProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FiltrosAdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
