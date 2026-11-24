import React from 'react';

export const MapPage: React.FC = () => {
  return (
    <div className="text-center py-12 px-4 bg-white/70 border border-paper-200 rounded-2xl">
      <span className="text-4xl block mb-2">🗺️</span>
      <h2 className="font-serif text-lg font-bold text-amber-950 mb-1">
        思い出の地図
      </h2>
      <p className="text-xs text-stone-500">
        ステップ④でLeaflet地図とコレクションのピン表示を実装します。
      </p>
    </div>
  );
};
