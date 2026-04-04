import { UtensilsCrossed } from "lucide-react";

export function MenuComingSoon() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[120px]"
          style={{
            background: "radial-gradient(circle, #FFD700, transparent 70%)",
            animation: "comingSoonOrb1 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #4ade80, transparent 70%)",
            animation: "comingSoonOrb2 20s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes comingSoonOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.15); }
        }
        @keyframes comingSoonOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="mb-8 p-6 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))",
            border: "1px solid rgba(255,215,0,0.15)",
            animation: "iconPulse 4s ease-in-out infinite",
          }}
        >
          <UtensilsCrossed className="h-16 w-16 text-amber-400" />
        </div>

        <h1
          className="text-5xl font-serif font-bold text-amber-400 mb-4 tracking-wide"
          style={{
            textShadow: "0 0 60px rgba(255,215,0,0.3), 0 0 120px rgba(255,215,0,0.1)",
          }}
        >
          Menu Coming Soon
        </h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-amber-400/40" />
          <div className="w-2 h-2 rotate-45 bg-amber-400/40" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-amber-400/40" />
        </div>

        <p className="text-lg text-gray-400 tracking-wider" style={{ letterSpacing: "0.1em" }}>
          Our menu display is being prepared
        </p>
      </div>
    </div>
  );
}
