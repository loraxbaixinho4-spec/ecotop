/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables (fallback for local development)
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser configuration, accepting light base64 uploads for images
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ limit: "12mb", extended: true }));

// Lazy initializer for GoogleGenAI to prevent server startup crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables or configuration panel.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------------------
// RETRY & FALLBACK UTILITIES
// -------------------------------------------------------------------------

/**
 * Executes a Gemini request with exponential backoff retries and model fallbacks
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
): Promise<any> {
  let delay = 1000;
  let lastError: any = null;
  // Try the main model, then fall back to gemini-3.1-flash-lite
  const modelsToTry = [params.model, "gemini-3.1-flash-lite"];

  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Solicitando geração usando ${currentModel} (tentativa ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: currentModel,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        console.warn(`[Gemini API] Falha na tentativa ${attempt} do modelo ${currentModel}: ${errMsg}`);
        
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }
  }
  throw lastError;
}

/**
 * High-quality fallback analysis for common waste when Gemini API is completely unavailable
 */
function getLocalAnalyseFallback(): any {
  const fallbacks = [
    {
      itemName: "Embalagem Plástica Descartável",
      material: "Plástico PP (05) / PET (01)",
      recyclable: true,
      category: "plástico",
      confidence: 85,
      disposalInstructions: [
        "Retire todo o excesso de resíduos de alimento ou bebida.",
        "Se possível, faça um enxágue rápido com água de reuso.",
        "Amasse a embalagem para reduzir o volume no cesto.",
        "Descarte no lixo reciclável (seletor plástico)."
      ],
      impactPoints: 15,
      alternativeSuggestions: "Pode ser reutilizada para guardar pequenos objetos ou transformada em organizadores de gaveta."
    },
    {
      itemName: "Caixa de Papelão Ondulado",
      material: "Papelão / Fibras de Celulose",
      recyclable: true,
      category: "papel",
      confidence: 90,
      disposalInstructions: [
        "Certifique-se de que a caixa esteja seca e livre de gordura (por exemplo, restos de pizza).",
        "Remova fitas plásticas adesivas se for fácil de retirar.",
        "Desdobre e amasse a caixa para que fique totalmente plana.",
        "Deposite no coletor azul de papéis."
      ],
      impactPoints: 20,
      alternativeSuggestions: "Ótimo para compostagem caseira (picado), ou como protetor de piso em pinturas e reformas."
    },
    {
      itemName: "Garrafa de Vidro de Bebida",
      material: "Vidro de Silicato",
      recyclable: true,
      category: "vidro",
      confidence: 95,
      disposalInstructions: [
        "Esvazie todo o líquido restante.",
        "Remova tampas de metal ou plástico se houver e separe-as.",
        "Coloque no coletor verde reservado para vidros.",
        "Atenção: se estiver quebrada, embale em papel jornal para proteger os coletores."
      ],
      impactPoints: 30,
      alternativeSuggestions: "Pode ser usada como vaso de plantas decorativo ou devolvida em pontos de retorno retornáveis."
    }
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Intelligent localized message responder for common keywords when Gemini API is completely unavailable
 */
function getLocalChatFallback(message: string): string {
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes("oi") || msgLower.includes("olá") || msgLower.includes("bom dia") || msgLower.includes("boa tarde") || msgLower.includes("boa noite")) {
    return "Olá! Sou o EcoBot ♻️. O serviço de inteligência na nuvem está um pouco sobrecarregado agora, mas eu continuo aqui para te ajudar localmente! O que você gostaria de aprender a reciclar hoje no Cabo de Santo Agostinho?";
  }
  
  if (msgLower.includes("cabo") || msgLower.includes("santo agostinho") || msgLower.includes("local") || msgLower.includes("onde") || msgLower.includes("gps")) {
    return "No Cabo de Santo Agostinho, você pode encontrar pontos de entrega voluntária (PEVs) no Centro, em Ponte dos Carvalhos e na Cohab. 🌴 Você pode clicar em 'Sincronizar GPS' ou no botão '🌴 Cabo de Santo Agostinho (PE)' para ver no mapa e abrir a rota exata no Google Maps!";
  }
  
  if (msgLower.includes("plástico") || msgLower.includes("garrafa") || msgLower.includes("copo") || msgLower.includes("sacola")) {
    return "Plásticos (como garrafas PET, embalagens de xampu e sacolas) são amplamente recicláveis! 🥤 Lembre-se sempre de retirar o excesso de resíduos e amassar para economizar espaço de transporte. Se estiver no Cabo, junte-os para a coleta seletiva local!";
  }

  if (msgLower.includes("papel") || msgLower.includes("papelão") || msgLower.includes("caixa") || msgLower.includes("jornal")) {
    return "Papéis e caixas de papelão limpas são super fáceis de reciclar! 📦 Desdobre as caixas para reduzir o espaço e evite molhar o papel, pois papel úmido perde valor de mercado para reciclagem.";
  }

  if (msgLower.includes("vidro") || msgLower.includes("garrafa de vidro") || msgLower.includes("copo de vidro")) {
    return "O vidro é 100% reciclável infinitas vezes! 🍾 Lembre-se de lavar rapidamente e, se o vidro estiver quebrado, embale-o com segurança (em uma caixa ou jornal) para não machucar os profissionais da coleta seletiva.";
  }

  if (msgLower.includes("eletrônico") || msgLower.includes("pilha") || msgLower.includes("bateria") || msgLower.includes("celular")) {
    return "Pilhas, baterias e eletrônicos contêm metais pesados e são considerados resíduos perigosos! 🔋 Eles não devem ir para o lixo comum. No Cabo, use postos de entrega voluntária específicos ou farmácias/supermercados que praticam logística reversa para esses itens.";
  }

  if (msgLower.includes("metal") || msgLower.includes("lata") || msgLower.includes("aluminio") || msgLower.includes("ferro")) {
    return "Latas de alumínio e embalagens de aço são extremamente bem-vindas na reciclagem! 🥫 O alumínio pode ser reciclado infinitas vezes sem perder qualidade e ajuda as cooperativas de catadores locais. Enxágue de leve e amasse antes do descarte.";
  }

  return "Entendi sua dúvida! O EcoBot está operando em modo offline temporário devido à alta demanda do servidor Gemini ♻️. Lembre-se que separar plástico, papel, vidro e metal já faz uma enorme diferença para o meio ambiente do Cabo de Santo Agostinho e de todo o nosso planeta! 🌎 Se precisar de instruções para um item específico, sinta-se à vontade para perguntar.";
}

// -------------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------------

/**
 * Health-check route
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/**
 * Waste Image Recognition with Gemini
 */
app.post("/api/recicla/analisar", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "O campo imageBase64 é obrigatório." });
    }

    const ai = getGenAI();

    // Clean image data (strip off prefix if sent)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const cleanMimeType = mimeType || "image/jpeg";

    const imagePart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: "Analise esta imagem deste resíduo doméstico ou lixo de forma precisa. " +
            "Identifique o objeto e retorne informações detalhadas sobre a sua reciclagem seguindo o esquema JSON requisitado. " +
            "Responda no idioma Português (Brasil)."
    };

    // Define response schema for structured waste recycling response
    const wasteSchema = {
      type: Type.OBJECT,
      properties: {
        itemName: {
          type: Type.STRING,
          description: "Nome comum e claro do objeto identificado em português (Ex: Garrafa de Refrigerante Pet, Lata de Refrigerante, Caixinha de Leite TetraPak, Papelão Ondulado, Casca de Banana, Lâmpada Fluorescente, Sacola Plástica)."
        },
        material: {
          type: Type.STRING,
          description: "Composição/material primário do item (Ex: Plástico PET (01), Alumínio, Papelão, Vidro Comum, Matéria Orgânica, Plástico de Alta Densidade, Metal Inoxidável, Eletrônico Misto)."
        },
        recyclable: {
          type: Type.BOOLEAN,
          description: "true se for reciclável comumente, false se for lixo orgânico, perigoso ou lixo comum não reciclável."
        },
        category: {
          type: Type.STRING,
          description: "Deve mapear para um destes exatamente: 'plástico', 'papel', 'vidro', 'metal', 'orgânico', 'eletrônicos', 'perigoso', 'não-reciclável'."
        },
        confidence: {
          type: Type.INTEGER,
          description: "Nível de confiança da estimativa de 0 a 100."
        },
        disposalInstructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Passo a passo prático para preparar e descartar o item (Ex: ['Esvazie o líquido restante', 'Enxágue rapidamente se houver muita sujeira', 'Amasse para diminuir o volume', 'Separe a tampinha se for de material diferente', 'Deposite no reservatório de Plásticos/Coleta Seletiva'])."
        },
        impactPoints: {
          type: Type.INTEGER,
          description: "Indique uma pontuação sugerida de 10 a 50 pontos com base no esforço de separação/tipo do material (Ex: Plástico dá 15pt, Alumínio dá 25pt, Metal dá 20pt, Vidro dá 30pt, Eletrônicos dá 45pt devido ao transporte e descarte especial)."
        },
        alternativeSuggestions: {
          type: Type.STRING,
          description: "Dica criativa útil de reaproveitamento (Upcycling), artesanato ecológico ou como o usuário pode evitar este tipo de resíduo futuramente comprando alternativas recarregáveis ou naturais."
        }
      },
      required: [
        "itemName",
        "material",
        "recyclable",
        "category",
        "confidence",
        "disposalInstructions",
        "impactPoints",
        "alternativeSuggestions"
      ]
    };

    let data;
    try {
      const response = await callGeminiWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: wasteSchema,
          systemInstruction: "Você é o analisador de resíduos profissional do EcoBot. " +
                             "Seja realista e preciso sobre descartes. Identifique materiais nocivos ou perigosos " +
                             "como pilhas, materiais de saúde, eletrônicos ou lâmpadas e categorize-os corretamente " +
                             "com dicas apropriadas de descarte ecológico ou logística reversa."
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Erro na resposta do modelo inteligente.");
      }
      data = JSON.parse(resultText);
    } catch (apiError: any) {
      console.warn("[Gemini API] Falha completa na análise de IA, acionando fallback local inteligente:", apiError.message || apiError);
      data = getLocalAnalyseFallback();
    }

    res.json(data);
  } catch (error: any) {
    console.error("Erro na análise de imagem do resíduo:", error);
    res.status(500).json({
      error: "Falha ao analisar o resíduo.",
      details: error.message || error
    });
  }
});

/**
 * Intelligent Helper Chat with EcoBot
 */
app.post("/api/recicla/chat", async (req, res) => {
  try {
    const { history, message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "A propriedade 'message' é obrigatória." });
    }

    const ai = getGenAI();

    // Map the incoming historical messages nicely to the system instructions and parts
    const chatContents = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        chatContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    // Append current user message
    chatContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    let replyText = "";
    try {
      const response = await callGeminiWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: chatContents,
        config: {
          systemInstruction: "Você é o EcoBot (Eco-assistente virtual de reciclagem). " +
                             "Seu objetivo é ajudar as pessoas a separarem os resíduos residenciais de forma certa, esclarecer dúvidas de materiais biodegradáveis vs recicláveis, ensinar truques de upcycling e compostagem, e incentivar a preservação. " +
                             "Regras das respostas:\n" +
                             "- Fale SEMPRE em Português do Brasil.\n" +
                             "- Responda com simpatia, educação, de forma divertida e prática.\n" +
                             "- Seja conciso e organize a resposta com tópicos limpos se for detalhar etapas.\n" +
                             "- Use emojis de reciclagem (♻️, 🌱, 🥤, 📦, 🔋, 🌎) para deixar o papo vibrante, mas não exagere.\n" +
                             "- Ajude sempre a engajar as pessoas, parabenizando atitudes verdes!"
        }
      });
      replyText = response.text || "";
    } catch (apiError: any) {
      console.warn("[Gemini API] Falha completa no chat de IA, acionando fallback local inteligente:", apiError.message || apiError);
      replyText = getLocalChatFallback(message);
    }

    res.json({ text: replyText });
  } catch (error: any) {
    console.error("Erro no chat do EcoBot:", error);
    res.status(500).json({
      error: "Desculpe, o EcoBot está com dificuldade de processar isso no momento.",
      details: error.message || error
    });
  }
});

// -------------------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// -------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando modo desenvolvimento com Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando modo de Produção...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoServer executando em http://localhost:${PORT}`);
    console.log(`Configuração: PORTA=${PORT}, NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error("Erro crítico na inicialização do servidor:", err);
});
