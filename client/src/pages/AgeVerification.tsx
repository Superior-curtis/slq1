import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function AgeVerification() {
  const [, navigate] = useLocation();
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    // Set age verification in localStorage
    localStorage.setItem("ageVerified", "true");
    localStorage.setItem("ageVerificationTime", new Date().getTime().toString());
    // notify other parts of the app (Router listens for this)
    try {
      window.dispatchEvent(new Event("ageVerified"));
    } catch {}
    setVerified(true);
    navigate("/");
  };

  const handleReject = () => {
    // Redirect to external site
    window.location.href = "https://www.google.com";
  };

  if (verified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-2 border-orange-500 rounded-2xl p-8 text-center space-y-6">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-orange-500">Age</span>
              <span className="text-white"> Verification</span>
            </h1>
            <p className="text-gray-400">年齡驗證</p>
          </motion.div>

          {/* Warning Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-6xl"
          >
            ⚠️
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <p className="text-lg font-semibold">
              This website contains adult content
            </p>
            <p className="text-gray-400 text-sm">
              此網站包含成人內容。您必須年滿 18 歲才能進入。
            </p>
            <p className="text-gray-400 text-sm">
              By clicking "I am 18 or older", you confirm that you are at least 18 years old and agree to our Terms of Service.
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3 pt-4"
          >
            <Button
              onClick={handleVerify}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              I am 18 or older
            </Button>

            <Button
              onClick={handleReject}
              variant="outline"
              className="w-full border-orange-500/50 text-orange-500 hover:bg-orange-500/10 font-bold py-3 rounded-lg"
            >
              I am under 18 (Leave)
            </Button>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-gray-500 pt-4 border-t border-orange-500/20"
          >
            By entering this site, you agree to our Privacy Policy and Terms of Service.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
