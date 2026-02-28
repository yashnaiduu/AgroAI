"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, Activity, Dna, SlidersHorizontal, Map as MapIcon, Menu, X } from "lucide-react";

import ChatInterface from "@/components/ChatInterface";
import CropPredictor from "@/components/CropPredictor";
import FertilizerAdvisor from "@/components/FertilizerAdvisor";
import SettingsPanel from "@/components/SettingsPanel";

type TabId = "chat" | "crop" | "fertilizer" | "settings";

const navItems = [
  { id: "chat", label: "Assistant", mobileLabel: "Chat", icon: Hexagon },
  { id: "crop", label: "Crop Predictor", mobileLabel: "Crops", icon: Activity },
  { id: "fertilizer", label: "Fertilizer Advisor", mobileLabel: "Fertilizer", icon: Dna },
  { id: "settings", label: "Settings", mobileLabel: "Settings", icon: SlidersHorizontal },
] as const;

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-card border-r border-border">
        <div className="p-4 flex flex-col h-full">

          {/* Brand */}
          <button
            onClick={() => setActiveTab("chat")}
            className="flex items-center gap-5 px-2 py-4 mb-4 mt-1 hover:opacity-80 transition-opacity text-left"
          >
            <div className="relative flex-shrink-0">
              <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-white/50 dark:bg-black/20 shadow-sm backdrop-blur-xl">
                <Image src="/logo.png" alt="AgroAI Logo" width={60} height={60} className="w-[85%] h-[85%] object-contain drop-shadow-sm" priority />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-[22px] tracking-wide text-[#2dd482] leading-none mb-0.5">AgroAI</span>
              <span className="text-[9px] font-bold text-[#63e6a7] tracking-[0.22em] ml-0.5 uppercase leading-none">Smart Farming</span>
            </div>
          </button>

          {/* Primary nav */}
          <nav className="space-y-0.5 flex-1">
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <Icon strokeWidth={1.5} className={`w-4 h-4 ${isActive ? "text-green-500" : "text-muted-foreground"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Bottom nav */}
          <div className="mt-auto space-y-0.5 pt-4 border-t border-border">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors opacity-50 cursor-not-allowed">
              <MapIcon strokeWidth={1.5} className="w-4 h-4" />
              Field Map <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "settings" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <SlidersHorizontal strokeWidth={1.5} className={`w-4 h-4 ${activeTab === "settings" ? "text-green-500" : "text-muted-foreground"}`} />
              Settings
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border flex flex-col md:hidden shadow-2xl"
            >
              <div className="p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 mt-1">
                  <div className="flex items-center gap-4">
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <div className="relative w-9 h-9 flex items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white/50 dark:bg-black/20 shadow-sm backdrop-blur-xl">
                        <Image src="/logo.png" alt="AgroAI" width={40} height={40} className="w-[85%] h-[85%] object-contain drop-shadow-sm" priority />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="font-extrabold text-[19px] tracking-wide text-[#2dd482] leading-none mb-0.5">AgroAI</span>
                      <span className="text-[8px] font-bold text-[#63e6a7] tracking-[0.22em] ml-0.5 uppercase leading-none">Smart Farming</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-0.5 flex-1">
                  {navItems.slice(0, 3).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                      >
                        <Icon strokeWidth={1.5} className={`w-4 h-4 ${isActive ? "text-green-500" : "text-muted-foreground"}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto space-y-0.5 pt-4 border-t border-border">
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                    <MapIcon strokeWidth={1.5} className="w-4 h-4" />
                    Field Map <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "settings" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <SlidersHorizontal strokeWidth={1.5} className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-[100dvh] w-full min-w-0 relative">

        {/* Mobile Top Header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-semibold text-base">
            <Image src="/logo.png" alt="AgroAI" width={24} height={24} className="w-5 h-5 object-contain" priority />
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent font-bold">AgroAI</span>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-medium text-muted-foreground bg-muted border border-border px-2 py-1 rounded-full uppercase tracking-wide">
              {navItems.find(n => n.id === activeTab)?.mobileLabel}
            </span>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden pb-16 md:pb-0"
          >
            {activeTab === "chat" && <ChatInterface />}
            {activeTab === "crop" && (
              <div className="p-3 md:p-8 h-full overflow-y-auto w-full max-w-5xl mx-auto">
                <CropPredictor />
              </div>
            )}
            {activeTab === "fertilizer" && (
              <div className="p-3 md:p-8 h-full overflow-y-auto w-full max-w-5xl mx-auto">
                <FertilizerAdvisor />
              </div>
            )}
            {activeTab === "settings" && (
              <div className="p-3 md:p-8 h-full overflow-y-auto w-full max-w-3xl mx-auto">
                <SettingsPanel />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Mobile Bottom Tab Bar ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border px-1 safe-area-bottom">
          <div className="flex items-center justify-around py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1"
                >
                  <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-green-500/15" : ""}`}>
                    <Icon
                      strokeWidth={isActive ? 2 : 1.5}
                      className={`w-5 h-5 transition-colors ${isActive ? "text-green-500" : "text-muted-foreground"}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium transition-colors leading-none ${isActive ? "text-green-500" : "text-muted-foreground"}`}>
                    {item.mobileLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}