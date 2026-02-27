"use client";

import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Loader2, ThermometerSun, Droplets, TestTube, CloudRain } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/config";

export default function CropPredictor() {

    const [formData, setFormData] = useState({
        n: "50",
        p: "50",
        k: "50",
        temperature: "25",
        humidity: "60",
        ph: "6.5",
        rainfall: "100",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ prediction: string; tip: string } | null>(null);

    const handlePredict = async () => {
        const payload = {
            n: parseFloat(formData.n),
            p: parseFloat(formData.p),
            k: parseFloat(formData.k),
            temperature: parseFloat(formData.temperature),
            humidity: parseFloat(formData.humidity),
            ph: parseFloat(formData.ph),
            rainfall: parseFloat(formData.rainfall),
        };

        if (Object.values(payload).some(v => isNaN(v))) {
            toast.error("Please enter valid numbers for all fields");
            return;
        }

        setIsLoading(true);
        setResult(null);
        try {
            const response = await axios.post(`${API_URL}/api/predict/crop`, payload);
            setResult(response.data);
        } catch (error) {
            console.error("Prediction error:", error);
            toast.error("Could not connect to the ML model.");
            setResult({
                prediction: "⚠️ Prediction Failed",
                tip: "Could not connect to the backend server. Please ensure the Python API is running.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getGradient = (value: string, min: number, max: number, color: string) => {
        const percentage = ((parseFloat(value) - min) / (max - min)) * 100;
        return `linear-gradient(to right, ${color} ${percentage}%, rgba(150, 150, 150, 0.2) ${percentage}%)`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                        <Sprout className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Soil Conditions</h2>
                        <p className="text-sm text-muted-foreground">Adjust the sliders to match your field profile</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/80 rounded-2xl border border-border">
                        {(['n', 'p', 'k'] as const).map((nutrient) => (
                            <div key={nutrient}>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">{nutrient} Level</label>
                                <input
                                    type="number"
                                    value={formData[nutrient]}
                                    onChange={(e) => setFormData({ ...formData, [nutrient]: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-center text-green-400 font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <ThermometerSun className="w-4 h-4 text-orange-400" /> Temperature (°C)
                                </label>
                                <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">{formData.temperature}°C</span>
                            </div>
                            <input
                                type="range" min="0" max="50" step="0.1"
                                value={formData.temperature}
                                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.temperature, 0, 50, '#f97316') }}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Droplets className="w-4 h-4 text-blue-400" /> Humidity (%)
                                </label>
                                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{formData.humidity}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={formData.humidity}
                                onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.humidity, 0, 100, '#3b82f6') }}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <TestTube className="w-4 h-4 text-emerald-400" /> Soil pH
                                </label>
                                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">{formData.ph}</span>
                            </div>
                            <input
                                type="range" min="0" max="14" step="0.1"
                                value={formData.ph}
                                onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.ph, 0, 14, '#10b981') }}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <CloudRain className="w-4 h-4 text-cyan-400" /> Rainfall (mm)
                                </label>
                                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{formData.rainfall}mm</span>
                            </div>
                            <input
                                type="range" min="0" max="300" step="1"
                                value={formData.rainfall}
                                onChange={(e) => setFormData({ ...formData, rainfall: e.target.value })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.rainfall, 0, 300, '#06b6d4') }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-foreground font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sprout className="w-5 h-5" />}
                        {isLoading ? "Running ML Model..." : "Predict Best Crop"}
                    </button>
                </div>
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    {result ? (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="glass-panel p-8 rounded-3xl h-full flex flex-col justify-center items-center text-center border-green-500/30 shadow-[0_0_50px_-15px_rgba(34,197,94,0.2)] bg-gradient-to-br from-background to-secondary/30"
                        >
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/40 relative">
                                <div className="absolute inset-0 rounded-full bg-green-400 blur-xl opacity-20 animate-pulse"></div>
                                <Sprout className="w-12 h-12 text-green-400 relative z-10" />
                            </div>
                            <h3 className="text-xl text-muted-foreground font-medium mb-2">Recommended Crop</h3>
                            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500 mb-6 drop-shadow-sm uppercase">
                                {result.prediction.replace('✅ ', '')}
                            </div>
                            <p className="text-muted-foreground leading-relaxed max-w-sm">{result.tip}</p>

                            <button
                                onClick={() => setResult(null)}
                                className="mt-8 text-sm text-muted-foreground hover:text-green-400 transition-colors"
                            >
                                Reset Prediction
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="glass-panel p-8 rounded-3xl h-full flex flex-col justify-center items-center text-center opacity-50 bg-background/50"
                        >
                            <div className="w-20 h-20 border-2 border-dashed border-border rounded-full flex items-center justify-center mb-6">
                                <Sprout className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium text-muted-foreground mb-2">Awaiting Data</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Adjust your soil parameters on the left and click predict to see our ML-powered crop recommendation.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
