import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, password, email || undefined);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20 relative overflow-hidden">
      {/* Background elements */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-orange-500">Porn</span>
            <span className="text-white">Guesser</span>
          </h1>
          <p className="text-gray-400">
            {isRegisterMode ? "Join the Game" : "Welcome Back"}
          </p>
        </div>

        {/* Login/Register Form */}
        <motion.form
          onSubmit={isRegisterMode ? handleRegister : handleLogin}
          className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-6 space-y-4"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded"
            >
              {error}
            </motion.div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              required
              minLength={3}
            />
          </div>

          {/* Email (Register only) */}
          {isRegisterMode && (
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              required
              minLength={6}
            />
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || isLoggingIn || isRegistering}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-black font-bold py-2 rounded transition-colors"
          >
            {loading || isLoggingIn || isRegistering
              ? isRegisterMode
                ? "Creating Account..."
                : "Logging In..."
              : isRegisterMode
              ? "Create Account"
              : "Login"}
          </motion.button>

          {/* Toggle Mode */}
          <div className="text-center text-sm text-gray-400">
            {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError("");
                setUsername("");
                setPassword("");
                setEmail("");
              }}
              className="text-orange-500 hover:text-orange-400 cursor-pointer"
            >
              {isRegisterMode ? "Login" : "Register"}
            </button>
          </div>
        </motion.form>

        {/* Demo Credentials Info */}
        {!isRegisterMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded p-3 text-sm text-gray-300"
          >
            <p className="font-semibold text-blue-400 mb-1">Demo Account:</p>
            <p>Username: <span className="text-orange-400">demo</span></p>
            <p>Password: <span className="text-orange-400">demo123</span></p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
