interface PriceEntry {
  currency: string;
  date: string;
  price: number;
}

interface Token {
  symbol: string;
  price: number;
  iconUrl: string;
  balance: number;
}

export type { PriceEntry, Token };
