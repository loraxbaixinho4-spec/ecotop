/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Leaf, Award, Flame, RotateCcw, HelpCircle } from "lucide-react";

interface HeaderProps {
  totalPoints: number;
  streakDays: number;
  onResetState: () => void;
  onOpenTutorial: () => void;
}

export default function Header({
  totalPoints,
  streakDays,
  onResetState,
  onOpenTutorial,
}: HeaderProps) {
  // Determine eco level classification and next level threshold based on points
  let levelTitle = "Eco-Iniciante 🌱";
  let nextLevelPoints = 50;
  let levelPercent = 0;

  if (totalPoints >= 300) {
    levelTitle = "Lenda Ecológica 👑";
    nextLevelPoints = 1000;
    levelPercent = Math.min(100, Math.round((totalPoints / 1000) * 100));
  } else if (totalPoints >= 150) {
    levelTitle = "Guardião da Terra 🌎";
    nextLevelPoints = 300;
    levelPercent = Math.round(((totalPoints - 150) / 150) * 100);
  } else if (totalPoints >= 80) {
    levelTitle = "Defensor Verde 🌿";
    nextLevelPoints = 150;
    levelPercent = Math.round(((totalPoints - 80) / 70) * 100);
  } else if (totalPoints >= 30) {
    levelTitle = "Protetor Ativo 🌻";
    nextLevelPoints = 80;
    levelPercent = Math.round(((totalPoints - 30) / 50) * 100);
  } else {
    levelTitle = "Eco-Iniciante 🌱";
    nextLevelPoints = 30;
    levelPercent = Math.round((totalPoints / 30) * 100);
  }

  return (
    <header className="bg-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-800 relative overflow-hidden transition-all duration-300">
      {/* Background glowing effects to feel modern/premium */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-teal-500/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
        {/* Brand details */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 flex items-center justify-center shadow-inner animate-pulse">
            <Leaf className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-green-100 bg-clip-text text-transparent">
              EcoBot
            </h1>
            <p className="text-emerald-300/80 text-sm mt-1 font-medium">
              Reciclagem Inteligente & Gamificada
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Flame streak */}
          <div className="bg-emerald-900/60 backdrop-blur-md rounded-2xl p-3 px-5 border border-emerald-500/20 flex items-center gap-3 shadow-md">
            <div className="p-1.5 bg-orange-500/20 rounded-lg">
              <Flame className="w-6 h-6 text-orange-400 animate-bounce" />
            </div>
            <div>
              <div className="text-xs text-orange-200 font-bold uppercase tracking-wider">Streak</div>
              <div className="text-lg font-extrabold text-white">{streakDays} {streakDays === 1 ? 'Dia' : 'Dias'} Seguidos</div>
            </div>
          </div>

          {/* User total points */}
          <div className="bg-emerald-900/60 backdrop-blur-md rounded-2xl p-3 px-5 border border-emerald-500/20 flex items-center gap-3 shadow-md">
            <div className="p-1.5 bg-yellow-500/20 rounded-lg">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-xs text-yellow-200 font-bold uppercase tracking-wider">EcoPontos</div>
              <div className="text-lg font-extrabold text-white">{totalPoints} EP</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTutorial}
              title="Como funciona?"
              className="p-3.5 bg-emerald-900/40 hover:bg-emerald-900/80 rounded-2xl text-emerald-200 hover:text-white transition-all duration-200 border border-emerald-800"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onResetState}
              title="Resetar dados locais"
              className="p-3.5 bg-emerald-900/40 hover:bg-red-950/80 hover:text-red-200 rounded-2xl text-emerald-200 hover:border-red-950 transition-all duration-200 border border-emerald-800"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Level classification progress gauge */}
      <div className="mt-6 pt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Rank Atual:</span>
          <span className="font-extrabold text-teal-300 text-sm tracking-wide bg-teal-900/40 p-1 px-3 rounded-full border border-teal-500/20">
            {levelTitle}
          </span>
        </div>

        <div className="flex-1 max-w-md flex items-center gap-4">
          <div className="w-full bg-emerald-950/80 rounded-full h-3 border border-emerald-800 overflow-hidden relative">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(52,211,153,0.3)]"
              style={{ width: `${levelPercent}%` }}
            ></div>
          </div>
          <span className="text-xs text-emerald-300 font-bold whitespace-nowrap">
            {totalPoints} / {nextLevelPoints} EP ({levelPercent}%)
          </span>
        </div>
      </div>
    </header>
  );
}
