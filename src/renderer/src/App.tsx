import { useEffect, useState } from "react";
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/store/theme";
import { initEditorStore } from "@/store/editorStore";
import ProjectsDashboard from "@/features/dashboard/ProjectsDashboard";
import EditorPage from "@/features/editor/EditorPage";

const router = createHashRouter([
  { path: "/", element: <ProjectsDashboard /> },
  { path: "/project/:projectId/:view?", element: <EditorPage /> },
]);

export default function App() {
  const theme = useTheme((s) => s.theme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Hydrate projects from the local database before rendering the app.
  useEffect(() => {
    void initEditorStore().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-background text-muted-foreground">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </MotionConfig>
  );
}
