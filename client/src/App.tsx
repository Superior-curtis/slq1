import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import GameRoom from "./pages/GameRoom";
import NotificationCenter from "./pages/NotificationCenter";
import AgeVerification from "./pages/AgeVerification";
import Lobby from "./pages/Lobby";
import Highlights from "./pages/Highlights";
import { useEffect, useState } from "react";

function Router() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check age verification on mount
    const verified = localStorage.getItem("ageVerified");
    if (verified) {
      setAgeVerified(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!ageVerified) {
    return <AgeVerification />;
  }

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/game/:mode"} component={GameRoom} />
      <Route path={"/game"} component={GameRoom} />
      <Route path={"/notifications"} component={NotificationCenter} />
      <Route path={"/lobby"} component={Lobby} />
      <Route path={"/highlights"} component={Highlights} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
