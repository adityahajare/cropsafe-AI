import { Link } from "react-router-dom";
import { Leaf, Satellite, Shield, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">CropSafe</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Empowering Indian farmers with satellite-powered, AI-driven crop insurance. No paperwork. No delays. Just fair, transparent payouts.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Satellite className="w-3.5 h-3.5" />
                Sentinel-2 Powered
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Shield className="w-3.5 h-3.5" />
                PMFBY Compliant
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="font-semibold text-white text-sm mb-4">Platform</p>
            <ul className="space-y-2.5">
              {[
                { label: "Dashboard", path: "/dashboard" },
                { label: "Crop Monitoring", path: "/crop-monitoring" },
                { label: "Weather", path: "/weather" },
                { label: "Claims", path: "/claims" },
                { label: "Register Farm", path: "/register" },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-white/50 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-semibold text-white text-sm mb-4">Support</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/50">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                1800-XXX-XXXX (Toll Free)
              </li>
              <li className="flex items-center gap-2 text-sm text-white/50">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                support@cropsafe.in
              </li>
            </ul>
            <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">Avg. Response Time</p>
              <p className="text-sm font-bold text-emerald-400">Under 2 hours</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-white/30">© 2026 CropSafe. All rights reserved.</p>
          <p className="text-xs text-white/30">Built for Indian Farmers · Powered by Sentinel-2 · NDVI Analysis</p>
        </div>
      </div>
    </footer>
  );
}
