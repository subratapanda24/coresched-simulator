import { Suspense, useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import CoreSchedDashboard from "@/components/CoreSchedDashboard";
import HyperText from "@/components/ui/hyper-text";
import Particles from "@/components/ui/particles";

function Home() {
  const { theme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  return (
    <div className="container max-w-full">
      <main className="flex flex-col justify-center sm:items-start p-5 grow-0">
        <div className="w-full flex justify-center pb-5">
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
  return (
    <div className="flex flex-col min-h-screen">
      <ThemeProvider defaultTheme="dark" enableSystem>
        <main className="flex-grow">
          <Home />
        </main>
        <Toaster richColors position="top-center" />
      </ThemeProvider>
      <Footer />
    </div>
  );
}
