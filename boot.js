/* One language bundle is requested; all labels remain available offline. */
(function () {
  const locale = globalThis.PanelLocale;
  locale.translateDocument(document);
  const loading = document.querySelector("#appLoading");
  const messages = { uk: ["Завантаження редактора…", "Не вдалося завантажити редактор. Оновіть сторінку."], en: ["Loading editor…", "The editor could not be loaded. Reload the page."], ru: ["Загрузка редактора…", "Не удалось загрузить редактор. Обновите страницу."] };
  if (loading) loading.textContent = messages[locale.current][0];
  const script = document.createElement("script"), bootUrl = new URL(document.currentScript.src);
  script.src = new URL(`runtime-${locale.current}.js${bootUrl.search}`, bootUrl).href;
  script.onload = () => { delete document.documentElement.dataset.appLoading; if (loading) loading.remove(); document.body.removeAttribute("aria-busy"); };
  script.onerror = () => { if (loading) { loading.textContent = messages[locale.current][1]; loading.setAttribute("role", "alert"); } };
  document.head.append(script);
})();
