"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import axios from "axios";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, User, Loader2, Mic, MicOff, Volume2, VolumeX, Globe, Check, ChevronDown, Square } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/config";
import { LANGUAGES } from "@/components/SettingsPanel";

interface Message {
    id: string;
    role: "user" | "bot";
    content: string;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "bot",
            content: "Hello! I am AgroAI. Ask me anything about farming, crops, soil, pest control, or government schemes like PM-KISAN.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState("en");
    const [translateText, setTranslateText] = useState(true);
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    // Stop all audio playback instantly
    const stopAudio = useCallback(() => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            audioPlayerRef.current = null; // Reset the ref after stopping
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }, []); // No dependencies needed as it only accesses refs and window.speechSynthesis

    // Watch for mute changes to stop currently playing audio
    useEffect(() => {
        if (isMuted) {
            stopAudio();
        }
    }, [isMuted, stopAudio]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessingAudio]);

    useEffect(() => {
        const savedLang = localStorage.getItem('agroai_language');
        if (savedLang) setLanguage(savedLang);

        const savedTranslate = localStorage.getItem('agroai_translate_text');
        if (savedTranslate !== null) {
            setTranslateText(savedTranslate === 'true');
        }
    }, []);

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                if (audioPlayerRef.current) {
                    audioPlayerRef.current.pause();
                }

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    let mimeType = 'audio/webm';
                    if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        mimeType = 'audio/mp4';
                    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                        mimeType = 'audio/ogg';
                    }

                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    stream.getTracks().forEach(track => track.stop());

                    setIsProcessingAudio(true);
                    const formData = new FormData();
                    const ext = mimeType.split('/')[1].split(';')[0];
                    formData.append("audio", audioBlob, `recording.${ext}`);
                    formData.append("language", language);

                    try {
                        const res = await axios.post(`${API_URL}/api/transcribe`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        const text = res.data.text;
                        if (text) {
                            // Auto-send immediately — no manual click needed
                            setIsProcessingAudio(false);
                            handleSend(text);
                            return;
                        }
                    } catch (error) {
                        console.error("Transcription error:", error);
                        toast.error("Failed to transcribe audio. Ensure backend is running.");
                    } finally {
                        setIsProcessingAudio(false);
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
                toast.success("Recording started...");
            } catch (err) {
                console.error("Microphone access denied:", err);
                toast.error("Please allow microphone access to use voice chat.");
            }
        }
    };

    const playTTS = async (text: string) => {
        if (isMuted) return;

        const cleanText = text.replace(/[*_#~`|[\]>]/g, '').trim();
        if (!cleanText) return;

        // Try server-side edge-tts first
        try {
            const url = `${API_URL}/api/tts?text=${encodeURIComponent(cleanText)}&language=${language}`;

            stopAudio(); // Stop any existing audio before starting new

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // 8s TTS timeout

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`TTS server returned ${res.status}`);

            const blob = await res.blob();
            if (blob.size < 100) throw new Error("Empty audio blob received");

            const objectUrl = URL.createObjectURL(blob);
            const audio = new Audio(objectUrl);
            audio.playbackRate = 0.9;
            audio.preservesPitch = true;
            audio.onended = () => URL.revokeObjectURL(objectUrl);
            audioPlayerRef.current = audio;
            await audio.play();
            return; // EXIT HERE so it doesn't fall through to fallback
        } catch (e) {
            console.warn("edge-tts failed, falling back to browser speech:", e);
        }

        // Fallback: browser Web Speech API (always available, no server needed)
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            stopAudio();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 0.9;
            utterance.lang = language === "en" ? "en-US" : language;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleSend = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || isLoading) return;

        stopAudio();

        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: textToSend };
        setMessages((prev) => [...prev, userMessage]);

        setInput("");
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/chat`, {
                message: userMessage.content,
                language: language,
                translate_text: translateText,
            }, {
                timeout: 45000, // 45s — accommodates RAG cold-start on first request
                signal: abortControllerRef.current.signal
            });

            const replyText = response.data.reply;
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: replyText,
            };
            setMessages((prev) => [...prev, botMessage]);
            playTTS(replyText);

        } catch (error: any) {
            if (axios.isCancel(error)) {
                console.log("Request canceled", error.message);
                return;
            }

            console.error("Chat error:", error);

            let errorMessage = "Connection failed. Please check your network or backend server.";
            if (error.code === 'ECONNABORTED') {
                errorMessage = "Request timed out. The server is taking too long to respond.";
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = "Network Error: Cannot reach the AgroAI server. Is it running?";
            } else if (error.response?.status >= 500) {
                errorMessage = "The AgroAI server encountered an internal error. Please try again later.";
            }

            toast.error(errorMessage);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "bot", content: errorMessage },
            ]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted && audioPlayerRef.current) {
            audioPlayerRef.current.pause();
        }
    };

    const stopAudioPlayback = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background relative">
            <div className="absolute top-4 right-6 z-10 flex items-center gap-3">
                <div ref={langRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setLangOpen(prev => !prev)}
                        className="flex items-center gap-1.5 bg-muted border border-border rounded-full pl-2.5 pr-2 py-1.5 text-sm text-foreground transition-colors hover:border-border/80"
                    >
                        <Globe className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="hidden sm:inline text-sm">
                            {LANGUAGES.find(l => l.code === language)?.label ?? "English"}
                        </span>
                        <span className="sm:hidden text-xs font-mono text-muted-foreground">
                            {language.toUpperCase()}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
                    </button>

                    {langOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className="absolute z-50 top-full mt-2 right-0 w-52 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="max-h-56 overflow-y-auto py-1.5">
                                {LANGUAGES.map((l) => {
                                    const isSelected = l.code === language;
                                    return (
                                        <button
                                            key={l.code}
                                            type="button"
                                            onClick={() => {
                                                setLanguage(l.code);
                                                localStorage.setItem('agroai_language', l.code);
                                                setLangOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? "bg-green-500/10 text-green-600 dark:text-green-400" : "text-foreground hover:bg-muted"
                                                }`}
                                        >
                                            <span>{l.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>

                <button
                    onClick={toggleMute}
                    className={`p-2 rounded-full border transition-colors ${isMuted
                        ? "bg-red-500/20 border-red-500/50 text-destructive"
                        : "bg-muted border-border text-muted-foreground hover:text-green-400"
                        }`}
                    title={isMuted ? "Unmute Bot Voice" : "Mute Bot Voice"}
                >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto w-full" onClick={stopAudioPlayback}>
                {messages.length === 1 ? (
                    <div className="h-full flex flex-col items-center justify-center px-5 py-6 text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center mb-4 md:mb-6 relative overflow-hidden rounded-2xl md:rounded-3xl">
                            <Image src="/logo.png" alt="AgroAI" width={120} height={120} className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]" priority />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-semibold mb-2 md:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 tracking-tight">AgroAI</h2>
                        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-xs md:max-w-md">Your intelligent farming assistant. Ask about crops, soil, pests, and government schemes.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 w-full">
                            {[
                                "What is organic farming?",
                                "Benefits of drip irrigation?",
                                "Tell me about PM-KISAN",
                                "How to test soil ph?"
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={async () => {
                                        setInput(q);
                                        setTimeout(() => handleSend(q), 50);
                                    }}
                                    className="text-left p-3 md:p-4 rounded-xl text-sm text-foreground bg-secondary hover:bg-muted border border-border transition-colors leading-snug"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto w-full pt-16 pb-36 px-3 md:px-4 space-y-6 md:space-y-8">

                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                                <div
                                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full relative overflow-hidden ${msg.role === "user" ? "bg-green-600" : ""}`}
                                >
                                    {msg.role === "user" ? <User className="w-5 h-5 text-foreground" /> : (
                                        <>
                                            <div className="absolute inset-0 bg-white rounded-full bg-opacity-10 pointer-events-none" />
                                            <Image src="/logo.png" alt="AI" width={40} height={40} className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_5px_rgba(34,197,94,0.5)] z-10" />
                                        </>
                                    )}
                                </div>
                                <div className={`flex flex-col ${msg.role === "user" ? "items-end max-w-[82%]" : "items-start max-w-[90%]"}`}>
                                    <div className={`px-3.5 md:px-5 py-3 md:py-3.5 text-[15px] md:text-[17px] leading-relaxed rounded-2xl ${msg.role === "user"
                                        ? "bg-secondary text-foreground"
                                        : "bg-transparent text-foreground"
                                        }`}
                                    >
                                        {msg.role === "user" ? (
                                            msg.content
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 mt-6 text-emerald-600 dark:text-emerald-400" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5 text-emerald-600 dark:text-emerald-400" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-4 text-emerald-500 dark:text-emerald-300" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="my-6 border-border" {...props} />,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {isProcessingAudio && (
                            <div className="flex items-center gap-4 flex-row-reverse">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(34,197,94,0.5)]">
                                    <User className="w-4 h-4 text-foreground" />
                                </div>
                                <div className="bg-secondary text-muted-foreground rounded-2xl px-5 py-3.5 flex items-center gap-3 text-sm">
                                    Transcribing Audio... <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden">
                                    <Image src="/logo.png" alt="AI" width={40} height={40} className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_5px_rgba(34,197,94,0.5)] animate-pulse" />
                                </div>
                                <div className="text-muted-foreground px-2 py-3.5 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4 px-2 md:pb-6 md:px-4">
                <div className="max-w-3xl mx-auto relative">
                    <div className="bg-card border border-border rounded-2xl shadow-xl flex items-center p-1.5 md:p-2 focus-within:ring-1 focus-within:ring-green-500/50 transition-all">
                        <button
                            onClick={toggleRecording}
                            className={`flex-shrink-0 p-2.5 rounded-xl flex items-center justify-center transition-all ${isRecording
                                ? "bg-red-500/20 text-red-500 animate-pulse"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                }`}
                            title="Click to Record Audio"
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder={isRecording ? "Listening..." : "Message AgroAI..."}
                            disabled={isRecording || isProcessingAudio}
                            className="flex-1 bg-transparent border-none px-3 py-3 focus:outline-none focus:ring-0 text-[15px] disabled:opacity-50 text-foreground placeholder-gray-500"
                        />

                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || (!input.trim() && !isRecording) || isProcessingAudio}
                            className="p-2.5 bg-foreground text-background hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground rounded-xl flex items-center justify-center transition-all shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-center mt-3">
                        <span className="text-[11px] text-muted-foreground">AgroAI can make mistakes. Verify critical agronomy info with local KVKs.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
