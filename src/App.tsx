import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { FilterProvider } from "./context/FilterContext";
import { queryClient } from "./lib/queryClient";
import Routers from "./router";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FilterProvider>
            <Routers />
            <Toaster
              theme="dark"
              position="top-right"
              toastOptions={{
                style: {
                  background: "oklch(22% 0.03 254)",
                  border: "1px solid oklch(30% 0.03 252 / 0.7)",
                  color: "oklch(96% 0.01 240)",
                },
              }}
            />
          </FilterProvider>
        </AuthProvider>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
