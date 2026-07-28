import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Frame } from "@/components/polaris/Frame";
import ProjectsPage from "./pages/ProjectsPage";
import NewProjectPage from "./pages/NewProjectPage";
import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* New Project PIF is a full-screen focused flow (no left nav) */}
          <Route path="/new" element={<NewProjectPage />} />

          {/* Everything else lives inside the Polaris admin Frame */}
          <Route
            path="*"
            element={
              <Frame>
                <Routes>
                  <Route path="/" element={<ProjectsPage />} />
                  <Route path="/submissions" element={<ComingSoon title="All Submissions" />} />
                  <Route path="/resources" element={<ComingSoon title="Templates & Guidelines" />} />
                  <Route path="/help" element={<ComingSoon title="Help center" />} />
                  <Route path="*" element={<ComingSoon title="Not found" />} />
                </Routes>
              </Frame>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
