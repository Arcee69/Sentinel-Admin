import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { FilterProvider } from "./context/FilterContext";
import { RosterProvider } from "./context/RosterContext";
import { TasksProvider } from "./context/TasksContext";
import Routers from "./router";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <RosterProvider>
            <TasksProvider>
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
            </TasksProvider>
          </RosterProvider>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
