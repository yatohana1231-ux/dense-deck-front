// src/components/CardBack.tsx
import React from "react";

const CardBack: React.FC = () => {
  return (
    <div className="w-14 h-20 rounded-2xl border border-slate-500 bg-slate-700 shadow-md flex items-center justify-center">
      {/* 裏面の模様（お好みで変更可） */}
      <div className="w-8 h-14 rounded-xl bg-slate-500/50" />
    </div>
  );
};

export default CardBack;
