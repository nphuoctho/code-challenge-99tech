// Formatter
function formatAmount(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatPrice(n: number): string {
  if (n < 0.01) return n.toFixed(6);
  if (n < 1000) return n.toFixed(2);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Error Helper
function showError(msg: string, errorMsg: HTMLDivElement): void {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError(errorMsg: HTMLDivElement): void {
  errorMsg.classList.add("hidden");
}

// DOM Helper
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

export { $, formatAmount, formatPrice, hideError, showError };
