/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Check,
  Share2,
  Trash2,
  Share,
} from "lucide-react";
import { WasteAnalysis } from "../types";

interface ImageAnalyzerProps {
  onLogWaste: (waste: WasteAnalysis, customImageUrl?: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

// Preset list of common items allowing instantaneous, stunning demo experience
const DEMO_PRESETS = [
  {
    name: "Garrafa Plástica PET",
    type: "photo",
    category: "plástico",
    imageUrl: "https://images.unsplash.com/photo-1533813538342-031847634d8e?auto=format&fit=crop&w=500&q=80",
    description: "Garrafa de plástico transparente vazia",
    promptText: "Garrafa de plástico PET amassada de refrigerante",
  },
  {
    name: "Caixa de Papelão de Pizza",
    type: "photo",
    category: "papel",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
    description: "Caixa de pizza amassada com manchas leves de gordura",
    promptText: "Caixa de pizza de papelão ondulado com resíduo leve",
  },
  {
    name: "Garrafas Vazias de Vidro",
    type: "photo",
    category: "vidro",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=500&q=80",
    description: "Garrafas de vidro vazias de cerveja ou suco",
    promptText: "Garrafas de vidro verde e âmbar vazias de bebidas",
  },
  {
    name: "Pilhas Alacalinas Usadas",
    type: "photo",
    category: "perigoso",
    imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=500&q=80",
    description: "Pilhas gastas AA e AAA para descarte",
    promptText: "Pilhas alcalinas cilíndricas comuns usadas",
  }
];

export default function ImageAnalyzer({ onLogWaste, isLoading, setIsLoading }: ImageAnalyzerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<WasteAnalysis | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preset" | "upload" | "camera">("preset");
  const [checkedRules, setCheckedRules] = useState<boolean[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Styling category color scheme in Portuguese
  const getCategoryStyles = (category: string) => {
    const c = category.toLowerCase();
    if (c === "plástico" || c === "plastico") return { bg: "bg-red-50 text-red-700 border-red-200", badge: "bg-red-500", ptColor: "text-red-600", border: "border-red-400" };
    if (c === "papel") return { bg: "bg-blue-50 text-blue-700 border-blue-200", badge: "bg-blue-500", ptColor: "text-blue-600", border: "border-blue-400" };
    if (c === "vidro") return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "bg-emerald-500", ptColor: "text-emerald-600", border: "border-emerald-400" };
    if (c === "metal") return { bg: "bg-yellow-50 text-yellow-800 border-yellow-200", badge: "bg-yellow-500", ptColor: "text-yellow-600", border: "border-yellow-400" };
    if (c === "orgânico" || c === "organico") return { bg: "bg-amber-800/10 text-amber-900 border-amber-300", badge: "bg-amber-700", ptColor: "text-amber-700", border: "border-amber-500" };
    if (c === "eletrônicos" || c === "eletronicos") return { bg: "bg-purple-50 text-purple-700 border-purple-200", badge: "bg-purple-500", ptColor: "text-purple-600", border: "border-purple-400" };
    if (c === "perigoso") return { bg: "bg-orange-50 text-orange-700 border-orange-200", badge: "bg-orange-500", ptColor: "text-orange-600", border: "border-orange-400" };
    return { bg: "bg-gray-100 text-gray-700 border-gray-200", badge: "bg-gray-500", ptColor: "text-gray-600", border: "border-gray-400" };
  };

  // Convert image URL directly to Base64 for processing or use base64 output
  const fetchLocalImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Call search & analyze API
  const handleAnalyzeImage = async (base64String: string) => {
    setIsLoading(true);
    setErrorStatus(null);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/recicla/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType: "image/jpeg"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Erro no processamento da imagem.");
      }

      const data = await response.json() as WasteAnalysis;
      setAnalysisResult(data);
      setCheckedRules(new Array(data.disposalInstructions.length).fill(false));
    } catch (err: any) {
      console.error(err);
      setErrorStatus(
        err.message || "Não foi possível contatar o servidor inteligente. Verifique se configurou a GEMINI_API_KEY."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Preset Selection Click
  const handleSelectPreset = async (preset: typeof DEMO_PRESETS[0]) => {
    setSelectedImage(preset.imageUrl);
    setIsLoading(true);
    try {
      const base64 = await fetchLocalImageAsBase64(preset.imageUrl);
      await handleAnalyzeImage(base64);
    } catch (e) {
      setErrorStatus("Erro ao converter preset carregado.");
      setIsLoading(false);
    }
  };

  // File Selector Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      handleAnalyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Web camera activation
  const startCamera = async () => {
    setIsCameraActive(true);
    setErrorStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Erro câmera:", err);
      setIsCameraActive(false);
      setErrorStatus("Não foi possível acessar a câmera do dispositivo. Conceda as e experimente fazer o upload em arquivos.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64 = canvas.toDataURL("image/jpeg");
        setSelectedImage(base64);
        stopCamera();
        handleAnalyzeImage(base64);
      }
    }
  };

  // Disposal Rules Checkbox Toggle
  const handleToggleRule = (index: number) => {
    const updated = [...checkedRules];
    updated[index] = !updated[index];
    setCheckedRules(updated);
  };

  // Record proper disposal action inside parent state (rewards)
  const handleConfirmDisposal = () => {
    if (!analysisResult) return;
    onLogWaste(analysisResult, selectedImage || undefined);
    
    // Clear state after logging to let them do another
    setAnalysisResult(null);
    setSelectedImage(null);
  };

  // Mock social share
  const handleShareResult = () => {
    if (!analysisResult) return;
    const text = `♻️ Acabei de usar o EcoBot para destinar corretamente um(a) "${analysisResult.itemName}" e ganhei +${analysisResult.impactPoints} EcoPontos! Faça parte você também por uma cidade sustentável! 🌎 #ReciclagemSustentavel #EcoBot`;
    navigator.clipboard.writeText(text);
    alert("Copiado com sucesso para a área de transferência! Compartilhe nas suas redes sociais favoritos. 🌱");
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 flex flex-col gap-6" id="recicla-scanner-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" />
            Scanner Inteligente EcoBot
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Descubra a reciclabilidade do material instantaneamente
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => { setActiveTab("preset"); stopCamera(); }}
            className={`p-2 px-3 rounded-lg transition-all ${activeTab === "preset" ? "bg-white text-emerald-800 shadow" : "text-gray-500 hover:text-gray-800"}`}
          >
            Presets Rápidos
          </button>
          <button
            onClick={() => { setActiveTab("upload"); stopCamera(); }}
            className={`p-2 px-3 rounded-lg transition-all ${activeTab === "upload" ? "bg-white text-emerald-800 shadow" : "text-gray-500 hover:text-gray-800"}`}
          >
            Enviar Foto
          </button>
          <button
            onClick={() => { setActiveTab("camera"); startCamera(); }}
            className={`p-2 px-3 rounded-lg transition-all ${activeTab === "camera" ? "bg-white text-emerald-800 shadow" : "text-gray-500 hover:text-gray-800"}`}
          >
            Câmera Direta
          </button>
        </div>
      </div>

      {errorStatus && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-800 rounded-2xl text-xs flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Dificuldade ao Comunicar com o Google Gemini</p>
            <p className="mt-1 text-red-700/90 leading-relaxed">{errorStatus}</p>
          </div>
        </div>
      )}

      {/* Main interactive workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100 min-h-[300px]">
          {/* Tab Content Display */}
          {activeTab === "preset" && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-center text-gray-500 mb-4 font-medium bg-emerald-50 text-emerald-800 p-2 rounded-xl">
                  Selecione um exemplo abaixo para simular a resposta imediata da inteligência artificial:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {DEMO_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreset(p)}
                      className={`relative group rounded-xl overflow-hidden border-2 text-left h-28 hover:scale-[1.02] active:scale-95 transition-all outline-none ${selectedImage === p.imageUrl ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-transparent"}`}
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent p-2.5 flex flex-col justify-end">
                        <span className="font-bold text-white text-xs line-clamp-1 leading-snug">{p.name}</span>
                        <span className="text-[10px] text-emerald-300 font-bold capitalize mt-0.5 tracking-wide bg-emerald-950/40 self-start p-0.5 px-2 rounded-full border border-emerald-500/20">{p.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-4">
                Previsões reais requerem sua GEMINI_API_KEY ativa em segredos.
              </p>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="flex-1 flex flex-col justify-center items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex-1 border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors rounded-2xl flex flex-col justify-center items-center p-6 text-center cursor-pointer bg-white"
              >
                <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 mb-3 group-hover:scale-110 transition duration-300">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-800 text-sm">Arraste ou clique para enviar foto</p>
                <p className="text-xs text-gray-400 mt-1.5 max-w-[200px]">Suporta PNG, JPEG obtidos da sua galeria de lixo limpo.</p>
              </div>
            </div>
          )}

          {activeTab === "camera" && (
            <div className="flex-1 flex flex-col justify-center items-center">
              {isCameraActive ? (
                <div className="relative w-full aspect-video rounded-xl bg-black overflow-hidden border border-gray-200">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                    <button
                      onClick={capturePhoto}
                      className="bg-emerald-600 hover:bg-emerald-500 hover:scale-105 text-white font-bold text-xs p-3 px-5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Capturar Foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs p-3 px-4 rounded-full shadow"
                    >
                      Desligar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 flex flex-col items-center">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <button
                    onClick={startCamera}
                    className="bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] text-white font-bold text-sm p-3 px-6 rounded-2xl shadow-md transition-all flex items-center gap-2"
                  >
                    Ativar Câmera Remota
                  </button>
                  <p className="text-xs text-gray-400 mt-2 max-w-[220px]">
                    Ative a câmera para digitalizar embalagens de descarte doméstico no seu celular ou webcam.
                  </p>
                </div>
              )}
              {/* Invisible support canvases */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Scanned Image Preview */}
          {selectedImage && (
            <div className="mt-4 border-t border-gray-150 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">Item Carregado Atualmente:</span>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysisResult(null);
                    setErrorStatus(null);
                  }}
                  className="text-red-500 hover:text-red-700 p-1 text-xs font-bold hover:bg-red-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </button>
              </div>
              <div className="mt-2 rounded-xl h-24 overflow-hidden relative border border-gray-200">
                <img
                  src={selectedImage}
                  alt="Scanned Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col justify-center items-center text-white">
                    <div className="w-7 h-7 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-emerald-300 mt-2 tracking-wider animate-pulse uppercase">IA Lendo Material...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Results (Analysis results display) */}
        <div className="lg:col-span-7 flex flex-col justify-center bg-gray-50/50 rounded-2xl p-5 border border-dashed border-gray-200 min-h-[300px]">
          {isLoading && !analysisResult ? (
            <div className="text-center p-8 flex flex-col items-center">
              <p className="text-sm font-semibold text-emerald-800 animate-pulse">Consultando Redes Neurais do EcoBot...</p>
              <div className="w-full max-w-xs bg-gray-200 h-1.5 rounded-full overflow-hidden mt-4">
                <div className="bg-emerald-500 h-full animate-infinite-loading rounded-full"></div>
              </div>
              <p className="text-[11px] text-gray-400 mt-3 max-w-[260px] leading-relaxed">
                Nós enviamos a imagem de resíduo para o Gemini, classificando-a e organizando as diretrizes de destinação segura. Isso pode demorar de 2 a 4 segundos.
              </p>
            </div>
          ) : analysisResult ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Found Results Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Identificado</span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-150 p-0.5 px-2 rounded-full">
                      Atacado em {analysisResult.confidence}% confiânça
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mt-1 tracking-tight leading-tighter">
                    {analysisResult.itemName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Material composto: <span className="font-semibold text-gray-700">{analysisResult.material}</span>
                  </p>
                </div>

                {/* Recyclability status badge & points */}
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold uppercase p-1.5 px-3 rounded-full border ${getCategoryStyles(analysisResult.category).bg}`}>
                    {analysisResult.category}
                  </span>
                  <div className="text-sm font-extrabold text-emerald-600 flex items-center gap-1 mt-1 bg-emerald-50 p-1 px-2.5 rounded-lg border border-emerald-200">
                    +{analysisResult.impactPoints} EP
                  </div>
                </div>
              </div>

              {/* Instructions checklist wrapper */}
              <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
                    Regras Práticas de Preparo (Marque todas para descartar!)
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {checkedRules.filter(Boolean).length} / {checkedRules.length} Realizados
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-1.5">
                  {analysisResult.disposalInstructions.map((instruction, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleToggleRule(idx)}
                      className={`flex items-start text-left gap-3 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition duration-150 ${checkedRules[idx] ? "bg-emerald-50/50 border-emerald-200 text-emerald-900" : "bg-gray-50 border-gray-150 text-gray-700 hover:bg-gray-100"}`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${checkedRules[idx] ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-300"}`}>
                        {checkedRules[idx] && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="leading-relaxed">{instruction}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upcycling Creative suggestions */}
              <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-4 rounded-xl border border-emerald-500/10 shadow-xs relative">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Eco-Dica Reuso & Upcycling
                </p>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed mt-2 italic bg-white/65 p-2 px-3 rounded-lg border border-emerald-500/5">
                  "{analysisResult.alternativeSuggestions}"
                </p>
              </div>

              {/* Reward Actions */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 mt-1 pt-1.5 border-t border-gray-100">
                <button
                  onClick={handleConfirmDisposal}
                  disabled={!checkedRules.every(Boolean)}
                  className={`w-full sm:flex-1 py-3 px-6 rounded-2xl font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${checkedRules.every(Boolean) ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01]" : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"}`}
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  {checkedRules.every(Boolean) ? "Registrar e Ganhar EcoPontos!" : "Complete as etapas de preparo"}
                </button>
                <button
                  onClick={handleShareResult}
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Compartilhar resultado de reciclagem amigo da natureza"
                >
                  <Share2 className="w-4.5 h-4.5" /> Compartilhar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 flex flex-col items-center">
              <div className="p-4 bg-emerald-50/70 text-emerald-800 rounded-full mb-3">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-sm">Aguardando Captura de Imagem</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                Ative a câmera directa, envie um arquivo de imagem da sua galeria de lixo ou escolha um dos presets de teste para desbloquear a análise inteligente de material do EcoBot.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
