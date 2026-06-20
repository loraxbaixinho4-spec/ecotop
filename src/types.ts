/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WasteAnalysis {
  itemName: string;
  material: string;
  recyclable: boolean;
  category: 'plástico' | 'papel' | 'vidro' | 'metal' | 'orgânico' | 'eletrônicos' | 'perigoso' | 'não-reciclável';
  confidence: number;
  disposalInstructions: string[];
  impactPoints: number;
  alternativeSuggestions: string;
}

export interface RecyclingLog {
  id: string;
  timestamp: string;
  itemName: string;
  category: string;
  impactPoints: number;
  imageUrl?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  iconName: string; // lucide icon name
  unlockedAt?: string;
  categoryMatch?: string; // unlocked when recycling specific categories
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface RecyclingPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  acceptedMaterials: string[];
  distance?: number; // state calculated based on user geolocation
  phone?: string;
}
