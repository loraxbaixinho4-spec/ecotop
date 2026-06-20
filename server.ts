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

    const response = await ai.models.generateContent({
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

    const data = JSON.parse(resultText);
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

    const response = await ai.models.generateContent({
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

    res.json({ text: response.text });
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

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Erro crítico na inicialização do servidor:", err);
  });
}

export default app;
