import { useEffect } from "react";
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/store/theme";
import ProjectsDashboard from "@/features/dashboard/ProjectsDashboard";
import EditorPage from "@/features/editor/EditorPage";

const router = createHashRouter([
  { path: "/", element: <ProjectsDashboard /> },
  { path: "/project/:projectId", element: <EditorPage /> },
]);

export default function App() {
  const theme = useTheme((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </MotionConfig>
  );
}
