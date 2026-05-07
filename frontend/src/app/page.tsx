"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { 
  Code2, 
  Upload, 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Activity, 
  AlertCircle,
  FileCode,
  Trash2,
  ChevronRight,
  User,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Loader2,
  Globe
} from "lucide-react";
import { ScoreRing } from "@/components/ScoreRing";
import { DimBar } from "@/components/DimBar";
import { PriorityBadge, GradeBadge, LevelBadge } from "@/components/Badges";
import { Clock, TrendingUp } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MODELS = [
  { id: "qwen2.5-coder", name: "Qwen 2.5 Coder 7B", icon: <Code2 size={16} />, estimate: 150 },
  { id: "deepseek-coder-v2", name: "DeepSeek V2 16B", icon: <Terminal size={16} />, estimate: 480 },
  { id: "codellama", name: "CodeLlama 7B", icon: <Cpu size={16} />, estimate: 150 },
  { id: "deepseek-coder-latest", name: "DeepSeek Latest", icon: <Activity size={16} />, estimate: 150 },
  { id: "groq-llama", name: "Groq Cloud (Fast)", icon: <Globe size={16} />, estimate: 10 },
];

const DIM_COLORS: Record<string, string> = {
  quality: "#00d4ff",
  best_practices: "#00ff9d",
  performance: "#ffd700",
  security: "#ff6b35",
  maintainability: "#bf94ff",
  effort: "#ff3366",
};

const formatTime = (seconds: number) => {
  if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)}m`;
  }
  return `${Math.round(seconds)}s`;
};

export default function Home() {
  const [code, setCode] = useState("");
  const [model, setModel] = useState("qwen2.5-coder");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [loadingText, setLoadingText] = useState("Scanning code...");
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [backendStats, setBackendStats] = useState<Record<string, any>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const LOADING_MSGS = [
    "Scanning code structure...",
    "Analyzing patterns...",
    "Evaluating complexity...",
    "Running quality checks...",
    "Computing effort score...",
    "Generating insights...",
  ];

  useEffect(() => {
    const checkOllama = async () => {
      try {
        const r = await axios.get(`${API}/ollama/status`);
        setOllamaOk(r.data.available);
      } catch (e) {
        setOllamaOk(false);
      }
    };
    checkOllama();
    
    // Load stats from backend
    const fetchStats = async () => {
      try {
        const { data } = await axios.get(`${API}/stats`);
        setBackendStats(data);
      } catch (e) {}
    };
    fetchStats();
  }, []);

  // Calculate dynamic estimate based on LoC and SPL
  useEffect(() => {
    const lines = code.split("\n").length;
    const stats = backendStats[model];
    let estimate = 0;
    
    if (stats && stats.spl > 0) {
      estimate = Math.max(1, Math.round(lines * stats.spl));
    } else {
      const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];
      estimate = selectedModel.estimate;
    }
    
    if (!loading) setTimeLeft(estimate);
  }, [code, model, backendStats, loading]);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }
    
    const stats = backendStats[model];
    const lines = code.split("\n").length;
    let estimatedTotal = 0;
    
    if (stats && stats.spl > 0) {
      estimatedTotal = Math.max(5, Math.round(lines * stats.spl));
    } else {
      const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];
      estimatedTotal = selectedModel.estimate;
    }
    
    setTimeLeft(estimatedTotal);
    
    let currentProgress = 0;
    let secondsElapsed = 0;
    
    progressTimerRef.current = setInterval(() => {
      secondsElapsed += 1;
      
      // Decaying progress: starts fast, slows down as it approaches 95%
      // Formula: progress = 95 * (1 - e^(-elapsed / (total/2)))
      const decayConstant = estimatedTotal / 1.5;
      const nextProgress = 95 * (1 - Math.exp(-secondsElapsed / decayConstant));
      
      setProgress(Math.max(currentProgress, nextProgress));
      setTimeLeft(Math.max(0, estimatedTotal - secondsElapsed));
      
      // Update loading text
      const msgIndex = Math.floor((secondsElapsed / 2) % LOADING_MSGS.length);
      setLoadingText(LOADING_MSGS[msgIndex]);
    }, 1000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [loading, model]);

  const analyze = useCallback(async (codeToAnalyze: string, fname = "") => {
    if (!codeToAnalyze.trim()) {
      setError("Paste or upload code first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await axios.post(`${API}/analyze`, {
        code: codeToAnalyze,
        model,
        filename: fname || undefined,
      });
      setResult(data);
      
      // Refresh stats from backend
      try {
        const { data: stats } = await axios.get(`${API}/stats`);
        setBackendStats(stats);
      } catch (e) {}

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [model]);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setCode(text);
    setFilename(file.name);
    setActiveTab("paste");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div className="min-h-screen grid-bg" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "var(--border)", background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-lg"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "var(--accent)" }}>
              <Code2 size={22} />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                CodeScan
              </div>
              <div className="text-[10px] font-mono font-semibold" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>
                AI-POWERED ANALYSIS
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono`}
              style={{
                background: ollamaOk === null ? "rgba(136,136,170,0.1)" : ollamaOk ? "rgba(0,255,157,0.1)" : "rgba(255,51,102,0.1)",
                border: `1px solid ${ollamaOk === null ? "#4a4a6a" : ollamaOk ? "rgba(0,255,157,0.3)" : "rgba(255,51,102,0.3)"}`,
                color: ollamaOk === null ? "#8888aa" : ollamaOk ? "#00ff9d" : "#ff3366",
              }}>
              <div className={`w-2 h-2 rounded-full ${ollamaOk ? "animate-pulse" : ""}`}
                style={{ background: "currentColor" }} />
              {ollamaOk === null ? "Checking..." : ollamaOk ? "Ollama Online" : "Ollama Offline"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 fade-in-up text-center max-w-2xl mx-auto">
          <h1 className="font-display text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Elevate your <br />
            <span style={{ color: "var(--accent)", textShadow: "0 0 40px rgba(0,212,255,0.3)" }}>
              Code Quality
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-lg font-medium">
            Next-gen AI analysis for your codebase. Get deep insights into performance, security, and developer effort.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Input Panel */}
          <div className="fade-in-up space-y-6" style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}>
            {/* Model Selector */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              {MODELS.map(m => {
                const stats = backendStats[m.id];
                return (
                  <button key={m.id} onClick={() => setModel(m.id)}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden"
                    style={{
                      background: model === m.id ? "rgba(0,212,255,0.15)" : "rgba(22,22,42,0.6)",
                      color: model === m.id ? "var(--accent)" : "var(--text-dim)",
                      border: model === m.id ? "1px solid rgba(0,212,255,0.3)" : "1px solid #2a2a4a",
                    }}>
                    {stats?.rank && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-[8px] border border-white/10">
                        #{stats.rank}
                      </div>
                    )}
                    <div className="mb-1">{m.icon}</div>
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{m.name.split(' ')[0]}</div>
                    {stats?.speed_label && (
                      <div className="text-[8px] opacity-60 font-mono mt-1">
                        {stats.speed_label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-[#2a2a4a]" style={{ background: "var(--bg-card)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              {/* Tabs */}
              <div className="flex border-b border-[#2a2a4a]">
                <button onClick={() => setActiveTab("paste")}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "paste" ? "text-[#00d4ff] bg-[#1a1a2e]" : "text-[#4a4a6a] hover:text-[#8888aa]"}`}>
                  <Terminal size={16} /> Paste Code
                </button>
                <button onClick={() => setActiveTab("upload")}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "upload" ? "text-[#00d4ff] bg-[#1a1a2e]" : "text-[#4a4a6a] hover:text-[#8888aa]"}`}>
                  <Upload size={16} /> Upload File
                </button>
              </div>

              {/* Input Area */}
              <div className="p-4">
                {activeTab === "paste" ? (
                  <div className="relative group">
                    {filename && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30] flex items-center gap-1">
                          <FileCode size={12} /> {filename}
                        </span>
                        <button onClick={() => { setFilename(""); }} className="text-[#4a4a6a] hover:text-[#ff3366] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <textarea
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder={`// Paste your code here...\nfunction optimize() {\n  // AI will analyze this\n}`}
                      rows={16}
                      className="w-full p-4 text-sm font-mono resize-none outline-none bg-transparent"
                      style={{
                        color: "var(--text-primary)",
                        caretColor: "var(--accent)",
                        lineHeight: "1.6",
                      }}
                    />
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a2a4a]">
                      <span className="text-[11px] font-mono text-[#4a4a6a]">
                        {code.split("\n").length} lines · {code.length} chars
                      </span>
                      <button onClick={() => setCode("")} className="text-[11px] font-bold text-[#4a4a6a] hover:text-[#ff3366] transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-20 ${dragging ? "drag-active" : "border-[#2a2a4a] hover:border-[#00d4ff40]"}`}
                    onDrop={onDrop}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mb-4 text-[#00d4ff]">
                      <Upload size={32} />
                    </div>
                    <div className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                      Drop your file here
                    </div>
                    <div className="text-sm text-[#8888aa] mb-6">
                      Drag & drop or click to browse files
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 px-6">
                      {['.py', '.js', '.ts', '.go', '.rs'].map(ext => (
                        <span key={ext} className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#1a1a2e] text-[#4a4a6a] border border-[#2a2a4a]">
                          {ext}
                        </span>
                      ))}
                    </div>
                    <input ref={fileRef} type="file" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                  </div>
                )}
              </div>
            </div>

            {/* Analyze Button & Estimation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[#00d4ff]" />
                  <span className="text-xs font-bold text-[#8888aa]">Estimated Time:</span>
                  <span className="text-xs font-mono font-bold text-[#00d4ff]">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                {backendStats[model] && (
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#00ff9d]" />
                    <span className="text-xs font-bold text-[#8888aa]">Avg/Req:</span>
                    <span className="text-xs font-mono font-bold text-[#00ff9d]">
                      {formatTime(backendStats[model].avg_time_per_request || 0)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => analyze(code, filename)}
                disabled={loading || !code.trim()}
                className="w-full py-5 rounded-2xl font-bold text-lg transition-all relative overflow-hidden group shadow-2xl"
                style={{
                  background: loading || !code.trim() ? "#1a1a2e" : "linear-gradient(135deg, #00d4ff 0%, #00ff9d 100%)",
                  color: loading || !code.trim() ? "#4a4a6a" : "#000",
                  cursor: loading || !code.trim() ? "not-allowed" : "pointer",
                  border: "none",
                }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-mono">{loadingText}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Analyze Performance <ChevronRight size={20} />
                  </span>
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl flex items-start gap-3 bg-red-500/10 border border-red-500/30">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-red-500">Analysis Error</div>
                  <div className="text-xs mt-1 text-[#8888aa]">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div ref={resultRef}>
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-[#2a2a4a]" style={{ minHeight: 600 }}>
                <div className="w-24 h-24 rounded-full bg-[#16162a] flex items-center justify-center mb-8 opacity-50">
                  <Activity size={48} className="text-[#4a4a6a]" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-[#8888aa]">Ready to Analyze</h3>
                <p className="text-sm text-[#4a4a6a] max-w-xs mx-auto leading-relaxed">
                  Provide your code snippet or upload a file to receive a comprehensive AI-powered quality report.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center py-20 px-10 text-center rounded-2xl border border-[#2a2a4a] bg-[#13131f] relative overflow-hidden" style={{ minHeight: 600 }}>
                {/* Background Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-[#00d4ff30] w-full">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff9d] transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(0,212,255,0.5)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="relative mb-10">
                  <div className="w-40 h-40 rounded-full border-4 border-[#1a1a2e] border-t-[#00d4ff] animate-spin shadow-[0_0_40px_rgba(0,212,255,0.1)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <Zap size={40} className="text-[#00d4ff] animate-pulse mb-2" />
                      <div className="text-xl font-bold text-white font-mono">{Math.round(progress)}%</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div className="font-mono text-xl font-bold text-[#00d4ff] tracking-tight">{loadingText}</div>
                  <p className="text-sm text-[#4a4a6a] leading-relaxed">
                    Analyzing code with <span className="text-[#8888aa]">{MODELS.find(m => m.id === model)?.name}</span>. 
                    Local models take time to think.
                  </p>
                  
                  <div className="pt-8">
                    <div className="text-[10px] font-mono font-bold text-[#4a4a6a] uppercase tracking-widest mb-2">Estimated Time Remaining</div>
                    <div className="text-2xl font-mono font-bold text-white tabular-nums">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6 fade-in-up">
                {/* Score Header Card */}
                <div className="p-8 rounded-2xl border border-[#2a2a4a] bg-[#13131f] shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity size={120} />
                  </div>
                  
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                      <div className="text-[10px] font-mono font-bold mb-2 text-[#4a4a6a] uppercase tracking-widest">
                        {result.filename ? `FILE: ${result.filename}` : "CODE SCAN COMPLETED"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff20]">
                          {result.language || "Programming"}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded bg-[#1a1a2e] text-[#4a4a6a] border border-[#2a2a4a]">
                          {result.model_used}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-2 text-right">
                      <GradeBadge grade={result.grade || "?"} />
                      <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-[#00d4ff10] border border-[#00d4ff20]">
                        <Clock size={12} className="text-[#00d4ff]" />
                        <span className="text-[10px] font-mono font-bold text-[#00d4ff]">
                          {formatTime(result.execution_time)} ACTUAL
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <ScoreRing score={result.overall_score || 0} size={140} />
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                        <h4 className="text-2xl font-bold text-white">Overall Quality</h4>
                        {result.developer_profile?.level && (
                          <LevelBadge level={result.developer_profile.level} />
                        )}
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-[#8888aa]">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dimensions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-6 rounded-2xl border border-[#2a2a4a] bg-[#13131f]">
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 size={18} className="text-[#00d4ff]" />
                      <span className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">Performance Metrics</span>
                    </div>
                    <div className="space-y-5">
                      {result.dimensions && Object.entries(result.dimensions).slice(0, 3).map(([key, dim]: [string, any]) => (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[#8888aa]">{dim.label}</span>
                            <span className="text-xs font-mono font-bold" style={{ color: DIM_COLORS[key] }}>{dim.score}</span>
                          </div>
                          <DimBar score={dim.score} color={DIM_COLORS[key]} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl border border-[#2a2a4a] bg-[#13131f]">
                    <div className="flex items-center gap-2 mb-6">
                      <ShieldCheck size={18} className="text-[#00ff9d]" />
                      <span className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">Security & Structure</span>
                    </div>
                    <div className="space-y-5">
                      {result.dimensions && Object.entries(result.dimensions).slice(3).map(([key, dim]: [string, any]) => (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[#8888aa]">{dim.label}</span>
                            <span className="text-xs font-mono font-bold" style={{ color: DIM_COLORS[key] }}>{dim.score}</span>
                          </div>
                          <DimBar score={dim.score} color={DIM_COLORS[key]} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Developer Effort */}
                {result.developer_profile && (
                  <div className="p-6 rounded-2xl border border-[#2a2a4a] bg-[#13131f] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <User size={80} />
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <User size={18} className="text-[#bf94ff]" />
                      <span className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">Developer DNA</span>
                    </div>
                    <div className="flex items-center gap-6 mb-4">
                      <ScoreRing score={result.effort_score || 0} size={70} />
                      <div>
                        <div className="text-lg font-bold text-white mb-1">Effort Score</div>
                        <p className="text-xs text-[#8888aa]">{result.developer_profile.effort_summary}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {result.developer_profile.traits?.map((t: string) => (
                        <span key={t} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-[#bf94ff] border border-[#bf94ff20]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 gap-6">
                   {/* Strengths */}
                  {result.strengths?.length > 0 && (
                    <div className="p-6 rounded-2xl border border-[#2a2a4a] bg-[#13131f]">
                      <div className="flex items-center gap-2 mb-6">
                        <CheckCircle2 size={18} className="text-[#00ff9d]" />
                        <span className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">Key Strengths</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#16162a] border border-[#2a2a4a]">
                            <div className="mt-0.5 text-[#00ff9d]"><ChevronRight size={14} /></div>
                            <span className="text-xs font-medium text-[#8888aa]">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {result.improvements?.length > 0 && (
                    <div className="p-6 rounded-2xl border border-[#2a2a4a] bg-[#13131f]">
                      <div className="flex items-center gap-2 mb-6">
                        <Lightbulb size={18} className="text-[#ffd700]" />
                        <span className="text-xs font-bold text-[#4a4a6a] uppercase tracking-widest">Actionable Insights</span>
                      </div>
                      <div className="space-y-4">
                        {result.improvements.map((imp: any, i: number) => (
                          <div key={i} className="p-5 rounded-xl bg-[#16162a] border border-[#2a2a4a] group">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-sm text-white group-hover:text-[#00d4ff] transition-colors">
                                {imp.title}
                              </span>
                              <PriorityBadge priority={imp.priority} />
                            </div>
                            <p className="text-xs text-[#8888aa] leading-relaxed mb-4">{imp.description}</p>
                            {imp.example && (
                              <div className="relative mt-2">
                                <div className="absolute top-0 right-0 p-2 text-[10px] font-mono text-[#4a4a6a]">Example</div>
                                <pre className="text-[11px] p-4 rounded-lg overflow-x-auto bg-[#0a0a0f] border border-[#2a2a4a] text-[#00d4ff] font-mono">
                                  {imp.example}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Complexity Footer */}
                {result.complexity_metrics && (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Lines of Code", value: result.complexity_metrics.lines_of_code, icon: <FileCode size={14} /> },
                      { label: "Processing Time", value: formatTime(result.execution_time), icon: <Clock size={14} /> },
                      { label: "Model Speed", value: `${Math.round(result.complexity_metrics.lines_of_code / result.execution_time)} lps`, icon: <TrendingUp size={14} /> },
                    ].map(m => (
                      <div key={m.label} className="p-4 rounded-xl border border-[#2a2a4a] bg-[#13131f] text-center">
                         <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">
                          {m.icon} {m.label}
                        </div>
                        <div className="text-lg font-bold text-white capitalize">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#2a2a4a] text-center">
        <div className="text-[10px] font-mono text-[#4a4a6a] uppercase tracking-widest">
          Powered by Local Ollama & Next.js · 2026 CodeScan Engine
        </div>
      </footer>
    </div>
  );
}