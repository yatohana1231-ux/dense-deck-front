// src/game/allowed.ts

import rawAllowed from "./allowedHands.json.js";
import type { Card } from "../components/cards.js"
import { getHandClass } from "./getHandClass.js";

// allowedHands.json 縺ｮ蝙・
type ModeEntry =
  | boolean
  | {
      superDense?: boolean;
      // 莉悶・繝｢繝ｼ繝会ｼ・ormalDense 縺ｪ縺ｩ・峨ｂ蟆・擂蜈･繧区Φ螳・
      [mode: string]: boolean | undefined;
    };

const allowed = rawAllowed as Record<string, ModeEntry>;

export function isAllowedHand(c1: Card, c2: Card): boolean {
  const cls = getHandClass(c1, c2);
  const entry = allowed[cls];

  // 繧ｭ繝ｼ縺昴・繧ゅ・縺悟ｭ伜惠縺励↑縺・竊・荳崎ｨｱ蜿ｯ謇ｱ縺・
  if (entry === undefined) return false;

  // 蛟､縺・boolean 縺ｮ蝣ｴ蜷茨ｼ医す繝ｳ繝励Ν迚・SON縺ｫ繧ょｯｾ蠢懶ｼ・
  if (typeof entry === "boolean") return entry;

  // 繝｢繝ｼ繝我ｻ倥″蠖｢蠑上・蝣ｴ蜷医・ superDense 繧定ｦ九ｋ
  return !!entry.superDense;
}

