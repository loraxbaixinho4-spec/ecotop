/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Achievement, RecyclingPoint } from "../types";

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_of_many",
    title: "Primeiro Passo Verde",
    description: "Identifique e descarte corretamente o seu primeiro resíduo doméstico.",
    pointsRequired: 15,
    iconName: "Leaf",
  },
  {
    id: "plastic_protector",
    title: "Protetor dos Oceanos",
    description: "Recicle pelo menos 3 itens de plástico para salvar a vida marinha.",
    pointsRequired: 45,
    iconName: "Droplet",
    categoryMatch: "plástico",
  },
  {
    id: "metal_master",
    title: "Mestre do Metal",
    description: "Recicle alumínio ou metais e ajude a economizar energia de extração.",
    pointsRequired: 80,
    iconName: "Flame",
    categoryMatch: "metal",
  },
  {
    id: "glass_guardian",
    title: "Guardião do Cristal",
    description: "Ajude na reciclagem infinita recolhendo e descartando materiais de vidro.",
    pointsRequired: 120,
    iconName: "Sparkles",
    categoryMatch: "vidro",
  },
  {
    id: "paper_patrol",
    title: "Patrulheiro das Florestas",
    description: "Acumule pontos separando papéis e papelão para preservar árvores.",
    pointsRequired: 150,
    iconName: "Trees",
    categoryMatch: "papel",
  },
  {
    id: "eco_champion",
    title: "Campeão Ecológico",
    description: "Atinja o nível máximo alcançando uma pontuação de descarte exemplar.",
    pointsRequired: 300,
    iconName: "Award",
  },
  {
    id: "hazardous_hero",
    title: "Herói Ambiental",
    description: "Encaminhe um descarte complexo ou perigoso (como pilha ou eletrônico) de forma inteligente.",
    pointsRequired: 200,
    iconName: "ShieldAlert",
  }
];

// Mock recycling points in SP / Rio / Cabo de Santo Agostinho that will be dynamically adjusted by distance if Geolocation is active
export const MOUNTED_RECYCLING_POINTS: RecyclingPoint[] = [
  {
    id: "pt_cabo_1",
    name: "Ecoponto Cabo - Centro",
    address: "Rua Dr. Júlio César, s/n - Centro, Cabo de Santo Agostinho - PE",
    latitude: -8.2885,
    longitude: -35.0332,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal"],
    phone: "(81) 3521-6701",
  },
  {
    id: "pt_cabo_2",
    name: "Associação de Catadores Recicla Cabo",
    address: "Distrito Industrial, Cabo de Santo Agostinho - PE",
    latitude: -8.2910,
    longitude: -35.0210,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal", "eletrônicos", "perigoso"],
    phone: "(81) 98765-4321",
  },
  {
    id: "pt_cabo_3",
    name: "Ecoponto Ponte dos Carvalhos",
    address: "Av. Prefeito Diomedes Ferreira de Melo, s/n - Ponte dos Carvalhos, Cabo de Santo Agostinho - PE",
    latitude: -8.2190,
    longitude: -35.0040,
    acceptedMaterials: ["plástico", "papel", "metal", "eletrônicos"],
    phone: "(81) 3521-6899",
  },
  {
    id: "pt_cabo_4",
    name: "Ponto de Entrega Voluntária (PEV) - Cohab",
    address: "Rua 55, s/n - Cohab, Cabo de Santo Agostinho - PE",
    latitude: -8.2750,
    longitude: -35.0110,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal"],
    phone: "(81) 3521-6700",
  },
  {
    id: "pt_sp_1",
    name: "Estação Recicla Sampa - Pinheiros",
    address: "Rua Sumidouro, 412 - Pinheiros, São Paulo - SP",
    latitude: -23.5684,
    longitude: -46.7022,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal"],
    phone: "(11) 3032-1544",
  },
  {
    id: "pt_sp_2",
    name: "Ecoponto Vila Mariana",
    address: "Rua Teresa Mestriner, s/n - Vila Mariana, São Paulo - SP",
    latitude: -23.5852,
    longitude: -46.6341,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal", "eletrônicos"],
    phone: "(11) 5082-2015",
  },
  {
    id: "pt_sp_3",
    name: "Ponto Verde - Jardins",
    address: "Alameda Lorena, 1421 - Jardins, São Paulo - SP",
    latitude: -23.5645,
    longitude: -46.6628,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal", "orgânico"],
    phone: "(11) 3088-9922",
  },
  {
    id: "pt_rj_1",
    name: "Coleta Seletiva Light Recicla - Copacabana",
    address: "Praça Serzedelo Correia, s/n - Copacabana, Rio de Janeiro - RJ",
    latitude: -22.9692,
    longitude: -43.1855,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal"],
    phone: "(21) 2256-4011",
  },
  {
    id: "pt_rj_2",
    name: "Ecoponto Lagoa",
    address: "Avenida Borges de Medeiros, 2111 - Lagoa, Rio de Janeiro - RJ",
    latitude: -22.9721,
    longitude: -43.2104,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal", "eletrônicos", "perigoso"],
    phone: "(21) 3204-1800",
  },
  {
    id: "pt_br_default",
    name: "EcoCentro Comunitário Central",
    address: "Av. Central Municipal, s/n - Centro de Coleta Seletiva",
    latitude: -23.5489, // fallback center
    longitude: -46.6388,
    acceptedMaterials: ["plástico", "papel", "vidro", "metal", "eletrônicos", "perigoso", "orgânico"],
    phone: "0800-722-1321",
  }
];
