import React, { useState, useEffect } from 'react';
import { Moon, Sun, Globe, Trash2, ShieldCheck, Database, SlidersHorizontal, ChevronRight, Check, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import CustomSelect from "@/components/ui/CustomSelect";

export const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi / हिन्दी" },
    { code: "ta", label: "Tamil / தமிழ்" },
    { code: "te", label: "Telugu / తెలుగు" },
    { code: "mr", label: "Marathi / मराठी" },
    { code: "gu", label: "Gujarati / ગુજરાતી" },
    { code: "kn", label: "Kannada / ಕನ್ನಡ" },
    { code: "bn", label: "Bengali / বাংলা" },
    { code: "pa", label: "Punjabi / ਪੰਜਾਬੀ" },
    { code: "ml", label: "Malayalam / മലയാളം" },
    { code: "ur", label: "Urdu / اردو" },
];

export default function SettingsPanel() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [language, setLanguage] = useState('en');
    const [translateText, setTranslateText] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem('agroai_language');
        if (savedLang) setLanguage(savedLang);

        const savedTranslate = localStorage.getItem('agroai_translate_text');
        if (savedTranslate !== null) {
            setTranslateText(savedTranslate === 'true');
        }
    }, []);

    const handleLanguageChange = (val: string) => {
        setLanguage(val);
        localStorage.setItem('agroai_language', val);
        toast.success("Default language updated");
    };

    const handleTranslateToggle = () => {
        const newVal = !translateText;
        setTranslateText(newVal);
        localStorage.setItem('agroai_translate_text', newVal.toString());
        toast.success(newVal ? "Text translation enabled" : "Text translation disabled");
    };

    const handleClearHistory = () => {
        localStorage.removeItem('agroai_chat_history');
        localStorage.removeItem('agroai_language');
        localStorage.removeItem('agroai_translate_text');
        toast.success("Workspace data cleared successfully");
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    if (!mounted) return null;

    return (
        <div className="max-w-3xl mx-auto w-full pb-20 mt-4 md:mt-4">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-2">Settings</h1>
                <p className="text-muted-foreground text-sm">Configure your AgroAI workspace preferences.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/50">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-green-500" />
                            General Preferences
                        </h2>
                    </div>
                    <div className="divide-y divide-border/40">
                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                    {theme === 'dark' ? <Moon strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" /> : <Sun strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />}
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-medium text-foreground">App Theme</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Switch between dark and light mode.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-secondary transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                    <Globe strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-medium text-foreground">Default Language</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Set the primary language for AgroAI responses.</p>
                                </div>
                            </div>
                            <div className="w-56 z-50">
                                <CustomSelect
                                    value={language}
                                    onChange={handleLanguageChange}
                                    options={LANGUAGES.map(lang => ({ label: lang.label, value: lang.code }))}
                                    accentColor="green"
                                />
                            </div>
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer" onClick={handleTranslateToggle}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                    <Languages strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-medium text-foreground">Translate Chat Text</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Translate written AI responses into your default language.</p>
                                </div>
                            </div>
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${translateText ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${translateText ? 'left-5' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/50">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Database className="w-4 h-4 text-green-500" />
                            Data Management
                        </h2>
                    </div>
                    <div className="divide-y divide-border/40">

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer" onClick={() => setDataSaver(!dataSaver)}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                    <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-medium text-foreground">Data Saver Mode</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Reduce API payload sizes and image resolution for slower connections.</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${dataSaver ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                {dataSaver && <Check className="w-3 h-3 text-foreground" strokeWidth={3} />}
                            </div>
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer" onClick={handleClearHistory}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                                    <Trash2 strokeWidth={1.5} className="w-5 h-5 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-medium text-destructive">Clear Workspace Data</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Permanently delete current session chat history and cached soil metrics.</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
