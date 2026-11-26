/* UI language is independent from the project's Ukrainian engineering profile. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.PanelLocale = api; api.init(root); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "electropanel.v3.language.v1", TRANSFER_KEY = "electropanel.v3.language-transfer.v1";
  const languages = { uk: "Українська", en: "English", ru: "Русский" };
  let current = "uk", environment = null, prepare = null;
  const supported = (value) => Object.hasOwn(languages, String(value || "").toLowerCase());
  function resolve({ query, stored, browserLanguages = [] } = {}) {
    if (supported(query)) return query.toLowerCase();
    if (supported(stored)) return stored.toLowerCase();
    for (const tag of browserLanguages) { const code = String(tag).toLowerCase().split(/[-_]/)[0]; if (supported(code)) return code; }
    return "en";
  }
  function text(value, language = current, data = environment?.PanelLocaleData || {}) {
    if (language === "uk") return value;
    return String(value).replace(/[^<>"\r\n]+/g, (fragment) => {
      const key = fragment.trim(), translated = data[key]?.[language === "en" ? 0 : 1];
      return translated === undefined ? fragment : fragment.replace(key, () => translated);
    });
  }
  function init(env) {
    environment = env;
    let stored; try { stored = env.localStorage.getItem(KEY); } catch {}
    const query = new URL(env.location.href).searchParams.get("lang");
    current = resolve({ query, stored, browserLanguages: env.navigator.languages?.length ? env.navigator.languages : [env.navigator.language] });
    if (supported(query)) try { env.localStorage.setItem(KEY, current); } catch {}
    env.document.documentElement.lang = current;
  }
  function translateDocument(doc) {
    const walker = doc.createTreeWalker(doc.body, 4), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) if (!node.parentElement?.closest("script,style,[translate=no]")) node.nodeValue = text(node.nodeValue);
    for (const node of doc.querySelectorAll("[title],[aria-label],[placeholder],[alt]")) {
      if (node.closest("[translate=no]")) continue;
      for (const key of ["title", "aria-label", "placeholder", "alt"]) if (node.hasAttribute(key)) node.setAttribute(key, text(node.getAttribute(key)));
    }
    for (const link of doc.querySelectorAll("[data-service-home]")) link.setAttribute("href", `./${current}/`);
    const select = doc.querySelector("#languageSelect");
    if (select) { select.value = current; select.addEventListener("change", () => switchLanguage(select.value)); }
  }
  function switchLanguage(next) {
    if (!supported(next) || next === current || !environment) return false;
    if (prepare && prepare() === false) { const select = environment.document.querySelector("#languageSelect"); if (select) select.value = current; return false; }
    try { environment.localStorage.setItem(KEY, next); } catch {}
    const url = new URL(environment.location.href); url.searchParams.set("lang", next);
    environment.location.assign(url.href); return true;
  }
  function storeTransfer(state) {
    try { environment.sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(state)); return true; } catch { return false; }
  }
  function consumeTransfer() {
    try { const raw = environment?.sessionStorage.getItem(TRANSFER_KEY); environment?.sessionStorage.removeItem(TRANSFER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  return { KEY, TRANSFER_KEY, languages, resolve, text, init, translateDocument, switchLanguage, storeTransfer, consumeTransfer, prepareChange(callback) { prepare = callback; }, get current() { return current; } };
});
