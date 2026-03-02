const PRICES_URL = "https://interview.switcheo.com/prices.json";
const ICON_BASE =
  "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens";

// Simulated user balances
const MOCK_BALANCES: Record<string, number> = {
  ETH: 2.8989,
  USDC: 1250.5,
  WBTC: 0.0452,
  ATOM: 134.7,
  OSMO: 890.3,
  LUNA: 500.0,
  UST: 1000.0,
  SWTH: 45000.0,
  BUSD: 750.25,
  BNB: 3.14,
  MATIC: 520.8,
  SOL: 8.91,
  AVAX: 22.4,
  DAI: 400.0,
  BLUR: 1200.0,
  RATOM: 50.0,
  STEVMOS: 300.0,
  STOSMO: 180.0,
  STATOM: 60.0,
};

export { ICON_BASE, MOCK_BALANCES, PRICES_URL };
