function setMetaColor(dark) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0f0f0f' : '#ffffff');
}

let _dark = $state(localStorage.getItem("theme") === "dark");

export function getTheme() {
  return {
    get dark() { return _dark; },
  };
}

export function toggleTheme() {
  _dark = !_dark;
  localStorage.setItem("theme", _dark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", _dark);
  setMetaColor(_dark);
}

export function initTheme() {
  if (_dark) document.documentElement.classList.add("dark");
  setMetaColor(_dark);
}
