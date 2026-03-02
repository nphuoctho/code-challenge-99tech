import { $ } from "./helpers";

function updateThemeIcon(): void {
  const isDark = document.documentElement.classList.contains("dark");
  $("icon-sun").classList.toggle("hidden", !isDark);
  $("icon-moon").classList.toggle("hidden", isDark);
}

function initTheme(): void {
  const saved = localStorage.getItem("theme");
  const html = document.documentElement;

  if (saved === "light") {
    html.classList.remove("dark");
  } else {
    html.classList.add("dark");
  }
  updateThemeIcon();
}

function toggleTheme(): void {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon();
}

export { initTheme, toggleTheme };
