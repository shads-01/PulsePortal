import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Send,
    Bot,
    AlertTriangle,
} from "lucide-react";
import aiService from "../api/aiService";

const CHIPS = [
    "Headache",
    "Fever",
    "Chest Pain",
    "Skin Issue",
    "General Checkup",
];

/* floating orb  */
function Orb({ size, color, x, y, duration, delay }) {
    return (
        <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
                width: size,
                height: size,
                background: color,
                left: x,
                top: y,
                filter: "blur(40px)",
                opacity: 0.18,
            }}
            animate={{
                x: [0, 18, -12, 0],
                y: [0, -14, 10, 0],
                scale: [1, 1.08, 0.95, 1],
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
            }}
        />
    );
}

/*  Typing indicator  */
function TypingIndicator() {
    return (
        <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50/80 backdrop-blur-sm border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-[#127fec]" />
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                {[0, 0.22, 0.44].map((delay, i) => (
                    <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 block"
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            delay,
                            ease: "easeInOut",
                        }}
                    />
                ))}
                <span className="text-xs text-slate-400 ml-1.5">
                    Generating response...
                </span>
            </div>
        </div>
    );
}

export default function AIChatPanel({ onClose }) {
    const [messages, setMessages] = useState([
        {
            id: 0,
            from: "ai",
            text: "Hi! I'm your AI Health Assistant. Describe your symptoms and I'll provide guidance on what to do, basic treatments, and which specialist you should visit. How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [showChips, setShowChips] = useState(true);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    /**
     * Build conversation history in the format the backend expects.
     * Excludes the initial greeting and the current user message.
     */
    function buildHistory() {
        return messages
            .filter((m) => m.id !== 0) // skip initial greeting
            .map((m) => ({
                role: m.from === "user" ? "user" : "assistant",
                content: m.text,
            }));
    }

    async function send(text) {
        const trimmed = (text ?? input).trim();
        if (!trimmed || isThinking) return;

        const userMsg = { id: Date.now(), from: "user", text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setShowChips(false);
        setError(null);
        setIsThinking(true);

        try {
            const history = buildHistory();
            const aiResponse = await aiService.chatWithAssistant(trimmed, history);

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    from: "ai",
                    text: aiResponse,
                },
            ]);
        } catch (err) {
            console.error("AI chat error:", err);
            const backendMsg = err.response?.data?.message;
            setError(backendMsg || "Failed to get a response. Please try again.");
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    from: "ai",
                    text: backendMsg || "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
                },
            ]);
        } finally {
            setIsThinking(false);
        }
    }

    /**
     * Render message text with basic markdown-like formatting.
     * Handles **bold**, line breaks, and bullet points.
     */
    function renderMessageText(text) {
        // Split by double newlines for paragraphs, then handle bullets
        const lines = text.split('\n');
        const elements = [];
        let currentList = [];

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="list-disc pl-4 space-y-0.5 my-1">
                        {currentList.map((item, i) => (
                            <li key={i} className="text-sm leading-relaxed">{formatInline(item)}</li>
                        ))}
                    </ul>
                );
                currentList = [];
            }
        };

        lines.forEach((line, i) => {
            const trimmedLine = line.trim();
            // Bullet point lines
            if (/^[-•*]\s+/.test(trimmedLine)) {
                currentList.push(trimmedLine.replace(/^[-•*]\s+/, ''));
            } else if (/^\d+\.\s+/.test(trimmedLine)) {
                currentList.push(trimmedLine.replace(/^\d+\.\s+/, ''));
            } else {
                flushList();
                if (trimmedLine === '') {
                    // Empty line = paragraph break
                    if (i > 0 && i < lines.length - 1) {
                        elements.push(<div key={`br-${i}`} className="h-2" />);
                    }
                } else {
                    elements.push(
                        <p key={`p-${i}`} className="text-sm leading-relaxed">
                            {formatInline(trimmedLine)}
                        </p>
                    );
                }
            }
        });
        flushList();

        return <div className="flex flex-col gap-0.5">{elements}</div>;
    }

    function formatInline(text) {
        // Handle **bold** text
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    }

    return (
        <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-[500px] z-50 flex flex-col overflow-hidden"
            style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderLeft: "1px solid rgba(18,127,236,0.12)",
                boxShadow: "-8px 0 40px rgba(10,91,191,0.1)",
            }}
        >
            {/* Panel Header  */}
            <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #0a5bbf, #127fec)",
                }}
            >
                {/* shine sweep */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
                    }}
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 2,
                    }}
                />
                <div className="flex items-center gap-3 relative z-10">
                    <motion.div
                        className="bg-white/20 rounded-full p-2"
                        animate={{
                            boxShadow: [
                                "0 0 0 0 rgba(255,255,255,0.3)",
                                "0 0 0 6px rgba(255,255,255,0)",
                                "0 0 0 0 rgba(255,255,255,0)",
                            ],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                    >
                        <Bot size={18} className="text-white" />
                    </motion.div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">
                            AI Health Assistant
                        </p>
                        <p className="text-white/70 text-[11px] mt-0.5">
                            Describe symptoms to get guidance before booking.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="relative z-10 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 focus:outline-none"
                >
                    <X size={18} />
                </button>
            </div>

            {/*  Chat area  */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 relative">
                {/* floating orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <Orb
                        size={180}
                        color="rgba(18,127,236,1)"
                        x="60%"
                        y="-5%"
                        duration={9}
                        delay={0}
                    />
                    <Orb
                        size={140}
                        color="rgba(10,91,191,1)"
                        x="-10%"
                        y="40%"
                        duration={12}
                        delay={2}
                    />
                    <Orb
                        size={120}
                        color="rgba(56,189,248,1)"
                        x="55%"
                        y="65%"
                        duration={10}
                        delay={1}
                    />
                </div>

                {/* Messages */}
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}
                            className={`flex items-end gap-2 relative z-10 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.from === "ai" && (
                                <div className="w-7 h-7 rounded-full bg-blue-50/80 backdrop-blur-sm border border-blue-100 flex items-center justify-center flex-shrink-0 mb-0.5">
                                    <Bot size={14} className="text-[#127fec]" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-2xl leading-relaxed ${
                                    msg.from === "user"
                                        ? "bg-[#127fec] text-white text-sm rounded-br-sm shadow-md"
                                        : "rounded-bl-sm shadow-sm"
                                }`}
                                style={
                                    msg.from === "ai"
                                        ? {
                                              background:
                                                  "rgba(255,255,255,0.72)",
                                              backdropFilter: "blur(16px)",
                                              WebkitBackdropFilter:
                                                  "blur(16px)",
                                              border: "1px solid rgba(18,127,236,0.18)",
                                              boxShadow:
                                                  "0 0 0 1px rgba(18,127,236,0.08), 0 8px 32px rgba(18,127,236,0.12)",
                                              color: "#334155",
                                          }
                                        : {}
                                }
                            >
                                {msg.from === "ai" ? renderMessageText(msg.text) : msg.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Suggestion chips */}
                <AnimatePresence>
                    {showChips && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="flex flex-wrap gap-2 mt-1 relative z-10"
                        >
                            {CHIPS.map((chip) => (
                                <button
                                    key={chip}
                                    onClick={() => send(chip)}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-[#127fec] transition-all shadow-sm focus:outline-none"
                                    style={{
                                        background: "rgba(255,255,255,0.7)",
                                        backdropFilter: "blur(8px)",
                                        WebkitBackdropFilter: "blur(8px)",
                                        border: "1px solid rgba(203,213,225,0.8)",
                                    }}
                                >
                                    {chip}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                    {isThinking && (
                        <motion.div
                            key="typing"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10"
                        >
                            <TypingIndicator />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50/80 border border-red-100 text-red-600 text-xs"
                        >
                            <AlertTriangle size={12} />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* Input box */}
            <div
                className="flex-shrink-0 px-4 pt-3 pb-3"
                style={{
                    background: "rgba(255,255,255,0.75)",
                    borderTop: "1px solid rgba(203,213,225,0.5)",
                }}
            >
                <div className="flex items-center gap-2">
                    <input
                        className="flex-1 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#127fec]/25 placeholder:text-slate-400 transition-all"
                        style={{
                            background: "rgba(248,250,252,0.8)",
                            border: "1px solid rgba(203,213,225,0.7)",
                        }}
                        placeholder="Describe symptoms (e.g., headache for 2 days)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send()}
                        disabled={isThinking}
                    />
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => send()}
                        disabled={!input.trim() || isThinking}
                        className="p-2.5 rounded-xl text-white focus:outline-none flex-shrink-0 disabled:opacity-40 transition-opacity"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                            boxShadow: "0 2px 12px rgba(18,127,236,0.35)",
                        }}
                    >
                        <Send size={16} />
                    </motion.button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-2 mb-0.5 leading-relaxed">
                    AI provides general guidance only and do not provide any medical diagnosis.
                </p>
            </div>
        </motion.aside>
    );
}
