"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
    label: string;
    value: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    accentColor?: "teal" | "green" | "emerald";
    className?: string;
}

const accentMap = {
    teal: {
        selected: "bg-teal-500/10 text-teal-500 dark:text-teal-400",
        check: "text-teal-500 dark:text-teal-400",
    },
    green: {
        selected: "bg-green-500/10 text-green-600 dark:text-green-400",
        check: "text-green-600 dark:text-green-400",
    },
    emerald: {
        selected: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        check: "text-emerald-600 dark:text-emerald-400",
    },
};

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    accentColor = "teal",
    className = "",
}: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const accent = accentMap[accentColor];
    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between gap-2 bg-muted/40 dark:bg-muted/20 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground transition-all outline-none hover:border-border/80 ${open ? `ring-1 ring-border` : ""}`}
            >
                <span className={selectedOption ? "text-foreground" : "text-muted-foreground"}>
                    {selectedOption?.label ?? placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute z-50 top-full mt-2 w-full min-w-[160px] bg-card/80 dark:bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-56 overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-border">
                            {options.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => { onChange(opt.value); setOpen(false); }}
                                        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? accent.selected : "text-foreground hover:bg-muted"}`}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && <Check className={`w-3.5 h-3.5 flex-shrink-0 ${accent.check}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
