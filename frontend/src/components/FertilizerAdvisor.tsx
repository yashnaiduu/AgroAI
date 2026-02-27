"use client";

import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Loader2, MapPin, Gauge } from "lucide-react";
import toast from "react-hot-toast";
import CustomSelect from "@/components/ui/CustomSelect";
import { API_URL } from "@/lib/config";

export default function FertilizerAdvisor() {

    const [formData, setFormData] = useState({
        temperature: "26",
        humidity: "52",
        soil_moisture: "50",
        soil_type: "Loamy",
        crop_type: "Wheat",
        n: "30",
        p: "10",
        k: "0",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ prediction: string; tip: string } | null>(null);

    const soilTypes = ["Sandy", "Loamy", "Black", "Red", "Clayey"];
    const cropTypes = ["Maize", "Sugarcane", "Cotton", "Tobacco", "Paddy", "Barley", "Wheat", "Millets", "Oil seeds", "Pulses", "Ground Nuts"];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePredict = async () => {
        const payload = {
            temperature: parseFloat(formData.temperature),
            humidity: parseFloat(formData.humidity),
            soil_moisture: parseFloat(formData.soil_moisture),
            soil_type: formData.soil_type,
            crop_type: formData.crop_type,
            n: parseFloat(formData.n),
            p: parseFloat(formData.p),
            k: parseFloat(formData.k),
        };

        const numerics = [payload.temperature, payload.humidity, payload.soil_moisture, payload.n, payload.p, payload.k];
        if (numerics.some(v => typeof v === 'number' && isNaN(v))) {
            toast.error("Please enter valid numbers for all fields");
            return;
        }

        setIsLoading(true);
        setResult(null);
        try {
            const response = await axios.post(`${API_URL}/api/predict/fertilizer`, payload);
            setResult(response.data);
        } catch (error) {
            console.error("Prediction error:", error);
            toast.error("Could not connect to the ML model.");
            setResult({
                prediction: "⚠️ Prediction Failed",
                tip: "Could not connect to the backend server.",
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
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-teal-500/20 rounded-xl">
                        <FlaskConical className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Fertilizer Advisor</h2>
                        <p className="text-sm text-muted-foreground">Match your soil and crop for precision nutrition</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" /> Soil Type
                            </label>
                            <CustomSelect
                                value={formData.soil_type}
                                onChange={(val) => setFormData({ ...formData, soil_type: val })}
                                options={soilTypes.map((s) => ({ label: s, value: s }))}
                                accentColor="teal"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Gauge className="w-4 h-4 text-muted-foreground" /> Target Crop
                            </label>
                            <CustomSelect
                                value={formData.crop_type}
                                onChange={(val) => setFormData({ ...formData, crop_type: val })}
                                options={cropTypes.map((c) => ({ label: c, value: c }))}
                                accentColor="teal"
                            />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-medium text-muted-foreground">Soil Moisture (%)</label>
                                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{formData.soil_moisture}%</span>
                            </div>
                            <input
                                type="range" name="soil_moisture" min="0" max="100" step="1"
                                value={formData.soil_moisture}
                                onChange={handleChange}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.soil_moisture, 0, 100, '#3b82f6') }}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-medium text-muted-foreground">Temperature (°C)</label>
                                <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">{formData.temperature}°C</span>
                            </div>
                            <input
                                type="range" name="temperature" min="0" max="50" step="0.1"
                                value={formData.temperature}
                                onChange={handleChange}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.temperature, 0, 50, '#f97316') }}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-medium text-muted-foreground">Humidity (%)</label>
                                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{formData.humidity}%</span>
                            </div>
                            <input
                                type="range" name="humidity" min="0" max="100" step="1"
                                value={formData.humidity}
                                onChange={handleChange}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ background: getGradient(formData.humidity, 0, 100, '#06b6d4') }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                        {(['n', 'p', 'k'] as const).map((nutrient) => (
                            <div key={nutrient}>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">{nutrient} Level</label>
                                <input
                                    type="number"
                                    name={nutrient}
                                    value={formData[nutrient]}
                                    onChange={handleChange}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-center text-teal-400 font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="w-full mt-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-foreground font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(20,184,166,0.4)] disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FlaskConical className="w-5 h-5" />}
                        {isLoading ? "Running ML Analysis..." : "Recommend Fertilizer"}
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
                            className="glass-panel p-8 rounded-3xl h-full flex flex-col justify-center items-center text-center border-teal-500/30 shadow-[0_0_50px_-15px_rgba(20,184,166,0.2)] bg-gradient-to-br from-background to-secondary/30"
                        >
                            <div className="w-24 h-24 bg-teal-500/20 rounded-full flex items-center justify-center mb-6 border border-teal-500/40 relative">
                                <div className="absolute inset-0 rounded-full bg-teal-400 blur-xl opacity-20 animate-pulse"></div>
                                <FlaskConical className="w-12 h-12 text-teal-400 relative z-10" />
                            </div>
                            <h3 className="text-xl text-muted-foreground font-medium mb-2">Recommended Fertilizer</h3>
                            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-500 mb-6 drop-shadow-sm uppercase">
                                {result.prediction.replace('✅ ', '')}
                            </div>
                            <p className="text-muted-foreground leading-relaxed max-w-sm">{result.tip}</p>

                            <button
                                onClick={() => setResult(null)}
                                className="mt-8 text-sm text-muted-foreground hover:text-teal-400 transition-colors"
                            >
                                Reset Recommendation
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
                                <FlaskConical className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium text-muted-foreground mb-2">Awaiting Data</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Enter your field constraints and soil nutrients to determine the best compound fertilizer.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
