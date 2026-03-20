export type Mode = "dense" | "superDense";

export type DealStreet = 0 | 1 | 2 | 3;

export type DealRequest = {
  handId: string;
  seatCount: number;
  playerOrder: number[];
  mode: Mode;
  street: DealStreet;
};

export type DealPreflopResponse = {
  handId: string;
  mode: Mode;
  seatCount: number;
  playerOrder: number[];
  hands: string[][];
};

export type DealBoardResponse = {
  handId: string;
  mode: Mode;
  seatCount: number;
  playerOrder: number[];
  street: 1 | 2 | 3;
  flopcard: string[];
  turncard: string[];
  rivercard: string[];
};

export type DealResponse = DealPreflopResponse | DealBoardResponse;

type DealErrorPayload = {
  code?: string;
  message?: string;
};

export class DealApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function dealFromApi(req: DealRequest): Promise<DealResponse> {
  const res = await fetch("/api/deal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let payload: DealErrorPayload | null = null;
    try {
      payload = (await res.json()) as DealErrorPayload;
    } catch {
      payload = null;
    }
    const code = payload?.code ?? "HTTP_ERROR";
    const message = payload?.message ?? `dealFromApi failed: ${res.status} ${res.statusText}`;
    throw new DealApiError(res.status, code, message);
  }

  const data = (await res.json()) as Partial<DealResponse>;
  if (req.street === 0) {
    if (!Array.isArray((data as Partial<DealPreflopResponse>).hands)) {
      throw new Error("dealFromApi failed: hands not returned from API");
    }
    return data as DealPreflopResponse;
  }

  if (
    !Array.isArray((data as Partial<DealBoardResponse>).flopcard) ||
    !Array.isArray((data as Partial<DealBoardResponse>).turncard) ||
    !Array.isArray((data as Partial<DealBoardResponse>).rivercard)
  ) {
    throw new Error("dealFromApi failed: board cards not returned from API");
  }
  return data as DealBoardResponse;
}
