"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, Activity, Dna, SlidersHorizontal, Map as MapIcon, History, Menu, X } from "lucide-react";

import ChatInterface from "@/components/ChatInterface";
import CropPredictor from "@/components/CropPredictor";
import FertilizerAdvisor from "@/components/FertilizerAdvisor";
import SettingsPanel from "@/components/SettingsPanel";

type TabId = "chat" | "crop" | "fertilizer" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "chat", label: "AgroAI Assistant", icon: Hexagon },
    { id: "crop", label: "Crop Predictor", icon: Activity },
    { id: "fertilizer", label: "Fertilizer Advisor", icon: Dna },
  ] as const;

  <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">
    {/* Mobile Sidebar Overlay */}
    {isMobileMenuOpen && (
      <div
        className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}

    {/* Sidebar */}
    <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
      <div className="p-4 flex flex-col h-full relative">
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo / Brand */}
        <button
          onClick={() => {
            setActiveTab("chat");
            setIsMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 px-2 py-4 mb-4 mt-2 hover:opacity-80 transition-opacity text-left"
        >
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md" />
            <div className="relative w-14 h-14 flex items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/30 shadow-[0_0_18px_4px_rgba(34,197,94,0.35)]">
              <Image src="/logo.png" alt="AgroAI Logo" fill className="object-contain hidden dark:block" />
              <Image src="/logo-light.png" alt="AgroAI Logo" fill className="object-contain dark:hidden" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-wide bg-gradient-to-r from-emerald-300 via-green-400 to-teal-400 bg-clip-text text-transparent">AgroAI</span>
            <span className="text-[10px] font-medium text-emerald-500/70 tracking-[0.2em] uppercase">Smart Farming</span>
          </div>
        </button>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <Icon strokeWidth={1.5} className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-4 border-t border-border">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <MapIcon strokeWidth={1.5} className="w-4 h-4 text-muted-foreground" />
            Field Map (Soon)
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "settings" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <SlidersHorizontal strokeWidth={1.5} className={`w-4 h-4 ${activeTab === "settings" ? 'text-green-500' : 'text-muted-foreground'}`} />
            Settings
          </button>
        </div>
      </div>
    </aside>

    <main className="flex-1 flex flex-col h-[100dvh] w-full relative min-w-0">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="font-semibold text-lg flex items-center gap-2">
          <div className="w-6 h-6 relative">
            <Image src="/logo.png" alt="AgroAI" fill className="object-contain hidden dark:block" />
            <Image src="/logo-light.png" alt="AgroAI" fill className="object-contain dark:hidden" />
          </div>
          AgroAI
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 w-full h-full flex flex-col pt-[72px] md:pt-0"
        >
          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "crop" && (
            <div className="p-4 md:p-8 h-full overflow-y-auto w-full max-w-7xl mx-auto pb-24 md:pb-8">
              <CropPredictor />
            </div>
          )}
          {activeTab === "fertilizer" && (
            <div className="p-4 md:p-8 h-full overflow-y-auto w-full max-w-7xl mx-auto pb-24 md:pb-8">
              <FertilizerAdvisor />
            </div>
          )}
          {activeTab === "settings" && (
            <div className="p-4 md:p-8 h-full overflow-y-auto w-full max-w-7xl mx-auto pb-24 md:pb-8">
              <SettingsPanel />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  </div>
}