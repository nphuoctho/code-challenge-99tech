import { ICON_BASE, MOCK_BALANCES, PRICES_URL } from "./constant";
import { $, formatAmount, formatPrice, hideError, showError } from "./helpers";
import { initTheme, toggleTheme } from "./theme";
import type { PriceEntry, Token } from "./types";

// State

let tokens: Token[] = [];
let fromToken: Token | null = null;
let toToken: Token | null = null;
let activeSelector: "from" | "to" = "from";

// DOM Selector

const fromSymbolEl = $<HTMLSpanElement>("from-symbol");
const toSymbolEl = $<HTMLSpanElement>("to-symbol");
const fromIconEl = $<HTMLDivElement>("from-icon");
const toIconEl = $<HTMLDivElement>("to-icon");
const fromBalanceEl = $<HTMLSpanElement>("from-balance");
const toBalanceEl = $<HTMLSpanElement>("to-balance");
const fromUsdEl = $<HTMLSpanElement>("from-usd");
const toUsdEl = $<HTMLSpanElement>("to-usd");
const fromAmountEl = $<HTMLInputElement>("from-amount");
const toAmountEl = $<HTMLInputElement>("to-amount");
const exchangeRateEl = $<HTMLSpanElement>("exchange-rate");
const swapBtn = $<HTMLButtonElement>("swap-btn");
const swapBtnText = $<HTMLSpanElement>("swap-btn-text");
const swapBtnSpinner = $<HTMLDivElement>("swap-btn-spinner");
const errorMsg = $<HTMLDivElement>("error-msg");
const tokenModal = $<HTMLDivElement>("token-modal");
const tokenList = $<HTMLDivElement>("token-list");
const tokenSearch = $<HTMLInputElement>("token-search");

// Fetch & Initialize

async function fetchPrices(): Promise<void> {
  try {
    const res = await fetch(PRICES_URL);
    const raw: PriceEntry[] = await res.json();

    // Deduplicate: keep most recent entry per currency
    const map = new Map<string, PriceEntry>();
    for (const entry of raw) {
      const existing = map.get(entry.currency);
      if (!existing || new Date(entry.date) > new Date(existing.date)) {
        map.set(entry.currency, entry);
      }
    }

    tokens = Array.from(map.values()).map((entry) => ({
      symbol: entry.currency,
      price: entry.price,
      iconUrl: `${ICON_BASE}/${entry.currency}.svg`,
      balance:
        MOCK_BALANCES[entry.currency] ??
        parseFloat((Math.random() * 100).toFixed(4)),
    }));

    // Default selections: ETH → USDC
    fromToken = tokens.find((t) => t.symbol === "ETH") ?? tokens[0];
    toToken = tokens.find((t) => t.symbol === "USDC") ?? tokens[1];

    renderTokenSelectors();
    updateExchangeRate();
    updateSwapButton();
  } catch (err) {
    showError("Failed to load token prices. Please refresh.", errorMsg);
    console.error(err);
  }
}

// UI Rendering

function renderTokenSelectors(): void {
  if (fromToken) renderTokenBtn("from", fromToken);
  if (toToken) renderTokenBtn("to", toToken);
}

function renderTokenBtn(side: "from" | "to", token: Token): void {
  const symbolEl = side === "from" ? fromSymbolEl : toSymbolEl;
  const iconEl = side === "from" ? fromIconEl : toIconEl;
  const balanceEl = side === "from" ? fromBalanceEl : toBalanceEl;

  symbolEl.textContent = token.symbol;
  balanceEl.textContent = formatAmount(token.balance) + " " + token.symbol;

  iconEl.innerHTML = `<img
    src="${token.iconUrl}"
    alt="${token.symbol}"
    class="w-full h-full object-contain rounded-full"
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
  /><div class="text-[0.6rem] font-bold text-foreground uppercase items-center justify-center" style="display:none">${token.symbol.slice(
    0,
    2
  )}</div>`;
}

function renderTokenList(filter = ""): void {
  const q = filter.toLowerCase().trim();
  const filtered = q
    ? tokens.filter((t) => t.symbol.toLowerCase().includes(q))
    : tokens;

  tokenList.innerHTML = "";

  if (filtered.length === 0) {
    tokenList.innerHTML = `<div class="text-center py-8 text-sm text-muted-foreground">No tokens found</div>`;
    return;
  }

  for (const token of filtered) {
    const item = document.createElement("button");
    item.setAttribute("role", "option");

    const isDisabled =
      (activeSelector === "from" && toToken?.symbol === token.symbol) ||
      (activeSelector === "to" && fromToken?.symbol === token.symbol);

    item.disabled = isDisabled;
    item.className = [
      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-none bg-transparent text-left transition-colors cursor-pointer",
      isDisabled ? "opacity-35 cursor-not-allowed" : "hover:bg-muted",
    ].join(" ");

    item.innerHTML = `
      <div class="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
        <img src="${token.iconUrl}" alt="${token.symbol}"
          class="w-full h-full object-contain rounded-full"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <div class="text-[0.6rem] font-bold text-foreground uppercase text-center items-center justify-center" style="display:none">${token.symbol.slice(
          0,
          2
        )}</div>
      </div>
      <div class="flex flex-col gap-0.5 flex-1">
        <span class="text-[0.9rem] font-semibold text-foreground">${
          token.symbol
        }</span>
        <span class="text-xs text-muted-foreground">$${formatPrice(
          token.price
        )}</span>
      </div>
      <span class="text-[0.8rem] font-medium text-muted-foreground whitespace-nowrap">${formatAmount(
        token.balance
      )}</span>
    `;

    item.addEventListener("click", () => selectToken(token));
    tokenList.appendChild(item);
  }
}

// Token Selection

function openModal(side: "from" | "to"): void {
  activeSelector = side;
  tokenSearch.value = "";
  renderTokenList();
  tokenModal.classList.remove("hidden");
  tokenModal.classList.add("flex", "modal-enter");
  setTimeout(() => tokenSearch.focus(), 50);
}

function closeModal(): void {
  tokenModal.classList.add("hidden");
  tokenModal.classList.remove("flex", "modal-enter");
}

function selectToken(token: Token): void {
  if (activeSelector === "from") {
    // If selecting same token as "to", swap them
    if (toToken?.symbol === token.symbol) toToken = fromToken;
    fromToken = token;
  } else {
    if (fromToken?.symbol === token.symbol) fromToken = toToken;
    toToken = token;
  }

  closeModal();
  renderTokenSelectors();
  recalculate();
  updateExchangeRate();
  updateSwapButton();
}

// Calculation

function recalculate(): void {
  const fromVal = parseFloat(fromAmountEl.value);

  if (!fromToken || !toToken || isNaN(fromVal) || fromVal <= 0) {
    toAmountEl.value = "";
    fromUsdEl.textContent = "≈$ 0.00";
    toUsdEl.textContent = "≈$ 0.00";
    return;
  }

  const fromUsd = fromVal * fromToken.price;
  const toVal = fromUsd / toToken.price;

  toAmountEl.value = toVal.toFixed(6);
  fromUsdEl.textContent = `≈$ ${formatPrice(fromUsd)}`;
  toUsdEl.textContent = `≈$ ${formatPrice(toVal * toToken.price)}`;

  validateInput(fromVal);
}

function updateExchangeRate(): void {
  if (!fromToken || !toToken) {
    exchangeRateEl.textContent = "—";
    return;
  }
  const rate = fromToken.price / toToken.price;
  exchangeRateEl.textContent = `1 ${fromToken.symbol} = ${formatAmount(rate)} ${
    toToken.symbol
  }`;
}

function validateInput(val: number): boolean {
  hideError(errorMsg);

  if (!fromToken || !toToken) return false;

  if (val <= 0) {
    showError("Amount must be greater than 0", errorMsg);
    return false;
  }
  if (val > fromToken.balance) {
    showError(`Insufficient ${fromToken.symbol} balance`, errorMsg);
    return false;
  }

  return true;
}

// Swap Submit

async function handleSwap(): Promise<void> {
  const fromVal = parseFloat(fromAmountEl.value);
  if (!validateInput(fromVal)) return;

  // Loading state
  swapBtn.disabled = true;
  swapBtnText.textContent = "Swapping...";
  swapBtnSpinner.classList.remove("hidden");

  // Simulate backend delay
  await new Promise((r) => setTimeout(r, 1800));

  // Simulate success: update balances
  if (fromToken && toToken) {
    const toVal = parseFloat(toAmountEl.value);
    fromToken.balance -= fromVal;
    toToken.balance += toVal;
    renderTokenSelectors();
  }

  fromAmountEl.value = "";
  toAmountEl.value = "";
  fromUsdEl.textContent = "≈$ 0.00";
  toUsdEl.textContent = "≈$ 0.00";

  // Reset button
  swapBtnSpinner.classList.add("hidden");
  updateSwapButton();

  // Show success flash
  swapBtnText.textContent = "✓ Swap successful!";
  swapBtn.classList.add("swap-success");
  setTimeout(() => {
    swapBtn.classList.remove("swap-success");
    updateSwapButton();
  }, 2000);
}

function updateSwapButton(): void {
  const fromVal = parseFloat(fromAmountEl.value);
  const hasAmount = !isNaN(fromVal) && fromVal > 0;

  if (!fromToken || !toToken) {
    swapBtn.disabled = true;
    swapBtnText.textContent = "Select tokens";
    return;
  }
  if (!hasAmount) {
    swapBtn.disabled = true;
    swapBtnText.textContent = "Enter amount";
    return;
  }
  if (fromVal > fromToken.balance) {
    swapBtn.disabled = true;
    swapBtnText.textContent = `Insufficient ${fromToken.symbol}`;
    return;
  }

  swapBtn.disabled = false;
  swapBtnText.textContent = "Swap";
}

// Direction Swap

function swapDirection(): void {
  [fromToken, toToken] = [toToken, fromToken];
  renderTokenSelectors();
  // Recalc with swapped from amount
  const prevTo = toAmountEl.value;
  fromAmountEl.value = prevTo || "";
  recalculate();
  updateExchangeRate();
  updateSwapButton();

  // Animate the button
  const btn = $<HTMLButtonElement>("swap-direction-btn");
  btn.classList.add("spin");
  setTimeout(() => btn.classList.remove("spin"), 400);
}

// Event Listeners

function initListeners(): void {
  // Token selectors
  $("from-token-btn").addEventListener("click", () => openModal("from"));
  $("to-token-btn").addEventListener("click", () => openModal("to"));

  // Modal close
  $("modal-close").addEventListener("click", closeModal);
  $("modal-overlay").addEventListener("click", closeModal);

  // Token search
  tokenSearch.addEventListener("input", () =>
    renderTokenList(tokenSearch.value)
  );

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Amount input
  fromAmountEl.addEventListener("input", () => {
    recalculate();
    updateSwapButton();
  });

  // Max button
  $("from-max-btn").addEventListener("click", () => {
    if (!fromToken) return;
    fromAmountEl.value = fromToken.balance.toString();
    recalculate();
    updateSwapButton();
  });

  // Direction swap
  $("swap-direction-btn").addEventListener("click", swapDirection);

  // Submit
  swapBtn.addEventListener("click", handleSwap);

  // Theme toggle
  $("theme-toggle").addEventListener("click", toggleTheme);
}

// Init Boot

initTheme();
initListeners();
fetchPrices();
