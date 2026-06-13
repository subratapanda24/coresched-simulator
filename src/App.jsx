import { Suspense, useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import CoreSchedDashboard from "@/components/CoreSchedDashboard";
import HyperText from "@/components/ui/hyper-text";
import Particles from "@/components/ui/particles";
import LandingPage from "@/components/LandingPage";

function Home() {
  const { theme } = useTheme();
  const [color, setColor] = useState("#ffffff");
  const navigate = useNavigate();

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  return (
    <div className="container max-w-full">
      <main className="flex flex-col justify-center sm:items-start p-5 grow-0">
        <div 
          className="w-full flex justify-center pb-5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
          title="Back to Landing Page"
        >
          <HyperText
            className="md:text-4xl text-center font-bold text-black dark:text-white"
            text="CoreSched Simulator"
          />
        </div>
        <Particles
          className="absolute inset-0"
          quantity={100}
          ease={80}
          color={color}
          refresh
        />
        <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading simulator...</div>}>
          <CoreSchedDashboard />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <ThemeProvider defaultTheme="dark" enableSystem>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage onLaunch={() => navigate("/simulator")} />} />
            <Route path="/simulator" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Toaster richColors position="top-center" />
      </ThemeProvider>
      <Footer />
    </div>
  );
}

