export type Mode = "dense" | "superDense";

export type DealRequest = {
  playerOrder: number[];
  mode: Mode;
};

export type DealResponse = {
  handId: string;
  mode: Mode;
  seatCount: number;
  playerOrder: number[];
  hands: string[][]; // ["As","Kd"]
  boardReserved?: string[]; // ["As","Kd", ...] length 10 expected
};

// APIは同一ドメイン配下で /api/* にルーティングされる前提
export async function dealFromApi(req: DealRequest): Promise<DealResponse> {
  const res = await fetch("/api/deal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seatCount: req.playerOrder.length,
      playerOrder: req.playerOrder,
      mode: req.mode,
      // サーバ側は boardReserved を string[] でも受けられるようにしてないので
      // ここは一旦 "As" へ変換して送る（下の helper を使用）
      //boardReserved: (req.boardReserved ?? []).map((c) => `${c.rank}${c.suit}`),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`dealFromApi failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as Partial<DealResponse>;
  if (!Array.isArray(data.hands)) {
    throw new Error("dealFromApi failed: hands not returned from API");
  }
  return data as DealResponse;
}
