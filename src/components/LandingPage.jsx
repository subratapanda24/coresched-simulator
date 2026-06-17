import React from "react";
import { Cpu, Sliders, Lock } from "lucide-react";
import CardSwap, { Card } from "./CardSwap";

// Button
const Button = React.forwardRef(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white/80 hover:text-white",
      gradient: "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icons
const ArrowRight = ({ className = "", size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const Menu = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const X = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Navigation
const Navigation = React.memo(({ onLaunch }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-white text-black flex items-center justify-center font-extrabold text-xs">
              CS
            </div>
            <span>CoreSched</span>
          </div>
          
          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button onClick={onLaunch} className="text-sm text-white/60 hover:text-white transition-colors">
              Simulation
            </button>
            <button onClick={onLaunch} className="text-sm text-white/60 hover:text-white transition-colors">
              Priority Heap
            </button>
            <button onClick={onLaunch} className="text-sm text-white/60 hover:text-white transition-colors">
              Deadlock Detector
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a href="https://github.com/subratapanda24/coresched-simulator.git" target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" size="sm">
                GitHub
              </Button>
            </a>
            <Button type="button" variant="default" size="sm" onClick={onLaunch}>
              Launch Simulator
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out]">
          <div className="px-6 py-4 flex flex-col gap-4">
            <button
              className="text-left text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunch();
              }}
            >
              Simulation
            </button>
            <button
              className="text-left text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunch();
              }}
            >
              Priority Heap
            </button>
            <button
              className="text-left text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunch();
              }}
            >
              Deadlock Detector
            </button>
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <Button type="button" variant="ghost" className="w-full" size="sm">
                  GitHub
                </Button>
              </a>
              <Button type="button" variant="default" className="w-full" size="sm" onClick={() => {
                setMobileMenuOpen(false);
                onLaunch();
              }}>
                Launch Simulator
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero
const Hero = React.memo(({ onLaunch }) => {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-between px-6 pt-28 pb-12"
      style={{
        animation: "fadeIn 0.6s ease-out"
      }}
    >
      {/* Glow backdrop */}
      <div
        className="absolute left-1/2 w-[90%] max-w-5xl pointer-events-none z-0"
        style={{
          top: "390px",
          transform: "translateX(-50%)"
        }}
        aria-hidden="true"
      >
        <img
          src="https://i.postimg.cc/Ss6yShGy/glows.png"
          alt=""
          className="w-full h-auto opacity-95"
          loading="eager"
        />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Top content */}
      <div className="flex flex-col items-center text-center z-10 w-full max-w-3xl">
        <aside className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full">
          <span className="text-xs text-center whitespace-nowrap" style={{ color: '#9ca3af' }}>
            Interactive OS simulator is live!
          </span>
          <button
            onClick={onLaunch}
            className="flex items-center gap-1 text-xs hover:text-white transition-all active:scale-95 whitespace-nowrap"
            style={{ color: '#9ca3af' }}
            aria-label="Launch simulator now"
          >
            Launch now
            <ArrowRight size={12} />
          </button>
        </aside>

        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-[1.2] mb-8"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.05em"
          }}
        >
          Understand CPU <br />Scheduling & Deadlocks
        </h1>

        <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-8 leading-relaxed" style={{ color: '#9ca3af' }}>
          An interactive visualization engine for multi-core scheduling, priority queues, <br />state rollback, and deadlock detection.
        </p>

        {/* Action button */}
        <div className="flex items-center gap-4 relative z-10 mb-4">
          <div className="relative">
            <Button
              type="button"
              variant="gradient"
              size="lg"
              className="rounded-lg flex items-center justify-center font-semibold"
              onClick={onLaunch}
              aria-label="Launch the simulator"
            >
              Launch Simulator
            </Button>
            {/* Button shade */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 w-36 h-5 bg-yellow-500/25 rounded-full blur-xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="w-full max-w-5xl relative pb-0 mt-0 mx-auto flex flex-col md:flex-row items-center justify-between gap-16 px-6 z-10">
        
        {/* Left details */}
        <div className="relative z-10 flex-1 text-left max-w-[390px] bg-zinc-950/45 p-5 rounded-xl border border-gray-800/80 backdrop-blur-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">System Capability</span>
          <h2 className="text-xl font-bold text-white mt-1 mb-2">Simulation Performance</h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-5">
            CoreSched manages task execution queues and resource blocks using high-performance OS algorithms. Step through ticks to observe context switching, scheduling bounds, and thread lifecycle loops.
          </p>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Min-Heap priority queue task ordering</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>DFS wait-for graph cycle deadlock checks</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Tick state undo/redo context restoration</span>
            </li>
          </ul>
        </div>

        {/* Right deck */}
        <div className="relative z-10 flex-1 w-full h-[290px] flex items-center justify-center md:justify-end select-none">
          <CardSwap
            width={400}
            height={260}
            cardDistance={30}
            verticalDistance={35}
            delay={4500}
            pauseOnHover={true}
          >
            {/* Card 1 */}
            <Card className="p-6 border border-gray-800 bg-zinc-950/95 flex flex-col justify-between h-full shadow-2xl rounded-xl">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={16} className="text-blue-400" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Core Feature</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Multi-Core Task Scheduler</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Distribute and process tasks dynamically across virtual CPU cores. Experience scheduling loops, context switching, and real-time load balancing.
                </p>
              </div>
              <div className="relative mt-3 h-24 rounded-lg overflow-hidden border border-gray-900">
                <img src="/coresched-hero-cpu.png" className="w-full h-full object-cover" alt="CPU Core Scheduling" />
              </div>
            </Card>

            {/* Card 2 */}
            <Card className="p-6 border border-gray-800 bg-zinc-950/95 flex flex-col justify-between h-full shadow-2xl rounded-xl">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sliders size={16} className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Data Structure</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Priority Min-Heap Queue</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Powered by a custom binary min-heap to handle tasks with high priority levels (lowest numeric values) arriving at staggering tick rates.
                </p>
              </div>
              <div className="relative mt-3 h-24 rounded-lg overflow-hidden border border-gray-900">
                <img src="/coresched-priority-heap.png" className="w-full h-full object-cover" alt="Priority Min-Heap Queue" />
              </div>
            </Card>

            {/* Card 3 */}
            <Card className="p-6 border border-gray-800 bg-zinc-950/95 flex flex-col justify-between h-full shadow-2xl rounded-xl">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={16} className="text-red-400" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">OS Concepts</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Deadlock Wait-For Analysis</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Detect circular dependencies between threads and locked memory or hardware resources using Depth First Search cycle finding.
                </p>
              </div>
              <div className="relative mt-3 h-24 rounded-lg overflow-hidden border border-gray-900">
                <img src="/coresched-deadlock-graph.png" className="w-full h-full object-cover" alt="Deadlock Wait-For Graph" />
              </div>
            </Card>
          </CardSwap>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Main page
export default function LandingPage({ onLaunch }) {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      <Navigation onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} />
    </main>
  );
}
