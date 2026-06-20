/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  MapPin,
  MessageSquare,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Share2,
  Trash2,
  X,
  Compass,
  Phone,
  HelpCircle,
  Clock,
  Send,
  Zap,
  Leaf,
  Flame,
  CheckCircle,
} from "lucide-react";
import { WasteAnalysis, RecyclingLog, Achievement, RecyclingPoint, Message } from "./types";
import { INITIAL_ACHIEVEMENTS, MOUNTED_RECYCLING_POINTS } from "./components/data";
import Header from "./components/Header";
import ImageAnalyzer from "./components/ImageAnalyzer";

export default function App() {
  // Key state variables
  const [totalPoints, setTotalPoints] = useState<number>(15);
  const [streakDays, setStreakDays] = useState<number>(3);
  const [logs, setLogs] = useState<RecyclingLog[]>([
    {
      id: "log_1",
      timestamp: new Date(Date.now() - 3600000 * 5).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      itemName: "Garrafa de Detergente",
      category: "plástico",
      impactPoints: 15,
    },
    {
      id: "log_2",
      timestamp: new Date(Date.now() - 3600000 * 24).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      itemName: "Caixa de Sapato de Papelão",
      category: "papel",
      impactPoints: 20,
    }
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [pointsOfDisposal, setPointsOfDisposal] = useState<RecyclingPoint[]>(MOUNTED_RECYCLING_POINTS);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"disabled" | "searching" | "active">("disabled");
  const [activeViewTab, setActiveViewTab] = useState<"scan" | "map" | "achievements" | "chat">("scan");

  // Chatbot parameters
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "init_1",
      role: "model",
      text: "Olá! Sou o EcoBot, seu assistente inteligente de reciclagem residencial. ♻️\n\nComo posso ajudar você a descartar seus materiais hoje? Pode me perguntar se um plástico específico é reciclável, truques de compostagem, ou dicas de coleta seletiva na sua região!",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [userQuery, setUserQuery] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  // Tutorial Dialog toggler
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Load state from localStorage on mount (safe for standard apps, falls back cleanly)
  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem("ecobot_points");
      const savedStreak = localStorage.getItem("ecobot_streak");
      const savedLogs = localStorage.getItem("ecobot_logs");
      const savedAchievements = localStorage.getItem("ecobot_achievements");

      if (savedPoints) setTotalPoints(parseInt(savedPoints, 10));
      if (savedStreak) setStreakDays(parseInt(savedStreak, 10));
      if (savedLogs) setLogs(JSON.parse(savedLogs));
      if (savedAchievements) setAchievements(JSON.parse(savedAchievements));
    } catch (e) {
      console.warn("Storage loading fallback active:", e);
    }
  }, []);

  // Save changes back to state and localStorage
  const persistState = (newPoints: number, newStreak: number, newLogs: RecyclingLog[], newAch: Achievement[]) => {
    setTotalPoints(newPoints);
    setStreakDays(newStreak);
    setLogs(newLogs);
    setAchievements(newAch);

    try {
      localStorage.setItem("ecobot_points", newPoints.toString());
      localStorage.setItem("ecobot_streak", newStreak.toString());
      localStorage.setItem("ecobot_logs", JSON.stringify(newLogs));
      localStorage.setItem("ecobot_achievements", JSON.stringify(newAch));
    } catch (e) {
      console.warn("Saving failure:", e);
    }
  };

  // Reset progress action for testing or starting clean
  const handleResetState = () => {
    if (confirm("Você tem certeza que quer reiniciar seu progresso e conquistas de reciclagem?")) {
      persistState(15, 3, [
        {
          id: "log_init",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
          itemName: "Garrafa de Cloro Alvejante",
          category: "plástico",
          impactPoints: 15,
        }
      ], INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlockedAt: undefined })));
      triggerToast("Dados reiniciados com sucesso! Comece sua jornada verde do zero. 🌱");
    }
  };

  // Calculate distances using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  // Trigger GPS locator
  const handleRequestGPS = () => {
    setGpsStatus("searching");
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização por hardware.");
      setGpsStatus("disabled");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setGpsStatus("active");

        // Calculate and order point positions
        const listWithDistance = pointsOfDisposal.map((pt) => {
          const dist = calculateDistance(latitude, longitude, pt.latitude, pt.longitude);
          return { ...pt, distance: parseFloat(dist.toFixed(2)) };
        });

        // Sort by closest distance first
        listWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setPointsOfDisposal(listWithDistance);
        triggerToast("Localização GPS sincronizada! Mostrando pontos de descarte mais próximos de você. 📍");
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("Não foi possível obter sua localização exata. Mostrando localizadores padrão em capitais.");
        setGpsStatus("disabled");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Simulate being in Cabo de Santo Agostinho, Pernambuco
  const handleSimulateCabo = () => {
    setGpsStatus("searching");
    setTimeout(() => {
      const latitude = -8.2863;
      const longitude = -35.0315;
      setUserLocation({ latitude, longitude });
      setGpsStatus("active");

      // Calculate and order point positions
      const listWithDistance = pointsOfDisposal.map((pt) => {
        const dist = calculateDistance(latitude, longitude, pt.latitude, pt.longitude);
        return { ...pt, distance: parseFloat(dist.toFixed(2)) };
      });

      // Sort by closest distance first
      listWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setPointsOfDisposal(listWithDistance);
      triggerToast("EcoBot localizado com sucesso no Cabo de Santo Agostinho - PE! 🌴📍");
    }, 400);
  };

  // Log waste, claim coins/points and unlock achievements as a true gameplay loops
  const handleLogWaste = (waste: WasteAnalysis, customImageUrl?: string) => {
    const gainedPoints = waste.impactPoints || 20;
    const itemLabel = waste.itemName || "Item reciclável";
    const itemCat = waste.category || "outros";

    const updatedPoints = totalPoints + gainedPoints;
    
    // Add item to local history logs
    const newLogItem: RecyclingLog = {
      id: "log_" + Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      itemName: itemLabel,
      category: itemCat,
      impactPoints: gainedPoints,
      imageUrl: customImageUrl
    };

    const updatedLogs = [newLogItem, ...logs];

    // Evaluate achievement rules dynamically based on total EP and matching categories
    const updatedAchievements = achievements.map((ach) => {
      if (ach.unlockedAt) return ach; // already unlocked

      let shouldUnlock = false;
      
      // Rule 1: points requirements met
      if (updatedPoints >= ach.pointsRequired) {
        shouldUnlock = true;
      }

      // Rule 2: specific categories met
      if (ach.categoryMatch && itemCat.toLowerCase() === ach.categoryMatch.toLowerCase()) {
        const countInCat = updatedLogs.filter(l => l.category.toLowerCase() === ach.categoryMatch?.toLowerCase()).length;
        if (ach.categoryMatch === "plástico" && countInCat >= 2) shouldUnlock = true;
        if (ach.categoryMatch === "metal" && countInCat >= 1) shouldUnlock = true;
        if (ach.categoryMatch === "vidro" && countInCat >= 1) shouldUnlock = true;
        if (ach.categoryMatch === "papel" && countInCat >= 1) shouldUnlock = true;
      }

      if (shouldUnlock) {
        triggerToast(`🏆 CONQUISTA DESBLOQUEADA: "${ach.title}"! Parabéns!`);
        return { ...ach, unlockedAt: new Date().toLocaleDateString("pt-BR") };
      }
      return ach;
    });

    // Award +1 day streak if waste logged
    const updatedStreak = streakDays + 1;

    // Persist all state arrays together safely
    persistState(updatedPoints, updatedStreak, updatedLogs, updatedAchievements);

    triggerToast(`Parabéns! "${itemLabel}" descartado corretamente. Você ganhou +${gainedPoints} EP! 🌿`);
  };

  // Trigger floating alert banner
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
    setTimeout(() => {
      setIsToastOpen(false);
    }, 4500);
  };

  // Bot Chat client side request
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuery.trim() || isChatSending) return;

    const userMsg: Message = {
      id: "user_" + Date.now().toString(),
      role: "user",
      text: userQuery,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatSending(true);
    const queryBackup = userQuery;
    setUserQuery("");

    try {
      // Map system instruction formats properly
      const historyPayload = chatMessages.map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

      const response = await fetch("/api/recicla/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyPayload,
          message: queryBackup,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível obter resposta.");
      }

      const raw = await response.json();
      const botMsg: Message = {
        id: "bot_" + Date.now().toString(),
        role: "model",
        text: raw.text,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errMsg: Message = {
        id: "err_" + Date.now().toString(),
        role: "model",
        text: "Desculpe-me, estou enfrentando uma instabilidade técnica temporária. Você pode tentar novamente em alguns segundos ou conferir se a chave de API está corretamente anexada ao servidor do EcoBot! 🔌",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Preset queries for instant interaction on chatbot click
  const handlePresetQuery = (txt: string) => {
    setUserQuery(txt);
  };

  // Helper colors for logs
  const getCategoryThemeColor = (category: string) => {
    const c = category.toLowerCase();
    if (c === "plástico" || c === "plastico") return "bg-red-500 text-white";
    if (c === "papel") return "bg-blue-500 text-white";
    if (c === "vidro") return "bg-emerald-500 text-white";
    if (c === "metal") return "bg-yellow-500 text-black";
    if (c === "orgânico" || c === "organico") return "bg-amber-700 text-white";
    if (c === "eletrônicos" || c === "eletronicos") return "bg-purple-500 text-white";
    if (c === "perigoso") return "bg-orange-500 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 font-sans antialiased overflow-x-hidden" id="app-root-container">
      
      {/* Toast Alert Notifications */}
      {isToastOpen && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-slate-900 text-white border border-emerald-500 shadow-2xl p-4 rounded-2xl flex items-center gap-3 animate-bounce">
          <div className="p-2 bg-emerald-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="text-xs font-black tracking-wide text-emerald-400">ECOBOT COMPANION</p>
            <p className="text-xs font-semibold mt-0.5">{toastMessage}</p>
          </div>
          <button onClick={() => setIsToastOpen(false)} className="text-slate-400 hover:text-white ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Workspace */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Customized Dynamic Header from Theme Palette */}
        <Header
          totalPoints={totalPoints}
          streakDays={streakDays}
          onResetState={handleResetState}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />

        {/* 12-Column Responsive Layout Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CHUNKS (Scanner/Cam Controls + Intelligent Eco ChatBot assistant) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
            
            {/* View Tab Selector Menu to ensure usability for all generations */}
            <div className="flex bg-white p-1 rounded-2xl border-2 border-emerald-100 shadow-md">
              <button
                onClick={() => setActiveViewTab("scan")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeViewTab === "scan" ? "bg-emerald-500 text-white shadow-md" : "text-slate-600 hover:text-emerald-800"}`}
              >
                📹 Scanner IA
              </button>
              <button
                onClick={() => setActiveViewTab("chat")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeViewTab === "chat" ? "bg-emerald-500 text-white shadow-md" : "text-slate-600 hover:text-emerald-800"}`}
              >
                💬 EcoChatbot IA
              </button>
            </div>

            {/* TAB 1: Scanner Intelligent Engine */}
            {activeViewTab === "scan" && (
              <ImageAnalyzer
                onLogWaste={handleLogWaste}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {/* TAB 2: Intelligent Real-time ChatBot assistant */}
            {activeViewTab === "chat" && (
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-100 flex flex-col gap-4 min-h-[480px]">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Pergunte ao EcoBot</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tire dúvidas ecológicas complexas enviadas direto para o modelo inteligente do Gemini API</p>
                </div>

                {/* Pre-formatted prompt buttons for quick user discovery */}
                <div className="flex flex-wrap gap-2 py-1.5 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-slate-400 self-center uppercase mr-1">Sugestões:</span>
                  <button
                    onClick={() => handlePresetQuery("Pilhas velhas vazando podem ser recicladas no lixo comum?")}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full p-1.5 px-3 transition-all cursor-pointer"
                  >
                    🔋 Pilhas & Baterias
                  </button>
                  <button
                    onClick={() => handlePresetQuery("Quais plásticos não são recicláveis no Brasil?")}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full p-1.5 px-3 transition-all cursor-pointer"
                  >
                    🥤 Plásticos rústicos
                  </button>
                  <button
                    onClick={() => handlePresetQuery("Como fazer compostagem eficiente no meu apartamento?")}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full p-1.5 px-3 transition-all cursor-pointer"
                  >
                    🌱 Compostagem doméstica
                  </button>
                </div>

                {/* Chat output thread */}
                <div className="flex-1 max-h-[300px] overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col scrollbar-thin">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${msg.role === "user" ? "bg-emerald-600 text-white self-end rounded-br-none" : "bg-white text-slate-800 border border-slate-200 self-start rounded-bl-none shadow-sm"}`}
                    >
                      <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                      <div className={`text-[9px] text-right mt-1 font-bold ${msg.role === "user" ? "text-emerald-100" : "text-slate-400"}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  ))}
                  {isChatSending && (
                    <div className="max-w-[40%] bg-white text-slate-500 border border-slate-200 self-start rounded-2xl rounded-bl-none p-3 shadow-xs flex items-center justify-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat form controls */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2.5 mt-auto">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Tire suas dúvidas ou comente um tipo de embalagem..."
                    className="flex-1 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white text-xs p-3 px-4 rounded-2xl font-semibold outline-none transition duration-150"
                  />
                  <button
                    type="submit"
                    disabled={isChatSending || !userQuery.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-sm p-3 px-5 rounded-2xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Recycled Progress Activity History list */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-md font-black text-slate-800">Seu Diário de Descarte Ecológico</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Histórico das atividades domésticas registradas</p>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/70 p-1 px-3 rounded-full">
                  {logs.length} descartados
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">
                  Nenhum registro de reciclagem recente. Use o Scanner para registrar e somar pontos! 🌱
                </div>
              ) : (
                <div className="divide-y divide-gray-100 py-1 max-h-[220px] overflow-y-auto">
                  {logs.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 hover:bg-emerald-50/20 px-1 rounded-lg transition duration-150">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                          {item.category === "plástico" && "🥤"}
                          {item.category === "papel" && "📦"}
                          {item.category === "vidro" && "🍾"}
                          {item.category === "metal" && "🥫"}
                          {item.category === "orgânico" && "🍎"}
                          {item.category === "eletrônicos" && "💻"}
                          {item.category === "perigoso" && "🔋"}
                          {!["plástico", "papel", "vidro", "metal", "orgânico", "eletrônicos", "perigoso"].includes(item.category) && "♻️"}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">{item.itemName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-black uppercase p-0.5 px-1.5 rounded ${getCategoryThemeColor(item.category)}`}>
                              {item.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">gravado às {item.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-black text-emerald-800 bg-emerald-50 p-1.5 px-3 rounded-lg border border-emerald-150">
                        +{item.impactPoints} EP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT CHUNKS (Points of disposal list with Live GPS & Gamified achievements boards) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
            
            {/* Map point locator following Sky-blue vibrant design guidelines */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-sky-100">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                    <MapPin className="text-sky-600 w-5 h-5" />
                    Localização e Mapa
                  </h3>
                  <p className="text-xs text-sky-700/80 mt-0.5 font-medium">Veja postos de logística reversa e coleta seletiva</p>
                </div>
                <div className="flex flex-col sm:items-end gap-1.5">
                  <button
                    onClick={handleRequestGPS}
                    className={`text-[10px] font-black uppercase p-1.5 px-3 rounded-full transition-all cursor-pointer ${gpsStatus === "active" ? "bg-sky-500 text-white shadow-xs" : gpsStatus === "searching" ? "bg-sky-100 text-sky-700 animate-pulse" : "bg-sky-100 text-sky-600 hover:bg-sky-200"}`}
                  >
                    {gpsStatus === "active" ? "● GPS Ativo" : gpsStatus === "searching" ? "Sincronizando..." : "Sincronizar GPS"}
                  </button>
                  <button
                    onClick={handleSimulateCabo}
                    className="text-[9px] font-black uppercase p-1 px-2.5 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-all flex items-center gap-1 font-bold"
                    title="Simular coordenadas de Cabo de Santo Agostinho, Pernambuco"
                  >
                    🌴 Cabo de Santo Agostinho (PE)
                  </button>
                </div>
              </div>

              {/* Simplified interactive Map representation canvas */}
              <div className="p-4 min-h-[180px] bg-gradient-to-br from-sky-400/95 to-blue-600 rounded-2xl border-2 border-sky-300 flex flex-col justify-between text-white relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                
                {/* Visual pins represent status */}
                <div className="absolute top-1/3 left-1/4 animate-bounce bg-white text-slate-800 text-[10px] p-1 px-2.5 rounded-full font-black shadow-lg">
                  📍 Ecoponto Centro
                </div>
                <div className="absolute top-1/2 left-2/3 animate-bounce [animation-delay:0.2s] bg-white text-slate-800 text-[10px] p-1 px-2.5 rounded-full font-black shadow-lg">
                  📍 Coleta Seletiva Cabo
                </div>
                {userLocation && (
                  <div className="absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-400 text-white text-[10px] p-1 px-2 rounded-full font-black shadow-lg animate-pulse flex items-center gap-1 border border-white">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    Sua Posição GPS
                  </div>
                )}

                <div className="relative z-10">
                  <p className="text-xs font-black tracking-wider uppercase">Visualizador de Logística Reversa</p>
                  <p className="text-[10px] text-sky-100/90 mt-1.5 leading-relaxed font-semibold">
                    {userLocation 
                      ? "Seu GPS está ativo! Clique no botão abaixo para traçar a melhor rota para ecopontos e postos de descarte no Cabo de Santo Agostinho." 
                      : "Sincronize seu GPS com o Cabo de Santo Agostinho para visualizar locais de descarte para eletrônicos, pilhas, óleo usado, vidro e outros materiais."
                    }
                  </p>
                </div>

                <a
                  href={userLocation 
                    ? `https://www.google.com/maps/search/?api=1&query=ecoponto+reciclagem+coleta+seletiva&location=${userLocation.latitude},${userLocation.longitude}`
                    : "https://www.google.com/maps/search/?api=1&query=ecoponto+reciclagem+coleta+seletiva+cabo+de+santo+agostinho"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-sky-50 text-sky-800 font-extrabold text-xs uppercase tracking-wide p-3 rounded-xl text-center shadow-md transition-all block mt-4 z-10 cursor-pointer"
                >
                  Abrir no Google Maps 🗺️
                </a>
              </div>
            </div>

            {/* Gamified Achievements board wrapper */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-900 to-purple-950 rounded-[2.5rem] p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-md font-black tracking-tight flex items-center gap-1.5">
                    <Award className="text-emerald-300 w-5 h-5 animate-pulse" />
                    Quadro de Conquistas
                  </h3>
                  <p className="text-[10px] text-indigo-200 mt-0.5">Vire mestre do lixo acumulando vitórias</p>
                </div>
                
                {/* Micro progression counts */}
                <span className="text-[10px] font-black uppercase p-1 px-2.5 rounded-full bg-indigo-950/80 border border-indigo-700">
                  {achievements.filter(a => a.unlockedAt).length} / {achievements.length} Desbloqueados
                </span>
              </div>

              {/* Scalable Achievement items list */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {achievements.map((ach) => {
                  const isLocked = !ach.unlockedAt;
                  return (
                    <div
                      key={ach.id}
                      className={`p-3.5 rounded-2xl border transition duration-150 flex items-center justify-between gap-3 ${isLocked ? "bg-indigo-950/40 border-indigo-900/60 opacity-60" : "bg-white/10 border-indigo-500/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl font-bold text-lg flex items-center justify-center ${isLocked ? "bg-indigo-950 text-indigo-400" : "bg-gradient-to-br from-yellow-400 to-amber-500 text-indigo-950 shadow-md animate-bounce"}`}>
                          {ach.iconName === "Leaf" && "🌱"}
                          {ach.iconName === "Droplet" && "💧"}
                          {ach.iconName === "Flame" && "🔥"}
                          {ach.iconName === "Sparkles" && "✨"}
                          {ach.iconName === "Trees" && "🌲"}
                          {ach.iconName === "Award" && "🏆"}
                          {ach.iconName === "ShieldAlert" && "🛡️"}
                        </div>

                        <div>
                          <p className="text-xs font-extrabold">{ach.title}</p>
                          <p className="text-[10px] text-indigo-200/80 mt-0.5 leading-snug font-medium">{ach.description}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isLocked ? (
                          <div className="text-[9px] font-black text-indigo-300 uppercase tracking-wider">
                            Requer {ach.pointsRequired} EP
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-950/80 p-0.5 px-1.5 rounded-full border border-emerald-500/20">
                            Liberado em {ach.unlockedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </main>

        {/* Dynamic educational footer */}
        <footer className="mt-8 border-t border-emerald-200 pt-6 flex flex-col md:flex-row items-center justify-between text-center gap-4">
          <p className="text-[11px] text-slate-500 font-bold max-w-md md:text-left leading-relaxed">
            🌿 O <strong>EcoBot</strong> é um ecossistema educativo para incentivar o cumprimento da Política Nacional de Resíduos Sólidos (Lei nº 12.305/10) nas habitações urbanas do Brasil.
          </p>

          <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-wider">
            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
              SISTEMA INTEGRADO DE COLETA
            </span>
          </div>
        </footer>

        {/* Popup friendly tutorial module */}
        {isTutorialOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 md:p-8 shadow-2xl border-2 border-emerald-100 flex flex-col gap-5 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-gray-150">
                <div className="flex items-center gap-2">
                  <Leaf className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-xl font-extrabold text-slate-900">Como funciona o EcoBot?</h3>
                </div>
                <button
                  onClick={() => setIsTutorialOpen(false)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600 font-semibold leading-relaxed">
                <p>O EcoBot simplifica a triagem e descarte de materiais do seu lar usando inteligência computacional avançada:</p>
                
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 text-2xl text-center">📸</div>
                  <div className="col-span-10">
                    <p className="font-extrabold text-slate-950">1. Escaneie ou Envie uma Foto</p>
                    <p className="text-slate-500 mt-0.5">Tire foto de pacotes, latinhas, caixas de papelão ou pilhas para que o Gemini identifique o tipo de material instantaneamente.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 text-2xl text-center">🧼</div>
                  <div className="col-span-10">
                    <p className="font-extrabold text-slate-950">2. Realize a Preparação do Lixo</p>
                    <p className="text-slate-500 mt-0.5">A IA indicará regras de como esvaziar, amassar ou lavar o item para garantir que ele não contamine os demais e seja passível de triagem pelas cooperativas parceiras.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 text-2xl text-center">🏆</div>
                  <div className="col-span-10">
                    <p className="font-extrabold text-slate-950">3. Acumule EcoPontos (EP) & Compartilhe</p>
                    <p className="text-slate-500 mt-0.5">Ganhe pontuação, desbloqueie medalhas exclusivas na sua aba e compartilhe seu desempenho sustentável com amigos no WhatsApp para influenciá-los de forma sadia.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 text-2xl text-center">📍</div>
                  <div className="col-span-10">
                    <p className="font-extrabold text-slate-950">4. Ache Postos por GPS</p>
                    <p className="text-slate-500 mt-0.5">Use o localizador nativo GPS para encontrar postos de recebimento especiais que recolhem vidros quebrados, baterias ácidas ou restos hortifrutis.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsTutorialOpen(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm py-3 px-6 rounded-2xl shadow-lg transition duration-150 mt-2"
              >
                Compreendi! Vamos Reciclar 🌱
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
