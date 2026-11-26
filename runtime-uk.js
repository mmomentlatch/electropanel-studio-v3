/* viewport.js */
/* One scale for both axes. Model dimensions never depend on the screen. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelViewport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const positive = (value) => Number.isFinite(value) && value > 0;
  function atScale(width, height, scale) {
    if (![width, height, scale].every(positive)) return null;
    return { width: width * scale, height: height * scale, scale };
  }
  function fit(width, height, availableWidth, availableHeight, maxScale = 1) {
    if (![width, height, availableWidth, availableHeight, maxScale].every(positive)) return null;
    return atScale(width, height, Math.min(maxScale, availableWidth / width, availableHeight / height));
  }
  return { fit, atScale };
});

;
/* control-devices.js */
/* Generic control equipment. Functional ports are not manufacturer terminal maps. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ControlDevices = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const CONTROL_POTENTIALS = ["DC+", "DC0", "AC+", "AC0"];
  const coil = { coilVoltage: 230, coilCurrent: "AC", coilPhase: "L1" };
  const contacts = { contactPotential: "L1", contactVoltage: 24 };
  const item = (type, name, detail, modules, photo, config = {}, category = "Керування") => ({ type, name, detail, category, modules, rating: detail.split(" · ")[0], phase: /-3p$/.test(type) ? "3P" : "L1", cable: "1.5", load: 0, accent: "#3d6d88", face: "control", photo, photoScale: 1, config });
  const COMPONENTS = [
    item("power-supply", "Блок живлення AC/DC", "230 В → 24/12 В DC · налаштовується", 3, "power-supply.svg", { outputVoltage: 24, outputPower: 60 }),
    item("control-transformer", "Трансформатор керування", "230 В → 24/12 В AC", 3, "power-supply.svg", { outputVoltage: 24, outputPower: 63 }),
    item("control-relay", "Проміжне реле", "230 В AC / 24/12 В DC · 1CO", 2, "control-relay.svg", { ...coil, ...contacts, contactCurrent: 10 }),
    item("time-relay", "Реле часу", "Затримка / імпульс / цикл", 2, "timer-relay.svg", { ...coil, ...contacts, delaySeconds: 5, timerMode: "on-delay", contactCurrent: 8 }),
    item("star-delta-relay", "Реле зірка–трикутник", "Y–Δ · час пуску й пауза", 2, "timer-relay.svg", { ...coil, ...contacts, delaySeconds: 5, transitionSeconds: .1, contactCurrent: 8 }),
    item("contactor-2p", "Магнітний контактор 2P", "2 полюси · котушка AC/DC", 3, "contactor-2p.svg", { ...coil, powerCurrent: 25, powerConnection: "L-N", secondPhase: "L2" }),
    item("contactor-3p", "Магнітний контактор 3P", "3 полюси · котушка AC/DC", 3, "contactor-3p.svg", { ...coil, powerCurrent: 25 }),
    item("phase-monitor", "Трифазне реле контролю напруги", "L1/L2/L3/N · вихід на контактор", 3, "timer-relay.svg", { ...contacts, lowerVoltage: 180, upperVoltage: 250, delaySeconds: 5, contactCurrent: 8 }),
    item("motor-protection-3p", "Автомат захисту двигуна 3P", "Регульований струм двигуна", 3, "motor-protection.svg", { powerCurrent: 6.3 }, "Захист"),
    item("thermal-overload-3p", "Теплове реле двигуна", "3 полюси · NC 95–96 / NO 97–98", 3, "motor-protection.svg", { powerCurrent: 6.3, ...contacts }, "Захист"),
    item("fuse-holder", "Тримач запобіжника", "1P · плавка вставка", 1, "mcb-1p.png", { powerCurrent: 6 }, "Захист"),
    item("pushbutton-no", "Кнопка пуск NO", "Нормально відкритий контакт", 1, "control-relay.svg", { ...contacts }),
    item("pushbutton-nc", "Кнопка стоп NC", "Нормально закритий контакт", 1, "control-relay.svg", { ...contacts }),
    item("indicator", "Сигнальна лампа", "230 В AC / 24/12 В DC", 1, "indicator.svg", { ...coil }),
    item("din-socket", "Розетка на DIN-рейку", "230 В · L/N/PE", 2, "outlet.svg", {}, "Монтаж"),
  ];
  const configFor = (type) => COMPONENTS.find((component) => component.type === type)?.config || (type === "relay" ? { powerCurrent: 40, lowerVoltage: 180, upperVoltage: 250, delaySeconds: 5 } : null);
  const get = (device, field) => device[field] ?? configFor(device.type)?.[field];
  const rating = (device) => {
    const config = configFor(device.type);
    if (!config) return device.rating;
    if ("outputVoltage" in config) return `${get(device, "outputVoltage")}V ${device.type === "power-supply" ? "DC" : "AC"} · ${get(device, "outputPower")}${device.type === "power-supply" ? "W" : "VA"}`;
    if ("coilVoltage" in config) return `${"powerCurrent" in config ? `${get(device, "powerCurrent")}A · ` : ""}${get(device, "coilVoltage")}V ${get(device, "coilCurrent")}`;
    if ("powerCurrent" in config) return `${get(device, "powerCurrent")}A`;
    return device.rating;
  };
  const has = (device) => COMPONENTS.some((component) => component.type === device?.type);
  const prefix = (type) => ({ "power-supply": "PS", "control-transformer": "T", "control-relay": "K", "time-relay": "KT", "star-delta-relay": "KT", "contactor-2p": "KM", "contactor-3p": "KM", "phase-monitor": "KV", "motor-protection-3p": "QF", "thermal-overload-3p": "FR", "fuse-holder": "FU", "pushbutton-no": "SB", "pushbutton-nc": "SB", indicator: "HL", "din-socket": "XS", relay: "KV" }[type]);
  const isControlPotential = (potential) => CONTROL_POTENTIALS.includes(potential);
  function supply(port) {
    if (port?.currentKind) return { kind: port.currentKind, voltage: Number(port.voltageV) };
    return { kind: "AC", voltage: 230 };
  }
  function label(port) {
    return `${port.potential}${port.currentKind ? ` · ${port.voltageV} В ${port.currentKind}` : ""}`;
  }
  function terminals(device) {
    if (!has(device)) return null;
    const phase = ["L1", "L2", "L3"].includes(device.phase) ? device.phase : "L1";
    const p = (portId, name, potential, side, x, data = {}) => ({ portId, label: name, potential, side, x, ...data });
    const type = device.type;
    const coilPorts = () => {
      const voltageV = Number(get(device, "coilVoltage")), currentKind = get(device, "coilCurrent");
      const potentials = currentKind === "DC" ? ["DC+", "DC0"] : voltageV === 230 ? [get(device, "coilPhase") || phase, "N"] : ["AC+", "AC0"];
      return [p("A1", "A1", potentials[0], "left", .5, { voltageV, currentKind, control: true }), p("A2", "A2", potentials[1], "right", .5, { voltageV, currentKind, control: true })];
    };
    const contactPorts = (ids = ["11", "12", "14"]) => {
      const potential = get(device, "contactPotential") || phase;
      const data = isControlPotential(potential) ? { currentKind: potential.startsWith("DC") ? "DC" : "AC", voltageV: Number(get(device, "contactVoltage")) } : {};
      return ids.map((id, index) => p(id, id, potential, "top", (index + .5) / ids.length, { ...data, control: true }));
    };
    const powerPoles = (count) => {
      const potentials = count === 3 ? ["L1", "L2", "L3"] : [phase, get(device, "powerConnection") === "L-L" ? get(device, "secondPhase") : "N"];
      return potentials.flatMap((potential, index) => [p(`P${index + 1}-in`, `${index * 2 + 1}`, potential, "top", (index + .5) / count), p(`P${index + 1}-out`, `${index * 2 + 2}`, potential, "bottom", (index + .5) / count)]);
    };
    if (["power-supply", "control-transformer"].includes(type)) {
      const voltageV = Number(get(device, "outputVoltage")), dc = type === "power-supply", currentKind = dc ? "DC" : "AC";
      return [p("L-in", "L", phase, "top", 1 / 6), p("N-in", "N", "N", "top", .5), p("PE", "PE", "PE", "top", 5 / 6), p("out+", dc ? `+${voltageV}V` : `${voltageV}V~`, dc ? "DC+" : "AC+", "bottom", .25, { voltageV, currentKind }), p("out0", dc ? "0V" : "0V~", dc ? "DC0" : "AC0", "bottom", .75, { voltageV, currentKind })];
    }
    if (["control-relay", "time-relay"].includes(type)) return [...contactPorts(), ...coilPorts()];
    if (type === "star-delta-relay") return [...contactPorts(["C", "Y", "Δ"]), ...coilPorts()];
    if (type === "contactor-2p" || type === "contactor-3p") return [...powerPoles(type === "contactor-2p" ? 2 : 3), ...coilPorts()];
    if (type === "phase-monitor") return [...["L1", "L2", "L3", "N"].map((potential, index) => p(`${potential}-in`, potential, potential, "bottom", (index + .5) / 4)), ...contactPorts()];
    if (type === "motor-protection-3p") return powerPoles(3);
    if (type === "thermal-overload-3p") return [...powerPoles(3), ...contactPorts(["95", "96", "97", "98"]).map((port, index) => ({ ...port, side: index < 2 ? "left" : "right", y: index % 2 ? .75 : .3 }))];
    if (type === "fuse-holder") return [p("in", "1", phase, "top", .5), p("out", "2", phase, "bottom", .5)];
    if (type === "pushbutton-no") return contactPorts(["13", "14"]);
    if (type === "pushbutton-nc") return contactPorts(["21", "22"]);
    if (type === "indicator") return coilPorts();
    if (type === "din-socket") return [p("L-in", "L", phase, "top", 1 / 6), p("N-in", "N", "N", "top", .5), p("PE", "PE", "PE", "top", 5 / 6)];
    return [];
  }
  function validate(device) {
    const errors = [];
    const defaults = configFor(device.type);
    if (!defaults) return errors;
    for (const field of ["outputVoltage", "outputPower", "coilVoltage", "powerCurrent", "contactCurrent", "contactVoltage", "delaySeconds", "transitionSeconds"]) {
      if (field in defaults && !(Number(get(device, field)) > 0 && Number(get(device, field)) <= (field.includes("Seconds") ? 86400 : field.includes("Voltage") ? 500 : 10000))) errors.push(`Перевірте параметр «${FIELDS[field]?.label || field}»`);
    }
    if ("coilCurrent" in defaults && !["AC", "DC"].includes(get(device, "coilCurrent"))) errors.push("Живлення котушки повинно бути AC або DC");
    if ("outputVoltage" in defaults && Number(get(device, "outputVoltage")) > 60) errors.push("Для цієї моделі вихід повинен бути не більше 60 В");
    if ("lowerVoltage" in defaults && !(Number(get(device, "lowerVoltage")) > 0 && Number(get(device, "lowerVoltage")) < Number(get(device, "upperVoltage")))) errors.push("Нижня межа напруги повинна бути меншою за верхню");
    if (device.type === "contactor-2p" && get(device, "powerConnection") === "L-L" && (device.phase || "L1") === get(device, "secondPhase")) errors.push("Для двох фаз оберіть різні фазні провідники");
    Object.keys(defaults).forEach((field) => { if (FIELDS[field]?.options && !FIELDS[field].options.some(([key]) => key === get(device, field))) errors.push(`Перевірте ${FIELDS[field].label}`); });
    return errors;
  }
  function internalLinks(device) {
    if (["contactor-2p", "contactor-3p", "motor-protection-3p", "thermal-overload-3p"].includes(device.type)) return Array.from({ length: device.type === "contactor-2p" ? 2 : 3 }, (_, index) => [`P${index + 1}-in`, `P${index + 1}-out`]);
    if (device.type === "fuse-holder") return [["in", "out"]];
    return [];
  }
  const FIELDS = {
    outputVoltage: { label: "Вихідна напруга, В", min: 1, max: 60, step: .1 }, outputPower: { label: "Номінальна потужність, Вт / ВА", min: 1, max: 10000, step: 1 },
    coilVoltage: { label: "Напруга котушки / живлення, В", min: 1, max: 500, step: 1 }, coilCurrent: { label: "Живлення котушки", options: [["AC", "Змінне (AC)"], ["DC", "Постійне (DC)"]] }, coilPhase: { label: "Фаза котушки 230 В AC", options: ["L1", "L2", "L3"].map((value) => [value, value]) },
    contactPotential: { label: "Коло комутованих контактів", options: ["L1", "L2", "L3", "DC+", "AC+"].map((value) => [value, value]) }, contactVoltage: { label: "Напруга контактного кола DC/AC, В", min: 1, max: 500, step: 1 },
    contactCurrent: { label: "Номінал допоміжних контактів, A", min: .1, max: 1000, step: .1 }, powerCurrent: { label: "Номінальний / заданий струм, A", min: .1, max: 1000, step: .1 }, powerConnection: { label: "Потужні полюси 2P", options: [["L-N", "Фаза + нейтраль"], ["L-L", "Дві фази"]] },
    secondPhase: { label: "Другий фазний полюс для L–L", options: ["L1", "L2", "L3"].map((value) => [value, value]) },
    delaySeconds: { label: "Час / затримка, с", min: .01, max: 86400, step: .1 }, transitionSeconds: { label: "Пауза переходу Y → Δ, с", min: .01, max: 86400, step: .01 },
    timerMode: { label: "Режим реле часу", options: [["on-delay", "Затримка увімкнення"], ["off-delay", "Затримка вимкнення"], ["pulse", "Імпульс"], ["cycle", "Цикл"]] },
    lowerVoltage: { label: "Нижня межа напруги, В", min: 1, max: 500, step: 1 }, upperVoltage: { label: "Верхня межа напруги, В", min: 1, max: 500, step: 1 },
  };
  return { COMPONENTS, CONTROL_POTENTIALS, FIELDS, configFor, get, rating, prefix, has, supply, label, terminals, internalLinks, validate, isControlPotential };
});

;
/* mechanical.js */
/* Millimetre envelopes and DIN allocation. Electrical ratings are independent. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./control-devices.js") : root.ControlDevices);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelMechanical = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const VERIFIED_DATE = "2026-11-14";
  const CAPACITIES = [[1, 12], [1, 18], [2, 12], [2, 18], [2, 24], [3, 18], [3, 24], [4, 24]].map(([rows, modulesPerRow]) => Object.freeze({ id: `${rows}x${modulesPerRow}`, rows, modulesPerRow, capacity: rows * modulesPerRow }));
  const VOLTA = "https://assets.hager.com/step-content/P/HA_45090289/Document/std.lang.all/24DE0047-bes-volta.pdf";
  const RAILS = "https://assets.hager.com/step-content/P/HA_22838868/Document/std.lang.all/22DE0001-TECHNIK-KLEINVERTEILER.pdf";
  const GOLF = "https://assets1.sc.hager.com/australia/files/02_Residential_Enclosures_and_Load_Centres_NZ.pdf";
  const ENClosures = [
    ...[245, 370, 515, 640, 765].map((heightMm, index) => ({ id: `hager-va${(index + 1) * 12}cn`, model: `Hager Volta VA${(index + 1) * 12}CN`, rows: index + 1, modulesPerRow: 12, widthMm: 305, heightMm, depthMm: 96.5, ip: "IP30", source: VOLTA, railSource: RAILS })),
    ...[
      ["VS112TD", 1, 12, 282, 252], ["VS212TD", 2, 12, 282, 377],
      ["VS118TD", 1, 18, 390, 252], ["VS218TD", 2, 18, 390, 377],
      ["VS318TD", 3, 18, 390, 500], ["VS418TD", 4, 18, 390, 647],
    ].map(([model, rows, modulesPerRow, widthMm, heightMm]) => ({ id: `hager-${model.toLowerCase()}`, model: `Hager Golf ${model}`, rows, modulesPerRow, widthMm, heightMm, depthMm: 99, ip: "IP40", source: `https://hager.com/ie/catalogue/catalog/product/download/id/${model}`, railSource: GOLF })),
  ].map((item) => Object.freeze({ ...item, pitchMm: 18, rowPitchMm: 125, mounting: "Накладний", verified: true }));
  const s200Source = "https://library.e.abb.com/public/cb2705b4429446beace83c3a75a2905e/2CDC400610B0101_Rev_C_Anwendungshandbuch_06-2021_72dpi.pdf";
  const dsSource = "https://library.e.abb.com/public/b7eab409b968427bbc8743fb035574b1/9AKK107492A9205_Tech%20Datasheet_DS201_FULL_rev3.pdf";
  const fSource = "https://library.e.abb.com/public/941c84e0d332402aa508fdeef1ff224b/Interruttori%20differenziali%20di%20tipo%20F.pdf";
  const PROFILES = [
    { id: "abb-s201", model: "ABB S201 · корпус S200", types: ["mcb-1p"], widthMm: 17.5, heightMm: 88, depthMm: 69, source: s200Source },
    { id: "abb-s202", model: "ABB S202 · корпус S200", types: ["main-2p", "mcb-2p"], widthMm: 35, heightMm: 88, depthMm: 69, source: s200Source },
    { id: "abb-s203", model: "ABB S203 · корпус S200", types: ["main-3p"], widthMm: 52.5, heightMm: 88, depthMm: 69, source: s200Source },
    { id: "abb-s204", model: "ABB S204 · корпус S200", types: ["main-4p"], widthMm: 70, heightMm: 88, depthMm: 69, source: s200Source },
    { id: "abb-ds201", model: "ABB DS201 · корпус 1P+N", types: ["rcbo"], widthMm: 35, heightMm: 85, depthMm: 69, source: dsSource },
    { id: "abb-f202", model: "ABB F202 · корпус F200", types: ["rccb-2p"], widthMm: 35, heightMm: 85, depthMm: 69, source: fSource },
    { id: "abb-f204", model: "ABB F204 · корпус F200", types: ["rccb-4p"], widthMm: 70, heightMm: 85, depthMm: 69, source: fSource },
  ].map((item) => Object.freeze({ ...item, verified: true }));
  const BASE_MODULES = { "main-2p": 2, "main-3p": 3, "main-4p": 4, "mcb-1p": 1, "mcb-2p": 2, rcbo: 2, "rcbo-afdd": 4, "outgoing-terminal": 2, "rccb-2p": 2, "rccb-4p": 4, "spd-2p": 2, "spd-4p": 4, contactor: 2, relay: 2, meter: 2, terminal: 1, blank: 1 };
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const positive = (value) => value !== "" && value != null && Number.isFinite(Number(value)) && Number(value) > 0;
  const enclosure = (id) => ENClosures.find((item) => item.id === id);
  const profile = (id) => PROFILES.find((item) => item.id === id);
  const defaultProfile = (type) => PROFILES.find((item) => item.types.includes(type))?.id || "";
  function baseModules(type) { return BASE_MODULES[type] || C.COMPONENTS.find((item) => item.type === type)?.modules || 1; }

  function dimensions(device) {
    const selected = profile(device.geometryId);
    if (selected && !selected.types.includes(device.type)) throw new Error("Габаритний профіль не відповідає типу апарата");
    if (device.geometryId && !selected && device.geometryId !== "custom") throw new Error("Невідомий габаритний профіль");
    if (selected) {
      const railOffsetMm = Number(device.mounting?.railOffsetMm ?? selected.heightMm / 2);
      if (!Number.isFinite(railOffsetMm) || railOffsetMm < 0 || railOffsetMm > selected.heightMm) throw new Error("Вісь рейки повинна бути в межах висоти апарата");
      const current = String(device.rating || "").match(/(?:^|\W)[BCD]\s*(\d+(?:[.,]\d+)?)/i);
      const rangeUnverified = selected.id.startsWith("abb-s20") && current && Number(current[1].replace(",", ".")) > 63;
      return { ...selected, verified: !rangeUnverified, rangeUnverified: Boolean(rangeUnverified), railOffsetMm, offsetVerified: Boolean(device.mounting?.confirmed === true && String(device.mounting.source || "").trim()) };
    }
    if (device.dimensions) {
      const d = device.dimensions;
      for (const key of ["widthMm", "heightMm", "depthMm"]) if (!positive(d[key]) || Number(d[key]) > 1000) throw new Error("Габарити апарата мають бути від 0 до 1000 мм");
      const railOffsetMm = d.railOffsetMm == null ? Number(d.heightMm) / 2 : Number(d.railOffsetMm);
      if (!Number.isFinite(railOffsetMm) || railOffsetMm < 0 || railOffsetMm > Number(d.heightMm)) throw new Error("Вісь рейки повинна бути в межах висоти апарата");
      return { widthMm: Number(d.widthMm), heightMm: Number(d.heightMm), depthMm: Number(d.depthMm), railOffsetMm, offsetVerified: d.confirmed === true, verified: Boolean(d.confirmed === true && String(d.source || "").trim()), source: String(d.source || ""), model: String(d.model || "Власна модель") };
    }
    return { widthMm: baseModules(device.type) * 18, heightMm: 90, depthMm: 70, railOffsetMm: 45, offsetVerified: false, verified: false, model: "Універсальний корпус · орієнтовно", source: "" };
  }

  function boardGeometry(board) {
    if (!Number.isInteger(Number(board.rows)) || Number(board.rows) < 1 || Number(board.rows) > 8 || !Number.isInteger(Number(board.modulesPerRow)) || Number(board.modulesPerRow) < 1 || Number(board.modulesPerRow) > 72) throw new Error("Щит підтримує 1–8 рейок і 1–72 місця в ряду");
    const preset = enclosure(board.enclosureId);
    if (board.enclosureId && board.enclosureId !== "custom" && !preset) throw new Error("Невідома модель щита");
    if (preset && (Number(board.rows) !== preset.rows || Number(board.modulesPerRow) !== preset.modulesPerRow)) throw new Error("Кількість рейок або модулів не відповідає обраному корпусу");
    const custom = board.dimensions || {};
    const pitchMm = preset?.pitchMm || Number(custom.pitchMm ?? 18);
    const rowPitchMm = Number(board.mounting?.rowPitchMm ?? preset?.rowPitchMm ?? custom.rowPitchMm ?? 125);
    const widthMm = preset?.widthMm || Number(custom.widthMm ?? Number(board.modulesPerRow) * pitchMm + 90);
    const heightMm = preset?.heightMm || Number(custom.heightMm ?? (Number(board.rows) - 1) * rowPitchMm + 250);
    const depthMm = preset?.depthMm || Number(custom.depthMm ?? 120);
    for (const value of [widthMm, heightMm, depthMm, pitchMm, rowPitchMm]) if (!positive(value)) throw new Error("Габарити щита та кроки мають бути додатними числами");
    if (widthMm > 3000 || heightMm > 3000 || depthMm > 1000 || pitchMm < 9 || pitchMm > 36 || rowPitchMm < 50 || rowPitchMm > 500) throw new Error("Габарити щита або кроки поза підтримуваними межами");
    // Centre rails for preview until exact mounting offsets are supplied.
    const leftMm = Number(board.mounting?.leftMm ?? (widthMm - Number(board.modulesPerRow) * pitchMm) / 2);
    const firstRailMm = Number(board.mounting?.firstRailMm ?? (heightMm - (Number(board.rows) - 1) * rowPitchMm) / 2);
    if (![leftMm, firstRailMm].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Відступи рейок повинні бути невід’ємними");
    const maxDeviceDepthMm = board.mounting?.maxDeviceDepthMm == null || board.mounting?.maxDeviceDepthMm === "" ? null : Number(board.mounting.maxDeviceDepthMm);
    if (maxDeviceDepthMm !== null && (!positive(maxDeviceDepthMm) || maxDeviceDepthMm > depthMm)) throw new Error("Доступна глибина апарата повинна бути в межах глибини корпусу");
    const verified = Boolean(preset || (custom.confirmed === true && String(custom.source || "").trim()));
    return { widthMm, heightMm, depthMm, pitchMm, rowPitchMm, leftMm, firstRailMm, maxDeviceDepthMm, verified, model: preset?.model || String(custom.model || "Власний корпус"), source: preset?.source || String(custom.source || ""), mountingVerified: Boolean(board.mounting?.confirmed === true && String(board.mounting.source || "").trim()), capacity: Number(board.rows) * Number(board.modulesPerRow) };
  }

  function modulesFor(device, board) {
    return Math.max(1, Math.ceil((dimensions(device).widthMm - 1e-7) / boardGeometry(board).pitchMm));
  }
  const barModules = (bar, board) => Math.max(1, Math.ceil(((bar.dimensions ? dimensions({ ...bar, type: "terminal", geometryId: "custom" }).widthMm : Math.ceil((bar.terminals * 20 + 38) / 42) * 18) - 1e-7) / (board ? boardGeometry(board).pitchMm : 18)));

  function deviceRect(device, board) {
    const b = boardGeometry(board), d = dimensions(device);
    const slots = modulesFor(device, board);
    return { id: device.id, x: b.leftMm + Number(device.slot) * b.pitchMm, y: b.firstRailMm + Number(device.row) * b.rowPitchMm - d.railOffsetMm, width: d.widthMm, height: d.heightMm, depth: d.depthMm, slots, verified: d.verified, offsetVerified: d.offsetVerified };
  }

  function barDrawingRects(project) {
    const b = boardGeometry(project.board), counts = {}, sideHeights = {}, width = project.board.modulesPerRow * b.pitchMm;
    const barWidth = (zone) => Math.max((width - 12) / 2, ...project.busbars.filter((bar) => bar.zone === zone).map((bar) => (bar.terminals * 12 + 44) * b.pitchMm / 42));
    const lastRail = b.firstRailMm + (project.board.rows - 1) * b.rowPitchMm;
    return (project.busbars || []).map((bar) => {
      if (bar.dimensions && (bar.positionMm || bar.zone === "din")) {
        const d = dimensions({ ...bar, type: "terminal", geometryId: "custom" });
        const r = bar.zone === "din" ? deviceRect({ ...bar, type: "terminal", geometryId: "custom" }, project.board) : { x: Number(bar.positionMm.x), y: Number(bar.positionMm.y), width: d.widthMm, height: d.heightMm };
        return { id: bar.id, ...r, measured: true };
      }
      if (bar.zone === "din") return { id: bar.id, x: b.leftMm + bar.slot * b.pitchMm, y: b.firstRailMm + bar.row * b.rowPitchMm - 14, width: barModules(bar, project.board) * b.pitchMm, height: 28, measured: false };
      const index = counts[bar.zone] || 0; counts[bar.zone] = index + 1;
      if (["left", "right"].includes(bar.zone)) {
        const height = Math.max(42, bar.terminals * 10.5 + 26), offset = sideHeights[bar.zone] || 0;
        sideHeights[bar.zone] = offset + height + 12;
        return { id: bar.id, x: bar.zone === "left" ? Math.max(2, b.leftMm - 44) : b.leftMm + width + 12, y: b.firstRailMm - 50 + offset, width: 30, height, measured: false };
      }
      const col = index % 2, line = Math.floor(index / 2), barSpan = barWidth(bar.zone);
      return { id: bar.id, x: b.leftMm + col * (barSpan + 12), y: bar.zone === "top" ? 12 + line * 35 : lastRail + 84 + line * 35, width: barSpan, height: 28, measured: false };
    });
  }

  function assemblyViewport(project) {
    const b = boardGeometry(project.board), scale = 42 / b.pitchMm;
    // A drawing of the equipment, independent of any enclosure outline. Keep
    // the existing world origin so saved wire routes and terminal refs survive.
    let left = b.leftMm, right = left + project.board.modulesPerRow * b.pitchMm;
    let top = b.firstRailMm - 50 - 10;
    let bottom = b.firstRailMm + (project.board.rows - 1) * b.rowPitchMm + 60;
    const include = (r, margin = 0) => { left = Math.min(left, r.x - margin); right = Math.max(right, r.x + r.width + margin); top = Math.min(top, r.y - margin); bottom = Math.max(bottom, r.y + r.height + margin); };
    project.devices.forEach((device) => include(deviceRect(device, project.board)));
    if (project.consumers?.length) bottom += 30;
    barDrawingRects(project).forEach((bar) => include(bar, 8));
    (project.wires || []).forEach((wire) => (wire.points || []).forEach((point) => { if (Number.isFinite(point.x) && Number.isFinite(point.y)) include({ x: point.x / scale, y: point.y / scale, width: 0, height: 0 }, 6); }));
    const leftMm = Math.max(0, left - 12), topMm = Math.max(0, top - 6);
    right += 6; bottom += 6;
    return { leftMm, topMm, widthMm: right - leftMm, heightMm: bottom - topMm, surfaceWidthMm: Math.max(b.widthMm, right), surfaceHeightMm: Math.max(b.heightMm, bottom) };
  }
  const intersects = (a, b) => a.x < b.x + b.width - 1e-6 && a.x + a.width > b.x + 1e-6 && a.y < b.y + b.height - 1e-6 && a.y + a.height > b.y + 1e-6;

  function checks(project) {
    const issues = [], b = boardGeometry(project.board);
    const hasEnclosure = Boolean(project.board.enclosureId || project.board.dimensions);
    const add = (level, code, text, entityId = "board") => issues.push({ level, code, text, entityId });
    if (hasEnclosure) {
      if (!b.verified) add("pending", "enclosure-unverified", "Габарити власного корпусу потрібно звірити з паспортом.");
      if (!b.mountingVerified) add("pending", "mounting-unverified", "Уточніть відступи DIN-рейок і доступну глибину за кресленням обраного корпусу.");
      if (b.maxDeviceDepthMm === null) add("pending", "depth-unknown", "Не задана доступна глибина для апарата. Зовнішня глибина щита не є монтажною.");
      if (b.leftMm + Number(project.board.modulesPerRow) * b.pitchMm > b.widthMm + 1e-6) add("error", "rail-width", "Модульне поле виходить за ширину корпусу.");
      if (b.firstRailMm + (Number(project.board.rows) - 1) * b.rowPitchMm >= b.heightMm) add("error", "rail-height", "Вісь DIN-рейки виходить за висоту корпусу.");
    }
    const rects = [];
    project.devices.forEach((device) => {
      const d = dimensions(device), r = deviceRect(device, project.board), label = device.label || device.type;
      rects.push(r);
      if (!d.verified) add("pending", "device-unverified", `${label}: потрібні габарити конкретної моделі з паспорта.`, device.id);
      if (d.rangeUnverified) add("error", "geometry-rating", `${label}: для S200 понад 63 A потрібні габарити саме цього виконання. Виберіть власну модель за паспортом.`, device.id);
      if (!d.offsetVerified) add("pending", "device-offset", `${label}: положення осі DIN у корпусі апарата прийнято посередині; звірте креслення.`, device.id);
      if (Number(device.slot) + r.slots > Number(project.board.modulesPerRow) || Number(device.row) >= Number(project.board.rows) || Number(device.slot) < 0 || Number(device.row) < 0) add("error", "device-slots", `${label}: апарат виходить за доступні місця на DIN-рейці.`, device.id);
      if (hasEnclosure && (r.x < 0 || r.y < 0 || r.x + r.width > b.widthMm + 1e-6 || r.y + r.height > b.heightMm + 1e-6)) add("error", "device-boundary", `${label}: корпус апарата виходить за габарити щита.`, device.id);
      if (hasEnclosure && (r.depth > b.depthMm || b.maxDeviceDepthMm !== null && r.depth > b.maxDeviceDepthMm)) add("error", "device-depth", `${label}: глибина ${r.depth} мм перевищує доступну; потрібен глибший щит.`, device.id);
    });
    project.busbars?.forEach((bar) => {
      if (bar.zone === "din" && (!Number.isInteger(Number(bar.row)) || Number(bar.row) < 0 || Number(bar.row) >= Number(project.board.rows) || !Number.isInteger(Number(bar.slot)) || Number(bar.slot) < 0 || Number(bar.slot) + barModules(bar, project.board) > Number(project.board.modulesPerRow))) add("error", "bar-slots", `${bar.label}: шина виходить за доступні місця на DIN-рейці.`, bar.id);
      if (!bar.dimensions || bar.zone !== "din" && !bar.positionMm) { add("pending", "bar-unverified", `${bar.label}: розміщення шини умовне; задайте її габарити й координати.`, bar.id); return; }
      const d = dimensions({ ...bar, type: "terminal", geometryId: "custom" });
      const r = bar.zone === "din" ? deviceRect({ ...bar, type: "terminal", geometryId: "custom" }, project.board) : { id: bar.id, x: Number(bar.positionMm.x), y: Number(bar.positionMm.y), width: d.widthMm, height: d.heightMm, depth: d.depthMm };
      if (![r.x, r.y].every(Number.isFinite)) { add("error", "bar-position", `${bar.label}: некоректні координати шини.`, bar.id); return; }
      if (!d.verified) add("pending", "bar-unverified", `${bar.label}: габарити шини не підтверджені паспортом.`, bar.id);
      if (hasEnclosure && (r.x < 0 || r.y < 0 || r.x + r.width > b.widthMm || r.y + r.height > b.heightMm || r.depth > b.depthMm)) add("error", "bar-boundary", `${bar.label}: шина виходить за габарити щита.`, bar.id);
      rects.push(r);
    });
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) if (intersects(rects[i], rects[j])) add("error", "mechanical-overlap", "Габарити компонентів перетинаються; перевірте місця на рейках і положення шин.", rects[j].id);
    if (project.combs?.length || project.wires?.length) add("pending", "wiring-clearance", "Траси проводів умовні: радіуси вигину, кабельні канали, сумісність гребінок і нагрівання потребують окремої перевірки.");
    return issues;
  }

  function withEnclosure(board, id) {
    const p = enclosure(id);
    if (!p) throw new Error("Невідома модель щита");
    const next = { ...copy(board), enclosureId: p.id, rows: p.rows, modulesPerRow: p.modulesPerRow, ip: p.ip, physicalView: true };
    delete next.dimensions; delete next.mounting;
    return next;
  }
  function withCapacity(board, rows, modulesPerRow) {
    const next = { ...copy(board), rows: Number(rows), modulesPerRow: Number(modulesPerRow), physicalView: board.physicalView !== false };
    ["enclosureId", "dimensions", "mounting", "ip", "fullEnclosureView"].forEach((key) => delete next[key]);
    boardGeometry(next);
    return next;
  }
  function repack(project) {
    const p = copy(project), board = p.board;
    const entities = [...p.devices.map((entity) => ({ entity, modules: modulesFor(entity, board) })), ...(p.busbars || []).filter((bar) => bar.zone === "din").map((entity) => ({ entity, modules: barModules(entity, board) }))].sort((a, b) => a.entity.row - b.entity.row || a.entity.slot - b.entity.slot);
    const arrange = (ordered, preserve) => {
      const placed = [];
      for (const item of ordered) {
        const spots = [];
        for (let row = 0; row < board.rows; row += 1) for (let slot = 0; slot <= board.modulesPerRow - item.modules; slot += 1) spots.push({ row, slot });
        if (preserve) spots.sort((a, b) => Math.abs(a.row - item.entity.row) * 1000 + Math.abs(a.slot - item.entity.slot) - Math.abs(b.row - item.entity.row) * 1000 - Math.abs(b.slot - item.entity.slot));
        const spot = spots.find((s) => !placed.some((other) => s.row === other.row && s.slot < other.slot + other.modules && s.slot + item.modules > other.slot));
        if (!spot) return null;
        placed.push({ ...spot, modules: item.modules, entity: item.entity });
      }
      return placed;
    };
    const placed = arrange(entities, true) || arrange([...entities].sort((a, b) => b.modules - a.modules), false);
    if (!placed) throw new Error("Не вміщаються всі апарати й DIN-шини. Збільште кількість рейок або модулів у ряду.");
    placed.forEach(({ entity, row, slot }) => Object.assign(entity, { row, slot }));
    const errors = checks(p).filter((issue) => issue.level === "error");
    if (errors.length) throw new Error(errors[0].text);
    // Routes are screen annotations, not cable lengths. Recompute after geometry changes.
    (p.wires || []).forEach((wire) => { wire.points = []; });
    return p;
  }
  return { VERIFIED_DATE, CAPACITIES, ENCLOSURES: ENClosures, PROFILES, enclosure, profile, defaultProfile, baseModules, dimensions, boardGeometry, modulesFor, barModules, deviceRect, barDrawingRects, assemblyViewport, intersects, checks, withEnclosure, withCapacity, repack };
});

;
/* vendor/polygon-clipping-0.15.7.js */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).polygonClipping=e()}(this,(function(){"use strict";
/**
     * splaytree v3.1.2
     * Fast Splay tree for Node and browser
     *
     * @author Alexander Milevski <info@w8r.name>
     * @license MIT
     * @preserve
     */
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */function t(t,e){var n,r,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:l(0),throw:l(1),return:l(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function l(o){return function(l){return function(o){if(n)throw new TypeError("Generator is already executing.");for(;s;)try{if(n=1,r&&(i=2&o[0]?r.return:o[0]?r.throw||((i=r.return)&&i.call(r),0):r.next)&&!(i=i.call(r,o[1])).done)return i;switch(r=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,r=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=s.trys,(i=i.length>0&&i[i.length-1])||6!==o[0]&&2!==o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=e.call(t,s)}catch(t){o=[6,t],r=0}finally{n=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,l])}}}var e=function(t,e){this.next=null,this.key=t,this.data=e,this.left=null,this.right=null};function n(t,e){return t>e?1:t<e?-1:0}function r(t,n,r){for(var i=new e(null,null),o=i,s=i;;){var l=r(t,n.key);if(l<0){if(null===n.left)break;if(r(t,n.left.key)<0){var h=n.left;if(n.left=h.right,h.right=n,null===(n=h).left)break}s.left=n,s=n,n=n.left}else{if(!(l>0))break;if(null===n.right)break;if(r(t,n.right.key)>0){h=n.right;if(n.right=h.left,h.left=n,null===(n=h).right)break}o.right=n,o=n,n=n.right}}return o.right=n.left,s.left=n.right,n.left=i.right,n.right=i.left,n}function i(t,n,i,o){var s=new e(t,n);if(null===i)return s.left=s.right=null,s;var l=o(t,(i=r(t,i,o)).key);return l<0?(s.left=i.left,s.right=i,i.left=null):l>=0&&(s.right=i.right,s.left=i,i.right=null),s}function o(t,e,n){var i=null,o=null;if(e){var s=n((e=r(t,e,n)).key,t);0===s?(i=e.left,o=e.right):s<0?(o=e.right,e.right=null,i=e):(i=e.left,e.left=null,o=e)}return{left:i,right:o}}function s(t,e,n,r,i){if(t){r(e+(n?"└── ":"├── ")+i(t)+"\n");var o=e+(n?"    ":"│   ");t.left&&s(t.left,o,!1,r,i),t.right&&s(t.right,o,!0,r,i)}}var l=function(){function l(t){void 0===t&&(t=n),this._root=null,this._size=0,this._comparator=t}return l.prototype.insert=function(t,e){return this._size++,this._root=i(t,e,this._root,this._comparator)},l.prototype.add=function(t,n){var i=new e(t,n);null===this._root&&(i.left=i.right=null,this._size++,this._root=i);var o=this._comparator,s=r(t,this._root,o),l=o(t,s.key);return 0===l?this._root=s:(l<0?(i.left=s.left,i.right=s,s.left=null):l>0&&(i.right=s.right,i.left=s,s.right=null),this._size++,this._root=i),this._root},l.prototype.remove=function(t){this._root=this._remove(t,this._root,this._comparator)},l.prototype._remove=function(t,e,n){var i;return null===e?null:0===n(t,(e=r(t,e,n)).key)?(null===e.left?i=e.right:(i=r(t,e.left,n)).right=e.right,this._size--,i):e},l.prototype.pop=function(){var t=this._root;if(t){for(;t.left;)t=t.left;return this._root=r(t.key,this._root,this._comparator),this._root=this._remove(t.key,this._root,this._comparator),{key:t.key,data:t.data}}return null},l.prototype.findStatic=function(t){for(var e=this._root,n=this._comparator;e;){var r=n(t,e.key);if(0===r)return e;e=r<0?e.left:e.right}return null},l.prototype.find=function(t){return this._root&&(this._root=r(t,this._root,this._comparator),0!==this._comparator(t,this._root.key))?null:this._root},l.prototype.contains=function(t){for(var e=this._root,n=this._comparator;e;){var r=n(t,e.key);if(0===r)return!0;e=r<0?e.left:e.right}return!1},l.prototype.forEach=function(t,e){for(var n=this._root,r=[],i=!1;!i;)null!==n?(r.push(n),n=n.left):0!==r.length?(n=r.pop(),t.call(e,n),n=n.right):i=!0;return this},l.prototype.range=function(t,e,n,r){for(var i=[],o=this._comparator,s=this._root;0!==i.length||s;)if(s)i.push(s),s=s.left;else{if(o((s=i.pop()).key,e)>0)break;if(o(s.key,t)>=0&&n.call(r,s))return this;s=s.right}return this},l.prototype.keys=function(){var t=[];return this.forEach((function(e){var n=e.key;return t.push(n)})),t},l.prototype.values=function(){var t=[];return this.forEach((function(e){var n=e.data;return t.push(n)})),t},l.prototype.min=function(){return this._root?this.minNode(this._root).key:null},l.prototype.max=function(){return this._root?this.maxNode(this._root).key:null},l.prototype.minNode=function(t){if(void 0===t&&(t=this._root),t)for(;t.left;)t=t.left;return t},l.prototype.maxNode=function(t){if(void 0===t&&(t=this._root),t)for(;t.right;)t=t.right;return t},l.prototype.at=function(t){for(var e=this._root,n=!1,r=0,i=[];!n;)if(e)i.push(e),e=e.left;else if(i.length>0){if(e=i.pop(),r===t)return e;r++,e=e.right}else n=!0;return null},l.prototype.next=function(t){var e=this._root,n=null;if(t.right){for(n=t.right;n.left;)n=n.left;return n}for(var r=this._comparator;e;){var i=r(t.key,e.key);if(0===i)break;i<0?(n=e,e=e.left):e=e.right}return n},l.prototype.prev=function(t){var e=this._root,n=null;if(null!==t.left){for(n=t.left;n.right;)n=n.right;return n}for(var r=this._comparator;e;){var i=r(t.key,e.key);if(0===i)break;i<0?e=e.left:(n=e,e=e.right)}return n},l.prototype.clear=function(){return this._root=null,this._size=0,this},l.prototype.toList=function(){return function(t){var n=t,r=[],i=!1,o=new e(null,null),s=o;for(;!i;)n?(r.push(n),n=n.left):r.length>0?n=(n=s=s.next=r.pop()).right:i=!0;return s.next=null,o.next}(this._root)},l.prototype.load=function(t,n,r){void 0===n&&(n=[]),void 0===r&&(r=!1);var i=t.length,o=this._comparator;if(r&&f(t,n,0,i-1,o),null===this._root)this._root=h(t,n,0,i),this._size=i;else{var s=function(t,n,r){var i=new e(null,null),o=i,s=t,l=n;for(;null!==s&&null!==l;)r(s.key,l.key)<0?(o.next=s,s=s.next):(o.next=l,l=l.next),o=o.next;null!==s?o.next=s:null!==l&&(o.next=l);return i.next}(this.toList(),function(t,n){for(var r=new e(null,null),i=r,o=0;o<t.length;o++)i=i.next=new e(t[o],n[o]);return i.next=null,r.next}(t,n),o);i=this._size+i,this._root=u({head:s},0,i)}return this},l.prototype.isEmpty=function(){return null===this._root},Object.defineProperty(l.prototype,"size",{get:function(){return this._size},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"root",{get:function(){return this._root},enumerable:!0,configurable:!0}),l.prototype.toString=function(t){void 0===t&&(t=function(t){return String(t.key)});var e=[];return s(this._root,"",!0,(function(t){return e.push(t)}),t),e.join("")},l.prototype.update=function(t,e,n){var s=this._comparator,l=o(t,this._root,s),h=l.left,u=l.right;s(t,e)<0?u=i(e,n,u,s):h=i(e,n,h,s),this._root=function(t,e,n){return null===e?t:(null===t||((e=r(t.key,e,n)).left=t),e)}(h,u,s)},l.prototype.split=function(t){return o(t,this._root,this._comparator)},l.prototype[Symbol.iterator]=function(){var e,n,r;return t(this,(function(t){switch(t.label){case 0:e=this._root,n=[],r=!1,t.label=1;case 1:return r?[3,6]:null===e?[3,2]:(n.push(e),e=e.left,[3,5]);case 2:return 0===n.length?[3,4]:[4,e=n.pop()];case 3:return t.sent(),e=e.right,[3,5];case 4:r=!0,t.label=5;case 5:return[3,1];case 6:return[2]}}))},l}();function h(t,n,r,i){var o=i-r;if(o>0){var s=r+Math.floor(o/2),l=t[s],u=n[s],f=new e(l,u);return f.left=h(t,n,r,s),f.right=h(t,n,s+1,i),f}return null}function u(t,e,n){var r=n-e;if(r>0){var i=e+Math.floor(r/2),o=u(t,e,i),s=t.head;return s.left=o,t.head=t.head.next,s.right=u(t,i+1,n),s}return null}function f(t,e,n,r,i){if(!(n>=r)){for(var o=t[n+r>>1],s=n-1,l=r+1;;){do{s++}while(i(t[s],o)<0);do{l--}while(i(t[l],o)>0);if(s>=l)break;var h=t[s];t[s]=t[l],t[l]=h,h=e[s],e[s]=e[l],e[l]=h}f(t,e,n,l,i),f(t,e,l+1,r,i)}}const c=(t,e)=>t.ll.x<=e.x&&e.x<=t.ur.x&&t.ll.y<=e.y&&e.y<=t.ur.y,p=(t,e)=>{if(e.ur.x<t.ll.x||t.ur.x<e.ll.x||e.ur.y<t.ll.y||t.ur.y<e.ll.y)return null;const n=t.ll.x<e.ll.x?e.ll.x:t.ll.x,r=t.ur.x<e.ur.x?t.ur.x:e.ur.x;return{ll:{x:n,y:t.ll.y<e.ll.y?e.ll.y:t.ll.y},ur:{x:r,y:t.ur.y<e.ur.y?t.ur.y:e.ur.y}}};let g=Number.EPSILON;void 0===g&&(g=Math.pow(2,-52));const a=g*g,y=(t,e)=>{if(-g<t&&t<g&&-g<e&&e<g)return 0;const n=t-e;return n*n<a*t*e?0:t<e?-1:1};class x{constructor(){this.tree=new l,this.round(0)}round(t){const e=this.tree.add(t),n=this.tree.prev(e);if(null!==n&&0===y(e.key,n.key))return this.tree.remove(t),n.key;const r=this.tree.next(e);return null!==r&&0===y(e.key,r.key)?(this.tree.remove(t),r.key):t}}const b=new class{constructor(){this.reset()}reset(){this.xRounder=new x,this.yRounder=new x}round(t,e){return{x:this.xRounder.round(t),y:this.yRounder.round(e)}}},v=11102230246251565e-32,d=134217729,m=(3+8*v)*v;function E(t,e,n,r,i){let o,s,l,h,u=e[0],f=r[0],c=0,p=0;f>u==f>-u?(o=u,u=e[++c]):(o=f,f=r[++p]);let g=0;if(c<t&&p<n)for(f>u==f>-u?(s=u+o,l=o-(s-u),u=e[++c]):(s=f+o,l=o-(s-f),f=r[++p]),o=s,0!==l&&(i[g++]=l);c<t&&p<n;)f>u==f>-u?(s=o+u,h=s-o,l=o-(s-h)+(u-h),u=e[++c]):(s=o+f,h=s-o,l=o-(s-h)+(f-h),f=r[++p]),o=s,0!==l&&(i[g++]=l);for(;c<t;)s=o+u,h=s-o,l=o-(s-h)+(u-h),u=e[++c],o=s,0!==l&&(i[g++]=l);for(;p<n;)s=o+f,h=s-o,l=o-(s-h)+(f-h),f=r[++p],o=s,0!==l&&(i[g++]=l);return 0===o&&0!==g||(i[g++]=o),g}function S(t){return new Float64Array(t)}const _=22204460492503146e-32,w=11093356479670487e-47,k=S(4),R=S(8),I=S(12),P=S(16),N=S(4);function A(t,e,n,r,i,o){const s=(e-o)*(n-i),l=(t-i)*(r-o),h=s-l,u=Math.abs(s+l);return Math.abs(h)>=33306690738754716e-32*u?h:-function(t,e,n,r,i,o,s){let l,h,u,f,c,p,g,a,y,x,b,v,S,A,O,L,$,M;const z=t-i,B=n-i,G=e-o,T=r-o;A=z*T,p=d*z,g=p-(p-z),a=z-g,p=d*T,y=p-(p-T),x=T-y,O=a*x-(A-g*y-a*y-g*x),L=G*B,p=d*G,g=p-(p-G),a=G-g,p=d*B,y=p-(p-B),x=B-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,k[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,k[1]=S-(b+c)+(c-L),M=v+b,c=M-v,k[2]=v-(M-c)+(b-c),k[3]=M;let q=function(t,e){let n=e[0];for(let r=1;r<t;r++)n+=e[r];return n}(4,k),C=_*s;if(q>=C||-q>=C)return q;if(c=t-z,l=t-(z+c)+(c-i),c=n-B,u=n-(B+c)+(c-i),c=e-G,h=e-(G+c)+(c-o),c=r-T,f=r-(T+c)+(c-o),0===l&&0===h&&0===u&&0===f)return q;if(C=w*s+m*Math.abs(q),q+=z*f+T*l-(G*u+B*h),q>=C||-q>=C)return q;A=l*T,p=d*l,g=p-(p-l),a=l-g,p=d*T,y=p-(p-T),x=T-y,O=a*x-(A-g*y-a*y-g*x),L=h*B,p=d*h,g=p-(p-h),a=h-g,p=d*B,y=p-(p-B),x=B-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const F=E(4,k,4,N,R);A=z*f,p=d*z,g=p-(p-z),a=z-g,p=d*f,y=p-(p-f),x=f-y,O=a*x-(A-g*y-a*y-g*x),L=G*u,p=d*G,g=p-(p-G),a=G-g,p=d*u,y=p-(p-u),x=u-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const j=E(F,R,4,N,I);A=l*f,p=d*l,g=p-(p-l),a=l-g,p=d*f,y=p-(p-f),x=f-y,O=a*x-(A-g*y-a*y-g*x),L=h*u,p=d*h,g=p-(p-h),a=h-g,p=d*u,y=p-(p-u),x=u-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const U=E(j,I,4,N,P);return P[U-1]}(t,e,n,r,i,o,u)}const O=(t,e)=>t.x*e.y-t.y*e.x,L=(t,e)=>t.x*e.x+t.y*e.y,$=(t,e,n)=>{const r=A(t.x,t.y,e.x,e.y,n.x,n.y);return r>0?-1:r<0?1:0},M=t=>Math.sqrt(L(t,t)),z=(t,e,n)=>{const r={x:e.x-t.x,y:e.y-t.y},i={x:n.x-t.x,y:n.y-t.y};return O(i,r)/M(i)/M(r)},B=(t,e,n)=>{const r={x:e.x-t.x,y:e.y-t.y},i={x:n.x-t.x,y:n.y-t.y};return L(i,r)/M(i)/M(r)},G=(t,e,n)=>0===e.y?null:{x:t.x+e.x/e.y*(n-t.y),y:n},T=(t,e,n)=>0===e.x?null:{x:n,y:t.y+e.y/e.x*(n-t.x)};class q{static compare(t,e){const n=q.comparePoints(t.point,e.point);return 0!==n?n:(t.point!==e.point&&t.link(e),t.isLeft!==e.isLeft?t.isLeft?1:-1:F.compare(t.segment,e.segment))}static comparePoints(t,e){return t.x<e.x?-1:t.x>e.x?1:t.y<e.y?-1:t.y>e.y?1:0}constructor(t,e){void 0===t.events?t.events=[this]:t.events.push(this),this.point=t,this.isLeft=e}link(t){if(t.point===this.point)throw new Error("Tried to link already linked events");const e=t.point.events;for(let t=0,n=e.length;t<n;t++){const n=e[t];this.point.events.push(n),n.point=this.point}this.checkForConsuming()}checkForConsuming(){const t=this.point.events.length;for(let e=0;e<t;e++){const n=this.point.events[e];if(void 0===n.segment.consumedBy)for(let r=e+1;r<t;r++){const t=this.point.events[r];void 0===t.consumedBy&&(n.otherSE.point.events===t.otherSE.point.events&&n.segment.consume(t.segment))}}}getAvailableLinkedEvents(){const t=[];for(let e=0,n=this.point.events.length;e<n;e++){const n=this.point.events[e];n!==this&&!n.segment.ringOut&&n.segment.isInResult()&&t.push(n)}return t}getLeftmostComparator(t){const e=new Map,n=n=>{const r=n.otherSE;e.set(n,{sine:z(this.point,t.point,r.point),cosine:B(this.point,t.point,r.point)})};return(t,r)=>{e.has(t)||n(t),e.has(r)||n(r);const{sine:i,cosine:o}=e.get(t),{sine:s,cosine:l}=e.get(r);return i>=0&&s>=0?o<l?1:o>l?-1:0:i<0&&s<0?o<l?-1:o>l?1:0:s<i?-1:s>i?1:0}}}let C=0;class F{static compare(t,e){const n=t.leftSE.point.x,r=e.leftSE.point.x,i=t.rightSE.point.x,o=e.rightSE.point.x;if(o<n)return 1;if(i<r)return-1;const s=t.leftSE.point.y,l=e.leftSE.point.y,h=t.rightSE.point.y,u=e.rightSE.point.y;if(n<r){if(l<s&&l<h)return 1;if(l>s&&l>h)return-1;const n=t.comparePoint(e.leftSE.point);if(n<0)return 1;if(n>0)return-1;const r=e.comparePoint(t.rightSE.point);return 0!==r?r:-1}if(n>r){if(s<l&&s<u)return-1;if(s>l&&s>u)return 1;const n=e.comparePoint(t.leftSE.point);if(0!==n)return n;const r=t.comparePoint(e.rightSE.point);return r<0?1:r>0?-1:1}if(s<l)return-1;if(s>l)return 1;if(i<o){const n=e.comparePoint(t.rightSE.point);if(0!==n)return n}if(i>o){const n=t.comparePoint(e.rightSE.point);if(n<0)return 1;if(n>0)return-1}if(i!==o){const t=h-s,e=i-n,f=u-l,c=o-r;if(t>e&&f<c)return 1;if(t<e&&f>c)return-1}return i>o?1:i<o||h<u?-1:h>u?1:t.id<e.id?-1:t.id>e.id?1:0}constructor(t,e,n,r){this.id=++C,this.leftSE=t,t.segment=this,t.otherSE=e,this.rightSE=e,e.segment=this,e.otherSE=t,this.rings=n,this.windings=r}static fromRing(t,e,n){let r,i,o;const s=q.comparePoints(t,e);if(s<0)r=t,i=e,o=1;else{if(!(s>0))throw new Error(`Tried to create degenerate segment at [${t.x}, ${t.y}]`);r=e,i=t,o=-1}const l=new q(r,!0),h=new q(i,!1);return new F(l,h,[n],[o])}replaceRightSE(t){this.rightSE=t,this.rightSE.segment=this,this.rightSE.otherSE=this.leftSE,this.leftSE.otherSE=this.rightSE}bbox(){const t=this.leftSE.point.y,e=this.rightSE.point.y;return{ll:{x:this.leftSE.point.x,y:t<e?t:e},ur:{x:this.rightSE.point.x,y:t>e?t:e}}}vector(){return{x:this.rightSE.point.x-this.leftSE.point.x,y:this.rightSE.point.y-this.leftSE.point.y}}isAnEndpoint(t){return t.x===this.leftSE.point.x&&t.y===this.leftSE.point.y||t.x===this.rightSE.point.x&&t.y===this.rightSE.point.y}comparePoint(t){if(this.isAnEndpoint(t))return 0;const e=this.leftSE.point,n=this.rightSE.point,r=this.vector();if(e.x===n.x)return t.x===e.x?0:t.x<e.x?1:-1;const i=(t.y-e.y)/r.y,o=e.x+i*r.x;if(t.x===o)return 0;const s=(t.x-e.x)/r.x,l=e.y+s*r.y;return t.y===l?0:t.y<l?-1:1}getIntersection(t){const e=this.bbox(),n=t.bbox(),r=p(e,n);if(null===r)return null;const i=this.leftSE.point,o=this.rightSE.point,s=t.leftSE.point,l=t.rightSE.point,h=c(e,s)&&0===this.comparePoint(s),u=c(n,i)&&0===t.comparePoint(i),f=c(e,l)&&0===this.comparePoint(l),g=c(n,o)&&0===t.comparePoint(o);if(u&&h)return g&&!f?o:!g&&f?l:null;if(u)return f&&i.x===l.x&&i.y===l.y?null:i;if(h)return g&&o.x===s.x&&o.y===s.y?null:s;if(g&&f)return null;if(g)return o;if(f)return l;const a=((t,e,n,r)=>{if(0===e.x)return T(n,r,t.x);if(0===r.x)return T(t,e,n.x);if(0===e.y)return G(n,r,t.y);if(0===r.y)return G(t,e,n.y);const i=O(e,r);if(0==i)return null;const o={x:n.x-t.x,y:n.y-t.y},s=O(o,e)/i,l=O(o,r)/i;return{x:(t.x+l*e.x+(n.x+s*r.x))/2,y:(t.y+l*e.y+(n.y+s*r.y))/2}})(i,this.vector(),s,t.vector());return null===a?null:c(r,a)?b.round(a.x,a.y):null}split(t){const e=[],n=void 0!==t.events,r=new q(t,!0),i=new q(t,!1),o=this.rightSE;this.replaceRightSE(i),e.push(i),e.push(r);const s=new F(r,o,this.rings.slice(),this.windings.slice());return q.comparePoints(s.leftSE.point,s.rightSE.point)>0&&s.swapEvents(),q.comparePoints(this.leftSE.point,this.rightSE.point)>0&&this.swapEvents(),n&&(r.checkForConsuming(),i.checkForConsuming()),e}swapEvents(){const t=this.rightSE;this.rightSE=this.leftSE,this.leftSE=t,this.leftSE.isLeft=!0,this.rightSE.isLeft=!1;for(let t=0,e=this.windings.length;t<e;t++)this.windings[t]*=-1}consume(t){let e=this,n=t;for(;e.consumedBy;)e=e.consumedBy;for(;n.consumedBy;)n=n.consumedBy;const r=F.compare(e,n);if(0!==r){if(r>0){const t=e;e=n,n=t}if(e.prev===n){const t=e;e=n,n=t}for(let t=0,r=n.rings.length;t<r;t++){const r=n.rings[t],i=n.windings[t],o=e.rings.indexOf(r);-1===o?(e.rings.push(r),e.windings.push(i)):e.windings[o]+=i}n.rings=null,n.windings=null,n.consumedBy=e,n.leftSE.consumedBy=e.leftSE,n.rightSE.consumedBy=e.rightSE}}prevInResult(){return void 0!==this._prevInResult||(this.prev?this.prev.isInResult()?this._prevInResult=this.prev:this._prevInResult=this.prev.prevInResult():this._prevInResult=null),this._prevInResult}beforeState(){if(void 0!==this._beforeState)return this._beforeState;if(this.prev){const t=this.prev.consumedBy||this.prev;this._beforeState=t.afterState()}else this._beforeState={rings:[],windings:[],multiPolys:[]};return this._beforeState}afterState(){if(void 0!==this._afterState)return this._afterState;const t=this.beforeState();this._afterState={rings:t.rings.slice(0),windings:t.windings.slice(0),multiPolys:[]};const e=this._afterState.rings,n=this._afterState.windings,r=this._afterState.multiPolys;for(let t=0,r=this.rings.length;t<r;t++){const r=this.rings[t],i=this.windings[t],o=e.indexOf(r);-1===o?(e.push(r),n.push(i)):n[o]+=i}const i=[],o=[];for(let t=0,r=e.length;t<r;t++){if(0===n[t])continue;const r=e[t],s=r.poly;if(-1===o.indexOf(s))if(r.isExterior)i.push(s);else{-1===o.indexOf(s)&&o.push(s);const t=i.indexOf(r.poly);-1!==t&&i.splice(t,1)}}for(let t=0,e=i.length;t<e;t++){const e=i[t].multiPoly;-1===r.indexOf(e)&&r.push(e)}return this._afterState}isInResult(){if(this.consumedBy)return!1;if(void 0!==this._isInResult)return this._isInResult;const t=this.beforeState().multiPolys,e=this.afterState().multiPolys;switch(H.type){case"union":{const n=0===t.length,r=0===e.length;this._isInResult=n!==r;break}case"intersection":{let n,r;t.length<e.length?(n=t.length,r=e.length):(n=e.length,r=t.length),this._isInResult=r===H.numMultiPolys&&n<r;break}case"xor":{const n=Math.abs(t.length-e.length);this._isInResult=n%2==1;break}case"difference":{const n=t=>1===t.length&&t[0].isSubject;this._isInResult=n(t)!==n(e);break}default:throw new Error(`Unrecognized operation type found ${H.type}`)}return this._isInResult}}class j{constructor(t,e,n){if(!Array.isArray(t)||0===t.length)throw new Error("Input geometry is not a valid Polygon or MultiPolygon");if(this.poly=e,this.isExterior=n,this.segments=[],"number"!=typeof t[0][0]||"number"!=typeof t[0][1])throw new Error("Input geometry is not a valid Polygon or MultiPolygon");const r=b.round(t[0][0],t[0][1]);this.bbox={ll:{x:r.x,y:r.y},ur:{x:r.x,y:r.y}};let i=r;for(let e=1,n=t.length;e<n;e++){if("number"!=typeof t[e][0]||"number"!=typeof t[e][1])throw new Error("Input geometry is not a valid Polygon or MultiPolygon");let n=b.round(t[e][0],t[e][1]);n.x===i.x&&n.y===i.y||(this.segments.push(F.fromRing(i,n,this)),n.x<this.bbox.ll.x&&(this.bbox.ll.x=n.x),n.y<this.bbox.ll.y&&(this.bbox.ll.y=n.y),n.x>this.bbox.ur.x&&(this.bbox.ur.x=n.x),n.y>this.bbox.ur.y&&(this.bbox.ur.y=n.y),i=n)}r.x===i.x&&r.y===i.y||this.segments.push(F.fromRing(i,r,this))}getSweepEvents(){const t=[];for(let e=0,n=this.segments.length;e<n;e++){const n=this.segments[e];t.push(n.leftSE),t.push(n.rightSE)}return t}}class U{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");this.exteriorRing=new j(t[0],this,!0),this.bbox={ll:{x:this.exteriorRing.bbox.ll.x,y:this.exteriorRing.bbox.ll.y},ur:{x:this.exteriorRing.bbox.ur.x,y:this.exteriorRing.bbox.ur.y}},this.interiorRings=[];for(let e=1,n=t.length;e<n;e++){const n=new j(t[e],this,!1);n.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=n.bbox.ll.x),n.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=n.bbox.ll.y),n.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=n.bbox.ur.x),n.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=n.bbox.ur.y),this.interiorRings.push(n)}this.multiPoly=e}getSweepEvents(){const t=this.exteriorRing.getSweepEvents();for(let e=0,n=this.interiorRings.length;e<n;e++){const n=this.interiorRings[e].getSweepEvents();for(let e=0,r=n.length;e<r;e++)t.push(n[e])}return t}}class Y{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");try{"number"==typeof t[0][0][0]&&(t=[t])}catch(t){}this.polys=[],this.bbox={ll:{x:Number.POSITIVE_INFINITY,y:Number.POSITIVE_INFINITY},ur:{x:Number.NEGATIVE_INFINITY,y:Number.NEGATIVE_INFINITY}};for(let e=0,n=t.length;e<n;e++){const n=new U(t[e],this);n.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=n.bbox.ll.x),n.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=n.bbox.ll.y),n.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=n.bbox.ur.x),n.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=n.bbox.ur.y),this.polys.push(n)}this.isSubject=e}getSweepEvents(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const n=this.polys[e].getSweepEvents();for(let e=0,r=n.length;e<r;e++)t.push(n[e])}return t}}class V{static factory(t){const e=[];for(let n=0,r=t.length;n<r;n++){const r=t[n];if(!r.isInResult()||r.ringOut)continue;let i=null,o=r.leftSE,s=r.rightSE;const l=[o],h=o.point,u=[];for(;i=o,o=s,l.push(o),o.point!==h;)for(;;){const t=o.getAvailableLinkedEvents();if(0===t.length){const t=l[0].point,e=l[l.length-1].point;throw new Error(`Unable to complete output ring starting at [${t.x}, ${t.y}]. Last matching segment found ends at [${e.x}, ${e.y}].`)}if(1===t.length){s=t[0].otherSE;break}let n=null;for(let t=0,e=u.length;t<e;t++)if(u[t].point===o.point){n=t;break}if(null!==n){const t=u.splice(n)[0],r=l.splice(t.index);r.unshift(r[0].otherSE),e.push(new V(r.reverse()));continue}u.push({index:l.length,point:o.point});const r=o.getLeftmostComparator(i);s=t.sort(r)[0].otherSE;break}e.push(new V(l))}return e}constructor(t){this.events=t;for(let e=0,n=t.length;e<n;e++)t[e].segment.ringOut=this;this.poly=null}getGeom(){let t=this.events[0].point;const e=[t];for(let n=1,r=this.events.length-1;n<r;n++){const r=this.events[n].point,i=this.events[n+1].point;0!==$(r,t,i)&&(e.push(r),t=r)}if(1===e.length)return null;const n=e[0],r=e[1];0===$(n,t,r)&&e.shift(),e.push(e[0]);const i=this.isExteriorRing()?1:-1,o=this.isExteriorRing()?0:e.length-1,s=this.isExteriorRing()?e.length:-1,l=[];for(let t=o;t!=s;t+=i)l.push([e[t].x,e[t].y]);return l}isExteriorRing(){if(void 0===this._isExteriorRing){const t=this.enclosingRing();this._isExteriorRing=!t||!t.isExteriorRing()}return this._isExteriorRing}enclosingRing(){return void 0===this._enclosingRing&&(this._enclosingRing=this._calcEnclosingRing()),this._enclosingRing}_calcEnclosingRing(){let t=this.events[0];for(let e=1,n=this.events.length;e<n;e++){const n=this.events[e];q.compare(t,n)>0&&(t=n)}let e=t.segment.prevInResult(),n=e?e.prevInResult():null;for(;;){if(!e)return null;if(!n)return e.ringOut;if(n.ringOut!==e.ringOut)return n.ringOut.enclosingRing()!==e.ringOut?e.ringOut:e.ringOut.enclosingRing();e=n.prevInResult(),n=e?e.prevInResult():null}}}class X{constructor(t){this.exteriorRing=t,t.poly=this,this.interiorRings=[]}addInterior(t){this.interiorRings.push(t),t.poly=this}getGeom(){const t=[this.exteriorRing.getGeom()];if(null===t[0])return null;for(let e=0,n=this.interiorRings.length;e<n;e++){const n=this.interiorRings[e].getGeom();null!==n&&t.push(n)}return t}}class Q{constructor(t){this.rings=t,this.polys=this._composePolys(t)}getGeom(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const n=this.polys[e].getGeom();null!==n&&t.push(n)}return t}_composePolys(t){const e=[];for(let n=0,r=t.length;n<r;n++){const r=t[n];if(!r.poly)if(r.isExteriorRing())e.push(new X(r));else{const t=r.enclosingRing();t.poly||e.push(new X(t)),t.poly.addInterior(r)}}return e}}class W{constructor(t){let e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:F.compare;this.queue=t,this.tree=new l(e),this.segments=[]}process(t){const e=t.segment,n=[];if(t.consumedBy)return t.isLeft?this.queue.remove(t.otherSE):this.tree.remove(e),n;const r=t.isLeft?this.tree.add(e):this.tree.find(e);if(!r)throw new Error(`Unable to find segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] in SweepLine tree.`);let i,o,s=r,l=r;for(;void 0===i;)s=this.tree.prev(s),null===s?i=null:void 0===s.key.consumedBy&&(i=s.key);for(;void 0===o;)l=this.tree.next(l),null===l?o=null:void 0===l.key.consumedBy&&(o=l.key);if(t.isLeft){let r=null;if(i){const t=i.getIntersection(e);if(null!==t&&(e.isAnEndpoint(t)||(r=t),!i.isAnEndpoint(t))){const e=this._splitSafely(i,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}let s=null;if(o){const t=o.getIntersection(e);if(null!==t&&(e.isAnEndpoint(t)||(s=t),!o.isAnEndpoint(t))){const e=this._splitSafely(o,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}if(null!==r||null!==s){let t=null;if(null===r)t=s;else if(null===s)t=r;else{t=q.comparePoints(r,s)<=0?r:s}this.queue.remove(e.rightSE),n.push(e.rightSE);const i=e.split(t);for(let t=0,e=i.length;t<e;t++)n.push(i[t])}n.length>0?(this.tree.remove(e),n.push(t)):(this.segments.push(e),e.prev=i)}else{if(i&&o){const t=i.getIntersection(o);if(null!==t){if(!i.isAnEndpoint(t)){const e=this._splitSafely(i,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}if(!o.isAnEndpoint(t)){const e=this._splitSafely(o,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}}this.tree.remove(e)}return n}_splitSafely(t,e){this.tree.remove(t);const n=t.rightSE;this.queue.remove(n);const r=t.split(e);return r.push(n),void 0===t.consumedBy&&this.tree.add(t),r}}const Z="undefined"!=typeof process&&process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE||1e6,D="undefined"!=typeof process&&process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS||1e6;const H=new class{run(t,e,n){H.type=t,b.reset();const r=[new Y(e,!0)];for(let t=0,e=n.length;t<e;t++)r.push(new Y(n[t],!1));if(H.numMultiPolys=r.length,"difference"===H.type){const t=r[0];let e=1;for(;e<r.length;)null!==p(r[e].bbox,t.bbox)?e++:r.splice(e,1)}if("intersection"===H.type)for(let t=0,e=r.length;t<e;t++){const e=r[t];for(let n=t+1,i=r.length;n<i;n++)if(null===p(e.bbox,r[n].bbox))return[]}const i=new l(q.compare);for(let t=0,e=r.length;t<e;t++){const e=r[t].getSweepEvents();for(let t=0,n=e.length;t<n;t++)if(i.insert(e[t]),i.size>Z)throw new Error("Infinite loop when putting segment endpoints in a priority queue (queue size too big).")}const o=new W(i);let s=i.size,h=i.pop();for(;h;){const t=h.key;if(i.size===s){const e=t.segment;throw new Error(`Unable to pop() ${t.isLeft?"left":"right"} SweepEvent [${t.point.x}, ${t.point.y}] from segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] from queue.`)}if(i.size>Z)throw new Error("Infinite loop when passing sweep line over endpoints (queue size too big).");if(o.segments.length>D)throw new Error("Infinite loop when passing sweep line over endpoints (too many sweep line segments).");const e=o.process(t);for(let t=0,n=e.length;t<n;t++){const n=e[t];void 0===n.consumedBy&&i.insert(n)}s=i.size,h=i.pop()}b.reset();const u=V.factory(o.segments);return new Q(u).getGeom()}};var J={union:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("union",t,n)},intersection:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("intersection",t,n)},xor:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("xor",t,n)},difference:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("difference",t,n)}};return J}));
//# sourceMappingURL=polygon-clipping.umd.min.js.map

;
/* floor-geometry.js */
/* Editable room polygons, shared wall operations and paths through actual openings. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelFloorGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EPS = 1e-6;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const uid = () => globalThis.crypto?.randomUUID?.() || `wall-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const mix = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  const signedArea = (v) => v.reduce((s, a, i) => { const b = v[(i + 1) % v.length]; return s + a.x * b.y - b.x * a.y; }, 0) / 2;
  const area = (v) => Math.abs(signedArea(v));
  const bounds = (v) => { const x = Math.min(...v.map((p) => p.x)), y = Math.min(...v.map((p) => p.y)); return { x, y, widthM: round(Math.max(...v.map((p) => p.x)) - x), depthM: round(Math.max(...v.map((p) => p.y)) - y) }; };
  const contours = (room) => [room, ...(room.holes || [])];
  const verticesOf = (room) => contours(room).flatMap((ring) => ring.vertices);
  const areaOf = (room) => area(room.vertices) - (room.holes || []).reduce((sum, ring) => sum + area(ring.vertices), 0);
  function edgesOf(room) {
    let start = 0;
    return contours(room).flatMap((ring, contour) => {
      const offset = start; start += ring.vertices.length;
      return ring.vertices.map((a, local) => ({ a, b: ring.vertices[(local + 1) % ring.vertices.length], wall: ring.walls[local], index: offset + local, endIndex: offset + (local + 1) % ring.vertices.length, ring, local, hole: contour > 0 }));
    });
  }
  const edgeAt = (room, index) => room && Array.isArray(room.vertices) && Number.isInteger(index) && index >= 0 ? edgesOf(room).find((edge) => edge.index === index) : undefined;
  const vertexAt = (room, index) => edgeAt(room, index)?.a;
  const wallAt = (room, index) => edgeAt(room, index)?.wall;
  function offsetContour(vertices, thickness) {
    const signed = vertices.reduce((sum, p, i) => { const q = vertices[(i + 1) % vertices.length]; return sum + p.x * q.y - q.x * p.y; }, 0), sign = signed >= 0 ? 1 : -1;
    const lines = vertices.map((a, i) => { const b = vertices[(i + 1) % vertices.length], length = dist(a, b), dx = (b.x - a.x) / length, dy = (b.y - a.y) / length; return { x: a.x + dy * sign * thickness, y: a.y - dx * sign * thickness, dx, dy }; });
    return lines.map((line, i) => {
      const previous = lines[(i - 1 + lines.length) % lines.length], denominator = previous.dx * line.dy - previous.dy * line.dx;
      if (Math.abs(denominator) < 1e-9) return { x: round(line.x), y: round(line.y) };
      const t = ((line.x - previous.x) * line.dy - (line.y - previous.y) * line.dx) / denominator, p = { x: previous.x + previous.dx * t, y: previous.y + previous.dy * t };
      if (dist(p, vertices[i]) > thickness * 10) throw new Error("Кут кімнати надто гострий для заданої товщини стін.");
      return { x: round(p.x), y: round(p.y) };
    });
  }
  function projection(p, a, b) {
    const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const u = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length2)) : 0;
    const q = mix(a, b, u); return { ...q, u, distance: dist(p, q) };
  }
  function nearest(room, p, activeOnly = false) {
    return edgesOf(room).map(({ a, b, index }) => ({ ...projection(p, a, b), index })).filter((p) => !activeOnly || !wallAt(room, p.index).removed).sort((a, b) => a.distance - b.distance)[0] || null;
  }
  function contains(room, p, boundary = true) {
    // Stored relative point coordinates are rounded; tolerate 0.1 mm at a wall
    // for routing while keeping strict interior tests for room overlap.
    if (nearest(room, p)?.distance < (boundary ? .0001 : EPS)) return boundary;
    const inside = (v) => { let result = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) if ((v[i].y > p.y) !== (v[j].y > p.y) && p.x < (v[j].x - v[i].x) * (p.y - v[i].y) / (v[j].y - v[i].y) + v[i].x) result = !result; return result; };
    return inside(room.vertices) && !(room.holes || []).some((ring) => inside(ring.vertices));
  }
  const fit = (room, p, snap = false) => {
    const q = nearest(room, p, snap);
    return snap && q ? { x: q.x, y: q.y } : contains(room, p) ? { x: p.x, y: p.y } : q ? { x: q.x, y: q.y } : p;
  };
  const position = (room, point) => ({ x: room.x + point.u * room.widthM, y: room.y + point.v * room.depthM });
  function place(point, room, pos) {
    const q = fit(room, pos); point.u = round(Math.max(0, Math.min(1, (q.x - room.x) / room.widthM))); point.v = round(Math.max(0, Math.min(1, (q.y - room.y) / room.depthM)));
  }
  function centroid(room) {
    const v = room.vertices, b = bounds(v), centre = { x: b.x + b.widthM / 2, y: b.y + b.depthM / 2 };
    if (contains(room, centre, false)) return centre;
    // Put labels in usable floor space, away from an internal room or a notch.
    // The bounding-box centre can lie in the excluded part of either shape.
    let best = null, clearance = 0;
    for (let x = 1; x < 10; x += 2) for (let y = 1; y < 10; y += 2) {
      const p = { x: b.x + b.widthM * x / 10, y: b.y + b.depthM * y / 10 };
      if (!contains(room, p, false)) continue;
      const margin = nearest(room, p).distance;
      if (margin > clearance) { best = p; clearance = margin; }
    }
    if (best) return best;
    // A concave room's bounding-box centre can be outside it.
    const candidates = edgesOf(room).map(({ a, b }) => mix(a, b, .5));
    for (const p of candidates) { const q = mix(p, centre, .02); if (contains(room, q, false)) return q; }
    return v[0];
  }
  function layout(plan) {
    const rooms = plan.rooms.map((r) => ({ ...r, ...bounds(r.vertices), areaM2: areaOf(r) }));
    const minX = Math.min(0, ...rooms.map((r) => r.x - plan.wallThicknessM)), minY = Math.min(0, ...rooms.map((r) => r.y - plan.wallThicknessM));
    const maxX = Math.max(2, ...rooms.map((r) => r.x + r.widthM + plan.wallThicknessM)), maxY = Math.max(2, ...rooms.map((r) => r.y + r.depthM + plan.wallThicknessM));
    return { rooms, hall: rooms.find((r) => r.kind === "hall"), minX, minY, width: maxX - minX, height: maxY - minY, areaM2: rooms.filter((r) => r.kind !== "outdoor").reduce((s, r) => s + r.areaM2, 0) };
  }
  function validate(room) {
    if (room.holes != null && (!Array.isArray(room.holes) || room.holes.length > 23)) throw new Error("Некоректні внутрішні контури кімнати.");
    if (verticesOf(room).length > 256) throw new Error("У кімнаті забагато кутів.");
    contours(room).forEach(validateContour);
    const plain = (ring) => ({ vertices: ring.vertices, walls: ring.walls });
    (room.holes || []).forEach((hole, i, all) => {
      const crosses = hole.vertices.some((a, k) => room.vertices.some((b, j) => segmentsMeet(a, hole.vertices[(k + 1) % hole.vertices.length], b, room.vertices[(j + 1) % room.vertices.length])));
      if (hole.vertices.some((p) => !contains(plain(room), p, false)) || crosses) throw new Error("Внутрішній контур виходить за кімнату.");
      if (all.slice(i + 1).some((other) => roomsOverlap(plain(hole), plain(other)))) throw new Error("Внутрішні контури накладаються.");
    });
    if (areaOf(room) < .16 - EPS) throw new Error("Залишкова площа кімнати надто мала.");
    const b = bounds(room.vertices); if (b.widthM < .4 || b.depthM < .4 || b.widthM > 50 || b.depthM > 50) throw new Error("Габарити кімнати мають бути 0,4–50 м.");
    Object.assign(room, b); delete room.x; delete room.y;
  }
  function validateContour(room) {
    const v = room.vertices;
    if (!Array.isArray(v) || v.length < 3 || v.length > 48 || !Array.isArray(room.walls) || room.walls.length !== v.length) throw new Error("Кімната повинна мати 3–48 кутів і відповідні стіни.");
    if (v.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 100 || Math.abs(p.y) > 100)) throw new Error("Координати стін мають бути в межах ±100 м.");
    if (area(v) < .16 - EPS || v.some((a, i) => dist(a, v[(i + 1) % v.length]) < .15 - EPS)) throw new Error("Кімната надто мала або стіна коротша за 0,15 м.");
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) {
      if (j === i + 1 || (i === 0 && j === v.length - 1)) continue;
      const a = v[i], b = v[(i + 1) % v.length], c = v[j], d = v[(j + 1) % v.length];
      if (segmentsMeet(a, b, c, d)) throw new Error("Стіни кімнати не можуть перетинатися або накладатися.");
    }
    room.walls.forEach((wall) => {
      if (typeof wall.id !== "string" || !wall.id) throw new Error("Стіна повинна мати стабільний ідентифікатор."); wall.removed = wall.removed === true;
      for (const key of ["doorU", "windowU"]) if (wall[key] != null && (!Number.isFinite(wall[key]) || wall[key] < 0 || wall[key] > 1)) throw new Error("Некоректне положення отвору в стіні.");
    });
  }
  function segmentsMeet(a, b, c, d) {
    if (cross(a, b, c) * cross(a, b, d) < -EPS && cross(c, d, a) * cross(c, d, b) < -EPS) return true;
    return [projection(a, c, d).distance, projection(b, c, d).distance, projection(c, a, b).distance, projection(d, a, b).distance].some((v) => v < EPS);
  }
  function normalize(plan) {
    plan.rooms.forEach(validate);
    const wallIds = plan.rooms.flatMap((r) => edgesOf(r).map((e) => e.wall.id));
    if (new Set(wallIds).size !== wallIds.length) throw new Error("Повторені ідентифікатори стін.");
    for (let i = 0; i < plan.rooms.length; i++) for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j];
      if (roomsOverlap(a, b)) throw new Error(`Кімнати «${a.name}» і «${b.name}» накладаються.`);
    }
    return plan;
  }
  function roomsOverlap(a, b) {
    const aa = bounds(a.vertices), bb = bounds(b.vertices);
    if (aa.x + aa.widthM <= bb.x + EPS || bb.x + bb.widthM <= aa.x + EPS || aa.y + aa.depthM <= bb.y + EPS || bb.y + bb.depthM <= aa.y + EPS) return false;
    const samples = (r) => [...verticesOf(r), ...edgesOf(r).map(({ a, b }) => mix(a, b, .5)), centroid(r)];
    return samples(a).some((p) => contains(b, p, false)) || samples(b).some((p) => contains(a, p, false)) || edgesOf(a).some(({ a: p, b: q }) => edgesOf(b).some(({ a: u, b: v }) => cross(p, q, u) * cross(p, q, v) < -EPS && cross(u, v, p) * cross(u, v, q) < -EPS));
  }
  function inward(room, index) {
    const { a, b, ring, hole } = edgeAt(room, index), length = dist(a, b);
    const signed = ring.vertices.reduce((sum, p, i) => { const q = ring.vertices[(i + 1) % ring.vertices.length]; return sum + p.x * q.y - q.x * p.y; }, 0), sign = (signed >= 0 ? 1 : -1) * (hole ? -1 : 1);
    return { x: -(b.y - a.y) / length * sign, y: (b.x - a.x) / length * sign };
  }
  function relation(a, b, c, d, thickness) {
    const length = dist(a, b), otherLength = dist(c, d);
    if (!length || !otherLength || Math.abs((b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)) / (length * otherLength) > .015) return null;
    const gap = Math.abs(cross(a, b, c)) / length;
    if (gap > thickness * 1.35 + .015) return null;
    const u = (p) => ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length ** 2;
    const lo = Math.max(0, Math.min(u(c), u(d))), hi = Math.min(1, Math.max(u(c), u(d)));
    return (hi - lo) * length > .14 ? { lo, hi, gap } : null;
  }
  function neighbours(plan, roomId, index) {
    const room = plan.rooms.find((r) => r.id === roomId), { a, b } = edgeAt(room, index), result = [];
    plan.rooms.filter((r) => r.id !== roomId).forEach((r) => edgesOf(r).forEach(({ a: c, b: d, index: j }) => { const rel = relation(a, b, c, d, plan.wallThicknessM); if (rel) result.push({ room: r, index: j, ...rel }); }));
    return result;
  }
  function sharedWalls(plan) {
    const pairs = [];
    plan.rooms.forEach((room, ri) => edgesOf(room).forEach(({ a, b, index: i }) => {
      const na = inward(room, i);
      plan.rooms.slice(ri + 1).forEach((other) => edgesOf(other).forEach(({ a: c, b: d, index: j }) => {
        const nb = inward(other, j), rel = relation(a, b, c, d, plan.wallThicknessM);
        if (!rel || na.x * nb.x + na.y * nb.y > -.99) return;
        const from = mix(a, b, rel.lo), to = mix(a, b, rel.hi), oppositeFrom = projection(from, c, d), oppositeTo = projection(to, c, d);
        pairs.push({ roomId: room.id, otherId: other.id, index: i, otherIndex: j, lo: rel.lo, hi: rel.hi, from, to, oppositeFrom: { x: oppositeFrom.x, y: oppositeFrom.y }, oppositeTo: { x: oppositeTo.x, y: oppositeTo.y }, gap: rel.gap, lengthM: dist(from, to), removed: wallAt(room, i).removed || wallAt(other, j).removed });
      }));
    }));
    return pairs;
  }
  function stitchSharedWalls(input, roomId) {
    const plan = copy(input), cuts = new Map();
    sharedWalls(plan).filter((pair) => pair.roomId === roomId || pair.otherId === roomId).forEach((pair) => {
      for (const [id, index, ends] of [[pair.roomId, pair.index, [pair.from, pair.to]], [pair.otherId, pair.otherIndex, [pair.oppositeFrom, pair.oppositeTo]]]) {
        const room = plan.rooms.find((r) => r.id === id), { a, b } = edgeAt(room, index), key = `${id}:${index}`;
        if (!cuts.has(key)) cuts.set(key, { room, index, values: [] });
        ends.forEach((p) => { const u = projection(p, a, b).u; if (Math.min(u, 1 - u) * dist(a, b) >= .15 - EPS) cuts.get(key).values.push(u); });
      }
    });
    const entries = [...cuts.values()].sort((a, b) => a.room.id.localeCompare(b.room.id) || b.index - a.index);
    entries.forEach(({ room, index, values }) => {
      const edge = edgeAt(room, index), length = dist(edge.a, edge.b);
      const usable = [...new Set(values.map(round))].sort((a, b) => a - b).filter((u, i, all) => !i || (u - all[i - 1]) * length >= .15 - EPS);
      if (usable.length) splitAt(room, index, usable, true);
    });
    return normalize(plan);
  }
  function splitAt(room, index, cuts, automatic = false) {
    const { a, b, wall: edge, ring, local } = edgeAt(room, index), positions = [0, ...cuts.filter((u) => u > EPS && u < 1 - EPS), 1].sort((a, b) => a - b).filter((u, i, list) => !i || u - list[i - 1] > EPS);
    const vertices = positions.slice(0, -1).map((u, i) => i ? { ...mix(a, b, u), ...(automatic ? { auto: true } : {}) } : { ...a }), walls = positions.slice(0, -1).map((u, i) => {
      const w = { ...edge, id: i ? uid() : edge.id };
      for (const key of ["doorU", "windowU"]) w[key] = edge[key] != null && edge[key] >= u && edge[key] < positions[i + 1] ? (edge[key] - u) / (positions[i + 1] - u) : null;
      return w;
    });
    ring.vertices.splice(local, 1, ...vertices); ring.walls.splice(local, 1, ...walls);
  }
  function materialize(input, arrangement) {
    if (input.geometryMode === "free") return copy(input);
    const plan = copy(input); plan.geometryMode = "free"; plan.geometryConfirmed = false;
    plan.rooms.forEach((room) => {
      const r = arrangement.rooms.find((r) => r.id === room.id);
      room.vertices = [{ x: r.x, y: r.y }, { x: r.x + r.widthM, y: r.y }, { x: r.x + r.widthM, y: r.y + r.depthM }, { x: r.x, y: r.y + r.depthM }];
      room.walls = room.vertices.map(() => ({ id: uid(), removed: false, doorU: null, windowU: null }));
      if (room.row !== "hall") room.walls[room.row === "top" ? 2 : 0].doorU = room.row === "top" ? 1 - room.doorU : room.doorU;
      const index = { north: 0, east: 1, south: 2, west: 3 }[room.windowWall]; if (index != null) room.walls[index].windowU = .5;
      room.widthM = r.widthM; room.depthM = r.depthM;
    });
    // Segment long shared boundaries, including the corridor, so moving one wall
    // does not move the entire side of every adjoining room.
    const source = copy(plan);
    plan.rooms.forEach((room) => {
      const original = source.rooms.find((r) => r.id === room.id);
      for (let index = original.vertices.length - 1; index >= 0; index--) {
        const a = original.vertices[index], b = original.vertices[(index + 1) % original.vertices.length], cuts = [];
        neighbours(source, room.id, index).forEach((other) => { const r = other.room; [r.vertices[other.index], r.vertices[(other.index + 1) % r.vertices.length]].forEach((p) => { const q = projection(p, a, b); if (q.u > .001 && q.u < .999 && Math.min(q.u, 1 - q.u) * dist(a, b) >= .15) cuts.push(q.u); }); });
        // Keep only cuts separated by a usable wall length.
        const unique = [...new Set(cuts)].sort((a, b) => a - b).filter((u, i, all) => !i || (u - all[i - 1]) * dist(a, b) >= .15);
        if (unique.length) splitAt(room, index, unique, true);
      }
    });
    return normalize(plan);
  }
  function reproject(plan, before, scaledRoom = null) {
    const old = layout(before), after = layout(plan);
    plan.points.forEach((point) => {
      const a = old.rooms.find((r) => r.id === point.roomId), b = after.rooms.find((r) => r.id === point.roomId);
      if (!a || !b) return;
      let pos = position(a, point);
      if (scaledRoom === point.roomId) pos = { x: b.x + point.u * b.widthM, y: b.y + point.v * b.depthM };
      else {
        const on = nearest(a, pos);
        const oldEdge = on && edgeAt(a, on.index), newEdge = oldEdge && edgesOf(b).find((edge) => edge.wall.id === oldEdge.wall.id);
        const sameSurface = newEdge && Math.abs(cross(oldEdge.a, oldEdge.b, newEdge.a)) / dist(oldEdge.a, oldEdge.b) < EPS && Math.abs(cross(oldEdge.a, oldEdge.b, newEdge.b)) / dist(oldEdge.a, oldEdge.b) < EPS && projection(pos, newEdge.a, newEdge.b).distance < .0001;
        if (on?.distance < .04 && newEdge && !sameSurface) { pos.x += (newEdge.a.x - oldEdge.a.x) * (1 - on.u) + (newEdge.b.x - oldEdge.b.x) * on.u; pos.y += (newEdge.a.y - oldEdge.a.y) * (1 - on.u) + (newEdge.b.y - oldEdge.b.y) * on.u; }
        if (on?.distance < .04 && !newEdge && point.type !== "light" && nearest(b, pos, true)?.distance > .04) { pos = fit(b, pos, true); point.placementReview = true; }
      }
      if (dist(fit(b, pos), pos) > .0001) point.placementReview = true;
      place(point, b, pos);
    });
    plan.geometryConfirmed = false; return normalize(plan);
  }
  function refreshInnerBoundaries(plan, before) {
    const pairs = before.rooms.some((r) => r.holes?.some((h) => h.sourceRoomId)) ? sharedWalls(before) : [];
    plan.rooms.forEach((parent) => (parent.holes || []).forEach((hole) => {
      const child = plan.rooms.find((r) => r.id === hole.sourceRoomId), oldChild = before.rooms.find((r) => r.id === hole.sourceRoomId), oldParent = before.rooms.find((r) => r.id === parent.id), oldHole = oldParent?.holes?.find((h) => h.sourceRoomId === hole.sourceRoomId);
      if (!child || !oldChild || !oldHole || JSON.stringify(child.vertices) === JSON.stringify(oldChild.vertices)) return;
      validateContour(child);
      const oldOffset = offsetContour(oldChild.vertices, before.wallThicknessM), nextOffset = offsetContour(child.vertices, plan.wallThicknessM);
      const nextFaces = child.walls.map((wall, i) => ({ wall, a: nextOffset[i], b: nextOffset[(i + 1) % nextOffset.length] }));
      const faceById = new Map(nextFaces.map((face) => [face.wall.id, face]));
      const oldFace = (point) => oldOffset.map((a, i) => ({ ...projection(point, a, oldOffset[(i + 1) % oldOffset.length]), i })).sort((a, b) => a.distance - b.distance)[0];
      const moved = oldHole.vertices.map((point) => { const edge = oldFace(point), face = faceById.get(oldChild.walls[edge.i].id); return face ? { ...point, ...mix(face.a, face.b, edge.u) } : null; });
      if (moved.every(Boolean) && child.walls.length === oldChild.walls.length) {
        hole.vertices = moved.map((p) => ({ ...p, x: round(p.x), y: round(p.y) }));
      } else {
        // A deleted real corner changes the offset polygon's topology. Preserve
        // surviving face IDs and openings rather than retaining the old cutout.
        const used = new Set(plan.rooms.flatMap((r) => contours(r).filter((ring) => ring !== hole).flatMap((ring) => ring.walls.map((w) => w.id))));
        hole.vertices = nextOffset;
        hole.walls = nextFaces.map((face) => {
          const oldIndex = oldChild.walls.findIndex((w) => w.id === face.wall.id), pair = pairs.filter((s) => s.roomId === child.id && s.index === oldIndex && s.otherId === parent.id || s.otherId === child.id && s.otherIndex === oldIndex && s.roomId === parent.id).sort((a, b) => b.lengthM - a.lengthM)[0];
          const previous = pair && wallAt(oldParent, pair.roomId === parent.id ? pair.index : pair.otherIndex), wall = previous ? { ...previous } : { removed: false, doorU: null, windowU: null };
          if (!wall.id || used.has(wall.id)) wall.id = uid(); used.add(wall.id); return wall;
        });
      }
      // Openings on both faces share one world position along their wall.
      hole.walls.forEach((wall, i) => {
        const a = hole.vertices[i], b = hole.vertices[(i + 1) % hole.vertices.length], middle = mix(a, b, .5);
        const match = nextFaces.map((face) => ({ face, distance: projection(middle, face.a, face.b).distance })).sort((a, b) => a.distance - b.distance)[0]?.face;
        if (!match) return;
        wall.removed = match.wall.removed;
        const sourceIndex = child.walls.findIndex((w) => w.id === match.wall.id), sourceA = child.vertices[sourceIndex], sourceB = child.vertices[(sourceIndex + 1) % child.vertices.length];
        for (const key of ["doorU", "windowU"]) {
          if (match.wall[key] == null) { wall[key] = null; continue; }
          const opening = mix(sourceA, sourceB, match.wall[key]), length2 = dist(a, b) ** 2, u = ((opening.x - a.x) * (b.x - a.x) + (opening.y - a.y) * (b.y - a.y)) / length2;
          wall[key] = u >= -EPS && u <= 1 + EPS ? Math.max(0, Math.min(1, u)) : null;
        }
      });
    }));
  }
  function preserveContourDirection(plan, before) {
    plan.rooms.forEach((room) => {
      const old = before.rooms.find((r) => r.id === room.id); if (!old) return;
      const previous = contours(old);
      contours(room).forEach((ring, index) => { if (previous[index] && signedArea(previous[index].vertices) * signedArea(ring.vertices) < 0) throw new Error("Переміщення не може вивертати контур кімнати. Зупиніть стіну до протилежної межі."); });
    });
  }
  function moveVertices(input, roomId, changes, scaled = false, { anchors = [], wallIndex = null } = {}) {
    const plan = copy(input), source = input.rooms.find((r) => r.id === roomId), updates = new Map();
    if (!source) throw new Error("Оберіть кімнату для редагування.");
    const shared = sharedWalls(input), sourcePairs = shared.filter((s) => s.roomId === roomId || s.otherId === roomId), ownIndex = (s) => s.roomId === roomId ? s.index : s.otherIndex, otherId = (s) => s.roomId === roomId ? s.otherId : s.roomId;
    changes.forEach(({ index, dx, dy }) => {
      const origin = vertexAt(source, index);
      if (!origin || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Некоректне переміщення кута.");
      const incident = sourcePairs.filter((s) => { const edge = edgeAt(source, ownIndex(s)); return edge.index === index || edge.endIndex === index; });
      const linkedRooms = new Set((wallIndex == null ? incident : sourcePairs.filter((s) => ownIndex(s) === wallIndex)).map(otherId)), junctionRooms = new Set(incident.map(otherId));
      // A shared face moves both rooms. An outer wall only carries automatic
      // junctions on its neighbours; it must not pull their fixed corners.
      plan.rooms.forEach((r) => verticesOf(r).forEach((p, i) => { if (r.id === roomId && i === index || r.id !== roomId && (linkedRooms.has(r.id) || p.auto && junctionRooms.has(r.id)) && dist(origin, p) <= input.wallThicknessM * 1.5 + .015) updates.set(`${r.id}:${i}`, { room: r, index: i, dx, dy }); }));
      const edge = edgeAt(source, index), child = edge.hole && input.rooms.find((r) => r.id === edge.ring.sourceRoomId);
      if (child) {
        const corners = offsetContour(child.vertices, input.wallThicknessM), corner = corners.findIndex((p) => dist(p, origin) < .00001);
        if (corner >= 0) updates.set(`${child.id}:${corner}`, { room: plan.rooms.find((r) => r.id === child.id), index: corner, dx, dy });
      }
    });
    updates.forEach(({ room, index, dx, dy }) => { const p = vertexAt(room, index); p.x = round(p.x + dx); p.y = round(p.y + dy); });
    const edited = plan.rooms.find((r) => r.id === roomId), constraints = new Map();
    validateContour(edited);
    preserveContourDirection(plan, input);
    sourcePairs.forEach((pair) => {
      const own = edgeAt(edited, ownIndex(pair)), otherRoom = plan.rooms.find((r) => r.id === otherId(pair)), otherIndex = pair.roomId === roomId ? pair.otherIndex : pair.index, other = edgeAt(otherRoom, otherIndex), oldOther = edgeAt(input.rooms.find((r) => r.id === otherRoom.id), otherIndex);
      if (own.hole || other.hole || pair.lengthM < dist(oldOther.a, oldOther.b) - .0001) return;
      const n = inward(edited, own.index), a = { x: own.a.x - n.x * pair.gap, y: own.a.y - n.y * pair.gap }, b = { x: own.b.x - n.x * pair.gap, y: own.b.y - n.y * pair.gap };
      for (const index of [other.index, other.endIndex]) { const key = `${otherRoom.id}:${index}`; if (!constraints.has(key)) constraints.set(key, { room: otherRoom, index, lines: [] }); constraints.get(key).lines.push({ a, b }); }
    });
    constraints.forEach(({ room, index, lines }) => {
      const original = vertexAt(room, index), first = lines[0], dx = first.b.x - first.a.x, dy = first.b.y - first.a.y, other = lines.find((line) => Math.abs(dx * (line.b.y - line.a.y) - dy * (line.b.x - line.a.x)) > EPS);
      let point;
      if (other) {
        const ex = other.b.x - other.a.x, ey = other.b.y - other.a.y, t = ((other.a.x - first.a.x) * ey - (other.a.y - first.a.y) * ex) / (dx * ey - dy * ex);
        point = { x: first.a.x + dx * t, y: first.a.y + dy * t };
      } else { const u = ((original.x - first.a.x) * dx + (original.y - first.a.y) * dy) / (dx * dx + dy * dy); point = { x: first.a.x + dx * u, y: first.a.y + dy * u }; }
      if (lines.some((line) => Math.abs(cross(line.a, line.b, point)) / dist(line.a, line.b) > .0001)) throw new Error("Зміна створює несумісний стик спільних стін.");
      Object.assign(original, { x: round(point.x), y: round(point.y) });
    });
    // The wall used as an alignment reference must stay at its original level.
    anchors.forEach(({ roomId: id, index }) => { Object.assign(vertexAt(plan.rooms.find((r) => r.id === id), index), copy(vertexAt(input.rooms.find((r) => r.id === id), index))); });
    preserveContourDirection(plan, input);
    refreshInnerBoundaries(plan, input);
    // A moving T-junction can reach or pass an existing corner. Its automatic
    // split must disappear instead of leaving a zero-length or folded edge.
    plan.rooms.filter((r) => r.id !== roomId).flatMap(contours).forEach((room) => {
      for (let i = room.vertices.length - 1; i >= 0 && room.vertices.length > 3; i--) {
        const count = room.vertices.length, p = room.vertices[i], before = room.vertices[(i - 1 + count) % count], after = room.vertices[(i + 1) % count];
        if (!p.auto || Math.abs(cross(before, p, after)) > .00001) continue;
        const folded = (p.x - before.x) * (after.x - p.x) + (p.y - before.y) * (after.y - p.y) < 0;
        if (folded || Math.min(dist(before, p), dist(p, after)) < .15) mergeAutomaticCorner(room, i);
      }
    });
    normalize(plan); return reproject(plan, input, scaled ? roomId : null);
  }
  const moveVertex = (p, room, index, dx, dy) => moveVertices(p, room, [{ index, dx, dy }]);
  function moveWall(p, roomId, index, dx, dy) {
    const room = p.rooms.find((r) => r.id === roomId), edge = edgeAt(room, index);
    if (!edge || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Оберіть стіну й задайте коректне переміщення.");
    const { a, b, endIndex } = edge, len = dist(a, b), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, offset = dx * nx + dy * ny;
    return moveVertices(p, roomId, [{ index, dx: nx * offset, dy: ny * offset }, { index: endIndex, dx: nx * offset, dy: ny * offset }], false, { wallIndex: index });
  }
  function dragWall(input, roomId, index, dx, dy, { magnet = true, snapDistanceM = .22, gridStepM = 0 } = {}) {
    const room = input.rooms.find((r) => r.id === roomId);
    if (!room || !vertexAt(room, index) || !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(snapDistanceM) || snapDistanceM < 0 || !Number.isFinite(gridStepM) || gridStepM < 0) throw new Error("Некоректне переміщення стіни.");
    const { a, b, endIndex: nextIndex } = edgeAt(room, index), normal = inward(room, index), length = dist(a, b), tx = (b.x - a.x) / length, ty = (b.y - a.y) / length;
    const offset = dx * normal.x + dy * normal.y, candidates = [];
    if (magnet && !wallAt(room, index).removed) input.rooms.filter((r) => r.id !== roomId).forEach((other) => edgesOf(other).forEach(({ a: c, b: d, index: j, endIndex: k, wall }) => {
      const otherNormal = inward(other, j);
      if (wall.removed || normal.x * otherNormal.x + normal.y * otherNormal.y < 1 - 1e-10) return;
      const targetOffset = (c.x - a.x) * normal.x + (c.y - a.y) * normal.y, correction = Math.abs(targetOffset - offset);
      if (correction > snapDistanceM + EPS) return;
      const u = (p) => (p.x - a.x) * tx + (p.y - a.y) * ty, lo = Math.min(u(c), u(d)), hi = Math.max(u(c), u(d)), gap = Math.max(0, lo - length, -hi);
      if (gap > input.wallThicknessM + snapDistanceM + EPS) return;
      candidates.push({ other, j, k, targetOffset, correction, gap, from: { x: a.x + normal.x * targetOffset + tx * Math.min(0, lo), y: a.y + normal.y * targetOffset + ty * Math.min(0, lo) }, to: { x: a.x + normal.x * targetOffset + tx * Math.max(length, hi), y: a.y + normal.y * targetOffset + ty * Math.max(length, hi) } });
    }));
    candidates.sort((a, b) => a.correction - b.correction || a.gap - b.gap || a.other.id.localeCompare(b.other.id) || a.j - b.j);
    // Use the pointer position for magnetic acquisition, before grid rounding:
    // neighbouring walls do not necessarily sit on the same grid origin.
    for (const target of candidates) {
      const sx = normal.x * target.targetOffset, sy = normal.y * target.targetOffset;
      try {
        const plan = moveVertices(input, roomId, [{ index, dx: sx, dy: sy }, { index: nextIndex, dx: sx, dy: sy }], false, { wallIndex: index, anchors: [{ roomId: target.other.id, index: target.j }, { roomId: target.other.id, index: target.k }] });
        return { plan, dx: round(sx), dy: round(sy), alignment: { targetId: target.other.id, from: target.from, to: target.to } };
      } catch { /* Try another reference rather than saving an invalid contour. */ }
    }
    const gx = gridStepM ? Math.round(dx / gridStepM) * gridStepM : dx, gy = gridStepM ? Math.round(dy / gridStepM) * gridStepM : dy, distance = gx * normal.x + gy * normal.y;
    return { plan: moveWall(input, roomId, index, gx, gy), dx: round(normal.x * distance), dy: round(normal.y * distance), alignment: null };
  }
  function moveRoom(p, roomId, dx, dy) {
    const plan = copy(p), room = plan.rooms.find((r) => r.id === roomId);
    if (!room || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Некоректне переміщення кімнати.");
    const moving = new Set([roomId]);
    for (let count = 0; count < plan.rooms.length; count++) plan.rooms.filter((r) => moving.has(r.id)).forEach((r) => (r.holes || []).forEach((hole) => { if (hole.sourceRoomId && plan.rooms.some((s) => s.id === hole.sourceRoomId)) moving.add(hole.sourceRoomId); }));
    const rings = new Set(plan.rooms.filter((r) => moving.has(r.id)).flatMap(contours));
    plan.rooms.forEach((r) => (r.holes || []).filter((hole) => moving.has(hole.sourceRoomId)).forEach((hole) => rings.add(hole)));
    rings.forEach((ring) => ring.vertices.forEach((v) => { v.x = round(v.x + dx); v.y = round(v.y + dy); })); normalize(plan);
    // Moving a whole room is independent; attached points keep their relative positions.
    const before = layout(p), after = layout(plan);
    plan.points.forEach((point) => { const old = before.rooms.find((r) => r.id === point.roomId), r = after.rooms.find((r) => r.id === point.roomId), pos = position(old, point); if (moving.has(point.roomId)) { pos.x += dx; pos.y += dy; } else if (!contains(r, pos)) point.placementReview = true; place(point, r, pos); });
    plan.geometryConfirmed = false; return plan;
  }
  function dockRoom(input, roomId, dx, dy, { magnet = true, snapDistanceM = .22, alignEnds = true } = {}) {
    const source = input.rooms.find((r) => r.id === roomId);
    if (!source || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Некоректне переміщення кімнати.");
    if (source.holes?.some((h) => h.sourceRoomId) || input.rooms.some((r) => r.holes?.some((h) => h.sourceRoomId === roomId))) return { plan: moveRoom(input, roomId, dx, dy), docking: null };
    const shifted = (r, sx, sy) => { const next = copy(r); verticesOf(next).forEach((p) => { p.x = round(p.x + sx); p.y = round(p.y + sy); }); return next; };
    const moved = shifted(source, dx, dy), others = input.rooms.filter((r) => r.id !== roomId), collides = others.some((r) => roomsOverlap(moved, r));
    if (!magnet) return { plan: moveRoom(input, roomId, dx, dy), docking: null };
    const candidates = [], canPlace = (room) => others.every((other) => !roomsOverlap(room, other));
    edgesOf(moved).forEach(({ a, b, index: i }) => {
      const na = inward(moved, i);
      others.forEach((other) => edgesOf(other).forEach(({ a: c, b: d, index: j }) => {
        const nb = inward(other, j);
        if (na.x * nb.x + na.y * nb.y > -.9998) return;
        const signed = (a.x - c.x) * nb.x + (a.y - c.y) * nb.y, shift = -input.wallThicknessM - signed;
        if (!collides && Math.abs(shift) > snapDistanceM) return;
        const tx = (d.x - c.x) / dist(c, d), ty = (d.y - c.y) / dist(c, d), baseX = nb.x * shift, baseY = nb.y * shift;
        const tangent = alignEnds ? [...[a, b].flatMap((p) => [c, d].map((q) => (q.x - p.x) * tx + (q.y - p.y) * ty)).filter((v) => Math.abs(v) < snapDistanceM).sort((a, b) => Math.abs(a) - Math.abs(b)), 0] : [0];
        // Prefer aligned ends when close; retain the user's offset for a partial wall.
        for (const along of tangent) {
          const sx = baseX + along * tx, sy = baseY + along * ty, proposal = shifted(moved, sx, sy), edge = edgeAt(proposal, i);
          const rel = relation(edge.a, edge.b, c, d, input.wallThicknessM);
          if (!rel || (rel.hi - rel.lo) * dist(a, b) < .3 || !canPlace(proposal)) continue;
          candidates.push({ dx: dx + sx, dy: dy + sy, score: Math.abs(shift) + Math.abs(along) * .05 - (along ? .02 : 0), otherId: other.id, index: i, otherIndex: j }); break;
        }
      }));
    });
    candidates.sort((a, b) => a.score - b.score || a.otherId.localeCompare(b.otherId) || a.index - b.index);
    if (!candidates.length) return { plan: moveRoom(input, roomId, dx, dy), docking: null };
    const best = candidates[0], movedPlan = simplifyAutomaticVertices(moveRoom(input, roomId, best.dx, best.dy)), plan = stitchSharedWalls(movedPlan, roomId);
    const pair = sharedWalls(plan).filter((w) => w.roomId === roomId && w.otherId === best.otherId || w.otherId === roomId && w.roomId === best.otherId).sort((a, b) => b.lengthM - a.lengthM)[0];
    return { plan, docking: pair ? { ...pair, targetId: best.otherId, dx: round(best.dx), dy: round(best.dy) } : null };
  }
  function mergeAutomaticCorner(room, index) {
    const count = room.vertices.length, previousIndex = (index - 1 + count) % count, before = room.vertices[previousIndex], p = room.vertices[index], after = room.vertices[(index + 1) % count], previous = room.walls[previousIndex], next = room.walls[index];
    if (previous.removed !== next.removed) return false;
    const merged = { ...previous };
    for (const key of ["doorU", "windowU"]) {
      const a = previous[key] == null ? null : mix(before, p, previous[key]), b = next[key] == null ? null : mix(p, after, next[key]);
      if (a && b && dist(a, b) > .001) return false;
      const opening = a || b; merged[key] = opening ? projection(opening, before, after).u : null;
    }
    room.walls[previousIndex] = merged; room.vertices.splice(index, 1); room.walls.splice(index, 1); return true;
  }
  function simplifyAutomaticVertices(input) {
    const plan = copy(input);
    const significant = plan.rooms.flatMap((r) => contours(r).flatMap((ring) => ring.vertices.filter((p, i) => !p.auto || Math.abs(cross(ring.vertices[(i - 1 + ring.vertices.length) % ring.vertices.length], p, ring.vertices[(i + 1) % ring.vertices.length])) > .00001).map((p) => ({ ...p, roomId: r.id }))));
    plan.rooms.forEach((source) => contours(source).forEach((room) => {
      for (let i = room.vertices.length - 1; i >= 0 && room.vertices.length > 3; i--) {
        const count = room.vertices.length, p = room.vertices[i], before = room.vertices[(i - 1 + count) % count], after = room.vertices[(i + 1) % count];
        if (!p.auto || Math.abs(cross(before, p, after)) > .00001 || significant.some((q) => q.roomId !== source.id && dist(p, q) <= plan.wallThicknessM * 1.5 + .015)) continue;
        mergeAutomaticCorner(room, i);
      }
    }));
    return normalize(plan);
  }
  function duplicateRoom(input, roomId, { copyPoints = true } = {}) {
    const source = input.rooms.find((r) => r.id === roomId); if (!source) throw new Error("Оберіть кімнату для копіювання.");
    if (input.rooms.length >= 24) throw new Error("На плані може бути не більше 24 кімнат.");
    if (copyPoints && input.points.length + input.points.filter((p) => p.roomId === roomId && p.type !== "panel").length > 500) throw new Error("На плані може бути не більше 500 електричних точок.");
    const plan = copy(input), room = copy(source), old = bounds(source.vertices), box = layout(plan); room.id = uid(); room.name = `${source.name} · копія`; room.kind = source.kind === "hall" ? "room" : source.kind; room.row = "bottom";
    const dx = box.minX + box.width + .5 - old.x;
    verticesOf(room).forEach((v) => { v.x += dx; }); edgesOf(room).forEach(({ wall }) => { wall.id = uid(); }); (room.holes || []).forEach((hole) => { delete hole.sourceRoomId; }); plan.rooms.push(room);
    if (copyPoints) {
      const points = plan.points.filter((p) => p.roomId === roomId && p.type !== "panel"), ids = new Map(points.map((p) => [p.id, uid()])), used = new Set(plan.points.map((p) => p.label));
      points.forEach((point) => {
        const next = copy(point); next.id = ids.get(point.id); next.roomId = room.id;
        const prefix = { light: "EL", socket: "X", switch: "S", equipment: "EP", junction: "Д" }[point.type]; let number = 1; while (used.has(`${prefix}${number}`)) number++; next.label = `${prefix}${number}`; used.add(next.label);
        if (point.supplyFromId) next.supplyFromId = ids.get(point.supplyFromId) || point.supplyFromId;
        if (point.type === "switch") { next.controlsId = ids.get(point.controlsId) || ""; if (!next.controlsId) next.circuitId = ""; }
        plan.points.push(next);
      });
    }
    plan.geometryConfirmed = false;
    return { plan: normalize(plan), roomId: room.id };
  }
  function placeBeside(input, roomId, anchorId) {
    const room = layout(input).rooms.find((r) => r.id === roomId), anchor = layout(input).rooms.find((r) => r.id === anchorId);
    if (!room || !anchor || roomId === anchorId) return { plan: copy(input), docking: null };
    const t = input.wallThicknessM, targets = [{ x: anchor.x + anchor.widthM + t, y: anchor.y }, { x: anchor.x - room.widthM - t, y: anchor.y }, { x: anchor.x, y: anchor.y + anchor.depthM + t }, { x: anchor.x, y: anchor.y - room.depthM - t }];
    for (const target of targets) {
      try { moveRoom(input, roomId, target.x - room.x, target.y - room.y); return dockRoom(input, roomId, target.x - room.x, target.y - room.y); } catch { /* Try the next free side of the anchor. */ }
    }
    return { plan: copy(input), docking: null };
  }
  function resizeWall(p, roomId, index, lengthM) {
    if (!Number.isFinite(lengthM) || lengthM < .15 || lengthM > 50) throw new Error("Довжина стіни має бути 0,15–50 м.");
    const room = p.rooms.find((r) => r.id === roomId), edge = edgeAt(room, index);
    if (!edge) throw new Error("Оберіть стіну для зміни довжини.");
    const { a, b, endIndex } = edge, current = dist(a, b);
    return moveVertex(p, roomId, endIndex, (b.x - a.x) * (lengthM / current - 1), (b.y - a.y) * (lengthM / current - 1));
  }
  function resizeRoom(p, roomId, width, depth) {
    if (![width, depth].every((value) => Number.isFinite(value) && value >= .4 && value <= 50)) throw new Error("Габарити кімнати мають бути 0,4–50 м.");
    const room = layout(p).rooms.find((r) => r.id === roomId);
    if (!room) throw new Error("Оберіть кімнату для зміни розмірів.");
    return moveVertices(p, roomId, verticesOf(room).map((v, index) => ({ index, dx: (v.x - room.x) * (width / room.widthM - 1), dy: (v.y - room.y) * (depth / room.depthM - 1) })), true);
  }
  function splitWall(p, roomId, index, fraction = .5) {
    let plan = copy(p);
    const source = plan.rooms.find((r) => r.id === roomId), edge = edgeAt(source, index);
    if (!edge) throw new Error("Оберіть стіну для додавання кута.");
    const wall = edge.wall, length = dist(edge.a, edge.b), changes = {};
    if (!Number.isFinite(fraction) || Math.min(fraction, 1 - fraction) * length < .15 - EPS) throw new Error("Новий кут має бути щонайменше за 0,15 м від кінців стіни.");
    // An opening cannot straddle a newly introduced bend. Keep openings away
    // from the split; remove a crossing one on both faces for explicit placement.
    for (const [key, halfWidth] of [["doorU", .4], ["windowU", .7]]) if (wall[key] != null && Math.abs(wall[key] - fraction) * length <= Math.min(halfWidth, length * .35)) changes[key] = null;
    if (Object.keys(changes).length) plan = setWall(plan, roomId, index, changes);
    const split = mix(edge.a, edge.b, fraction);
    neighbours(plan, roomId, index).forEach((other) => {
      const { a, b } = edgeAt(other.room, other.index), u = projection(split, a, b).u;
      if (Math.min(u, 1 - u) * dist(a, b) >= .15) splitAt(other.room, other.index, [u]);
    });
    splitAt(plan.rooms.find((r) => r.id === roomId), index, [fraction]); plan.geometryConfirmed = false; return normalize(plan);
  }
  function removeVertex(p, roomId, index) {
    const plan = copy(p), room = plan.rooms.find((r) => r.id === roomId);
    const selected = edgeAt(room, index);
    if (!selected) throw new Error("Оберіть кут для видалення.");
    const { ring, local } = selected;
    if (ring.vertices.length <= 3) throw new Error("У контурі має залишитися щонайменше три кути.");
    const previousPoint = ring.vertices[(local - 1 + ring.vertices.length) % ring.vertices.length], followingPoint = ring.vertices[(local + 1) % ring.vertices.length];
    const straight = projection(selected.a, previousPoint, followingPoint).distance < .00001;
    if (!straight && selected.hole && ring.sourceRoomId) {
      const child = p.rooms.find((r) => r.id === ring.sourceRoomId), corner = child && offsetContour(child.vertices, p.wallThicknessM).findIndex((v) => dist(v, selected.a) < .00001);
      if (corner >= 0) return removeVertex(p, child.id, corner);
    }
    if (straight) {
      const removals = [{ room, index }];
      sharedWalls(p).filter((s) => s.roomId === roomId || s.otherId === roomId).forEach((s) => {
        const ownIndex = s.roomId === roomId ? s.index : s.otherIndex, own = edgeAt(p.rooms.find((r) => r.id === roomId), ownIndex);
        if (own.index !== index && own.endIndex !== index) return;
        const otherId = s.roomId === roomId ? s.otherId : s.roomId, otherIndex = s.roomId === roomId ? s.otherIndex : s.index, otherRoom = plan.rooms.find((r) => r.id === otherId), other = edgeAt(otherRoom, otherIndex), q = projection(selected.a, other.a, other.b);
        for (const vi of [other.index, other.endIndex]) {
          const edge = edgeAt(otherRoom, vi), count = edge.ring.vertices.length;
          if (count <= 3 || dist(edge.a, q) > .00001) continue;
          const before = edge.ring.vertices[(edge.local - 1 + count) % count], after = edge.ring.vertices[(edge.local + 1) % count];
          if (projection(edge.a, before, after).distance < .00001 && !removals.some((r) => r.room.id === otherId && r.index === vi)) removals.push({ room: otherRoom, index: vi });
        }
      });
      removals.sort((a, b) => a.room.id.localeCompare(b.room.id) || b.index - a.index).forEach(({ room: r, index: vi }) => {
        const edge = edgeAt(r, vi);
        if (!mergeAutomaticCorner(edge.ring, edge.local)) throw new Error("Ділянки мають різні отвори або стан стіни. Збережіть проміжний кут чи спочатку узгодьте ці ділянки.");
      });
    } else {
      ring.vertices.splice(local, 1); ring.walls.splice(local, 1);
      const previous = ring.walls[(local - 1 + ring.walls.length) % ring.walls.length]; previous.doorU = null; previous.windowU = null;
    }
    preserveContourDirection(plan, p); refreshInnerBoundaries(plan, p); normalize(plan); return reproject(plan, p);
  }
  function setWall(p, roomId, index, changes) {
    const plan = copy(p), room = plan.rooms.find((r) => r.id === roomId), wall = wallAt(room, index), affected = [{ room, index }];
    if (!wall) throw new Error("Оберіть стіну для зміни її властивостей.");
    Object.assign(wall, changes);
    neighbours(plan, roomId, index).forEach((other) => {
      affected.push(other);
      const partner = wallAt(other.room, other.index);
      if (Object.hasOwn(changes, "removed")) partner.removed = wall.removed;
      for (const key of ["doorU", "windowU"]) if (Object.hasOwn(changes, key)) {
        const edge = edgeAt(room, index), otherEdge = edgeAt(other.room, other.index), opening = wall[key] == null ? null : mix(edge.a, edge.b, wall[key]);
        const length2 = dist(otherEdge.a, otherEdge.b) ** 2, u = opening && ((opening.x - otherEdge.a.x) * (otherEdge.b.x - otherEdge.a.x) + (opening.y - otherEdge.a.y) * (otherEdge.b.y - otherEdge.a.y)) / length2;
        partner[key] = opening && u >= -EPS && u <= 1 + EPS ? Math.max(0, Math.min(1, u)) : null;
      }
    });
    if (changes.removed) {
      const arrangement = layout(plan);
      affected.forEach(({ room, index }) => plan.points.filter((point) => point.roomId === room.id && point.type !== "light").forEach((point) => { const r = arrangement.rooms.find((r) => r.id === room.id), edge = edgeAt(room, index); if (projection(position(r, point), edge.a, edge.b).distance < .04) point.placementReview = true; }));
    }
    plan.geometryConfirmed = false; return normalize(plan);
  }
  function openingPosition(room, index, kind, requested = .5) {
    const edge = edgeAt(room, index);
    if (!edge || !["door", "window"].includes(kind)) throw new Error("Оберіть двері або вікно на стіні.");
    const length = dist(edge.a, edge.b), half = Math.min(kind === "door" ? .4 : .7, length * .35) / length;
    const otherKey = kind === "door" ? "windowU" : "doorU", other = edge.wall[otherKey], choices = [[half, 1 - half]];
    if (other != null) {
      const otherHalf = Math.min(kind === "door" ? .7 : .4, length * .35) / length, reach = half + otherHalf;
      choices.splice(0, 1, [half, Math.min(1 - half, other - reach)], [Math.max(half, other + reach), 1 - half]);
    }
    const available = choices.filter(([lo, hi]) => lo <= hi + EPS).map(([lo, hi]) => Math.max(lo, Math.min(hi, requested)));
    if (!available.length) throw new Error("На цій стіні замало місця для дверей і вікна без накладання. Оберіть іншу стіну.");
    return available.sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))[0];
  }
  function toggleOpening(input, roomId, index, kind) {
    const room = input.rooms.find((r) => r.id === roomId), edge = edgeAt(room, index);
    if (!edge || !["door", "window"].includes(kind)) throw new Error("Спочатку оберіть стіну для дверей або вікна.");
    const key = `${kind}U`;
    return setWall(input, roomId, index, { removed: false, [key]: edge.wall[key] != null ? null : openingPosition(room, index, kind) });
  }
  function moveOpening(input, roomId, index, kind, dx, dy, { gridStepM = 0 } = {}) {
    const room = input.rooms.find((r) => r.id === roomId), edge = edgeAt(room, index);
    if (!edge || !["door", "window"].includes(kind) || edge.wall[`${kind}U`] == null || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Оберіть наявні двері або вікно для переміщення.");
    const length = dist(edge.a, edge.b), offset = (dx * (edge.b.x - edge.a.x) + dy * (edge.b.y - edge.a.y)) / length;
    if (Math.abs(offset) < EPS) return copy(input);
    let position = edge.wall[`${kind}U`] * length + offset;
    if (gridStepM > 0) position = Math.round(position / gridStepM) * gridStepM;
    return setWall(input, roomId, index, { [`${kind}U`]: openingPosition(room, index, kind, position / length) });
  }
  function removeRoom(p, roomId) {
    const plan = copy(p), removedIds = new Set(plan.points.filter((point) => point.roomId === roomId).map((point) => point.id)), panel = plan.points.find((point) => point.roomId === roomId && point.type === "panel");
    plan.rooms = plan.rooms.filter((r) => r.id !== roomId); plan.points = plan.points.filter((point) => !removedIds.has(point.id));
    plan.points.filter((point) => removedIds.has(point.controlsId)).forEach((point) => { point.controlsId = ""; point.circuitId = ""; });
    plan.points.filter((point) => removedIds.has(point.supplyFromId)).forEach((point) => { point.supplyFromId = ""; point.placementReview = true; });
    if (panel && plan.rooms.length) { const room = layout(plan).rooms.find((r) => r.kind === "hall") || layout(plan).rooms[0]; panel.roomId = room.id; place(panel, room, room.vertices[0]); panel.placementReview = true; plan.points.unshift(panel); }
    plan.geometryConfirmed = false; return normalize(plan);
  }
  function addRoom(p) {
    if (p.rooms.length >= 24) throw new Error("На плані може бути не більше 24 кімнат.");
    const plan = copy(p), box = layout(plan), roomId = uid(), x = plan.rooms.length ? box.minX + box.width + .8 : .12, y = .12;
    plan.rooms.push({ id: roomId, kind: "room", name: "Нова кімната", row: "bottom", order: plan.rooms.length, widthM: 3, depthM: 3, routeLevelM: 0, doorU: .5, windowWall: "none", vertices: [{ x, y }, { x: x + 3, y }, { x: x + 3, y: y + 3 }, { x, y: y + 3 }], walls: Array.from({ length: 4 }, () => ({ id: uid(), removed: false, doorU: null, windowU: null })) });
    if (!plan.points.some((p) => p.type === "panel")) plan.points.push({ id: uid(), type: "panel", label: "Щ1", name: "Щиток", roomId, u: 0, v: .5, heightM: 1.5, circuitId: "" });
    plan.geometryConfirmed = false; return normalize(plan);
  }
  function connections(plan, rooms = layout(plan).rooms, { throughWalls = false } = {}) {
    const links = [];
    rooms.forEach((room, ri) => edgesOf(room).forEach(({ a, b, wall, index: i }) => {
      rooms.slice(ri + 1).forEach((other) => edgesOf(other).forEach(({ a: c, b: d, wall: partner, index: j }) => {
        const rel = relation(a, b, c, d, plan.wallThicknessM);
        const closed = !wall.removed && !partner.removed && wall.doorU == null && partner.doorU == null;
        if (!rel || closed && !throughWalls) return;
        let u = (rel.lo + rel.hi) / 2;
        if (!closed && !wall.removed && !partner.removed) {
          u = wall.doorU != null ? wall.doorU : projection(mix(c, d, partner.doorU), a, b).u;
          if (u < rel.lo - EPS || u > rel.hi + EPS) return;
        }
        const start = mix(a, b, u), end = projection(start, c, d);
        links.push({ a: room.id, b: other.id, from: start, to: { x: end.x, y: end.y }, edgeA: i, edgeB: j, open: wall.removed || partner.removed, throughWall: closed });
      }));
    }));
    return links;
  }
  function segmentInside(room, a, b) {
    if (!contains(room, a) || !contains(room, b)) return false;
    const cuts = [0, 1], dx = b.x - a.x, dy = b.y - a.y;
    edgesOf(room).forEach(({ a: c, b: d }) => {
      const ex = d.x - c.x, ey = d.y - c.y, denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) < EPS) return;
      const u = ((c.x - a.x) * ey - (c.y - a.y) * ex) / denominator, v = ((c.x - a.x) * dy - (c.y - a.y) * dx) / denominator;
      if (u > 0 && u < 1 && v >= 0 && v <= 1) cuts.push(u);
    });
    cuts.sort((a, b) => a - b);
    return cuts.slice(1).every((u, i) => contains(room, mix(a, b, (u + cuts[i]) / 2)));
  }
  function insideRoute(room, a, b) {
    if (dist(a, b) < EPS) return [a];
    for (const elbow of [{ x: a.x, y: b.y }, { x: b.x, y: a.y }]) if (segmentInside(room, a, elbow) && segmentInside(room, elbow, b)) return [a, elbow, b].filter((p, i, list) => !i || dist(p, list[i - 1]) > EPS);
    const nodes = [a, b, ...verticesOf(room)], edges = nodes.map(() => []);
    nodes.forEach((p, i) => nodes.slice(i + 1).forEach((q, k) => { const j = i + k + 1; if (segmentInside(room, p, q)) { edges[i].push({ to: j, cost: dist(p, q), path: [p, q] }); edges[j].push({ to: i, cost: dist(p, q), path: [q, p] }); } }));
    return shortest(nodes, edges, 0, 1);
  }
  function shortest(nodes, edges, start, target) {
    const costs = nodes.map(() => Infinity), previous = [], visited = new Set(); costs[start] = 0;
    while (visited.size < nodes.length) {
      let current = -1; costs.forEach((cost, i) => { if (!visited.has(i) && (current < 0 || cost < costs[current])) current = i; });
      if (current < 0 || !Number.isFinite(costs[current])) return null;
      if (current === target) break; visited.add(current);
      edges[current].forEach((edge) => { if (costs[current] + edge.cost < costs[edge.to] - EPS) { costs[edge.to] = costs[current] + edge.cost; previous[edge.to] = { from: current, path: edge.path }; } });
    }
    const chunks = []; let at = target;
    while (at !== start) { const item = previous[at]; if (!item) return null; chunks.unshift(item.path); at = item.from; }
    return chunks.flat().filter((p, i, list) => !i || dist(p, list[i - 1]) > EPS || p.z !== list[i - 1].z);
  }
  function route(plan, from, to, arrangement, throughWalls = false) {
    const rooms = arrangement.rooms, a = rooms.find((r) => r.id === from.roomId), b = rooms.find((r) => r.id === to.roomId);
    if (!a || !b) return null;
    const level = (r) => r.kind === "outdoor" ? r.routeLevelM : plan.routing === "ceiling" ? plan.ceilingHeightM : 0;
    const nodes = [{ ...position(a, from), z: level(a), roomId: a.id }, { ...position(b, to), z: level(b), roomId: b.id }], links = connections(plan, rooms, { throughWalls });
    links.forEach((link) => { const r = rooms.find((r) => r.id === link.a), s = rooms.find((r) => r.id === link.b); nodes.push({ ...link.from, z: level(r), roomId: r.id }, { ...link.to, z: level(s), roomId: s.id }); });
    const edges = nodes.map(() => []), add = (i, j, path) => { const cost = path.slice(1).reduce((sum, p, k) => sum + dist(p, path[k]) + Math.abs(p.z - path[k].z), 0); edges[i].push({ to: j, path, cost }); edges[j].push({ to: i, path: [...path].reverse(), cost }); };
    nodes.forEach((p, i) => nodes.slice(i + 1).forEach((q, k) => { const j = i + k + 1; if (p.roomId !== q.roomId) return; const path = insideRoute(rooms.find((r) => r.id === p.roomId), p, q); if (path) add(i, j, path.map((v) => ({ x: v.x, y: v.y, z: p.z }))); }));
    links.forEach((_, i) => { const start = 2 + i * 2, end = start + 1; add(start, end, [nodes[start], { ...nodes[end], z: nodes[start].z }, nodes[end]]); });
    const path = shortest(nodes, edges, 0, 1);
    // A cable may pass through a shared partition without a doorway. Prefer
    // existing openings; only use preliminary wall penetrations as a fallback.
    if (!path) return throughWalls ? null : route(plan, from, to, arrangement, true);
    const same = (p, q) => p && q && dist(p, q) < EPS;
    const wallPassages = links.filter((link) => link.throughWall && path.some((p, i) => same(p, link.from) && same(path[i + 1], link.to) || same(p, link.to) && same(path[i + 1], link.from))).map((link) => ({ fromRoomId: link.a, toRoomId: link.b, x: round(link.from.x), y: round(link.from.y) }));
    path.unshift({ ...nodes[0], z: from.heightM === null ? plan.ceilingHeightM : from.heightM }); path.push({ ...nodes[1], z: to.heightM === null ? plan.ceilingHeightM : to.heightM });
    let horizontalM = 0, verticalM = 0;
    path.slice(1).forEach((p, i) => { horizontalM += dist(p, path[i]); verticalM += Math.abs(p.z - path[i].z); });
    return { points: path.map((p) => ({ x: round(p.x), y: round(p.y), z: round(p.z) })), horizontalM: round(horizontalM), verticalM: round(verticalM), lengthM: round(horizontalM + verticalM), wallPassages };
  }
  return { area, areaOf, bounds, contours, edgesOf, verticesOf, edgeAt, vertexAt, wallAt, inward, offsetContour, centroid, contains, nearest, fit, place, position, layout, normalize, materialize, moveVertex, moveWall, dragWall, moveRoom, dockRoom, sharedWalls, stitchSharedWalls, duplicateRoom, placeBeside, resizeWall, resizeRoom, splitWall, removeVertex, setWall, openingPosition, toggleOpening, moveOpening, removeRoom, addRoom, connections, insideRoute, route };
});

;
/* floor-plan.js */
/* Parametric example plans and explicit 3D cable take-off. No DOM or electrical rewiring. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./floor-geometry.js") : root.PanelFloorGeometry);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelFloorPlan = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (G) {
  "use strict";
  const VERSION = 1;
  const TYPES = { panel: "Щиток", socket: "Розетка", light: "Світильник", switch: "Вимикач", equipment: "Техніка", junction: "Доза (розподільна коробка)" };
  const COLORS = ["#276d93", "#a56c32", "#6f65a1", "#41866c", "#a55169", "#647f35", "#bd6c36", "#438c99", "#746b61", "#8b67a1"];
  const TEMPLATES = {
    "apartment-1": { title: "1-кімнатна квартира", top: [["living", "Житлова кімната", 5.1, 3.6]], bottom: [["kitchen", "Кухня", 3, 3], ["bath", "Ванна", 2.1, 2.3]] },
    "apartment-2": { title: "2-кімнатна квартира", top: [["living", "Вітальня", 4.6, 3.6], ["bedroom", "Спальня", 3.6, 3.6]], bottom: [["kitchen", "Кухня", 3.4, 3], ["bath", "Ванна", 2.2, 2.5], ["storage", "Гардероб", 2.6, 2.2]] },
    "apartment-3": { title: "3-кімнатна квартира", top: [["living", "Вітальня", 4.8, 3.8], ["bedroom", "Спальня", 3.6, 3.6], ["bedroom2", "Друга спальня", 3.4, 3.6]], bottom: [["kitchen", "Кухня", 5, 3], ["bath", "Ванна", 2.4, 2.6], ["storage", "Гардероб", 4.4, 2]] },
    house: { title: "Приватний будинок", top: [["living", "Вітальня", 5.4, 4], ["bedroom", "Спальня", 3.8, 3.6], ["bedroom2", "Друга спальня", 3.6, 3.6]], bottom: [["kitchen", "Кухня", 4.4, 3.6], ["bath", "Ванна", 2.6, 2.8], ["utility", "Господарське", 3.4, 3], ["outdoor", "Ґанок / зовнішня зона", 2.4, 3]] },
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const round = (n) => Math.round(n * 1000) / 1000;
  const CIRCUIT_KINDS = { lighting: "Освітлення", sockets: "Розетки", equipment: "Окремий прилад", mixed: "Змішане коло" };
  function branches(project, { includePlanned = true, includeExcluded = false } = {}) {
    const omitted = new Set(includeExcluded ? [] : project.floorPlan?.excludedCircuitIds || []);
    const devices = project.devices.filter((device) => /^(mcb-|rcbo)/.test(device.type) && !omitted.has(device.id));
    const planned = includePlanned ? (project.floorPlan?.circuits || []).map((circuit) => ({ ...circuit, type: "planned-circuit", planned: true, cable: circuit.sectionMm2 == null ? "" : String(circuit.sectionMm2), load: circuit.powerKw ?? null })) : [];
    return [...devices, ...planned];
  }
  const circuitFor = (project, key) => project.design?.circuits?.find((circuit) => circuit.key === key)?.deviceId || "";
  const isFiniteNumber = (n) => n !== "" && n !== null && Number.isFinite(Number(n));

  function create(project, templateId = project.design?.templateId || "apartment-2") {
    const template = TEMPLATES[templateId];
    if (!template) throw new Error("Невідомий типовий план");
    const plan = { version: VERSION, templateId, name: template.title, ceilingHeightM: 2.7, routing: "ceiling", wallThicknessM: .12, reservePercent: 10, endAllowanceM: .3, geometryConfirmed: false, syncWithCircuits: false, rooms: [], points: [] };
    [["top", template.top], ["bottom", template.bottom]].forEach(([row, rooms]) => rooms.forEach(([key, name, widthM, depthM], order) => plan.rooms.push({ id: key, name, kind: key, row, order, widthM, depthM, routeLevelM: 0, doorU: .5, windowWall: row === "top" ? "north" : key === "kitchen" ? "south" : "none" })));
    plan.rooms.push({ id: "hall", name: "Коридор", kind: "hall", row: "hall", order: 0, widthM: 1, depthM: templateId === "house" ? 1.6 : 1.4, routeLevelM: 0 });
    const add = (type, roomId, u, v, heightM, name, key, extra = {}) => {
      const point = { id: id(), type, roomId, u, v, heightM, label: `${({ panel: "Щ", socket: "X", light: "EL", switch: "S", equipment: "EP" })[type]}${plan.points.filter((p) => p.type === type).length + 1}`, name, circuitId: circuitFor(project, key), ...extra };
      plan.points.push(point); return point;
    };
    add("panel", "hall", .07, 0, 1.5, project.board.name, "");
    plan.rooms.filter((room) => room.kind !== "outdoor").forEach((room) => {
      const lamp = add("light", room.id, .5, .5, null, `Освітлення · ${room.name}`, "light");
      add("switch", room.id, room.row === "hall" ? .12 : Math.min(.9, .5 + .55 / room.widthM), room.row === "top" ? 1 : 0, .9, `Вимикач · ${room.name}`, "light", { controlsId: lamp.id });
      const key = ["living", "bedroom", "bedroom2", "kitchen", "bath", "utility"].includes(room.kind) ? room.kind : "living";
      if (["living", "bedroom", "bedroom2"].includes(room.kind)) {
        add("socket", room.id, 0, .35, .3, `Розетка · ${room.name}`, key);
        add("socket", room.id, .22, 0, .3, `Розетка · ${room.name}`, key);
        add("socket", room.id, 1, .65, .3, `Розетка · ${room.name}`, key);
      } else if (room.kind === "kitchen") {
        add("socket", room.id, .22, 1, 1.1, "Розетка робочої зони", key);
        add("socket", room.id, .65, 1, 1.1, "Розетка робочої зони", key);
        add("socket", room.id, 1, .35, .3, "Розетка кухні", key);
      } else if (room.kind === "bath") add("socket", room.id, .12, 0, 1.1, "Розетка ванної · перевірити зони", key);
      else if (room.kind !== "storage") add("socket", room.id, 0, .65, .3, `Розетка · ${room.name}`, key);
    });
    const appliances = [
      ["fridge", "Холодильник", "kitchen", 0, .2, .3], ["washer", "Пральна машина", "bath", 1, .72, .6], ["boiler", "Бойлер", "bath", 0, .35, 1.5],
      ["dishwasher", "Посудомийна машина", "kitchen", 1, .75, .3], ["ac", "Кондиціонер", "living", .7, 0, 2.2], ["pump", "Насос", "utility", .7, 1, .6],
    ];
    appliances.forEach(([key, name, roomId, u, v, height]) => { if (circuitFor(project, key) && plan.rooms.some((room) => room.id === roomId)) add("equipment", roomId, u, v, height, name, key, { appliance: key }); });
    if (plan.rooms.some((room) => room.id === "outdoor")) {
      const lamp = add("light", "outdoor", .6, .75, 2.5, "Зовнішній світильник", "outdoor");
      add("switch", "hall", .93, 1, .9, "Вимикач двору", "outdoor", { controlsId: lamp.id });
    }
    return normalize(plan);
  }

  function normalize(input) {
    const plan = clone(input);
    const fail = (text) => { throw new Error(`План приміщень: ${text}`); };
    if (!plan || plan.version !== VERSION || !Array.isArray(plan.rooms) || !Array.isArray(plan.points) || (plan.rooms.length < 1 && plan.geometryMode !== "free") || plan.rooms.length > 24 || plan.points.length > 500) fail("невідомий формат або забагато елементів");
    for (const [key, min, max] of [["ceilingHeightM", 1.8, 8], ["wallThicknessM", .05, .8], ["reservePercent", 0, 50], ["endAllowanceM", 0, 2]]) {
      if (!isFiniteNumber(plan[key]) || Number(plan[key]) < min || Number(plan[key]) > max) fail("перевірте висоту, товщину стін, запас і припуски");
      plan[key] = Number(plan[key]);
    }
    if (!["ceiling", "floor"].includes(plan.routing)) fail("невідомий спосіб прокладання");
    if (plan.geometryMode != null && plan.geometryMode !== "free") fail("невідомий режим геометрії");
    if (plan.geometryMode === "free") G.normalize(plan);
    const roomIds = new Set(), pointIds = new Set();
    plan.rooms.forEach((room) => {
      if (!room.id || roomIds.has(room.id) || !["top", "bottom", "hall"].includes(room.row)) fail("некоректні приміщення");
      roomIds.add(room.id);
      for (const key of ["widthM", "depthM"]) { if (!isFiniteNumber(room[key]) || Number(room[key]) < (plan.geometryMode === "free" ? .4 : .8) || Number(room[key]) > (plan.geometryMode === "free" ? 50 : 30)) fail("перевірте розміри кімнати"); room[key] = Number(room[key]); }
      room.order = Number(room.order) || 0; room.routeLevelM = Number(room.routeLevelM || 0);
      room.doorU = Number(room.doorU ?? .5); room.windowWall ||= "none";
      if (!Number.isFinite(room.doorU) || room.doorU < 0 || room.doorU > 1 || !["none", "north", "south", "west", "east"].includes(room.windowWall)) fail("перевірте двері та вікно");
      if (!Number.isFinite(room.routeLevelM) || room.routeLevelM < -2 || room.routeLevelM > 8) fail("рівень зовнішньої траси має бути −2…8 м");
      room.name = String(room.name || "Приміщення");
    });
    if (plan.geometryMode !== "free" && plan.rooms.filter((room) => room.row === "hall").length !== 1) fail("потрібен один коридор");
    plan.circuits ??= []; plan.excludedCircuitIds ??= [];
    if (!Array.isArray(plan.circuits) || plan.circuits.length > 64 || !Array.isArray(plan.excludedCircuitIds) || plan.excludedCircuitIds.length > 576 || plan.excludedCircuitIds.some((value) => typeof value !== "string" || !value)) fail("некоректний список кіл");
    plan.excludedCircuitIds = [...new Set(plan.excludedCircuitIds)];
    const circuitIds = new Set();
    plan.circuits.forEach((circuit) => {
      if (!circuit || typeof circuit !== "object" || typeof circuit.id !== "string" || !circuit.id || circuitIds.has(circuit.id) || !Object.hasOwn(CIRCUIT_KINDS, circuit.kind)) fail("некоректне коло плану");
      circuitIds.add(circuit.id);
      if (typeof circuit.name !== "string" || !circuit.name.trim() || circuit.name.length > 160 || typeof circuit.label !== "string" || !circuit.label.trim() || circuit.label.length > 24) fail("задайте назву та позначення кола");
      circuit.roomId = roomIds.has(circuit.roomId) ? circuit.roomId : "";
      for (const [key, min, max] of [["sectionMm2", .5, 240], ["powerKw", 0, 1000]]) {
        if (circuit[key] == null || circuit[key] === "") circuit[key] = null;
        else if (!isFiniteNumber(circuit[key]) || Number(circuit[key]) < min || Number(circuit[key]) > max) fail("перевірте переріз і потужність кола");
        else circuit[key] = Number(circuit[key]);
      }
    });
    plan.points.forEach((point) => {
      if (!point.id || pointIds.has(point.id) || !roomIds.has(point.roomId) || !TYPES[point.type]) fail("некоректна точка");
      pointIds.add(point.id);
      for (const key of ["u", "v"]) { if (!isFiniteNumber(point[key]) || Number(point[key]) < 0 || Number(point[key]) > 1) fail("точка виходить за приміщення"); point[key] = Number(point[key]); }
      const room = plan.rooms.find((item) => item.id === point.roomId);
      if (point.type === "junction") {
        point.mounting ??= junctionMounting(plan, point);
        if (!["wall", "ceiling"].includes(point.mounting)) fail("для дози оберіть монтаж на стіні або стелі");
        if (point.mounting === "ceiling") point.heightM = null;
        else if (point.heightM === null) point.heightM = plan.ceilingHeightM;
      }
      if (point.heightM !== null && (!isFiniteNumber(point.heightM) || Number(point.heightM) < 0 || Number(point.heightM) > (room.kind === "outdoor" ? 10 : plan.ceilingHeightM))) fail("висота точки виходить за висоту приміщення");
      if (point.heightM !== null) point.heightM = Number(point.heightM);
      point.circuitId = String(point.circuitId || ""); point.name = String(point.name || TYPES[point.type]); point.label = String(point.label || TYPES[point.type]);
      if (point.supplyFromId != null && typeof point.supplyFromId !== "string") fail("некоректне джерело траси");
    });
    if (plan.points.filter((point) => point.type === "panel").length !== (plan.rooms.length ? 1 : 0)) fail("потрібен один щиток для непорожнього плану");
    if (plan.geometryMode === "free") {
      const arrangement = G.layout(plan);
      plan.points.forEach((point) => { const room = arrangement.rooms.find((r) => r.id === point.roomId); if (!G.contains(room, G.position(room, point)) && G.nearest(room, G.position(room, point)).distance > .0001) fail(`${point.label}: точка виходить за форму кімнати`); });
    }
    plan.points.filter((point) => point.controlsId).forEach((point) => { if (point.type !== "switch" || !plan.points.some((other) => other.id === point.controlsId && other.type === "light")) fail("вимикач не прив’язаний до світильника"); });
    const byId = new Map(plan.points.map((point) => [point.id, point])), panel = plan.points.find((p) => p.type === "panel"), done = new Set();
    plan.points.filter((point) => point.supplyFromId).forEach((point) => {
      const source = byId.get(point.supplyFromId);
      if (point.type === "panel" || !source || source.type === "switch") fail(`${point.label}: некоректне джерело траси; виберіть щит, дозу або точку живлення цього плану`);
      if (source.type === "panel" && point.type !== "switch") point.supplyFromId = "";
    });
    plan.points.forEach((point) => {
      const visited = new Set(); let source = point;
      while (source && !done.has(source.id)) {
        if (visited.has(source.id)) fail(`${point.label}: циклічне з’єднання точок`);
        visited.add(source.id);
        source = source.type === "panel" ? null : source.supplyFromId ? byId.get(source.supplyFromId) : source.type === "switch" ? byId.get(source.controlsId) : panel;
      }
      visited.forEach((id) => done.add(id));
    });
    plan.geometryConfirmed = plan.geometryConfirmed === true; plan.syncWithCircuits = plan.syncWithCircuits === true;
    return plan;
  }

  function layout(plan) {
    if (plan.geometryMode === "free") return G.layout(plan);
    const t = plan.wallThicknessM, byRow = (row) => plan.rooms.filter((room) => room.row === row).sort((a, b) => a.order - b.order);
    const width = Math.max(2, ...["top", "bottom"].map((row) => byRow(row).reduce((sum, room) => sum + room.widthM + t, t)));
    const topHeight = Math.max(0, ...byRow("top").map((room) => room.depthM));
    const sourceHall = byRow("hall")[0], hall = { ...sourceHall, x: t, y: topHeight + 2 * t, widthM: width - 2 * t };
    const rooms = [hall];
    ["top", "bottom"].forEach((row) => {
      let x = t;
      byRow(row).forEach((room) => { rooms.push({ ...room, x, y: row === "top" ? hall.y - t - room.depthM : hall.y + hall.depthM + t }); x += room.widthM + t; });
    });
    const height = Math.max(hall.y + hall.depthM, ...rooms.map((room) => room.y + room.depthM)) + t;
    return { width, height, minX: 0, minY: 0, rooms, hall, areaM2: rooms.filter((room) => room.kind !== "outdoor").reduce((sum, room) => sum + room.widthM * room.depthM, 0) };
  }
  const pointHeight = (plan, point) => point.heightM === null ? plan.ceilingHeightM : point.heightM;
  const doorAt = (room) => ({ x: room.x + Math.max(.35, Math.min(room.widthM - .35, room.widthM * room.doorU)), widthM: Math.min(.8, room.widthM * .6) });
  function world(plan, point, arrangement = layout(plan)) {
    const room = arrangement.rooms.find((item) => item.id === point.roomId);
    return { x: room.x + point.u * room.widthM, y: room.y + point.v * room.depthM, z: pointHeight(plan, point), room };
  }
  function junctionMounting(plan, point) {
    return point.mounting ?? (point.heightM === null || Math.abs(Number(point.heightM) - plan.ceilingHeightM) < .0001 ? "ceiling" : "wall");
  }
  // Placement mutates a point, like G.place; callers work on their draft plan.
  function placePoint(plan, point, pos, snapWall = false) {
    const room = layout(plan).rooms.find((r) => r.id === point.roomId);
    if (!room || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) throw new Error("Оберіть кімнату й коректне місце точки.");
    const wall = point.type === "junction" ? junctionMounting(plan, point) === "wall" : snapWall;
    if (plan.geometryMode === "free") {
      const edge = wall && G.nearest(room, pos, true);
      if (wall && !edge) throw new Error("Для настінної дози потрібна хоча б одна закрита стіна кімнати.");
      G.place(point, room, wall ? edge : G.fit(room, pos));
    } else {
      let u = Math.max(0, Math.min(1, (pos.x - room.x) / room.widthM)), v = Math.max(0, Math.min(1, (pos.y - room.y) / room.depthM));
      if (wall) {
        const sides = [[u * room.widthM, "u", 0], [(1 - u) * room.widthM, "u", 1], [v * room.depthM, "v", 0], [(1 - v) * room.depthM, "v", 1]].sort((a, b) => a[0] - b[0]);
        if (sides[0][1] === "u") u = sides[0][2]; else v = sides[0][2];
      }
      point.u = Math.round(u * 1e6) / 1e6; point.v = Math.round(v * 1e6) / 1e6;
    }
  }
  function withJunctionMounting(input, pointId, mounting, heightM) {
    const plan = clone(input), point = plan.points.find((p) => p.id === pointId);
    if (point?.type !== "junction" || !["wall", "ceiling"].includes(mounting)) throw new Error("Оберіть дозу та монтаж на стіні або стелі.");
    if (mounting === "wall" && heightM != null && !Number.isFinite(heightM)) throw new Error("Некоректна висота настінної дози.");
    point.mounting = mounting;
    point.heightM = mounting === "ceiling" ? null : heightM ?? (point.heightM === null ? Math.max(0, plan.ceilingHeightM - .2) : point.heightM);
    if (mounting === "wall") placePoint(plan, point, world(plan, point));
    return normalize(plan);
  }
  function route(plan, from, to, arrangement = layout(plan)) {
    if (plan.geometryMode === "free") return G.route(plan, from, to, arrangement);
    const a = world(plan, from, arrangement), b = world(plan, to, arrangement), hall = arrangement.hall;
    const indoorLevel = plan.routing === "ceiling" ? plan.ceilingHeightM : 0;
    const level = (room) => room.kind === "outdoor" ? room.routeLevelM : indoorLevel;
    const P = (x, y, z) => ({ x: round(x), y: round(y), z: round(z) });
    const access = (p) => {
      const height = level(p.room), spineY = hall.y + hall.depthM / 2;
      if (p.room.row === "hall") return [P(p.x, p.y, p.z), P(p.x, p.y, height), P(p.x, spineY, height)];
      const doorX = doorAt(p.room).x, doorY = p.room.row === "top" ? p.room.y + p.room.depthM : p.room.y;
      const hallY = p.room.row === "top" ? hall.y : hall.y + hall.depthM;
      return [P(p.x, p.y, p.z), P(p.x, p.y, height), P(doorX, p.y, height), P(doorX, doorY, height), P(doorX, hallY, height), P(doorX, hallY, indoorLevel), P(doorX, spineY, indoorLevel)];
    };
    let path;
    if (a.room.id === b.room.id) { const h = level(a.room); path = [P(a.x, a.y, a.z), P(a.x, a.y, h), P(b.x, a.y, h), P(b.x, b.y, h), P(b.x, b.y, b.z)]; }
    else { const start = access(a), end = access(b).reverse(); path = [...start, P(end[0].x, start[start.length - 1].y, indoorLevel), ...end]; }
    path = path.filter((p, index) => !index || p.x !== path[index - 1].x || p.y !== path[index - 1].y || p.z !== path[index - 1].z);
    let horizontalM = 0, verticalM = 0;
    path.slice(1).forEach((p, index) => { horizontalM += Math.abs(p.x - path[index].x) + Math.abs(p.y - path[index].y); verticalM += Math.abs(p.z - path[index].z); });
    return { points: path, horizontalM: round(horizontalM), verticalM: round(verticalM), lengthM: round(horizontalM + verticalM) };
  }

  function calculate(project) {
    const plan = normalize(project.floorPlan), arrangement = layout(plan), panel = plan.points.find((point) => point.type === "panel"), available = branches(project);
    const validIds = new Set(available.map((device) => device.id)), unassigned = plan.points.filter((point) => point.type !== "panel" && !validIds.has(point.circuitId));
    const circuits = [], warnings = [], errors = [];
    if (!panel) errors.push("Додайте кімнату й розмістіть щиток, щоб розрахувати траси.");
    plan.points.filter((point) => point.placementReview).forEach((point) => errors.push(`${point.label}: перевірте розміщення після видалення стіни або кімнати; перемістіть чи підтвердьте точку у властивостях.`));
    const switches = plan.points.filter((point) => point.type === "switch"), invalid = new Set(plan.points.filter((point) => point.placementReview).map((point) => point.id));
    plan.points.filter((point) => point.type === "junction" && junctionMounting(plan, point) === "wall").forEach((point) => {
      const pos = world(plan, point, arrangement), room = pos.room;
      const distance = plan.geometryMode === "free" ? G.nearest(room, pos, true)?.distance ?? Infinity : Math.min(pos.x - room.x, room.x + room.widthM - pos.x, pos.y - room.y, room.y + room.depthM - pos.y);
      if (distance > .001) { invalid.add(point.id); errors.push(`${point.label}: настінна доза поза стіною. Перемістіть її на стіну або виберіть монтаж на стелі.`); }
    });
    switches.forEach((point) => {
      const lamp = plan.points.find((p) => p.id === point.controlsId && p.type === "light");
      if (!lamp || !validIds.has(point.circuitId) || lamp.circuitId !== point.circuitId) { invalid.add(point.id); errors.push(`${point.label}: перевірте прив’язку вимикача до світильника цього кола.`); }
    });
    plan.points.filter((point) => point.type === "light").forEach((lamp) => {
      const controls = switches.filter((point) => point.controlsId === lamp.id);
      if (controls.length > 1) { controls.forEach((point) => invalid.add(point.id)); errors.push(`${lamp.label}: прохідне або багатомісне керування потребує окремої схеми й трас; типовий розрахунок охоплює один вимикач.`); }
    });
    available.forEach((device) => {
      const points = plan.points.filter((point) => point.circuitId === device.id && !["panel", "switch"].includes(point.type));
      if (!points.length) return;
      let longestPathM = 0, incomplete = false;
      const legs = [], distances = new Map(panel && !invalid.has(panel.id) ? [[panel.id, 0]] : []), failed = new Set();
      const connect = (point) => {
        if (!point || failed.has(point.id)) return false;
        if (distances.has(point.id)) return true;
        const source = sourceFor(plan, point);
        if (invalid.has(point.id) || !source || (source.type !== "panel" && source.circuitId !== point.circuitId)) {
          failed.add(point.id); incomplete = true;
          if (!invalid.has(point.id)) errors.push(`${point.label}: джерело траси не підключене до цього кола щита. Перевірте попередню точку та призначений автомат.`);
          return false;
        }
        if (!connect(source)) { failed.add(point.id); incomplete = true; errors.push(`${point.label}: немає живлення від щита через ${source.label}.`); return false; }
        const path = route(plan, source, point, arrangement), allowanceM = 2 * plan.endAllowanceM;
        if (!path) { failed.add(point.id); incomplete = true; errors.push(`${device.label} · ${point.label}: немає траси від ${source.label}. Приєднайте кімнату до решти плану спільною стіною або проходом.`); return false; }
        const distance = distances.get(source.id) + path.lengthM + allowanceM;
        distances.set(point.id, distance); longestPathM = Math.max(longestPathM, distance);
        legs.push({ ...path, id: `${device.id}:${point.id}`, fromId: source.id, toId: point.id, kind: point.type === "switch" ? "switch" : "feed", allowanceM });
        return true;
      };
      points.forEach(connect);
      switches.filter((point) => point.circuitId === device.id).forEach(connect);
      const horizontalM = round(legs.reduce((sum, leg) => sum + leg.horizontalM, 0)), verticalM = round(legs.reduce((sum, leg) => sum + leg.verticalM, 0)), allowanceM = round(legs.reduce((sum, leg) => sum + leg.allowanceM, 0));
      const installedM = round(horizontalM + verticalM + allowanceM), reserveM = round(installedM * plan.reservePercent / 100);
      circuits.push({ deviceId: device.id, label: device.label, name: device.name, planned: Boolean(device.planned), section: Number(device.cable) || null, color: COLORS[circuits.length % COLORS.length], pointCount: points.length + legs.filter((leg) => leg.kind === "switch").length, legs, horizontalM, verticalM, allowanceM, installedM, reserveM, purchaseM: Math.ceil(installedM + reserveM), longestPathM: round(longestPathM), incomplete, estimated: !plan.geometryConfirmed });
    });
    if (!plan.geometryConfirmed) warnings.push("Типовий ескіз: обміри, висоти та траси ще не підтверджені. Довжини попередні.");
    if (unassigned.length) warnings.push(`${unassigned.length} точок без кола: виберіть наявне або створіть нове у властивостях точки. Без кола траса не будується.`);
    if (available.some((circuit) => circuit.planned)) warnings.push("Нові кола існують лише на плані. Щоб додати їхній захист у щит, натисніть «Перезібрати щит за планом».");
    if (circuits.some((circuit) => circuit.legs.some((leg) => leg.wallPassages?.length))) warnings.push("Частина трас проходить крізь спільні стіни. Кабельні проходи попередні — уточніть їхні місця та виконання на об’єкті.");
    if (plan.rooms.some((room) => room.kind === "bath")) warnings.push("Зони ванної/душової та допустимість розміщення точок потребують окремої перевірки.");
    if (plan.rooms.some((room) => room.kind === "outdoor")) warnings.push("Зовнішня зона має власний рівень траси; спосіб захисту та прокладання зовні потрібно уточнити.");
    const complete = circuits.filter((circuit) => !circuit.incomplete);
    return { plan, arrangement, circuits, unassigned, errors, warnings: [...new Set([...errors, ...warnings])], totalPurchaseM: complete.reduce((sum, circuit) => sum + circuit.purchaseM, 0), totalInstalledM: round(complete.reduce((sum, circuit) => sum + circuit.installedM, 0)) };
  }

  // Explicit supply tree: home runs, daisy chains and distribution boxes.
  // A simple switch has a control cable from its lamp unless a box is selected.
  function sourceFor(plan, point) {
    if (point.type === "panel") return null;
    return plan.points.find((p) => p.id === point.supplyFromId) || (point.supplyFromId ? null : point.type === "switch" ? plan.points.find((p) => p.id === point.controlsId && p.type === "light") : plan.points.find((p) => p.type === "panel"));
  }
  function supplyOptions(plan, point, circuitId = point.circuitId) {
    return plan.points.filter((p) => {
      if (p.id === point.id || p.type === "switch" || (p.type === "panel" ? point.type !== "switch" : !circuitId || p.circuitId !== circuitId)) return false;
      const visited = new Set(); let current = p;
      while (current) { if (current.id === point.id || visited.has(current.id)) return false; visited.add(current.id); current = sourceFor(plan, current); }
      return true;
    });
  }
  function connectPoints(project, fromId, toId, circuitId = "") {
    const plan = normalize(project.floorPlan), source = plan.points.find((p) => p.id === fromId), point = plan.points.find((p) => p.id === toId);
    if (!source || !point) throw new Error("Виберіть на плані початкову й кінцеву точки.");
    if (source.id === point.id || point.type === "panel") throw new Error("Кабель має йти від джерела до іншої точки; щит не може бути споживачем.");
    if (source.type === "switch") throw new Error("Вимикач — точка керування. Почніть лінію від щита, дози або точки живлення.");
    const available = new Set(branches(project).map((d) => d.id)), oldCircuit = point.circuitId;
    const assigned = point.circuitId || (source.type !== "panel" ? source.circuitId : circuitId);
    if (!available.has(assigned)) throw new Error("Оберіть коло щита у фільтрі трас або властивостях точки.");
    if (source.type !== "panel" && source.circuitId !== assigned) throw new Error("Точки належать різним колам. Виберіть точки одного кола або змініть їхнє призначення у властивостях.");
    if (point.type === "switch") {
      const lamp = plan.points.find((p) => p.id === point.controlsId && p.type === "light");
      if (!lamp || lamp.circuitId !== assigned) throw new Error("Спочатку виберіть для вимикача світильник того самого кола у властивостях.");
    }
    point.circuitId = assigned;
    point.supplyFromId = source.type === "panel" && point.type !== "switch" ? "" : source.id;
    if (point.type === "light") plan.points.filter((p) => p.controlsId === point.id && (!p.circuitId || p.circuitId === oldCircuit)).forEach((p) => { p.circuitId = assigned; });
    return normalize(plan);
  }
  function junctionConnections(project, junctionId, circuitId) {
    const plan = normalize(project.floorPlan), byId = new Map(plan.points.map((point) => [point.id, point]));
    const junction = byId.get(junctionId);
    if (junction?.type !== "junction") throw new Error("Виберіть дозу на плані.");
    circuitId ??= junction.circuitId;
    const circuit = branches(project).find((device) => device.id === circuitId);
    const panel = plan.points.find((point) => point.type === "panel");
    const sourceId = (point) => point.type === "panel" ? "" : point.supplyFromId || (point.type === "switch" ? point.controlsId : panel?.id) || "";
    const children = new Map(), controls = new Map();
    plan.points.forEach((point) => {
      const parent = sourceId(point); if (!children.has(parent)) children.set(parent, []); children.get(parent).push(point.id);
      if (point.type === "switch" && point.controlsId) { if (!controls.has(point.controlsId)) controls.set(point.controlsId, []); controls.get(point.controlsId).push(point.id); }
    });
    const ancestors = new Set(); let upstream = byId.get(sourceId(junction));
    while (upstream && !ancestors.has(upstream.id)) { ancestors.add(upstream.id); upstream = byId.get(sourceId(upstream)); }
    const closure = (id) => {
      const seen = new Set(), queue = [id];
      while (queue.length) {
        const next = queue.pop(); if (seen.has(next)) continue; seen.add(next);
        queue.push(...(children.get(next) || []), ...(controls.get(next) || []));
      }
      return [...seen];
    };
    const candidates = plan.points.filter((point) => !["panel", "switch"].includes(point.type) && point.id !== junctionId).map((point) => {
      const members = closure(point.id), membersSet = new Set(members), foreign = members.map((id) => byId.get(id)).find((member) => member.circuitId && member.circuitId !== circuitId);
      const externalSource = members.map((id) => byId.get(id)).filter((member) => member.id !== point.id && !membersSet.has(sourceId(member))).map((member) => byId.get(sourceId(member))).find((source) => source && source.type !== "panel" && source.circuitId !== circuitId);
      let reason = !circuit ? "Спочатку виберіть коло щита для дози" : ancestors.has(point.id) ? "Ця точка живить дозу — з’єднання утворить цикл" : point.circuitId && point.circuitId !== circuitId ? `Інше коло: ${branches(project).find((d) => d.id === point.circuitId)?.label || "не знайдено"}` : foreign ? `${foreign.label}: залежна точка іншого кола` : externalSource ? `${externalSource.label}: джерело вимикача іншого кола` : "";
      return { id: point.id, label: point.label, name: point.name, type: point.type, roomId: point.roomId, roomName: plan.rooms.find((room) => room.id === point.roomId).name, circuitId: point.circuitId, connected: point.supplyFromId === junctionId, eligible: !reason, reason, memberIds: members };
    });
    return { junction, circuitId, circuitLabel: circuit?.label || "", candidates };
  }
  function setJunctionConnections(project, junctionId, pointIds) {
    if (!Array.isArray(pointIds) || pointIds.some((id) => typeof id !== "string") || new Set(pointIds).size !== pointIds.length) throw new Error("Оберіть точки для підключення до дози без повторів.");
    const info = junctionConnections(project, junctionId), selected = new Set(pointIds), plan = normalize(project.floorPlan);
    const junction = plan.points.find((point) => point.id === junctionId), byId = new Map(plan.points.map((point) => [point.id, point]));
    // Validate the complete batch before changing even one cable or circuit binding.
    pointIds.forEach((id) => {
      const candidate = info.candidates.find((point) => point.id === id);
      if (!candidate || !candidate.eligible) throw new Error(candidate ? `${candidate.label}: ${candidate.reason}.` : "У списку є недоступна або видалена точка.");
    });
    if (pointIds.length) {
      let source = sourceFor(plan, junction);
      while (source && source.type !== "panel") {
        if (source.circuitId !== junction.circuitId) throw new Error("Джерело дози має належати тому самому колу. Виберіть живлення від щита або точки цього кола.");
        source = sourceFor(plan, source);
      }
      if (!source) throw new Error("Спочатку підключіть дозу до щита або до живленої точки цього кола.");
    }
    info.candidates.filter((point) => point.connected && !selected.has(point.id)).forEach((point) => { byId.get(point.id).supplyFromId = ""; });
    pointIds.forEach((id) => {
      const candidate = info.candidates.find((point) => point.id === id), point = byId.get(id);
      candidate.memberIds.forEach((memberId) => { byId.get(memberId).circuitId = junction.circuitId; });
      point.supplyFromId = junctionId;
    });
    return normalize(plan);
  }
  function hitRoute(project, position, { toleranceM = .16, excludeId = "", circuitId = "", toId = "" } = {}) {
    const result = calculate(project), candidates = [];
    const downstream = (sourceId) => {
      let source = result.plan.points.find((p) => p.id === sourceId);
      while (source) { if (source.id === excludeId) return true; source = source.supplyFromId ? result.plan.points.find((p) => p.id === source.supplyFromId) : null; }
      return false;
    };
    result.circuits.filter((c) => !circuitId || c.deviceId === circuitId).forEach((c) => c.legs.filter((leg) => leg.kind === "feed" && (!toId || leg.toId === toId) && !downstream(leg.fromId) && leg.toId !== excludeId).forEach((leg) => {
      leg.points.slice(1).forEach((b, i) => {
        const a = leg.points[i], dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
        if (length2 < 1e-10) return; // Vertical drops share one location in the plan.
        const u = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.y - a.y) * dy) / length2));
        const at = { x: a.x + u * dx, y: a.y + u * dy, z: a.z + u * (b.z - a.z) }, distance = Math.hypot(position.x - at.x, position.y - at.y);
        if (distance <= toleranceM) candidates.push({ deviceId: c.deviceId, toId: leg.toId, fromId: leg.fromId, at, distance });
      });
    }));
    return candidates.sort((a, b) => a.distance - b.distance)[0] || null;
  }
  function insertJunction(project, reference, junction) {
    const plan = normalize(project.floorPlan), result = calculate({ ...project, floorPlan: plan });
    const circuit = result.circuits.find((c) => c.deviceId === reference.deviceId), leg = circuit?.legs.find((l) => l.toId === reference.toId && l.fromId === reference.fromId && l.kind === "feed");
    if (!leg) throw new Error("Виберіть ділянку живлення від щита або дози.");
    const box = clone(junction), previous = plan.points.find((p) => p.id === box.id), child = plan.points.find((p) => p.id === leg.toId), source = plan.points.find((p) => p.id === leg.fromId);
    if (box.type !== "junction" || child.id === box.id || source.id === box.id || (previous && (previous.type !== "junction" || previous.circuitId && previous.circuitId !== circuit.deviceId))) throw new Error("Дозу можна вставити лише в іншу ділянку її кола.");
    let ancestor = source;
    while (ancestor) { if (ancestor.id === box.id) throw new Error("З’єднання утворює цикл доз."); ancestor = ancestor.supplyFromId ? plan.points.find((p) => p.id === ancestor.supplyFromId) : null; }
    if (previous) Object.assign(previous, box); else plan.points.push(box);
    const placed = previous || box;
    placed.circuitId = circuit.deviceId; placed.supplyFromId = source.type === "panel" ? "" : source.id;
    child.supplyFromId = placed.id;
    return normalize(plan);
  }
  function removePoint(input, pointId) {
    const plan = clone(input), point = plan.points.find((p) => p.id === pointId);
    if (!point || point.type === "panel") return plan;
    plan.points = plan.points.filter((p) => p.id !== pointId);
    plan.points.forEach((p) => {
      if (p.supplyFromId === pointId) p.supplyFromId = point.supplyFromId || "";
      if (p.controlsId === pointId) { p.controlsId = ""; p.circuitId = ""; p.supplyFromId = ""; }
    });
    return normalize(plan);
  }

  function assignCircuit(project, pointIds, circuitId) {
    const plan = normalize(project.floorPlan), chosen = new Set(pointIds);
    if (circuitId && !branches({ ...project, floorPlan: plan }).some((circuit) => circuit.id === circuitId)) throw new Error("Виберіть наявне коло або створіть нове.");
    for (const pointId of chosen) {
      const point = plan.points.find((p) => p.id === pointId);
      if (!point || point.type === "panel") throw new Error("Оберіть споживача цього плану.");
      if (point.type === "switch" && point.controlsId) chosen.add(point.controlsId);
    }
    plan.points.forEach((point) => { if (chosen.has(point.id)) point.circuitId = circuitId; });
    plan.points.filter((p) => p.type === "switch" && chosen.has(p.controlsId)).forEach((point) => { point.circuitId = circuitId; chosen.add(point.id); });
    // Reassigning a point must not leave its old circuit feeding the new one.
    plan.points.forEach((point) => {
      const source = sourceFor(plan, point);
      if (source && source.type !== "panel" && source.circuitId !== point.circuitId && (chosen.has(point.id) || chosen.has(source.id))) point.supplyFromId = "";
    });
    plan.geometryConfirmed = false;
    return normalize(plan);
  }
  function createCircuit(project, options = {}) {
    let plan = normalize(project.floorPlan);
    for (const key of ["sectionMm2", "powerKw"]) if (options[key] != null && options[key] !== "" && !isFiniteNumber(options[key])) throw new Error("Перевірте переріз і потужність кола.");
    if (plan.circuits.length >= 64) throw new Error("План підтримує до 64 нових кіл.");
    const kind = options.kind || "sockets", room = plan.rooms.find((r) => r.id === options.roomId);
    if (!Object.hasOwn(CIRCUIT_KINDS, kind)) throw new Error("Виберіть призначення кола.");
    const available = branches(project, { includeExcluded: true }); let index = 1;
    while (available.some((c) => c.label === `К${index}`)) index++;
    const circuit = { id: id(), label: `К${index}`, name: String(options.name || `${CIRCUIT_KINDS[kind]}${room ? ` · ${room.name}` : ""}`).trim(), kind, roomId: room?.id || "", sectionMm2: Object.hasOwn(options, "sectionMm2") ? options.sectionMm2 : kind === "lighting" ? 1.5 : 2.5, powerKw: options.powerKw ?? null };
    plan.circuits.push(circuit); plan = normalize(plan);
    const points = new Set(options.pointIds || []);
    if (options.assignRoom) plan.points.filter((point) => point.roomId === room?.id && !point.circuitId && (kind === "mixed" ? point.type !== "panel" : point.type === ({ lighting: "light", sockets: "socket", equipment: "equipment" })[kind])).forEach((point) => points.add(point.id));
    plan = assignCircuit({ ...project, floorPlan: plan }, [...points], circuit.id);
    return { plan, circuit: plan.circuits.find((c) => c.id === circuit.id) };
  }
  function removeCircuit(project, circuitId) {
    const circuit = branches(project).find((c) => c.id === circuitId);
    if (!circuit) throw new Error("Коло вже видалене або не існує.");
    const plan = normalize(project.floorPlan);
    plan.circuits = plan.circuits.filter((c) => c.id !== circuitId);
    if (!circuit.planned) plan.excludedCircuitIds.push(circuitId);
    plan.points.forEach((point) => { if (point.circuitId === circuitId) point.circuitId = ""; });
    plan.geometryConfirmed = false;
    return normalize(plan);
  }
  function buildingPlans(project) {
    return [project.floorPlan, ...(project.otherFloors || [])].filter(Boolean).sort((a,b) => (a.elevationM || 0) - (b.elevationM || 0));
  }
  function verifyFloors(project) {
    if (project.otherFloors == null) return;
    if (!Array.isArray(project.otherFloors) || project.otherFloors.length > 15 || !project.floorPlan) throw new Error("Некоректні поверхи будинку");
    project.otherFloors = project.otherFloors.map(normalize);
    const levels = buildingPlans(project), pointIds = new Set(), ids = new Set(), elevations = new Set();
    for (const level of levels) {
      const key = level.levelId || "main", elevation = level.elevationM ?? 0;
      if (typeof key !== "string" || !key || key.length > 100 || ids.has(key) || !Number.isFinite(elevation) || Math.abs(elevation) > 120 || elevations.has(elevation) || (key === "main") !== (elevation === 0)) throw new Error("Перевірте назви та відмітки поверхів");
      ids.add(key); elevations.add(elevation);
      for (const p of level.points) { if (pointIds.has(p.id)) throw new Error("Повторена точка між поверхами"); pointIds.add(p.id); }
    }
    if (!ids.has("main")) throw new Error("Потрібен поверх головного щита");
  }
  function addLevel(project, name, elevation) {
    if (!name.trim() || !Number.isFinite(elevation) || elevation === 0) throw new Error("Задайте назву й відмітку нового поверху");
    const fresh = G.addRoom({ ...clone(project.floorPlan), geometryMode:"free", rooms:[], points:[], circuits:[], excludedCircuitIds:[], geometryConfirmed:false, syncWithCircuits:false });
    fresh.syncWithCircuits=Boolean(project.floorPlan.syncWithCircuits);
    fresh.levelId = id(); fresh.levelName = name.trim().slice(0,80); fresh.name = fresh.levelName; fresh.elevationM = elevation;
    const inlet = fresh.points.find(p => p.type === "panel");
    if (inlet) { inlet.name = "Вихід стояка"; inlet.label = "↑"; inlet.heightM = fresh.routing === "ceiling" ? fresh.ceilingHeightM : 0; }
    const next = { ...project, floorPlan: normalize(fresh), otherFloors: buildingPlans(project) };
    verifyFloors(next);
    return next;
  }
  function selectLevel(project, levelId) {
    const levels = buildingPlans(project), selected = levels.find(p => (p.levelId || "main") === levelId);
    if (!selected) throw new Error("Поверх відсутній");
    return { ...project, floorPlan:selected, otherFloors:levels.filter(p => p !== selected) };
  }
  function buildingReport(project) {
    if (!project.otherFloors?.length) return calculate(project);
    const levels = buildingPlans(project), reports = levels.map(floorPlan => calculate({ ...project, floorPlan }));
    const combined = new Map(), errors = [], warnings = [], unassigned = [];
    const lead = Number(project.riserLeadM || 0);
    for (const [i,report] of reports.entries()) {
      const floor = levels[i], altitude = floor.elevationM || 0, name = floor.levelName || "Основний поверх";
      errors.push(...report.errors.map(s => `${name} · ${s}`)); warnings.push(...report.warnings.map(s => `${name} · ${s}`)); unassigned.push(...report.unassigned);
      for (const c of report.circuits) {
        if (!combined.has(c.deviceId)) combined.set(c.deviceId,{ ...c, legs:[], pointCount:0, horizontalM:0, verticalM:0, allowanceM:0, reserveM:0, longestPathM:0, riseTop:0, riseBottom:0, estimated:false, incomplete:false });
        const g=combined.get(c.deviceId);
        for (const k of ["pointCount","horizontalM","verticalM","allowanceM","reserveM"]) g[k]+=c[k];
        g.legs.push(...c.legs);
        if (c.legs.length) { g.riseTop=Math.max(g.riseTop,altitude); g.riseBottom=Math.min(g.riseBottom,altitude); }
        g.longestPathM=Math.max(g.longestPathM,c.longestPathM+(altitude && c.legs.length ? Math.abs(altitude)+lead : 0));
        g.incomplete ||= c.incomplete; g.estimated ||= c.estimated;
      }
    }
    const main = levels.find(p=>!p.levelId || p.levelId==="main");
    const circuits=[...combined.values()].map(g=>{
      const span=g.riseTop-g.riseBottom;
      g.riserM=round(span+(span ? lead : 0)); g.verticalM=round(g.verticalM+span); g.horizontalM=round(g.horizontalM+(span ? lead : 0));
      g.installedM=round(g.verticalM+g.horizontalM+g.allowanceM); g.reserveM=round(g.reserveM+g.riserM*main.reservePercent/100);
      g.purchaseM=Math.ceil(round(g.installedM+g.reserveM)); return g;
    });
    const complete=circuits.filter(c=>!c.incomplete);
    return { ...reports[levels.indexOf(project.floorPlan)], circuits, errors, warnings:[...new Set(warnings)], unassigned, totalInstalledM:round(complete.reduce((s,c)=>s+c.installedM,0)), totalPurchaseM:complete.reduce((s,c)=>s+c.purchaseM,0) };
  }
  function syncLengths(project) {
    const next = clone(project), result = buildingReport(next);
    (next.design?.circuits || []).forEach((record) => {
      const circuit = result.circuits.find((c) => c.deviceId === record.deviceId);
      if (!circuit && record.lengthOrigin !== "floor-plan") return;
      const lengthM = circuit && !circuit.incomplete ? Math.ceil(circuit.longestPathM * 10) / 10 : null;
      if (record.lengthM !== lengthM) { record.minFaultA = null; record.letThroughA2s = null; record.shortCircuitTimeS = null; record.shortCircuitSource = ""; }
      record.lengthM = lengthM;
      record.lengthOrigin = "floor-plan";
    });
    for (const level of buildingPlans(next)) level.syncWithCircuits = true;
    if (next.design?.supply) next.design.supply.dataConfirmed = false;
    return next;
  }
  const editGeometry = (plan) => G.materialize(plan, layout(plan));
  return { buildingPlans, buildingReport, verifyFloors, addLevel, selectLevel, VERSION, TYPES, COLORS, TEMPLATES, CIRCUIT_KINDS, create, normalize, layout, world, route, pointHeight, doorAt, calculate, syncLengths, branches, createCircuit, assignCircuit, removeCircuit, editGeometry, sourceFor, supplyOptions, connectPoints, junctionConnections, setJunctionConnections, hitRoute, insertJunction, removePoint, junctionMounting, placePoint, withJunctionMounting };
});

;
/* floor-partition.js */
/* Subtract a newly drawn room and its partition walls from its host room. */
(function (root, factory) {
  const api = typeof module === "object" && module.exports ? factory(require("./floor-geometry.js"), require("./vendor/polygon-clipping-0.15.7.js")) : factory(root.PanelFloorGeometry, root.polygonClipping);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelFloorPartition = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (G, clip) {
  "use strict";
  const EPS = .000001, copy = (v) => JSON.parse(JSON.stringify(v)), id = () => globalThis.crypto?.randomUUID?.() || `partition-${Date.now()}-${Math.random()}`;
  const round = (v) => Math.round(v * 1e6) / 1e6, distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const geometry = (room) => G.contours(room).map((ring) => ring.vertices.map((p) => [p.x, p.y]));
  const measure = (multi) => multi.reduce((sum, polygon) => sum + polygon.reduce((s, ring, i) => s + (i ? -1 : 1) * G.area(ring.map(([x, y]) => ({ x, y }))), 0), 0);
  function nextName(rooms) {
    let number = rooms.length + 1;
    while (rooms.some((r) => r.name === `Кімната ${number}`)) number++;
    return `Кімната ${number}`;
  }
  function expanded(vertices, thickness) {
    return clip.union([G.offsetContour(vertices, thickness).map((p) => [p.x, p.y])]);
  }
  function project(p, a, b) {
    const u = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (distance(a, b) ** 2 || 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, u };
  }
  function rebuild(polygon, source, used) {
    const edges = G.edgesOf(source);
    const makeRing = (coordinates) => {
      const vertices = coordinates.map(([x, y]) => ({ x: round(x), y: round(y) }));
      if (distance(vertices[0], vertices.at(-1)) < EPS) vertices.pop();
      const walls = vertices.map((a, i) => {
        const b = vertices[(i + 1) % vertices.length];
        const edge = edges.find((edge) => {
          const p = project(a, edge.a, edge.b), q = project(b, edge.a, edge.b);
          return distance(p, a) < EPS && distance(q, b) < EPS && Math.min(p.u, q.u) >= -EPS && Math.max(p.u, q.u) <= 1 + EPS;
        });
        const wall = edge ? { ...edge.wall } : { removed: false, doorU: null, windowU: null };
        if (!wall.id || used.has(wall.id)) wall.id = id(); used.add(wall.id);
        for (const key of ["doorU", "windowU"]) {
          const opening = edge?.wall[key] == null ? null : { x: edge.a.x + (edge.b.x - edge.a.x) * edge.wall[key], y: edge.a.y + (edge.b.y - edge.a.y) * edge.wall[key] };
          const p = opening && project(opening, a, b); wall[key] = p && p.u >= 0 && p.u <= 1 ? p.u : null;
        }
        return wall;
      });
      return { vertices, walls };
    };
    const [outer, ...holes] = polygon.map(makeRing);
    return { ...outer, ...(holes.length ? { holes } : {}) };
  }
  function insert(input, drawn) {
    let plan = copy(input); const room = copy(drawn), shape = geometry(room);
    plan.geometryConfirmed = false;
    G.normalize({ ...plan, rooms: [room] });
    const host = plan.rooms.find((r) => measure(clip.difference(shape, geometry(r))) < EPS);
    if (!host) {
      plan.rooms.push(room); G.normalize(plan);
      // Drawing from an existing boundary can mean an adjacent room rather
      // than a cut inside it. Make room for the partition's real thickness.
      for (let attempt = 0; attempt < plan.rooms.length; attempt++) {
        const touching = G.sharedWalls(plan).find((p) => (p.roomId === room.id || p.otherId === room.id) && p.gap < EPS);
        if (!touching) break;
        const current = plan.rooms.find((r) => r.id === room.id), normal = G.inward(current, touching.roomId === room.id ? touching.index : touching.otherIndex), shift = plan.wallThicknessM - touching.gap;
        plan = G.moveRoom(plan, room.id, normal.x * shift, normal.y * shift);
      }
      return { plan: G.normalize(plan), roomId: room.id, partitioned: false };
    }
    const buffer = expanded(room.vertices, plan.wallThicknessM);
    const blockedHole = (host.holes || []).some((hole) => measure(clip.intersection(buffer, [hole.vertices.map((p) => [p.x, p.y])])) > EPS);
    if (blockedHole) throw new Error("Між новою кімнатою та внутрішнім контуром замало місця на перегородки.");
    if (plan.rooms.some((r) => r.id !== host.id && measure(clip.intersection(buffer, geometry(r))) > EPS)) throw new Error("Нові перегородки перетинають іншу кімнату. Залиште місце на товщину стін.");
    const remainder = clip.difference(geometry(host), buffer);
    if (!remainder.length) throw new Error("Новий контур займає всю кімнату. Залиште місце для першої кімнати.");
    remainder.sort((a, b) => measure([b]) - measure([a]));
    const before = G.layout(plan), source = copy(host), used = new Set(plan.rooms.filter((r) => r.id !== host.id).flatMap((r) => G.edgesOf(r).map((e) => e.wall.id)));
    // Existing windows/doors on an exterior portion now belong to the new room.
    Object.assign(room, rebuild(shape, source, used));
    const remaining = [];
    remainder.forEach((polygon, i) => {
      const next = copy(source); delete next.holes; Object.assign(next, rebuild(polygon, source, used));
      (next.holes || []).forEach((hole) => {
        const old = source.holes?.find((h) => h.sourceRoomId && h.vertices.every((p) => G.contains(hole, p)));
        if (old) hole.sourceRoomId = old.sourceRoomId;
        else if (room.vertices.every((p) => G.contains(hole, p))) hole.sourceRoomId = room.id;
      });
      if (i) { next.id = id(); next.name = nextName([...plan.rooms, room, ...remaining.slice(1)]); next.kind = "room"; }
      remaining.push(next);
    });
    const hostIndex = plan.rooms.findIndex((r) => r.id === host.id); plan.rooms.splice(hostIndex, 1, ...remaining); plan.rooms.push(room);
    // Reassign points by their real coordinates; points covered by a new wall
    // move to the nearest face and are explicitly marked for placement review.
    const arrangement = G.layout(plan), destinations = [...remaining, room].map((r) => arrangement.rooms.find((s) => s.id === r.id));
    plan.points.filter((p) => p.roomId === host.id).forEach((point) => {
      const world = G.position(before.rooms.find((r) => r.id === host.id), point);
      let target = destinations.find((r) => G.contains(r, world));
      if (!target) { target = [...destinations].sort((a, b) => G.nearest(a, world).distance - G.nearest(b, world).distance)[0]; point.placementReview = true; }
      point.roomId = target.id; G.place(point, target, world);
    });
    if (plan.rooms.length > 24) throw new Error("Поділ утворює більше 24 кімнат.");
    plan.geometryConfirmed = false;
    return { plan: G.stitchSharedWalls(G.normalize(plan), room.id), roomId: room.id, partitioned: true, hostId: host.id };
  }
  return { insert, nextName };
});

;
/* floor-pencil.js */
/* Wall-pencil geometry. Drafts never mutate the saved floor plan. */
(function (root, factory) {
  const api = typeof module === "object" && module.exports ? factory(require("./floor-geometry.js"), require("./floor-partition.js")) : factory(root.PanelFloorGeometry, root.PanelFloorPartition);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelFloorPencil = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (G, Partition) {
  "use strict";
  const EPS = 1e-6, MIN = .15;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const id = () => globalThis.crypto?.randomUUID?.() || `pencil-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const round = (n) => Math.round(n * 1e6) / 1e6;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 100 && Math.abs(p.y) <= 100;
  function project(p, a, b) {
    const u = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1)));
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  function meets(a, b, c, d) {
    return cross(a, b, c) * cross(a, b, d) < -EPS && cross(c, d, a) * cross(c, d, b) < -EPS ||
      [[a, c, d], [b, c, d], [c, a, b], [d, a, b]].some(([p, u, v]) => distance(p, project(p, u, v)) < EPS);
  }
  function snapTargets(plan, point, hostId) {
    const targets = [];
    for (const room of plan.rooms) {
      G.edgesOf(room).forEach(({ a, b, ring, hole }) => {
        const signed = ring.vertices.reduce((sum, a, i) => { const b = ring.vertices[(i + 1) % ring.vertices.length]; return sum + a.x * b.y - b.x * a.y; }, 0), sign = (signed >= 0 ? 1 : -1) * (hole ? -1 : 1), thickness = room.id === hostId ? 0 : plan.wallThicknessM;
        const length = distance(a, b);
        if (!length) return;
        // Room polygons describe clear inside dimensions. The outside face of
        // a shared wall is one wall thickness away, rather than inside a room.
        const dx = (b.y - a.y) / length * sign * thickness, dy = -(b.x - a.x) / length * sign * thickness;
        const u = { x: a.x + dx, y: a.y + dy }, v = { x: b.x + dx, y: b.y + dy };
        targets.push({ point: u, hint: "Кут суміжної стіни" }, { point: v, hint: "Кут суміжної стіни" }, { point: project(point, u, v), hint: "Прив’язка до стіни" });
      });
    }
    return targets;
  }
  function resolve(plan, vertices, raw, { orthogonal = true, snap = true, gridM = .1, toleranceM = .18 } = {}) {
    if (!validPoint(raw)) throw new Error("Точка має бути в межах ±100 м.");
    const last = vertices.at(-1), first = vertices[0], tolerance = Math.max(.03, Math.min(.3, toleranceM));
    if (vertices.length >= 3 && distance(raw, first) <= tolerance) return { point: { ...first }, close: true, hint: "Замкнути кімнату", axis: "", orthogonal };
    const step = Number.isFinite(gridM) && gridM >= .01 && gridM <= 1 ? gridM : .1;
    let point = snap ? { x: Math.round(raw.x / step) * step, y: Math.round(raw.y / step) * step } : { ...raw }, axis = "", hint = snap ? "Сітка" : "";
    if (last && orthogonal) {
      axis = Math.abs(raw.x - last.x) >= Math.abs(raw.y - last.y) ? "x" : "y";
      point[axis === "x" ? "y" : "x"] = last[axis === "x" ? "y" : "x"];
      hint = axis === "x" ? "Горизонтально · 0°" : "Вертикально · 90°";
    }
    if (snap) {
      const host = plan.rooms.find((r) => G.contains(r, first || raw));
      const target = snapTargets(plan, point, host?.id).filter((t) => distance(t.point, raw) <= tolerance && (!axis || Math.abs(t.point[axis === "x" ? "y" : "x"] - last[axis === "x" ? "y" : "x"]) < EPS)).sort((a, b) => distance(a.point, raw) - distance(b.point, raw))[0];
      if (target) { point = target.point; hint = target.hint; }
      else if (last && axis) {
        const candidates = [...vertices.slice(0, -1), ...plan.rooms.flatMap(G.verticesOf)].filter((p) => Math.abs(p[axis] - raw[axis]) <= tolerance).sort((a, b) => Math.abs(a[axis] - raw[axis]) - Math.abs(b[axis] - raw[axis]));
        if (candidates.length) { point[axis] = candidates[0][axis]; hint += " · вирівняно з кутом"; }
      }
    }
    return { point: { x: round(point.x), y: round(point.y) }, close: false, axis, hint, orthogonal };
  }
  function append(vertices, point) {
    if (!validPoint(point)) throw new Error("Точка має бути в межах ±100 м.");
    if (vertices.length >= 48) throw new Error("У кімнаті може бути не більше 48 кутів.");
    const last = vertices.at(-1), previous = vertices.at(-2);
    if (last && distance(last, point) < MIN - EPS) throw new Error("Стіна має бути не коротшою за 0,15 м.");
    if (previous && Math.abs(cross(previous, last, point)) < EPS && (last.x - previous.x) * (point.x - last.x) + (last.y - previous.y) * (point.y - last.y) < 0) throw new Error("Стіна повертається поверх попередньої. Скасуйте останній кут.");
    for (let i = 0; last && i < vertices.length - 2; i++) if (meets(vertices[i], vertices[i + 1], last, point)) throw new Error("Нова стіна перетинає вже намальований контур.");
    return [...vertices.map((p) => ({ ...p })), { x: round(point.x), y: round(point.y) }];
  }
  function closures(vertices, orthogonal = true) {
    const points = vertices.map((p) => ({ x: p.x, y: p.y }));
    if (points.length > 1 && distance(points[0], points.at(-1)) < EPS) points.pop();
    if (points.length < 3) return [points];
    const first = points[0], last = points.at(-1), previous = points.at(-2);
    if (!orthogonal || Math.abs(first.x - last.x) < EPS || Math.abs(first.y - last.y) < EPS) return [points];
    const elbows = [{ x: first.x, y: last.y }, { x: last.x, y: first.y }];
    if (Math.abs(last.x - previous.x) > Math.abs(last.y - previous.y)) elbows.reverse();
    return elbows.map((elbow) => [...points, elbow]);
  }
  function complete(input, vertices, { orthogonal = true, name = "" } = {}) {
    if (input.geometryMode !== "free") throw new Error("Спочатку підготуйте довільну геометрію плану.");
    if (input.rooms.length >= 24) throw new Error("На плані може бути не більше 24 кімнат.");
    let error;
    for (const polygon of closures(vertices, orthogonal)) {
      try {
        if (polygon.length < 3) throw new Error("Намалюйте щонайменше дві стіни й три кути, потім замкніть контур.");
        const plan = copy(input), roomId = id(), box = G.bounds(polygon);
        const room = { id: roomId, kind: "room", name: String(name).trim() || Partition.nextName(plan.rooms), row: "bottom", order: plan.rooms.length, widthM: box.widthM, depthM: box.depthM, routeLevelM: 0, doorU: .5, windowWall: "none", vertices: polygon, walls: polygon.map(() => ({ id: id(), removed: false, doorU: null, windowU: null })) };
        if (!plan.points.some((p) => p.type === "panel")) {
          const panel = { id: id(), type: "panel", label: "Щ1", name: "Щиток", roomId, u: 0, v: .5, heightM: 1.5, circuitId: "" }, shape = { ...room, ...box };
          G.place(panel, shape, G.fit(shape, G.position(shape, panel), true)); plan.points.push(panel);
        }
        plan.geometryConfirmed = false;
        const result = Partition.insert(plan, room);
        return { ...result, plan: G.stitchSharedWalls(result.plan, roomId) };
      } catch (problem) { error ||= problem; }
    }
    throw error;
  }
  return { resolve, append, closures, complete };
});

;
/* floor-svg.js */
/* Standalone floor-plan SVG, schematic locations rather than appliance footprints. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./floor-plan.js") : root.PanelFloorPlan);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelFloorSvg = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (F) {
  "use strict";
  const G = typeof module === "object" && module.exports ? require("./floor-geometry.js") : globalThis.PanelFloorGeometry;
  const SCALE = 80, LEFT = 58, TOP = 104;
  const POINT_STYLES = {
    socket: { color: "#176bc1", fill: "#dceeff", label: "X — розетка" },
    light: { color: "#ab6500", fill: "#ffecb0", label: "EL — світильник" },
    switch: { color: "#7d3fc2", fill: "#edddff", label: "S — вимикач" },
    junction: { color: "#00856a", fill: "#cff5e8", label: "Д — доза" },
    equipment: { color: "#c23459", fill: "#ffdde6", label: "EP — техніка" },
    panel: { color: "#243e4c", fill: "#dde8ef", label: "Щ — щиток" },
  };
  const xml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  const n = (v) => Number(v).toLocaleString("uk-UA", { maximumFractionDigits: 2 });
  const X = (x) => LEFT + x * SCALE, Y = (y) => TOP + y * SCALE;
  const text = (x, y, value, cls = "", anchor = "start") => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${xml(value)}</text>`;
  function icon(point) {
    if (point.type === "panel") return '<rect x="-13" y="-16" width="26" height="32" rx="3"/><path d="M3-11L-5 1H2L-2 11"/>';
    if (point.type === "socket") return '<circle r="9"/><path d="M-4-2V3M4-2V3M-6 7H6"/>';
    if (point.type === "light") return '<circle r="10"/><path d="M-7-7L7 7M7-7L-7 7M0-15V-12M0 12V15M-15 0H-12M12 0H15"/>';
    if (point.type === "switch") return '<circle r="6"/><path d="M0-6L8-16M7-17L12-13"/>';
    if (point.type === "junction") return '<rect x="-10" y="-10" width="20" height="20" rx="3"/><circle r="3"/><path d="M0-10V-3M0 3V10M-10 0H-3M3 0H10"/>';
    if (point.appliance === "washer" || point.appliance === "dishwasher") return '<rect x="-13" y="-15" width="26" height="30" rx="2"/><path d="M-13-8H13"/><circle cy="3" r="8"/>';
    if (point.appliance === "fridge") return '<rect x="-11" y="-17" width="22" height="34" rx="2"/><path d="M-11-6H11M6-13V-9M6 0V9"/>';
    if (point.appliance === "boiler") return '<rect x="-10" y="-17" width="20" height="34" rx="8"/><path d="M-3 17V23M3 17V23M-4-3C6-9-6 9 4 3"/>';
    if (point.appliance === "ac") return '<rect x="-18" y="-8" width="36" height="16" rx="3"/><path d="M-13 2H13M-9 10V15M0 10V15M9 10V15"/>';
    return '<rect x="-12" y="-12" width="24" height="24" rx="3"/><path d="M2-7L-4 2H3L-2 8"/>';
  }

  function geometryLayers(plan, arrangement, X, Y, editing, selectedRoom, selectedWall, selectedVertex, selectedOpening, docking, alignment) {
    const fills = [], walls = [], handles = [], selectedHandles = [], openingHandles = [];
    const openingHandle = (room, index, key, a, b) => {
      const kind = key === "doorU" ? "door" : "window", label = `${kind === "door" ? "Двері" : "Вікно"} · ${room.name} · стіна ${index + 1}`, active = room.id === selectedRoom && index === selectedWall && selectedOpening === kind;
      return `<g class="opening-handle ${kind} ${active ? "selected" : ""}" role="button" tabindex="0" data-floor-opening="${kind}" data-floor-wall="${index}" data-floor-geometry-room="${xml(room.id)}" aria-label="${xml(label)}"><title>${xml(label)}. Перетягніть уздовж стіни; стрілки — зсув; Delete — прибрати отвір.</title><path d="M${X(a.x)} ${Y(a.y)}L${X(b.x)} ${Y(b.y)}" class="opening-hit"/><circle cx="${X((a.x + b.x) / 2)}" cy="${Y((a.y + b.y) / 2)}" r="6"/></g>`;
    };
    const shared = G.sharedWalls(plan), faces = (roomId, index) => shared.filter((s) => s.roomId === roomId && s.index === index || s.otherId === roomId && s.otherIndex === index).map((s) => {
      if (s.roomId === roomId) return { lo: s.lo, hi: s.hi };
      const room = arrangement.rooms.find((r) => r.id === roomId), { a, b } = G.edgeAt(room, index), length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      const u = (p) => ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length2;
      return { lo: Math.min(u(s.oppositeFrom), u(s.oppositeTo)), hi: Math.max(u(s.oppositeFrom), u(s.oppositeTo)) };
    });
    arrangement.rooms.forEach((room) => {
      const chosen = room.id === selectedRoom, editHandles = chosen ? selectedHandles : handles, centre = G.centroid(room), fill = room.kind === "bath" ? "#edf5f8" : room.kind === "kitchen" ? "#f2f6ed" : "#faf9f5";
      const name = `Кімната · ${room.name}`;
      const region = room.holes?.length ? `<path class="room-region ${chosen ? "chosen" : ""}" fill-rule="evenodd" d="${G.contours(room).map((ring) => ring.vertices.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(" ") + "Z").join(" ")}" fill="${fill}"/>` : `<polygon class="room-region ${chosen ? "chosen" : ""}" points="${room.vertices.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")}" fill="${fill}"/>`;
      fills.push(`<g role="button" tabindex="0" data-floor-room="${xml(room.id)}" aria-label="${xml(name)}">${region}${text(X(centre.x), Y(centre.y) - 22, room.name, "room-name", "middle")}${text(X(centre.x), Y(centre.y) - 4, `${n(room.widthM)} × ${n(room.depthM)} м · ${n(room.areaM2)} м²`, "room-area", "middle")}</g>`);
      G.edgesOf(room).forEach(({ a, b, wall, index }) => {
        const active = chosen && selectedWall === index, len = Math.hypot(b.x - a.x, b.y - a.y), path = `M${X(a.x)} ${Y(a.y)}L${X(b.x)} ${Y(b.y)}`;
        const covered = faces(room.id, index), cuts = [...new Set([0, 1, ...covered.flatMap((s) => [s.lo, s.hi])])].sort((a, b) => a - b);
        cuts.slice(1).forEach((hi, k) => {
          const lo = cuts[k], middle = (lo + hi) / 2; if (hi - lo < .00001 || covered.some((s) => middle > s.lo - .00001 && middle < s.hi + .00001)) return;
          walls.push(`<path d="M${X(a.x + (b.x - a.x) * lo)} ${Y(a.y + (b.y - a.y) * lo)}L${X(a.x + (b.x - a.x) * hi)} ${Y(a.y + (b.y - a.y) * hi)}" class="physical-wall ${wall.removed ? "removed-wall" : ""}" stroke-linecap="butt" stroke-width="${wall.removed ? 1.2 : plan.wallThicknessM * SCALE}"/>`);
        });
        for (const [key, width, color] of [["doorU", .8, "#a5b8c0"], ["windowU", 1.4, "#79a3b7"]]) if (!wall.removed && wall[key] != null) {
          if (covered.some((s) => wall[key] >= s.lo - .00001 && wall[key] <= s.hi + .00001)) continue;
          const u = Math.max(.05, Math.min(.95, wall[key])), half = Math.min(width / 2, len * .35) / len, l = Math.max(0, u - half), r = Math.min(1, u + half), p = { x: a.x + (b.x - a.x) * l, y: a.y + (b.y - a.y) * l }, q = { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
          walls.push(`<path d="M${X(p.x)} ${Y(p.y)}L${X(q.x)} ${Y(q.y)}" stroke="${key === "doorU" ? "white" : "#e2f1f8"}" stroke-width="${plan.wallThicknessM * SCALE + 2}"/>`);
          if (key === "windowU") walls.push(`<path d="M${X(p.x)} ${Y(p.y)}L${X(q.x)} ${Y(q.y)}" stroke="${color}" stroke-width="1.5"/>`);
          if (editing) openingHandles.push(openingHandle(room, index, key, p, q));
        }
        if (editing) {
          const wallName = `Стіна ${index + 1} · ${room.name}${wall.removed ? " · видалена" : ""}`;
          editHandles.push(`<path d="${path}" class="wall-hit ${active ? "selected" : ""}" role="button" tabindex="0" data-floor-wall="${index}" data-floor-geometry-room="${xml(room.id)}" aria-label="${xml(wallName)}"><title>${xml(wallName)} · ${n(len)} м. Тягніть стіну; подвійний клік додає кут. Alt вимикає прив’язки.</title></path>`);
          if (chosen) {
            const x = (X(a.x) + X(b.x)) / 2, y = (Y(a.y) + Y(b.y)) / 2;
            editHandles.push(`${text(x, y - 12, `${n(len)} м`, "wall-measure", "middle")}<circle cx="${x}" cy="${y}" r="5" class="wall-grip ${active ? "selected" : ""}" role="button" tabindex="0" data-floor-wall="${index}" data-floor-geometry-room="${xml(room.id)}" aria-label="${xml(`Пересунути стіну ${index + 1} · ${room.name}`)}"/>`);
          }
        }
      });
      if (editing && chosen) G.verticesOf(room).forEach((p, index) => selectedHandles.push(`<rect x="${X(p.x) - 6}" y="${Y(p.y) - 6}" width="12" height="12" rx="2" class="vertex-grip ${selectedVertex === index ? "selected" : ""}" role="button" tabindex="0" data-floor-vertex="${index}" data-floor-geometry-room="${xml(room.id)}" aria-label="${xml(`Кут ${index + 1} · ${room.name}`)}"/>`));
    });
    shared.forEach((pair) => {
      const room = arrangement.rooms.find((r) => r.id === pair.roomId), other = arrangement.rooms.find((r) => r.id === pair.otherId), a = { x: (pair.from.x + pair.oppositeFrom.x) / 2, y: (pair.from.y + pair.oppositeFrom.y) / 2 }, b = { x: (pair.to.x + pair.oppositeTo.x) / 2, y: (pair.to.y + pair.oppositeTo.y) / 2 };
      const thickness = Math.max(.02, pair.gap) * SCALE, path = `M${X(a.x)} ${Y(a.y)}L${X(b.x)} ${Y(b.y)}`;
      let markup = `<path d="${path}" class="physical-wall ${pair.removed ? "removed-wall" : ""}" stroke-linecap="butt" stroke-width="${pair.removed ? 1.2 : thickness}"/>`;
      if (!pair.removed) for (const key of ["doorU", "windowU"]) {
        const candidates = [[room, pair.index], [other, pair.otherIndex]].filter(([r, i]) => G.wallAt(r, i)[key] != null).sort(([r], [s]) => Number(s.id === selectedRoom) - Number(r.id === selectedRoom));
        const opening = candidates.map(([r, i]) => { const { a: p, b: q, wall } = G.edgeAt(r, i), u = wall[key], point = { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u }; return { room: r, index: i, u: ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / pair.lengthM ** 2 }; }).find((o) => o.u >= -.00001 && o.u <= 1.00001);
        if (opening == null) continue;
        const half = Math.min(key === "doorU" ? .4 : .7, pair.lengthM * .35) / pair.lengthM, lo = Math.max(0, opening.u - half), hi = Math.min(1, opening.u + half), p = { x: a.x + (b.x - a.x) * lo, y: a.y + (b.y - a.y) * lo }, q = { x: a.x + (b.x - a.x) * hi, y: a.y + (b.y - a.y) * hi }, d = `M${X(p.x)} ${Y(p.y)}L${X(q.x)} ${Y(q.y)}`;
        markup += `<path d="${d}" stroke="${key === "doorU" ? "white" : "#e2f1f8"}" stroke-width="${thickness + 2}"/>${key === "windowU" ? `<path d="${d}" stroke="#79a3b7" stroke-width="1.5"/>` : ""}`;
        if (editing) openingHandles.push(openingHandle(opening.room, opening.index, key, p, q));
      }
      if (docking && [pair.roomId, pair.otherId].includes(docking.targetId) && [pair.roomId, pair.otherId].includes(selectedRoom)) markup += `<path class="docking-guide" d="${path}" fill="none" stroke="#79af25" stroke-width="${thickness + 5}" opacity=".65"/>`;
      walls.push(`<g data-shared-wall="${xml(G.wallAt(room, pair.index).id)}:${xml(G.wallAt(other, pair.otherIndex).id)}" data-shared-room-a="${xml(room.id)}" data-shared-room-b="${xml(other.id)}"><title>${xml(`Спільна стіна · ${room.name} / ${other.name} · ${n(pair.lengthM)} м`)}</title>${markup}</g>`);
    });
    const guide = editing && alignment ? `<path class="alignment-guide" d="M${X(alignment.from.x)} ${Y(alignment.from.y)}L${X(alignment.to.x)} ${Y(alignment.to.y)}" fill="none" stroke="#79af25" stroke-width="2" stroke-dasharray="7 4" pointer-events="none" aria-hidden="true"/>` : "";
    return { fills: fills.join(""), walls: walls.join(""), handles: handles.join("") + selectedHandles.join("") + openingHandles.join("") + guide };
  }
  function render(project, { selectedId = "", circuitId = "", interactiveRoutes = false, selectedRouteToId = "", showRoutes = true, showHeights = true, showGrid = false, gridStepM = .1, geometryEditing = false, selectedRoom = "", selectedWall = null, selectedVertex = null, selectedOpening = null, geometryOnly = false, viewport = null, docking = null, alignment = null } = {}) {
    const result = geometryOnly ? { plan: project.floorPlan, arrangement: F.layout(project.floorPlan), circuits: [] } : F.calculate(project), { plan, arrangement } = result, frame = viewport || arrangement;
    const X = (x) => LEFT + (x - frame.minX) * SCALE, Y = (y) => TOP + (y - frame.minY) * SCALE;
    const width = Math.ceil(frame.width * SCALE + 2 * LEFT);
    const legendColumns = Math.max(1, Math.min(6, Math.floor((width - 60) / 112))), legendRows = Math.ceil(6 / legendColumns);
    const height = Math.ceil(frame.height * SCALE + TOP + Math.max(105, legendRows * 20 + 65));
    const gridStep = (Number.isFinite(Number(gridStepM)) ? Math.max(.05, Math.min(1, Number(gridStepM))) : .1) * SCALE, originX = X(0), originY = Y(0);
    const grid = showGrid ? `<g class="editor-grid" pointer-events="none" aria-hidden="true"><defs><pattern id="floor-grid-minor" patternUnits="userSpaceOnUse" x="${originX}" y="${originY}" width="${gridStep}" height="${gridStep}"><path d="M${gridStep} 0H0V${gridStep}" fill="none" stroke="#9ab2bf" stroke-width=".45" opacity=".55" vector-effect="non-scaling-stroke"/></pattern><pattern id="floor-grid-major" patternUnits="userSpaceOnUse" x="${originX}" y="${originY}" width="${SCALE}" height="${SCALE}"><path d="M${SCALE} 0H0V${SCALE}" fill="none" stroke="#6f94a5" stroke-width=".8" opacity=".6" vector-effect="non-scaling-stroke"/></pattern></defs><rect x="${LEFT}" y="${TOP}" width="${frame.width * SCALE}" height="${frame.height * SCALE}" fill="url(#floor-grid-minor)"/><rect x="${LEFT}" y="${TOP}" width="${frame.width * SCALE}" height="${frame.height * SCALE}" fill="url(#floor-grid-major)"/></g>` : "";
    const css = '.floor-svg{stroke:none;background:white}.floor-svg text{stroke:none;font-family:Arial,"Segoe UI",sans-serif;fill:#3a505d;font-size:12px}.floor-svg .fp-title{font-size:22px;font-weight:700}.floor-svg .fp-sub{font-size:10px;fill:#7b8f99}.floor-svg .room-name{font-size:16px;font-weight:700;fill:#536e7b}.floor-svg .room-area{font-size:11px;fill:#8b9ca4}.floor-svg .point-icon{stroke:currentColor;stroke-width:2.1;fill:#fff;stroke-linecap:round;stroke-linejoin:round}.floor-svg .point-icon path{fill:none}.floor-svg .point-label{font-size:11px;font-weight:700;fill:currentColor}.floor-svg .point-legend-label{font-size:10px;fill:currentColor}.floor-svg .point-height{font-size:9px;fill:#6e8491}.floor-svg .dimension{stroke:#9bb0bd;stroke-width:1;fill:none}.floor-svg .dim-text{fill:#728995;font-size:10px}.floor-svg .route{fill:none;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}.floor-svg .point[role="button"]{cursor:grab}.floor-svg .point[role="button"]:focus{outline:none}.floor-svg .point.selected .selection-ring{stroke:#73a43d;stroke-width:2;fill:#d9efc875}.floor-svg .route-label{font-size:10px;fill:currentColor;paint-order:stroke;stroke:white;stroke-width:4;stroke-linejoin:round}';
    const header = `<rect width="${width}" height="${height}" fill="white"/>${text(30, 36, "План приміщень", "fp-title")}${text(30, 57, `${plan.name} · ${n(arrangement.areaM2)} м² · ${plan.geometryConfirmed ? "обміри підтверджені користувачем" : "типовий редагований ескіз"}`, "fp-sub")}${text(width - 30, 36, plan.routing === "ceiling" ? `Траси по стелі · h = ${n(plan.ceilingHeightM)} м` : "Траси по підлозі", "fp-sub", "end")}`;
    const geometryCss = '.floor-svg .physical-wall{stroke:#52656e;fill:none;stroke-linejoin:round}.floor-svg .removed-wall{stroke:#bdc8ce;stroke-dasharray:7 5}.floor-svg .room-region.chosen{stroke:#4a9c93;stroke-width:1.5;fill:#e9f5f1}.floor-svg.geometry-editing .point{pointer-events:none;opacity:.35}.floor-svg.geometry-editing [data-floor-room]{cursor:move}.floor-svg .wall-hit{fill:none;stroke:transparent;stroke-width:18;cursor:move;pointer-events:stroke}.floor-svg .wall-hit:hover,.floor-svg .wall-hit.selected{stroke:#2c9bba66}.floor-svg .wall-grip{fill:white;stroke:#278ba8;stroke-width:2;cursor:move}.floor-svg .vertex-grip{fill:white;stroke:#278ba8;stroke-width:2;cursor:crosshair}.floor-svg .vertex-grip.selected,.floor-svg .wall-grip.selected{fill:#d2ef69;stroke:#466c16}.floor-svg .wall-measure{fill:#2c788b;font-size:11px;paint-order:stroke;stroke:white;stroke-width:4;pointer-events:none}';
    const openingCss = ".floor-svg .opening-handle{outline:none}.floor-svg .opening-hit{fill:none;stroke:transparent;stroke-width:18;vector-effect:non-scaling-stroke;pointer-events:stroke;cursor:grab}.floor-svg .opening-handle circle{fill:#fff7df;stroke:#a96c21;stroke-width:2;cursor:grab}.floor-svg .opening-handle.window circle{fill:#e5f5ff;stroke:#267ca4}.floor-svg .opening-handle.selected circle,.floor-svg .opening-handle:focus circle{fill:#d2ef69;stroke:#466c16}";
    const geometry = plan.geometryMode === "free" ? geometryLayers(plan, arrangement, X, Y, geometryEditing, selectedRoom, selectedWall, selectedVertex, selectedOpening, docking, alignment) : null;
    const outer = geometry ? "" : arrangement.rooms.filter((room) => room.kind !== "outdoor").map((room) => `<rect x="${X(room.x - plan.wallThicknessM)}" y="${Y(room.y - plan.wallThicknessM)}" width="${(room.widthM + 2 * plan.wallThicknessM) * SCALE}" height="${(room.depthM + 2 * plan.wallThicknessM) * SCALE}" fill="#52656e"/>`).join("");
    const roomFill = (room) => room.kind === "bath" ? "#edf5f8" : room.kind === "kitchen" ? "#f2f6ed" : room.kind === "hall" ? "#f0f3f4" : room.kind === "outdoor" ? "#f2f7ee" : "#faf9f5";
    const interiors = geometry ? geometry.fills : arrangement.rooms.map((room) => {
      const x = X(room.x), y = Y(room.y), w = room.widthM * SCALE, h = room.depthM * SCALE;
      return `<g role="button" tabindex="0" data-floor-room="${xml(room.id)}" aria-label="${xml(`Кімната · ${room.name}`)}"><rect class="room-region ${room.id === selectedRoom ? "chosen" : ""}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${roomFill(room)}" ${room.kind === "outdoor" ? 'stroke="#a7b89c" stroke-dasharray="6 4"' : ""}/>${text(x + w * (room.kind === "hall" ? .72 : .5), y + h * (room.kind === "hall" ? .5 : .27), room.name, "room-name", "middle")}${room.kind === "hall" ? "" : text(x + w / 2, y + h * .27 + 18, `${n(room.widthM)} × ${n(room.depthM)} м · ${n(room.widthM * room.depthM)} м²`, "room-area", "middle")}</g>`;
    }).join("");
    const openings = geometry ? geometry.walls : arrangement.rooms.filter((room) => room.row !== "hall").map((room) => {
      const door = F.doorAt(room), boundary = room.row === "top" ? room.y + room.depthM : room.y, sign = room.row === "top" ? -1 : 1;
      const gapY = boundary - sign * plan.wallThicknessM / 2, left = X(door.x - door.widthM / 2), right = X(door.x + door.widthM / 2), y = Y(boundary), d = door.widthM * SCALE;
      let window = "";
      const wall = room.windowWall;
      if (wall !== "none") {
        const vertical = ["west", "east"].includes(wall), len = Math.min(1.4, (vertical ? room.depthM : room.widthM) * .5) * SCALE;
        const cx = X(wall === "west" ? room.x - plan.wallThicknessM / 2 : wall === "east" ? room.x + room.widthM + plan.wallThicknessM / 2 : room.x + room.widthM / 2);
        const cy = Y(wall === "north" ? room.y - plan.wallThicknessM / 2 : wall === "south" ? room.y + room.depthM + plan.wallThicknessM / 2 : room.y + room.depthM / 2);
        window = `<path d="${vertical ? `M${cx} ${cy - len / 2}V${cy + len / 2}` : `M${cx - len / 2} ${cy}H${cx + len / 2}`}" stroke="#e2f1f8" stroke-width="${plan.wallThicknessM * SCALE + 2}"/><path d="${vertical ? `M${cx} ${cy - len / 2}V${cy + len / 2}` : `M${cx - len / 2} ${cy}H${cx + len / 2}`}" stroke="#79a3b7" stroke-width="1.5"/>`;
      }
      return `<path d="M${left} ${Y(gapY)}H${right}" stroke="white" stroke-width="${plan.wallThicknessM * SCALE + 2}"/><path d="M${left} ${y}V${y + sign * d}M${right} ${y}A${d} ${d} 0 0 ${sign === 1 ? 1 : 0} ${left} ${y + sign * d}" fill="none" stroke="#a8b8c0" stroke-width="1"/>${window}`;
    }).join("");
    const routes = showRoutes ? result.circuits.map((circuit) => circuit.legs.map((leg, index) => {
      const path = leg.points.filter((p, i) => !i || p.x !== leg.points[i - 1].x || p.y !== leg.points[i - 1].y);
      const selected = !circuitId || circuit.deviceId === circuitId;
      const d = path.map((p, i) => `${i ? "L" : "M"}${X(p.x)} ${Y(p.y)}`).join(" ");
      const segments = path.slice(1).map((b, i) => ({ a: path[i], b, length: Math.hypot(b.x - path[i].x, b.y - path[i].y) })).sort((a, b) => b.length - a.length);
      const mid = segments.length ? { x: (segments[0].a.x + segments[0].b.x) / 2, y: (segments[0].a.y + segments[0].b.y) / 2 } : path[0];
      const active = selected && (leg.toId === selectedRouteToId || leg.fromId === selectedId || leg.toId === selectedId);
      const from = plan.points.find((p) => p.id === leg.fromId), to = plan.points.find((p) => p.id === leg.toId);
      const title = `${circuit.label}: ${from.label} → ${to.label} · ≈${n(leg.lengthM)} м`;
      const hit = interactiveRoutes && selected && leg.kind === "feed" ? `<path d="${d}" fill="none" stroke="transparent" stroke-width="12" pointer-events="stroke" cursor="pointer" role="button" tabindex="0" data-floor-route="${xml(leg.toId)}" data-floor-route-circuit="${xml(circuit.deviceId)}" aria-label="${xml(title)}"><title>${xml(title)} · Натисніть, щоб вставити дозу</title></path>` : "";
      return `<g style="color:${circuit.color}" opacity="${active ? 1 : selected ? circuitId ? .65 : .32 : .06}"><path class="route" d="${d}" stroke="${circuit.color}" style="stroke-width:${active ? 3.5 : 1.8}" ${leg.kind === "switch" ? 'stroke-dasharray="5 3"' : ""}><title>${xml(title)}</title></path>${circuitId && selected && mid && circuit.legs.length <= 8 && leg.kind === "feed" ? text(X(mid.x) + 6, Y(mid.y) - 7 - index % 3 * 11, `${from.label} → ${to.label} · ≈${n(leg.lengthM)} м`, "route-label") : ""}${hit}</g>`;
    }).join("")).join("") : "";
    const points = plan.points.map((point) => {
      const pos = F.world(plan, point, arrangement), circuit = result.circuits.find((c) => c.deviceId === point.circuitId), { color, fill } = POINT_STYLES[point.type];
      const labelX = point.u > .82 ? -19 : 19, anchor = point.u > .82 ? "end" : "start";
      const source = F.sourceFor(plan, point);
      const mounting = point.type === "junction" ? F.junctionMounting(plan, point) === "ceiling" ? " · на стелі" : " · на стіні" : "";
      const name = `${point.label} · ${point.name}${mounting} · h=${n(pos.z)} м${circuit ? ` · ${circuit.label}` : ""}${source ? ` · траса від ${source.label}` : ""}`;
      return `<g transform="translate(${X(pos.x)} ${Y(pos.y)})" class="point ${point.id === selectedId ? "selected" : ""}" role="button" tabindex="0" data-floor-point="${xml(point.id)}" aria-label="${xml(name)}" style="color:${color}"><title>${xml(name)}</title><circle class="selection-ring" r="23" fill="transparent" stroke="none"/><g class="point-icon" style="fill:${fill}">${icon(point)}</g>${text(point.type === "panel" ? 0 : labelX, point.type === "panel" ? 31 : -3, point.type === "equipment" ? `${point.label} · ${point.name}` : point.type === "panel" ? `${point.label} · Щиток` : point.label, "point-label", point.type === "panel" ? "middle" : anchor)}${showHeights ? text(point.type === "panel" ? 0 : labelX, point.type === "panel" ? 46 : 12, `h ${n(pos.z)} м${point.type === "junction" ? F.junctionMounting(plan, point) === "ceiling" ? " · стеля" : " · стіна" : ""}`, "point-height", point.type === "panel" ? "middle" : anchor) : ""}</g>`;
    }).join("");
    const dims = `<path class="dimension" d="M${LEFT} 79H${LEFT + arrangement.width * SCALE}M${LEFT} 73V86M${LEFT + arrangement.width * SCALE} 73V86M33 ${TOP}V${TOP + arrangement.height * SCALE}M27 ${TOP}H39M27 ${TOP + arrangement.height * SCALE}H39"/>${text(LEFT + arrangement.width * SCALE / 2, 73, `${n(arrangement.width)} м`, "dim-text", "middle")}<text class="dim-text" transform="translate(24 ${TOP + arrangement.height * SCALE / 2}) rotate(-90)" text-anchor="middle">${n(arrangement.height)} м</text>`;
    const legend = Object.entries(POINT_STYLES).map(([type, style], index) => {
      const x = 30 + index % legendColumns * 112, y = height - 62 - (legendRows - 1 - Math.floor(index / legendColumns)) * 20;
      return `<g style="color:${style.color}"><g class="point-icon" style="fill:${style.fill}" transform="translate(${x + 7} ${y - 4}) scale(.45)">${icon({ type })}</g>${text(x + 21, y, style.label, "point-legend-label")}</g>`;
    }).join("");
    const footer = `<g class="point-legend" role="group" aria-label="Кольори електричних точок">${legend}</g>${text(30, height - 43, "Кольори точок — тип; кабелів — коло. h — від чистої підлоги.", "fp-sub")}${text(30, height - 24, "Техніка позначена умовно. Запас кабелю — окремо у відомості.", "fp-sub")}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="floor-svg ${geometryEditing ? "geometry-editing" : ""}" role="group" aria-label="План приміщень з електричними точками" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><style>${css}${geometryCss}${openingCss}</style>${header}${outer}${interiors}${grid}${openings}${routes}${points}${dims}${geometry?.handles || ""}${footer}</svg>`;
  }
  return { SCALE, LEFT, TOP, render };
});

;
/* electrical.js */
/* Shared project and connectivity model. No DOM or rendering dependencies. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./control-devices.js") : root.ControlDevices, typeof module === "object" && module.exports ? require("./mechanical.js") : root.PanelMechanical, typeof module === "object" && module.exports ? require("./floor-plan.js") : root.PanelFloorPlan);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Electrical = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C, M, F) {
  "use strict";
  const PHASES = ["L1", "L2", "L3"];
  const POTENTIALS = [...PHASES, "N", "PE", "PEN", ...C.CONTROL_POTENTIALS];
  const COLORS = {
    brown: { label: "Коричневий", hex: "#80502c" },
    black: { label: "Чорний", hex: "#24282c" },
    gray: { label: "Сірий", hex: "#8b9299" },
    blue: { label: "Синій", hex: "#1976df" },
    greenYellow: { label: "Жовто-зелений", hex: "#24864b" },
    red: { label: "Червоний", hex: "#c8463e" },
    white: { label: "Білий", hex: "#d8dce0" },
    violet: { label: "Фіолетовий", hex: "#8960b0" },
  };
  const DEFAULT_COLORS = { L1: "brown", L2: "black", L3: "gray", N: "blue", PE: "greenYellow", PEN: "greenYellow", "DC+": "red", DC0: "black", "AC+": "violet", AC0: "white" };
  const DEVICE_TYPES = new Set(["main-2p", "main-3p", "main-4p", "mcb-1p", "mcb-2p", "rcbo", "rcbo-afdd", "outgoing-terminal", "rccb-2p", "rccb-4p", "spd-2p", "spd-4p", "contactor", "relay", "meter", "terminal", "blank", ...C.COMPONENTS.map((item) => item.type)]);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isRcd = (device) => ["rcbo", "rcbo-afdd"].includes(device?.type) || device?.type?.startsWith("rccb-");
  const phasesOf = (device) => /-[34]p$/.test(device.type) ? PHASES : [PHASES.includes(device.phase) ? device.phase : "L1"];
  const endpointKey = (ref) => `${ref.kind}:${ref.ownerId}:${ref.portId}`;
  const sameEndpoint = (a, b) => endpointKey(a) === endpointKey(b);

  function normalizeProject(input) {
    const project = clone(input);
    if (!project || !project.board || !Array.isArray(project.devices)) throw new Error("Невідомий формат проєкту");
    project.id = typeof project.id === "string" && project.id.trim() ? project.id : id();
    project.name = String(project.name || "Без назви");
    const now = new Date().toISOString();
    for (const key of ["createdAt", "updatedAt"]) if (typeof project[key] !== "string" || !Number.isFinite(Date.parse(project[key]))) project[key] = now;
    if (project.design != null) {
      if (typeof project.design !== "object" || Array.isArray(project.design)) throw new Error("Некоректна розрахункова відомість");
      project.design.supply ??= {}; project.design.circuits ??= []; project.design.rcdGroups ??= [];
      if (!project.design.supply || typeof project.design.supply !== "object" || Array.isArray(project.design.supply) || !Array.isArray(project.design.circuits) || !Array.isArray(project.design.rcdGroups)) throw new Error("Некоректні дані вводу або кіл");
      if ([...project.design.circuits, ...project.design.rcdGroups].some((record) => !record || typeof record !== "object" || typeof record.deviceId !== "string")) throw new Error("Некоректний запис розрахункового кола");
      project.design.supply.dataConfirmed = project.design.supply.dataConfirmed === true;
    }
    const board = project.board;
    if (board.name != null) board.name = String(board.name);
    if (!Number.isInteger(Number(board.rows)) || Number(board.rows) < 1 || Number(board.rows) > 8 || !Number.isInteger(Number(board.modulesPerRow)) || Number(board.modulesPerRow) < 1 || Number(board.modulesPerRow) > 72) throw new Error("Щит підтримує 1–8 рейок і 1–72 місця в ряду");
    board.rows = Number(board.rows);
    board.modulesPerRow = Number(board.modulesPerRow);
    if (board.enclosureId || board.dimensions) M.boardGeometry(board);
    board.earthing = ["TN-S", "TT", "TN-C-S"].includes(board.earthing) ? board.earthing : "TN-S";
    board.penSplit = board.earthing === "TN-C-S" && board.penSplit === true;
    project.version = 2;
    for (const key of ["busbars", "wires", "combs", "consumers"]) if (project[key] != null && !Array.isArray(project[key])) throw new Error(`Некоректна колекція проєкту: ${key}`);
    project.busbars = Array.isArray(project.busbars) ? project.busbars : [];
    project.wires = Array.isArray(project.wires) ? project.wires : [];
    project.combs = Array.isArray(project.combs) ? project.combs : [];
    project.consumers = Array.isArray(project.consumers) ? project.consumers : [];
    [...project.devices, ...project.busbars, ...project.wires, ...project.combs, ...project.consumers].forEach((entity) => {
      if (!entity || typeof entity !== "object" || Array.isArray(entity) || entity.id != null && typeof entity.id !== "string") throw new Error("Некоректний елемент або його ідентифікатор");
    });
    project.consumers.forEach((consumer) => {
      consumer.id ||= id();
      consumer.label = String(consumer.label || "Споживач");
      consumer.name = String(consumer.name || consumer.label);
      consumer.phase = [...PHASES, "3P"].includes(consumer.phase) ? consumer.phase : "L1";
      if (consumer.deviceId != null && typeof consumer.deviceId !== "string") throw new Error("Некоректна прив’язка споживача до апарата");
      if (consumer.nameIndependent != null && typeof consumer.nameIndependent !== "boolean") throw new Error("Некоректний режим назви споживача");
    });
    project.devices.forEach((device) => {
      if (!device || !DEVICE_TYPES.has(device.type)) throw new Error(`Непідтримуваний тип апарата: ${device?.type || "не вказано"}`);
      device.id ||= id();
      device.label = String(device.label || "Q");
      device.name = String(device.name || device.type || "Пристрій");
      device.rating = String(device.rating || "");
      device.phase ||= "L1";
      if (![...PHASES, "3P", "N", "PE"].includes(device.phase)) throw new Error("Невідома фаза апарата");
      device.row = Number(device.row);
      device.slot = Number(device.slot);
      if (device.geometryId || device.dimensions) M.dimensions(device);
      if (!Number.isInteger(device.row) || !Number.isInteger(device.slot) || device.row < 0 || device.row >= board.rows || device.slot < 0 || device.slot >= board.modulesPerRow) throw new Error("Невірне місце апарата");
    });
    project.busbars.forEach((bar) => {
      bar.id ||= id();
      if (!["N", "PE", "PEN"].includes(bar.potential)) throw new Error("Невідомий тип шини");
      bar.label = String(bar.label || bar.potential);
      bar.terminals = Number(bar.terminals ?? 8);
      if (!Number.isInteger(bar.terminals) || bar.terminals < 2 || bar.terminals > 24) throw new Error("Кількість клем шини має бути від 2 до 24");
      bar.zone = ["top", "bottom", "left", "right", "din"].includes(bar.zone) ? bar.zone : "bottom";
      bar.row = Number(bar.row || 0);
      bar.slot = Number(bar.slot || 0);
      bar.rcdId ||= "";
      bar.ratedCurrent = positiveOrNull(bar.ratedCurrent);
      if (bar.dimensions) M.dimensions({ ...bar, type: "terminal", geometryId: "custom" });
      if (bar.positionMm && ![bar.positionMm.x, bar.positionMm.y].every((value) => value !== "" && value != null && Number.isFinite(Number(value)) && Number(value) >= 0)) throw new Error("Некоректні координати шини");
      bar.minSection = positiveOrNull(bar.minSection);
      bar.maxSection = positiveOrNull(bar.maxSection);
    });
    project.wires.forEach((wire) => {
      if (!validRef(wire.from) || !validRef(wire.to)) throw new Error("У проводу немає коректних клем");
      wire.id ||= id();
      wire.label = String(wire.label || "W");
      wire.potential ||= resolveEndpoint(project, wire.from)?.potential || "L1";
      if (!POTENTIALS.includes(wire.potential)) throw new Error("Невідоме призначення проводу");
      wire.color ||= DEFAULT_COLORS[wire.potential] || "brown";
      wire.section = Number(wire.section ?? 2.5);
      wire.material = wire.material === "Al" ? "Al" : "Cu";
      if (wire.wireType != null) wire.wireType = String(wire.wireType).trim().slice(0, 100);
      if (wire.lengthM != null && wire.lengthM !== "") {
        const length = Number(wire.lengthM);
        if (!["number", "string"].includes(typeof wire.lengthM) || !Number.isFinite(length) || length <= 0 || length > 100000) throw new Error(`${wire.label}: некоректна довжина проводу.`);
        wire.lengthM = length;
      } else if (wire.lengthM === "") wire.lengthM = null;
      wire.points = Array.isArray(wire.points) ? wire.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).map((point) => ({ x: point.x, y: point.y })) : [];
    });
    project.combs.forEach((comb) => {
      comb.id ||= id(); comb.label = String(comb.label || "Гребінка"); comb.terminals ||= [];
      if (!Array.isArray(comb.terminals) || comb.terminals.some((ref) => !validRef(ref)) || ![...PHASES, "N"].includes(comb.potential)) throw new Error("Некоректні контакти гребінки");
      comb.ratedCurrent = positiveOrNull(comb.ratedCurrent);
      if (comb.contactType != null && !["", "pin", "fork"].includes(comb.contactType)) throw new Error("Невідомий тип контакту гребінки.");
      if (comb.series != null) comb.series = String(comb.series).trim().slice(0, 120);
    });
    const entityIds = [...project.devices, ...project.busbars, ...project.wires, ...project.combs, ...project.consumers].map((entity) => entity.id);
    if (new Set(entityIds).size !== entityIds.length) throw new Error("Повторені ідентифікатори у проєкті");
    if (project.floorPlan) {
      project.floorPlan = F.normalize(project.floorPlan);
      if (project.floorPlan.circuits.some((circuit) => project.devices.some((device) => device.id === circuit.id))) throw new Error("Ідентифікатор кола плану збігається з апаратом щита.");
    }
    F.verifyFloors(project);
    for (const floor of project.otherFloors || []) {
      if (floor.circuits.some((circuit) => project.devices.some((device) => device.id === circuit.id))) throw new Error("Ідентифікатор кола плану збігається з апаратом щита.");
    }
    if (project.riserLeadM != null && (!Number.isFinite(project.riserLeadM) || project.riserLeadM < 0 || project.riserLeadM > 300)) throw new Error("Перевірте довжину підводу до стояка");
    if (project.wireEndAllowanceMm != null && (!Number.isInteger(project.wireEndAllowanceMm) || project.wireEndAllowanceMm < 0 || project.wireEndAllowanceMm > 1000)) delete project.wireEndAllowanceMm;
    return project;
  }

  function positiveOrNull(value) {
    return value !== "" && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  }

  function replaceAfdd(project, deviceId) {
    const next = clone(project), device = next.devices.find((item) => item.id === deviceId);
    if (!device || device.type !== "rcbo-afdd") throw new Error("Оберіть дифавтомат із ПВДП");
    device.type = "rcbo"; device.geometryId = M.defaultProfile("rcbo");
    delete device.dimensions; delete device.mounting;
    const record = next.design?.circuits?.find((circuit) => circuit.deviceId === deviceId);
    if (record) { record.i2A = null; record.icnA = null; record.minFaultA = null; record.letThroughA2s = null; record.shortCircuitTimeS = null; record.shortCircuitSource = ""; }
    if (next.design?.supply) next.design.supply.dataConfirmed = false;
    return normalizeProject(M.repack(next));
  }

  function validRef(ref) {
    return ref && ["device", "busbar", "consumer"].includes(ref.kind) && typeof ref.ownerId === "string" && typeof ref.portId === "string";
  }

  function deviceTerminals(device) {
    if (!device || device.type === "blank") return [];
    const custom = C.terminals(device);
    if (custom) return custom;
    const phase = phasesOf(device)[0];
    const port = (portId, label, potential, side, x, extras = {}) => ({ portId, label, potential, side, x, ...extras });
    if (device.type === "terminal") return [port("in", "1", device.phase === "PE" ? "PE" : device.phase === "N" ? "N" : phase, "top", .5), port("out", "2", device.phase === "PE" ? "PE" : device.phase === "N" ? "N" : phase, "bottom", .5)];
    if (device.type === "outgoing-terminal") return [phase, "N", "PE"].flatMap((potential, index) => [port(`${index ? potential : "L"}-in`, index ? potential : "L", potential, "top", (index + .5) / 3), port(`${index ? potential : "L"}-out`, index ? potential : "L", potential, "bottom", (index + .5) / 3)]);
    if (device.type.startsWith("spd-")) {
      const potentials = [...phasesOf(device), "N"];
      return [...potentials.map((potential, index) => port(`${potential}-in`, potential, potential, "top", (index + .5) / potentials.length)), port("PE", "PE", "PE", "bottom", .5)];
    }
    if (device.type === "mcb-1p") return [port("L-in", "1", phase, "top", .5), port("L-out", "2", phase, "bottom", .5)];
    const potentials = device.type === "main-3p" ? PHASES : [...phasesOf(device), "N"];
    const ports = potentials.flatMap((potential, index) => {
      const prefix = PHASES.includes(potential) && potentials.length === 2 ? "L" : potential;
      return [port(`${prefix}-in`, potential === "N" ? "N↑" : `${index * 2 + 1}`, potential, "top", (index + .5) / potentials.length), port(`${prefix}-out`, potential === "N" ? "N↓" : `${index * 2 + 2}`, potential, "bottom", (index + .5) / potentials.length)];
    });
    if (device.type === "contactor") ports.push(port("A1", "A1", phase, "left", .5), port("A2", "A2", "N", "right", .5));
    return ports;
  }

  function allEndpoints(project) {
    return [
      ...project.devices.flatMap((device) => deviceTerminals(device).map((port) => ({ ...port, kind: "device", ownerId: device.id, ownerLabel: device.label }))),
      ...project.busbars.flatMap((bar) => Array.from({ length: bar.terminals }, (_, index) => ({ kind: "busbar", ownerId: bar.id, ownerLabel: bar.label, portId: String(index + 1), label: String(index + 1), potential: bar.potential, side: "top" }))),
      ...(project.consumers || []).flatMap((consumer) => consumerTerminals(consumer).map((port) => ({ ...port, kind: "consumer", ownerId: consumer.id, ownerLabel: consumer.label }))),
    ];
  }

  function consumerTerminals(consumer) {
    const potentials = [...(consumer.phase === "3P" ? PHASES : [consumer.phase]), "N", "PE"];
    return potentials.map((potential, index) => ({ portId: `${consumer.phase !== "3P" && index === 0 ? "L" : potential}-in`, label: consumer.phase !== "3P" && index === 0 ? "L" : potential, potential, side: "top", x: (index + .5) / potentials.length }));
  }
  function consumerForDevice(project, deviceId) {
    const circuit = project.design?.circuits?.find((c) => c.deviceId === deviceId && c.outputKind === "consumer");
    return (project.consumers || []).find((c) => c.deviceId === deviceId || c.id === circuit?.outputId) || null;
  }
  function canAddConsumer(device) {
    return Boolean(device && deviceTerminals(device).some((p) => p.side === "bottom" && PHASES.includes(p.potential)));
  }
  function addConsumer(project, deviceId) {
    const next = normalizeProject(project), device = next.devices.find((d) => d.id === deviceId);
    if (!canAddConsumer(device)) throw new Error("Оберіть апарат із вихідними силовими клемами.");
    const existing = consumerForDevice(next, deviceId);
    if (existing) return { project: next, consumerId: existing.id, created: false };
    let circuit = next.design?.circuits?.find((c) => c.deviceId === deviceId);
    if (circuit?.outputId) throw new Error("Коло вже має вихідний клемник або споживача.");
    const consumer = { id: id(), label: nextLabel(next.consumers, "Споживач "), name: device.name, phase: device.phase, deviceId };
    next.consumers.push(consumer);
    if (next.design && ["mcb-1p", "mcb-2p", "rcbo", "rcbo-afdd"].includes(device.type)) {
      if (!circuit) { circuit = { deviceId, lengthM: null, powerFactor: 1, diversity: 1, izA: null, i2A: null, icnA: null, minFaultA: null, cableSource: "" }; next.design.circuits.push(circuit); }
      circuit.outputId = consumer.id; circuit.outputKind = "consumer"; next.design.supply.dataConfirmed = false;
    }
    return { project: normalizeProject(next), consumerId: consumer.id, created: true };
  }
  function renameConsumer(project, consumerId, name) {
    const next = normalizeProject(project), consumer = next.consumers.find((c) => c.id === consumerId), value = String(name || "").trim();
    if (!consumer) throw new Error("Споживача не знайдено.");
    if (!value || value.length > 160) throw new Error("Введіть назву споживача від 1 до 160 символів.");
    consumer.name = value; consumer.nameIndependent = true; return next;
  }

  function resolveEndpoint(project, ref) {
    if (!ref) return null;
    if (ref.kind === "consumer") {
      const owner = (project.consumers || []).find((consumer) => consumer.id === ref.ownerId);
      const port = owner && consumerTerminals(owner).find((item) => item.portId === ref.portId);
      return port ? { ...port, ...ref, ownerLabel: owner.label } : null;
    }
    if (ref.kind === "device") {
      const owner = project.devices.find((device) => device.id === ref.ownerId);
      const port = deviceTerminals(owner).find((item) => item.portId === ref.portId);
      return owner && port ? { ...port, ...ref, ownerLabel: owner.label } : null;
    }
    const owner = project.busbars.find((bar) => bar.id === ref.ownerId);
    const index = Number(ref.portId);
    return ref.kind === "busbar" && owner && Number.isInteger(index) && index >= 1 && index <= owner.terminals ? { ...ref, potential: owner.potential, ownerLabel: owner.label, label: ref.portId, side: "top" } : null;
  }

  const refOf = (port) => ({ kind: port.kind, ownerId: port.ownerId, portId: port.portId });
  const endpointLabel = (project, ref) => { const port = resolveEndpoint(project, ref); return port ? `${port.ownerLabel}:${port.label}` : "Відсутня клема"; };
  const busbarModules = (bar, board) => M.barModules(bar, board);

  function combCandidates(project, { row = 0, potential = "L1", side = "top", excludeId = "" } = {}) {
    const occupied = new Set((project.combs || []).filter((comb) => comb.id !== excludeId).flatMap((comb) => comb.terminals.map(endpointKey)));
    return allEndpoints(project).filter((port) => port.kind === "device" && port.potential === potential && port.side === side)
      .map((port) => ({ ...port, device: project.devices.find((device) => device.id === port.ownerId), occupied: occupied.has(endpointKey(port)) }))
      .filter((port) => port.device.row === Number(row)).sort((a, b) => a.device.slot - b.device.slot || a.x - b.x);
  }

  // Combs use the existing terminal graph, so reports, protection checks and
  // schematics see an electrical connection rather than decorative artwork.
  function saveComb(project, input, { replaceJumpers = false } = {}) {
    const next = normalizeProject(project), previous = next.combs.find((comb) => comb.id === input.id);
    const current = input.ratedCurrent;
    if (current != null && current !== "" && (!Number.isFinite(Number(current)) || Number(current) <= 0 || Number(current) > 1000)) throw new Error("Вкажіть коректний номінальний струм гребінки.");
    const comb = { ...previous, id: input.id || id(), label: String(input.label || nextLabel(next.combs, "BB")).trim().slice(0, 80), potential: input.potential, terminals: clone(input.terminals || []), ratedCurrent: positiveOrNull(current), contactType: input.contactType || "", series: String(input.series || "").trim().slice(0, 120) };
    if (![...PHASES, "N"].includes(comb.potential)) throw new Error("Оберіть фазу L1, L2, L3 або нейтраль N.");
    const originalFeeds = connectivity(next, { isolateProtection: true });
    next.combs = next.combs.filter((item) => item.id !== comb.id).concat(comb);
    const check = () => validate(next).find((issue) => issue.level === "error" && (issue.entityId === comb.id || issue.code === "neutral-mix"));
    // Never mask a dangerous bridge by removing one of its feeders afterwards.
    const before = check(); if (before) throw new Error(before.text);
    const members = new Set(comb.terminals.map(endpointKey)), feedPairs = new Set(), removedWireIds = [];
    if (replaceJumpers) next.wires = next.wires.filter((wire) => {
      if (wire.potential !== comb.potential) return true;
      const from = members.has(endpointKey(wire.from)), to = members.has(endpointKey(wire.to));
      let redundant = from && to;
      if (from !== to) {
        const external = originalFeeds.find(from ? wire.to : wire.from);
        redundant = feedPairs.has(external); feedPairs.add(external);
      }
      if (redundant) removedWireIds.push(wire.id);
      return !redundant;
    });
    const problem = check();
    if (problem) throw new Error(problem.text);
    if (next.design) { next.design.approval = null; if (next.design.supply) next.design.supply.dataConfirmed = false; }
    return { project: normalizeProject(next), combId: comb.id, removedWireIds };
  }

  function compatible(project, a, b, potential) {
    if (!a || !b || sameEndpoint(a, b)) return false;
    const supplyA = C.supply(a), supplyB = C.supply(b);
    if (supplyA.kind !== supplyB.kind || supplyA.voltage !== supplyB.voltage) return false;
    if (a.potential === b.potential) return !potential || potential === a.potential;
    const pen = a.potential === "PEN" ? a : b.potential === "PEN" ? b : null;
    const other = pen === a ? b : a;
    return Boolean(pen && project.board.earthing === "TN-C-S" && project.board.penSplit && project.busbars.find((bar) => bar.id === pen.ownerId)?.potential === "PEN" && ["N", "PE"].includes(other.potential) && (!potential || potential === other.potential));
  }

  function preferredPotential(a, b) { return a.potential === "PEN" && b ? b.potential : a.potential; }

  function makeWire(project, from, to, options = {}) {
    const a = resolveEndpoint(project, from), b = resolveEndpoint(project, to);
    const potential = options.potential || (a && b ? preferredPotential(a, b) : "L1");
    if (!compatible(project, a, b, potential)) throw new Error("Несумісні клеми: перевірте потенціал, напругу та AC/DC");
    const wire = { id: id(), label: nextLabel(project.wires, "W"), from: refOf(a), to: refOf(b), potential, section: Number(options.section || 2.5), color: options.color || DEFAULT_COLORS[potential], material: options.material || "Cu", points: clone(options.points || []) };
    if (options.wireType != null) wire.wireType = String(options.wireType).trim().slice(0, 100);
    if (options.lengthM != null) {
      if (!["number", "string"].includes(typeof options.lengthM) || !Number.isFinite(Number(options.lengthM)) || Number(options.lengthM) <= 0 || Number(options.lengthM) > 100000) throw new Error("Некоректна довжина проводу.");
      wire.lengthM = Number(options.lengthM);
    }
    const candidate = { ...project, wires: [...project.wires, wire] };
    const problem = validate(candidate).find((issue) => issue.level === "error" && (issue.entityId === wire.id || ["neutral-mix", "terminal-overflow", "pen-count"].includes(issue.code)));
    if (problem) throw new Error(problem.text);
    return wire;
  }

  function nextLabel(items, prefix) {
    let index = 1;
    while (items.some((item) => item.label === `${prefix}${String(index).padStart(3, "0")}`)) index += 1;
    return `${prefix}${String(index).padStart(3, "0")}`;
  }

  function reconnectWire(project, wireId, end, endpoint) {
    const wire = project.wires.find((item) => item.id === wireId);
    if (!wire || !["from", "to"].includes(end)) throw new Error("Не знайдено провід або його кінець");
    const remaining = { ...project, wires: project.wires.filter((item) => item.id !== wireId) };
    const changed = makeWire(remaining, end === "from" ? endpoint : wire.from, end === "to" ? endpoint : wire.to, wire);
    return { ...changed, id: wire.id, label: wire.label, points: [] };
  }

  function deviceForWire(project, wireId, device) {
    const wire = project.wires.find((item) => item.id === wireId);
    if (!wire) throw new Error("Оберіть провід для вставлення апарата");
    const next = clone(device);
    if (PHASES.includes(wire.potential) && !/-[34]p$/.test(next.type)) next.phase = wire.potential;
    if (next.type === "terminal" && ["N", "PE"].includes(wire.potential)) next.phase = wire.potential;
    const defaults = C.configFor(next.type);
    if (defaults && "contactPotential" in defaults && [...PHASES, "DC+", "AC+"].includes(wire.potential)) {
      next.contactPotential = wire.potential;
      next.contactVoltage = C.supply(resolveEndpoint(project, wire.from)).voltage;
    }
    return next;
  }

  function insertionPairs(project, wireId, device) {
    const wire = project.wires.find((item) => item.id === wireId);
    if (!wire) return [];
    const a = resolveEndpoint(project, wire.from), b = resolveEndpoint(project, wire.to);
    const ports = deviceTerminals(device);
    let pairs;
    if (C.has(device)) {
      const contacts = { "control-relay": [["11", "14"], ["11", "12"]], "time-relay": [["11", "14"], ["11", "12"]], "star-delta-relay": [["C", "Y"], ["C", "Δ"]], "phase-monitor": [["11", "14"], ["11", "12"]], "pushbutton-no": [["13", "14"]], "pushbutton-nc": [["21", "22"]] };
      pairs = contacts[device.type] || C.internalLinks(device);
    } else {
      pairs = ports.filter((port) => port.side === "top").flatMap((input) => ports.filter((output) => output.side === "bottom" && output.potential === input.potential).map((output) => [input.portId, output.portId]));
    }
    return pairs.filter(([inputId, outputId]) => {
      const input = ports.find((port) => port.portId === inputId), output = ports.find((port) => port.portId === outputId);
      return input && output && compatible(project, { ...input, kind: "device", ownerId: device.id }, a, wire.potential) && compatible(project, { ...output, kind: "device", ownerId: device.id }, b, wire.potential);
    });
  }

  function insertDeviceInWire(project, wireId, device, chosenPair) {
    const wire = project.wires.find((item) => item.id === wireId);
    if (!wire) throw new Error("Обраний провід більше не існує");
    const nextDevice = deviceForWire(project, wireId, device);
    const pairs = insertionPairs(project, wireId, nextDevice);
    const pair = chosenPair ? pairs.find(([a, b]) => a === chosenPair[0] && b === chosenPair[1]) : pairs[0];
    if (!pair) throw new Error(`Апарат не має прохідної пари клем для проводу ${wire.potential}. Додайте його окремо або виберіть інший провід.`);
    if (project.wires.some((item) => [item.from, item.to].some((end) => end.kind === "device" && end.ownerId === device.id)) || project.combs.some((comb) => comb.terminals.some((end) => end.ownerId === device.id))) throw new Error("Апарат уже підключений. Для вставлення виберіть новий або непідключений апарат.");
    const next = clone(project);
    next.devices = next.devices.filter((item) => item.id !== device.id);
    next.devices.push(nextDevice);
    next.wires = next.wires.filter((item) => item.id !== wireId);
    const a = resolveEndpoint(project, wire.from), b = resolveEndpoint(project, wire.to);
    const reverse = a?.kind === "consumer" || a?.side === "top" && b?.side === "bottom";
    const portRef = (portId) => ({ kind: "device", ownerId: nextDevice.id, portId });
    // Inserting an apparatus changes the two physical pieces. Their original
    // combined length cannot be assigned to each piece or inferred from pixels.
    const options = { potential: wire.potential, color: wire.color, section: wire.section, material: wire.material, wireType: wire.wireType, points: [] };
    const first = { ...makeWire(next, wire.from, portRef(pair[reverse ? 1 : 0]), options), id: wire.id, label: wire.label };
    next.wires.push(first);
    const second = makeWire(next, portRef(pair[reverse ? 0 : 1]), wire.to, options);
    next.wires.push(second);
    return { project: normalizeProject(next), device: nextDevice, wireIds: [first.id, second.id], pair };
  }

  function unionFind(endpoints) {
    const parents = new Map(endpoints.map((port) => [endpointKey(port), endpointKey(port)]));
    const find = (key) => {
      if (!parents.has(key)) return key;
      let current = key;
      while (parents.get(current) !== current) current = parents.get(current);
      let cursor = key;
      while (parents.get(cursor) !== cursor) { const next = parents.get(cursor); parents.set(cursor, current); cursor = next; }
      return current;
    };
    const join = (a, b) => { a = endpointKey(a); b = endpointKey(b); if (parents.has(a) && parents.has(b)) parents.set(find(a), find(b)); };
    return { find: (ref) => find(typeof ref === "string" ? ref : endpointKey(ref)), join };
  }

  function connectivity(project, { neutralDomains = false, isolateProtection = false } = {}) {
    const ports = allEndpoints(project);
    const nets = unionFind(ports);
    project.wires.forEach((wire) => { if (resolveEndpoint(project, wire.from) && resolveEndpoint(project, wire.to)) nets.join(wire.from, wire.to); });
    project.combs.forEach((comb) => comb.terminals.slice(1).forEach((port) => nets.join(comb.terminals[0], port)));
    project.busbars.forEach((bar) => {
      for (let n = 2; n <= bar.terminals; n += 1) nets.join({ kind: "busbar", ownerId: bar.id, portId: "1" }, { kind: "busbar", ownerId: bar.id, portId: String(n) });
    });
    project.devices.forEach((device) => {
      if (isolateProtection && /^(main-|mcb-|rccb-|rcbo)/.test(device.type)) return;
      if (C.has(device)) {
        C.internalLinks(device).forEach(([from, to]) => nets.join({ kind: "device", ownerId: device.id, portId: from }, { kind: "device", ownerId: device.id, portId: to }));
        return;
      }
      if (device.type.startsWith("spd-") || device.type === "blank") return;
      const terminals = deviceTerminals(device);
      terminals.filter((port) => port.side === "top").forEach((input) => {
        if (neutralDomains && isRcd(device) && input.potential === "N") return;
        const output = terminals.find((port) => port.side === "bottom" && port.potential === input.potential);
        if (output) nets.join({ kind: "device", ownerId: device.id, portId: input.portId }, { kind: "device", ownerId: device.id, portId: output.portId });
      });
    });
    return { ports, ...nets };
  }

  function neutralGroups(project) {
    const graph = connectivity(project, { neutralDomains: true });
    const groups = new Map();
    const seed = (ref, group) => { const key = graph.find(ref); if (!groups.has(key)) groups.set(key, new Set()); groups.get(key).add(group); };
    project.devices.forEach((device) => {
      if (isRcd(device)) seed({ kind: "device", ownerId: device.id, portId: "N-out" }, device.id);
      else if (device.type.startsWith("main-") && deviceTerminals(device).some((port) => port.portId === "N-in")) seed({ kind: "device", ownerId: device.id, portId: "N-in" }, "supply");
    });
    project.busbars.forEach((bar) => {
      if (bar.potential === "PEN") seed({ kind: "busbar", ownerId: bar.id, portId: "1" }, "supply");
      if (bar.potential === "N" && bar.rcdId) seed({ kind: "busbar", ownerId: bar.id, portId: "1" }, bar.rcdId);
      if (bar.potential === "N" && bar.role === "supply") seed({ kind: "busbar", ownerId: bar.id, portId: "1" }, "supply");
    });
    return { graph, groups, groupsFor: (ref) => groups.get(graph.find(ref)) || new Set() };
  }

  function validate(project) {
    const issues = [];
    const add = (code, text, entityId, level = "error") => issues.push({ code, text, entityId, level });
    const occupied = new Map();
    const pairs = new Set();
    project.devices.forEach((device) => {
      C.validate(device).forEach((problem) => add("control-parameters", `${device.label}: ${problem}.`, device.id));
      if (device.phase === "3P" && !/-[34]p$/.test(device.type)) add("device-phase", `${device.label}: для цієї моделі оберіть одну фазу; 3P потребує відповідного апарата.`, device.id);
    });
    project.wires.forEach((wire) => {
      const a = resolveEndpoint(project, wire.from), b = resolveEndpoint(project, wire.to);
      if (!a || !b) { add("missing-terminal", `${wire.label}: клема була видалена або не існує.`, wire.id); return; }
      if (!compatible(project, a, b, wire.potential)) add("potential-mismatch", `${wire.label}: з'єднання ${C.label(a)} ↔ ${C.label(b)} несумісне за потенціалом або напругою.`, wire.id);
      const pair = [endpointKey(a), endpointKey(b)].sort().join("|");
      if (pairs.has(pair)) add("duplicate-wire", "Ці клеми вже з'єднані проводом.", wire.id);
      pairs.add(pair);
      [a, b].forEach((port) => { const key = endpointKey(port); occupied.set(key, (occupied.get(key) || 0) + 1); });
      if (!Number.isFinite(wire.section) || wire.section <= 0 || wire.section > 240) add("section", `${wire.label}: вкажіть коректний переріз проводу.`, wire.id);
      if (!COLORS[wire.color] || (wire.potential === "N" && wire.color !== "blue") || (["PE", "PEN"].includes(wire.potential) && wire.color !== "greenYellow") || (PHASES.includes(wire.potential) && ["blue", "greenYellow"].includes(wire.color))) add("wire-color", `${wire.label}: колір не відповідає призначенню ${wire.potential}.`, wire.id);
      [a, b].filter((port) => port.kind === "busbar").forEach((port) => {
        const bar = project.busbars.find((item) => item.id === port.ownerId);
        if ((bar.minSection && wire.section < bar.minSection) || (bar.maxSection && wire.section > bar.maxSection)) add("bar-section", `${wire.label}: переріз поза заданим діапазоном клем шини ${bar.label}.`, wire.id);
      });
    });
    const combPorts = new Set();
    const combGraph = project.combs.length ? connectivity(project, { isolateProtection: true }) : null;
    const combSources = new Map();
    if (combGraph) project.devices.filter((device) => /^(main-|mcb-|rccb-|rcbo)/.test(device.type)).forEach((device) => {
      deviceTerminals(device).forEach((port) => {
        if (port.side !== "bottom" && !(device.type.startsWith("main-") && port.side === "top")) return;
        const ref = { kind: "device", ownerId: device.id, portId: port.portId }, key = combGraph.find(ref);
        if (!combSources.has(key)) combSources.set(key, new Set());
        combSources.get(key).add(`${device.id}:${port.portId}`);
      });
    });
    project.combs.forEach((comb) => {
      const members = comb.terminals.map((ref) => resolveEndpoint(project, ref));
      if (members.length < 2 || members.some((port) => !port || port.kind !== "device")) { add("comb-members", `${comb.label}: потрібно щонайменше дві існуючі клеми апаратів.`, comb.id); return; }
      const firstDevice = project.devices.find((device) => device.id === members[0].ownerId);
      if (new Set(members.map(endpointKey)).size !== members.length || !["top", "bottom"].includes(members[0].side) || members.some((port) => port.potential !== comb.potential || port.side !== members[0].side || project.devices.find((device) => device.id === port.ownerId).row !== firstDevice.row)) add("comb-potential", `${comb.label}: гребінка має з'єднувати однойменні клеми на одній стороні однієї рейки.`, comb.id);
      if ((combSources.get(combGraph.find(members[0]))?.size || 0) > 1) add("comb-sources", `${comb.label}: гребінка об’єднує виходи різних захисних апаратів або обходить захист. Оберіть апарати однієї групи живлення.`, comb.id);
      members.forEach((port) => { const key = endpointKey(port); if (combPorts.has(key)) add("comb-overlap", `${comb.label}: клема вже зайнята іншою гребінкою.`, comb.id); combPorts.add(key); });
    });
    project.busbars.forEach((bar) => {
      const connected = project.wires.filter((wire) => [wire.from, wire.to].some((port) => port.kind === "busbar" && port.ownerId === bar.id));
      if (!connected.length) add("bar-unconnected", `${bar.label}: немає підключених проводів.`, bar.id, "warning");
      if (!bar.ratedCurrent) add("bar-rating", `${bar.label}: номінальний струм не вказано.`, bar.id, "warning");
      if (bar.rcdId && !project.devices.some((device) => device.id === bar.rcdId && isRcd(device))) add("bar-rcd", `${bar.label}: група ПЗВ не існує.`, bar.id);
      for (let n = 1; n <= bar.terminals; n += 1) if ((occupied.get(endpointKey({ kind: "busbar", ownerId: bar.id, portId: String(n) })) || 0) > 1) add("terminal-overflow", `${bar.label}:${n}: клема вже зайнята. Оберіть інший затискач.`, bar.id);
      if (bar.potential === "PEN" && !(project.board.earthing === "TN-C-S" && project.board.penSplit)) add("pen-profile", `${bar.label}: PEN допускається лише у явно заданій точці поділу TN-C-S.`, bar.id);
    });
    if (project.busbars.filter((bar) => bar.potential === "PEN").length > 1) add("pen-count", "Для цього щита задайте одну точку поділу PEN.", "board");
    const neutral = neutralGroups(project);
    neutral.groups.forEach((groups, root) => { if (groups.size > 1) add("neutral-mix", "Змішані нейтралі різних груп ПЗВ або нейтраль до та після ПЗВ.", root); });
    return issues;
  }

  function cloneProject(project, makeId = id) {
    const copy = normalizeProject(project);
    delete copy.deletedAt;
    const ids = new Map();
    copy.id = makeId();
    [...copy.devices, ...copy.busbars, ...copy.wires, ...copy.combs, ...copy.consumers].forEach((entity) => { const previous = entity.id; entity.id = makeId(); ids.set(previous, entity.id); });
    const remap = (ref) => ({ ...ref, ownerId: ids.get(ref.ownerId) || ref.ownerId });
    copy.wires.forEach((wire) => { wire.from = remap(wire.from); wire.to = remap(wire.to); });
    copy.busbars.forEach((bar) => { if (bar.rcdId) bar.rcdId = ids.get(bar.rcdId) || bar.rcdId; });
    copy.combs.forEach((comb) => { comb.terminals = comb.terminals.map(remap); });
    copy.consumers.forEach((consumer) => { if (consumer.deviceId) consumer.deviceId = ids.get(consumer.deviceId) || consumer.deviceId; });
    for (const level of F.buildingPlans(copy)) {
      level.circuits.forEach((circuit) => { const previous = circuit.id; circuit.id = makeId(); ids.set(previous, circuit.id); });
      level.excludedCircuitIds = level.excludedCircuitIds.map((value) => ids.get(value) || value);
      level.points.forEach((point) => { if (point.circuitId) point.circuitId = ids.get(point.circuitId) || point.circuitId; });
    }
    if (copy.design) {
      if (Array.isArray(copy.design.circuits)) copy.design.circuits.forEach((circuit) => {
        circuit.deviceId = ids.get(circuit.deviceId) || circuit.deviceId;
        circuit.outputId = ids.get(circuit.outputId) || circuit.outputId;
        if (circuit.rcdId) circuit.rcdId = ids.get(circuit.rcdId) || circuit.rcdId;
        if (circuit.rcdBarId) circuit.rcdBarId = ids.get(circuit.rcdBarId) || circuit.rcdBarId;
      });
      if (Array.isArray(copy.design.rcdGroups)) copy.design.rcdGroups.forEach((group) => { group.deviceId = ids.get(group.deviceId) || group.deviceId; group.barId = ids.get(group.barId) || group.barId; });
      if (copy.design.voltageRelayId) copy.design.voltageRelayId = ids.get(copy.design.voltageRelayId) || copy.design.voltageRelayId;
      copy.design.approval = null;
    }
    return copy;
  }

  function removeEntity(project, kind, entityId) {
    const copy = clone(project);
    if (kind === "wire") copy.wires = copy.wires.filter((wire) => wire.id !== entityId);
    if (kind === "comb") copy.combs = copy.combs.filter((comb) => comb.id !== entityId);
    if (["device", "busbar", "consumer"].includes(kind)) {
      const collection = { device: "devices", busbar: "busbars", consumer: "consumers" }[kind];
      copy[collection] = (copy[collection] || []).filter((entity) => entity.id !== entityId);
      copy.wires = copy.wires.filter((wire) => wire.from.ownerId !== entityId && wire.to.ownerId !== entityId);
      copy.combs = copy.combs.map((comb) => ({ ...comb, terminals: comb.terminals.filter((ref) => ref.ownerId !== entityId) })).filter((comb) => comb.terminals.length >= 2);
      if (kind === "device") copy.busbars.forEach((bar) => { if (bar.rcdId === entityId) bar.rcdId = ""; });
      if (kind === "device") copy.consumers.forEach((consumer) => { if (consumer.deviceId === entityId) delete consumer.deviceId; });
      if (kind === "device") for (const level of F.buildingPlans(copy)) level.points.forEach((point) => { if (point.circuitId === entityId) { point.circuitId = ""; level.geometryConfirmed = false; } });
    }
    return copy;
  }

  function wireRows(project) {
    return project.wires.map((wire) => ({ id: wire.id, label: wire.label, potential: wire.potential, from: endpointLabel(project, wire.from), to: endpointLabel(project, wire.to), section: wire.section, color: COLORS[wire.color]?.label || wire.color, material: wire.material, wireType: wire.wireType || "", lengthM: wire.lengthM ?? null, route: wire.points.length ? "Ручний" : "Автоматичний" }));
  }

  function csvContent(rows) {
    const safeCell = (value) => { const text = String(value ?? ""); return /^\s*[=+@\-]/u.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text; };
    return `\ufeff${rows.map((row) => row.map((cell) => `"${safeCell(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n")}`;
  }

  return { control: C, COLORS, DEFAULT_COLORS, PHASES, id, isRcd, normalizeProject, replaceAfdd, consumerTerminals, consumerForDevice, canAddConsumer, addConsumer, renameConsumer, deviceTerminals, allEndpoints, resolveEndpoint, refOf, endpointKey, endpointLabel, sameEndpoint, compatible, preferredPotential, makeWire, reconnectWire, deviceForWire, insertionPairs, insertDeviceInWire, nextLabel, busbarModules, combCandidates, saveComb, validate, connectivity, neutralGroups, cloneProject, removeEntity, wireRows, csvContent, positiveOrNull };
});

;
/* design.js */
/* Typical residential projects and explicitly scoped engineering calculations. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./electrical.js"));
  else root.PanelDesign = factory(root.Electrical);
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";
  const M = typeof module === "object" && module.exports ? require("./mechanical.js") : globalThis.PanelMechanical;
  const F = typeof module === "object" && module.exports ? require("./floor-plan.js") : globalThis.PanelFloorPlan;
  const REVISION = "residential-ua-2026.5";
  const VERIFIED_DATE = "2026-11-18";
  const SOURCES = [
    { id: "dbn", title: "ДБН В.2.5-23:2025", url: "https://e-construction.gov.ua/laws_detail/3874238847093048425", scope: "Пункти 5.11, 7.24–7.26, 8.2–8.7: падіння напруги, дифзахист, ПВДП, КЗ і кабелі.", status: "Чинна картка ЄДЕССБ; вимоги звірено з доступним офіційним текстом." },
    { id: "pue", title: "ПУЕ:2026 · наказ №283 від 05.06.2026", url: "https://sies.gov.ua/zakonodavstvo/nakazi-minenergovugillya", scope: "Заземлення, захист, улаштування та перевірка електроустановок.", status: "Повний текст потребує звірення інженером; автоматична перевірка всіх пунктів не заявляється." },
    { id: "hd", title: "ДСТУ HD / HD 60364", url: "https://www.evs.ee/en/evs-hd-60364-4-41-2017-a12-2019-consolidated", scope: "Захист від ураження, вибір проводок, заземлення, перевірка: частини 4-41, 5-52, 5-54, 6, 7-701.", status: "Посилання на сімейство стандартів; застосовні національні редакції та зміни звіряє інженер." },
    { id: "lighting", title: "HD 60364-4-41:2017 · 411.3.4", url: "https://preview.sist.si/sist-preview/60900/a918c00f3a904c6c97fee89ce52498e7/SIST-HD-60364-4-41-2017.pdf", scope: "Дифзахист ≤30 мА кінцевих кіл освітлення житла в TN/TT. У шаблонах освітлення не залишається без дифзахисту.", status: "Звірено офіційний огляд HD від SIST. Це не окремий профіль Словенії; національні редакції ДСТУ та зміни звіряються для об’єкта." },
    { id: "assembly", title: "IEC 61439-3:2024", url: "https://webstore.iec.ch/en/publication/68496", scope: "Вимоги до побутових розподільних щитів як комплектного виробу.", status: "Перевірено сферу дії. Теплові перевірки й випробування виробу не замінюються компоновкою." },
    { id: "overload", title: "Schneider Electric · захист провідників", url: "https://www.electrical-installation.org/enwiki/Practical_values_for_a_protective_scheme", scope: "Методика перевірки Ib ≤ In ≤ Iz, I2 ≤ 1,45 Iz та вимикальної здатності.", status: "Довідкова методика виробника; не замінює національні норми." },
    { id: "drop", title: "Schneider Electric · падіння напруги", url: "https://www.electrical-installation.org/enwiki/Calculation_of_voltage_drop_in_steady_load_conditions", scope: "Однофазні лінії: ΔU = 2 Ib (R cosφ + X sinφ) L; R у Ω/км, L у км.", status: "Оцінка при R = 23,7/S для Cu, X = 0,08 Ω/км; уточнюється за паспортом кабелю." },
    { id: "curves", title: "Gewiss · характеристики B/C/D", url: "https://www.gewiss.com/ww/en/gwmag/innovation/thermal-magnetic-circuit-breaker-curves", scope: "Для попередньої перевірки прийняті верхні межі миттєвої зони 5/10/20 In.", status: "Характеристику та час вимкнення конкретного виробу необхідно звіряти з його документацією." },
    { id: "thermal", title: "Schneider Electric · термічна стійкість кабелю при КЗ", url: "https://www.electrical-installation.org/enwiki/Verification_of_the_withstand_capabilities_of_cables_under_short-circuit_conditions", scope: "Перевірка пропущеної апаратом енергії I²t ≤ k²S² для часу до 5 с.", status: "k залежить від матеріалу, ізоляції та температур. Потрібна гранична I²t конкретного апарата для очікуваного діапазону струмів КЗ; I2 в амперах — інша величина." },
  ];
  const line = (key, name, kw, options = {}) => ({ key, name, kw, lighting: false, wet: false, lengthM: 20, ...options });
  const common = {
    light: line("light", "Освітлення", .45, { lighting: true, lengthM: 25 }),
    living: line("living", "Розетки вітальні", 1.2),
    bedroom: line("bedroom", "Розетки спальні", 1),
    kitchen: line("kitchen", "Розетки кухні", 1.8),
    bath: line("bath", "Розетки ванної", .8, { wet: true, lengthM: 15 }),
    washer: line("washer", "Пральна машина", 2, { wet: true, lengthM: 15 }),
    fridge: line("fridge", "Холодильник", .3, { lengthM: 15 }),
    boiler: line("boiler", "Бойлер", 1.5, { wet: true, lengthM: 15 }),
  };
  const TEMPLATES = [
    { id: "apartment-1", title: "1-кімнатна квартира", icon: "1", description: "Освітлення, розетки кімнати й кухні, ванна, пральна машина та холодильник.", rows: 2, modules: 24, phases: 1, inputA: 32, circuits: [common.light, common.living, common.kitchen, common.bath, common.washer, common.fridge] },
    { id: "apartment-2", title: "2-кімнатна квартира", icon: "2", description: "Окремі кімнатні групи, кухня, ванна, пральна машина, холодильник і бойлер.", rows: 3, modules: 18, phases: 1, inputA: 40, circuits: [common.light, common.living, common.bedroom, common.kitchen, common.bath, common.washer, common.fridge, common.boiler] },
    { id: "apartment-3", title: "3-кімнатна квартира", icon: "3", description: "Три кімнатні групи, побутові прилади та кондиціонер. Балансування трьох фаз.", rows: 4, modules: 18, phases: 3, inputA: 25, circuits: [common.light, common.living, common.bedroom, line("bedroom2", "Розетки другої спальні", 1), common.kitchen, common.bath, common.washer, common.fridge, common.boiler, line("ac", "Кондиціонер", 1.2)] },
    { id: "house", title: "Приватний будинок", icon: "⌂", description: "Освітлення будинку й двору, житлові групи, кухня, ванна, побутові прилади, насос і господарська лінія.", rows: 4, modules: 24, phases: 3, inputA: 32, circuits: [common.light, line("outdoor", "Освітлення двору", .25, { lighting: true, lengthM: 35 }), common.living, common.bedroom, line("bedroom2", "Розетки інших кімнат", 1), common.kitchen, common.bath, common.washer, common.fridge, common.boiler, line("dishwasher", "Посудомийна машина", 1.8), line("pump", "Насос", .75, { lengthM: 30, powerFactor: .8 }), line("utility", "Господарська лінія", 1.5, { lengthM: 35 })] },
  ];
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const ref = (ownerId, portId, kind = "device") => ({ kind, ownerId, portId });
  const present = (value) => value !== "" && value !== null && value !== undefined && typeof value !== "boolean" && Number.isFinite(Number(value));
  const positive = (value) => present(value) && Number(value) > 0;
  const breaker = (device) => {
    const match = String(device?.rating || "").match(/^\s*([BCD])\s*(\d+(?:[.,]\d+)?)(?=\s*(?:A\b|\/|$))/i);
    const amps = match && Number(match[2].replace(",", "."));
    return match && Number.isFinite(amps) && amps > 0 ? { curve: match[1].toUpperCase(), amps } : null;
  };
  const isBranch = (device) => /^(?:mcb-|rcbo)/.test(device.type);
  const dedicatedKeys = new Set(["fridge", "ac", "outdoor", "dishwasher", "pump", "utility"]);
  function protectionPlan(p) {
    return (p.design?.circuits || []).map((circuit) => {
      const device = p.devices.find((item) => item.id === circuit.deviceId);
      const group = p.devices.find((item) => item.id === circuit.rcdId);
      const grouped = device?.type === "mcb-1p" && ["rccb-2p", "rccb-4p"].includes(group?.type);
      const kind = grouped ? "group" : device?.type.startsWith("rcbo") ? "rcbo" : "unprotected";
      const title = grouped ? `Автомат 1P + ${group.label} (ПЗВ)` : device?.type === "rcbo-afdd" ? "Дифавтомат + ПВДП" : kind === "rcbo" ? "Окремий дифавтомат" : "Дифзахист не призначений";
      let reason;
      if (circuit.wet) reason = "Ванна / душова: потрібен дифзахист; окремий апарат відокремлює це коло від інших. Вимога ПВДП перевіряється окремо.";
      else if (circuit.lighting) reason = "Освітлення потребує дифзахисту. Доцільний окремий дифавтомат, щоб витік у розетковій групі не вимикав світло.";
      else if (circuit.key === "fridge") reason = "Доцільний окремий дифавтомат, щоб витік у розетках інших кімнат не вимикав холодильник. Це вибір для незалежності живлення.";
      else if (["pump", "outdoor", "utility"].includes(circuit.key)) reason = "Доцільний окремий дифавтомат для зовнішньої або господарської лінії. Умови встановлення слід уточнити; її витік не повинен вимикати внутрішні кола.";
      else if (["ac", "dishwasher"].includes(circuit.key)) reason = "Доцільний окремий дифавтомат для приладу. Тип дифзахисту для електроніки чи інвертора слід звірити з паспортом.";
      else reason = "Для загальних розеток можна використати звичайний автомат 1P під груповим ПЗВ. Спрацювання ПЗВ вимкне всю його групу.";
      if (grouped && (circuit.wet || circuit.lighting || dedicatedKeys.has(circuit.key))) reason = `Зараз коло під спільним ПЗВ. ${reason}`;
      return { deviceId: circuit.deviceId, name: device?.name || "Коло без апарата", kind, title, reason, grouped };
    });
  }
  const current = (kw, voltage = 230, powerFactor = 1, diversity = 1) => Number(kw) * 1000 * Number(diversity) / (Number(voltage) * Number(powerFactor));
  function voltageDrop(amps, lengthM, section, powerFactor = 1) {
    const sin = Math.sqrt(Math.max(0, 1 - powerFactor * powerFactor));
    return 2 * amps * (23.7 / section * powerFactor + .08 * sin) * lengthM / 1000;
  }

  const thermalCapacity = (section, k) => positive(section) && positive(k) ? (Number(section) * Number(k)) ** 2 : null;
  function clearCableEvidence(record, feeder = false) {
    if (!record) return;
    record[feeder ? "feederIzA" : "izA"] = null;
    if (!feeder) { record.cableSource = ""; record.minFaultA = null; }
    record.shortCircuitK = null; record.letThroughA2s = null; record.shortCircuitTimeS = null; record.shortCircuitSource = "";
  }
  // Called by both editors. Drawing dimensions and electrical evidence must not drift apart.
  function updateDevice(p, deviceId, changes) {
    const device = p.devices.find((item) => item.id === deviceId);
    if (!device) return;
    const record = p.design?.circuits?.find((item) => item.deviceId === deviceId);
    const supply = p.design?.supply, feeder = device.type.startsWith("main-");
    const changed = (key) => Object.hasOwn(changes, key) && String(changes[key] ?? "") !== String(device[key] ?? "");
    const cableChanged = changed("cable"), ratingChanged = changed("rating") || changed("type"), phaseChanged = changed("phase");
    const oldSection = Number(device.cable);
    if (cableChanged) {
      // Only dedicated consumer leads matching the previous size follow the cable selection.
      // Shared feeds, intermediate connections and manually different leads stay explicit.
      if (record?.outputKind === "consumer" && positive(changes.cable)) p.wires.forEach((wire) => {
        if (wire.material === "Cu" && Number(wire.section) === oldSection && [wire.from, wire.to].some((end) => end.kind === "consumer" && end.ownerId === record.outputId)) wire.section = Number(changes.cable);
      });
      clearCableEvidence(record);
      if (feeder && supply) { supply.feederSection = positive(changes.cable) ? Number(changes.cable) : null; clearCableEvidence(supply, true); }
    }
    if (ratingChanged || phaseChanged) {
      const evidence = feeder ? supply : record;
      if (evidence) { evidence.i2A = null; evidence.icnA = null; evidence.letThroughA2s = null; evidence.shortCircuitTimeS = null; evidence.shortCircuitSource = ""; if (!feeder) evidence.minFaultA = null; }
      (p.design?.rcdGroups || []).filter((group) => feeder || group.deviceId === deviceId).forEach((group) => { group.conditionalIccA = null; group.coordinationSource = ""; });
    }
    Object.assign(device, changes);
    if (supply) supply.dataConfirmed = false;
    return device;
  }
  function updateSupply(p, key, value) {
    const supply = p.design?.supply;
    if (!supply) return;
    const changed = String(supply[key] ?? "") !== String(value ?? "");
    if (changed && key === "feederSection") {
      const incoming = p.devices.find((device) => device.type.startsWith("main-"));
      if (incoming) updateDevice(p, incoming.id, { cable: String(value ?? "") });
      clearCableEvidence(supply, true);
    }
    if (changed && key === "installationMethod") {
      clearCableEvidence(supply, true);
      (p.design.circuits || []).forEach((record) => clearCableEvidence(record));
    }
    if (changed && key === "maxIccA") [supply, ...(p.design.circuits || [])].forEach((record) => { record.letThroughA2s = null; record.shortCircuitTimeS = null; record.shortCircuitSource = ""; });
    supply[key] = value;
    if (key === "earthing" && ["TN-S", "TN-C-S", "TT"].includes(value)) p.board.earthing = value;
    supply.dataConfirmed = key === "dataConfirmed" ? value === true : false;
    if (key === "dataConfirmed" && value === true) p.design.revision = REVISION;
  }
  function circuitLeads(p, device, record, physical) {
    const live = ref(device.id, "L-out");
    return p.wires.filter((wire) => (wire.potential === device.phase && E.resolveEndpoint(p, wire.from) && physical.find(live) === physical.find(wire.from)) || record.outputId && [wire.from, wire.to].some((end) => end.kind === (record.outputKind === "consumer" ? "consumer" : "device") && end.ownerId === record.outputId));
  }
  function invalidateWireEvidence(p, wire, changed) {
    if (!p.design) return;
    const cableChanged = Number(wire.section) !== Number(changed.section) || wire.material !== changed.material;
    if (!cableChanged && wire.lengthM === changed.lengthM && wire.wireType === changed.wireType) return;
    const physical = E.connectivity(p, { isolateProtection: true });
    const affected = (p.design.circuits || []).filter((record) => {
      const device = p.devices.find((item) => item.id === record.deviceId);
      return device && circuitLeads(p, device, record, physical).some((lead) => lead.id === wire.id);
    });
    const records = affected.length ? affected : [p.design.supply, ...(p.design.circuits || [])];
    records.filter(Boolean).forEach((record) => {
      if (cableChanged || wire.wireType !== changed.wireType) clearCableEvidence(record, record === p.design.supply);
      else { record.minFaultA = null; record.letThroughA2s = null; record.shortCircuitTimeS = null; record.shortCircuitSource = ""; }
    });
    if (p.design.supply) p.design.supply.dataConfirmed = false;
  }

  function createTemplate(templateId, settings = {}) {
    if (settings.profile && settings.profile !== "UA") throw new Error("Наразі доступний лише нормативний профіль України");
    let template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) throw new Error("Невідомий шаблон щита");
    if (settings.circuits) {
      if (!Array.isArray(settings.circuits) || !settings.circuits.length || settings.circuits.length > 21) throw new Error("Автопобудова одного щита підтримує 1–21 кінцеве коло. Об’єднайте групи або розділіть їх між щитами.");
      const keys = new Set();
      const circuits = settings.circuits.map((spec) => {
        if (!spec.key || keys.has(spec.key) || !String(spec.name || "").trim() || !Number.isFinite(Number(spec.kw)) || Number(spec.kw) < 0) throw new Error("Перевірте назви, групи й потужності кіл для автопобудови");
        keys.add(spec.key);
        return { ...spec, name: String(spec.name).slice(0, 100), kw: Number(spec.kw) };
      });
      template = { ...template, rows: 8, modules: 24, circuits };
    }
    const phases = Number(settings.phases ?? template.phases);
    const inputA = Number(settings.inputA ?? template.inputA);
    if (![1, 3].includes(phases) || ![16, 20, 25, 32, 40, 50, 63].includes(inputA)) throw new Error("Перевірте кількість фаз та ввідний номінал");
    const earth = ["TN-S", "TN-C-S", "TT"].includes(settings.earthing) ? settings.earthing : "";
    const now = new Date().toISOString();
    const p = { id: E.id(), version: 2, name: template.title, createdAt: now, updatedAt: now, board: { name: `ЩР · ${template.title}`, rows: template.rows, modulesPerRow: template.modules, ip: "IP40", reserve: 20, earthing: earth || "TN-S", penSplit: false }, devices: [], wires: [], busbars: [], combs: [], design: { version: 1, revision: REVISION, templateId, profile: settings.profile === "EU" ? "EU" : "UA", country: String(settings.country || ""), circuits: [], approval: null, supply: { phases, voltage: 230, contractKw: present(settings.contractKw) ? Number(settings.contractKw) : null, earthing: earth, dataConfirmed: false, installationMethod: "", feederIzA: null, i2A: null, upstreamDropPct: null, maxIccA: null, feederSection: inputA > 40 ? 16 : 10, icnA: 6000 }, scope: "Побутові однофазні кола без електроплити, електроопалення, EV, СЕС та резервного живлення. Такі навантаження потребують окремого проєктування." } };
    let row = 0, slot = 0;
    p.consumers = [];
    const add = (type, modules, values) => {
      if (slot + modules > p.board.modulesPerRow) { row += 1; slot = 0; }
      if (row >= p.board.rows) throw new Error("У шаблоні недостатньо місця");
      const device = { id: E.id(), type, geometryId: M.defaultProfile(type), row, slot, name: values.name, label: values.label, rating: values.rating || "", phase: values.phase || "L1", cable: String(values.cable ?? p.design.supply.feederSection), load: values.load ?? 0 };
      p.devices.push(device); slot += modules; return device;
    };
    const incoming = add(phases === 3 ? "main-3p" : "main-2p", phases === 3 ? 3 : 2, { name: "Ввід", label: "QF0", rating: `C${inputA}`, phase: phases === 3 ? "3P" : "L1" });
    const spd = settings.surgeProtection ? add(phases === 3 ? "spd-4p" : "spd-2p", phases === 3 ? 4 : 2, { name: "ПЗІП T2 · уточнити серію", label: "SPD1", rating: "T2", phase: phases === 3 ? "3P" : "L1", cable: 6 }) : null;
    const nBar = { id: E.id(), label: "N0 · ввід", potential: "N", role: "supply", terminals: template.circuits.length + 3, zone: "bottom", row: 0, slot: 0, ratedCurrent: inputA, rcdId: "", minSection: null, maxSection: null };
    const peBar = { ...nBar, id: E.id(), label: "PE0", potential: "PE" };
    p.busbars.push(nBar, peBar);
    const phaseLoads = { L1: 0, L2: 0, L3: 0 };
    template.circuits.forEach((spec, index) => {
      const phase = phases === 1 ? "L1" : E.PHASES.includes(spec.phase) ? spec.phase : [...E.PHASES].sort((a, b) => phaseLoads[a] - phaseLoads[b])[0];
      phaseLoads[phase] += current(spec.kw, 230, spec.powerFactor || 1) || 1;
      const section = spec.section ?? (spec.lighting ? 1.5 : 2.5);
      const protectedDevice = add("rcbo", 2, { name: spec.name, label: `QFD${index + 1}`, rating: spec.rating || `${spec.lighting ? "B10" : "B16"} / A / 30mA`, phase, cable: section, load: spec.kw });
      const output = { id: E.id(), label: `Споживач ${index + 1}`, name: spec.name, phase };
      p.consumers.push(output);
      p.design.circuits.push({ deviceId: protectedDevice.id, outputId: output.id, outputKind: "consumer", key: spec.key, lighting: spec.lighting, wet: spec.wet, lengthM: spec.lengthM, powerFactor: spec.powerFactor || 1, diversity: spec.diversity ?? 1, ...(spec.dedicated ? { dedicated: true } : {}), izA: null, i2A: null, icnA: 6000, minFaultA: null, cableSource: "", rcdType: "A", rcdMa: 30 });
    });
    const connect = (from, to, section) => p.wires.push(E.makeWire(p, from, to, { section }));
    const sourceL = (phase) => ref(incoming.id, phases === 1 ? "L-out" : `${phase}-out`);
    if (phases === 1) connect(ref(incoming.id, "N-out"), ref(nBar.id, "1", "busbar"), p.design.supply.feederSection);
    p.design.circuits.forEach((circuit, index) => {
      const d = p.devices.find((item) => item.id === circuit.deviceId);
      connect(sourceL(d.phase), ref(d.id, "L-in"), p.design.supply.feederSection);
      connect(ref(nBar.id, String(index + 2), "busbar"), ref(d.id, "N-in"), p.design.supply.feederSection);
      connect(ref(d.id, "L-out"), ref(circuit.outputId, "L-in", "consumer"), Number(d.cable));
      connect(ref(d.id, "N-out"), ref(circuit.outputId, "N-in", "consumer"), Number(d.cable));
      connect(ref(peBar.id, String(index + 1), "busbar"), ref(circuit.outputId, "PE-in", "consumer"), Number(d.cable));
    });
    if (spd) {
      (phases === 3 ? E.PHASES : ["L1"]).forEach((phase) => connect(sourceL(phase), ref(spd.id, `${phase}-in`), 6));
      connect(ref(nBar.id, String(template.circuits.length + 2), "busbar"), ref(spd.id, "N-in"), 6);
      connect(ref(peBar.id, String(template.circuits.length + 1), "busbar"), ref(spd.id, "PE"), 6);
    }
    p.design.profile = "UA"; p.design.country = "UA";
    return E.normalizeProject(applyTemplateOptions(p, settings, template));
  }

  function applyTemplateOptions(p, settings, template) {
    const incoming = p.devices.find((d) => d.type.startsWith("main-")), phases = p.design.supply.phases;
    const nBar = p.busbars.find((bar) => bar.potential === "N" && !bar.rcdId);
    const inputA = breaker(incoming).amps, section = p.design.supply.feederSection;
    const sourceL = (phase) => ref(incoming.id, phases === 1 ? "L-out" : `${phase}-out`);
    const connect = (a, b, size = section) => p.wires.push(E.makeWire(p, a, b, { section: size }));
    const scheme = settings.protectionScheme || "balanced";
    if (!["balanced", "group-rcd", "rcbo"].includes(scheme)) throw new Error("Невідомий варіант захисту кіл");
    p.design.protectionScheme = scheme;
    p.design.rcdGroups = [];
    const jobs = [];
    if (scheme === "group-rcd") {
      const dry = p.design.circuits.filter((circuit) => !circuit.wet);
      for (let start = 0; start < dry.length; start += 4) jobs.push({ members: dry.slice(start, start + 4), phase: phases === 1 ? "L1" : "3P", type: phases === 1 ? "rccb-2p" : "rccb-4p" });
    } else if (scheme === "balanced") {
      E.PHASES.forEach((phase) => {
        const sockets = p.design.circuits.filter((circuit) => !circuit.wet && !circuit.lighting && !circuit.dedicated && !dedicatedKeys.has(circuit.key) && p.devices.find((item) => item.id === circuit.deviceId)?.phase === phase);
        for (let start = 0; start < sockets.length; start += 4) {
          const members = sockets.slice(start, start + 4);
          // A lone circuit already has an RCBO; a separate RCCB adds no benefit.
          if (members.length > 1) jobs.push({ members, phase, type: "rccb-2p" });
        }
      });
    }
    if (jobs.length) {
      const groupedIds = new Set(jobs.flatMap((job) => job.members.map((circuit) => circuit.deviceId)));
      p.wires = p.wires.filter((wire) => ![wire.from, wire.to].some((end) => groupedIds.has(end.ownerId) && ["N-in", "N-out", "L-in"].includes(end.portId)));
      p.design.circuits.filter((circuit) => groupedIds.has(circuit.deviceId)).forEach((circuit) => { const d = p.devices.find((item) => item.id === circuit.deviceId); d.type = "mcb-1p"; d.geometryId = M.defaultProfile(d.type); d.label = d.label.replace("QFD", "QF"); d.rating = `${breaker(d).curve}${breaker(d).amps}`; });
      jobs.forEach(({ members, phase, type }) => {
        const index = p.design.rcdGroups.length + 1;
        const rcd = { id: E.id(), type, row: 0, slot: 0, label: `QD${index}`, name: scheme === "balanced" ? `ПЗВ розеток · ${phase}` : `Групове ПЗВ ${index}`, rating: "63A / A / 30mA", phase, cable: String(section), load: 0 };
        rcd.geometryId = M.defaultProfile(rcd.type); p.devices.push(rcd);
        const bar = { ...nBar, id: E.id(), label: `N${index} · ${rcd.label}`, role: "rcd", terminals: members.length + 2, rcdId: rcd.id, ratedCurrent: 63 };
        p.busbars.push(bar);
        p.design.rcdGroups.push({ deviceId: rcd.id, barId: bar.id, conditionalIccA: null, coordinationSource: "" });
        const used = new Set(p.wires.flatMap((wire) => [wire.from, wire.to]).filter((end) => end.ownerId === nBar.id).map((end) => end.portId));
        const free = Array.from({ length: nBar.terminals - 1 }, (_, n) => String(n + 2)).find((port) => !used.has(port));
        if (!free) throw new Error("На ввідній N-шині бракує затискачів");
        (type === "rccb-4p" ? E.PHASES : [phase]).forEach((sourcePhase) => connect(sourceL(sourcePhase), ref(rcd.id, type === "rccb-4p" ? `${sourcePhase}-in` : "L-in")));
        connect(ref(nBar.id, free, "busbar"), ref(rcd.id, "N-in"));
        connect(ref(rcd.id, "N-out"), ref(bar.id, "1", "busbar"));
        members.forEach((circuit, memberIndex) => {
          const d = p.devices.find((item) => item.id === circuit.deviceId);
          circuit.rcdId = rcd.id; circuit.rcdBarId = bar.id;
          connect(ref(rcd.id, type === "rccb-4p" ? `${d.phase}-out` : "L-out"), ref(d.id, "L-in"));
          connect(ref(bar.id, String(memberIndex + 2), "busbar"), ref(circuit.outputId, "N-in", circuit.outputKind || "device"), Number(d.cable));
        });
      });
    }
    if (settings.voltageRelay) {
      if (phases !== 1) throw new Error("Для трифазного контролю потрібна окрема схема реле та силового контактора");
      const relay = { id: E.id(), type: "relay", row: 0, slot: 0, label: "KV1", name: "Контроль напруги", rating: `${inputA}A`, phase: "L1", cable: String(section), load: 0, powerCurrent: inputA, lowerVoltage: 180, upperVoltage: 250, delaySeconds: 5 };
      p.devices.splice(2, 0, relay); p.design.voltageRelayId = relay.id;
      p.wires.forEach((wire) => {
        if (wire.from.ownerId !== incoming.id) return;
        const target = p.devices.find((device) => device.id === wire.to.ownerId);
        if (wire.from.portId === "L-out" && !target?.type.startsWith("spd-")) wire.from = ref(relay.id, "L-out");
        if (wire.from.ownerId === incoming.id && wire.from.portId === "N-out") wire.from = ref(relay.id, "N-out");
      });
      connect(ref(incoming.id, "L-out"), ref(relay.id, "L-in"));
      connect(ref(incoming.id, "N-out"), ref(relay.id, "N-in"));
    }
    const ordered = p.devices.filter((device) => device.type.startsWith("main-") || device.type.startsWith("spd-") || device.id === p.design.voltageRelayId);
    p.design.rcdGroups.forEach((group) => {
      ordered.push(p.devices.find((device) => device.id === group.deviceId));
      p.design.circuits.filter((circuit) => circuit.rcdId === group.deviceId).forEach((circuit) => ordered.push(...[circuit.deviceId, circuit.outputId].map((id) => p.devices.find((device) => device.id === id)).filter(Boolean)));
    });
    p.design.circuits.filter((circuit) => !circuit.rcdId).forEach((circuit) => ordered.push(...[circuit.deviceId, circuit.outputId].map((id) => p.devices.find((device) => device.id === id)).filter(Boolean)));
    p.devices = ordered;
    const widths = { "main-2p": 2, "main-3p": 3, "spd-2p": 2, "spd-4p": 4, rcbo: 2, "rcbo-afdd": 4, "outgoing-terminal": 2, "mcb-1p": 1, "rccb-2p": 2, "rccb-4p": 4, relay: 2 };
    const used = p.devices.reduce((sum, device) => sum + widths[device.type], 0);
    const candidates = M.CAPACITIES.map((item) => ({ rows: item.rows, modules: item.modulesPerRow, capacity: item.capacity })).filter((board) => used <= board.capacity * .8).sort((a, b) => a.capacity - b.capacity || a.rows - b.rows);
    for (const board of candidates) {
      let row = 0, slot = 0;
      const places = p.devices.map((device) => { if (slot + widths[device.type] > board.modules) { row += 1; slot = 0; } const place = { row, slot }; slot += widths[device.type]; return place; });
      if (row >= board.rows) continue;
      p.board = M.withCapacity(p.board, board.rows, board.modules);
      p.devices.forEach((device, index) => Object.assign(device, places[index]));
      return p;
    }
    throw new Error("Для вибраної комплектації потрібен більший корпус");
  }

  function fingerprint(p) {
    // Keep the full canonical snapshot: no hash collisions or reliance on updatedAt.
    const design = copy(p.design || {}); delete design.approval;
    const board = copy(p.board); delete board.fullEnclosureView; delete board.physicalView;
    const levels = F.buildingPlans(p);
    const floorPlan = p.floorPlan ? copy(levels.find(p => !p.levelId || p.levelId === "main") || p.floorPlan) : null;
    if (floorPlan) for (const key of ["circuits", "excludedCircuitIds"]) if (!floorPlan[key]?.length) delete floorPlan[key];
    return JSON.stringify({ board, devices: p.devices, busbars: p.busbars, wires: p.wires, combs: p.combs, ...(p.consumers?.length ? { consumers: p.consumers } : {}), ...(floorPlan ? { floorPlan } : {}), ...(levels.length > 1 ? { floors: levels.filter(p => p.levelId && p.levelId !== "main"), riserLeadM: p.riserLeadM || 0 } : {}), design });
  }
  function approvalCurrent(p) { return Boolean(p.design?.approval && p.design.approval.fingerprint === fingerprint(p)); }
  function approveLayout(p, name) {
    if (!p.design || !String(name || "").trim()) throw new Error("Вкажіть, хто погоджує компоновку");
    if (calculate(p).errors.length) throw new Error("Спершу виправте виявлені помилки проєкту");
    const next = copy(p);
    next.design.approval = { name: String(name).trim(), at: new Date().toISOString(), scope: "layout-only", fingerprint: fingerprint(next) };
    return next;
  }

  function calculate(p) {
    if (!p.design) return null;
    const design = p.design, supply = design.supply || {}, issues = [];
    const floor = p.floorPlan && (design.circuits || []).some((record) => record.lengthOrigin === "floor-plan") ? F.buildingReport(p) : null;
    const add = (level, code, text, entityId = "board") => issues.push({ level, code, text, entityId });
    const pending = (condition, code, text, entityId) => { if (!condition) add("pending", code, text, entityId); };
    const check = (condition, code, text, entityId) => { if (!condition) add("error", code, text, entityId); };
    const checkThermal = (record, section, prefix, entityId = "board") => {
      const capacity = thermalCapacity(section, record.shortCircuitK);
      pending(capacity !== null && Number.isFinite(capacity) && positive(record.letThroughA2s) && positive(record.shortCircuitTimeS) && Boolean(String(record.shortCircuitSource || "").trim()), `${prefix}-thermal-data`, `${entityId === "board" ? "Ввід" : p.devices.find((d) => d.id === entityId)?.label}: потрібні k кабелю, гранична пропущена енергія I²t та час вимкнення з джерелом для очікуваного діапазону КЗ (до 5 с).`, entityId);
      if (positive(record.shortCircuitTimeS)) check(Number(record.shortCircuitTimeS) <= 5, `${prefix}-thermal-time`, "Адіабатична перевірка k²S² підтримує час до 5 с; для більшого часу потрібна окрема модель.", entityId);
      if (capacity !== null && positive(record.letThroughA2s)) check(Number(record.letThroughA2s) <= capacity, `${prefix}-thermal`, `${entityId === "board" ? "Ввід" : p.devices.find((d) => d.id === entityId)?.label}: пропущена енергія I²t перевищує термічну стійкість k²S² кабелю.`, entityId);
      return capacity;
    };
    if (p.floorPlan) {
      const levels=F.buildingPlans(p);
      const pointMissing=levels.some(floorPlan=>{const ids=new Set(F.branches({...p,floorPlan}).map(c=>c.id));return floorPlan.points.some(point=>["socket","light","equipment","junction"].includes(point.type)&&!ids.has(point.circuitId));});
      pending(!levels.some(level=>level.circuits?.length||level.excludedCircuitIds?.length), "floor-circuits-pending", "Кола плану змінені окремо від щита. Перегляньте їх і оновіть щит кнопкою «Перезібрати щит за планом».");
      pending(!pointMissing, "floor-point-circuit", "Є точки без електричного кола. Виберіть наявне або створіть нове коло у властивостях точки.");
    }
    const incoming = p.devices.find((d) => d.type.startsWith("main-"));
    check(p.devices.filter((d) => d.type.startsWith("main-")).length === 1, "incoming-count", "Цей розрахунковий профіль підтримує один ввідний апарат.");
    p.devices.filter((d) => !isBranch(d) && Number(d.load) > 0).forEach((d) => add("error", "unmodelled-load", `${d.label}: навантаження не включене до розрахункових кіл.`, d.id));
    const main = breaker(incoming);
    p.devices.filter((device) => E.control.has(device)).forEach((device) => pending(false, "control-review", `${device.label}: коло керування/живлення потребує окремої перевірки струмів, захисту, котушок і режимів комутації.`, device.id));
    const voltageRelay = p.devices.find((device) => device.id === design.voltageRelayId);
    if (voltageRelay && main) check(Number(voltageRelay.powerCurrent ?? parseFloat(voltageRelay.rating)) >= main.amps, "voltage-relay-current", "Реле напруги не розраховане на номінальний струм вводу; потрібен відповідний апарат або контактор.", voltageRelay.id);
    const voltage = positive(supply.voltage) ? Number(supply.voltage) : 230;
    pending(positive(supply.voltage), "supply-voltage", "Потрібна номінальна фазна напруга вводу.");
    if (positive(supply.voltage)) check(Number(supply.voltage) === 230, "unsupported-voltage", "Цей житловий профіль розрахований на фазну напругу 230 В (230/400 В). Інші системи потребують окремої моделі.");
    const phases = Number(supply.phases);
    const phaseCurrents = { L1: 0, L2: 0, L3: 0 };
    pending(design.revision === REVISION, "revision", "Розрахункові правила оновлено. Перевірте нові зауваження та повторно підтвердьте вихідні дані об’єкта.");
    pending(design.profile === "UA", "national-profile", "Наразі підтримується тільки нормативний профіль України.");
    pending(supply.dataConfirmed === true, "source-data", "Звірте вихідні дані з ТУ, договором, паспортами та обстеженням об’єкта.");
    pending(["TN-S", "TN-C-S", "TT"].includes(supply.earthing), "earthing", "Потрібна фактична система заземлення; TN-C не підтримується цими шаблонами.");
    if (supply.earthing) check(p.board.earthing === supply.earthing && !p.board.penSplit, "earthing-changed", "Шаблон передбачає розділені N і PE на вводі. Зміна заземлення чи поділ PEN у щиті потребує окремої перевірки.");
    pending(supply.earthing !== "TT", "tt-review", "TT потребує окремого розрахунку заземлювача, часу захисного вимкнення та схеми ПЗІП.");
    pending(Boolean(String(supply.installationMethod || "").trim()), "installation", "Вкажіть спосіб прокладання, температуру та групування кабелів.");
    pending(positive(supply.feederIzA), "feeder-iz", "Потрібен допустимий струм ввідного кабелю Iz після поправок.");
    pending(positive(supply.i2A), "incoming-i2", "Потрібен умовний струм вимкнення I2 ввідного апарата з його документації.");
    pending(positive(supply.maxIccA), "fault-max", "Потрібен максимальний очікуваний струм КЗ на шинах щита.");
    pending(present(supply.upstreamDropPct) && Number(supply.upstreamDropPct) >= 0, "upstream-drop", "Потрібне падіння напруги від ВРУ/ГРЩ до цього щита, включно з ввідним кабелем.");
    pending(positive(supply.contractKw), "contract-power", "Потрібна дозволена потужність за договором або ТУ.");
    if (design.revision === REVISION) pending(Boolean(String(supply.surgeAssessment || "").trim()), "surge-review", "Уточніть потребу в ПЗІП, захист на вводі будівлі та координацію ступенів. Відсутність ПЗІП у базовому шаблоні не підтверджує, що він не потрібен.");
    check(Boolean(main) && [1, 3].includes(phases), "incoming", "Перевірте ввідний автомат, його характеристику та кількість фаз.");
    if (incoming && [1, 3].includes(phases)) check(phases === 3 ? incoming.type === "main-3p" || incoming.type === "main-4p" : incoming.type === "main-2p", "incoming-phases", "Ввідний апарат не відповідає кількості фаз вихідних даних.");
    if (main && positive(supply.feederIzA)) check(main.amps <= Number(supply.feederIzA), "feeder-overload", "Номінал ввідного автомата перевищує Iz ввідного кабелю.");
    pending(positive(supply.feederSection), "feeder-section", "Потрібен переріз мідного ввідного кабелю.");
    if (positive(supply.feederSection)) check(Number(supply.feederSection) >= 1.5, "feeder-section", "Цей профіль не підтримує силовий ввід менше 1,5 мм² Cu; одного мінімуму недостатньо для вибору перерізу.");
    if (incoming && positive(supply.feederSection)) check(Number(incoming.cable) === Number(supply.feederSection), "feeder-section-mismatch", "Переріз вводу у властивостях апарата й розрахункових даних відрізняється.");
    if (main && positive(supply.i2A)) check(Number(supply.i2A) >= main.amps, "incoming-i2-range", "I2 ввідного автомата не може бути меншим за його номінальний струм In.");
    if (positive(supply.i2A) && positive(supply.feederIzA)) check(Number(supply.i2A) <= 1.45 * Number(supply.feederIzA), "feeder-conventional", "I2 ввідного апарата перевищує 1,45 Iz ввідного кабелю.");
    if (positive(supply.maxIccA)) check(positive(supply.icnA) && Number(supply.icnA) >= Number(supply.maxIccA), "incoming-icn", "Вимикальна здатність ввідного апарата недостатня або не задана.");
    E.validate(p).filter((issue) => issue.level === "error").forEach((issue) => add("error", issue.code, issue.text, issue.entityId));
    const physical = E.connectivity(p, { isolateProtection: true });
    const nBar = p.busbars.find((bar) => bar.potential === "N" && !bar.rcdId);
    const peBar = p.busbars.find((bar) => bar.potential === "PE");
    const connected = (a, b) => Boolean(a && b && E.resolveEndpoint(p, a) && E.resolveEndpoint(p, b) && physical.find(a) === physical.find(b));
    const feederLeads = incoming ? p.wires.filter((wire) => E.PHASES.includes(wire.potential) && connected(ref(incoming.id, phases === 1 ? "L-out" : `${wire.potential}-out`), wire.from) && ![wire.from, wire.to].some((end) => p.devices.find((d) => d.id === end.ownerId)?.type.startsWith("spd-"))) : [];
    feederLeads.forEach((wire) => {
      check(wire.material === "Cu", "circuit-material", `${wire.label}: профіль вводу підтримує мідні провідники.`, wire.id);
      if (positive(supply.feederSection) && positive(wire.section)) check(Number(wire.section) >= Number(supply.feederSection), "feeder-wire-section", `${wire.label}: провід живлення ${wire.section} мм² менший за переріз вводу ${supply.feederSection} мм². Для іншого перерізу потрібен окремий розрахунок внутрішньої ділянки.`, wire.id);
    });
    checkThermal(supply, Math.min(Number(supply.feederSection), ...feederLeads.filter((wire) => positive(wire.section)).map((wire) => Number(wire.section))), "feeder");
    const records = Array.isArray(design.circuits) ? design.circuits : [];
    const seenCircuits = new Set();
    records.forEach((record) => { check(!seenCircuits.has(record.deviceId), "duplicate-circuit", "Один апарат повторений у розрахункових колах.", record.deviceId); seenCircuits.add(record.deviceId); });
    (design.rcdGroups || []).forEach((group) => {
      const device = p.devices.find((d) => d.id === group.deviceId);
      check(Boolean(device && E.isRcd(device)), "group-rcd-missing", "Групове ПЗВ відсутнє або змінено його тип.", group.deviceId);
      if (device && main) check(parseFloat(device.rating) >= main.amps, "group-rcd-current", `${device.label}: номінал ПЗВ менший за номінал його ввідного захисту.`, device.id);
      pending(positive(group.conditionalIccA) && Boolean(String(group.coordinationSource || "").trim()), "group-rcd-coordination", `${device?.label || "ПЗВ"}: потрібні умовна стійкість до КЗ та підтверджена виробником координація із захистом.`, group.deviceId);
      if (positive(group.conditionalIccA) && positive(supply.maxIccA)) check(Number(group.conditionalIccA) >= Number(supply.maxIccA), "group-rcd-fault", `${device?.label || "ПЗВ"}: умовна стійкість до КЗ недостатня.`, group.deviceId);
    });
    p.devices.filter((d) => d.type === "outgoing-terminal").forEach((d) => check(records.filter((record) => record.outputId === d.id).length <= 1, "shared-terminal", `${d.label}: вихідний клемник не може належати різним розрахунковим колам.`, d.id));
    (p.consumers || []).forEach((consumer) => check(records.filter((record) => record.outputKind === "consumer" && record.outputId === consumer.id).length === 1, "unregistered-consumer", `${consumer.label}: споживач повинен належати одному розрахунковому колу.`, consumer.id));
    records.filter((record) => !p.devices.some((d) => d.id === record.deviceId)).forEach((record) => add("error", "deleted-circuit", "Видалений апарат залишився у розрахунковій відомості. Видаліть коло з відомості або поверніть апарат.", record.deviceId));
    const rows = p.devices.filter(isBranch).map((device) => {
      const spec = records.find((record) => record.deviceId === device.id) || {};
      pending(typeof spec.lighting === "boolean" && typeof spec.wet === "boolean", "circuit-purpose", `${device.label}: визначте призначення кола (освітлення, загальне чи ванна).`, device.id);
      const rating = breaker(device);
      const cos = Number(spec.powerFactor), diversity = Number(spec.diversity), power = Number(device.load), section = Number(device.cable);
      const validLoad = present(device.load) && present(spec.powerFactor) && present(spec.diversity) && typeof device.load !== "boolean" && typeof spec.diversity !== "boolean" && Number.isFinite(power) && power >= 0 && cos >= .7 && cos <= 1 && diversity >= 0 && diversity <= 1;
      check(validLoad, "load-input", `${device.label}: задайте потужність ≥0, cosφ 0,7–1 та коефіцієнт одночасності 0–1.`, device.id);
      const ib = validLoad ? current(power, voltage, cos, diversity) : null;
      check(E.PHASES.includes(device.phase), "branch-phase", `${device.label}: коло повинно бути однофазним L1/L2/L3.`, device.id);
      if (ib !== null && E.PHASES.includes(device.phase)) phaseCurrents[device.phase] += ib;
      check(phases === 3 || device.phase === "L1", "phase-unavailable", `${device.label}: фази ${device.phase} немає на однофазному вводі.`, device.id);
      check(Boolean(rating), "breaker-rating", `${device.label}: номінал повинен починатися з B, C або D та струму, наприклад B16.`, device.id);
      check(positive(section) && section >= 1.5, "minimum-section", `${device.label}: для мідної групової лінії потрібен переріз не менше 1,5 мм²; одного мінімуму недостатньо для вибору кабелю.`, device.id);
      if (ib !== null && rating) check(ib <= rating.amps + 1e-9, "branch-overload", `${device.label}: Ib ${ib.toFixed(2)} A перевищує In ${rating.amps} A.`, device.id);
      pending(positive(spec.izA), "branch-iz", `${device.label}: вкажіть Iz кабелю після поправок.`, device.id);
      pending(Boolean(String(spec.cableSource || "").trim()), "cable-source", `${device.label}: зазначте джерело Iz і умови прокладання.`, device.id);
      if (rating && positive(spec.izA)) check(rating.amps <= Number(spec.izA), "cable-overload", `${device.label}: In перевищує Iz кабелю.`, device.id);
      pending(positive(spec.i2A), "conventional-trip", `${device.label}: потрібен умовний струм вимкнення I2 з документації апарата.`, device.id);
      if (rating && positive(spec.i2A)) check(Number(spec.i2A) >= rating.amps, "conventional-range", `${device.label}: I2 не може бути меншим за номінальний струм In.`, device.id);
      if (positive(spec.i2A) && positive(spec.izA)) check(Number(spec.i2A) <= 1.45 * Number(spec.izA), "conventional-overload", `${device.label}: I2 перевищує 1,45 Iz кабелю.`, device.id);
      if (positive(supply.maxIccA)) check(positive(spec.icnA) && Number(spec.icnA) >= Number(supply.maxIccA), "branch-icn", `${device.label}: вимикальна здатність менша за очікуваний струм КЗ.`, device.id);
      pending(positive(spec.minFaultA), "fault-min", `${device.label}: потрібен мінімальний струм КЗ у кінці кола.`, device.id);
      if (positive(spec.minFaultA) && positive(supply.maxIccA)) check(Number(spec.minFaultA) <= Number(supply.maxIccA), "fault-range", `${device.label}: мінімальний струм КЗ у кінці кола перевищує максимальний струм КЗ на шинах. Перевірте вихідні дані.`, device.id);
      if (rating && positive(spec.minFaultA)) check(Number(spec.minFaultA) >= ({ B: 5, C: 10, D: 20 }[rating.curve] * rating.amps), "magnetic-trip", `${device.label}: не підтверджено верхню межу миттєвого розчеплення; перевірте часову характеристику.`, device.id);
      pending(positive(spec.lengthM), "cable-length", `${device.label}: потрібна довжина кабельної траси.`, device.id);
      if (spec.lengthOrigin === "floor-plan") {
        pending(Boolean(p.floorPlan && F.buildingPlans(p).every(level=>level.geometryConfirmed) && floor && !floor.unassigned.length && !floor.errors.length), "floor-length-review", `${device.label}: довжина взята з плану. Підтвердьте обміри, висоти, прив’язки точок і фактичні маршрути.`, device.id);
        const route = floor?.circuits.find((circuit) => circuit.deviceId === device.id);
        pending(Boolean(route && !route.incomplete && Math.abs(Number(spec.lengthM) - Math.ceil(route.longestPathM * 10) / 10) < 1e-7), "floor-length-stale", `${device.label}: план змінився після передавання довжини. Оновіть довжини з плану або задайте довжину вручну.`, device.id);
      }
      const localDrop = ib !== null && positive(spec.lengthM) && positive(section) ? voltageDrop(ib, Number(spec.lengthM), section, cos) / voltage * 100 : null;
      const totalDrop = localDrop !== null && present(supply.upstreamDropPct) ? localDrop + Number(supply.upstreamDropPct) : null;
      const limit = spec.lighting ? 3 : 5;
      if (totalDrop !== null) check(totalDrop <= limit + 1e-9, "voltage-drop", `${device.label}: сумарне падіння ${totalDrop.toFixed(2)}% перевищує ${limit}% (ДБН 5.11).`, device.id);
      const groupRcd = spec.rcdId && p.devices.find((d) => d.id === spec.rcdId);
      const differential = groupRcd || device;
      const residual = String(differential?.rating || "").match(/(?:^|\W)(\d+(?:[.,]\d+)?)\s*mA\b/i), residualMa = residual ? Number(residual[1].replace(",", ".")) : null;
      check(E.isRcd(differential) && spec.rcdType === "A" && /(?:^|\W)A(?:\W|$)/i.test(differential.rating) && positive(spec.rcdMa) && Number(spec.rcdMa) <= 30 && residualMa > 0 && residualMa <= 30, "rcd", `${device.label}: потрібен власний або груповий дифзахист типу A / ≤30 мА; звірте апарат і його параметри.`, device.id);
      if (spec.wet) check(device.type === "rcbo-afdd", "bath-afdd", `${device.label}: коло позначене «Ванна / душова»; ДБН 7.25 передбачає ПВДП. Базовий шаблон його не додає. Уточніть місце споживача або додайте ПВДП з бібліотеки.`, device.id);
      const outputKind = spec.outputKind === "consumer" ? "consumer" : "device";
      const out = outputKind === "consumer" ? (p.consumers || []).find((item) => item.id === spec.outputId) : p.devices.find((d) => d.id === spec.outputId && d.type === "outgoing-terminal");
      const outputRef = (portId) => out && ref(out.id, portId, outputKind);
      const sourceL = incoming && ref(incoming.id, phases === 1 ? "L-out" : `${device.phase}-out`);
      const sourceN = incoming?.type === "main-3p" ? nBar && ref(nBar.id, "1", "busbar") : incoming && ref(incoming.id, "N-out");
      const groupPhaseIn = groupRcd && ref(groupRcd.id, groupRcd.type.endsWith("-4p") ? `${device.phase}-in` : "L-in");
      const groupPhaseOut = groupRcd && ref(groupRcd.id, groupRcd.type.endsWith("-4p") ? `${device.phase}-out` : "L-out");
      const phaseFed = groupRcd ? connected(sourceL, groupPhaseIn) && connected(groupPhaseOut, ref(device.id, "L-in")) && !connected(sourceL, ref(device.id, "L-in")) : connected(sourceL, ref(device.id, "L-in"));
      const neutralFed = groupRcd ? connected(sourceN, ref(groupRcd.id, "N-in")) && out && connected(ref(groupRcd.id, "N-out"), outputRef("N-in")) && !connected(sourceN, outputRef("N-in")) : connected(sourceN, ref(device.id, "N-in")) && out && connected(ref(device.id, "N-out"), outputRef("N-in")) && !connected(sourceN, ref(device.id, "N-out"));
      const topology = out && phaseFed && neutralFed && connected(ref(device.id, "L-out"), outputRef("L-in")) && peBar && connected(ref(peBar.id, "1", "busbar"), outputRef("PE-in")) && !connected(groupPhaseOut || sourceL, ref(device.id, "L-out"));
      check(Boolean(topology), "circuit-wiring", `${device.label}: перевірте L/N до і після захисту, PE та відсутність обходу апарата.`, device.id);
      const parallel = p.devices.filter(isBranch).some((other) => other.id !== device.id && connected(ref(device.id, "L-out"), ref(other.id, "L-out")));
      check(!parallel, "parallel-outputs", `${device.label}: виходи різних захисних апаратів об’єднані.`, device.id);
      const leads = circuitLeads(p, device, spec, physical);
      leads.forEach((wire) => {
        check(wire.material === "Cu", "circuit-material", `${device.label} / ${wire.label}: розрахунок кола підтримує мідь. Для іншого матеріалу потрібна окрема модель.`, wire.id);
        if (positive(section) && positive(wire.section)) check(Number(wire.section) >= section, "circuit-wire-section", `${device.label} / ${wire.label}: провід ${wire.section} мм² менший за розрахунковий переріз кола ${section} мм². Узгодьте провід і кабель або виконайте окремий розрахунок ділянки.`, wire.id);
      });
      const effectiveSection = Math.min(section, ...leads.filter((wire) => positive(wire.section)).map((wire) => Number(wire.section)));
      const thermalLimitA2s = checkThermal(spec, effectiveSection, "branch", device.id);
      return { device, spec, rating, ib, localDrop, totalDrop, limit, section, effectiveSection, thermalLimitA2s, wireIds: leads.map((wire) => wire.id), topology: Boolean(topology) };
    });
    const powerKw = rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.device.load)) && present(row.spec.diversity) ? Number(row.device.load) * Number(row.spec.diversity) : 0), 0);
    if (positive(supply.contractKw)) check(powerKw <= Number(supply.contractKw) + 1e-9, "contract-overload", "Розрахункова потужність перевищує дозволену за договором/ТУ.");
    if (main) E.PHASES.forEach((phase) => check(phaseCurrents[phase] <= main.amps + 1e-9, "phase-overload", `${phase}: ${phaseCurrents[phase].toFixed(2)} A перевищує ввідний номінал ${main.amps} A.`));
    const errors = issues.filter((issue) => issue.level === "error");
    const missing = issues.filter((issue) => issue.level === "pending");
    return { rows, issues, errors, missing, powerKw, phaseCurrents, calculationPassed: !errors.length && !missing.length, installationReady: false, approvalCurrent: approvalCurrent(p), status: errors.length ? "Потрібні виправлення" : missing.length ? "Потрібні вихідні дані" : "Розрахункові перевірки пройдені", engineeringReview: "Потрібні перевірка повного нормативного профілю, паспортів, селективності, I²t, нагрівання щита, ПЗІП, заземлення й протоколи перевірок. Автоматичний дозвіл до монтажу не видається." };
  }
  return { REVISION, VERIFIED_DATE, SOURCES, TEMPLATES, createTemplate, protectionPlan, calculate, current, voltageDrop, thermalCapacity, updateDevice, updateSupply, invalidateWireEvidence, breaker, isBranch, fingerprint, approvalCurrent, approveLayout };
});

;
/* project-generation.js */
/* Two-way generation operates on copies. Applying and backing up belongs to the UI. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./electrical.js") : root.Electrical, typeof module === "object" && module.exports ? require("./design.js") : root.PanelDesign, typeof module === "object" && module.exports ? require("./floor-plan.js") : root.PanelFloorPlan);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelProjectGeneration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (E, D, F) {
  "use strict";
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const loadPoint = (point) => ["socket", "light", "equipment"].includes(point.type);
  const knownPower = (value) => ["number", "string"].includes(typeof value) && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
  const templateId = (project, fallback) => F.TEMPLATES[fallback] ? fallback : F.TEMPLATES[project.floorPlan?.templateId] ? project.floorPlan.templateId : F.TEMPLATES[project.design?.templateId] ? project.design.templateId : "apartment-2";

  function inspectPlan(project) {
    if (!project.otherFloors?.length) return inspectOnePlan(project);
    const plans=F.buildingPlans(project).map(F.normalize);
    const circuits=[]; let omitted=0;
    for(const plan of plans) {
      if(!plan.points.some(loadPoint)) { omitted+=plan.points.filter(p=>p.type!=="panel").length; continue; }
      const local=inspectOnePlan({...project,floorPlan:plan});
      omitted+=local.omitted;
      const byId=new Map(plan.points.map(p=>[p.id,p]));
      for(const circuit of local.circuits) {
        const sources=new Set(circuit.pointIds.map(id=>byId.get(id).circuitId).filter(Boolean));
        const matching=circuits.filter(c=>[...sources].some(id=>c.sources.has(id)));
        const entry=matching[0]||{...circuit,pointIds:[],sources:new Set()};
        for(const other of matching.slice(1)){ entry.pointIds.push(...other.pointIds); for(const id of other.sources)entry.sources.add(id); circuits.splice(circuits.indexOf(other),1); }
        entry.pointIds.push(...circuit.pointIds); entry.pointCount=entry.pointIds.length; entry.wet ||= circuit.wet;
        entry.dedicated ||= circuit.dedicated; entry.lighting &&= circuit.lighting;
        for(const id of sources) entry.sources.add(id);
        if(!matching.length) circuits.push(entry);
      }
    }
    if(!circuits.length) throw new Error("Додайте хоча б одну розетку, світильник або прилад на плані.");
    const branches=new Map(plans.flatMap(floorPlan=>F.branches({...project,floorPlan})).map(d=>[d.id,d]));
    circuits.forEach((c,i)=>{
      c.key=`plan-${i+1}`; c.merged=c.sources.size>1;
      if(c.merged){const loads=[...c.sources].map(id=>branches.get(id)?.load); c.kw=loads.every(knownPower)?loads.reduce((s,k)=>s+Number(k),0):null;}
      delete c.sources;
    });
    const active=plans.find(p=>(p.levelId||"main")===(project.floorPlan.levelId||"main"));
    return { plan:active,otherFloors:plans.filter(p=>p!==active),circuits,omitted };
}

  function inspectOnePlan(project) {
    if (!project.floorPlan?.rooms?.length) throw new Error("Спочатку побудуйте приміщення та додайте електричні точки.");
    const plan = F.normalize(project.floorPlan), points = plan.points.filter((point) => point.type !== "panel");
    if (!points.some(loadPoint)) throw new Error("Додайте хоча б одну розетку, світильник або прилад на плані.");
    const parent = new Map(points.map((point) => [point.id, point.id]));
    const find = (id) => { if (parent.get(id) !== id) parent.set(id, find(parent.get(id))); return parent.get(id); };
    const join = (a, b) => { if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b)); };
    const buckets = new Map();
    points.forEach((point) => {
      const key = point.circuitId ? `circuit:${point.circuitId}` : point.type === "light" ? "lighting" : point.type === "socket" ? `sockets:${point.roomId}` : null;
      if (key) { if (buckets.has(key)) join(point.id, buckets.get(key)); else buckets.set(key, point.id); }
      if (point.supplyFromId) join(point.id, point.supplyFromId);
      if (point.controlsId) join(point.id, point.controlsId);
    });
    const groups = new Map();
    points.forEach((point) => { const key = find(point.id); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(point); });
    const circuits = [...groups.values()].filter((members) => members.some(loadPoint)).map((members, index) => {
      const loads = members.filter(loadPoint), ids = new Set(members.map((point) => point.circuitId).filter(Boolean));
      const devices = F.branches(project).filter((device) => ids.has(device.id));
      const specs = (project.design?.circuits || []).filter((record) => ids.has(record.deviceId));
      const rooms = plan.rooms.filter((room) => members.some((point) => point.roomId === room.id));
      const lighting = loads.every((point) => point.type === "light"), dedicated = loads.some((point) => point.type === "equipment");
      const previous = devices.length === 1 ? devices[0] : null, spec = specs.length === 1 ? specs[0] : null;
      const cableProfile = previous ? Object.fromEntries(["cableType", "cableColor", "cableCores"].filter((key) => previous[key] != null).map((key) => [key, previous[key]])) : {};
      const name = previous?.name || (loads.length === 1 && dedicated ? loads[0].name : lighting ? "Освітлення" : loads.every((point) => point.type === "socket") ? `Розетки · ${rooms.map((room) => room.name).join(", ")}` : `Змішане коло ${index + 1}`);
      const kw = devices.length && devices.every((device) => knownPower(device.load)) ? devices.reduce((sum, device) => sum + Number(device.load), 0) : null;
      return { key: `plan-${index + 1}`, name, pointIds: members.map((point) => point.id), pointCount: members.length, lighting, dedicated, wet: rooms.some((room) => room.kind === "bath") || specs.some((record) => record.wet), kw, phase: previous?.phase, section: Number(previous?.cable) >= 1.5 ? Number(previous.cable) : lighting ? 1.5 : 2.5, cableProfile, rating: D.breaker(previous || {}) ? `${D.breaker(previous).curve}${D.breaker(previous).amps} / A / 30mA` : undefined, powerFactor: spec?.powerFactor || 1, diversity: spec?.diversity ?? 1, merged: devices.length > 1, lengthM: null };
    });
    return { plan, circuits, omitted: points.filter((point) => !circuits.some((circuit) => circuit.pointIds.includes(point.id))).length };
  }

  function rebuildPanel(project, options = {}) {
    const analysis = inspectPlan(project), notes = [];
    const circuits = analysis.circuits.map((circuit) => {
      const value = Object.hasOwn(options.loads || {}, circuit.key) ? options.loads[circuit.key] : circuit.kw;
      if (value !== null && value !== "" && !knownPower(value)) throw new Error(`${circuit.name}: задайте потужність ≥0 або залиште поле порожнім.`);
      return { ...circuit, kw: value === null || value === "" ? null : Number(value) };
    });
    const phases = Number(options.phases ?? project.design?.supply?.phases ?? (project.devices.some((device) => /^main-[34]p$/.test(device.type)) ? 3 : 1));
    const incoming = project.devices.find((device) => /^main-/.test(device.type));
    const incomingAmps = D.breaker(incoming || {})?.amps;
    const inputA = Number(options.inputA ?? ([16, 20, 25, 32, 40, 50, 63].includes(incomingAmps) ? incomingAmps : 40));
    let next = D.createTemplate(templateId(project), { phases, inputA, earthing: options.earthing ?? project.design?.supply?.earthing ?? "", protectionScheme: options.protectionScheme || project.design?.protectionScheme || "balanced", voltageRelay: options.voltageRelay ?? Boolean(project.design?.voltageRelayId), surgeProtection: options.surgeProtection ?? project.devices.some((device) => device.type.startsWith("spd-")), circuits: circuits.map((circuit) => ({ ...circuit, kw: circuit.kw ?? 0 })) });
    next.id = project.id; next.name = project.name; next.createdAt = project.createdAt; next.board.name = project.board.name;
    next.design.templateId = "from-floor-plan";
    next.design.generatedFrom = "floor-plan";
    next.design.supply.contractKw = project.design?.supply?.contractKw ?? null;
    next.floorPlan = analysis.plan;
    const assignments = new Map();
    circuits.forEach((circuit) => {
      const record = next.design.circuits.find((item) => item.key === circuit.key), device = next.devices.find((item) => item.id === record.deviceId);
      device.load = circuit.kw; // Unknown power stays unknown; 0 is an explicitly entered value.
      Object.assign(device, circuit.cableProfile);
      circuit.pointIds.forEach((id) => assignments.set(id, device.id));
    });
    if (analysis.otherFloors) next.otherFloors=analysis.otherFloors;
    if (project.riserLeadM!=null) next.riserLeadM=project.riserLeadM;
    if (project.wireEndAllowanceMm!=null) next.wireEndAllowanceMm=project.wireEndAllowanceMm;
    if (project.purchase) next.purchase=copy(project.purchase);
    for(const level of F.buildingPlans(next)){
      const usedCircuits=new Set(level.points.filter(p=>assignments.has(p.id)).map(p=>p.circuitId));
      level.circuits=level.circuits.filter(c=>!usedCircuits.has(c.id));
      const pending=new Set(level.circuits.map(c=>c.id));
      level.points.forEach(p=>{p.circuitId=assignments.get(p.id)||(pending.has(p.circuitId)?p.circuitId:"");});
      level.excludedCircuitIds=[];
    }
    next = F.syncLengths(next);
    next = E.normalizeProject(next);
    if (circuits.some((circuit) => circuit.kw === null)) notes.push("Для кіл без заданої потужності навантаження залишиться невідомим. Уточніть його в «Розрахунках».");
    if (circuits.some((circuit) => circuit.merged)) notes.push("Кола, з’єднані спільною дозою або послідовним кабелем, об’єднано під одним захистом.");
    if (analysis.omitted) notes.push(`${analysis.omitted} точок без споживача залишаться без прив’язки до автомата.`);
    notes.push("Номінали й перерізи — початковий підбір. Потрібно перевірити вихідні дані, навантаження та зауваження в «Розрахунках».");
    const overloads = D.calculate(next).rows.filter((row) => row.ib !== null && row.rating && row.ib > row.rating.amps);
    if (overloads.length) notes.push(`Навантаження перевищує номінал захисту: ${overloads.map((row) => `${row.device.label} (${row.ib.toFixed(1)} A > ${row.rating.amps} A)`).join(", ")}. Розділіть кола або перевірте інший захист і кабель; автоматичне збільшення номіналу не виконується.`);
    const routing = F.buildingReport(next);
    if (routing.errors.length) notes.push(`Не для всіх точок знайдено прохідну трасу (${routing.errors.length} зауважень). Геометрію збережено; перевірте двері та відкриті стіни.`);
    return { project: next, circuits, notes, routing };
  }

  const applianceRules = [
    ["washer", /прал|стір|стир|washer/i, "bath", .6], ["boiler", /бойл|водонагр|boiler/i, "bath", 1.5],
    ["fridge", /холод|fridge/i, "kitchen", .3], ["dishwasher", /посуд|dishwasher/i, "kitchen", .3],
    ["ac", /кондиц|\bac\b/i, "living", 2.2], ["pump", /насос|pump/i, "utility", .6],
  ];
  function buildPlan(project, options = {}) {
    const elsewhere = new Set((project.otherFloors || []).flatMap(p => p.points.filter(loadPoint).map(pt => pt.circuitId)));
    const local = new Set((project.floorPlan?.points || []).map(p => p.circuitId));
    const branches = F.branches(project, { includePlanned: false, includeExcluded: true }).filter(d => !elsewhere.has(d.id) || local.has(d.id));
    if (!branches.length) throw new Error("Додайте до щита хоча б один кінцевий автомат або дифавтомат.");
    const socketRouting = options.socketRouting ?? (["junction", "radial"].includes(project.floorPlan?.socketRouting) ? project.floorPlan.socketRouting : "junction");
    if (!["junction", "radial"].includes(socketRouting)) throw new Error("Оберіть розводку розеток через дозу або окремими кабелями від щита.");
    if (options.socketCounts != null && (typeof options.socketCounts !== "object" || Array.isArray(options.socketCounts))) throw new Error("Перевірте кількість розеток для кожного кола.");
    const existing = Boolean(project.floorPlan?.rooms?.length), keep = existing && options.keepPoints !== false;
    let next = copy(project);
    const notes = [], created = [], rows = [];
    const plan = existing ? F.normalize(project.floorPlan) : F.create(project, templateId(project, options.templateId));
    plan.excludedCircuitIds = [];
    const panel = plan.points.find((point) => point.type === "panel");
    plan.points = keep ? plan.points : [panel];
    const validIds = new Set([...branches.map((device) => device.id), ...plan.circuits.map((circuit) => circuit.id)]);
    plan.points.forEach((point) => { if (point.circuitId && !validIds.has(point.circuitId)) point.circuitId = ""; });
    const arrangement = F.layout(plan), rooms = plan.rooms;
    const roomHints = [["kitchen", /кухн|kitchen/i], ["bath", /ванн|душ|санвуз|bath/i], ["bedroom", /спальн|bedroom/i], ["living", /вітальн|гостин|living/i], ["hall", /коридор|hall/i]];
    const chooseRoom = (kind, name) => rooms.find((room) => room.kind === kind || room.id === kind) || rooms.find((room) => name.toLocaleLowerCase("uk").includes(room.name.toLocaleLowerCase("uk"))) || rooms.find((room) => room.kind === roomHints.find(([, regex]) => regex.test(name))?.[0]) || rooms.find((room) => room.kind === "living") || rooms.find((room) => !["outdoor", "hall"].includes(room.kind)) || rooms[0];
    function add(type, room, device, name, u, v, heightM, extra = {}) {
      const prefix = { socket: "X", light: "EL", switch: "S", equipment: "EP", junction: "Д" }[type];
      let number = 1; while (plan.points.some((point) => point.label === `${prefix}${number}`)) number++;
      const point = { id: E.id(), type, roomId: room.id, label: `${prefix}${number}`, name, u, v, heightM: heightM === null ? null : Math.min(heightM, plan.ceilingHeightM), circuitId: device.id, ...extra };
      const box = arrangement.rooms.find((item) => item.id === room.id);
      let onWall = !["light", "junction"].includes(type);
      const preferred = { x: box.x + u * box.widthM, y: box.y + v * box.depthM };
      try { F.placePoint(plan, point, preferred, onWall); }
      catch { onWall = false; F.placePoint(plan, point, preferred); notes.push(`${room.name}: немає закритої стіни для настінної точки. Уточніть місце монтажу.`); }
      const occupied = plan.points.filter((p) => p.roomId === room.id);
      const position = (p) => ({ x: box.x + p.u * box.widthM, y: box.y + p.v * box.depthM });
      const clearance = (p) => Math.min(Infinity, ...occupied.map((other) => Math.hypot(position(p).x - position(other).x, position(p).y - position(other).y)));
      if (clearance(point) < .25) {
        // Several unnamed breakers may share a room. Keep their symbols separate.
        const candidates = [copy(point)];
        for (let step = 1; step < 10; step++) {
          const f = step / 10;
          const locations = onWall ? [[f, 0], [f, 1], [0, f], [1, f]] : [[f, .3], [f, .5], [f, .7]];
          locations.forEach(([a, b]) => { const candidate = copy(point); F.placePoint(plan, candidate, { x: box.x + a * box.widthM, y: box.y + b * box.depthM }, onWall); candidates.push(candidate); });
        }
        const score = (p) => Math.max(0, .25 - clearance(p)) * 100 + Math.hypot(position(p).x - preferred.x, position(p).y - preferred.y);
        candidates.sort((a, b) => score(a) - score(b)); point.u = candidates[0].u; point.v = candidates[0].v;
        if (clearance(point) < .25) notes.push(`${room.name}: точки розташовані щільно. Уточніть їх розміщення вручну.`);
      }
      plan.points.push(point); created.push(point.id); return point;
    }
    const lightingBranches = branches.filter((device) => {
      const spec = project.design?.circuits?.find((record) => record.deviceId === device.id);
      return spec?.lighting || /освіт|світл|освещ|свет|light/i.test(`${spec?.key || ""} ${device.name}`);
    });
    branches.forEach((device) => {
      const retained = plan.points.filter((point) => point.circuitId === device.id && loadPoint(point));
      const before = created.length, spec = project.design?.circuits?.find((record) => record.deviceId === device.id);
      const consumer = E.consumerForDevice(project, device.id);
      const name = consumer?.name || device.name, key = spec?.key || "";
      let socketCount = null, socketEditable = false;
      if (!retained.length) {
        const appliance = applianceRules.find(([code, regex]) => key === code || regex.test(name));
        if (lightingBranches.includes(device)) {
          const matched = rooms.filter((room) => key === room.id || name.toLocaleLowerCase("uk").includes(room.name.toLocaleLowerCase("uk")));
          let targetRooms = matched.length ? matched : rooms.filter((room) => room.kind !== "outdoor" && (lightingBranches.length === 1 || rooms.filter((r) => r.kind !== "outdoor").indexOf(room) % lightingBranches.length === lightingBranches.indexOf(device)));
          if (!targetRooms.length) targetRooms = [chooseRoom(key, name)];
          targetRooms.forEach((room) => {
            const lamp = add("light", room, device, `${name} · ${room.name}`, .5, .5, null);
            add("switch", room, device, `Вимикач · ${room.name}`, .65, room.row === "top" ? 1 : 0, .9, { controlsId: lamp.id });
          });
        } else if (appliance) {
          const [code, , kind, height] = appliance;
          add("equipment", chooseRoom(kind, name), device, name, .25 + (branches.indexOf(device) % 4) * .17, 0, height, { appliance: code });
        } else if (spec?.dedicated) {
          add("equipment", chooseRoom(spec.wet ? "bath" : key, name), device, name, .5, 0, .3);
        } else {
          const room = chooseRoom(key, name);
          const singular = /(?:^|[^а-яіїєґ])розетка(?:$|[^а-яіїєґ])|\bsocket\b|\boutlet\b/i.test(name);
          const group = /розетки|розеток|розеткова|розеточ|\bsockets\b|\boutlets\b/i.test(name) || ["living", "bedroom", "bedroom2", "kitchen", "bath", "utility"].includes(key);
          socketCount = Number(options.socketCounts?.[device.id] ?? (singular || !group ? 1 : 3));
          if (!Number.isInteger(socketCount) || socketCount < 1 || socketCount > 498) throw new Error(`${device.label}: задайте 1–498 розеток у межах загального ліміту плану 500 точок.`);
          socketEditable = true;
          const locations = [[0, .3], [.3, 0], [1, .7]];
          for (let i = 0; i < socketCount; i++) { const [u, v] = locations[i % locations.length]; add("socket", room, device, `${name} · розетка`, u, v, room.kind === "kitchen" ? 1.1 : .3); }
        }
      }
      rows.push({ deviceId: device.id, label: device.label, name, added: created.length - before, retained: plan.points.filter((point) => point.circuitId === device.id && !created.includes(point.id)).length, socketCount: socketCount ?? (plan.points.filter((point) => point.type === "socket" && point.circuitId === device.id).length || null), socketEditable, socketRoute: "" });
    });
    let newJunctions = 0, preservedRouting = 0;
    rows.forEach((row) => {
      const sockets = plan.points.filter((point) => point.type === "socket" && point.circuitId === row.deviceId);
      if (!sockets.length) return;
      // Missing supplyFromId denotes the original automatic home run. Explicit
      // panel feeds, chains and boxes are user choices and remain untouched.
      const automatic = sockets.every((point) => !Object.hasOwn(point, "supplyFromId"));
      if (socketRouting === "radial" && automatic) sockets.forEach((point) => { point.supplyFromId = ""; });
      if (socketRouting === "junction" && sockets.length > 1 && automatic) {
        const roomIds = new Set(sockets.map((point) => point.roomId));
        const room = roomIds.size > 1 && rooms.find((room) => room.kind === "hall") || rooms.find((room) => room.id === sockets[0].roomId);
        const device = branches.find((item) => item.id === row.deviceId);
        const box = add("junction", room, device, `Доза · ${row.name}`, .7, .2, null, { mounting: "ceiling" });
        sockets.forEach((point) => { point.supplyFromId = box.id; });
        row.added++; newJunctions++;
      } else if (socketRouting === "junction" && sockets.length > 1 && !automatic) preservedRouting++;
      const sources = sockets.map((point) => F.sourceFor(plan, point));
      const sharedBox = sources[0]?.type === "junction" && sources.every((source) => source?.id === sources[0].id);
      row.socketRoute = sharedBox ? `Через ${sources[0].label}: 1 підвід · розеток: ${sockets.length}` : sources.every((source) => source?.type === "panel") ? `Від щита · кабелів: ${sockets.length}` : "Збережена проводка користувача";
    });
    plan.socketRouting = socketRouting;
    if (created.length) plan.geometryConfirmed = false;
    next.floorPlan = F.normalize(plan);
    if (next.floorPlan.syncWithCircuits) next = F.syncLengths(next);
    if (next.design) { next.design.approval = null; next.design.supply.dataConfirmed = false; }
    const result = F.calculate(next);
    if (result.unassigned.length) notes.push(`${result.unassigned.length} збережених точок не мають чинного автомата. Призначте коло у властивостях точки.`);
    if (result.errors.length) notes.push(`Для частини точок немає прохідної траси або правильного джерела (${result.errors.length} зауважень). Перевірте зв’язки та двері на плані.`);
    if (newJunctions) notes.push(`Додано доз: ${newJunctions}. Кілька розеток одного кола отримали спільний підвід та окремі відгалуження. Кола різних автоматів не об’єднуються.`);
    if (preservedRouting) notes.push("Наявні явні підключення збережено. Для повної зміни схеми розеток зніміть прапорець збереження точок перед автопобудовою.");
    if (newJunctions) notes.push("Дози розміщено умовно на стелі; перевірте доступність для обслуговування, спосіб з’єднання та параметри кабелів і захисту.");
    notes.push("Розташування та кількість нових точок — редагований ескіз. Уточніть їх, висоти й фактичні маршрути на об’єкті.");
    return { project: next, rows, added: created.length, kept: plan.points.length - created.length, notes: [...new Set(notes)], routing: result, existingGeometry: existing, socketRouting, newJunctions };
  }
  return { inspectPlan, rebuildPanel, buildPlan, loadPoint };
});

;
/* snapshot-codec.js */
(function(root){
  "use strict";
  const utf=new TextEncoder(), decode=new TextDecoder();
  function base64(bytes) { let s="";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,""); }
  async function transform(bytes,stream,limit) {
    const reader=new Blob([bytes]).stream().pipeThrough(stream).getReader(), chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error("Size limit");}chunks.push(value);}
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
  }
  async function encode(data){const plain=utf.encode(JSON.stringify(data));if(plain.length>512000)throw Error("Size limit");return typeof CompressionStream==="function"?"z."+base64(await transform(plain,new CompressionStream("gzip"),512000)):"j."+base64(plain);}
  async function unpack(value){if(typeof value!=="string"||value.length>700000||!/^[zj]\.[A-Za-z0-9_-]+$/.test(value))throw Error("Invalid snapshot");const raw=Uint8Array.from(atob(value.slice(2).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));const bytes=value.startsWith("z.")?await transform(raw,new DecompressionStream("gzip"),512000):raw;if(bytes.length>512000)throw Error("Size limit");return JSON.parse(decode.decode(bytes));}
  if(typeof module==="object"&&module.exports)module.exports={encode,unpack};else root.PanelSnapshotCodec={encode,unpack};
})(globalThis);

;
/* workbook.js */
/* Minimal, offline OOXML workbook. User-entered strings are always inline text. */
(function(root){
  "use strict";
  const encoder=new TextEncoder();
  const xml=v=>String(v??"").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const crcTable=Uint32Array.from({length:256},(_,n)=>{let v=n;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0);return v>>>0;});
  function pack(entries){
    const local=[],central=[]; let offset=0,centralSize=0;
    const header=n=>{const bytes=new Uint8Array(n);return {bytes,view:new DataView(bytes.buffer)};};
    const u16=(h,i,v)=>h.view.setUint16(i,v,true),u32=(h,i,v)=>h.view.setUint32(i,v>>>0,true);
    for(const [name,content] of entries){
      const path=encoder.encode(name),data=encoder.encode(content);
      let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);crc^=0xffffffff;
      const l=header(30),c=header(46); u32(l,0,0x04034b50);u16(l,4,20);u16(l,6,0x800);u16(l,12,33);u32(l,14,crc);u32(l,18,data.length);u32(l,22,data.length);u16(l,26,path.length);
      u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x800);u16(c,14,33);u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,path.length);u32(c,42,offset);
      local.push(l.bytes,path,data);central.push(c.bytes,path);offset+=30+path.length+data.length;centralSize+=46+path.length;
    }
    const end=header(22);u32(end,0,0x06054b50);u16(end,8,entries.length);u16(end,10,entries.length);u32(end,12,centralSize);u32(end,16,offset);
    const out=new Uint8Array(offset+centralSize+22); let i=0;for(const chunk of [...local,...central,end.bytes]){out.set(chunk,i);i+=chunk.length;}return out;
  }
  function workbook(sheets){
    const main="http://schemas.openxmlformats.org/spreadsheetml/2006/main",rels="http://schemas.openxmlformats.org/package/2006/relationships",office="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const listing=sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("");
    const entries=[
      ["[Content_Types].xml",`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels",`<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml",`<workbook xmlns="${main}" xmlns:r="${office}"><sheets>${listing}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`],
      ["xl/_rels/workbook.xml.rels",`<Relationships xmlns="${rels}">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${office}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}</Relationships>`]
    ];
    sheets.forEach((s,i)=>{
      const rows=s.rows.map((row,r)=>`<row r="${r+1}">${row.map((v,k)=>{
        if(v==null||v==="")return "";
        const ref=String.fromCharCode(65+k)+(r+1);
        if(typeof v==="number"&&Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
        if(typeof v==="object"&&v.formula)return `<c r="${ref}"><f>${xml(v.formula)}</f>${v.value==null?"":`<v>${Number(v.value)}</v>`}</c>`;
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      }).join("")}</row>`).join("");
      const widths=s.widths||[50,14,15,20,22,18,20,18];
      entries.push([`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="${main}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,j)=>`<col min="${j+1}" max="${j+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData></worksheet>`]);
    });
    return pack(entries);
  }
  if(typeof module==="object"&&module.exports)module.exports=workbook;else root.PanelWorkbook=workbook;
})(globalThis);

;
/* installation.js */
(function(root,factory){
  const node=typeof module==="object" && module.exports;
  const api=factory(node?require("./mechanical.js"):root.PanelMechanical,node?require("./electrical.js"):root.Electrical);
  if(node) module.exports=api; else root.PanelInstallation=api;
})(globalThis,function(M,E){
  "use strict";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function layout(project) {
    const board=M.boardGeometry(project.board), ports=new Map(), rectangles=new Map(), bars=M.barDrawingRects(project);
    for(const d of project.devices) rectangles.set(d.id,M.deviceRect(d,project.board));
    for(const b of bars) rectangles.set(b.id,b);
    for(const p of E.allEndpoints(project)) {
      const r=rectangles.get(p.ownerId); if(!r) continue;
      let x=r.x+r.width*(p.x??.5), y=r.y+(p.side==="top"?0:p.side==="bottom"?r.height:r.height*(p.y??.5));
      if(p.kind==="busbar"){
        const bar=project.busbars.find(v=>v.id===p.ownerId), t=(Number(p.portId)-.5)/bar.terminals;
        const vertical=["left","right"].includes(bar.zone);
        x=r.x+r.width*(vertical?.5:.09+.82*t); y=r.y+r.height*(vertical?.09+.82*t:.55);
      }
      ports.set(E.endpointKey(p),{x,y,port:p});
    }
    return {board, ports, rectangles, leftMm:M.assemblyViewport(project).leftMm, scale:42/board.pitchMm};
  }
  function wirePath(wire, scene, i=0) {
    if(!wire.from||!wire.to) return [];
    const a=scene.ports.get(E.endpointKey(wire.from)), b=scene.ports.get(E.endpointKey(wire.to));
    if(!a||!b) return [];
    const distance=(15+i%5*3)/scene.scale;
    function stub(p){const s=p.port.side;return {x:p.x+(s==="left"?-distance:s==="right"?distance:0), y:p.y+(s==="bottom"?distance:s==="top"?-distance:0)};}
    const start=stub(a), end=stub(b); let via;
    if(wire.points?.length) via=wire.points.map(p=>({x:p.x/scene.scale,y:p.y/scene.scale}));
    else if(a.port.side===b.port.side&&Math.abs(a.y-b.y)<3.5) via=[{x:b.x,y:start.y}];
    else {const x=scene.leftMm+(5+i%5*3)/scene.scale; via=[{x,y:start.y},{x,y:end.y}];}
    const path=[a];
    for(const p of [start,...via,end,b]){
      const last=path.at(-1); if(last.x!==p.x&&last.y!==p.y) path.push({x:p.x,y:last.y});
      if(last.x!==p.x||last.y!==p.y) path.push(p);
    }
    return path;
  }
  function lengths(project) {
    const scene=layout(project), allowance=Number(project.wireEndAllowanceMm??50);
    return new Map(project.wires.map((wire,index)=>{
      if(wire.lengthM>0) return [wire.id,{m:Number(wire.lengthM),origin:"measured"}];
      const path=wirePath(wire,scene,index);
      if(path.length<2) return [wire.id,{m:null,origin:"unknown"}];
      let mm=2*allowance;
      path.slice(1).forEach((p,i)=>{ mm+=Math.abs(p.x-path[i].x)+Math.abs(p.y-path[i].y); });
      return [wire.id,{m:Math.ceil(mm)/1000,origin:"estimated"}];
    }));
  }
  const origins={measured:"Заміряно",estimated:"Розраховано",unknown:"Не визначено"};
  const catalogueSource="https://library.e.abb.com/public/93def4864247415aa823de9fb426d564/2CKA000001A1837_Planungshandbuch_ABB.pdf";
  function catalogue(device) {
    const geometry=device.geometryId;
    const text=String(device.rating).trim().toUpperCase().replace(/\s/g,"");
    const residual=/^(B(?:6|10|13|16)|C(?:6|8|10|16))\/A\/30MA$/.exec(text);
    if(geometry==="abb-ds201" && device.type==="rcbo" && residual) {
      const variant=residual[1], amps=variant.slice(1).padStart(2,"0");
      return {model:"ABB DS201 "+variant+" A30",sku:"2CSR255180R1"+amps+(variant[0]==="B"?"5":"4"),source:"https://new.abb.com/docs/librariesprovider54/publikationer/2024-01-18-abb-minikatalog-11122023.pdf"};
    }
    const rcd=/^(25|40|63)A\/A\/30MA$/.exec(text);
    if(["abb-f202","abb-f204"].includes(geometry) && rcd && geometry.endsWith(device.type==="rccb-2p"?"202":device.type==="rccb-4p"?"204":"_")) {
      const poles=geometry.slice(-3), amps=rcd[1];
      return {model:"ABB F"+poles+" A-"+amps+"/0.03",sku:"2CSF"+poles+"101R1"+amps+"0",source:"https://new.abb.com/docs/librariesprovider78/chile-documentos/orig-abb_data_sheet_diferenciales_v1_digital.pdf"};
    }
    if(geometry!=="abb-s201"||device.type!=="mcb-1p"||device.dimensions) return null;
    const digits={B10:"0105",C10:"0104",B16:"0165",C16:"0164",B20:"0205",C20:"0204"};
    const rating=String(device.rating).trim().toUpperCase();
    return Object.hasOwn(digits,rating)?{model:`ABB S201-${rating}`,sku:"2CDS251001R"+digits[rating],source:catalogueSource}:null;
  }
  function materials(project, quantities, plans, types) {
    const rows=new Map();
    const add=(parts,name,unit,qty,sku="",incomplete=false)=>{
      const key=JSON.stringify(parts);
      if(!rows.has(key)) rows.set(key,{key,name,unit,qty:null,sku,incomplete:false});
      const r=rows.get(key);
      if(qty!=null) r.qty=Math.round(((r.qty??0)+qty)*1000)/1000;
      r.incomplete ||= incomplete||qty==null;
    };
    for(const d of project.devices) {
      const model=M.dimensions(d), chosen=catalogue(d);
      add(["device",d.type,d.rating,d.geometryId||"",d.dimensions?.model||"",d.article||""],`${chosen?.model||model.model} · ${types[d.type]||d.type} · ${d.rating}`,"шт.",1,d.article||"");
    }
    for(const b of project.busbars) add(["bar",b.potential,b.terminals,b.ratedCurrent||"",b.dimensions?.model||""],`${b.label} · ${b.terminals} · ${b.potential}`,"шт.",1);
    for(const c of project.combs) {
      const slots=c.terminals.map(ref=>project.devices.find(d=>d.id===ref.ownerId)).filter(Boolean);
      const span=slots.length?Math.max(...slots.map(d=>d.slot+M.modulesFor(d,project.board)))-Math.min(...slots.map(d=>d.slot)):0;
      add(["comb",c.potential,c.terminals.length,span,c.ratedCurrent||"",c.contactType||"",c.series||""],`${c.label} · ${c.potential} · ${c.terminals.length}/${span} · ${c.series||c.contactType||""}`,"шт.",1);
    }
    if(project.board.enclosureId||project.board.dimensions) add(["enclosure",M.boardGeometry(project.board).model],M.boardGeometry(project.board).model,"шт.",1);
    for(const plan of plans) for(const p of plan.points) {
      if(p.type==="panel") continue;
      const name=p.type==="equipment"?p.name:types[p.type]||p.type;
      add(["point",p.type,p.type==="equipment"?p.name:"",p.type==="junction"?p.mounting:""],name+(p.type==="junction"?(p.mounting==="ceiling"?" · Стеля":" · Стіна"):""),"шт.",1);
    }
    for(const row of [...quantities.cables,...quantities.wires]){
      const title=row.type||(row.kind==="wire"?"Монтажний провід":"Кабель");
      add([row.kind,row.type,row.color,row.cores,row.section,row.material],`${title} · ${row.cores}×${row.section??"?"} мм² · ${row.material} · ${E.COLORS[row.color]?.label||row.color||"—"}`,"м",row.missing===row.circuits?null:row.purchaseM,"",row.missing>0);
    }
    return [...rows.values()].map(row=>{
      const info=project.purchase?.[row.key]||{};
      return {...row,sku:String(info.sku||row.sku),supplier:String(info.supplier||""),price:typeof info.price==="number"&&info.price>=0&&Number.isFinite(info.price)?info.price:null,status:["ordered","received"].includes(info.status)?info.status:"needed"};
    });
  }
  function labelStrips(project) {
    const b=M.boardGeometry(project.board);
    return Array.from({length:project.board.rows},(_,i)=>{
      const items=project.devices.filter(d=>d.row===i).map(d=>({slot:d.slot,modules:M.modulesFor(d,project.board),label:d.label,name:d.printName||d.name}));
      for(const bar of project.busbars.filter(v=>v.zone==="din"&&v.row===i)) items.push({slot:bar.slot,modules:M.barModules(bar,project.board),label:bar.label,name:bar.potential});
      return {pitch:b.pitchMm,modules:project.board.modulesPerRow,items:items.sort((a,b)=>a.slot-b.slot)};
    });
  }
  return {esc,layout,wirePath,lengths,origins,catalogue,materials,labelStrips};
});

;
/* cable-report.js */
/* Quantities of complete floor routes and explicitly measured panel wires. */
(function (root, factory) {
  const F = typeof module === "object" && module.exports ? require("./floor-plan.js") : root.PanelFloorPlan;
  const api = factory(F, typeof module === "object" && module.exports ? require("./installation.js") : root.PanelInstallation);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelCableReport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (F, I) {
  "use strict";
  const round = (n) => Math.round(n * 1000) / 1000;
  const positive = (value) => ["number", "string"].includes(typeof value) && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
  const text = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 100) : "";
  const keyText = (value) => text(value).normalize("NFKC").toLocaleLowerCase("uk-UA");
  function profile(device) {
    const cores = Number(device.cableCores);
    return { type: text(device.cableType), color: text(device.cableColor), cores: Number.isInteger(cores) && cores >= 1 && cores <= 24 ? cores : device.phase === "3P" ? 5 : 3, section: positive(device.cable) ? Number(device.cable) : null, material: "Cu" };
  }
  function group(items) {
    const groups = new Map();
    for (const item of items) {
      const key = JSON.stringify([item.kind, keyText(item.type), item.color, item.cores, item.section, item.material]);
      if (!groups.has(key)) groups.set(key, { ...item, labels: [], circuits: 0, segments: 0, installedM: 0, reserveM: 0, purchaseM: 0, missing: 0 });
      const row = groups.get(key); row.labels.push(item.label); if (item.estimated) row.estimatedCount = (row.estimatedCount || 0) + 1; row.circuits++;
      if (!item.complete) { row.missing++; continue; }
      row.segments += item.segments; row.installedM = round(row.installedM + item.installedM); row.reserveM = round(row.reserveM + item.reserveM); row.purchaseM = round(row.purchaseM + item.purchaseM);
    }
    return [...groups.values()].sort((a, b) => a.type.localeCompare(b.type, "uk") || a.color.localeCompare(b.color, "uk") || a.cores - b.cores || (a.section || 0) - (b.section || 0) || a.material.localeCompare(b.material));
  }
  function totals(rows) {
    return rows.reduce((sum, row) => ({ circuits: sum.circuits + row.circuits, segments: sum.segments + row.segments, installedM: round(sum.installedM + row.installedM), reserveM: round(sum.reserveM + row.reserveM), purchaseM: round(sum.purchaseM + row.purchaseM), missing: sum.missing + row.missing }), { circuits: 0, segments: 0, installedM: 0, reserveM: 0, purchaseM: 0, missing: 0 });
  }
  function calculate(project, floorReport) {
    const floor = floorReport === undefined ? project.floorPlan ? F.buildingReport(project) : null : floorReport;
    const devices = new Map(F.branches(project, { includeExcluded: true }).map((d) => [d.id, d]));
    const cables = group((floor?.circuits || []).map((c) => ({ kind: "cable", ...profile(devices.get(c.deviceId) || {}), label: c.label, segments: c.legs.length, installedM: c.installedM, reserveM: c.reserveM, purchaseM: c.purchaseM, complete: !c.incomplete })));
    const measured = project.wires?.length ? I.lengths(project) : new Map();
    const wires = group((project.wires || []).map((w) => {
      const result = positive(w.lengthM) ? {m:Number(w.lengthM),origin:"measured"} : measured.get(w.id);
      return {kind:"wire",type:text(w.wireType),color:text(w.color),cores:1,section:positive(w.section)?Number(w.section):null,material:w.material==="Al"?"Al":"Cu",label:w.label,segments:1,installedM:result?.m||0,reserveM:0,purchaseM:result?.m||0,complete:result?.m>0,estimated:result?.origin==="estimated"};
    }));
    return { hasPlan: Boolean(floor), cables, cableTotals: totals(cables), wires, wireTotals: totals(wires), profiles: F.branches(project).map((d) => ({ id: d.id, label: d.label, name: d.name, ...profile(d) })) };
  }
  function csvRows(report, colors = {}, { includeWires = true } = {}) {
    const rows = [], color = (key) => colors[key]?.label || key || "Не задано";
    const add = (title, groups, sum) => {
      rows.push([], [title], ["Тип", "Колір", "Жил", "Переріз, мм²", "Матеріал", "Кола / проводи", "Відомих ділянок", "Без запасу, м", "Запас, м", "Закупівля, м", "Неповних позицій"]);
      groups.forEach((g) => { const unknown = g.missing > 0 && g.missing === g.circuits; rows.push([g.type || "Тип не задано", color(g.color), g.cores, g.section ?? "", g.material, g.labels.join(", "), g.segments, unknown ? "" : g.installedM, unknown ? "" : g.reserveM, unknown ? "" : g.purchaseM, g.missing]); });
      const unknown = sum.missing > 0 && sum.missing === sum.circuits;
      rows.push([unknown ? "Довжини не визначені" : sum.missing ? "Підсумок відомих довжин" : "Разом", "", "", "", "", sum.circuits, sum.segments, unknown ? "" : sum.installedM, unknown ? "" : sum.reserveM, unknown ? "" : sum.purchaseM, sum.missing]);
    };
    if (report.hasPlan) add("Кабелі приміщень за типом, кольором, жилами та перерізом", report.cables, report.cableTotals);
    else rows.push([], ["Кабелі приміщень", "Побудуйте план для розрахунку метражу"]);
    if (includeWires) add("Монтажні проводи · заміри й оцінки", report.wires, report.wireTotals);
    return rows;
  }
  return { profile, calculate, csvRows };
});

;
/* cable-report-ui.js */
const Cables = PanelCableReport;
const cableNumber = (value) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 3 }).format(value);
const cableColorLabel = (value) => E.COLORS[value]?.label || value || "Не задано";
function cableGroupTable(rows, sum, kind) {
  const title = kind === "wire" ? "Монтажні проводи" : "Кабелі приміщень";
  const amount = (row, key) => row.missing === row.circuits ? "—" : `${cableNumber(row[key])} м`;
  const unknown = sum.missing > 0 && sum.missing === sum.circuits;
  const total = (key) => unknown ? "—" : `${cableNumber(sum[key])} м`;
  return `<h3>${title}</h3><div class="floor-table-scroll"><table class="floor-table cable-totals-table"><thead><tr><th>Тип / марка</th><th>Колір</th><th>Жили × мм²</th><th>Матеріал</th><th>Ділянок</th><th>Без запасу</th><th>Запас</th><th>Закупівля</th></tr></thead><tbody>${rows.map((g) => `<tr><td><strong>${escapeHtml(g.type || "Тип не задано")}</strong><small>${escapeHtml(g.labels.join(", "))}${g.estimatedCount ? ` · ≈ ${g.estimatedCount}` : ""}${g.missing ? ` · ${g.missing} без повної довжини` : ""}</small></td><td>${escapeHtml(cableColorLabel(g.color))}</td><td>${g.cores} × ${g.section ?? "?"}</td><td>${g.material}</td><td>${g.segments || "—"}</td><td>${amount(g, "installedM")}</td><td>${kind === "wire" ? "—" : amount(g, "reserveM")}</td><td><strong>${amount(g, "purchaseM")}</strong></td></tr>`).join("") || '<tr><td colspan="8">Немає позицій для підсумовування.</td></tr>'}</tbody><tfoot><tr><th colspan="4">${unknown ? "Довжини не визначені" : sum.missing ? "Підсумок відомих довжин" : "Разом"}</th><td>${sum.segments}</td><td>${total("installedM")}</td><td>${kind === "wire" ? "—" : total("reserveM")}</td><td><strong>${total("purchaseM")}</strong></td></tr></tfoot></table></div>${sum.missing ? `<p class="cable-quantity-note">${sum.missing} ${kind === "wire" ? "проводів без визначеної довжини" : "кіл із неповною трасою"}. Їхній невідомий метраж не включено в підсумок.</p>` : ""}`;
}
function cableSummaryMarkup(report, { includeWires = true, settingsOpen = false } = {}) {
  return `<div class="cable-quantity-summary"><div class="floor-report-heading"><h3>Підсумок кабельних довжин</h3><span>Однакові тип, колір, жили, переріз і матеріал підсумовуються.</span></div>${report.hasPlan ? cableGroupTable(report.cables, report.cableTotals, "cable") : '<p>Побудуйте план приміщень для розрахунку довжин зовнішніх кабелів. <button class="button ghost" type="button" data-cable-open-floor>Відкрити план</button></p>'}<p class="floor-footnote">Без запасу — траса зі спусками та припусками. Закупівля — сума довжин кіл із запасом та округленням вгору до метра. Кольори трас на плані служать для розрізнення кіл; колір кабелю задається окремо.</p>${includeWires && report.wires.length ? cableGroupTable(report.wires, report.wireTotals, "wire") + '<p class="floor-footnote">Для внутрішніх проводів враховані маршрут і припуски. Власний замір має пріоритет.</p>' : ""}${report.profiles.length ? `<details data-cable-settings ${settingsOpen ? "open" : ""}><summary>Параметри кабелів для підсумовування</summary><p>Уточніть марку, зовнішній колір і кількість жил. Переріз задається у властивостях апарата; у розрахунках кіл використовується Cu.</p><div class="floor-table-scroll"><table class="floor-table cable-settings-table"><thead><tr><th>Коло</th><th>Тип / марка кабелю</th><th>Колір оболонки</th><th>Жил</th></tr></thead><tbody>${report.profiles.map((p) => `<tr><td><strong>${escapeHtml(p.label)}</strong> ${escapeHtml(p.name)}</td><td><input aria-label="Тип кабелю ${escapeHtml(p.label)}" data-cable-device="${escapeHtml(p.id)}" data-cable-field="cableType" maxlength="100" value="${escapeHtml(p.type)}" placeholder="Наприклад ВВГнг-LS"/></td><td><select aria-label="Колір кабелю ${escapeHtml(p.label)}" data-cable-device="${escapeHtml(p.id)}" data-cable-field="cableColor"><option value="">Не задано</option>${Object.entries(E.COLORS).map(([key, v]) => `<option value="${key}" ${key === p.color ? "selected" : ""}>${escapeHtml(v.label)}</option>`).join("")}</select></td><td><input type="number" min="1" max="24" step="1" aria-label="Кількість жил ${escapeHtml(p.label)}" data-cable-device="${escapeHtml(p.id)}" data-cable-field="cableCores" value="${p.cores}"/></td></tr>`).join("")}</tbody></table></div></details>` : ""}</div>`;
}
function renderBomCables() {
  const target = $("#bomCableReport"), settingsOpen = target.querySelector("[data-cable-settings]")?.open;
  target.innerHTML = cableSummaryMarkup(Cables.calculate(project), { settingsOpen });
}
function updateCableProfile(event) {
  const input = event.target, field = input.dataset.cableField, device = project.devices.find((d) => d.id === input.dataset.cableDevice) || project.floorPlan?.circuits?.find((d) => d.id === input.dataset.cableDevice);
  if (!device || !["cableType", "cableColor", "cableCores"].includes(field)) return;
  const value = field === "cableCores" ? Number(input.value) : input.value.trim();
  if (field === "cableCores" && (!Number.isInteger(value) || value < 1 || value > 24)) { input.value = Cables.profile(device).cores; toast("Кількість жил має бути цілим числом від 1 до 24.", "error"); return; }
  snapshot(); device[field] = value; persistProject(); renderAll();
}
function initCableReports() {
  ["#floorCableReport", "#bomCableReport"].forEach((selector) => {
    $(selector).addEventListener("change", updateCableProfile);
    $(selector).addEventListener("click", (event) => { if (event.target.closest("[data-cable-open-floor]")) switchView("floor"); });
  });
}

;
/* schematic.js */
/* Read-only single-line projection. Only external phase nets define the tree. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./electrical.js") : root.Electrical);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelSchematic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";
  const WIDTH = 1188, NODE_HEIGHT = 60, STEP = 115;
  const xml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  const fmt = (value) => Number.isFinite(Number(value)) && value !== null && value !== "" ? Number(value).toLocaleString("uk-UA", { maximumFractionDigits: 2 }) : "—";
  const input = (port) => port.portId === "in" || /-in$/.test(port.portId);
  const output = (port) => port.portId === "out" || /-out$/.test(port.portId);
  const power = (port) => E.PHASES.includes(port.potential) && !port.control && (input(port) || output(port));
  const shortType = (node) => {
    const type = node.entity.type;
    if (node.kind === "consumer") return "Споживач";
    if (type.startsWith("main-")) return `${type.match(/(\d)p$/)?.[1] || ""}P · Ввідний автомат`;
    if (type.startsWith("mcb-")) return `${type.match(/(\d)p$/)?.[1] || ""}P · Автомат`;
    if (type.startsWith("rccb-")) return `${type.match(/(\d)p$/)?.[1] || ""}P · ПЗВ`;
    return ({ rcbo: "1P+N · Дифавтомат", "rcbo-afdd": "1P+N · Дифавтомат + ПВДП", relay: "Реле напруги", meter: "Лічильник", "power-supply": "Блок живлення", "control-transformer": "Трансформатор", "fuse-holder": "Запобіжник", terminal: "Клема", "outgoing-terminal": "Клемник", "motor-protection-3p": "Захист двигуна" })[type] || (type.startsWith("spd-") ? "ПЗІП" : type.includes("contactor") ? "Контактор" : node.entity.name);
  };

  function build(project, { maxColumns = 6 } = {}) {
    const ports = E.allEndpoints(project).filter(power), parent = new Map(ports.map((port) => [E.endpointKey(port), E.endpointKey(port)]));
    const find = (ref) => { let key = E.endpointKey(ref); while (parent.has(key) && parent.get(key) !== key) key = parent.get(key); return key; };
    const join = (a, b) => { if (parent.has(E.endpointKey(a)) && parent.has(E.endpointKey(b))) parent.set(find(a), find(b)); };
    const used = new Set(), phaseWires = new Set();
    project.wires.forEach((wire) => {
      const a = E.resolveEndpoint(project, wire.from), b = E.resolveEndpoint(project, wire.to);
      if (!a || !b || !power(a) || !power(b) || !E.compatible(project, a, b, wire.potential)) return;
      join(a, b); used.add(a.ownerId); used.add(b.ownerId); phaseWires.add(wire.id);
    });
    project.combs.forEach((comb) => {
      const members = comb.terminals.map((ref) => E.resolveEndpoint(project, ref)).filter((port) => port && power(port) && port.potential === comb.potential);
      members.slice(1).forEach((port) => join(members[0], port));
      members.forEach((port) => used.add(port.ownerId));
    });
    const nodes = new Map();
    [...project.devices.map((entity) => ({ entity, kind: "device" })), ...(project.consumers || []).map((entity) => ({ entity, kind: "consumer" }))].forEach(({ entity, kind }, order) => {
      if (used.has(entity.id)) nodes.set(entity.id, { id: entity.id, kind, entity, order, children: [], parents: [] });
    });
    const nets = new Map(), edgeMap = new Map(), warnings = [];
    ports.forEach((port) => { const key = find(port); if (!nets.has(key)) nets.set(key, []); nets.get(key).push(port); });
    nets.forEach((members) => {
      const sources = members.filter((port) => output(port) && nodes.has(port.ownerId));
      const targets = members.filter((port) => input(port) && nodes.has(port.ownerId));
      if (new Set(sources.map((port) => port.ownerId)).size > 1) warnings.push("На одній фазній мережі з’єднано кілька виходів. Перевірте відомість з’єднань.");
      sources.forEach((a) => targets.forEach((b) => {
        if (a.ownerId === b.ownerId) return;
        const key = JSON.stringify([a.ownerId, b.ownerId]);
        if (!edgeMap.has(key)) edgeMap.set(key, { from: a.ownerId, to: b.ownerId, potentials: [] });
        const edge = edgeMap.get(key);
        if (!edge.potentials.includes(a.potential)) edge.potentials.push(a.potential);
      }));
    });
    const edges = [...edgeMap.values()];
    edges.forEach((edge) => { nodes.get(edge.from).children.push(edge.to); nodes.get(edge.to).parents.push(edge.from); });
    const order = (a, b) => nodes.get(a).order - nodes.get(b).order;
    nodes.forEach((node) => { node.children.sort(order); node.parents.sort(order); });
    const roots = [...nodes.values()].filter((node) => !node.parents.length).sort((a, b) => Number(b.entity.type?.startsWith("main-")) - Number(a.entity.type?.startsWith("main-")) || a.order - b.order);
    const remaining = new Map([...nodes].map(([id, node]) => [id, node.parents.length]));
    const queue = roots.map((node) => node.id), ranks = new Map(queue.map((id) => [id, 0]));
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      nodes.get(id).children.forEach((child) => {
        ranks.set(child, Math.max(ranks.get(child) || 0, ranks.get(id) + 1));
        remaining.set(child, remaining.get(child) - 1);
        if (!remaining.get(child)) queue.push(child);
      });
    }
    const cycle = queue.length !== nodes.size;
    const network = cycle || [...nodes.values()].some((node) => node.parents.length > 1);
    if (network) warnings.push("Складна топологія: показано всі фактичні силові зв’язки без перетворення на одну групу живлення.");
    const pages = [];
    if (network) {
      let last = Math.max(0, ...ranks.values());
      [...nodes.keys()].filter((id) => remaining.get(id)).forEach((id) => ranks.set(id, ++last));
      pages.push({ ids: [...nodes.keys()], leaves: [...nodes.values()].filter((node) => !node.children.length).map((node) => node.id), ranks: Object.fromEntries(ranks), network: true });
    } else if (nodes.size) {
      const leavesFor = (id) => nodes.get(id).children.length ? nodes.get(id).children.flatMap(leavesFor) : [id];
      const allLeaves = roots.flatMap((node) => leavesFor(node.id));
      const limit = Math.max(2, Math.min(8, Math.floor(Number(maxColumns)) || 6));
      const columns = Math.ceil(allLeaves.length / Math.ceil(allLeaves.length / limit));
      const units = [];
      const collect = (id) => {
        const node = nodes.get(id), leaves = leavesFor(id);
        if (node.entity.type?.startsWith("rccb-") && leaves.length <= columns || !node.children.length) units.push(leaves);
        else node.children.forEach(collect);
      };
      roots.forEach((node) => collect(node.id));
      let leafPage = [];
      const save = () => {
        if (!leafPage.length) return;
        const ids = new Set();
        leafPage.forEach((leaf) => { let id = leaf; while (id && !ids.has(id)) { ids.add(id); id = nodes.get(id).parents[0]; } });
        const pageRanks = new Map([...ids].map((id) => [id, ranks.get(id)]));
        const bottom = Math.max(1, ...allLeaves.map((id) => ranks.get(id)));
        leafPage.forEach((id) => { pageRanks.set(id, bottom); const parentId = nodes.get(id).parents[0]; if (nodes.get(id).kind === "consumer" && parentId && !nodes.get(parentId).entity.type?.startsWith("main-") && nodes.get(parentId).children.every((child) => nodes.get(child).kind === "consumer")) pageRanks.set(parentId, bottom - 1); });
        pages.push({ ids: [...ids], leaves: leafPage, ranks: Object.fromEntries(pageRanks), network: false }); leafPage = [];
      };
      units.forEach((unit) => { if (leafPage.length && leafPage.length + unit.length > columns) save(); leafPage.push(...unit); if (leafPage.length >= columns) save(); });
      save();
    }
    const neutral = E.connectivity(project, { neutralDomains: true });
    const returnName = (node, potential) => {
      const end = E.allEndpoints(project).find((port) => port.ownerId === node.id && port.potential === potential && (input(port) || potential === "PE"));
      if (!end) return "—";
      const net = neutral.find(end), labels = [];
      project.busbars.filter((bar) => [potential, "PEN"].includes(bar.potential) && neutral.find({ kind: "busbar", ownerId: bar.id, portId: "1" }) === net).forEach((bar) => labels.push(bar.label));
      if (!labels.length && potential === "N") project.devices.filter(E.isRcd).forEach((device) => { const port = E.deviceTerminals(device).find((p) => p.potential === "N" && output(p)); if (port && neutral.find({ kind: "device", ownerId: device.id, portId: port.portId }) === net) labels.push(device.label); });
      return labels.join(", ") || "не простежено";
    };
    const circuits = new Map();
    [...new Set(pages.flatMap((page) => page.leaves))].forEach((id, index) => {
      const leaf = nodes.get(id), protection = leaf.kind === "consumer" ? nodes.get(leaf.parents[0]) : leaf;
      const spec = project.design?.circuits?.find((item) => item.outputId === id || item.deviceId === id) || {};
      const wires = project.wires.filter((wire) => [wire.from, wire.to].some((end) => end.ownerId === id));
      const conductors = [...new Set(wires.map((wire) => `${wire.material} ${fmt(wire.section)} мм²`))];
      circuits.set(id, { id, index: index + 1, label: protection?.entity.label || leaf.entity.label, name: leaf.entity.name, phase: leaf.entity.phase || "—", powerKw: protection?.entity.load ?? null, conductors: conductors.join(" / ") || "—", lengthM: spec.lengthM ?? null, lengthEstimated: spec.lengthOrigin === "floor-plan" && !project.floorPlan?.geometryConfirmed, neutral: returnName(leaf, "N"), earth: returnName(leaf, "PE"), lighting: Boolean(spec.lighting) });
    });
    const omitted = project.devices.filter((device) => device.type !== "blank" && !nodes.has(device.id));
    const auxiliaryWires = project.wires.filter((wire) => !phaseWires.has(wire.id) && !["N", "PE", "PEN"].includes(wire.potential));
    return { project, nodes, edges, pages, circuits, roots: roots.map((node) => node.id), warnings: [...new Set(warnings)], omitted, auxiliaryWires };
  }

  function scopeCss(css) {
    return css.replace(/(^|})([^{}]+)\{/g, (_, end, selectors) => end + selectors.split(",").map((selector) => selector.trim() === ".sld-svg" ? ".sld-svg" : `.sld-svg ${selector.trim()}`).join(",") + "{");
  }

  function wrap(value, chars = 22) {
    const words = String(value ?? "").split(/\s+/), lines = [];
    let line = "";
    words.forEach((word) => {
      while (word.length > chars) { if (line) { lines.push(line); line = ""; } lines.push(word.slice(0, chars)); word = word.slice(chars); }
      if (line && `${line} ${word}`.length > chars) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
    });
    if (line) lines.push(line);
    return lines.length ? lines : ["—"];
  }
  function text(x, y, value, cls = "", anchor = "start", chars = 100, lineHeight = 15) {
    return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${wrap(value, chars).map((line, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${xml(line)}</tspan>`).join("")}</text>`;
  }
  function glyph(node, circuit) {
    const t = node.entity.type || "", switchPath = '<path d="M0 0V17M0 43V60M0 43L15 20"/><circle cx="0" cy="17" r="2"/><circle cx="0" cy="43" r="2"/>';
    if (node.kind === "consumer") return circuit?.lighting ? '<path d="M0 0V18"/><circle cx="0" cy="29" r="11"/><path d="M-8 21L8 37M8 21L-8 37"/>' : '<path d="M0 0V25"/><path d="M-8 25H8L0 39Z" fill="currentColor"/>';
    if (/^(main-|mcb-|rcbo|rccb-)/.test(t)) return `${switchPath}${/^rccb-|^rcbo/.test(t) ? '<circle cx="0" cy="7" r="8"/><text x="-20" y="11" class="glyph-tag" text-anchor="middle">Δ</text>' : ""}${!t.startsWith("rccb-") ? '<path d="M-12 27H-7V36H-12"/>' : ""}${t === "rcbo-afdd" ? '<path d="M-21 45L-15 37L-18 44L-12 42"/>' : ""}`;
    if (t.startsWith("spd-")) return '<path d="M0 0V15M0 45V55"/><rect x="-10" y="15" width="20" height="30"/><path d="M3 19L-4 32H3L-3 41"/>' + (circuit && !["—", "не простежено"].includes(circuit.earth) ? '<path d="M-10 55H10M-6 59H6M-2 63H2"/>' : '<circle cx="0" cy="58" r="3"/><text x="15" y="61" class="glyph-tag">PE?</text>');
    if (["terminal", "outgoing-terminal"].includes(t)) return '<path d="M0 0V25M0 35V60"/><circle cx="0" cy="30" r="5"/>';
    if (t === "fuse-holder") return '<path d="M0 0V60"/><rect x="-6" y="17" width="12" height="26"/>';
    if (t.includes("contactor")) return switchPath + '<path d="M-19 25H-10M-19 36H-10" stroke-dasharray="2 2"/>';
    if (t === "meter") return '<path d="M0 0V12M0 48V60"/><circle cx="0" cy="30" r="18"/><text x="0" y="34" class="glyph-tag" text-anchor="middle">Wh</text>';
    const tag = t === "relay" ? "U" : t === "power-supply" ? "~/=" : t === "control-transformer" ? "~/~" : "";
    return `<path d="M0 0V13M0 47V60"/><rect x="-15" y="13" width="30" height="34"/>${text(0, 35, tag, "glyph-tag", "middle")}`;
  }

  function layout(model, pageIndex) {
    const page = model.pages[pageIndex], positions = new Map(), ids = new Set(page.ids);
    const gap = (WIDTH - 250) / Math.max(1, page.leaves.length);
    if (page.network) {
      const rows = new Map();
      page.ids.forEach((id) => { const rank = page.ranks[id]; if (!rows.has(rank)) rows.set(rank, []); rows.get(rank).push(id); });
      rows.forEach((row, rank) => row.forEach((id, i) => positions.set(id, { x: 110 + (i + .5) * (WIDTH - 220) / row.length, y: 140 + rank * STEP })));
    } else {
      page.leaves.forEach((id, i) => positions.set(id, { x: 180 + (i + .5) * gap, left: 180 + (i + .5) * gap, right: 180 + (i + .5) * gap, y: 140 + page.ranks[id] * STEP }));
      const place = (id) => {
        if (positions.has(id)) return positions.get(id);
        const children = model.nodes.get(id).children.filter((child) => ids.has(child)).map(place);
        const left = Math.min(...children.map((child) => child.left)), right = Math.max(...children.map((child) => child.right));
        const x = (left + right) / 2;
        const point = { x, left, right, y: 140 + page.ranks[id] * STEP }; positions.set(id, point); return point;
      };
      model.roots.filter((id) => ids.has(id)).forEach(place);
    }
    const tableY = Math.max(250, ...[...positions.values()].map((point) => point.y + NODE_HEIGHT + 14));
    return { page, positions, ids, gap, tableY };
  }

  function renderSvg(model, pageIndex = 0, { monochrome = false, date = "" } = {}) {
    if (!model.pages[pageIndex]) return "";
    const { page, positions, ids, gap, tableY } = layout(model, pageIndex), project = model.project;
    const labelWidth = 110, tableWidth = WIDTH - 140, colWidth = (tableWidth - labelWidth) / Math.max(1, page.leaves.length);
    const maxNameLines = Math.max(1, ...page.leaves.map((id) => wrap(model.circuits.get(id).name, Math.floor((colWidth - 14) / 6)).length));
    const rows = [
      { title: "Коло", height: 26, value: (c) => c.label, cls: "table-strong" },
      { title: "Призначення", height: Math.max(43, maxNameLines * 15 + 17), value: (c) => c.name },
      { title: "Фаза / P", height: 26, value: (c) => `${c.phase} · ${fmt(c.powerKw)} кВт` },
      { title: "Провід", height: 34, value: (c) => c.conductors },
      { title: "Довжина", height: 25, value: (c) => c.lengthM == null ? "—" : `${c.lengthEstimated ? "≈ " : ""}${fmt(c.lengthM)} м` },
      { title: "N / PE", height: 42, value: (c) => `N: ${c.neutral} | PE: ${c.earth}` },
    ];
    const tableHeight = page.network ? 0 : rows.reduce((sum, row) => sum + row.height, 0);
    const footerExtra = (wrap(project.name, 90).length - 1) * 15;
    const height = Math.max(840, tableY + tableHeight + 105 + footerExtra);
    const css = `.sld-svg{stroke:none}text{stroke:none;font-family:Arial,"Segoe UI",sans-serif;fill:#263d4b;font-size:12px}path,circle,rect,line{vector-effect:non-scaling-stroke}.wire{fill:none;stroke:#334f5d;stroke-width:1.55;stroke-linecap:square;stroke-linejoin:round}.junction{fill:#334f5d}.symbol{color:#283f4c;fill:none;stroke:currentColor;stroke-width:1.55}.symbol rect,.symbol circle{fill:white}.symbol text{stroke:none}.node-label,.table-strong{font-weight:700;font-size:13px}.node-kind{font-size:10px;fill:#667b87}.rating{font-size:12px}.glyph-tag{font-size:10px;fill:currentColor}.muted{fill:#7c8c96;font-size:10px}.page-title{font-size:23px;font-weight:700}.eyebrow{font-size:9px;letter-spacing:1.5px;fill:#6e838d}.page-code{font-size:13px;font-weight:700}.node-main{color:#243a48}.node-rcd{color:#17808d}.node-rcbo{color:#a66a20}.node-rcd .symbol{color:#17808d}.node-rcd .node-label{fill:#17808d}.node-rcbo .symbol{color:#a66a20}.node-rcbo .node-label{fill:#a66a20}.group-hint{fill:#17808d;font-size:9px}.table-text{font-size:12px}.stamp{font-size:10px}.status{font-size:10px;fill:#8b713a}.cross-link{stroke:#b46443;stroke-dasharray:5 4}${monochrome ? "text,.muted,.group-hint,.node-kind,.eyebrow,.status{fill:#18232b}.symbol,.node-rcd,.node-rcbo{color:#18232b}.wire{stroke:#18232b}.junction{fill:#18232b}.node-rcd .symbol,.node-rcbo .symbol{color:#18232b}.node-rcd .node-label,.node-rcbo .node-label{fill:#18232b}" : ""}`;
    const style = `<style>${scopeCss(css)}</style>`;
    const header = `<rect width="${WIDTH}" height="${height}" fill="white"/><rect x="25" y="25" width="${WIDTH - 50}" height="${height - 50}" fill="none" stroke="#b6c4cb" stroke-width="1"/>${text(52, 50, "ELECTROPANEL / ЕЛЕКТРОТЕХНІЧНИЙ ПРОЄКТ", "eyebrow")}${text(52, 81, "Однолінійна схема", "page-title")}${text(52, 103, project.board.name, "muted", "start", 100)}${text(WIDTH - 52, 57, `ЕП · ${String(pageIndex + 1).padStart(2, "0")}`, "page-code", "end")}${text(WIDTH - 52, 80, `${project.design?.supply?.phases || (project.devices.some((d) => d.type === "main-3p" || d.type === "main-4p") ? 3 : 1)} ф. · ${project.design?.supply?.phases === 3 || project.devices.some((d) => d.type === "main-3p" || d.type === "main-4p") ? "230/400" : "230"} В · ${project.board.earthing}`, "muted", "end")}<path d="M52 116H${WIDTH - 52}" stroke="#d7e0e4" fill="none"/>`;
    const links = [];
    if (page.network) model.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)).forEach((edge, i) => {
      const a = positions.get(edge.from), b = positions.get(edge.to), mid = a.y + NODE_HEIGHT + 18 + i % 4 * 7;
      links.push(`<path class="wire cross-link" d="M${a.x} ${a.y + NODE_HEIGHT}V${mid}H${b.x}V${b.y}"/>`);
    });
    else page.ids.forEach((id) => {
      const node = model.nodes.get(id), children = node.children.filter((child) => ids.has(child));
      if (!children.length) return;
      const a = positions.get(id), end = children.map((child) => positions.get(child)), busY = a.y + NODE_HEIGHT + 23;
      const min = Math.min(a.x, ...end.map((p) => p.x)), max = Math.max(a.x, ...end.map((p) => p.x));
      links.push(`<path class="wire" d="M${a.x} ${a.y + NODE_HEIGHT}V${busY}M${min} ${busY}H${max}"/>`);
      end.forEach((b) => links.push(`<path class="wire" d="M${b.x} ${busY}V${b.y}"/>${end.length > 1 ? `<circle class="junction" cx="${b.x}" cy="${busY}" r="2.7"/>` : ""}`));
      if (node.entity.type?.startsWith("rccb-")) {
        const bars = project.busbars.filter((bar) => bar.rcdId === id).map((bar) => bar.label).join(", ");
        links.push(text(min, busY + 14, bars ? `N: ${bars}` : `Група ${node.entity.label}`, "group-hint", "start", 55, 11));
      }
    });
    const symbols = page.ids.map((id) => {
      const node = model.nodes.get(id), p = positions.get(id), type = node.entity.type || "", c = model.circuits.get(id);
      const cls = type.startsWith("rccb-") ? "node-rcd" : type.startsWith("rcbo") ? "node-rcbo" : "node-main";
      const labelChars = Math.max(13, Math.floor(Math.min(gap * .66, 190) / 6));
      const control = node.kind === "device" ? ` role="button" tabindex="0" data-diagram-device="${xml(id)}" aria-label="Відкрити ${xml(node.entity.label)} · ${xml(node.entity.name)}"` : "";
      const label = node.kind === "consumer" ? "" : `${text(p.x + 22, p.y + 17, node.entity.label, "node-label")}${text(p.x + 22, p.y + 33, node.entity.rating, "rating", "start", labelChars, 12)}${text(p.x + 22, p.y + 62, shortType(node), "node-kind", "start", labelChars, 12)}`;
      const source = !node.parents.length ? type.startsWith("main-") ? `<path class="wire" d="M${p.x} ${p.y - 14}V${p.y}"/>${text(p.x - 10, p.y - 19, "Ввід", "muted", "end")}` : text(p.x, p.y - 12, "Живлення не простежено", "status", "middle", 29) : "";
      return `<g class="sld-node ${cls}" data-node-id="${xml(id)}"${control}><title>${xml(`${node.entity.label} · ${node.entity.name} · ${node.entity.rating || ""}`)}</title><rect x="${p.x - 27}" y="${p.y - 5}" width="${Math.min(gap * .9, 220)}" height="78" fill="transparent" stroke="none"/>${source}<g transform="translate(${p.x} ${p.y})" class="symbol">${glyph(node, c)}</g>${label}</g>`;
    }).join("");
    let table = "";
    if (!page.network) {
      let y = tableY;
      table += `<rect x="70" y="${tableY}" width="${tableWidth}" height="${tableHeight}" fill="none" stroke="#c5d2d9"/>`;
      rows.forEach((row, index) => {
        table += `<rect x="70" y="${y}" width="${labelWidth}" height="${row.height}" fill="#f2f6f8"/>${index ? `<path d="M70 ${y}H${WIDTH - 70}" fill="none" stroke="#d4dfe4"/>` : ""}${text(81, y + 17, row.title, "muted")}`;
        page.leaves.forEach((id, col) => {
          const x = 70 + labelWidth + col * colWidth;
          table += `${text(x + colWidth / 2, y + 17, row.value(model.circuits.get(id)), row.cls || "table-text", "middle", Math.max(12, Math.floor((colWidth - 14) / 6)), 15)}${index === 0 ? `<path d="M${x} ${y}V${tableY + tableHeight}" stroke="#d4dfe4"/>` : ""}`;
        });
        y += row.height;
      });
    }
    const bars = project.busbars.map((bar) => `${bar.label} (${bar.potential})`).join(" · ");
    const footerY = height - 76 - footerExtra;
    const footer = `${text(52, footerY - 17, bars || "N/PE-шини не задані", "muted", "start", 155, 12)}<path d="M52 ${footerY}H${WIDTH - 52}" stroke="#b6c4cb"/>${text(52, footerY + 19, project.name, "stamp", "start", 90)}${text(52, footerY + 37 + footerExtra, "За проводами й гребінками · N/PE наведено у відомості · чернетка", "muted")}${text(WIDTH - 52, footerY + 19, `Аркуш ${pageIndex + 1} / ${model.pages.length}`, "page-code", "end")}${text(WIDTH - 52, footerY + 37 + footerExtra, date, "muted", "end")}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="${(height / WIDTH * 297).toFixed(2)}mm" viewBox="0 0 ${WIDTH} ${height}" class="sld-svg" role="group" aria-label="Однолінійна схема, аркуш ${pageIndex + 1} з ${model.pages.length}">${style}${header}${links.join("")}${symbols}${table}${footer}</svg>`;
  }
  return { WIDTH, build, layout, renderSvg, wrap, shortType };
});

;
/* wiring.js */
/* Browser UI for the shared Electrical model. */
const E = Electrical;
const COMB_LANE_OFFSETS = { N: 20, L1: 34, L2: 48, L3: 62 };
let wiringMode = false;
let selectedWireId = null;
let selectedBusbarId = null;
let selectedCombId = null;
let pendingTerminal = null;
let pendingPoints = [];
let pendingPointer = null;
let wireFilter = "all";
let showWireLabels = false;
let wiringFrame = 0;
let routeDrag = null;
let terminalDrag = null;
let reconnectTarget = null;
let skipSurfaceClickUntil = 0;
let wireInsertionPoint = null;

function resetWiringSelection() {
  selectedWireId = selectedBusbarId = selectedCombId = null;
  pendingTerminal = null;
  pendingPoints = [];
  pendingPointer = null;
  terminalDrag = reconnectTarget = routeDrag = null;
  wireInsertionPoint = null;
}

function setWiringMode(enabled) {
  cancelRouteDrag();
  wiringMode = enabled;
  if (!enabled) cancelPendingWire(false);
  document.body.classList.toggle("wire-mode", enabled);
  $("#layoutPalette").classList.toggle("hidden", enabled);
  $("#wiringPalette").classList.toggle("hidden", !enabled);
  $$("[data-library-mode]").forEach((tab) => {
    const selected = (tab.dataset.libraryMode === "wiring") === enabled;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  $(".library-panel h1").textContent = enabled ? "Проводка" : "Компоненти";
  if (!enabled) renderLibrary();
  renderBoard();
  renderWiringInspector();
  renderWiringPalette();
}

function colorOptions(potential) {
  return Object.entries(E.COLORS).filter(([key]) => potential === "N" ? key === "blue" : ["PE", "PEN"].includes(potential) ? key === "greenYellow" : !["blue", "greenYellow"].includes(key));
}

function fillColorSelect(select, potential, selected) {
  select.innerHTML = colorOptions(potential).map(([key, color]) => `<option value="${key}">${color.label}</option>`).join("");
  select.value = colorOptions(potential).some(([key]) => key === selected) ? selected : E.DEFAULT_COLORS[potential] || "brown";
}

function chooseWiringEntity(kind, entityId, point = null) {
  selectedDeviceId = null;
  selectedWireId = kind === "wire" ? entityId : null;
  selectedBusbarId = kind === "busbar" ? entityId : null;
  selectedCombId = kind === "comb" ? entityId : null;
  wireInsertionPoint = kind === "wire" ? point : null;
  cancelPendingWire(false);
  renderInspector();
  renderWiringInspector();
  renderWiringPalette();
  renderBoard();
  if (window.innerWidth <= 900) {
    $(".library-panel").classList.remove("drawer-open");
    $(".inspector-panel").classList.add("drawer-open");
    $("#drawerBackdrop").classList.remove("hidden");
  }
}

function renderBusbars() {
  ["top", "bottom", "left", "right"].forEach((zone) => {
    const target = $(`#busbar${zone[0].toUpperCase()}${zone.slice(1)}`);
    const bars = project.busbars.filter((bar) => bar.zone === zone);
    target.innerHTML = bars.map(busbarMarkup).join("");
    target.classList.toggle("empty", bars.length === 0);
  });
  project.busbars.filter((bar) => bar.zone === "din").forEach((bar) => {
    const row = $(`.din-row[data-row="${bar.row}"]`);
    if (row) row.insertAdjacentHTML("beforeend", busbarMarkup(bar));
  });
  $$(".busbar-card").forEach((element) => {
    const select = (event) => { event.stopPropagation(); chooseWiringEntity("busbar", element.dataset.busbarId); };
    element.addEventListener("click", select);
    element.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(event); } });
  });
  scheduleWiringPaint();
}

function busbarMarkup(bar) {
  const selected = bar.id === selectedBusbarId ? "selected" : "";
  const vertical = ["left", "right"].includes(bar.zone);
  const style = bar.zone === "din" ? `left:${bar.slot * MODULE_PX}px;width:${E.busbarModules(bar, project.board) * MODULE_PX - 3}px` : "";
  const usage = new Set(project.wires.flatMap((wire) => [wire.from, wire.to]).filter((ref) => ref.kind === "busbar" && ref.ownerId === bar.id).map((ref) => ref.portId));
  return `<div class="busbar-card potential-${bar.potential.toLowerCase()} ${selected} ${vertical ? "vertical-bar" : ""} ${bar.zone === "din" ? "din-busbar" : ""} ${bar.terminals > 10 ? "long-bar" : ""}" data-busbar-id="${escapeHtml(bar.id)}" role="button" tabindex="0" aria-label="Шина ${escapeHtml(bar.label)}" style="${style}">
    <div class="busbar-caption"><strong>${escapeHtml(bar.label)}</strong><span>${usage.size}/${bar.terminals} · ${bar.ratedCurrent ? `${bar.ratedCurrent} A` : "— A"}</span></div>
    <div class="busbar-body"><i class="busbar-mount"></i><div class="busbar-brass">${Array.from({ length: bar.terminals }, (_, index) => `<span class="busbar-screw ${usage.has(String(index + 1)) ? "occupied" : ""}" data-bar-port="${index + 1}"><i></i><small>${index + 1}</small></span>`).join("")}</div><i class="busbar-mount"></i></div>
  </div>`;
}

function renderConsumers() {
  const target = $("#consumerZone"), consumers = project.consumers || [];
  $$(".row-consumers").forEach((node) => node.remove());
  const groups = new Map(), unassigned = [];
  const markup = (consumer, device = null, stack = 1) => `<div class="consumer-card" data-consumer-id="${escapeHtml(consumer.id)}" ${device ? `data-consumer-for="${escapeHtml(device.id)}" style="grid-column:${device.slot + 1} / span ${getComponent(device).modules};grid-row:${stack}"` : ""} role="group" title="${escapeHtml(consumer.name)} · ${escapeHtml(consumer.phase)} · споживач поза щитом" aria-label="${escapeHtml(consumer.label)} · ${escapeHtml(consumer.name)}"><strong>${escapeHtml(consumer.name)}</strong>${device ? "" : `<small>${escapeHtml(consumer.phase)}</small>`}</div>`;
  consumers.forEach((consumer) => {
    const circuit = project.design?.circuits?.find((item) => item.outputKind === "consumer" && item.outputId === consumer.id);
    const directWire = project.wires.find((wire) => [wire.from, wire.to].some((ref) => ref.kind === "consumer" && ref.ownerId === consumer.id && ref.portId === "L-in") && [wire.from, wire.to].some((ref) => ref.kind === "device"));
    const directDeviceId = directWire && [directWire.from, directWire.to].find((ref) => ref.kind === "device")?.ownerId;
    const device = project.devices.find((item) => item.id === consumer.deviceId) || project.devices.find((item) => item.id === circuit?.deviceId) || project.devices.find((item) => item.id === directDeviceId);
    if (!device || !$(`.din-row[data-row="${device.row}"]`)) { unassigned.push(consumer); return; }
    if (!groups.has(device.row)) groups.set(device.row, []);
    groups.get(device.row).push({ consumer, device });
  });
  groups.forEach((entries, row) => {
    const rail = $(`.din-row[data-row="${row}"]`);
    const stacks = new Map();
    const cards = entries.map(({ consumer, device }) => { const stack = (stacks.get(device.id) || 0) + 1; stacks.set(device.id, stack); return markup(consumer, device, stack); }).join("");
    rail.insertAdjacentHTML("afterend", `<div class="row-consumers" style="grid-template-columns:repeat(${project.board.modulesPerRow}, ${MODULE_PX}px)" aria-label="Споживачі апаратів DIN ${row + 1}">${cards}</div>`);
  });
  target.classList.toggle("hidden", unassigned.length === 0);
  target.style.width = `${project.board.modulesPerRow * MODULE_PX}px`;
  target.innerHTML = unassigned.length ? `<div class="consumer-zone-caption">Споживачі без прив’язаного апарата</div><div class="consumer-grid">${unassigned.map((consumer) => markup(consumer)).join("")}</div>` : "";
}

function scheduleWiringPaint() {
  cancelAnimationFrame(wiringFrame);
  wiringFrame = requestAnimationFrame(paintWiring);
}

function surfacePoint(clientX, clientY) {
  const surface = $("#wiringSurface"), rect = surface.getBoundingClientRect();
  return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
}

function terminalGeometry() {
  const surface = $("#wiringSurface");
  const sr = surface.getBoundingClientRect();
  const points = new Map();
  E.allEndpoints(project).forEach((port) => {
    let point;
    if (port.kind === "device") {
      const node = $(`.board-device[data-device-id="${CSS.escape(port.ownerId)}"]`);
      if (!node) return;
      const r = node.getBoundingClientRect();
      point = { x: (r.left - sr.left) / zoom + r.width / zoom * port.x, y: (r.top - sr.top) / zoom + (port.side === "top" ? 2 : port.side === "bottom" ? r.height / zoom - 2 : r.height / zoom * (port.y ?? .52)) };
      if (port.side === "left") point.x = (r.left - sr.left) / zoom + 2;
      if (port.side === "right") point.x = (r.right - sr.left) / zoom - 2;
    } else if (port.kind === "consumer") {
      const node = $(`.consumer-card[data-consumer-id="${CSS.escape(port.ownerId)}"]`);
      if (!node) return;
      const r = node.getBoundingClientRect();
      point = { x: (r.left - sr.left + r.width * port.x) / zoom, y: (r.top - sr.top) / zoom + 2 };
    } else {
      const node = $(`.busbar-card[data-busbar-id="${CSS.escape(port.ownerId)}"] [data-bar-port="${port.portId}"]`);
      if (!node) return;
      const r = node.getBoundingClientRect();
      point = { x: (r.left - sr.left + r.width / 2) / zoom, y: (r.top - sr.top + r.height / 2) / zoom - 3 };
    }
    points.set(E.endpointKey(port), { ...point, port });
  });
  return points;
}

function stub(point, distance = 16) {
  return { x: point.x + (point.port?.side === "left" ? -distance : point.port?.side === "right" ? distance : 0), y: point.y + (point.port?.side === "bottom" ? distance : ["left", "right"].includes(point.port?.side) ? 0 : -distance) };
}

function wirePathPoints(wire, geometry, index) {
  const a = geometry.get(E.endpointKey(wire.from)), b = geometry.get(E.endpointKey(wire.to));
  if (!a || !b) return [];
  const distance = 15 + index % 5 * 3;
  const start = stub(a, distance), end = stub(b, distance);
  const routePoints = routeDrag?.wireId === wire.id ? routeDrag.points : wire.points;
  if (routePoints.length) return orthogonalPoints([a, start, ...routePoints, end, b]);
  if ((a.port.kind === "consumer" || b.port.kind === "consumer") && a.port.side !== b.port.side && Math.abs(a.y - b.y) < 110 && Math.abs(a.x - b.x) < MODULE_PX * 3) {
    const middleY = (a.y + b.y) / 2;
    return [a, { x: a.x, y: middleY }, { x: b.x, y: middleY }, b];
  }
  const sameLevel = Math.abs(a.y - b.y) < 8 && a.port.side === b.port.side;
  if (sameLevel) return [a, start, { x: b.x, y: start.y }, b];
  const corridor = Number($("#wiringSurface").dataset.routeInsetX || 0) + 5 + index % 5 * 3;
  return [a, start, { x: corridor, y: start.y }, { x: corridor, y: end.y }, end, b];
}

function orthogonalPoints(points) {
  const result = [{ x: points[0].x, y: points[0].y }];
  points.slice(1).forEach((point) => {
    const last = result[result.length - 1];
    if (last.x !== point.x && last.y !== point.y) result.push({ x: point.x, y: last.y });
    result.push({ x: point.x, y: point.y });
  });
  return result;
}

const pathData = (points) => points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
const visiblePotential = (potential, wire) => wireFilter === "all" || wireFilter === "phases" && E.PHASES.includes(potential) || wireFilter === "N" && potential === "N" || wireFilter === "PE" && ["PE", "PEN"].includes(potential) || wireFilter === "control" && (ControlDevices.isControlPotential(potential) || wire && [wire.from, wire.to].some((ref) => E.resolveEndpoint(project, ref)?.control));

function wireMidpoint(wireId) {
  const index = project.wires.findIndex((wire) => wire.id === wireId);
  if (index < 0) throw new Error("Оберіть провід для вставлення");
  const points = wirePathPoints(project.wires[index], terminalGeometry(), index);
  if (points.length < 2) throw new Error("Відкрийте компоновку щита для вставлення апарата");
  const lengths = points.slice(1).map((point, n) => Math.hypot(point.x - points[n].x, point.y - points[n].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let n = 0; n < lengths.length; n += 1) {
    if (remaining <= lengths[n] && lengths[n]) return { x: points[n].x + (points[n + 1].x - points[n].x) * remaining / lengths[n], y: points[n].y + (points[n + 1].y - points[n].y) * remaining / lengths[n] };
    remaining -= lengths[n];
  }
  return points[0];
}

function closestWireAtPoint(point) {
  const geometry = terminalGeometry(), tolerance = 10 / zoom;
  let closest = null, distance = tolerance;
  // Later SVG paths are drawn on top; keep the same priority at crossings.
  for (let index = project.wires.length - 1; index >= 0; index -= 1) {
    const wire = project.wires[index];
    if (!visiblePotential(wire.potential, wire)) continue;
    const points = wirePathPoints(wire, geometry, index);
    for (let n = 1; n < points.length; n += 1) {
      const a = points[n - 1], b = points[n], dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const nextDistance = Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
      if (nextDistance < distance) { distance = nextDistance; closest = wire; }
    }
  }
  return closest;
}

function markWireDropTarget(wireId = null) {
  $$(".wire-path").forEach((node) => node.classList.toggle("drop-target", node.dataset.wireId === wireId));
}

// Show the actual connections of one apparatus, without walking through other
// apparatuses or treating a geometric wire crossing as an electrical junction.
function selectedConnections() {
  const kind = selectedDeviceId ? "device" : "busbar";
  const ownerId = selectedDeviceId || selectedBusbarId;
  const owner = (kind === "device" ? project.devices : project.busbars).find((item) => item.id === ownerId);
  if (!owner) return null;
  const focus = { kind, ownerId, label: owner.label, wireIds: new Set(), combIds: new Set(), deviceIds: new Set(), busbarIds: new Set(), consumerIds: new Set(), terminalKeys: new Set() };
  const isOwner = (ref) => ref.kind === kind && ref.ownerId === ownerId;
  const include = (ref) => {
    if (!E.resolveEndpoint(project, ref)) return;
    focus.terminalKeys.add(E.endpointKey(ref));
    if (!isOwner(ref)) focus[{ device: "deviceIds", busbar: "busbarIds", consumer: "consumerIds" }[ref.kind]].add(ref.ownerId);
  };
  project.wires.forEach((wire) => {
    if (![wire.from, wire.to].some(isOwner)) return;
    focus.wireIds.add(wire.id);
    [wire.from, wire.to].forEach(include);
  });
  project.combs.forEach((comb) => {
    if (!comb.terminals.some(isOwner)) return;
    focus.combIds.add(comb.id);
    comb.terminals.forEach(include);
  });
  const combPorts = new Set(project.combs.filter((comb) => focus.combIds.has(comb.id)).flatMap((comb) => comb.terminals.map(E.endpointKey)));
  project.wires.filter((wire) => [wire.from, wire.to].some((ref) => combPorts.has(E.endpointKey(ref)))).forEach((wire) => { focus.wireIds.add(wire.id); [wire.from, wire.to].forEach(include); });
  focus.hasConnections = Boolean(focus.wireIds.size || focus.combIds.size);
  return focus;
}

function highlightConnectionEntities(focus) {
  const active = Boolean(focus?.hasConnections);
  [[".board-device", "deviceId", "device", "deviceIds"], [".busbar-card", "busbarId", "busbar", "busbarIds"], [".consumer-card", "consumerId", "consumer", "consumerIds"]].forEach(([selector, key, kind, collection]) => {
    $$(selector).forEach((node) => {
      const chosen = focus?.kind === kind && focus.ownerId === node.dataset[key];
      const related = active && focus[collection].has(node.dataset[key]);
      node.classList.toggle("connection-related", related);
      node.classList.toggle("connection-muted", active && !chosen && !related);
      if (related) node.setAttribute("aria-description", `З’єднано з ${focus.label}`);
      else node.removeAttribute("aria-description");
    });
  });
}

function combBodyMarkup(comb, points, y, dir) {
  const left = points[0].x - 8, width = points.at(-1).x - left + 8;
  const face = E.COLORS[E.DEFAULT_COLORS[comb.potential]].hex;
  const teeth = points.map((point) => {
    const reach = Math.abs(y - point.y), neck = Math.max(5, reach - 8);
    const shape = comb.contactType === "fork"
      ? `M-4 0 H4 V${reach-1} L2 ${reach} V${neck} H-2 V${reach} L-4 ${reach-1} Z`
      : `M-3.8 0 H3.8 V${neck} H2.3 V${reach} H-2.3 V${neck} H-3.8 Z`;
    return `<g transform="translate(${point.x} ${y}) scale(1 ${-dir})"><path d="${shape}" fill="url(#combCopper)" stroke="#7e5438" stroke-width=".8"/><path d="M-2 2V${neck-1}" stroke="#ffdaaf" stroke-width=".9"/></g>`;
  }).join("");
  return `${teeth}<rect x="${left}" y="${y-5.5}" width="${width}" height="11" rx="1.6" fill="url(#combSleeve)" stroke="#817f76"/><rect x="${left+1}" y="${y-2.4}" width="${width-2}" height="4.4" fill="${face}"/><path d="M${left+1} ${y-3.7}h${width-2}" stroke="#fffdf4" stroke-width="1"/>${[left,left+width-3].map(x=>`<rect x="${x}" y="${y-5.8}" width="3" height="11.6" rx=".8" fill="#aeada2" stroke="#66665f" stroke-width=".6"/>`).join("")}`;
}

function paintWiring() {
  const surface = $("#wiringSurface"), svg = $("#wiringSvg");
  if (!surface || !svg || !$("#boardView").classList.contains("active")) return;
  const geometry = terminalGeometry();
  const selectedWire = project.wires.find((wire) => wire.id === selectedWireId);
  const graph = selectedWire ? E.connectivity(project, { neutralDomains: selectedWire.potential === "N" }) : null;
  const selectedNet = selectedWire && graph.find(selectedWire.from);
  const focus = selectedConnections();
  highlightConnectionEntities(focus);
  renderAssemblyWiringStatus(focus);
  svg.setAttribute("viewBox", `0 0 ${surface.clientWidth} ${surface.clientHeight}`);
  const markup = [`<defs><linearGradient id="combCopper" x2="1" y2=".18"><stop stop-color="#81502e"/><stop offset=".28" stop-color="#e9ad6f"/><stop offset=".53" stop-color="#ffcf92"/><stop offset="1" stop-color="#a1683f"/></linearGradient><linearGradient id="combSleeve" x2="0" y2="1"><stop stop-color="#fcfaf2"/><stop offset=".38" stop-color="#e9e6da"/><stop offset=".7" stop-color="#cfcdc2"/><stop offset="1" stop-color="#a5a49b"/></linearGradient><pattern id="peWirePattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill="#21854d"/><rect width="4" height="10" fill="#f7df3c"/></pattern></defs>`];
  const routeHandles = [];
  const combMarkup = [];
  project.combs.forEach((comb) => {
    if (!visiblePotential(comb.potential)) return;
    const points = comb.terminals.map((ref) => geometry.get(E.endpointKey(ref))).filter(Boolean).sort((a, b) => a.x - b.x);
    if (points.length < 2) return;
    const dir = points[0].port.side === "bottom" ? 1 : -1, y = points[0].y + dir * (COMB_LANE_OFFSETS[comb.potential] ?? COMB_LANE_OFFSETS.L1);
    const d = `M${points[0].x},${y} H${points[points.length - 1].x} ${points.map((point) => `M${point.x},${y} V${point.y}`).join(" ")}`;
    const related = focus?.combIds.has(comb.id);
    const body = combBodyMarkup(comb, points, y, dir);
    combMarkup.push(`<g class="comb-path ${comb.id === selectedCombId ? "selected" : ""} ${related ? "related" : ""} ${focus?.hasConnections && !related ? "dimmed" : ""}" data-comb-id="${escapeHtml(comb.id)}" role="button" tabindex="0" aria-label="Гребінка ${escapeHtml(comb.label)}"><path d="${d}" class="wire-halo"/>${body}<text x="${points[0].x}" y="${y + dir * 12}" class="comb-label">${escapeHtml(comb.label)} · ${comb.potential}</text><path class="wire-hit" d="${d}"/></g>`);
  });
  project.wires.forEach((wire, index) => {
    if (!visiblePotential(wire.potential, wire)) return;
    const points = wirePathPoints(wire, geometry, index);
    if (!points.length) return;
    const d = pathData(points), selected = wire.id === selectedWireId;
    const related = focus ? focus.wireIds.has(wire.id) : selectedWire && graph.find(wire.from) === selectedNet;
    const dimmed = (focus?.hasConnections || selectedWire) && !related;
    const color = ["PE", "PEN"].includes(wire.potential) ? "url(#peWirePattern)" : E.COLORS[wire.color]?.hex || "#e45f5f";
    const width = 1.55 + Math.min(1.15, Math.log2(Math.max(1, wire.section)) * .24);
    const mid = points[Math.floor(points.length / 2)];
    markup.push(`<g class="wire-path ${selected ? "selected" : ""} ${related ? "related" : ""} ${dimmed ? "dimmed" : ""}" data-wire-id="${escapeHtml(wire.id)}" role="button" tabindex="0" aria-label="Провід ${escapeHtml(wire.label)}: ${escapeHtml(E.endpointLabel(project, wire.from))} → ${escapeHtml(E.endpointLabel(project, wire.to))}"><title>${escapeHtml(wire.label)} · ${wire.potential} · ${wire.section} мм² · ${wire.material}</title><path class="wire-halo" d="${d}"/><path class="wire-stroke" d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/><path class="wire-hit" d="${d}"/>${showWireLabels || selected ? `<text class="wire-label" x="${mid.x + 5}" y="${mid.y - 5}">${escapeHtml(wire.label)} · ${wire.section}</text>` : ""}</g>`);
    if (selected) {
      const routePoints = routeDrag?.wireId === wire.id ? routeDrag.points : wire.points;
      const handles = routePoints.length ? routePoints : [{ x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 }];
      handles.forEach((point, handleIndex) => routeHandles.push(`<rect class="route-handle" data-route-wire="${escapeHtml(wire.id)}" data-route-index="${handleIndex}" x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" transform="rotate(45 ${point.x} ${point.y})" aria-label="Змінити маршрут ${escapeHtml(wire.label)}"/>`));
    }
  });
  markup.push(...combMarkup, ...routeHandles);
  geometry.forEach((point, key) => {
    const related = focus?.terminalKeys.has(key);
    if (!wiringMode && point.port.ownerId !== selectedDeviceId && point.port.ownerId !== selectedBusbarId && !related) return;
    const pending = pendingTerminal && E.sameEndpoint(point.port, pendingTerminal);
    const origin = pendingTerminal && E.resolveEndpoint(project, pendingTerminal);
    const compatible = !origin || E.compatible(project, origin, point.port);
    const ownerChosen = point.port.ownerId === selectedDeviceId || point.port.ownerId === selectedBusbarId;
    markup.push(`<g class="terminal-point ${pending ? "pending" : ""} ${origin && !compatible && !pending ? "incompatible" : ""} ${ownerChosen ? "owner-selected" : related ? "connection-related" : ""}" data-terminal-key="${escapeHtml(key)}" role="button" tabindex="0" aria-label="Клема ${escapeHtml(point.port.ownerLabel)}:${escapeHtml(point.port.label)} · ${point.port.potential}" transform="translate(${point.x} ${point.y})"><title>${escapeHtml(point.port.ownerLabel)}:${escapeHtml(point.port.label)} · ${point.port.potential} · перетягніть до іншої клеми</title><circle r="9" class="terminal-hit"/><circle r="4.5" fill="${E.COLORS[E.DEFAULT_COLORS[point.port.potential]]?.hex || "#6b7885"}"/><text y="${point.port.side === "bottom" ? 17 : -10}" text-anchor="middle">${escapeHtml(point.port.label)}</text></g>`);
  });
  if (pendingTerminal && pendingPointer) {
    const origin = geometry.get(E.endpointKey(pendingTerminal));
    if (origin) markup.push(`<path class="wire-draft" d="${pathData(orthogonalPoints([origin, stub(origin), ...pendingPoints, pendingPointer]))}"/>`);
  }
  svg.innerHTML = markup.join("");
  $$("[data-terminal-key]", svg).forEach((node) => {
    const port = geometry.get(node.dataset.terminalKey).port;
    if (port.kind === "consumer") { node.classList.add("consumer-terminal"); node.querySelector(".terminal-hit").setAttribute("r", "6"); }
    if (port.currentKind) { const text = `Клема ${port.ownerLabel}:${port.label} · ${ControlDevices.label(port)}`; node.setAttribute("aria-label", text); node.querySelector("title").textContent = text; }
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault(); event.stopPropagation();
      terminalDrag = { ref: E.refOf(geometry.get(node.dataset.terminalKey).port), x: event.clientX, y: event.clientY, pointerId: event.pointerId, moved: false };
    });
    node.addEventListener("click", (event) => event.stopPropagation());
    node.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); terminalClicked(geometry.get(node.dataset.terminalKey).port); } });
  });
  [["[data-wire-id]", "wire", "wireId"], ["[data-comb-id]", "comb", "combId"]].forEach(([selector, kind, key]) => {
    $$(selector, svg).forEach((node) => {
      const select = (event) => {
        event.stopPropagation();
        // In layout mode an overlaid wire must not steal a click on the device.
        const owner = !wiringMode && event.detail > 0 && document.elementsFromPoint(event.clientX, event.clientY).map((element) => element.closest(".board-device, .busbar-card")).find(Boolean);
        if (owner?.dataset?.deviceId) chooseDevice(owner.dataset.deviceId);
        else if (owner?.dataset?.busbarId) chooseWiringEntity("busbar", owner.dataset.busbarId);
        else chooseWiringEntity(kind, node.dataset[key], event.detail > 0 ? surfacePoint(event.clientX, event.clientY) : null);
      };
      node.addEventListener("click", select);
      node.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(event); } });
    });
  });
  $$("[data-route-wire]", svg).forEach((node) => node.addEventListener("pointerdown", startRouteDrag));
}

function terminalClicked(port) {
  if (!port) return;
  if (reconnectTarget) {
    try {
      const changed = E.reconnectWire(project, reconnectTarget.wireId, reconnectTarget.end, port);
      snapshot();
      Object.assign(project.wires.find((wire) => wire.id === changed.id), changed);
      cancelPendingWire(false);
      selectedWireId = changed.id;
      persistProject(); renderAll();
      toast(`${changed.label}: підключення змінено`);
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  selectedWireId = selectedCombId = null;
  if (!pendingTerminal) {
    if (!wiringMode) setWiringMode(true);
    pendingTerminal = E.refOf(port);
    pendingPoints = [];
    fillColorSelect($("#newWireColor"), port.potential, E.DEFAULT_COLORS[port.potential]);
    renderWiringPalette();
    scheduleWiringPaint();
    return;
  }
  if (E.sameEndpoint(pendingTerminal, port)) return cancelPendingWire();
  try {
    const origin = E.resolveEndpoint(project, pendingTerminal);
    const potential = E.preferredPotential(origin, port);
    const color = colorOptions(potential).some(([key]) => key === $("#newWireColor").value) ? $("#newWireColor").value : E.DEFAULT_COLORS[potential];
    const wire = E.makeWire(project, pendingTerminal, port, { color, section: Number($("#newWireSection").value), material: $("#newWireMaterial").value, points: pendingPoints });
    snapshot();
    project.wires.push(wire);
    pendingTerminal = null;
    pendingPoints = [];
    pendingPointer = null;
    selectedWireId = wire.id;
    selectedBusbarId = selectedDeviceId = null;
    setWireFilter("all");
    persistProject();
    renderAll();
    toast(`${wire.label}: ${E.endpointLabel(project, wire.from)} → ${E.endpointLabel(project, wire.to)}`);
  } catch (error) { toast(error.message, "error"); }
}

function cancelPendingWire(repaint = true) {
  pendingTerminal = null; pendingPoints = []; pendingPointer = null; reconnectTarget = null;
  renderWiringPalette();
  if (repaint) scheduleWiringPaint();
}

function setWireFilter(filter) {
  wireFilter = filter;
  $$("[data-wire-filter]").forEach((item) => item.classList.toggle("active", item.dataset.wireFilter === filter));
  renderAssemblyWiringStatus();
  scheduleWiringPaint();
}

function renderAssemblyWiringStatus(focus = selectedConnections()) {
  const visible = project.wires.filter((wire) => visiblePotential(wire.potential, wire)).length;
  $("#assemblyWireCount").textContent = wireFilter === "all" ? `Проводів: ${project.wires.length}` : `Видно: ${visible}/${project.wires.length}`;
  $("#assemblyShowAllWiresButton").classList.toggle("hidden", wireFilter === "all");
  const focusHint = focus && (focus.hasConnections ? `${focus.label} · проводи: ${focus.wireIds.size} · пристрої: ${focus.deviceIds.size} · шини: ${focus.busbarIds.size}${focus.consumerIds.size ? ` · споживачі: ${focus.consumerIds.size}` : ""}${focus.combIds.size ? ` · гребінки: ${focus.combIds.size}` : ""}. Esc — зняти виділення.` : `${focus.label}: з’єднань ще немає. Esc — зняти виділення.`);
  const wire = project.wires.find((item) => item.id === selectedWireId);
  $("#assemblyWiringHint").textContent = reconnectTarget ? "Оберіть нову клему для кінця проводу. Esc — скасувати." : pendingTerminal ? `Від ${E.endpointLabel(project, pendingTerminal)} — оберіть кінцеву клему або задайте вигин на вільному полі.` : focusHint || (wire ? `${wire.label}: додайте сумісний апарат із каталогу або перетягніть його на провід.` : wiringMode ? "Протягніть провід між кольоровими клемами або натисніть їх по черзі." : "Виберіть апарат, щоб підсвітити його проводи та з’єднані компоненти. Натисніть провід для редагування.");
}

function startReconnect(end) {
  const wire = project.wires.find((item) => item.id === selectedWireId);
  if (!wire) return;
  setWiringMode(true);
  reconnectTarget = { wireId: wire.id, end };
  pendingTerminal = { ...wire[end === "from" ? "to" : "from"] };
  pendingPoints = [];
  pendingPointer = null;
  renderWiringPalette(); scheduleWiringPaint(); closeDrawers();
}

function startRouteDrag(event) {
  if (event.button !== 0 || !event.isPrimary) return;
  event.preventDefault(); event.stopPropagation();
  const wire = project.wires.find((item) => item.id === event.currentTarget.dataset.routeWire);
  if (!wire) return;
  const index = Number(event.currentTarget.dataset.routeIndex);
  routeDrag = { wireId: wire.id, index, pointerId: event.pointerId, points: clone(wire.points), moved: false, x: event.clientX, y: event.clientY };
  if (!routeDrag.points.length) routeDrag.points.push(surfacePoint(event.clientX, event.clientY));
}

function cancelRouteDrag() {
  if (!routeDrag) return;
  routeDrag = null;
  scheduleWiringPaint();
}

function renderWiringPalette() {
  const insertionWire = project.wires.find((wire) => wire.id === selectedWireId);
  $("#wireInsertionHint").classList.toggle("hidden", !insertionWire);
  $("#wireInsertionLabel").textContent = insertionWire ? `Вставлення у ${insertionWire.label} · ${insertionWire.potential}` : "";
  const instruction = reconnectTarget ? "Перепідключення: натисніть нову клему. Параметри проводу збережуться." : pendingTerminal ? `Початок: ${E.endpointLabel(project, pendingTerminal)}. Оберіть кінцеву клему. Клік на порожньому полі додає вигин.` : "Протягніть провід від однієї кольорової клеми до іншої або натисніть їх по черзі.";
  renderAssemblyWiringStatus();
  $("#wiringInstruction").textContent = instruction;
  $("#cancelWireButton").classList.toggle("hidden", !pendingTerminal);
  $("#wireBadge").textContent = project.wires.length;
  if (wiringMode) $("#libraryCount").textContent = `${project.wires.length} пров.`;
  $("#wiringItems").innerHTML = `<div class="wiring-list-heading">Шини <span>${project.busbars.length}</span></div>${project.busbars.map((bar) => `<button class="wiring-list-item ${bar.id === selectedBusbarId ? "active" : ""}" data-select-bar="${escapeHtml(bar.id)}" type="button"><i class="bar-chip ${bar.potential === "N" ? "n-chip" : "pe-chip"}"></i><strong>${escapeHtml(bar.label)}</strong><span>${bar.terminals} клем</span></button>`).join("")}${project.combs.length ? `<div class="wiring-list-heading">Гребінки <span>${project.combs.length}</span></div>${project.combs.map((comb) => `<button class="wiring-list-item" data-select-comb="${escapeHtml(comb.id)}" type="button"><strong>${escapeHtml(comb.label)}</strong><span>${comb.potential} · ${comb.terminals.length} контактів</span></button>`).join("")}` : ""}<div class="wiring-list-heading">Проводи <span>${project.wires.length}</span></div>${project.wires.map((wire) => `<button class="wiring-list-item ${wire.id === selectedWireId ? "active" : ""}" data-select-wire="${escapeHtml(wire.id)}" type="button"><i class="wire-color-dot" style="background:${E.COLORS[wire.color]?.hex || "#999"}"></i><strong>${escapeHtml(wire.label)}</strong><span>${wire.potential} · ${wire.section} мм²</span></button>`).join("")}`;
  $$("[data-select-bar]").forEach((node) => node.addEventListener("click", () => chooseWiringEntity("busbar", node.dataset.selectBar)));
  $$("[data-select-wire]").forEach((node) => node.addEventListener("click", () => chooseWiringEntity("wire", node.dataset.selectWire)));
  $$("[data-select-comb]").forEach((node) => node.addEventListener("click", () => chooseWiringEntity("comb", node.dataset.selectComb)));
}

function renderWiringInspector() {
  const wire = project.wires.find((item) => item.id === selectedWireId);
  const bar = project.busbars.find((item) => item.id === selectedBusbarId);
  const comb = project.combs.find((item) => item.id === selectedCombId);
  $("#wireInspector").classList.toggle("hidden", !wire);
  $("#busbarInspector").classList.toggle("hidden", !bar);
  $("#combInspector").classList.toggle("hidden", !comb);
  if (wire) {
    $("#wireInspectorTitle").textContent = `${wire.label} · ${wire.potential}`;
    $("#wireAddress").textContent = `${E.endpointLabel(project, wire.from)} → ${E.endpointLabel(project, wire.to)}`;
    $("#wireLabelInput").value = wire.label;
    $("#wireSectionInput").value = wire.section;
    $("#wireMaterialInput").value = wire.material;
    $("#wireTypeInput").value = wire.wireType || "";
    $("#wireEndAllowance").value = project.wireEndAllowanceMm ?? 50;
    $("#wireLengthInput").value = wire.lengthM ?? "";
    const takeoff=PanelInstallation.lengths(project).get(wire.id);
    $("#wireLengthInput").placeholder = takeoff.origin === "estimated" ? `≈ ${takeoff.m} м` : "—";
    fillColorSelect($("#wireColorInput"), wire.potential, wire.color);
  }
  if (bar) {
    $("#busbarInspectorTitle").textContent = `${bar.label} · ${bar.potential}`;
    $("#busbarLabelInput").value = bar.label;
    $("#busbarCountInput").value = bar.terminals;
    $("#busbarCurrentInput").value = bar.ratedCurrent || "";
    $("#busbarMinInput").value = bar.minSection || "";
    $("#busbarMaxInput").value = bar.maxSection || "";
    $("#busbarZoneInput").value = bar.zone;
    $("#busbarRowInput").innerHTML = Array.from({ length: project.board.rows }, (_, i) => `<option value="${i}">DIN ${i + 1}</option>`).join("");
    $("#busbarRowInput").value = bar.row;
    $("#busbarSlotInput").value = bar.slot + 1;
    $("#busbarRowInput").disabled = $("#busbarSlotInput").disabled = bar.zone !== "din";
    $("#busbarRcdField").classList.toggle("hidden", bar.potential !== "N");
    $("#busbarRcdInput").innerHTML = `<option value="">Визначати за підключенням</option>${project.devices.filter(E.isRcd).map((device) => `<option value="${escapeHtml(device.id)}">${escapeHtml(device.label)} · ${escapeHtml(device.name)}</option>`).join("")}`;
    $("#busbarRcdInput").value = bar.rcdId || "";
    $("#addRcdNeutralButton").classList.add("hidden");
    const refs = project.wires.flatMap((connection) => [connection.from.ownerId === bar.id ? { ref: connection.from, other: connection.to, wire: connection } : null, connection.to.ownerId === bar.id ? { ref: connection.to, other: connection.from, wire: connection } : null]).filter(Boolean);
    $("#busbarAssignment").innerHTML = `<strong>Затискачі · ${refs.length}/${bar.terminals}</strong>${Array.from({ length: bar.terminals }, (_, index) => { const entries = refs.filter((entry) => entry.ref.portId === String(index + 1)); return `<div><b>${index + 1}</b><span>${entries.length ? entries.map((entry) => `${escapeHtml(entry.wire.label)} → ${escapeHtml(E.endpointLabel(project, entry.other))}`).join(", ") : "Вільно"}</span></div>`; }).join("")}`;
  }
  if (comb) {
    $("#combInspectorTitle").textContent = `${comb.label} · ${comb.potential}`;
    $("#combMembers").innerHTML = `<p class="model-note">${escapeHtml(comb.contactType?.toUpperCase() || "Не задано")}${comb.series ? ` · ${escapeHtml(comb.series)}` : ""}</p><strong>${comb.terminals.length} контактів · ${comb.ratedCurrent ? `${comb.ratedCurrent} А` : "номінал не задано"}</strong>${comb.terminals.map((ref) => `<div><span>${escapeHtml(E.endpointLabel(project, ref))}</span></div>`).join("")}`;
  }
  const rcd = project.devices.find((device) => device.id === selectedDeviceId && E.isRcd(device));
  $("#addRcdNeutralButton").classList.toggle("hidden", !rcd);
  if (rcd) {
    // The action is placed with the device properties while that device is selected.
    $("#deviceInspector").append($("#addRcdNeutralButton"));
  } else if (!bar) $("#busbarInspector").append($("#addRcdNeutralButton"));
}

function createBusbar(potential, rcdId = "") {
  if (potential === "PEN" && !(project.board.earthing === "TN-C-S" && project.board.penSplit)) return toast("Спочатку задайте TN-C-S і точку поділу PEN у параметрах щита.", "error");
  if (potential === "PEN" && project.busbars.some((bar) => bar.potential === "PEN")) return toast("У цьому щиті вже є PEN-шина.", "error");
  let next = 1;
  while (project.busbars.some((bar) => bar.label === `${potential}${next}`)) next += 1;
  const bar = { id: uid(), potential, label: `${potential}${next}`, terminals: 8, zone: "bottom", row: 0, slot: 0, rcdId, ratedCurrent: null, minSection: null, maxSection: null };
  const candidate = clone(project);
  candidate.busbars.push(bar);
  if (rcdId) {
    try { candidate.wires.push(E.makeWire(candidate, { kind: "device", ownerId: rcdId, portId: "N-out" }, { kind: "busbar", ownerId: bar.id, portId: "1" }, { section: Number($("#newWireSection").value), color: "blue" })); }
    catch (error) { return toast(error.message, "error"); }
  }
  snapshot(); project = candidate;
  selectedBusbarId = bar.id;
  selectedDeviceId = selectedWireId = selectedCombId = null;
  persistProject();
  setWiringMode(true);
  renderAll();
  closeDrawers();
  setTimeout(fitBoard, 0);
  toast(`${bar.label}: шину додано, номінал задайте за паспортом`);
}

function updateBusbar() {
  const bar = project.busbars.find((item) => item.id === selectedBusbarId);
  if (!bar) return;
  const next = { ...bar, label: $("#busbarLabelInput").value.trim() || bar.label, terminals: Number($("#busbarCountInput").value), zone: $("#busbarZoneInput").value, row: Number($("#busbarRowInput").value), slot: Number($("#busbarSlotInput").value) - 1, ratedCurrent: E.positiveOrNull($("#busbarCurrentInput").value), minSection: E.positiveOrNull($("#busbarMinInput").value), maxSection: E.positiveOrNull($("#busbarMaxInput").value), rcdId: bar.potential === "N" ? $("#busbarRcdInput").value : "" };
  if (next.zone === "din" && bar.zone !== "din") {
    const available = findFirstSpace(E.busbarModules(next));
    if (available) Object.assign(next, available);
  }
  const connectedSlots = project.wires.flatMap((wire) => [wire.from, wire.to]).filter((ref) => ref.ownerId === bar.id).map((ref) => Number(ref.portId));
  let problem;
  if (!Number.isInteger(next.terminals) || next.terminals < 2 || next.terminals > 24) problem = "Потрібно від 2 до 24 клем.";
  else if (connectedSlots.some((slot) => slot > next.terminals)) problem = "Ці клеми підключені. Спершу перенесіть або видаліть відповідні проводи.";
  else if (next.minSection && next.maxSection && next.minSection > next.maxSection) problem = "Мінімальний переріз перевищує максимальний.";
  else if (next.zone === "din" && !isSpaceFree(next.row, next.slot, E.busbarModules(next), bar.id)) problem = "Для шини немає місця на вибраній DIN-рейці.";
  else {
    const candidate = { ...project, busbars: project.busbars.map((item) => item.id === bar.id ? next : item) };
    problem = E.validate(candidate).find((issue) => issue.level === "error" && ["neutral-mix", "bar-section", "bar-rcd"].includes(issue.code))?.text;
  }
  if (problem) { toast(problem, "error"); renderWiringInspector(); return; }
  snapshot(); Object.assign(bar, next); persistProject(); renderAll();
  requestAnimationFrame(updateZoomLayout);
}

function updateSelectedWire() {
  const wire = project.wires.find((item) => item.id === selectedWireId);
  if (!wire) return;
  const changed = { ...wire, label: $("#wireLabelInput").value.trim() || wire.label, section: Number($("#wireSectionInput").value), color: $("#wireColorInput").value, material: $("#wireMaterialInput").value };
  const length = $("#wireLengthInput").value.trim();
  if (length && (!Number.isFinite(Number(length)) || Number(length) <= 0 || Number(length) > 100000)) { toast("Введіть додатну довжину проводу до 100 000 м або залиште поле порожнім.", "error"); renderWiringInspector(); return; }
  changed.wireType = $("#wireTypeInput").value.trim(); changed.lengthM = length ? Number(length) : null;
  const candidate = { ...project, wires: project.wires.map((item) => item.id === wire.id ? changed : item) };
  const error = E.validate(candidate).find((issue) => issue.level === "error" && issue.entityId === wire.id);
  if (error) { toast(error.text, "error"); renderWiringInspector(); return; }
  snapshot(); D.invalidateWireEvidence(project, wire, changed); Object.assign(wire, changed); persistProject(); renderAll();
}

function deleteWiringEntity(kind, entityId) {
  if (!entityId) return;
  snapshot();
  project = E.removeEntity(project, kind, entityId);
  resetWiringSelection();
  persistProject(); renderAll();
  toast("Елемент і пов’язані з’єднання видалено. Ctrl+Z — повернути.");
}

function wiringChecks() {
  const issues = E.validate(project);
  const byCode = new Map();
  const titles = { "neutral-mix": "Змішані N-групи", "bar-rating": "Паспортні дані шин", "bar-unconnected": "Непідключені шини", "device-phase": "Полюсність апаратів", "wire-color": "Кольори проводів", "missing-terminal": "Відсутні клеми", "potential-mismatch": "Несумісні провідники", "terminal-overflow": "Зайнята клема шини", "bar-section": "Переріз і затискачі", "comb-potential": "Несумісна гребінка" };
  issues.forEach((issue) => { if (!byCode.has(issue.code)) byCode.set(issue.code, { level: issue.level, title: titles[issue.code] || "Перевірка з’єднань", text: issue.text }); else byCode.get(issue.code).text += ` ${issue.text}`; });
  if (!project.wires.length && !project.combs.length) byCode.set("connections", { level: "warning", title: "Проводка ще не задана", text: "Увімкніть «Проводка» та з’єднайте клеми." });
  else if (!issues.some((issue) => issue.level === "error")) byCode.set("connections", { level: "success", title: "Топологія з’єднань", text: `${project.wires.length} проводів; несумісних клем і змішаних N-груп не знайдено.` });
  return [...byCode.values()];
}

function renderWireReport() {
  const calculated = PanelInstallation.lengths(project);
  const rows = E.wireRows(project).map(row => ({...row, takeoff:calculated.get(row.id)}));
  $("#wireBadge").textContent = rows.length;
  $("#wireSummary").innerHTML = `<article class="bom-summary-card"><span>Проводів</span><strong>${rows.length}</strong></article><article class="bom-summary-card"><span>N / PE / PEN-шин</span><strong>${project.busbars.length}</strong></article><article class="bom-summary-card"><span>Гребінок</span><strong>${project.combs.length}</strong></article>`;
  $("#wireTableBody").innerHTML = rows.map((row) => `<tr><td><strong>${escapeHtml(row.label)}</strong></td><td>${escapeHtml(row.from)}</td><td>${escapeHtml(row.to)}</td><td>${row.potential}</td><td>${row.section}</td><td>${escapeHtml(row.color)} · ${row.material}</td><td>${escapeHtml(row.wireType || "Не задано")}</td><td>${row.takeoff.m == null ? "Не задано" : `${cableNumber(row.takeoff.m)} м · ${PanelInstallation.origins[row.takeoff.origin]}`}</td><td>${row.route}</td></tr>`).join("");
  $("#wiresEmpty").classList.toggle("hidden", rows.length > 0);
  $(".wire-table").classList.toggle("hidden", rows.length === 0);
  $("#combReport").innerHTML = project.combs.length ? `<div class="report-section-title">Відомість гребінок</div><table class="bom-table"><thead><tr><th>Позначення</th><th>Провідник</th><th>Контакти</th><th>Серія / модель</th><th>Номінал</th></tr></thead><tbody>${project.combs.map((comb) => `<tr><td>${escapeHtml(comb.label)}</td><td>${comb.potential}</td><td>${comb.terminals.map((ref) => escapeHtml(E.endpointLabel(project, ref))).join(", ")}</td><td>${escapeHtml(comb.contactType?.toUpperCase() || "Не задано")}${comb.series ? ` · ${escapeHtml(comb.series)}` : ""}</td><td>${comb.ratedCurrent ? `${comb.ratedCurrent} А` : "Не задано"}</td></tr>`).join("")}</tbody></table>` : "";
  $("#combReport").classList.toggle("hidden", project.combs.length === 0);
}

function exportWireCsv() {
  const rows = [["Позначення", "Від", "До", "Провідник", "Переріз, мм²", "Колір", "Матеріал", "Маршрут", "Тип / марка", "Довжина, м", "Джерело довжини"]];
  const calculated=PanelInstallation.lengths(project);
  E.wireRows(project).forEach((row) => rows.push([row.label, row.from, row.to, row.potential, row.section, row.color, row.material, row.route, row.wireType, calculated.get(row.id).m ?? "", PanelInstallation.origins[calculated.get(row.id).origin]]));
  project.combs.forEach((comb) => rows.push([comb.label, "Гребінка", comb.terminals.map((ref) => E.endpointLabel(project, ref)).join(" / "), comb.potential, "", "", "", `${comb.terminals.length} контактів${comb.contactType ? ` · ${comb.contactType.toUpperCase()}` : ""}${comb.series ? ` · ${comb.series}` : ""}`, "", ""]));
  downloadBlob(csvContent(rows), `${slugify(project.name)}-connections.csv`, "text/csv;charset=utf-8");
  toast("Відомість з’єднань CSV збережено");
}

function csvContent(rows) {
  return E.csvContent(rows);
}

function createWiringDemo() {
  persistProject({ immediate: true });
  const now = new Date().toISOString();
  const demo = E.normalizeProject({ id: uid(), name: "Щит з проводкою · приклад", createdAt: now, updatedAt: now, board: { name: "ЩР-1 · приклад з’єднань", rows: 3, modulesPerRow: 18, ip: "IP40", reserve: 20, earthing: "TN-S" }, devices: [
    makeDevice("main-4p", 0, 0, { label: "QF0", name: "Ввід", rating: "C40", phase: "3P" }),
    makeDevice("rccb-4p", 0, 6, { label: "QD1", name: "Групове ПЗВ", phase: "3P" }),
    makeDevice("mcb-1p", 1, 0, { label: "QF1", name: "Освітлення", rating: "B10", phase: "L1", load: .8 }),
    makeDevice("mcb-1p", 1, 1, { label: "QF2", name: "Розетки", phase: "L1", load: 2.1 }),
    makeDevice("mcb-1p", 1, 2, { label: "QF3", name: "Кухня", phase: "L1", load: 2.8 }),
    makeDevice("rcbo", 1, 6, { label: "QFD1", name: "Пральна машина", phase: "L2", load: 2.2 }),
    makeDevice("relay", 2, 0, { label: "KV1", name: "Реле напруги", phase: "L1" }),
    makeDevice("spd-4p", 2, 6, { label: "SPD1", name: "Імпульсний захист", phase: "3P" }),
  ] });
  const [main, rcd, qf1, qf2, qf3, rcbo, relay, spd] = demo.devices;
  const mainN = { id: uid(), label: "N0", potential: "N", terminals: 8, zone: "bottom", row: 0, slot: 0, ratedCurrent: null, minSection: null, maxSection: null, rcdId: "" };
  const groupN = { ...mainN, id: uid(), label: "N1 · QD1", rcdId: rcd.id };
  const pe = { ...mainN, id: uid(), label: "PE1", potential: "PE" };
  demo.busbars.push(mainN, groupN, pe);
  const dev = (device, portId) => ({ kind: "device", ownerId: device.id, portId });
  const bar = (owner, n) => ({ kind: "busbar", ownerId: owner.id, portId: String(n) });
  const connect = (from, to) => demo.wires.push(E.makeWire(demo, from, to, { section: 6 }));
  E.PHASES.forEach((phase) => connect(dev(main, `${phase}-out`), dev(rcd, `${phase}-in`)));
  connect(dev(main, "N-out"), bar(mainN, 1));
  connect(bar(mainN, 2), dev(rcd, "N-in"));
  connect(dev(rcd, "N-out"), bar(groupN, 1));
  connect(dev(rcd, "L1-out"), dev(qf1, "L-in"));
  demo.combs.push({ id: uid(), label: "BB001", potential: "L1", terminals: [qf1, qf2, qf3].map((device) => dev(device, "L-in")), ratedCurrent: null });
  connect(dev(main, "L2-out"), dev(rcbo, "L-in"));
  connect(bar(mainN, 3), dev(rcbo, "N-in"));
  connect(dev(main, "L1-out"), dev(relay, "L-in"));
  connect(bar(mainN, 4), dev(relay, "N-in"));
  E.PHASES.forEach((phase) => connect(dev(main, `${phase}-out`), dev(spd, `${phase}-in`)));
  connect(bar(mainN, 5), dev(spd, "N-in"));
  connect(bar(pe, 1), dev(spd, "PE"));
  project = demo;
  projects.unshift(clone(demo));
  selectedDeviceId = null; resetWiringSelection(); undoStack = []; redoStack = [];
  persistProject({ immediate: true });
  switchView("board"); setWiringMode(true); closeDrawers(); renderAll();
  requestAnimationFrame(fitBoard);
  toast("Приклад відкрито як окремий проєкт");
}

function initWiring() {
  const dropSurface = $("#wiringSurface");
  dropSurface.addEventListener("dragover", (event) => {
    if (![...(event.dataTransfer?.types || [])].some((type) => ["text/component-type", "text/device-id"].includes(type))) return;
    const wire = closestWireAtPoint(surfacePoint(event.clientX, event.clientY));
    markWireDropTarget(wire?.id);
    if (wire) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes("text/device-id") ? "move" : "copy"; }
  }, true);
  dropSurface.addEventListener("dragleave", (event) => { if (!dropSurface.contains(event.relatedTarget)) markWireDropTarget(); });
  dropSurface.addEventListener("drop", (event) => {
    const point = surfacePoint(event.clientX, event.clientY), wire = closestWireAtPoint(point);
    markWireDropTarget();
    if (!wire) return;
    const type = event.dataTransfer.getData("text/component-type"), deviceId = event.dataTransfer.getData("text/device-id");
    const existing = project.devices.find((device) => device.id === deviceId);
    if (!type && !existing) return;
    event.preventDefault(); event.stopPropagation();
    insertComponentAtWire(type || existing.type, wire.id, point, existing?.id);
  }, true);
  $("#cancelWireInsertionButton").addEventListener("click", () => { selectedWireId = null; wireInsertionPoint = null; renderAll(); });
  $("#insertWireComponentButton").addEventListener("click", () => {
    switchView("board"); setWiringMode(false);
    if (window.innerWidth <= 900) toggleDrawer("library");
  });
  fillColorSelect($("#newWireColor"), "L1", "brown");
  const modeTabs = $$("[data-library-mode]");
  const activateModeTab = (tab) => { switchView("board"); setWiringMode(tab.dataset.libraryMode === "wiring"); };
  modeTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateModeTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? modeTabs.length - 1 : (index + 1) % modeTabs.length;
      activateModeTab(modeTabs[next]);
      modeTabs[next].focus();
    });
  });
  $("#assemblyShowAllWiresButton").addEventListener("click", () => setWireFilter("all"));
  $$('[data-add-busbar]').forEach((button) => button.addEventListener("click", () => createBusbar(button.dataset.addBusbar)));
  $("#cancelWireButton").addEventListener("click", () => cancelPendingWire());
  $("#wireFilters").addEventListener("click", (event) => { const button = event.target.closest("[data-wire-filter]"); if (button) setWireFilter(button.dataset.wireFilter); });
  $("#showWireLabels").addEventListener("change", (event) => { showWireLabels = event.target.checked; scheduleWiringPaint(); });
  $("#showDeviceTerminalsButton").addEventListener("click", () => { setWiringMode(true); closeDrawers(); });
  $("#deleteWireButton").addEventListener("click", () => deleteWiringEntity("wire", selectedWireId));
  $("#reconnectWireFromButton").addEventListener("click", () => startReconnect("from"));
  $("#reconnectWireToButton").addEventListener("click", () => startReconnect("to"));
  $("#deleteBusbarButton").addEventListener("click", () => deleteWiringEntity("busbar", selectedBusbarId));
  $("#deleteCombButton").addEventListener("click", () => deleteWiringEntity("comb", selectedCombId));
  ["wireLabelInput", "wireColorInput", "wireSectionInput", "wireMaterialInput", "wireTypeInput", "wireLengthInput"].forEach((field) => $(`#${field}`).addEventListener("change", updateSelectedWire));
  ["busbarLabelInput", "busbarCountInput", "busbarCurrentInput", "busbarZoneInput", "busbarRowInput", "busbarSlotInput", "busbarRcdInput", "busbarMinInput", "busbarMaxInput"].forEach((field) => $(`#${field}`).addEventListener("change", updateBusbar));
  $("#addRcdNeutralButton").addEventListener("click", () => { const device = project.devices.find((item) => item.id === selectedDeviceId && E.isRcd(item)); if (device) createBusbar("N", device.id); });
  $("#resetWireRouteButton").addEventListener("click", () => { const wire = project.wires.find((item) => item.id === selectedWireId); if (!wire?.points.length) return; snapshot(); wire.points = []; persistProject(); renderAll(); });
  $("#addCombButton").addEventListener("click", () => openCombModal());
  initializeCombEditor();
  $("#applyCombButton").addEventListener("click", applyComb);
  $("#wireCsvButton").addEventListener("click", exportWireCsv);
  $("#printWiresButton").addEventListener("click", () => window.print());
  $("#wiringDemoButton").addEventListener("click", createWiringDemo);
  $("#addPenBarButton").addEventListener("click", () => { if (applyBoardSettings() !== false) createBusbar("PEN"); });
  $("#boardEarthingInput").addEventListener("change", () => { if ($("#boardEarthingInput").value !== "TN-C-S") $("#boardPenSplitInput").checked = false; });
  $("#wiringSurface").addEventListener("pointermove", (event) => { if (!pendingTerminal) return; pendingPointer = surfacePoint(event.clientX, event.clientY); scheduleWiringPaint(); });
  $("#wiringSurface").addEventListener("click", (event) => {
    if (performance.now() < skipSurfaceClickUntil || !pendingTerminal || event.target.closest(".board-device,.busbar-card,.terminal-point,.wire-path,.comb-path,.route-handle")) return;
    pendingPoints.push(surfacePoint(event.clientX, event.clientY));
    scheduleWiringPaint();
  });
  $("#canvas").addEventListener("click", (event) => {
    if (event.button !== 0 || pendingTerminal || reconnectTarget || routeDrag || terminalDrag || performance.now() < skipSurfaceClickUntil) return;
    if (event.target.closest(".board-device,.busbar-card,.consumer-card,.terminal-point,.wire-path,.comb-path,.route-handle,button,input,select,textarea,a")) return;
    if (!selectedDeviceId && !selectedWireId && !selectedBusbarId && !selectedCombId) return;
    selectedDeviceId = null; resetWiringSelection(); renderBoard(); renderInspector(); scheduleWiringPaint();
  });
  document.addEventListener("pointermove", (event) => {
    if (terminalDrag && event.pointerId === terminalDrag.pointerId) {
      if (!terminalDrag.moved && Math.hypot(event.clientX - terminalDrag.x, event.clientY - terminalDrag.y) < 5) return;
      if (!terminalDrag.moved) {
        terminalDrag.moved = true;
        if (!reconnectTarget && pendingTerminal && !E.sameEndpoint(pendingTerminal, terminalDrag.ref)) cancelPendingWire(false);
        if (!pendingTerminal) terminalClicked(E.resolveEndpoint(project, terminalDrag.ref));
      }
      pendingPointer = surfacePoint(event.clientX, event.clientY);
      scheduleWiringPaint();
      return;
    }
    if (!routeDrag || event.pointerId !== routeDrag.pointerId) return;
    const wire = project.wires.find((item) => item.id === routeDrag.wireId);
    if (!wire) return;
    const point = surfacePoint(event.clientX, event.clientY);
    if (!routeDrag.moved && Math.hypot(event.clientX - routeDrag.x, event.clientY - routeDrag.y) < 3) return;
    routeDrag.moved = true;
    routeDrag.points[routeDrag.index] = { x: Math.max(0, Math.min($("#wiringSurface").clientWidth, point.x)), y: Math.max(0, Math.min($("#wiringSurface").clientHeight, point.y)) };
    scheduleWiringPaint();
  });
  document.addEventListener("pointerup", (event) => {
    if (terminalDrag && event.pointerId === terminalDrag.pointerId) {
      const drag = terminalDrag;
      terminalDrag = null;
      skipSurfaceClickUntil = performance.now() + 250;
      if (drag.moved) {
        const node = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-terminal-key]");
        const port = node && terminalGeometry().get(node.dataset.terminalKey)?.port;
        if (port && !E.sameEndpoint(pendingTerminal, port)) terminalClicked(port);
      } else {
        const port = E.resolveEndpoint(project, drag.ref);
        if (port) terminalClicked(port);
      }
    }
    if (routeDrag && event.pointerId === routeDrag.pointerId) {
      const drag = routeDrag, wire = project.wires.find((item) => item.id === drag.wireId);
      routeDrag = null;
      if (wire && drag.moved && JSON.stringify(wire.points) !== JSON.stringify(drag.points)) { snapshot(); wire.points = drag.points; persistProject(); }
      skipSurfaceClickUntil = performance.now() + 250;
      renderAll();
    }
  });
  document.addEventListener("pointercancel", () => {
    if (terminalDrag) { terminalDrag = null; cancelPendingWire(); }
    cancelRouteDrag();
  });
  document.addEventListener("keydown", (event) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable || $(".modal-backdrop:not(.hidden)")) return;
    if (event.key.toLowerCase() === "w" && !event.ctrlKey && !event.metaKey) { event.preventDefault(); switchView("board"); setWiringMode(!wiringMode); }
  });
}

;
/* comb-ui.js */
/* Terminal-based comb accessories. Electrical.saveComb owns validation. */
let combEditingId = null;
let combChoice = new Map();

function combRange() {
  const start = $("#combStartInput").valueAsNumber, end = $("#combEndInput").valueAsNumber;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > project.board.modulesPerRow) return null;
  return { start: start - 1, end: end - 1 };
}

function combRangePorts(range = combRange()) {
  if (!range) return [];
  const options = {
    row: Number($("#combRowInput").value),
    potential: $("#combPotentialInput").value,
    side: $("#combSideInput").value,
    excludeId: combEditingId || "",
  };
  return E.combCandidates(project, options).filter(({ device }) => device.slot >= range.start && device.slot <= range.end);
}

function combFormInput(terminals) {
  return { id: combEditingId || undefined, label: $("#combLabelInput").value.trim(), potential: $("#combPotentialInput").value, terminals, ratedCurrent: $("#combCurrentInput").value, contactType: $("#combContactInput").value, series: $("#combSeriesInput").value };
}

function combPortChecked(port) {
  return !port.occupied && (combChoice.get(E.endpointKey(port)) ?? !combEditingId);
}

function updateCombChoiceStatus(ports = combRangePorts()) {
  const available = ports.filter((port) => !port.occupied);
  const selectedCount = available.filter(combPortChecked).length;
  $("#combChoiceCount").textContent = `${selectedCount} / ${available.length}`;
  $("#applyCombButton").disabled = selectedCount < 2;
  $("#combSelectGroup").disabled = available.filter((port) => combChoice.get(E.endpointKey(port)) !== false).length < 2;
  $("#combError").textContent = combRange() ? "" : "Перевірте діапазон модулів гребінки.";
}

function renderCombChoices() {
  const range = combRange(), ports = combRangePorts(range);
  $("#combTerminalChoices").innerHTML = ports.map((port) => `
    <label class="comb-terminal-choice ${port.occupied ? "unavailable" : ""}">
      <input type="checkbox" data-comb-key="${escapeHtml(E.endpointKey(port))}" ${combPortChecked(port) ? "checked" : ""} ${port.occupied ? "disabled" : ""}/>
      <span><strong>${escapeHtml(port.ownerLabel)} · ${escapeHtml(port.label)} · ${port.potential}</strong>
      <small>${escapeHtml(port.device.name)}${port.occupied ? " · клема зайнята гребінкою" : ""}</small></span>
    </label>`).join("") || (range ? '<p class="model-note">У цьому діапазоні немає відповідних клем.</p>' : "");
  updateCombChoiceStatus(ports);
}

function openCombModal(id) {
  const existing = project.combs.find((comb) => comb.id === id), first = existing?.terminals[0];
  const selected = project.devices.find((device) => device.id === (first?.ownerId || selectedDeviceId));
  combEditingId = existing?.id || null;
  combChoice = new Map((existing?.terminals || []).map((ref) => [E.endpointKey(ref), true]));
  $("#combModalTitle").textContent = existing ? "Редагувати гребінку" : "Додати гребінку";
  $("#applyCombButton").textContent = existing ? "Зберегти зміни" : "Додати гребінку";
  $("#combLabelInput").value = existing?.label || E.nextLabel(project.combs, "BB");
  $("#combRowInput").innerHTML = Array.from({ length: project.board.rows }, (_, row) => `<option value="${row}">DIN ${row + 1}</option>`).join("");
  $("#combRowInput").value = selected?.row || 0;
  const moduleCount = project.board.modulesPerRow;
  $("#combStartInput").max = $("#combEndInput").max = moduleCount;
  $("#combStartInput").value = 1;
  $("#combEndInput").value = moduleCount;
  $("#combPotentialInput").value = existing?.potential || (E.PHASES.includes(selected?.phase) ? selected.phase : "L1");
  $("#combSideInput").value = first ? E.resolveEndpoint(project, first)?.side || "top" : "top";
  $("#combCurrentInput").value = existing?.ratedCurrent || "";
  $("#combContactInput").value = existing?.contactType || "";
  $("#combSeriesInput").value = existing?.series || "";
  $("#combReplaceJumpers").checked = false;
  $("#combDetails").open = false;
  renderCombChoices();
  openModal("#combModal");
}

function selectCombGroup() {
  const ports = combRangePorts().filter((port) => !port.occupied && combChoice.get(E.endpointKey(port)) !== false);
  const first = ports.find((port) => port.ownerId === selectedDeviceId)
    || ports.find((port) => combChoice.get(E.endpointKey(port)) === true)
    || ports.find((port) => /^(mcb-|rcbo|rccb-)/.test(port.device.type))
    || ports[0];
  if (!first || ports.length < 2) return;
  const chosen = [E.refOf(first)];
  ports.filter((port) => !E.sameEndpoint(port, first)).forEach((port) => {
    try { E.saveComb(project, combFormInput([...chosen, E.refOf(port)])); chosen.push(E.refOf(port)); } catch { /* Another protected group remains unchecked. */ }
  });
  const chosenKeys = new Set(chosen.map(E.endpointKey));
  ports.forEach((port) => { const key = E.endpointKey(port); combChoice.set(key, chosenKeys.has(key)); });
  renderCombChoices();
}

function applyComb() {
  const range = combRange();
  if (!range) return;
  const terminals = combRangePorts(range).filter(combPortChecked).map(E.refOf);
  try {
    const result = E.saveComb(project, combFormInput(terminals), { replaceJumpers: $("#combReplaceJumpers").checked });
    snapshot(); project = result.project; persistProject();
    $("#combModal").classList.add("hidden"); selectedCombId = result.combId;
    selectedWireId = selectedBusbarId = selectedDeviceId = null;
    renderAll(); toast("Гребінку підключено до вибраних клем.");
  } catch (error) { $("#combError").textContent = error.message; }
}
function initializeCombEditor() {
  $("#editCombButton").addEventListener("click", () => openCombModal(selectedCombId));
  ["#combRowInput", "#combPotentialInput", "#combSideInput"].forEach((selector) => $(selector).addEventListener("change", renderCombChoices));
  ["#combStartInput", "#combEndInput"].forEach((selector) => $(selector).addEventListener("input", renderCombChoices));
  $("#combTerminalChoices").addEventListener("change", (event) => {
    const key = event.target.dataset.combKey;
    if (!key) return;
    combChoice.set(key, event.target.checked);
    updateCombChoiceStatus();
  });
  $("#combSelectGroup").addEventListener("click", selectCombGroup);
}

;
/* project-issues.js */
/* Grouping and destinations use issue IDs, never translated message parsing. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PanelProjectIssues = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const supplyFields = { "supply-voltage": "voltage", "unsupported-voltage": "voltage", "source-data": "dataConfirmed", earthing: "earthing", "earthing-changed": "earthing", "tt-review": "earthing", installation: "installationMethod", "feeder-iz": "feederIzA", "incoming-i2": "i2A", "fault-max": "maxIccA", "upstream-drop": "upstreamDropPct", "contract-power": "contractKw", "contract-overload": "contractKw", "surge-review": "surgeAssessment", "incoming-icn": "icnA", "feeder-overload": "feederIzA", "feeder-conventional": "i2A" };
  const circuitFields = { "circuit-purpose": "purpose", "load-input": "load", "breaker-rating": "rating", "minimum-section": "cable", "branch-overload": "rating", "branch-iz": "izA", "cable-source": "cableSource", "cable-overload": "izA", "conventional-trip": "i2A", "conventional-overload": "i2A", "branch-icn": "icnA", "fault-min": "minFaultA", "magnetic-trip": "minFaultA", "cable-length": "lengthM", "voltage-drop": "lengthM", rcd: "rcdId", "bath-afdd": "purpose", "group-rcd-missing": "rcdId", "parallel-outputs": "outputId", "unregistered-consumer": "outputId" };
  Object.assign(supplyFields, { revision: "dataConfirmed", "feeder-section": "feederSection", "feeder-section-mismatch": "feederSection", "incoming-i2-range": "i2A", "feeder-thermal-data": "shortCircuitK", "feeder-thermal": "letThroughA2s" });
  Object.assign(circuitFields, { "conventional-range": "i2A", "fault-range": "minFaultA", "branch-thermal-data": "shortCircuitK", "branch-thermal": "letThroughA2s" });
  supplyFields["feeder-thermal-time"] = "shortCircuitTimeS";
  circuitFields["branch-thermal-time"] = "shortCircuitTimeS";
  function target(project, issue) {
    const id = issue.entityId, device = project.devices.find((d) => d.id === id);
    if (["floor-circuits-pending", "floor-point-circuit"].includes(issue.code)) return { view: "floor", field: "floorCircuitsMode", label: "Перевірити кола плану" };
    if (issue.code === "floor-length-review" || issue.code === "floor-length-stale") return { view: "floor", field: issue.code === "floor-length-review" ? "floorConfirmedInput" : "floorSyncButton", circuitId: id, label: "Перевірити план" };
    if (id === "board" && supplyFields[issue.code]) return { view: "design", supply: supplyFields[issue.code], label: "Заповнити дані" };
    if (device && circuitFields[issue.code] && project.design?.circuits.some((c) => c.deviceId === id)) return { view: "design", entityId: id, field: circuitFields[issue.code], label: "Перевірити параметр" };
    for (const [kind, list] of [["device", project.devices], ["wire", project.wires], ["busbar", project.busbars], ["comb", project.combs], ["consumer", project.consumers]]) if (list?.some((item) => item.id === id)) return { view: "board", kind, entityId: id, label: "Показати на компоновці" };
    return { view: "design", entityId: id !== "board" ? id : "", label: id === "board" ? "Перевірити вихідні дані" : "Перевірити коло" };
  }
  function groups(project, issues) {
    const map = new Map();
    issues.forEach((issue, index) => {
      const key = issue.entityId || "board", entity = [...project.devices, ...(project.consumers || []), ...(project.busbars || []), ...(project.wires || []), ...(project.combs || [])].find((item) => item.id === key);
      if (!map.has(key)) map.set(key, { key, title: key === "board" ? "Ввід і вихідні дані" : entity ? `${entity.name || "З’єднання"}${entity.label ? ` · ${entity.label}` : ""}` : "Видалене або непризначене коло", errors: 0, pending: 0, items: [] });
      const group = map.get(key); group[issue.level === "error" ? "errors" : "pending"]++;
      group.items.push({ ...issue, index, target: target(project, issue) });
    });
    for (const group of map.values()) group.items.sort((a, b) => Number(b.level === "error") - Number(a.level === "error"));
    return [...map.values()].sort((a, b) => Number(b.errors > 0) - Number(a.errors > 0));
  }
  return { groups, target };
});

;
/* project-issues-ui.js */
function projectIssueGroupsMarkup(calc) {
  const groups = PanelProjectIssues.groups(project, calc.issues);
  if (!groups.length) return '<ul class="design-issues"><li class="pass"><b>✓</b><span>Перевірки заданої розрахункової моделі пройдені.</span></li></ul>';
  return `<p class="design-description">${groups.length} груп зауважень. Розгорніть потрібне коло й перейдіть до його параметра або компонента.</p>${groups.map((group) => `<details class="design-issue-group" data-issue-group="${escapeHtml(group.key)}" ${group.errors ? "open" : ""}><summary><strong>${escapeHtml(group.title)}</strong><span>${group.errors ? `Помилки: ${group.errors}` : ""}${group.errors && group.pending ? " · " : ""}${group.pending ? `Уточнення: ${group.pending}` : ""}</span></summary>${project.devices.some((d) => d.id === group.key) ? `<div class="design-issue-actions"><button type="button" class="issue-location" data-issue-object="${escapeHtml(group.key)}">Показати апарат на компоновці →</button></div>` : ""}<ul class="design-issues">${group.items.map((issue) => `<li class="${issue.level}"><b>${issue.level === "error" ? "!" : "…"}</b><div><span>${escapeHtml(issue.text)}</span><button type="button" class="issue-location" data-issue-index="${issue.index}">${issue.target.label} →</button></div></li>`).join("")}</ul></details>`).join("")}`;
}
function revealIssueField(input) {
  if (!input) return false;
  let parent = input.parentElement;
  while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
  input.scrollIntoView({ block: "center" }); input.focus({ preventScroll: true });
  input.classList.add("issue-target"); setTimeout(() => input.classList.remove("issue-target"), 2400);
  return true;
}
function navigateProjectIssue(issue) {
  const target = PanelProjectIssues.target(project, issue); closeDrawers();
  if (target.view === "floor" && project.floorPlan) {
    if (target.field === "floorCircuitsMode") { switchView("floor"); openFloorCircuits(); revealIssueField($("#floorCircuitsMode")); return; }
    switchView("floor"); floorCircuitId = target.circuitId || ""; requestFloorSidebar("settings"); renderFloorPlan();
    revealIssueField($(`#${target.field}`)); return;
  }
  if (target.view === "board") {
    switchView("board");
    if (target.kind === "device") chooseDevice(target.entityId);
    else if (target.kind === "consumer") { const consumer = project.consumers.find((c) => c.id === target.entityId); if (consumer?.deviceId) chooseDevice(consumer.deviceId); else { resetWiringSelection(); selectedDeviceId = null; renderInspector(); } }
    else chooseWiringEntity(target.kind, target.entityId);
    if (window.innerWidth <= 900) toggleDrawer("inspector");
    const node = $(target.kind === "device" ? `[data-device-id="${CSS.escape(target.entityId)}"]` : target.kind === "consumer" ? `[data-consumer-id="${CSS.escape(target.entityId)}"]` : target.kind === "wire" ? `[data-wire-id="${CSS.escape(target.entityId)}"]` : `#${target.kind}Inspector`);
    revealIssueField(node || $(".inspector-panel")); return;
  }
  switchView("design");
  const report = $("#designReport");
  let input = target.supply ? report.querySelector(`[data-design-supply="${CSS.escape(target.supply)}"]`) : target.field ? report.querySelector(`[data-circuit-id="${CSS.escape(target.entityId)}"][data-design-circuit="${target.field}"], [data-circuit-id="${CSS.escape(target.entityId)}"][data-design-device="${target.field}"]`) : target.entityId ? report.querySelector(`[data-design-details="${CSS.escape(target.entityId)}"] > summary, [data-remove-design-circuit="${CSS.escape(target.entityId)}"]`) : null;
  if (!input) input = report.querySelector(".design-inputs");
  if (input && !input.hasAttribute("tabindex") && !["INPUT", "SELECT", "BUTTON", "SUMMARY"].includes(input.tagName)) input.tabIndex = -1;
  revealIssueField(input);
}
function initProjectIssues() {
  let printedGroups = [];
  window.addEventListener("beforeprint", () => {
    if (printedGroups.length) return;
    printedGroups = [...document.querySelectorAll("[data-issue-group]")].map((node) => ({ node, open: node.open }));
    printedGroups.forEach(({ node }) => { node.open = true; });
  });
  window.addEventListener("afterprint", () => {
    printedGroups.forEach(({ node, open }) => { node.open = open; }); printedGroups = [];
  });
  $("#designReport").addEventListener("click", (event) => {
    const object = event.target.closest("[data-issue-object]"); if (object) { navigateProjectIssue({ entityId: object.dataset.issueObject, code: "object-location" }); return; }
    const button = event.target.closest("[data-issue-index]"); if (!button) return;
    const issue = D.calculate(project)?.issues[Number(button.dataset.issueIndex)]; if (issue) navigateProjectIssue(issue);
  });
}

;
/* templates-ui.js */
/* Template chooser, calculation schedule, and customer layout approval. */
const D = PanelDesign;
const TEMPLATE_SEEN_KEY = "electropanel.v3.templates-seen.v1";
let chosenTemplateId = D.TEMPLATES[0].id;
let preserveDesignEditor = false;
let designInputTransaction = null;

function openTemplateChooser() {
  closeDrawers();
  $$(".modal-backdrop").forEach((modal) => modal.classList.add("hidden"));
  $("#templateCurrentProject").textContent = project.name;
  selectTemplate(chosenTemplateId);
  openModal("#templateModal");
}

function selectTemplate(id) {
  chosenTemplateId = id;
  const template = D.TEMPLATES.find((item) => item.id === id);
  $("#templatePhases").value = template.phases;
  $("#templateInputA").value = template.inputA;
  $("#templateVoltageRelay").disabled = template.phases !== 1;
  $("#templateVoltageRelay").checked = false;
  $("#templateSurgeProtection").checked = false;
  $("#templateCards").innerHTML = D.TEMPLATES.map((item) => `<button class="template-card ${item.id === id ? "selected" : ""}" type="button" data-template="${item.id}" aria-pressed="${item.id === id}"><span class="template-card-top"><i>${item.icon}</i><small>${item.circuits.length} кіл</small></span><strong>${item.title}</strong><span>${item.description}</span><b>${item.phases === 3 ? "Трифазний" : "Однофазний"} базовий варіант <em>↗</em></b></button>`).join("");
  updateTemplatePreview();
}

function templateSettings() {
  return { phases: $("#templatePhases").value, inputA: $("#templateInputA").value, earthing: $("#templateEarthing").value, contractKw: $("#templateContractKw").value, profile: "UA", country: "UA", protectionScheme: $("#templateProtectionScheme").value, voltageRelay: $("#templateVoltageRelay").checked && $("#templatePhases").value === "1", surgeProtection: $("#templateSurgeProtection").checked };
}

function protectionPlanMarkup(p) {
  const rows = D.protectionPlan(p);
  const counts = [[rows.filter((row) => row.kind === "group").length, "Автомати 1P"], [(p.design.rcdGroups || []).length, "ПЗВ"], [rows.filter((row) => row.kind === "rcbo").length, "Дифавтомати"]].filter(([count]) => count).map(([count, title]) => `${title}: ${count}`).join(" · ");
  return `<details class="protection-plan" data-design-details="protection-plan"><summary>Підбір захисту кіл · ${counts}</summary><p>Автомат захищає від перевантаження й КЗ; ПЗВ — від диференційного струму. Для розеток звичайний автомат працює разом із ПЗВ. Дифавтомат поєднує обидві функції.</p><div class="protection-plan-scroll"><table><thead><tr><th>Коло</th><th>Встановлено</th><th>Вибір та умови</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td class="${row.kind === "unprotected" ? "text-error" : ""}">${escapeHtml(row.title)}</td><td>${escapeHtml(row.reason)}</td></tr>`).join("")}</tbody></table></div><p>Групування й окремі дифавтомати — проєктний вибір. Номінали, витоки та тип дифзахисту для інверторних приладів потрібно звірити за даними об’єкта й паспортами. ПЗВ має бути захищене від надструму; після нього потрібна окрема N-шина.</p></details>`;
}

function updateTemplatePreview() {
  $("#templateVoltageRelay").disabled = $("#templatePhases").value !== "1";
  try {
    const preview = D.createTemplate(chosenTemplateId, templateSettings());
    const calc = D.calculate(preview);
    $("#templatePreview").innerHTML = `<div><span>${preview.board.rows * preview.board.modulesPerRow} модулів · ${preview.board.rows} DIN-рейок × ${preview.board.modulesPerRow}</span><strong>${preview.design.circuits.length} захищених кіл</strong><p>Ввід, ${preview.devices.some((device) => device.type.startsWith("spd-")) ? "ПЗІП T2, " : ""}${preview.design.protectionScheme === "rcbo" ? "дифавтомати типу A / 30 мА на кожне коло" : preview.design.protectionScheme === "balanced" ? "автомати 1P під груповими ПЗВ типу A / 30 мА для частини загальних розеток; освітлення й окремі прилади — на дифавтоматах" : "групові ПЗВ типу A / 30 мА й автомати 1P; окремі дифавтомати для вологих приміщень"}, ${preview.design.voltageRelayId ? "реле напруги, " : ""}окремі N/PE та ${preview.wires.length} з’єднань. ПВДП додається вручну з бібліотеки.</p></div><div><span>Задані прикладні навантаження</span><strong>${number(calc.powerKw)} кВт</strong><p>${Object.entries(calc.phaseCurrents).filter(([phase]) => preview.design.supply.phases === 3 || phase === "L1").map(([phase, amps]) => `${phase}: ${number(amps)} A`).join(" · ")}</p></div>${protectionPlanMarkup(preview)}<p class="template-scope">${escapeHtml(preview.design.scope)} Навантаження, довжини й номінали — початкові припущення для редагування, не дані вашого об’єкта. Потребу в ПЗІП та ПВДП слід звірити для конкретної установки.</p>${calc.errors.length ? `<p class="template-error">${escapeHtml(calc.errors[0].text)} Після створення можна змінити параметри.</p>` : ""}`;
    $("#createTemplateButton").disabled = false;
  } catch (error) {
    $("#templatePreview").textContent = error.message;
    $("#createTemplateButton").disabled = true;
  }
}

function createChosenTemplate() {
  try {
    const created = D.createTemplate(chosenTemplateId, templateSettings());
    persistProject({ immediate: true });
    project = created;
    projects.unshift(clone(created));
    selectedDeviceId = null;
    resetWiringSelection(); undoStack = []; redoStack = [];
    persistProject({ immediate: true });
    PStore.writeString(browserStorage, TEMPLATE_SEEN_KEY, "1");
    $("#templateModal").classList.add("hidden");
    setWireFilter("all"); setWiringMode(false); switchView("board");
    renderAll(); requestAnimationFrame(fitBoard);
    if (typeof starterIntent !== "undefined" && starterIntent === "floor") switchView("floor");
    toast("Типовий щит створено з проводкою. Вихідні дані та перевірки — у «Розрахунки».");
  } catch (error) { toast(error.message, "error"); }
}

function reportField(label, field, value, type = "number", extras = "", circuitId = "", isDevice = false) {
  const binding = isDevice ? `data-design-device="${field}"` : circuitId ? `data-design-circuit="${field}"` : `data-design-supply="${field}"`;
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="${type}" ${binding} ${circuitId ? `data-circuit-id="${escapeHtml(circuitId)}"` : ""} value="${escapeHtml(value ?? "")}" ${extras}/></label>`;
}

function renderDesignReport() {
  const target = $("#designReport");
  if (!target) return;
  const expanded = [...target.querySelectorAll("details[open][data-design-details]")].map((node) => node.dataset.designDetails);
  const calc = D.calculate(project);
  ["#designCsvButton", "#printDesignButton"].forEach((id) => { $(id).disabled = !calc; });
  $("#designProjectNotice").classList.toggle("hidden", !calc);
  if (!calc) {
    target.innerHTML = `<div class="design-empty"><span>⌂</span><h2>Почніть із типового житлового щита</h2><p>Готові компоновки містять проводку до споживачів та відомість вихідних даних для розрахунку. Клемники за потреби додаються з каталогу.</p><button class="button primary" type="button" data-open-template>Вибрати готовий щит</button></div>`;
    return;
  }
  const supply = project.design.supply;
  const shown = (value) => escapeHtml(value ?? "—");
  $("#designNoticeText").textContent = `${calc.status} · ${calc.approvalCurrent ? "компоновку погоджено" : "типовий проєкт"}`;
  const badge = $("#projectStatus");
  badge.className = `status-pill ${calc.errors.length || calc.missing.length ? "warning" : "success"}`;
  badge.setAttribute("aria-controls", "designIssues");
  badge.textContent = calc.errors.length ? "Є помилки" : calc.missing.length ? "Неповні дані" : "Перевірки розрахунку";
  const approval = project.design.approval;
  const issueGroups = projectIssueGroupsMarkup(calc);
  const issueOpen = new Map([...target.querySelectorAll("[data-issue-group]")].map((node) => [node.dataset.issueGroup, node.open]));
  const markup = `<div class="design-summary">
    <div class="design-state ${calc.errors.length ? "error-state" : ""}"><span class="eyebrow">${escapeHtml(project.name)}</span><h2>${calc.status}</h2><p>${calc.errors.length} помилок · ${calc.missing.length} пунктів вихідних даних · нормативний профіль ${project.design.profile === "UA" ? "Україна" : `Європа · ${escapeHtml(project.design.country || "країна не задана")}`}</p><small>Ревізія ${escapeHtml(project.design.revision)} · джерела перевірено ${D.VERIFIED_DATE}</small></div>
    <div class="design-metric"><span>Розрахункова потужність</span><strong>${number(calc.powerKw)} <small>кВт</small></strong><p>${Object.entries(calc.phaseCurrents).map(([phase, amps]) => `${phase}: ${number(amps)} A`).join(" · ")}</p></div>
  </div>
  <p class="design-assumptions">Вихідні дані: ${shown(supply.phases)} фаз(и), ${shown(supply.voltage)} В фаза–N; ${escapeHtml(supply.earthing || "заземлення не визначено")}; договір ${shown(supply.contractKw)} кВт; ввід Iz ${shown(supply.feederIzA)} A, I2 ${shown(supply.i2A)} A, Icn ${shown(supply.icnA)} A; Iкз max ${shown(supply.maxIccA)} A; ΔU до щита ${shown(supply.upstreamDropPct)}%. Умови: ${escapeHtml(supply.installationMethod || "не вказані")}.</p>
  <div class="design-section design-inputs"><h3>1. Вихідні дані об’єкта</h3><p class="design-description">Номінали та перерізи у шаблоні попередні. Iz береться з перевіреного джерела після врахування способу прокладання, температури й групування.</p><div class="design-input-grid">
    ${reportField("Дозволена потужність, кВт", "contractKw", supply.contractKw, "number", 'min="0.1" step="0.1"')}
    ${reportField("Напруга фаза–N, В (профіль 230/400 В)", "voltage", supply.voltage, "number", 'min="1" step="1"')}
    ${reportField("Iz ввідного кабелю, A", "feederIzA", supply.feederIzA, "number", 'min="1" step="0.1"')}
    ${reportField("Переріз ввідного кабелю Cu, мм²", "feederSection", supply.feederSection, "number", 'min="1.5" step="0.5"')}
    ${reportField("I2 ввідного апарата, A", "i2A", supply.i2A, "number", 'min="1" step="0.1"')}
    ${reportField("Макс. очікуваний струм КЗ, A", "maxIccA", supply.maxIccA, "number", 'min="1" step="1"')}
    ${reportField("Вимикальна здатність вводу, A", "icnA", supply.icnA, "number", 'min="1" step="1"')}
    ${reportField("Падіння напруги до щита, %", "upstreamDropPct", supply.upstreamDropPct, "number", 'min="0" step="0.1"')}
    <label class="field"><span>Заземлення на вводі</span><select data-design-supply="earthing"><option value="">Потрібно визначити</option>${["TN-S", "TN-C-S", "TT"].map((value) => `<option ${supply.earthing === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    ${reportField("Прокладання, температура, групування", "installationMethod", supply.installationMethod, "text", 'maxlength="240"')}
    ${reportField("ПЗІП: оцінка потреби / захист будівлі", "surgeAssessment", supply.surgeAssessment, "text", 'maxlength="500"')}
  </div><details class="design-editor"><summary>Термічна стійкість ввідного кабелю при КЗ</summary><p class="design-description">I²t ≤ k²S² для часу до 5 с. I²t — пропущена енергія в A²·с із характеристики конкретного автомата для всього очікуваного діапазону КЗ. Це не I2 (струм у A). k задається за матеріалом, ізоляцією й температурами кабелю.</p><div class="design-input-grid">
    ${reportField("Коефіцієнт k кабелю", "shortCircuitK", supply.shortCircuitK, "number", 'min="1" step="1"')}
    ${reportField("Гранична I²t апарата, A²·с", "letThroughA2s", supply.letThroughA2s, "number", 'min="1" step="1"')}
    ${reportField("Найбільший час вимкнення при КЗ, с", "shortCircuitTimeS", supply.shortCircuitTimeS, "number", 'min="0.001" max="5" step="0.001"')}
    ${reportField("Джерело k, I²t, діапазон КЗ та час ≤5 с", "shortCircuitSource", supply.shortCircuitSource, "text", 'maxlength="500"')}
  </div></details><label class="check-label design-confirm"><input type="checkbox" data-design-supply="dataConfirmed" ${supply.dataConfirmed ? "checked" : ""}/> Вихідні дані звірено з ТУ/договором, паспортами та обстеженням. У TN-C-S поділ PEN виконано до цього щита.</label></div>
  ${(project.design.rcdGroups || []).length ? `<div class="design-section"><h3>Групові ПЗВ та координація захисту</h3><p class="design-description">Автомат 1P захищає від надструму, групове ПЗВ — від диференційного струму. За кожним ПЗВ потрібна окрема N-шина. Ванна має окремий дифавтомат. Потреба в ПВДП перевіряється окремо; у базовому складі його немає.</p>${project.design.rcdGroups.map((group) => `<div class="design-input-grid"><strong>${escapeHtml(project.devices.find((device) => device.id === group.deviceId)?.label || "ПЗВ")}</strong><label class="field"><span>Умовна стійкість до КЗ, A</span><input type="number" min="1" data-design-group="conditionalIccA" data-group-id="${escapeHtml(group.deviceId)}" value="${escapeHtml(group.conditionalIccA ?? "")}"/></label><label class="field"><span>Паспорт / узгоджений захист</span><input data-design-group="coordinationSource" data-group-id="${escapeHtml(group.deviceId)}" value="${escapeHtml(group.coordinationSource || "")}" maxlength="240"/></label></div>`).join("")}</div>` : ""}
  <div class="design-section"><h3>2. Розрахункова відомість кіл</h3><p class="design-description">Ib = P × k / (U × cosφ). Коефіцієнт одночасності k задає проєктувальник; початково k = 1. Падіння напруги включає ділянку до щита. Метод оцінки кабелю: Cu, R = 23,7/S Ω/км, X = 0,08 Ω/км.</p>
    <div class="design-table-scroll"><table class="design-table"><thead><tr><th>Коло</th><th>Призначення</th><th>Фаза</th><th>P, кВт</th><th>k / cosφ</th><th>L, м</th><th>In, A</th><th>S, мм²</th><th>Iz / I2, A</th><th>Ib, A</th><th>ΔU, %</th><th>Стан</th></tr></thead><tbody>${calc.rows.map((row) => {
      const errors = calc.errors.filter((issue) => issue.entityId === row.device.id || row.wireIds.includes(issue.entityId)).length;
      const missing = calc.missing.filter((issue) => issue.entityId === row.device.id || row.wireIds.includes(issue.entityId)).length;
      return `<tr><td><strong>${escapeHtml(row.device.label)}</strong></td><td>${escapeHtml(row.device.name)}</td><td>${shown(row.device.phase)}</td><td>${number(row.device.load)}</td><td>${shown(row.spec.diversity)} / ${shown(row.spec.powerFactor)}</td><td>${shown(row.spec.lengthM)}</td><td>${row.rating?.amps ?? "—"}</td><td>${number(row.section)}</td><td>${shown(row.spec.izA)} / ${shown(row.spec.i2A)}</td><td>${row.ib === null ? "—" : number(row.ib)}</td><td>${row.totalDrop === null ? "—" : `${number(row.totalDrop)} / ${row.limit}`}</td><td class="${errors ? "text-error" : missing ? "text-pending" : "text-pass"}">${errors ? `${errors} пом.` : missing ? "Дані" : "Розрах. ✓"}</td></tr>`;
    }).join("")}</tbody></table></div>
    ${protectionPlanMarkup(project)}
    <details class="design-editor" data-design-details="editor"><summary>Редагувати кола й технічні дані</summary>${calc.rows.map((row) => `<details class="design-circuit" data-design-details="${escapeHtml(row.device.id)}"><summary>${escapeHtml(row.device.label)} · ${escapeHtml(row.device.name)}</summary><div class="design-input-grid">
      ${reportField("Призначення", "name", row.device.name, "text", 'maxlength="100"', row.device.id, true)}
      <label class="field"><span>Групове ПЗВ для автомата 1P</span><select data-design-circuit="rcdId" data-circuit-id="${escapeHtml(row.device.id)}"><option value="">Власний дифзахист апарата</option>${project.devices.filter((device) => device.type.startsWith("rccb-")).map((device) => `<option value="${escapeHtml(device.id)}" ${row.spec.rcdId === device.id ? "selected" : ""}>${escapeHtml(device.label)} · ${escapeHtml(device.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Тип кола</span><select data-design-circuit="purpose" data-circuit-id="${escapeHtml(row.device.id)}"><option value="">Визначте тип</option>${[["lighting", "Освітлення"], ["general", "Загальне / розетки"], ["bath", "Ванна / душова"]].map(([key, label]) => `<option value="${key}" ${typeof row.spec.lighting === "boolean" && typeof row.spec.wet === "boolean" && (row.spec.wet ? "bath" : row.spec.lighting ? "lighting" : "general") === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>Споживач / вихід кола</span><select data-design-circuit="outputId" data-circuit-id="${escapeHtml(row.device.id)}"><option value="">Оберіть споживача або власний клемник</option>${[...(project.consumers || []), ...project.devices.filter((device) => device.type === "outgoing-terminal")].map((device) => `<option value="${escapeHtml(device.id)}" ${row.spec.outputId === device.id ? "selected" : ""}>${escapeHtml(device.label)} · ${escapeHtml(device.name)}</option>`).join("")}</select></label>
      ${reportField("Потужність, кВт", "load", row.device.load, "number", 'min="0" step="0.1"', row.device.id, true)}
      ${reportField("Номінал, напр. B16 / A / 30mA", "rating", row.device.rating, "text", 'maxlength="40"', row.device.id, true)}
      ${reportField("Переріз Cu, мм²", "cable", row.device.cable, "number", 'min="1.5" step="0.5"', row.device.id, true)}
      ${reportField("cosφ", "powerFactor", row.spec.powerFactor, "number", 'min="0.7" max="1" step="0.01"', row.device.id)}
      ${reportField("Коефіцієнт одночасності k", "diversity", row.spec.diversity, "number", 'min="0" max="1" step="0.05"', row.device.id)}
      ${reportField("Довжина, м", "lengthM", row.spec.lengthM, "number", 'min="1" step="1"', row.device.id)}
      ${reportField("Iz після поправок, A", "izA", row.spec.izA, "number", 'min="1" step="0.1"', row.device.id)}
      ${reportField("Умовний струм вимкнення I2, A", "i2A", row.spec.i2A, "number", 'min="1" step="0.1"', row.device.id)}
      ${reportField("Вимикальна здатність, A", "icnA", row.spec.icnA, "number", 'min="1" step="1"', row.device.id)}
      ${reportField("Мін. струм КЗ у кінці, A", "minFaultA", row.spec.minFaultA, "number", 'min="1" step="1"', row.device.id)}
      ${reportField("Джерело Iz / умови прокладання", "cableSource", row.spec.cableSource, "text", 'maxlength="240"', row.device.id)}
      ${reportField("Коефіцієнт k кабелю для КЗ", "shortCircuitK", row.spec.shortCircuitK, "number", 'min="1" step="1"', row.device.id)}
      ${reportField("Гранична I²t автомата, A²·с", "letThroughA2s", row.spec.letThroughA2s, "number", 'min="1" step="1"', row.device.id)}
      ${reportField("Найбільший час вимкнення при КЗ, с", "shortCircuitTimeS", row.spec.shortCircuitTimeS, "number", 'min="0.001" max="5" step="0.001"', row.device.id)}
      ${reportField("Джерело k, I²t, діапазон КЗ та час ≤5 с", "shortCircuitSource", row.spec.shortCircuitSource, "text", 'maxlength="500"', row.device.id)}
    </div><button class="button ghost" type="button" data-remove-design-circuit="${escapeHtml(row.device.id)}">Видалити коло</button></details>`).join("")}${project.design.circuits.filter((record) => !project.devices.some((device) => device.id === record.deviceId)).map((record) => `<p class="design-description">Апарат кола видалений. <button type="button" class="button ghost" data-remove-design-circuit="${escapeHtml(record.deviceId)}">Прибрати коло з відомості</button></p>`).join("")}</details>
  </div>
  <div class="design-section" id="designIssues" tabindex="-1"><h3>3. Перевірки й межі розрахунку</h3><div class="design-issue-groups">${issueGroups}</div><div class="engineering-review"><strong>Інженерна перевірка очікується</strong><p>${calc.engineeringReview}</p><p>Перевірка мінімального КЗ оцінює верхню межу миттєвої зони B/C/D і не замінює часову характеристику конкретного виробу. Робота виконується для України; застосовні редакції ДСТУ й паспортні дані потребують звірення.</p></div></div>
  <div class="design-section design-approval"><h3>4. Погодження компоновки замовником</h3><p class="design-description">Погоджується склад і розташування обладнання. Це не дозвіл до монтажу й не підтвердження нормативної відповідності. Зміна проєкту скасовує актуальність погодження.</p>${approval ? `<div class="approval-state ${calc.approvalCurrent ? "current" : "stale"}">${calc.approvalCurrent ? "Компоновку погоджено" : "Погодження застаріло після змін"} · ${escapeHtml(approval.name)} · ${formatDate(approval.at)}</div>` : ""}<div class="approval-form"><label class="field"><span>Хто погоджує</span><input id="layoutApprovalName" maxlength="100" placeholder="Ім’я або організація"/></label><button class="button primary" type="button" id="approveLayoutButton" ${calc.errors.length ? "disabled" : ""}>Погодити компоновку</button></div></div>
  <div class="design-section design-sources"><h3>Нормативна база та методики</h3><p class="design-description">Чинні редакції ДСТУ/EN/HD та їхні національні зміни потрібно звіряти для конкретного об’єкта. ГОСТ не застосовується автоматично за назвою.</p>${D.SOURCES.map((source) => `<article><a href="${source.url}" target="_blank" rel="noopener">${escapeHtml(source.title)} ↗</a><p>${escapeHtml(source.scope)}</p><small>${escapeHtml(source.status)}</small></article>`).join("")}</div>`;
  if (preserveDesignEditor && target.querySelector(".design-summary")) {
    const preview = document.createElement("div");
    preview.innerHTML = markup;
    [".design-summary", ".design-assumptions", ".design-table-scroll", ".protection-plan", ".design-issue-groups", ".engineering-review", ".approval-state"].forEach((selector) => {
      const existing = target.querySelector(selector), replacement = preview.querySelector(selector);
      if (existing && replacement) { const opened = existing.open; existing.replaceWith(replacement); if (opened) replacement.open = true; }
    });
    $("#approveLayoutButton").disabled = calc.errors.length > 0;
    $("[data-design-supply='dataConfirmed']", target).checked = Boolean(supply.dataConfirmed);
    calc.rows.forEach((row) => { const summary = target.querySelector(`[data-design-details="${CSS.escape(row.device.id)}"] > summary`); if (summary) summary.textContent = `${row.device.label} · ${row.device.name}`; });
  } else {
    target.innerHTML = markup;
    expanded.forEach((key) => { const detail = target.querySelector(`[data-design-details="${CSS.escape(key)}"]`); if (detail) detail.open = true; });
  }
  target.querySelectorAll("[data-issue-group]").forEach((node) => { if (issueOpen.has(node.dataset.issueGroup)) node.open = issueOpen.get(node.dataset.issueGroup); });
  const tableRows = target.querySelectorAll(".design-table tbody tr");
  calc.rows.forEach((row, index) => {
    const cell = tableRows[index]?.cells[1];
    if (!cell) return;
    const protection = document.createElement("small");
    protection.className = "design-circuit-protection";
    protection.textContent = row.spec.rcdId ? `${project.devices.find((device) => device.id === row.spec.rcdId)?.label || "ПЗВ відсутнє"} + автомат 1P` : E.isRcd(row.device) ? row.device.type === "rcbo-afdd" ? "Дифавтомат + ПВДП" : "Окремий дифавтомат" : "Дифзахист не призначений";
    cell.append(protection);
  });
}

function updateDesignInput(event) {
  const input = event.target;
  const supplyField = input.dataset.designSupply, circuitField = input.dataset.designCircuit, deviceField = input.dataset.designDevice, groupField = input.dataset.designGroup;
  if (!project.design || !(supplyField || circuitField || deviceField || groupField)) return;
  const discrete = input.tagName === "SELECT" || input.type === "checkbox";
  if (event.type === "input" && discrete || event.type === "change" && !discrete) return;
  const value = input.type === "checkbox" ? input.checked : input.type === "number" ? input.value === "" ? null : Number(input.value) : input.value;
  if (discrete || designInputTransaction !== input) snapshot();
  designInputTransaction = input;
  if (supplyField) {
    D.updateSupply(project, supplyField, value);
  } else if (groupField) {
    const group = project.design.rcdGroups?.find((item) => item.deviceId === input.dataset.groupId);
    if (group) group[groupField] = value;
  } else if (deviceField) {
    const device = project.devices.find((item) => item.id === input.dataset.circuitId);
    if (device) D.updateDevice(project, device.id, { [deviceField]: deviceField === "cable" ? String(value ?? "") : value });
  } else {
    let circuit = project.design.circuits.find((item) => item.deviceId === input.dataset.circuitId);
    if (!circuit) { circuit = { deviceId: input.dataset.circuitId, rcdType: "A", rcdMa: 30, icnA: 6000 }; project.design.circuits.push(circuit); }
    if (circuitField === "rcdId") {
      circuit.rcdId = value;
      circuit.rcdBarId = project.busbars.find((bar) => bar.rcdId === value)?.id || "";
      project.design.rcdGroups ||= [];
      if (value && !project.design.rcdGroups.some((group) => group.deviceId === value)) project.design.rcdGroups.push({ deviceId: value, barId: circuit.rcdBarId, conditionalIccA: null, coordinationSource: "" });
      project.design.rcdGroups = project.design.rcdGroups.filter((group) => project.devices.some((device) => device.id === group.deviceId) || project.design.circuits.some((record) => record.rcdId === group.deviceId));
    } else if (circuitField === "purpose") { if (!value) { delete circuit.lighting; delete circuit.wet; } else { circuit.lighting = value === "lighting"; circuit.wet = value === "bath"; } }
    else if (circuitField === "outputId") { circuit.outputId = value; circuit.outputKind = (project.consumers || []).some((consumer) => consumer.id === value) ? "consumer" : "device"; }
    else {
      if (circuitField === "lengthM" && circuit.lengthM !== value) { circuit.minFaultA = null; circuit.letThroughA2s = null; circuit.shortCircuitTimeS = null; circuit.shortCircuitSource = ""; }
      circuit[circuitField] = value;
      if (circuitField === "lengthM") { delete circuit.lengthOrigin; if (project.floorPlan) project.floorPlan.syncWithCircuits = false; }
    }
  }
  if (supplyField !== "dataConfirmed") project.design.supply.dataConfirmed = false;
  persistProject();
  preserveDesignEditor = circuitField !== "rcdId";
  try { renderAll(); } finally { preserveDesignEditor = false; }
  // Dependent evidence is cleared in the model; refresh its retained form controls too.
  $("#designReport").querySelectorAll("[data-design-supply], [data-design-circuit], [data-design-group]").forEach((node) => {
    if (node === input || node.tagName === "SELECT") return;
    const record = node.dataset.designSupply ? project.design.supply : node.dataset.designGroup ? project.design.rcdGroups?.find((item) => item.deviceId === node.dataset.groupId) : project.design.circuits.find((item) => item.deviceId === node.dataset.circuitId);
    const current = record?.[node.dataset.designSupply || node.dataset.designGroup || node.dataset.designCircuit];
    if (node.type === "checkbox") node.checked = current === true;
    else node.value = current ?? "";
  });
}

function exportDesignCsv() {
  const calc = D.calculate(project);
  if (!calc) return;
  const rows = [["Статус", calc.status], ["Технічний допуск", "Не видається автоматично"], ["Ревізія", project.design.revision], ["Погодження компоновки", calc.approvalCurrent ? "Актуальне" : "Немає актуального"], ["Вихідні дані вводу", JSON.stringify(project.design.supply)], [], ["Коло", "Призначення", "Фаза", "P кВт", "k", "cosφ", "L м", "In A", "S мм2", "Iz A", "I2 A", "Icn A", "Iкз min A", "Ib A", "ΔU сумарне %", "Ліміт %", "Джерело Iz", "k кабелю", "I²t A²с", "Час КЗ с", "k²S² A²с", "Джерело k / I²t"]];
  calc.rows.forEach((row) => rows.push([row.device.label, row.device.name, row.device.phase, row.device.load, row.spec.diversity ?? "", row.spec.powerFactor ?? "", row.spec.lengthM ?? "", row.rating?.amps ?? "", row.section, row.spec.izA ?? "", row.spec.i2A ?? "", row.spec.icnA ?? "", row.spec.minFaultA ?? "", row.ib ?? "", row.totalDrop ?? "", row.limit, row.spec.cableSource ?? "", row.spec.shortCircuitK ?? "", row.spec.letThroughA2s ?? "", row.spec.shortCircuitTimeS ?? "", row.thermalLimitA2s ?? "", row.spec.shortCircuitSource ?? ""]));
  rows.push([], ["Підбір захисту кіл"], ["Коло", "Встановлений захист", "Вибір та умови"]);
  D.protectionPlan(project).forEach((entry) => rows.push([entry.name, entry.title, entry.reason]));
  rows.push([], ["Рівень", "Пункт перевірки"]);
  calc.issues.forEach((issue) => rows.push([issue.level, issue.text]));
  downloadBlob(csvContent(rows), `${slugify(project.name)}-calculations.csv`, "text/csv;charset=utf-8");
}

function initTemplates() {
  $("#templateCards").addEventListener("click", (event) => { const card = event.target.closest("[data-template]"); if (card) selectTemplate(card.dataset.template); });
  $("#openTemplatesButton").addEventListener("click", openTemplateChooser);
  $("#templateInputForm").addEventListener("change", updateTemplatePreview);
  $("#createTemplateButton").addEventListener("click", createChosenTemplate);
  const seen = () => PStore.writeString(browserStorage, TEMPLATE_SEEN_KEY, "1");
  $("#templateContinueButton").addEventListener("click", () => { seen(); $("#templateModal").classList.add("hidden"); });
  $("#closeTemplateChooserButton").addEventListener("click", seen);
  $("#templateBlankButton").addEventListener("click", () => { seen(); newEmptyProject(); });
  $("#templateModal").addEventListener("keydown", (event) => { if (event.key === "Escape") seen(); });
  $("#templateModal").addEventListener("mousedown", (event) => { if (event.target === event.currentTarget) seen(); });
  $("#designReport").addEventListener("change", updateDesignInput);
  $("#designReport").addEventListener("input", updateDesignInput);
  $("#designReport").addEventListener("focusout", () => { designInputTransaction = null; });
  $("#designReport").addEventListener("click", (event) => {
    if (event.target.closest("[data-open-template]")) return openTemplateChooser();
    const remove = event.target.closest("[data-remove-design-circuit]");
    if (remove) {
      const circuitId = remove.dataset.removeDesignCircuit;
      const record = project.design?.circuits.find((circuit) => circuit.deviceId === circuitId);
      snapshot();
      project = E.removeEntity(project, "device", circuitId);
      if (record?.outputId) project = E.removeEntity(project, record.outputKind || "device", record.outputId);
      project.design.circuits = project.design.circuits.filter((circuit) => circuit.deviceId !== circuitId);
      resetWiringSelection(); selectedDeviceId = null;
      persistProject(); renderAll(); toast("Коло видалено. Ctrl+Z — повернути.");
      return;
    }
    if (event.target.closest("#approveLayoutButton")) {
      try { const approved = D.approveLayout(project, $("#layoutApprovalName").value); snapshot(); project = approved; persistProject(); renderAll(); toast("Компоновку погоджено замовником"); }
      catch (error) { toast(error.message, "error"); }
    }
  });
  $("#designNoticeButton").addEventListener("click", () => switchView("design"));
  $("#designNoticeText").addEventListener("click", openProjectIssues);
  $("#designCsvButton").addEventListener("click", exportDesignCsv);
  $("#printDesignButton").addEventListener("click", () => window.print());
  if (!PStore.readString(browserStorage, TEMPLATE_SEEN_KEY)) openTemplateChooser();
}

;
/* controls-ui.js */
/* Apply voltage and AC/DC settings together while keeping terminal references stable. */
function renderControlInspector() {
  const device = project.devices.find((item) => item.id === selectedDeviceId);
  const rawConfig = device && ControlDevices.configFor(device.type);
  const config = rawConfig && Object.keys(rawConfig).length ? rawConfig : null;
  $("#controlInspector").classList.toggle("hidden", !config);
  if (!config) return;
  $("#controlFields").innerHTML = Object.keys(config).map((field) => {
    const schema = ControlDevices.FIELDS[field];
    if (!schema) return "";
    const value = ControlDevices.get(device, field);
    return `<label class="field"><span>${escapeHtml(schema.label)}</span>${schema.options ? `<select data-control-field="${field}">${schema.options.map(([key, label]) => `<option value="${key}" ${String(value) === key ? "selected" : ""}>${label}</option>`).join("")}</select>` : `<input type="number" data-control-field="${field}" min="${schema.min}" max="${schema.max}" step="${schema.step}" value="${escapeHtml(value)}"/>`}</label>`;
  }).join("");
  const notes = [];
  if (["power-supply", "control-transformer"].includes(device.type)) notes.push(`Вихід ${ControlDevices.get(device, "outputVoltage")} В ${device.type === "power-supply" ? "DC" : "AC"}; розрахунковий струм P/U ≈ ${number(ControlDevices.get(device, "outputPower") / ControlDevices.get(device, "outputVoltage"))} A. 12 і 24 В можуть бути різними моделями — звірте паспорт.`);
  if (device.type === "star-delta-relay") notes.push("C / Y / Δ — функціональні позначення. Для пуску потрібні три контактори, захист двигуна, електричне й механічне блокування та узгоджена пауза перемикання. Паспортну нумерацію клем звіряють з виробником.");
  if (["control-relay", "time-relay", "star-delta-relay"].includes(device.type)) notes.push("Живлення A1/A2 відокремлене від комутованих контактів. Час і режим зберігаються як дані проєкту; симуляція спрацювання не виконується.");
  if (device.type === "phase-monitor") notes.push("Трифазне реле контролю керує котушкою силового контактора, а не комутує всі силові фази своїм допоміжним контактом.");
  if (device.type === "relay") notes.push("Однофазне реле напруги ставиться після ввідного захисту; його допустимий струм має відповідати навантаженню. Воно не замінює автомат, дифзахист або ПЗІП.");
  notes.push("Універсальна функціональна модель. Клеми, категорію комутації, струм і межі напруги конкретного виробу уточнюють за паспортом.");
  $("#controlDeviceNote").textContent = notes.join(" ");
}

function initControls() {
  $("#applyControlSettingsButton").addEventListener("click", () => {
    const device = project.devices.find((item) => item.id === selectedDeviceId);
    const config = device && ControlDevices.configFor(device.type);
    if (!config) return;
    const next = { ...device };
    $$("[data-control-field]", $("#controlFields")).forEach((input) => {
      if (Object.hasOwn(config, input.dataset.controlField)) next[input.dataset.controlField] = input.type === "number" ? Number(input.value) : input.value;
    });
    const errors = ControlDevices.validate(next);
    if (errors.length) return toast(errors[0], "error");
    next.rating = ControlDevices.rating(next);
    snapshot(); Object.assign(device, next); persistProject(); renderAll();
    toast("Параметри збережено. Перевірте напругу вже підключених кіл.");
  });
}

;
/* rail-layout.js */
/* Ordered insertion into DIN rows; no input mutation or electrical rewiring. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./mechanical.js"));
  else root.PanelRailLayout = factory(root.PanelMechanical);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function items(project, ignoredId) {
    return [...project.devices.filter((d) => d.id !== ignoredId).map((entity) => ({ entity, modules: M.modulesFor(entity, project.board) })), ...(project.busbars || []).filter((bar) => bar.zone === "din").map((entity) => ({ entity, modules: M.barModules(entity, project.board) }))].sort((a, b) => a.entity.row - b.entity.row || a.entity.slot - b.entity.slot);
  }
  function boundary(project, row, position, movingId = null) {
    const capacity = Number(project.board.modulesPerRow), x = Math.max(0, Math.min(capacity, position));
    const own = project.devices.find((d) => d.id === movingId);
    if (own?.row === row && x >= own.slot && x < own.slot + M.modulesFor(own, project.board)) return own.slot;
    const hit = items(project, movingId).find(({ entity, modules }) => entity.row === row && x >= entity.slot && x < entity.slot + modules);
    return hit ? x < hit.entity.slot + hit.modules / 2 ? hit.entity.slot : hit.entity.slot + hit.modules : Math.floor(x);
  }
  function place(project, device, row, slot) {
    M.boardGeometry(project.board);
    const board = { rows: Number(project.board.rows), modulesPerRow: Number(project.board.modulesPerRow) }, width = M.modulesFor(device, project.board), old = project.devices.find((d) => d.id === device.id);
    if (!Number.isInteger(row) || row < 0 || row >= board.rows || !Number.isInteger(slot) || slot < 0 || slot > board.modulesPerRow) throw new Error("Виберіть місце на наявній DIN-рейці.");
    if (width > board.modulesPerRow) throw new Error("Апарат ширший за DIN-рейку. Збільште кількість модулів у ряду.");
    const p = copy(project), incoming = copy(device), ordered = items(p, device.id);
    const original = new Map([...project.devices, ...(project.busbars || [])].map((entity) => [entity.id, { row: entity.row, slot: entity.slot }]));
    if (old && row === old.row && slot >= old.slot && slot <= old.slot + width) return { project: p, device: p.devices.find((d) => d.id === old.id), shifted: [], movedIds: [], target: { row: old.row, slot: old.slot } };
    // Moving forward within a contiguous run closes the vacated place.
    // Deliberate gaps elsewhere and the positions before insertion stay intact.
    if (old?.row === row && slot > old.slot + width) {
      const between = ordered.filter(({ entity }) => entity.row === row && entity.slot >= old.slot + width && entity.slot < slot);
      let end = old.slot + width;
      const contiguous = between.every(({ entity, modules }) => { const adjacent = entity.slot === end; end = entity.slot + modules; return adjacent; });
      if (contiguous && end === slot) { between.forEach(({ entity }) => { entity.slot -= width; }); slot -= width; }
    }
    const intersected = ordered.find(({ entity, modules }) => entity.row === row && entity.slot < slot && entity.slot + modules > slot);
    if (intersected) slot = intersected.entity.slot;
    function fit(atRow, atSlot, modules) {
      if (atSlot + modules > board.modulesPerRow) { atRow++; atSlot = 0; }
      if (atRow >= board.rows) throw new Error("Для вставлення бракує місця на наступних рейках. Збільште кількість рейок або модулів у ряду.");
      return { row: atRow, slot: atSlot };
    }
    const tail = ordered.filter(({ entity }) => entity.row > row || entity.row === row && entity.slot >= slot);
    const target = fit(row, slot, width); Object.assign(incoming, target);
    let cursor = { row: target.row, slot: target.slot + width };
    for (const item of tail) {
      const beforeCursor = item.entity.row < cursor.row || item.entity.row === cursor.row && item.entity.slot < cursor.slot;
      const next = fit(beforeCursor ? cursor.row : item.entity.row, beforeCursor ? cursor.slot : item.entity.slot, item.modules);
      Object.assign(item.entity, next); cursor = { row: next.row, slot: next.slot + item.modules };
    }
    p.devices = p.devices.filter((d) => d.id !== device.id); p.devices.push(incoming);
    for (const comb of project.combs || []) {
      const rows = (model) => new Set(comb.terminals.map((ref) => model.devices.find((d) => d.id === ref.ownerId)?.row));
      if (rows(project).size === 1 && rows(p).size > 1) throw new Error(`${comb.label || "Гребінка"}: зсув розділить її апарати між рейками. Звільніть місце на цій рейці або спочатку приберіть гребінку.`);
    }
    const moved = [...p.devices, ...(p.busbars || [])].filter((entity) => { const before = original.get(entity.id); return before && (entity.row !== before.row || entity.slot !== before.slot); });
    const movedIds = new Set(moved.map((entity) => entity.id)), endpointsMoved = new Set([...movedIds, ...(p.consumers || []).filter((c) => movedIds.has(c.deviceId)).map((c) => c.id)]);
    // Endpoints follow their IDs; manual bend points belong to the old placement.
    (p.wires || []).forEach((wire) => { if ([wire.from, wire.to].some((ref) => endpointsMoved.has(ref.ownerId))) wire.points = []; });
    return { project: p, device: incoming, target, shifted: moved.filter((entity) => entity.id !== incoming.id).map((entity) => entity.id), movedIds: [...movedIds] };
  }
  return { boundary, place };
});

;
/* protection-face.js */
/* Portrait device faces drawn in millimetres, with one scale on both axes. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PanelProtectionFace = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TYPES = {
    "rccb-2p": { width: 35, poles: 2, kind: "rccb", title: "ПЗВ", footer: "RCCB · 2P" },
    "rccb-4p": { width: 70, poles: 4, kind: "rccb", title: "ПЗВ 4P", footer: "RCCB · 4P" },
    rcbo: { width: 35, poles: 2, kind: "rcbo", title: "ДИФ", footer: "RCBO · 1P+N" },
    "rcbo-afdd": { width: 72, poles: 2, kind: "afdd", title: "ДИФ + ПВДП", footer: "1P+N · AFDD" }
  };
  let serial = 0;
  const supports = (type) => Object.hasOwn(TYPES, type);
  const n = (value) => String(Math.round(value * 1e6) / 1e6);
  function layout(type, dimensions = {}) {
    if (!supports(type)) throw new Error("Unknown protection face");
    const spec = TYPES[type];
    const width = Number(dimensions.widthMm ?? spec.width), height = Number(dimensions.heightMm ?? 90);
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) throw new Error("Invalid face dimensions");
    const shellScale = Math.min(1, width / 20, height / 60);
    const scale = Math.max(.000001, Math.min(1, width / spec.width, (height - 32 * shellScale) / 34));
    const cy = height / 2 + shellScale;
    const buttonX = spec.kind === "afdd" ? 28 : spec.width - 7.4;
    return { ...spec, type, width, height, shellScale, scale, cy, originX: (width - spec.width * scale) / 2,
      button: { x: buttonX, y: -6, radius: 2.7, size: 5.4, shape: spec.kind === "rccb" ? "circle" : "square" },
      lever: { x: 6.6, y: -7.8, width: spec.poles === 4 ? 39.5 : 8.6, height: 17.5 } };
  }
  function render(type, dimensions) {
    const m = layout(type, dimensions), { width: w, height: h, shellScale: s, button: b, lever: lever } = m;
    const id = `protection-face-${++serial}`, rcd = m.kind === "rccb", accent = rcd ? "#3a9aa6" : "#ce963b";
    const termSpan = m.kind === "afdd" ? w / 2 : w;
    const screws = [6.1 * s, h - 8.2 * s].flatMap((y) => Array.from({ length: m.poles }, (_, i) => {
      const x = termSpan * (i + .5) / m.poles;
      return `<g data-face-screw="true"><circle cx="${n(x)}" cy="${n(y)}" r="${n(2.65 * s)}" fill="url(#${id}-metal)" stroke="#8c9891" stroke-width="${n(.28 * s)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(1.9 * s)}" fill="#64716b" stroke="#c4cec6" stroke-width="${n(.2 * s)}"/><path d="M${n(x - 1.35 * s)} ${n(y)}h${n(2.7 * s)}m${n(-1.35 * s)} ${n(-1.35 * s)}v${n(2.7 * s)}" stroke="#e5eae3" stroke-width="${n(.45 * s)}"/></g>`;
    })).join("");
    const test = b.shape === "circle"
      ? `<circle data-face-test="true" cx="${n(b.x)}" cy="${n(b.y)}" r="${n(b.radius)}" fill="#4297af" stroke="#246a80" stroke-width=".32"/>`
      : `<rect data-face-test="true" x="${n(b.x - b.size / 2)}" y="${n(b.y - b.size / 2)}" width="${n(b.size)}" height="${n(b.size)}" rx=".8" fill="#328da4" stroke="#1b647d" stroke-width=".32"/>`;
    const ridges = [lever.y + 3.2, lever.y + 4.6, lever.y + 6].map((y) => `<path d="M${n(lever.x + 1)} ${n(y)}h${n(lever.width - 2)}" stroke="${rcd ? "#8da7b4" : "#8c9a8d"}" stroke-width=".42" opacity=".72"/>`).join("");
    const residual = rcd
      ? `<text x="${n(b.x)}" y="3.5" text-anchor="middle" font-size="1.9" fill="#526e76">IΔn</text><path d="M${n(b.x - 3)} 10h6m-4.6-2v4m3.2-4v4" stroke="#627b7d" stroke-width=".4"/>`
      : `<rect x="${n(b.x - 1.7)}" y="2.3" width="3.4" height="1.8" rx=".3" fill="#d5803f"/><path d="M${n(b.x - 3)} 11h6m-5-1 1.6-3 1.3 4.2 1.6-3" stroke="#94713b" stroke-width=".4" fill="none"/>`;
    const afdd = m.kind === "afdd" ? `<g data-face-afdd="true"><rect x="39" y="-13" width="29" height="30" rx="1.8" fill="#e2e6dc" stroke="#b4beb0" stroke-width=".4"/><circle cx="43.5" cy="-7" r=".85" fill="#64a75a"/><circle cx="62" cy="-7" r="1.7" fill="#d89738" stroke="#a16f24" stroke-width=".3"/><text x="53.5" y="3.5" text-anchor="middle" font-size="3" fill="#7c6c43">AFDD</text><path d="m43.5 11 3-2 2.5 3 2.5-2.5 2.5 2.5 3-3 4 2" fill="none" stroke="#a78336" stroke-width=".45"/></g>` : "";
    return `<svg class="device-photo-tile protection-face" data-protection-type="${type}" viewBox="0 0 ${n(w)} ${n(h)}" preserveAspectRatio="xMidYMid meet" style="fill:none;stroke:none;stroke-width:.3" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-body" x2="1" y2=".7"><stop stop-color="#fafbf8"/><stop offset=".6" stop-color="#e8ece5"/><stop offset="1" stop-color="#ccd4ca"/></linearGradient><linearGradient id="${id}-metal" x2=".8" y2="1"><stop stop-color="#e0e6de"/><stop offset=".5" stop-color="#aab6ab"/><stop offset="1" stop-color="#718078"/></linearGradient><linearGradient id="${id}-lever" x2="0" y2="1"><stop stop-color="${rcd ? "#627e8e" : "#5b6b5c"}"/><stop offset=".5" stop-color="${rcd ? "#345468" : "#334738"}"/><stop offset="1" stop-color="${rcd ? "#17384e" : "#192b20"}"/></linearGradient></defs><rect x="${n(.3 * s)}" y="${n(.3 * s)}" width="${n(w - .6 * s)}" height="${n(h - .6 * s)}" rx="${n(1.1 * s)}" fill="url(#${id}-body)" stroke="#9da99f" stroke-width="${n(.3 * s)}"/><path d="M${n(.8 * s)} ${n(13 * s)}H${n(w - .8 * s)}M${n(.8 * s)} ${n(h - 13 * s)}H${n(w - .8 * s)}" stroke="#b9c3b7" stroke-width="${n(.35 * s)}"/><rect x="${n(.8 * s)}" y="${n(25 * s)}" width="${n(w - 1.6 * s)}" height="${n(h - 40 * s)}" rx="${n(.9 * s)}" fill="#f1f3ed" stroke="#c2cabe" stroke-width="${n(.22 * s)}"/>${screws}<rect x="${n(2 * s)}" y="${n(22.5 * s)}" width="${n(w - 4 * s)}" height="${n(1.65 * s)}" fill="${accent}"/><text x="${n(w - 2 * s)}" y="${n(18.6 * s)}" text-anchor="end" font-family="Arial,sans-serif" font-size="${n(2.5 * s)}" fill="${rcd ? "#2a7280" : "#99702b"}">${m.title}</text><g data-face-controls="true" transform="translate(${n(m.originX)} ${n(m.cy)}) scale(${n(m.scale)})" font-family="Arial,sans-serif"><rect x="5.1" y="-11.7" width="${n(lever.width + 3)}" height="25.3" rx="1.15" fill="${rcd ? "#a2b1ab" : "#a7b1a2"}" stroke="#83978a" stroke-width=".38"/><rect data-face-lever="true" x="${n(lever.x)}" y="${n(lever.y)}" width="${n(lever.width)}" height="${n(lever.height)}" rx=".85" fill="url(#${id}-lever)" stroke="${rcd ? "#29495c" : "#2a3d2e"}" stroke-width=".35"/>${ridges}${test}<text data-face-test-label="true" x="${n(b.x)}" y="${n(b.y + .85)}" text-anchor="middle" font-size="2.5" fill="#fff">T</text>${residual}${afdd}</g><text x="${n(2.2 * s)}" y="${n(h - 18 * s)}" font-family="Arial,sans-serif" font-size="${n(1.7 * s)}" fill="#6c7d71">${m.footer}</text></svg>`;
  }
  return { TYPES, supports, layout, render };
});

;
/* device-visuals.js */
/* Display geometry and photo framing are independent of engineering dimensions. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./mechanical.js"), require("./protection-face.js"));
  else root.PanelDeviceVisuals = factory(root.PanelMechanical, root.PanelProtectionFace);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M, P) {
  const HEIGHT = 90;
  // Bounds of the opaque housing in the original 320×480 photos. The middle
  // band contains blank plastic; terminals, levers, buttons and displays keep
  // their proportions while that band accommodates the chosen housing height.
  const PHOTOS = {
    "mcb-1p.png": { box: [108, 10, 104, 459], band: [329, 363] },
    "voltage-relay.png": { box: [63, 23, 195, 438], band: [303, 342] },
    "spd-2p.png": { box: [53, 20, 215, 442], band: [257, 345] },
    "contactor.png": { box: [55, 18, 210, 445], band: [311, 342] },
    "energy-meter.png": { box: [59, 35, 202, 410], band: [287, 324] },
    "terminal-block.png": { box: [109, 13, 103, 455], band: [269, 284] }
  };
  const vector = (width, bands, inset = 1.5) => ({ box: [inset, .5, width - inset * 2, 103], bands, sourceWidth: width, sourceHeight: 104 });
  const FACES = { ...PHOTOS,
    "power-supply.svg": vector(120, [[15.5, 16.5], [86.5, 88.5]], .5),
    "control-relay.svg": vector(80, [[16, 21], [85, 88]]),
    "timer-relay.svg": vector(80, [[15, 19], [86, 90]]),
    "contactor-2p.svg": vector(120, [[19, 23], [83, 87]]),
    "contactor-3p.svg": vector(120, [[19, 23], [83, 87]]),
    "motor-protection.svg": vector(120, [[19, 23], [81, 87]]),
    "indicator.svg": vector(40, [[22, 33], [68, 83]]),
    "outlet.svg": vector(80, [[20, 27], [87, 90]])
  };
  function dimensions(device, uniform = true) {
    const actual = M.dimensions(device);
    return uniform ? { ...actual, heightMm: HEIGHT, railOffsetMm: HEIGHT / 2 } : actual;
  }
  function scene(project, uniform = true) {
    if (!uniform) return project;
    return { ...project, devices: project.devices.map((device) => {
      const d = dimensions(device, true);
      return { ...device, geometryId: "custom", dimensions: { ...d, confirmed: false } };
    }) };
  }
  function slices(photo, height) {
    const profile = FACES[photo]; if (!profile || !Number.isFinite(height) || height <= 0) return null;
    const [x, y, width, h] = profile.box, bands = profile.bands || [profile.band];
    const scale = Math.min(1, height / h), extra = Math.max(0, height - h) / bands.length, pieces = [];
    let sourceY = y, targetY = 0;
    function add(end, housing) {
      const sourceHeight = end - sourceY, targetHeight = sourceHeight * scale + (housing ? extra : 0);
      if (sourceHeight > 0) pieces.push({ source: [x, sourceY, width, sourceHeight], y: targetY, height: targetHeight, housing });
      sourceY = end; targetY += targetHeight;
    }
    for (const [start, end] of bands) { add(start, false); add(end, true); }
    add(y + h, false);
    return { width, height, pieces };
  }
  const number = (value) => String(Math.round(value * 1e6) / 1e6);
  function artwork(component, copies = 1, display = null) {
    // Protection controls use millimetre coordinates and a single uniform
    // scale. Stretching their old square artwork into a tall housing made
    // the test buttons, levers and lettering visibly too long.
    if (P.supports(component.type)) return P.render(component.type, display || undefined);
    const profile = FACES[component.photo], preview = !display;
    if (!profile) return Array.from({ length: copies }, () => `<img src="assets/devices/${component.photo}" alt="" draggable="false" />`).join("");
    const widthMm = display?.widthMm || (component.bodyModules || component.modules) * 18, heightMm = display?.heightMm || HEIGHT;
    const face = slices(component.photo, profile.box[2] * heightMm / (widthMm / copies));
    return Array.from({ length: copies }, () => `<svg class="device-photo-tile" viewBox="0 0 ${face.width} ${number(face.height)}" preserveAspectRatio="${preview ? "xMidYMid meet" : "none"}" aria-hidden="true" focusable="false">${face.pieces.map((piece) => `<svg style="width:${face.width}px;height:${number(piece.height)}px" x="0" y="${number(piece.y)}" width="${face.width}" height="${number(piece.height)}" viewBox="${piece.source.join(" ")}" preserveAspectRatio="none" overflow="hidden"><image href="assets/devices/${component.photo}" width="${profile.sourceWidth || 320}" height="${profile.sourceHeight || 480}"/></svg>`).join("")}</svg>`).join("");
  }
  return { HEIGHT, PHOTOS, FACES, dimensions, scene, slices, artwork };
});

;
/* mechanical-ui.js */
/* Geometry inspector and scaled assembly view. Uses the same project and wires. */
const M = PanelMechanical;
const DEVICE_HEIGHT_VIEW_KEY = "electropanel.v3.device-height-view.v1";
let uniformDeviceHeight = true;
function setUniformDeviceHeight(value, redraw = true) {
  uniformDeviceHeight = Boolean(value);
  PStore.writeString(browserStorage, DEVICE_HEIGHT_VIEW_KEY, uniformDeviceHeight ? "uniform" : "actual");
  if (redraw) { renderAll(); requestAnimationFrame(fitBoard); }
}
function geometryOwner() {
  const device = project.devices.find((item) => item.id === selectedDeviceId);
  const bar = project.busbars.find((item) => item.id === selectedBusbarId);
  return device ? { entity: device, bar: false } : bar ? { entity: bar, bar: true } : null;
}
function mmText(d) { return `${number(d.widthMm)} × ${number(d.heightMm)} × ${number(d.depthMm)} мм`; }
function mmScale() { return MODULE_PX / M.boardGeometry(project.board).pitchMm; }

function prepareMechanicalBoardForm() {
  const b = M.boardGeometry(project.board);
  $("#boardCapacityInput").innerHTML = '<option value="custom">Власна кількість рядів і модулів</option>' + M.CAPACITIES.map((item) => `<option value="${item.id}">${item.capacity} модулів · ${item.rows} × ${item.modulesPerRow}</option>`).join("");
  $("#boardPresetInput").innerHTML = `<option value="modules">Корпус поки не обирати</option><option value="custom">Власний корпус · вказати розміри</option>${M.ENCLOSURES.map((model) => `<option value="${model.id}">${model.model} · ${model.rows}×${model.modulesPerRow} · ${model.widthMm}×${model.heightMm}×${model.depthMm} мм</option>`).join("")}`;
  $("#boardPresetInput").value = project.board.enclosureId || (project.board.dimensions ? "custom" : "modules");
  $("#boardWidthInput").value = b.widthMm; $("#boardHeightInput").value = b.heightMm; $("#boardDepthInput").value = b.depthMm;
  $("#boardPitchInput").value = b.pitchMm;
  $("#boardDimensionSourceInput").value = b.source;
  $("#boardDimensionConfirmedInput").checked = Boolean(project.board.dimensions?.confirmed);
  $("#boardRailLeftInput").value = b.leftMm; $("#boardRailTopInput").value = b.firstRailMm;
  $("#boardRailSpacingInput").value = b.rowPitchMm;
  $("#boardUsableDepthInput").value = b.maxDeviceDepthMm ?? "";
  $("#boardMountingSourceInput").value = project.board.mounting?.source || "";
  $("#boardMountingConfirmedInput").checked = Boolean(project.board.mounting?.confirmed);
  $("#boardPhysicalInput").checked = !uniformDeviceHeight;
  syncCapacityFields(false);
  updateEnclosureForm(false);
}
function syncCapacityFields(load = false) {
  const chosen = M.CAPACITIES.find((item) => item.id === $("#boardCapacityInput").value);
  if (load && chosen) { $("#boardRowsInput").value = chosen.rows; $("#boardModulesInput").value = chosen.modulesPerRow; }
  const rows = Number($("#boardRowsInput").value), modules = Number($("#boardModulesInput").value);
  if (!load) $("#boardCapacityInput").value = M.CAPACITIES.find((item) => item.rows === rows && item.modulesPerRow === modules)?.id || "custom";
  const model = M.enclosure($("#boardPresetInput").value);
  if (model && (model.rows !== rows || model.modulesPerRow !== modules)) { $("#boardPresetInput").value = "modules"; updateEnclosureForm(false); }
  $("#boardCapacityInfo").textContent = `${rows} DIN-рейок × ${modules} місць = ${rows * modules} модулів. Корпус можна підібрати пізніше.`;
}
function updateEnclosureForm(loadPreset = true) {
  const preset = M.enclosure($("#boardPresetInput").value);
  if (preset && loadPreset) {
    $("#boardRowsInput").value = preset.rows; $("#boardModulesInput").value = preset.modulesPerRow;
    $("#boardWidthInput").value = preset.widthMm; $("#boardHeightInput").value = preset.heightMm; $("#boardDepthInput").value = preset.depthMm;
    $("#boardPitchInput").value = preset.pitchMm; $("#boardIpInput").value = preset.ip;
    $("#boardDimensionSourceInput").value = preset.source;
    $("#boardRailLeftInput").value = (preset.widthMm - preset.modulesPerRow * preset.pitchMm) / 2;
    $("#boardRailTopInput").value = (preset.heightMm - (preset.rows - 1) * preset.rowPitchMm) / 2;
    $("#boardRailSpacingInput").value = preset.rowPitchMm;
    $("#boardUsableDepthInput").value = ""; $("#boardMountingSourceInput").value = "";
    $("#boardMountingConfirmedInput").checked = false;
    syncCapacityFields(false);
  }
  ["#boardWidthInput", "#boardHeightInput", "#boardDepthInput", "#boardPitchInput", "#boardDimensionSourceInput", "#boardIpInput"].forEach((id) => { $(id).disabled = Boolean(preset); });
  $("#boardEnclosureProperties").classList.toggle("hidden", $("#boardPresetInput").value === "modules");
  $("#boardDimensionConfirmedField").classList.toggle("hidden", Boolean(preset));
  $("#boardPresetInfo").innerHTML = preset ? `<strong>${escapeHtml(preset.model)} · ${mmText(preset)}</strong><span>${preset.mounting} · ${preset.ip} · ${preset.rows * preset.modulesPerRow} місць. <a href="${escapeHtml(preset.source)}" target="_blank" rel="noopener noreferrer">Каталог виробника ↗</a></span><small>Корпус буде додано до специфікації. На полотні відображається обладнання на рейках.</small>` : $("#boardPresetInput").value === "modules" ? "Компонування за кількістю модулів. Модель корпусу не потрібна для початку роботи." : "Вкажіть розміри корпусу за паспортом для перевірки сумісності та специфікації.";
}
function readMechanicalBoard(base) {
  const selected = $("#boardPresetInput").value;
  if (selected === "modules") return M.withCapacity({ ...base, physicalView: $("#boardPhysicalInput").checked }, base.rows, base.modulesPerRow);
  const next = { ...base, enclosureId: selected, physicalView: $("#boardPhysicalInput").checked };
  delete next.fullEnclosureView;
  if (M.enclosure(selected)) {
    const preset = M.enclosure(selected);
    Object.assign(next, { rows: preset.rows, modulesPerRow: preset.modulesPerRow, ip: preset.ip });
    delete next.dimensions;
  } else next.dimensions = { widthMm: Number($("#boardWidthInput").value), heightMm: Number($("#boardHeightInput").value), depthMm: Number($("#boardDepthInput").value), pitchMm: Number($("#boardPitchInput").value), source: $("#boardDimensionSourceInput").value.trim(), confirmed: $("#boardDimensionConfirmedInput").checked };
  next.mounting = { leftMm: Number($("#boardRailLeftInput").value), firstRailMm: Number($("#boardRailTopInput").value), rowPitchMm: Number($("#boardRailSpacingInput").value), maxDeviceDepthMm: $("#boardUsableDepthInput").value === "" ? null : Number($("#boardUsableDepthInput").value), source: $("#boardMountingSourceInput").value.trim(), confirmed: $("#boardMountingConfirmedInput").checked };
  M.boardGeometry(next);
  return next;
}

function combVerticalBounds(scene, scale) {
  let top = Infinity, bottom = -Infinity;
  for (const comb of scene.combs) {
    // Allow space for the legend beyond the center line of the colored bar.
    const clearance = ((COMB_LANE_OFFSETS[comb.potential] ?? COMB_LANE_OFFSETS.L1) + 22) / scale;
    for (const ref of comb.terminals) {
      const device = scene.devices.find((item) => item.id === ref.ownerId);
      const port = device && E.resolveEndpoint(scene, ref);
      if (port?.side !== "top" && port?.side !== "bottom") continue;
      const bounds = M.deviceRect(device, scene.board);
      if (port.side === "top") top = Math.min(top, bounds.y - clearance);
      else bottom = Math.max(bottom, bounds.y + bounds.height + clearance);
    }
  }
  return { top, bottom };
}

function renderMechanicalBoard() {
  const physical = true; // Both views use the same metric DIN grid and widths.
  const scene = PanelDeviceVisuals.scene(project, uniformDeviceHeight), scale = mmScale();
  const viewport = M.assemblyViewport(scene), frame = $("#boardAssemblyViewport");
  const combBounds = combVerticalBounds(scene, scale);
  const top = Math.min(viewport.topMm, combBounds.top);
  const bottom = Math.max(viewport.topMm + viewport.heightMm, combBounds.bottom);
  const shell = $("#boardShell"), surface = $("#wiringSurface");
  shell.classList.add("assembly-board");
  shell.classList.toggle("physical-board", physical);
  shell.classList.toggle("uniform-device-height", uniformDeviceHeight);
  $("#physicalViewButton").setAttribute("aria-pressed", String(!uniformDeviceHeight));
  $("#physicalViewButton").textContent = uniformDeviceHeight ? "Рівна висота" : "Габарити · мм";
  $("#physicalViewButton").title = uniformDeviceHeight ? "Однакова висота зображень. Натисніть, щоб показати реальні габарити апаратів." : "Реальні габарити апаратів. Натисніть, щоб вирівняти висоту зображень.";
  $("#boardGeometryCaption").classList.add("hidden");
  $("#boardGeometryCaption").textContent = "";
  frame.classList.remove("trimmed-assembly");
  frame.style.width = physical ? `${viewport.widthMm * mmScale()}px` : "";
  frame.style.height = physical ? `${(bottom - top) * scale}px` : "";
  surface.style.width = physical ? `${viewport.surfaceWidthMm * mmScale()}px` : "";
  surface.style.height = physical ? `${Math.max(viewport.surfaceHeightMm, bottom) * scale}px` : "";
  surface.style.left = physical ? `${-viewport.leftMm * mmScale()}px` : "";
  surface.style.top = physical ? `${-top * scale}px` : "";
  surface.style.clipPath = physical ? `inset(${top * scale}px -10000px -10000px ${viewport.leftMm * scale}px)` : "";
  surface.dataset.routeInsetX = physical ? viewport.leftMm * mmScale() : 0;
  shell.style.setProperty("--mm-scale", mmScale());
  shell.style.setProperty("--rail-mm-height", `${100 * mmScale()}px`);
  shell.style.setProperty("--rail-mm-center", `${50 * mmScale()}px`);
  shell.style.setProperty("--rail-mm-band", `${35 * mmScale()}px`);
  $("#boardIpText").classList.add("hidden");
}
function rowGeometryStyle(row) {
  if (!$("#boardShell").classList.contains("physical-board")) return "";
  const b = M.boardGeometry(project.board), scale = mmScale();
  return `left:${b.leftMm * scale}px;top:${(b.firstRailMm + row * b.rowPitchMm - 50) * scale}px`;
}
function deviceGeometryStyle(device) {
  if (!$("#boardShell").classList.contains("physical-board")) return `left:${device.slot * MODULE_PX + 1}px;width:${getComponent(device).modules * MODULE_PX - 3}px`;
  const d = PanelDeviceVisuals.dimensions(device, uniformDeviceHeight), scale = mmScale();
  return `left:${device.slot * MODULE_PX}px;top:${(50 - d.railOffsetMm) * scale}px;width:${d.widthMm * scale}px;height:${d.heightMm * scale}px`;
}
function positionPhysicalBusbars() {
  if (!$("#boardShell").classList.contains("physical-board")) return;
  const b = M.boardGeometry(project.board), scale = mmScale();
  const rects = new Map(M.barDrawingRects(project).map((item) => [item.id, item]));
  project.busbars.forEach((bar) => {
    const node = $(`.busbar-card[data-busbar-id="${CSS.escape(bar.id)}"]`);
    if (!node) return;
    const r = rects.get(bar.id);
    const x = bar.zone === "din" ? r.x - b.leftMm : r.x;
    const y = bar.zone === "din" ? r.y - (b.firstRailMm + bar.row * b.rowPitchMm - 50) : r.y;
    node.style.cssText = `left:${x * scale}px;top:${y * scale}px;width:${r.width * scale}px;height:${r.height * scale}px`;
    if (r.measured) node.classList.add("sized-busbar");
    else {
      node.classList.add("unmeasured-busbar");
      node.title = "Умовне місце. Натисніть шину й задайте її розміри та координати.";
    }
  });
}

function renderGeometryInspector() {
  const owner = geometryOwner();
  $("#geometryInspector").classList.toggle("hidden", !owner);
  if (!owner) return;
  const { entity, bar } = owner;
  $("#geometryProfileInput").innerHTML = `<option value="">Універсальний · габарити орієнтовні</option>${(bar ? [] : M.PROFILES.filter((item) => item.types.includes(entity.type))).map((item) => `<option value="${item.id}">${escapeHtml(item.model)}</option>`).join("")}<option value="custom">Власна модель · з паспорта</option>`;
  $("#geometryProfileInput").value = bar ? entity.dimensions ? "custom" : "" : entity.geometryId || (entity.dimensions ? "custom" : "");
  fillGeometryFields();
}
function fillGeometryFields() {
  const owner = geometryOwner(); if (!owner) return;
  const { entity, bar } = owner, id = $("#geometryProfileInput").value;
  const originalId = bar ? entity.dimensions ? "custom" : "" : entity.geometryId || (entity.dimensions ? "custom" : "");
  const same = id === originalId;
  const current = bar && !entity.dimensions ? { widthMm: M.barModules(entity) * 18, heightMm: 12, depthMm: 25, railOffsetMm: 6, model: "Шина · орієнтовно", source: "" } : M.dimensions(bar ? { ...entity, type: "terminal", geometryId: "custom" } : entity);
  const d = M.profile(id) ? { ...M.profile(id), railOffsetMm: M.profile(id).heightMm / 2 } : current;
  $("#geometryModelInput").value = d.model;
  $("#geometryWidthInput").value = d.widthMm; $("#geometryHeightInput").value = d.heightMm; $("#geometryDepthInput").value = d.depthMm;
  $("#geometryOffsetInput").value = same ? current.railOffsetMm : d.railOffsetMm;
  $("#geometrySourceInput").value = d.source || "";
  $("#geometryConfirmedInput").checked = same && Boolean(entity.dimensions?.confirmed || entity.mounting?.confirmed);
  ["#geometryWidthInput", "#geometryHeightInput", "#geometryDepthInput", "#geometryModelInput"].forEach((selector) => { $(selector).disabled = id !== "custom"; });
  $("#geometryOffsetInput").disabled = !id;
  $("#geometrySourceInput").disabled = !id;
  $("#geometryConfirmedInput").disabled = !id;
  $("#applyGeometryButton").disabled = !id;
  const positionedBar = bar && entity.zone !== "din";
  $("#geometryXField").classList.toggle("hidden", !positionedBar); $("#geometryYField").classList.toggle("hidden", !positionedBar);
  $("#geometryOffsetField").classList.toggle("hidden", positionedBar);
  $("#geometryXInput").value = entity.positionMm?.x ?? 16;
  $("#geometryYInput").value = entity.positionMm?.y ?? Math.max(0, M.boardGeometry(project.board).heightMm - 40);
  $("#geometryDeviceNote").textContent = M.profile(id) ? `Каталожні габарити: ${mmText(d)}. Це профіль корпусу; електричні номінали, клеми й сумісність гребінок перевіряються окремо. Вісь DIN спочатку центрована — уточніть її за кресленням.` : id === "custom" ? "Введіть повні габарити, вісь кріплення та джерело. Ширина резервує потрібну кількість місць; після зміни апарати перемістяться разом зі з’єднаннями." : "Для цієї моделі є тільки умовний габарит. Виберіть каталожний профіль або введіть паспортні розміри.";
}
function applyComponentGeometry() {
  try {
    const owner = geometryOwner(); if (!owner) return;
    const next = clone(project), target = (owner.bar ? next.busbars : next.devices).find((entity) => entity.id === owner.entity.id);
    const id = $("#geometryProfileInput").value;
    if (!id) throw new Error("Оберіть габаритний профіль або власну модель");
    const source = $("#geometrySourceInput").value.trim(), confirmed = $("#geometryConfirmedInput").checked;
    const railOffsetMm = owner.bar && target.zone !== "din" ? Number($("#geometryHeightInput").value) / 2 : Number($("#geometryOffsetInput").value);
    if (id === "custom") {
      target.dimensions = { widthMm: Number($("#geometryWidthInput").value), heightMm: Number($("#geometryHeightInput").value), depthMm: Number($("#geometryDepthInput").value), railOffsetMm, source, confirmed, model: $("#geometryModelInput").value.trim() || "Власна модель" };
      if (!owner.bar) target.geometryId = "custom";
      delete target.mounting;
    } else { target.geometryId = id; target.mounting = { railOffsetMm, source, confirmed }; delete target.dimensions; }
    if (owner.bar && target.zone !== "din") target.positionMm = { x: Number($("#geometryXInput").value), y: Number($("#geometryYInput").value) };
    M.dimensions(owner.bar ? { ...target, type: "terminal", geometryId: "custom" } : target);
    const candidate = M.repack(next);
    if (E.validate(candidate).some((issue) => issue.code === "comb-potential")) throw new Error("Зміна розмірів розділяє контакти гребінки між рейками. Спершу змініть гребінку.");
    snapshot(); project = E.normalizeProject(candidate); persistProject(); renderAll(); requestAnimationFrame(fitBoard);
    toast("Розміри збережено; компоненти та проводка оновлені");
  } catch (error) { toast(error.message, "error"); }
}

function renderMechanicalSummary() {
  const issues = M.checks(project), errors = issues.filter((issue) => issue.level === "error");
  const total = project.board.rows * project.board.modulesPerRow;
  const used = project.devices.reduce((sum, device) => sum + M.modulesFor(device, project.board), 0) + project.busbars.filter((bar) => bar.zone === "din").reduce((sum, bar) => sum + M.barModules(bar, project.board), 0);
  const count = project.devices.filter((device) => M.dimensions(device).verified).length;
  const pending = issues.filter((issue) => issue.level === "pending");
  const notes = [...new Set(pending.map((issue) => ["device-unverified", "device-offset", "bar-unverified"].includes(issue.code) ? ({ "device-unverified": "Є апарати без підтверджених габаритів.", "device-offset": "Положення осі DIN у частині апаратів потребує уточнення.", "bar-unverified": "Є шини з умовними габаритами або місцем." }[issue.code]) : issue.text))];
  $("#mechanicalSummary").innerHTML = `<strong>${project.board.rows} × ${project.board.modulesPerRow} · ${total} модулів</strong><p>Зайнято ${used} · вільно ${total - used}.<br>${count}/${project.devices.length} апаратів із паспортними габаритами.</p><span class="mechanical-status ${errors.length ? "error" : ""}">${errors.length ? `${errors.length} зауважень до компоновки` : "Модулів достатньо"}</span>${errors.map((issue) => `<p class="mechanical-error">${escapeHtml(issue.text)}</p>`).join("")}<details><summary>${pending.length ? "Що ще потрібно звірити" : "Межі перевірки"}</summary><ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}<li>Місткість за модулями не замінює перевірку монтажної глибини й теплового режиму обраного корпусу.</li></ul></details><button class="button ghost full-width" id="exportDimensionsButton" type="button">Експорт розмірів CSV</button>`;
  $("#exportDimensionsButton").addEventListener("click", exportMechanicalCsv);
}
function exportMechanicalCsv() {
  const b = M.boardGeometry(project.board);
  const rows = [["Габаритна відомість · мм · не монтажний допуск"], ["Місткість, модулів", project.board.rows * project.board.modulesPerRow, "DIN-рейок", project.board.rows, "Модулів у ряду", project.board.modulesPerRow]];
  if (project.board.enclosureId || project.board.dimensions) rows.push(["Корпус для специфікації", b.model, "Ш", b.widthMm, "В", b.heightMm, "Г", b.depthMm]);
  else rows.push(["Корпус не обрано; координати монтажної системи без прив’язки до корпуса"]);
  rows.push(["Крок місця DIN", b.pitchMm, "Між рейками", b.rowPitchMm], ["Позначення", "Профіль", "Ш, мм", "В, мм", "Г, мм", "X, мм", "Y, мм", "DIN", "Місць", "Габарити підтверджені", "Джерело"]);
  project.devices.forEach((device) => { const d = M.dimensions(device), r = M.deviceRect(device, project.board); rows.push([device.label, d.model, d.widthMm, d.heightMm, d.depthMm, r.x, r.y, device.row + 1, r.slots, d.verified ? "так" : "ні", d.source]); });
  project.busbars.forEach((bar) => { const d = bar.dimensions && M.dimensions({ ...bar, type: "terminal", geometryId: "custom" }), r = d && bar.zone === "din" ? M.deviceRect({ ...bar, type: "terminal", geometryId: "custom" }, project.board) : bar.positionMm; rows.push([bar.label, d?.model || "Умовна шина", d?.widthMm ?? "", d?.heightMm ?? "", d?.depthMm ?? "", r?.x ?? "", r?.y ?? "", bar.zone === "din" ? bar.row + 1 : "", bar.zone === "din" ? E.busbarModules(bar, project.board) : "", d?.verified ? "так" : "ні", d?.source || ""]); });
  M.checks(project).forEach((issue) => rows.push([issue.level, issue.text]));
  downloadBlob(csvContent(rows), `${slugify(project.name)}-dimensions.csv`, "text/csv;charset=utf-8");
}
function initMechanical() {
  uniformDeviceHeight = PStore.readString(browserStorage, DEVICE_HEIGHT_VIEW_KEY) !== "actual";
  $("#boardCapacityInput").addEventListener("change", () => syncCapacityFields(true));
  ["#boardRowsInput", "#boardModulesInput"].forEach((id) => $(id).addEventListener("change", () => syncCapacityFields(false)));
  $("#replaceAfddButton").addEventListener("click", () => {
    try {
      const candidate = E.replaceAfdd(project, selectedDeviceId);
      if (E.validate(candidate).some((issue) => issue.code === "comb-potential")) throw new Error("Перевірте гребінку перед заміною апарата");
      snapshot(); project = candidate; persistProject(); renderAll(); requestAnimationFrame(fitBoard);
      toast("Встановлено звичайний дифавтомат; з’єднання збережені. Нормативні вимоги перевірте в розрахунках.");
    } catch (error) { toast(error.message, "error"); }
  });
  $("#boardPresetInput").addEventListener("change", () => updateEnclosureForm(true));
  $("#geometryProfileInput").addEventListener("change", fillGeometryFields);
  $("#applyGeometryButton").addEventListener("click", applyComponentGeometry);
  $("#physicalViewButton").addEventListener("click", () => {
    setUniformDeviceHeight(!uniformDeviceHeight);
  });
}

;
/* schematic-ui.js */
/* Document navigation and SVG export; no changes to the electrical project. */
const S = PanelSchematic;
let schematicModel = null;
let schematicPage = 0;
let schematicScale = 1;
let schematicAutoFit = "page";
let schematicMonochrome = false;
let schematicExpanded = true;
let schematicProjectId = null;

function renderConnectedDiagram() {
  if (schematicProjectId !== project.id) { schematicProjectId = project.id; schematicPage = 0; schematicAutoFit = "page"; }
  schematicModel = S.build(project);
  schematicPage = Math.max(0, Math.min(schematicPage, schematicModel.pages.length - 1));
  const disabled = !schematicModel.pages.length;
  ["#diagramSvgButton", "#diagramMonoButton", "#diagramZoomOut", "#diagramZoomIn", "#diagramFitButton", "#diagramWidthButton", "#printDiagramButton"].forEach((id) => { $(id).disabled = disabled; });
  $("#diagramPageInput").innerHTML = schematicModel.pages.map((page, index) => `<option value="${index}">Аркуш ${index + 1} з ${schematicModel.pages.length}</option>`).join("");
  $("#diagramPageInput").value = schematicPage;
  $("#diagramPageInput").disabled = disabled;
  $("#diagramPrevPage").disabled = schematicPage === 0;
  $("#diagramNextPage").disabled = disabled || schematicPage >= schematicModel.pages.length - 1;
  $("#diagramMonoButton").setAttribute("aria-pressed", String(schematicMonochrome));
  $("#diagramWideButton").setAttribute("aria-pressed", String(schematicExpanded));
  const problems = E.validate(project).filter((issue) => issue.level === "error");
  const warnings = [...schematicModel.warnings, ...problems.map((issue) => issue.text)];
  $("#diagramOverview").innerHTML = `<div><span class="sld-status-dot"></span><strong>За фактичними з’єднаннями</strong><span>${schematicModel.circuits.size} відгалужень · ${schematicModel.pages.length} арк. · ${project.wires.length} проводів</span></div><div class="sld-key"><span><i class="key-mcb"></i>Автомат</span><span><i class="key-rcd"></i>ПЗВ</span><span><i class="key-rcbo"></i>Дифавтомат</span></div>`;
  if (disabled) $("#diagramPaper").innerHTML = '<div class="diagram-empty"><div><strong>Додайте силові з’єднання</strong><span>Після з’єднання клем з’являться ввід, групи захисту й відхідні кола.</span></div></div>';
  else $("#diagramPaper").innerHTML = schematicModel.pages.map((page, index) => `<section class="sld-page ${index === schematicPage ? "active" : ""}" aria-label="Аркуш ${index + 1}">${S.renderSvg(schematicModel, index, { monochrome: schematicMonochrome, date: new Date().toLocaleDateString("uk-UA") })}</section>`).join("");
  $("#diagramDetails").innerHTML = `${warnings.length ? `<div class="sld-warning"><strong>Потрібна увага</strong><ul>${[...new Set(warnings)].map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>` : ""}<p class="sld-reading-note">Читайте згори вниз: ввід → груповий захист → відхідний автомат → споживач. N/PE вказані окремо для кожного кола. ${schematicModel.pages.length > 1 ? "Ввідні апарати повторено на аркушах для зручності читання. " : ""}Натисніть позначення апарата, щоб відкрити його на компоновці.</p>${schematicModel.omitted.length ? `<details class="sld-extra"><summary>Поза силовою схемою · ${schematicModel.omitted.length}</summary><p>Апарати без фазних силових з’єднань або з колами керування. Їхні фактичні підключення наведено нижче.</p><div class="sld-omitted">${schematicModel.omitted.map((device) => `<button type="button" data-diagram-device="${escapeHtml(device.id)}">${escapeHtml(device.label)} · ${escapeHtml(device.name)}</button>`).join("")}</div></details>` : ""}<details class="sld-extra"><summary>Клеми й усі з’єднання · ${project.wires.length}</summary><p>Однолінійний вигляд узагальнює фазне живлення; кола керування, N і PE залишаються в адресній відомості. Умовні позначення схематичні та не є заводськими клемними картами.</p><div class="sld-connection-scroll"><table><thead><tr><th>Провід</th><th>Від</th><th>До</th><th>Потенціал</th><th>Провідник</th></tr></thead><tbody>${project.wires.map((wire) => `<tr><td>${escapeHtml(wire.label)}</td><td>${escapeHtml(E.endpointLabel(project, wire.from))}</td><td>${escapeHtml(E.endpointLabel(project, wire.to))}</td><td>${escapeHtml(wire.potential)}</td><td>${escapeHtml(wire.material)} ${number(wire.section)} мм²</td></tr>`).join("")}</tbody></table></div></details>`;
  updateSchematicScale();
  if (schematicAutoFit && $("#diagramView").classList.contains("active")) requestAnimationFrame(fitSchematic);
}

function updateSchematicScale() {
  $$(".sld-svg").forEach((svg) => { svg.style.width = `${S.WIDTH * schematicScale}px`; svg.style.height = "auto"; });
  $("#diagramZoomValue").textContent = `${Math.round(schematicScale * 100)}%`;
}
function fitSchematic() {
  if (!$("#diagramView").classList.contains("active")) return;
  const view = $("#diagramView"), svg = $(".sld-page.active .sld-svg");
  const height = svg?.viewBox.baseVal.height || 840;
  const reserved = $("#diagramView .document-toolbar").offsetHeight + $(".sld-controls").offsetHeight + $("#diagramOverview").offsetHeight + 60;
  const vertical = schematicAutoFit === "width" ? 1 : (view.clientHeight - reserved) / height;
  schematicScale = Math.max(.25, Math.min(1, (view.clientWidth - 48) / S.WIDTH, vertical));
  updateSchematicScale();
}
function changeSchematicPage(index) {
  if (!schematicModel?.pages.length) return;
  schematicPage = Math.max(0, Math.min(index, schematicModel.pages.length - 1));
  renderConnectedDiagram();
  $("#diagramView").scrollTop = 0;
}
function exportSchematicSvg() {
  if (!schematicModel?.pages.length) return;
  const svg = S.renderSvg(schematicModel, schematicPage, { monochrome: schematicMonochrome, date: new Date().toLocaleDateString("uk-UA") });
  downloadBlob(`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, `${slugify(project.name)}-single-line-${schematicPage + 1}.svg`, "image/svg+xml;charset=utf-8");
}
function initSchematic() {
  $("#diagramSvgButton").addEventListener("click", exportSchematicSvg);
  $("#diagramMonoButton").addEventListener("click", () => { schematicMonochrome = !schematicMonochrome; renderConnectedDiagram(); });
  $("#diagramWideButton").addEventListener("click", () => {
    schematicExpanded = !schematicExpanded;
    document.body.classList.toggle("diagram-expanded", schematicExpanded);
    $("#diagramWideButton").setAttribute("aria-pressed", String(schematicExpanded));
    if (schematicAutoFit) requestAnimationFrame(fitSchematic);
  });
  [["#diagramZoomOut", -.15], ["#diagramZoomIn", .15]].forEach(([selector, step]) => $(selector).addEventListener("click", () => { schematicAutoFit = false; schematicScale = Math.max(.25, Math.min(1.8, schematicScale + step)); updateSchematicScale(); }));
  $("#diagramFitButton").addEventListener("click", () => { schematicAutoFit = "page"; fitSchematic(); });
  $("#diagramWidthButton").addEventListener("click", () => { schematicAutoFit = "width"; fitSchematic(); });
  $("#diagramPageInput").addEventListener("change", () => changeSchematicPage(Number($("#diagramPageInput").value)));
  $("#diagramPrevPage").addEventListener("click", () => changeSchematicPage(schematicPage - 1));
  $("#diagramNextPage").addEventListener("click", () => changeSchematicPage(schematicPage + 1));
  const open = (event) => {
    const target = event.target.closest("[data-diagram-device]");
    if (!target || event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    if (event.type === "keydown") event.preventDefault();
    switchView("board"); chooseDevice(target.dataset.diagramDevice);
    if (window.innerWidth <= 1120) toggleDrawer("inspector");
  };
  $("#diagramPaper").addEventListener("click", open); $("#diagramPaper").addEventListener("keydown", open);
  $("#diagramDetails").addEventListener("click", open);
  window.addEventListener("resize", () => { if (schematicAutoFit) requestAnimationFrame(fitSchematic); });
}

;
/* form-drafts.js */
/* Unapplied form edits are separate from the project and scoped to this tab. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PanelFormDrafts = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "electropanel.v3.form-drafts.v1", copy = (value) => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const validValues = (value) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length <= 40 && Object.values(value).every((v) => typeof v === "string" || typeof v === "boolean" || Array.isArray(v) && v.length <= 500 && v.every((id) => typeof id === "string"));
  function create(storage = null) {
    const entries = new Map(); let storageAvailable = Boolean(storage);
    const keyFor = ({ projectId, kind, entityId = "" }) => JSON.stringify([projectId, kind, entityId]);
    try {
      const saved = JSON.parse(storage?.getItem(KEY) || "[]");
      if (Array.isArray(saved) && saved.length <= 1000) saved.forEach((item) => {
        if (item && typeof item.projectId === "string" && ["point", "room", "settings"].includes(item.kind) && typeof item.entityId === "string" && typeof item.revision === "string" && validValues(item.baseline) && validValues(item.changes) && Object.keys(item.changes).length) entries.set(keyFor(item), item);
      });
    } catch { storageAvailable = false; }
    function save() {
      if (!storage) return;
      try { storage.setItem(KEY, JSON.stringify([...entries.values()].filter((item) => Object.keys(item.changes).length))); storageAvailable = true; }
      catch { storageAvailable = false; } // In-memory edits remain available.
    }
    function view(item) {
      return { ...copy(item), key: keyFor(item), values: { ...copy(item.latestBaseline || item.baseline), ...copy(item.changes) }, dirty: Boolean(Object.keys(item.changes).length), stale: item.revision !== (item.latestRevision ?? item.revision) };
    }
    function open(meta, baseline, revision) {
      if (!validValues(baseline)) throw new Error("Некоректні значення форми.");
      const key = keyFor(meta); let item = entries.get(key);
      if (!item || !Object.keys(item.changes).length) item = { ...meta, entityId: meta.entityId || "", baseline: copy(baseline), revision, changes: {} };
      item.latestBaseline = copy(baseline); item.latestRevision = revision; item.label = meta.label;
      entries.set(key, item); return view(item);
    }
    function edit(key, values) {
      const item = entries.get(key); if (!item || !validValues(values)) throw new Error("Спочатку відкрийте коректну форму.");
      const baseline = item.latestBaseline || item.baseline;
      const changes = Object.fromEntries(Object.entries(values).filter(([name, value]) => !equal(value, baseline[name])).map(([name, value]) => [name, copy(value)]));
      if (!Object.keys(item.changes).length) { item.baseline = copy(baseline); item.revision = item.latestRevision; }
      item.changes = changes;
      if (!Object.keys(changes).length) { item.baseline = copy(baseline); item.revision = item.latestRevision; }
      save(); return view(item);
    }
    function rebase(key) {
      const item = entries.get(key); if (!item) return null;
      item.baseline = copy(item.latestBaseline || item.baseline); item.revision = item.latestRevision || item.revision;
      item.changes = Object.fromEntries(Object.entries(item.changes).filter(([name, value]) => !equal(value, item.baseline[name])));
      save(); return view(item);
    }
    function remove(key) { entries.delete(key); save(); }
    function get(key) { const item = entries.get(key); return item ? view(item) : null; }
    function pending(projectId) { return [...entries.values()].filter((item) => item.projectId === projectId && Object.keys(item.changes).length).map(view); }
    return { open, edit, rebase, remove, get, pending, keyFor, get storageAvailable() { return storageAvailable; } };
  }
  return { KEY, create };
});

;
/* floor-plan-ui.js */
/* Editable floor sketch, circuit binding and cable quantities. */
const F = PanelFloorPlan;
let floorSelectedId = null;
let floorRoomId = "living";
let floorCircuitId = "";
let floorDrag = null;
let floorPointPreview = null;
let floorRouteSelection = null;
let floorConnectMode = false;
let floorConnectSourceId = null;
let floorConnectPattern = "chain";
let floorFrame = null;
let floorScale = null;
let floorViewportFrame = null;
let floorJunctionDraft = null;
let floorPointPropertiesFor = null;
const floorNumber = (n) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(n);
const floorPrecise = (value) => Math.round(value * 1e6) / 1e6;
function readFloorNumber(selector, label) {
  const value = String($(selector).value ?? "").trim();
  if (!value || !Number.isFinite(Number(value))) throw new Error(`Введіть ${label}.`);
  return Number(value);
}

function ensureFloorPlan() {
  if (project.floorPlan) return;
  snapshot(); project.floorPlan = F.create(project); floorSelectedId = project.floorPlan.points.find((p) => p.type === "panel").id;
  persistProject();
}
function commitFloorPlan(next, keepConfirmation = false) {
  try {
    if (!keepConfirmation) next.geometryConfirmed = false;
    let candidate = E.normalizeProject({ ...project, floorPlan: F.normalize(next) });
    if (candidate.design?.supply) candidate.design.supply.dataConfirmed = false;
    if (candidate.floorPlan.syncWithCircuits) candidate = F.syncLengths(candidate);
    snapshot(); project = candidate; floorRouteSelection = null; completeFloorFormCommit(); persistProject(); renderAll();
    return true;
  } catch (error) { toast(error.message, "error"); return false; }
}
function sizeFloorCanvas() {
  const view = $("#floorView"), canvas = $("#floorCanvas");
  if (!view.classList.contains("active") || !view.clientHeight) return;
  // Measure the unscrolled editor position so reports below it do not shrink
  // or enlarge the drawing area when the document is scrolled.
  const top = canvas.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop;
  const help = $(".floor-navigation-help").offsetHeight;
  const height = `${Math.max(180, Math.floor(view.clientHeight - top - help))}px`;
  if (canvas.style.height !== height) canvas.style.height = height;
  view.style.setProperty("--floor-toolbar-height", `${$(".floor-toolbar").offsetHeight}px`);
}
function applyFloorScale() {
  const canvas = $("#floorCanvas"), svg = $(".floor-svg", canvas);
  if (!svg || !canvas.clientWidth || !canvas.clientHeight) return;
  const box = svg.viewBox.baseVal, style = getComputedStyle(canvas);
  const width = canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = canvas.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  // Auto-fit must also fit very large plans. Manual zoom keeps its own scale.
  const size = floorScale === null ? PanelViewport.fit(box.width, box.height, width - 2, height - 2, 1.3) : PanelViewport.atScale(box.width, box.height, floorScale);
  if (!size) return;
  svg.style.width = `${size.width}px`; svg.style.height = `${size.height}px`;
  svg.style.aspectRatio = `${box.width} / ${box.height}`;
  $("#floorZoomValue").textContent = `${Math.round(size.scale * 100)}%`;
  if (floorScale === null) { canvas.scrollTop = 0; canvas.scrollLeft = 0; }
}
function refreshFloorViewport() {
  if (!$("#floorView").classList.contains("active")) return;
  sizeFloorCanvas(); applyFloorScale();
}
function renderFloorCanvas() {
  if (!project.floorPlan) return;
  sizeFloorCanvas();
  const preview = floorGeometryPreview || floorPointPreview;
  const displayed = preview ? { ...project, floorPlan: preview } : project;
  $("#floorCanvas").innerHTML = PanelFloorSvg.render(displayed, { selectedId: floorConnectMode ? floorConnectSourceId : floorSelectedId, circuitId: floorCircuitId, interactiveRoutes: !preview && !floorConnectMode, selectedRouteToId: floorRouteSelection?.toId || "", showRoutes: $("#floorShowRoutes").checked && !floorGeometryEditing && !floorPencilActive, showHeights: $("#floorShowHeights").checked, showGrid: $("#floorShowGrid").checked, gridStepM: Number($("#floorGeometryGrid").value), ...floorGeometryOptions(), ...floorPencilOptions() });
  applyFloorScale();
  paintFloorPencil();
  if (typeof markFloorPoints === "function") markFloorPoints();
}
function renderFloorPlan() {
  $("#floorTemplateInput").innerHTML = Object.entries(F.TEMPLATES).map(([id, template]) => `<option value="${id}">${escapeHtml(template.title)}</option>`).join("");
  $("#floorTemplateInput").value = project.floorPlan?.templateId || project.design?.templateId || "apartment-2";
  $("#floorUndoButton").disabled = !undoStack.length;
  $("#floorRedoButton").disabled = !redoStack.length;
  if (!project.floorPlan) return;
  const report = F.calculate(project), plan = report.plan, quantities = Cables.calculate(project, report);
  if (floorRouteSelection && !report.circuits.some((c) => c.deviceId === floorRouteSelection.deviceId && c.legs.some((leg) => leg.fromId === floorRouteSelection.fromId && leg.toId === floorRouteSelection.toId))) floorRouteSelection = null;
  const cableSettingsOpen = $("#floorCableReport").querySelector("[data-cable-settings]")?.open;
  if (!plan.rooms.some((room) => room.id === floorRoomId)) floorRoomId = plan.rooms[0]?.id || "";
  if (floorGeometryEditing && plan.geometryMode !== "free") floorGeometryEditing = false;
  if (floorCircuitId && !F.branches(project).some((c) => c.id === floorCircuitId)) floorCircuitId = "";
  $("#floorCeilingInput").value = plan.ceilingHeightM;
  $("#floorRoutingInput").value = plan.routing;
  $("#floorWallInput").value = plan.wallThicknessM;
  const fixedThickness = plan.geometryMode === "free" && plan.rooms.length > 0;
  $("#floorWallInput").disabled = fixedThickness;
  $("#floorWallHelp").classList.toggle("hidden", !fixedThickness);
  $("#floorReserveInput").value = plan.reservePercent;
  $("#floorAllowanceInput").value = plan.endAllowanceM;
  $("#floorConfirmedInput").checked = plan.geometryConfirmed;
  $("#floorAutoLengthsInput").checked = plan.syncWithCircuits;
  $("#floorAutoLengthsInput").disabled = !project.design;
  $("#floorRoomSelect").innerHTML = plan.rooms.map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`).join("");
  $("#floorRoomSelect").value = floorRoomId;
  $("#floorCircuitFilter").innerHTML = '<option value="">Усі кола</option>' + F.branches(project).map((circuit) => `<option value="${escapeHtml(circuit.id)}">${escapeHtml(circuit.label)} · ${escapeHtml(circuit.name)}${circuit.planned ? " · план" : ""}</option>`).join("");
  $("#floorCircuitFilter").value = floorCircuitId;
  $("#floorSummary").innerHTML = `<article><span>Площа всередині</span><strong>${floorNumber(report.arrangement.areaM2)} <small>м²</small></strong></article><article><span>Електричні точки</span><strong>${plan.points.filter((p) => p.type !== "panel").length} <small>точок</small></strong></article><article><span>Кабель із запасом ${plan.reservePercent}%</span><strong>≈ ${report.totalPurchaseM} <small>м</small></strong></article><article><span>Вихідні дані</span><strong class="floor-data-state">${plan.geometryConfirmed ? "Підтверджені обміри" : "Типовий ескіз"}</strong></article>`;
  $("#floorWarnings").innerHTML = report.warnings.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
  $("#floorCableReport").innerHTML = `<div class="floor-report-heading"><h3>Кабельна відомість</h3><span>Живлення від щита або вибраної дози. Натисніть трасу, щоб вставити дозу; спільні ділянки враховані один раз.</span></div><div class="floor-table-scroll"><table class="floor-table"><thead><tr><th>Коло</th><th>Переріз</th><th>Точок</th><th>Горизонталь</th><th>Вертикаль</th><th>Припуски</th><th>Запас</th><th>Закупівля</th><th>Найдовший шлях¹</th></tr></thead><tbody>${report.circuits.map((c) => `<tr class="${c.deviceId === floorCircuitId ? "active" : ""}"><td><button type="button" data-floor-circuit="${escapeHtml(c.deviceId)}" style="--circuit-color:${c.color}"><i></i><strong>${escapeHtml(c.label)}</strong> ${escapeHtml(c.name)}</button></td><td>${c.section ? `${floorNumber(c.section)} мм²` : "уточнити"}</td><td>${c.pointCount}</td><td>${floorNumber(c.horizontalM)} м</td><td>${floorNumber(c.verticalM)} м</td><td>${floorNumber(c.allowanceM)} м</td><td>${floorNumber(c.reserveM)} м</td><td><strong>${c.purchaseM} м</strong></td><td>≈ ${floorNumber(c.longestPathM)} м</td></tr>`).join("") || '<tr><td colspan="9">Прив’яжіть точки плану до автоматів або дифавтоматів щита.</td></tr>'}</tbody></table></div><p class="floor-footnote">¹ Для розрахунків передається найдовший шлях живлення з припусками, без закупівельного запасу. Для освітлення враховано ділянку до вимикача за однакового перерізу. Номінали та придатність кабелю не визначаються лише цим метражем.</p><div class="floor-sync-row"><button type="button" class="button primary" id="floorSyncButton" ${project.design && report.circuits.length ? "" : "disabled"}>Передати довжини до розрахунків</button><span>${plan.syncWithCircuits ? "Зв’язок увімкнено: подальші зміни плану оновлюють довжини кіл." : "Метраж розраховується автоматично. Передавання до електричних розрахунків вмикається цією кнопкою."}</span></div>`;
  $("#floorPointSchedule").innerHTML = `<h3>Розміщення та висоти точок</h3><div class="floor-table-scroll"><table class="floor-table"><thead><tr><th>Позначення</th><th>Тип / назва</th><th>Приміщення</th><th>${plan.geometryMode === "free" ? "X / Y від габаритної межі" : "Від лівої / верхньої стіни"}</th><th>Висота</th><th>Коло</th><th>Монтаж</th><th>Траса від</th></tr></thead><tbody>${plan.points.map((point) => { const room = report.arrangement.rooms.find((item) => item.id === point.roomId), circuit = F.branches(project).find((d) => d.id === point.circuitId); return `<tr><td><button type="button" data-floor-select="${escapeHtml(point.id)}">${escapeHtml(point.label)}</button></td><td>${escapeHtml(point.name)}</td><td>${escapeHtml(room.name)}</td><td>${floorNumber(point.u * room.widthM)} / ${floorNumber(point.v * room.depthM)} м</td><td>${floorNumber(F.pointHeight(plan, point))} м</td><td>${escapeHtml(circuit?.label || (point.type === "panel" ? "Ввід" : "не призначено"))}</td><td>${point.type === "junction" ? F.junctionMounting(plan, point) === "ceiling" ? "На стелі" : "На стіні" : "—"}</td><td>${escapeHtml(F.sourceFor(plan, point)?.label || "—")}</td></tr>`; }).join("")}</tbody></table></div>`;
  const completeCircuits = report.circuits.filter((c) => !c.incomplete), sum = (key) => floorNumber(completeCircuits.reduce((total, c) => total + c[key], 0));
  $("#floorCableReport").innerHTML = $("#floorCableReport").innerHTML.replace("</tbody>", `</tbody><tfoot><tr><th colspan="2">${quantities.cableTotals.missing ? "Разом за повними колами" : "Разом"}</th><td>${sum("pointCount")}</td><td>${sum("horizontalM")} м</td><td>${sum("verticalM")} м</td><td>${sum("allowanceM")} м</td><td>${sum("reserveM")} м</td><td><strong>${sum("purchaseM")} м</strong></td><td>—</td></tr></tfoot>`);
  if (report.circuits.some((c) => c.incomplete)) {
    $("#floorSummary article:nth-child(3) strong").textContent = quantities.cableTotals.missing === quantities.cableTotals.circuits ? "Немає повного метражу" : `≥ ${quantities.cableTotals.purchaseM} м · є непобудовані траси`;
    report.circuits.filter((c) => c.incomplete).forEach((c) => { const row = $("#floorCableReport tbody").querySelector(`[data-floor-circuit="${CSS.escape(c.deviceId)}"]`).closest("tr"); row.cells[7].textContent = "Неповний метраж"; row.cells[8].textContent = "—"; });
  }
  $("#floorCableReport").innerHTML += cableSummaryMarkup(quantities, { includeWires: false, settingsOpen: cableSettingsOpen });
  restoreFloorForm("settings"); renderFloorRoom(); renderFloorPoint(); renderFloorGeometry(); renderFloorUX(); renderFloorPencil();
  if (typeof renderFloorCircuits === "function") renderFloorCircuits(report);
  if (typeof renderLevels === "function") { renderLevels(); tracePointInfo(); }
  renderFloorCanvas();
}
function renderFloorRoom() {
  if (!project.floorPlan) return;
  const room = F.layout(project.floorPlan).rooms.find((item) => item.id === floorRoomId);
  $$("#floorRoomEditor input, #floorRoomEditor select, #floorApplyRoom").forEach((el) => { el.disabled = !room; });
  if (!room) { restoreFloorForm("room", floorRoomId); return; }
  $("#floorRoomName").value = room.name; $("#floorRoomWidth").value = floorPrecise(room.widthM); $("#floorRoomDepth").value = floorPrecise(room.depthM);
  $("#floorRoomRow").value = room.row; $("#floorRoomDoor").value = Math.round(room.doorU * 100);
  $("#floorRoomWindow").value = room.windowWall; $("#floorOutsideLevel").value = room.routeLevelM;
  const free = project.floorPlan.geometryMode === "free";
  ["#floorRoomWidth", "#floorRoomDepth"].forEach((id) => { $(id).min = free ? .4 : .8; $(id).max = free ? 50 : 30; });
  $("#floorRoomWidth").disabled = room.row === "hall" && !free; $("#floorRoomRow").disabled = room.row === "hall" || free;
  $("#floorRoomRow option[value='hall']").disabled = room.row !== "hall";
  $("#floorRoomDoor").disabled = room.row === "hall" || free; $("#floorRoomWindow").disabled = room.row === "hall" || free;
  $("#floorRoomGeometryHelp").textContent = free ? "Ширина й глибина — габаритний прямокутник форми. Двері та вікна редагуються на вибраній стіні. Площа рахується за контуром." : "Розміри — чисті всередині кімнати. Коридор і сусідні приміщення перераховуються; точки зберігають відносні місця.";
  $("#floorOutsideField").classList.toggle("hidden", room.kind !== "outdoor");
  restoreFloorForm("room", floorRoomId);
}
function renderFloorPoint() {
  const plan = floorPointPreview || project.floorPlan, point = plan?.points.find((p) => p.id === floorSelectedId);
  $("#floorPointFields").classList.toggle("hidden", !point);
  $("#floorPointEmpty").classList.toggle("hidden", Boolean(point));
  $("#floorJunctionConnections").classList.toggle("hidden", point?.type !== "junction");
  $("#floorPointFields").classList.toggle("is-junction", point?.type === "junction");
  if (!point) { floorJunctionDraft = null; floorPointPropertiesFor = null; restoreFloorForm("point", ""); return; }
  if (floorPointPropertiesFor !== point.id) $("#floorPointProperties").open = false;
  floorPointPropertiesFor = point.id;
  $("#floorApplyPoint").textContent = point.type === "junction" ? "Застосувати дозу та підключення" : "Застосувати точку";
  const room = F.layout(plan).rooms.find((item) => item.id === point.roomId);
  $("#floorPointXLabel").textContent = plan.geometryMode === "free" ? "X від габаритної межі, м" : "Від лівої стіни, м";
  $("#floorPointYLabel").textContent = plan.geometryMode === "free" ? "Y від габаритної межі, м" : "Від верхньої стіни, м";
  $("#floorPointTitle").textContent = `${point.label} · ${F.TYPES[point.type]}`;
  $("#floorPointName").value = point.name; $("#floorPointLabel").value = point.label;
  $("#floorPointRoom").innerHTML = plan.rooms.map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}</option>`).join(""); $("#floorPointRoom").value = point.roomId;
  $("#floorPointX").value = (point.u * room.widthM).toFixed(2); $("#floorPointY").value = (point.v * room.depthM).toFixed(2);
  $("#floorPointHeight").value = F.pointHeight(plan, point); $("#floorPointAtCeiling").checked = point.heightM === null;
  $("#floorPointHeight").disabled = point.heightM === null;
  $("#floorJunctionMountField").classList.toggle("hidden", point.type !== "junction");
  $("#floorPointCeilingField").classList.toggle("hidden", point.type === "junction");
  if (point.type === "junction") $("#floorJunctionMounting").value = F.junctionMounting(plan, point);
  $("#floorPointCircuit").innerHTML = '<option value="">Не призначено</option>' + F.branches(project).map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.label)} · ${escapeHtml(d.name)}</option>`).join(""); $("#floorPointCircuit").value = point.circuitId;
  $("#floorPointCircuit").disabled = point.type === "panel" || point.type === "switch";
  $("#floorSwitchField").classList.toggle("hidden", point.type !== "switch");
  $("#floorPointControls").innerHTML = '<option value="">Оберіть світильник</option>' + plan.points.filter((p) => p.type === "light").map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)} · ${escapeHtml(p.name)}</option>`).join(""); $("#floorPointControls").value = point.controlsId || "";
  renderFloorSources(point, point.circuitId);
  prepareFloorJunctionConnections(point);
  restoreFloorForm("point", point.id);
}
function prepareFloorJunctionConnections(point) {
  if (point.type !== "junction") { floorJunctionDraft = null; return; }
  if (!floorJunctionDraft || floorJunctionDraft.id !== point.id || floorJunctionDraft.plan !== project.floorPlan) {
    const sameJunction = floorJunctionDraft?.id === point.id, previousRoom = sameJunction ? $("#floorJunctionRoomFilter").value : "", previousSearch = sameJunction ? $("#floorJunctionSearch").value : "";
    floorJunctionDraft = { id: point.id, plan: project.floorPlan, fingerprint: JSON.stringify(project.floorPlan), changed: false, circuitId: point.circuitId, selected: new Set(project.floorPlan.points.filter((p) => p.type !== "switch" && p.supplyFromId === point.id).map((p) => p.id)) };
    $("#floorJunctionRoomFilter").innerHTML = '<option value="">Усі кімнати</option>' + project.floorPlan.rooms.map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`).join("");
    $("#floorJunctionRoomFilter").value = project.floorPlan.rooms.some((room) => room.id === previousRoom) ? previousRoom : ""; $("#floorJunctionSearch").value = previousSearch;
  }
  renderFloorJunctionConnections();
}
function visibleFloorJunctionCandidates(info) {
  const roomId = $("#floorJunctionRoomFilter").value, search = $("#floorJunctionSearch").value.trim().toLocaleLowerCase("uk");
  return info.candidates.filter((point) => (!roomId || point.roomId === roomId) && (!search || `${point.label} ${point.name} ${F.TYPES[point.type]} ${point.roomName}`.toLocaleLowerCase("uk").includes(search)));
}
function updateFloorJunctionCount(info) {
  const selected = info.candidates.filter((point) => floorJunctionDraft.selected.has(point.id)), invalid = selected.filter((point) => !point.eligible).length;
  $("#floorJunctionCount").textContent = `Вибрано: ${selected.length} · доступно: ${info.candidates.filter((point) => point.eligible).length}${invalid ? ` · перевірте ${invalid} несумісних` : ""}`;
  $("#floorJunctionCount").classList.toggle("has-conflicts", invalid > 0);
  const visible = visibleFloorJunctionCandidates(info);
  $("#floorJunctionSelectVisible").disabled = !visible.some((point) => point.eligible && !floorJunctionDraft.selected.has(point.id));
  $("#floorJunctionClearVisible").disabled = !visible.some((point) => floorJunctionDraft.selected.has(point.id));
}
function renderFloorJunctionConnections() {
  if (!floorJunctionDraft) return;
  const info = F.junctionConnections(project, floorJunctionDraft.id, floorJunctionDraft.circuitId), visible = visibleFloorJunctionCandidates(info);
  $("#floorJunctionHelp").textContent = info.circuitLabel ? `${info.junction.label} · ${info.circuitLabel}. Один спільний кабель до дози й відгалуження до вибраних точок. Точки інших автоматів позначені в списку.` : "Спочатку виберіть коло щита вище. Можна вибрати точки з різних кімнат одного кола.";
  let roomId = null, unavailableStarted = false;
  const grouped = project.floorPlan.rooms.map((room) => visible.filter((point) => point.roomId === room.id)).flat();
  const ordered = [...grouped.filter((point) => point.eligible || point.connected), ...grouped.filter((point) => !point.eligible && !point.connected)];
  $("#floorJunctionPointList").innerHTML = !info.circuitLabel ? '<p class="floor-help">Оберіть автомат, від якого живитиметься доза.</p>' : visible.length ? ordered.map((point) => {
    let separator = "";
    if (!point.eligible && !point.connected && !unavailableStarted) { separator = '<h5 class="floor-junction-unavailable-heading">Інші кола та залежності</h5>'; roomId = null; unavailableStarted = true; }
    const heading = roomId !== point.roomId ? `<h5>${escapeHtml(point.roomName)}</h5>` : ""; roomId = point.roomId;
    return `${separator}${heading}<label class="floor-junction-choice ${!point.eligible ? "unavailable" : ""}"><input type="checkbox" data-floor-junction-point="${escapeHtml(point.id)}" ${floorJunctionDraft.selected.has(point.id) ? "checked" : ""} ${!point.eligible && !point.connected && !floorJunctionDraft.selected.has(point.id) ? "disabled" : ""}/><span><strong>${escapeHtml(point.label)}</strong> · ${escapeHtml(point.name)}<small>${escapeHtml(point.reason || `${F.TYPES[point.type]}${!point.circuitId ? " · буде призначено цьому колу" : ""}`)}</small></span></label>`;
  }).join("") : '<p class="floor-help">За цим фільтром точок немає.</p>';
  updateFloorJunctionCount(info);
}
function initFloorJunctionConnections() {
  $("#floorJunctionRoomFilter").addEventListener("change", renderFloorJunctionConnections);
  $("#floorJunctionSearch").addEventListener("input", renderFloorJunctionConnections);
  $("#floorJunctionPointList").addEventListener("change", (event) => {
    const id = event.target.dataset.floorJunctionPoint; if (!id || !floorJunctionDraft) return;
    floorJunctionDraft.changed = true;
    if (event.target.checked) floorJunctionDraft.selected.add(id); else floorJunctionDraft.selected.delete(id);
    updateFloorJunctionCount(F.junctionConnections(project, floorJunctionDraft.id, floorJunctionDraft.circuitId));
    recordFloorFormEdit("point");
  });
  [["#floorJunctionSelectVisible", true], ["#floorJunctionClearVisible", false]].forEach(([selector, select]) => $(selector).addEventListener("click", () => {
    if (!floorJunctionDraft) return;
    const info = F.junctionConnections(project, floorJunctionDraft.id, floorJunctionDraft.circuitId);
    floorJunctionDraft.changed = true;
    visibleFloorJunctionCandidates(info).forEach((point) => { if (!select) floorJunctionDraft.selected.delete(point.id); else if (point.eligible) floorJunctionDraft.selected.add(point.id); });
    renderFloorJunctionConnections(); recordFloorFormEdit("point");
  }));
}
function renderFloorSources(point, circuitId, resetInvalid = false) {
  const select = $("#floorPointSource"), plan = project.floorPlan;
  $("#floorSourceField").classList.toggle("hidden", point.type === "panel");
  const defaultName = point.type === "switch" ? "Від світильника (ділянка керування)" : "Безпосередньо від щита";
  select.innerHTML = `<option value="">${defaultName}</option>` + F.supplyOptions(plan, point, circuitId).map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)} · ${escapeHtml(p.name)}</option>`).join("");
  const invalid = point.supplyFromId && !F.supplyOptions(plan, point, circuitId).some((p) => p.id === point.supplyFromId);
  if (invalid && !resetInvalid) select.innerHTML += `<option value="${escapeHtml(point.supplyFromId)}">Перевірте джерело: інше коло</option>`;
  select.value = invalid && resetInvalid ? "" : point.supplyFromId || "";
  $("#floorSourceHelp").textContent = "Для траси потрібні коло та джерело живлення. Після вибору натисніть «Застосувати». Щит, доза й попередня точка задаються тут або мишкою кнопкою «З’єднати».";
}
function selectFloorPoint(id) {
  floorJunctionDraft = null;
  floorSelectedId = id; floorRouteSelection = null;
  requestFloorSidebar("points");
  const point = project.floorPlan.points.find((p) => p.id === id);
  if (point) { floorRoomId = point.roomId; floorCircuitId = point.circuitId; }
  renderFloorPlan();
  $("#floorPointEditor").open = true;
}
function saveFloorSettings() { return applyFloorForm("settings", saveFloorSettingsValues); }
function saveFloorSettingsValues() {
  const next = clone(project.floorPlan);
  if (next.geometryMode === "free" && next.rooms.length && Number($("#floorWallInput").value) !== next.wallThicknessM) { toast("Товщина стін готового контуру зафіксована. Задайте її до побудови кімнат у типовому плані або на чистому полотні.", "error"); renderFloorPlan(); return; }
  Object.assign(next, { ceilingHeightM: Number($("#floorCeilingInput").value), routing: $("#floorRoutingInput").value, wallThicknessM: Number($("#floorWallInput").value), reservePercent: Number($("#floorReserveInput").value), endAllowanceM: Number($("#floorAllowanceInput").value), geometryConfirmed: $("#floorConfirmedInput").checked, syncWithCircuits: $("#floorAutoLengthsInput").checked });
  commitFloorPlan(next, true);
}
function saveFloorRoom() { return applyFloorForm("room", saveFloorRoomValues); }
function saveFloorRoomValues() {
  let next = clone(project.floorPlan);
  if (next.geometryMode === "free") {
    try { next = FG.resizeRoom(next, floorRoomId, readFloorNumber("#floorRoomWidth", "ширину кімнати"), readFloorNumber("#floorRoomDepth", "глибину кімнати")); }
    catch (error) { toast(error.message, "error"); return; }
    const room = next.rooms.find((r) => r.id === floorRoomId); room.name = $("#floorRoomName").value.trim() || room.name; room.routeLevelM = Number($("#floorOutsideLevel").value); commitFloorPlan(next); return;
  }
  const room = next.rooms.find((r) => r.id === floorRoomId);
  if (room.row !== "hall") { room.widthM = Number($("#floorRoomWidth").value); room.row = $("#floorRoomRow").value; }
  Object.assign(room, { name: $("#floorRoomName").value.trim() || room.name, depthM: Number($("#floorRoomDepth").value), doorU: Number($("#floorRoomDoor").value) / 100, windowWall: $("#floorRoomWindow").value, routeLevelM: Number($("#floorOutsideLevel").value) });
  commitFloorPlan(next);
}
function saveFloorPoint() { return applyFloorForm("point", saveFloorPointValues); }
function saveFloorPointValues() {
  let next = clone(project.floorPlan); const point = next.points.find((p) => p.id === floorSelectedId);
  if (!point) return;
  const room = F.layout(next).rooms.find((r) => r.id === $("#floorPointRoom").value);
  Object.assign(point, { roomId: room.id, name: $("#floorPointName").value.trim() || point.name, label: $("#floorPointLabel").value.trim() || point.label, u: Number($("#floorPointX").value) / room.widthM, v: Number($("#floorPointY").value) / room.depthM, heightM: $("#floorPointAtCeiling").checked ? null : Number($("#floorPointHeight").value), circuitId: point.type === "panel" ? "" : $("#floorPointCircuit").value });
  if (point.type === "switch") { point.controlsId = $("#floorPointControls").value; point.circuitId = next.points.find((p) => p.id === point.controlsId)?.circuitId || ""; }
  if (point.type !== "panel") point.supplyFromId = $("#floorPointSource").value;
  if (point.type === "light") next.points.filter((p) => p.controlsId === point.id).forEach((p) => { p.circuitId = point.circuitId; });
  if (point.circuitId !== project.floorPlan.points.find((p) => p.id === point.id)?.circuitId) next = F.assignCircuit({ ...project, floorPlan: next }, [point.id], point.circuitId);
  delete point.placementReview;
  if (point.type === "junction") {
    try {
      const mounting = $("#floorJunctionMounting").value;
      next = F.withJunctionMounting(next, point.id, mounting, mounting === "wall" ? readFloorNumber("#floorPointHeight", "висоту дози") : undefined);
      if (floorJunctionDraft?.id === point.id && floorJunctionDraft.changed) {
        if (floorJunctionDraft.fingerprint !== JSON.stringify(project.floorPlan)) throw new Error("План змінився після вибору точок. Виберіть дозу знову й перевірте підключення.");
        next = F.setJunctionConnections({ ...project, floorPlan: next }, point.id, [...floorJunctionDraft.selected]);
      }
    }
    catch (error) { toast(error.message, "error"); return; }
    const previousCircuit = floorCircuitId; floorCircuitId = point.circuitId;
    if (!commitFloorPlan(next)) floorCircuitId = previousCircuit;
    return;
  }
  commitFloorPlan(next);
}
function addFloorPoint() {
  let next = clone(project.floorPlan);
  const selectedType = $("#floorQuickPointType").value, type = selectedType === "junction-wall" ? "junction" : selectedType, room = next.rooms.find((r) => r.id === floorRoomId);
  if (!room) return;
  const lamp = next.points.find((p) => p.type === "light" && p.roomId === room.id), selected = next.points.find((p) => p.id === floorSelectedId);
  const prefix = { socket: "X", light: "EL", switch: "S", equipment: "EP", junction: "Д" }[type];
  let index = 1; while (next.points.some((p) => p.label === `${prefix}${index}`)) index += 1;
  const point = { id: uid(), type, roomId: room.id, u: ["light", "junction"].includes(type) ? .5 : 0, v: .5, heightM: ["light", "junction"].includes(type) ? null : type === "switch" ? .9 : .3, label: `${prefix}${index}`, name: F.TYPES[type], circuitId: type === "switch" ? lamp?.circuitId || "" : floorCircuitId || "" };
  if (type === "junction") { point.mounting = selectedType === "junction-wall" ? "wall" : "ceiling"; if (point.mounting === "wall") point.heightM = Math.max(0, next.ceilingHeightM - .2); }
  if (type === "switch" && lamp) point.controlsId = lamp.id;
  if (selected?.type === "junction" && selected.circuitId && selected.circuitId === point.circuitId) point.supplyFromId = selected.id;
  try {
    if (type === "junction" && floorRouteSelection) {
      placeFloorJunction(next, point, floorRouteSelection.at);
      next = F.insertJunction({ ...project, floorPlan: next }, floorRouteSelection, point);
    } else {
      F.placePoint(next, point, F.world(next, point), type !== "light" && $("#floorSnapWall").checked);
      next.points.push(point);
    }
    floorSelectedId = point.id; floorRoomId = point.roomId;
    if (commitFloorPlan(next)) openFloorProperties();
  } catch (error) { toast(error.message, "error"); }
}
function deleteFloorPoint() {
  const point = project.floorPlan.points.find((p) => p.id === floorSelectedId);
  if (!point || point.type === "panel") return;
  const next = F.removePoint(project.floorPlan, point.id);
  floorSelectedId = null; if (commitFloorPlan(next) && point.type === "junction") toast("Дозу видалено. Її відгалуження повернуто до попереднього джерела траси.");
}
function floorScreenPosition(event) {
  const svg = $("#floorCanvas .floor-svg"), screen = svg.createSVGPoint(); screen.x = event.clientX; screen.y = event.clientY;
  const local = screen.matrixTransform(svg.getScreenCTM().inverse()), arrangement = F.layout(project.floorPlan);
  return { x: (local.x - PanelFloorSvg.LEFT) / PanelFloorSvg.SCALE + arrangement.minX, y: (local.y - PanelFloorSvg.TOP) / PanelFloorSvg.SCALE + arrangement.minY };
}
function placeFloorJunction(plan, point, at) {
  const rooms = F.layout(plan).rooms, contains = (r) => plan.geometryMode === "free" ? FG.contains(r, at) || FG.nearest(r, at).distance < .001 : at.x >= r.x && at.x <= r.x + r.widthM && at.y >= r.y && at.y <= r.y + r.depthM;
  const room = rooms.find((r) => r.id === point.roomId && contains(r)) || rooms.find(contains);
  if (!room) throw new Error("Вставляйте дозу на ділянку кабелю всередині кімнати або коридору.");
  point.roomId = room.id; F.placePoint(plan, point, at);
  if (F.junctionMounting(plan, point) === "ceiling") { point.mounting = "ceiling"; point.heightM = null; }
}
function selectFloorRoute(node, position = null) {
  const report = F.calculate(project), circuit = report.circuits.find((c) => c.deviceId === node.dataset.floorRouteCircuit), leg = circuit?.legs.find((l) => l.toId === node.dataset.floorRoute && l.kind === "feed");
  if (!leg) return;
  const at = position || leg.points[Math.floor(leg.points.length / 2)];
  floorRouteSelection = F.hitRoute(project, at, { circuitId: circuit.deviceId, toId: leg.toId, toleranceM: .5 });
  if (!floorRouteSelection) return;
  floorSelectedId = null; floorCircuitId = circuit.deviceId; if (!$("#floorQuickPointType").value.startsWith("junction")) $("#floorQuickPointType").value = "junction";
  renderFloorPlan();
}
function stopFloorConnections() {
  const active = floorConnectMode;
  floorConnectMode = false; floorConnectSourceId = null;
  return active;
}
function setFloorConnectMode(enabled) {
  cancelFloorInteractions();
  if (!enabled) { renderFloorPlan(); return; }
  floorGeometryEditing = false; floorWallIndex = null; floorVertexIndex = null; floorOpeningKind = null; floorPanMode = false;
  floorRouteSelection = null; floorConnectMode = true;
  requestFloorSidebar("connections");
  floorConnectSourceId = floorConnectPattern === "radial" ? project.floorPlan.points.find((p) => p.type === "panel")?.id || null : null;
  $("#floorShowRoutes").checked = true;
  renderFloorPlan();
}
function chooseFloorConnectionPoint(id) {
  const plan = project.floorPlan, point = plan.points.find((p) => p.id === id);
  if (!point) return;
  if (point.type === "panel" || !floorConnectSourceId) {
    if (point.type === "switch") { toast("Почніть лінію від щита, дози або точки живлення. Вимикач можна вибрати кінцевою точкою.", "error"); return; }
    floorConnectSourceId = point.id; floorSelectedId = point.id; floorRoomId = point.roomId;
    if (point.circuitId) floorCircuitId = point.circuitId;
    renderFloorPlan(); return;
  }
  if (id === floorConnectSourceId) return;
  try {
    const next = F.connectPoints(project, floorConnectSourceId, id, floorCircuitId), nextPoint = next.points.find((p) => p.id === id);
    const changed = next.points.some((p) => p.circuitId !== plan.points.find((old) => old.id === p.id)?.circuitId) || F.sourceFor(plan, point)?.id !== F.sourceFor(next, nextPoint)?.id;
    if (changed && !commitFloorPlan(next)) return;
    floorSelectedId = point.id; floorRoomId = point.roomId; floorCircuitId = nextPoint.circuitId;
    floorConnectSourceId = floorConnectPattern === "radial" ? next.points.find((p) => p.type === "panel")?.id || null : point.type === "switch" ? null : point.id;
    renderFloorPlan();
  } catch (error) { toast(error.message, "error"); }
}
function paintFloorConnectionPreview(event) {
  const svg = $("#floorCanvas .floor-svg"), source = project.floorPlan.points.find((p) => p.id === floorConnectSourceId);
  if (!svg || !source) return;
  const pos = floorScreenPosition(event), arrangement = F.layout(project.floorPlan), start = F.world(project.floorPlan, source, arrangement);
  const x = (value) => PanelFloorSvg.LEFT + (value - arrangement.minX) * PanelFloorSvg.SCALE, y = (value) => PanelFloorSvg.TOP + (value - arrangement.minY) * PanelFloorSvg.SCALE;
  svg.querySelector("[data-floor-connection-preview]")?.remove();
  svg.insertAdjacentHTML("beforeend", `<path data-floor-connection-preview="true" d="M${x(start.x)} ${y(start.y)}L${x(pos.x)} ${y(start.y)}L${x(pos.x)} ${y(pos.y)}" class="floor-connect-preview" pointer-events="none"/>`);
}
function exportFloorCsv() {
  const r = F.calculate(project), rows = [["План приміщень", r.plan.name], ["Обміри й маршрути", r.plan.geometryConfirmed ? "підтверджені користувачем" : "типовий ескіз; довжини попередні"], ["Прокладання", r.plan.routing], ["Висота стелі, м", r.plan.ceilingHeightM], ["Запас, %", r.plan.reservePercent], ["Припуск на кінець, м", r.plan.endAllowanceM], [], ["Коло", "Назва", "S, мм²", "Точок", "Горизонталь, м", "Вертикаль, м", "Припуски, м", "Запас, м", "Закупівля, м", "Найдовший шлях, м"]];
  rows[rows.length - 1].push("Стан траси");
  r.circuits.forEach((c) => rows.push([c.label, c.name, c.section ?? "", c.pointCount, c.horizontalM, c.verticalM, c.allowanceM, c.reserveM, c.incomplete ? "" : c.purchaseM, c.incomplete ? "" : c.longestPathM, c.incomplete ? "Неповний метраж" : "Побудовано"]));
  rows.push([], ["Позначення", "Назва", "Приміщення", "X у кімнаті, м", "Y у кімнаті, м", "Висота, м", "Коло", "Монтаж", "Траса від"]);
  r.plan.points.forEach((point) => { const room = r.arrangement.rooms.find((r) => r.id === point.roomId), d = project.devices.find((d) => d.id === point.circuitId); rows.push([point.label, point.name, room.name, point.u * room.widthM, point.v * room.depthM, F.pointHeight(r.plan, point), d?.label || "", point.type === "junction" ? F.junctionMounting(r.plan, point) === "ceiling" ? "На стелі" : "На стіні" : "", F.sourceFor(r.plan, point)?.label || ""]); });
  rows.push([], ["Ділянки кабелів", "Від", "До", "Призначення", "Траса, м", "Припуски, м"]);
  r.circuits.forEach((c) => c.legs.forEach((leg) => rows.push([c.label, r.plan.points.find((p) => p.id === leg.fromId).label, r.plan.points.find((p) => p.id === leg.toId).label, leg.kind === "switch" ? "Керування" : "Живлення", leg.lengthM, leg.allowanceM])));
  r.warnings.forEach((warning) => rows.push(["Примітка", warning]));
  rows.push(...Cables.csvRows(Cables.calculate(project, r), E.COLORS, { includeWires: false }));
  downloadBlob(csvContent(rows), `${slugify(project.name)}-floor-cables.csv`, "text/csv;charset=utf-8");
}
function initFloorPlan() {
  initFloorJunctionConnections();
  const exportMenu = $(".floor-export-menu");
  exportMenu.addEventListener("click", (event) => { if (event.target.closest("button")) exportMenu.open = false; });
  document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".floor-export-menu")) exportMenu.open = false; });
  try { $("#floorShowGrid").checked = localStorage.getItem("electropanel-v3-floor-grid-visible") !== "false"; } catch { /* Keep the visible default if preferences are unavailable. */ }
  $("#floorShowGrid").addEventListener("change", () => { try { localStorage.setItem("electropanel-v3-floor-grid-visible", String($("#floorShowGrid").checked)); } catch { /* Visibility still works for this session. */ } renderFloorCanvas(); });
  $("#floorGeometryGrid").addEventListener("change", renderFloorCanvas);
  $("#floorGenerateButton").addEventListener("click", () => { floorSelectedId = null; floorCircuitId = ""; const reset=F.create(project,$("#floorTemplateInput").value);
    for (const k of ["levelId","levelName","elevationM"]) if (project.floorPlan[k]!=null) reset[k]=project.floorPlan[k];
    commitFloorPlan(reset); });
  $("#floorUndoButton").addEventListener("click", undoFloorChange);
  $("#floorApplySettings").addEventListener("click", saveFloorSettings); $("#floorApplyRoom").addEventListener("click", saveFloorRoom); $("#floorApplyPoint").addEventListener("click", saveFloorPoint);
  $("#floorRoomSelect").addEventListener("change", () => { floorRoomId = $("#floorRoomSelect").value; floorWallIndex = null; floorVertexIndex = null; floorOpeningKind = null; renderFloorRoom(); renderFloorGeometry(); renderFloorUX(); renderFloorCanvas(); });
  $("#floorPointAtCeiling").addEventListener("change", () => { $("#floorPointHeight").disabled = $("#floorPointAtCeiling").checked; if ($("#floorPointAtCeiling").checked) $("#floorPointHeight").value = project.floorPlan.ceilingHeightM; });
  $("#floorJunctionMounting").addEventListener("change", () => {
    const ceiling = $("#floorJunctionMounting").value === "ceiling";
    $("#floorPointAtCeiling").checked = ceiling; $("#floorPointHeight").disabled = ceiling;
    $("#floorPointHeight").value = ceiling ? project.floorPlan.ceilingHeightM : Math.max(0, project.floorPlan.ceilingHeightM - .2);
  });
  $("#floorPointCircuit").addEventListener("change", () => {
    const point = project.floorPlan.points.find((p) => p.id === floorSelectedId), circuitId = $("#floorPointCircuit").value;
    if (point) renderFloorSources(point, circuitId, true);
    if (point?.type === "junction" && floorJunctionDraft) {
      floorJunctionDraft.circuitId = circuitId;
      floorJunctionDraft.changed = true;
      if (point.supplyFromId && project.floorPlan.points.find((p) => p.id === point.supplyFromId)?.circuitId !== circuitId) $("#floorPointSource").value = "";
      renderFloorJunctionConnections();
    }
  });
  $("#floorPointControls").addEventListener("change", () => { const point = project.floorPlan.points.find((p) => p.id === floorSelectedId), lamp = project.floorPlan.points.find((p) => p.id === $("#floorPointControls").value); if (point) { $("#floorPointCircuit").value = lamp?.circuitId || ""; renderFloorSources(point, lamp?.circuitId || ""); } });
  $("#floorQuickPointType").addEventListener("change", () => { floorRouteSelection = null; renderFloorUX(); renderFloorCanvas(); });
  $("#floorConnectMode").addEventListener("click", () => setFloorConnectMode(!floorConnectMode));
  $("#floorConnectionPattern").addEventListener("change", () => {
    floorConnectPattern = $("#floorConnectionPattern").value;
    floorConnectSourceId = floorConnectPattern === "radial" ? project.floorPlan.points.find((p) => p.type === "panel")?.id || null : null;
    renderFloorPlan();
  });
  $("#floorCircuitFilter").addEventListener("change", () => { floorRouteSelection = null; floorCircuitId = $("#floorCircuitFilter").value; if (floorConnectMode) floorConnectSourceId = floorConnectPattern === "radial" ? project.floorPlan.points.find((p) => p.type === "panel")?.id || null : null; renderFloorPlan(); });
  ["#floorShowRoutes", "#floorShowHeights"].forEach((id) => $(id).addEventListener("change", renderFloorCanvas));
  ["#floorCeilingInput", "#floorRoutingInput", "#floorWallInput", "#floorAllowanceInput"].forEach((id) => $(id).addEventListener("input", () => { $("#floorConfirmedInput").checked = false; }));
  $("#floorCsvButton").addEventListener("click", exportFloorCsv);
  $("#floorSvgButton").addEventListener("click", () => downloadBlob(PanelFloorSvg.render(project, { showRoutes: $("#floorShowRoutes").checked, showHeights: $("#floorShowHeights").checked, circuitId: floorCircuitId }), `${slugify(project.name)}-floor-plan.svg`, "image/svg+xml;charset=utf-8"));
  $("#floorPrintButton").addEventListener("click", () => { if (floorGeometryEditing) setFloorGeometryMode(false); window.print(); });
  [["#floorZoomOut", 1 / 1.2], ["#floorZoomIn", 1.2]].forEach(([selector, factor]) => $(selector).addEventListener("click", () => zoomFloorPlan(factor)));
  $("#floorFitButton").addEventListener("click", () => { floorScale = null; $("#floorView").scrollTop = 0; renderFloorCanvas(); });
  const queueViewport = () => {
    if (floorViewportFrame !== null) return;
    floorViewportFrame = requestAnimationFrame(() => { floorViewportFrame = null; refreshFloorViewport(); });
  };
  window.addEventListener("resize", queueViewport);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(queueViewport);
    ["#floorView", "#floorCanvas", ".floor-toolbar", ".floor-tools", ".floor-main-tools", ".floor-selection-bar", ".floor-pencil-toolbar", ".floor-navigation-help"].forEach((selector) => observer.observe($(selector)));
  }
  $("#floorCableReport").addEventListener("click", (event) => {
    const circuit = event.target.closest("[data-floor-circuit]");
    if (circuit) { floorCircuitId = floorCircuitId === circuit.dataset.floorCircuit ? "" : circuit.dataset.floorCircuit; renderFloorPlan(); }
    if (event.target.closest("#floorSyncButton")) { snapshot(); project = F.syncLengths(project); persistProject(); renderAll(); toast("Довжини найдовших шляхів передано. Ескізні дані потребують підтвердження обмірів."); }
  });
  $("#floorPointSchedule").addEventListener("click", (event) => { const point = event.target.closest("[data-floor-select]"); if (point) selectFloorPoint(point.dataset.floorSelect); });
  const canvas = $("#floorCanvas");
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && floorConnectMode) { event.preventDefault(); setFloorConnectMode(false); return; }
    if (event.key === "Escape" && floorRouteSelection) { floorRouteSelection = null; renderFloorPlan(); return; }
    const point = event.target.closest("[data-floor-point]"), route = event.target.closest("[data-floor-route]");
    if (["Enter", " "].includes(event.key) && (point || route)) { event.preventDefault(); if (point) { if (floorConnectMode) chooseFloorConnectionPoint(point.dataset.floorPoint); else selectFloorPoint(point.dataset.floorPoint); } else selectFloorRoute(route); }
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false || floorGeometryEditing || floorPencilActive) return;
    if (floorConnectMode) {
      event.preventDefault();
      const point = event.target.closest("[data-floor-point]");
      if (point) chooseFloorConnectionPoint(point.dataset.floorPoint);
      else { floorConnectSourceId = floorConnectPattern === "radial" ? project.floorPlan.points.find((p) => p.type === "panel")?.id || null : null; renderFloorPlan(); }
      return;
    }
    const route = event.target.closest("[data-floor-route]");
    if (route) { event.preventDefault(); selectFloorRoute(route, floorScreenPosition(event)); return; }
    const node = event.target.closest("[data-floor-point]");
    if (!node) return;
    floorSelectedId = node.dataset.floorPoint; floorRouteSelection = null;
    const point = project.floorPlan.points.find((p) => p.id === floorSelectedId);
    floorDrag = { id: floorSelectedId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, changed: false };
    requestFloorSidebar("points");
    floorCircuitId = point.circuitId; floorRoomId = point.roomId;
    canvas.setPointerCapture(event.pointerId); event.preventDefault(); renderFloorPoint(); $("#floorPointEditor").open = true;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (floorConnectMode) { paintFloorConnectionPreview(event); return; }
    if (!floorDrag || floorDrag.pointerId !== event.pointerId) return;
    if (!floorDrag.changed && Math.hypot(event.clientX - floorDrag.x, event.clientY - floorDrag.y) < 4) return;
    if (!floorDrag.changed) { floorPointPreview = clone(project.floorPlan); floorDrag.changed = true; }
    const svg = $(".floor-svg", canvas), screenPoint = svg.createSVGPoint(); screenPoint.x = event.clientX; screenPoint.y = event.clientY;
    const plan = floorPointPreview;
    const local = screenPoint.matrixTransform(svg.getScreenCTM().inverse()), arrangement = F.layout(plan), point = plan.points.find((p) => p.id === floorDrag.id), room = arrangement.rooms.find((r) => r.id === point.roomId);
    const pos = { x: (local.x - PanelFloorSvg.LEFT) / PanelFloorSvg.SCALE + arrangement.minX, y: (local.y - PanelFloorSvg.TOP) / PanelFloorSvg.SCALE + arrangement.minY };
    floorDrag.position = pos; floorDrag.altKey = event.altKey;
    try { F.placePoint(plan, point, pos, $("#floorSnapWall").checked && point.type !== "light"); }
    catch (error) { toast(error.message, "error"); cancelFloorPointDrag(); return; }
    delete point.placementReview; plan.geometryConfirmed = false;
    if (!floorFrame) floorFrame = requestAnimationFrame(() => { floorFrame = null; renderFloorCanvas(); renderFloorPoint(); });
  });
  const finish = (event) => {
    if (!floorDrag || floorDrag.pointerId !== event.pointerId) return;
    const gesture = floorDrag, changed = gesture.changed; let next = floorPointPreview; floorDrag = null; floorPointPreview = null;
    if (floorFrame) { cancelAnimationFrame(floorFrame); floorFrame = null; }
    if (changed && next) {
      const point = next.points.find((p) => p.id === gesture.id);
      if (point.type === "junction" && gesture.position && !gesture.altKey && $("#floorShowRoutes").checked) {
        const position = F.junctionMounting(next, point) === "wall" ? F.world(next, point) : gesture.position;
        const hit = F.hitRoute(project, position, { excludeId: point.id, circuitId: point.circuitId || floorCircuitId });
        if (hit) {
          try { placeFloorJunction(next, point, hit.at); next = F.insertJunction({ ...project, floorPlan: next }, hit, point); }
          catch (error) { toast(error.message, "error"); renderFloorPlan(); return; }
        }
      }
      commitFloorPlan(next);
    }
    else { renderFloorPlan(); $("#floorPointEditor").open = true; }
  };
  canvas.addEventListener("pointerup", finish); canvas.addEventListener("pointercancel", (event) => { if (floorDrag?.pointerId === event.pointerId) cancelFloorPointDrag(); });
  canvas.addEventListener("pointerleave", () => { $("#floorCanvas .floor-svg")?.querySelector("[data-floor-connection-preview]")?.remove(); });
}

function cancelFloorPointDrag() {
  if (!floorDrag && !floorPointPreview) return;
  floorDrag = null; floorPointPreview = null;
  if (floorFrame) { cancelAnimationFrame(floorFrame); floorFrame = null; }
  renderFloorPlan();
}
function cancelFloorInteractions() {
  const connecting = stopFloorConnections();
  stopFloorPencil();
  cancelFloorPointDrag();
  if (floorGeometryDrag) cancelFloorGeometryDrag();
  floorPanning = null; $("#floorCanvas").classList.remove("panning");
  if (connecting && project.floorPlan) renderFloorPlan();
}

;
/* floor-geometry-ui.js */
/* Pointer editing previews are separate from the saved project until release. */
const FG = PanelFloorGeometry;
let floorGeometryEditing = false;
let floorWallIndex = null;
let floorVertexIndex = null;
let floorOpeningKind = null;
let floorGeometryDrag = null;
let floorGeometryPreview = null;
let floorGeometryFrame = null;
let floorDockingInfo = null;
let floorWallAlignment = null;
let floorGeometryHit = null;
let floorPreviousGeometryHit = null;

function floorGeometryOptions() {
  return { geometryEditing: floorGeometryEditing, selectedRoom: floorRoomId, selectedWall: floorWallIndex, selectedVertex: floorVertexIndex, selectedOpening: floorOpeningKind, viewport: floorGeometryDrag?.viewport, geometryOnly: Boolean(floorGeometryPreview), docking: floorDockingInfo, alignment: floorWallAlignment };
}
function renderFloorGeometry() {
  $("#floorGeometryTools").classList.toggle("hidden", !floorGeometryEditing);
  $("#floorPointsMode").setAttribute("aria-pressed", String(!floorGeometryEditing));
  $("#floorGeometryMode").setAttribute("aria-pressed", String(floorGeometryEditing || floorPencilActive));
  $("#floorView").classList.toggle("editing-geometry", floorGeometryEditing);
  const plan = floorGeometryPreview || project.floorPlan;
  if (!plan || plan.geometryMode !== "free") return;
  const room = plan.rooms.find((r) => r.id === floorRoomId), edge = room && FG.edgeAt(room, floorWallIndex), wall = edge?.wall, vertex = room && FG.vertexAt(room, floorVertexIndex);
  if (!wall) floorWallIndex = null; if (!vertex) floorVertexIndex = null;
  if (!wall || !floorOpeningKind || wall[`${floorOpeningKind}U`] == null) floorOpeningKind = null;
  $("#floorGeometrySelection").textContent = room ? `${room.name}${wall ? ` · стіна ${floorWallIndex + 1} · ${floorNumber(Math.hypot(edge.b.x - edge.a.x, edge.b.y - edge.a.y))} м` : vertex ? ` · кут ${floorVertexIndex + 1}` : " · кімната"}` : "Оберіть кімнату або додайте нову";
  if (wall) {
    const names = FG.sharedWalls(plan).filter((s) => s.roomId === room.id && s.index === floorWallIndex || s.otherId === room.id && s.otherIndex === floorWallIndex).map((s) => plan.rooms.find((r) => r.id === (s.roomId === room.id ? s.otherId : s.roomId)).name);
    if (names.length) $("#floorGeometrySelection").textContent += ` · спільна з ${[...new Set(names)].join(", ")}`;
  }
  $("#floorRestoreWall").disabled = !wall || !wall.removed;
  $("#floorSplitWall").disabled = !wall || edge.ring.vertices.length >= 48;
  $("#floorVertexProperties").classList.toggle("hidden", !vertex);
  if (vertex) { $("#floorVertexX").value = floorPrecise(vertex.x); $("#floorVertexY").value = floorPrecise(vertex.y); }
}
function setFloorGeometryMode(enabled) {
  stopFloorConnections();
  floorRouteSelection = null;
  stopFloorPencil();
  cancelFloorGeometryDrag();
  floorPanMode = false;
  if (enabled && project.floorPlan.geometryMode !== "free") {
    if (!commitFloorPlan(F.editGeometry(project.floorPlan))) return;
    toast("Стіни тепер редагуються окремо. Траси перебудовані через фактичні проходи.");
  }
  floorGeometryEditing = enabled; floorWallIndex = null; floorVertexIndex = null; floorOpeningKind = null;
  requestFloorSidebar(enabled ? "walls" : "points");
  floorGeometryHit = null; floorPreviousGeometryHit = null;
  if (!enabled && project.floorPlan.points.find((p) => p.id === floorSelectedId)?.roomId !== floorRoomId) floorSelectedId = null;
  renderFloorPlan();
}
function selectFloorGeometry(roomId, wall = null, vertex = null, opening = null) {
  floorRoomId = roomId; floorWallIndex = wall; floorVertexIndex = vertex; floorOpeningKind = opening;
  requestFloorSidebar("walls");
  $("#floorRoomSelect").value = roomId;
  renderFloorRoom(); renderFloorGeometry(); renderFloorUX(); renderFloorCanvas();
}
function applyFloorGeometry(action, message) {
  try {
    const next = action(F.editGeometry(project.floorPlan));
    if (JSON.stringify(next) === JSON.stringify(project.floorPlan)) { renderFloorPlan(); return next; }
    if (commitFloorPlan(next)) { if (!next.rooms.some((r) => r.id === floorRoomId)) floorRoomId = next.rooms[0]?.id || ""; renderFloorPlan(); if (message) toast(message); return next; }
  } catch (error) { toast(error.message, "error"); }
}
function deleteFloorGeometrySelection() {
  if (floorOpeningKind && floorWallIndex !== null) { const kind = floorOpeningKind; if (applyFloorGeometry((p) => FG.setWall(p, floorRoomId, floorWallIndex, { [`${kind}U`]: null }))) { floorOpeningKind = null; renderFloorPlan(); } }
  else if (floorVertexIndex !== null) deleteFloorVertex();
  else if (floorWallIndex !== null) applyFloorGeometry((p) => FG.setWall(p, floorRoomId, floorWallIndex, { removed: true }), "Стіну відкрито. Точки на ній потребують перевірки. «Скасувати» повертає стіну.");
  else if (project.floorPlan.rooms.some((r) => r.id === floorRoomId)) applyFloorGeometry((p) => FG.removeRoom(p, floorRoomId), "Кімнату та її точки видалено. Щиток за потреби перенесено; «Скасувати» повертає зміни.");
}
const floorOpeningCount = (plan) => plan.rooms.flatMap((r) => FG.edgesOf(r)).reduce((sum, e) => sum + (e.wall.doorU != null) + (e.wall.windowU != null), 0);
function deleteFloorVertex() {
  const before = floorOpeningCount(project.floorPlan), next = applyFloorGeometry((p) => FG.removeVertex(p, floorRoomId, floorVertexIndex));
  if (!next) return;
  floorVertexIndex = floorWallIndex = null; floorPreviousGeometryHit = null; renderFloorPlan();
  if (floorOpeningCount(next) < before) toast("Кут і прилеглі ділянки змінено; отвори на прибраних стінах видалено. Перевірте розміщення й кабельні проходи.");
}
function cancelFloorGeometryDrag() {
  floorGeometryDrag = null; floorGeometryPreview = null; floorDockingInfo = null; floorWallAlignment = null;
  floorGeometryHit = floorPreviousGeometryHit = null;
  if (floorGeometryFrame) { cancelAnimationFrame(floorGeometryFrame); floorGeometryFrame = null; }
  if (project.floorPlan) renderFloorCanvas();
}
function initFloorGeometry() {
  $("#floorGeometryMode").addEventListener("click", () => setFloorGeometryMode(true));
  $("#floorPointsMode").addEventListener("click", () => setFloorGeometryMode(false));
  $("#floorRedoButton").addEventListener("click", redoFloorChange);
  $("#floorSplitWall").addEventListener("click", () => {
    const openings = (plan) => plan.rooms.flatMap((r) => FG.edgesOf(r).map((e) => e.wall)).reduce((sum, w) => sum + (w.doorU != null) + (w.windowU != null), 0), before = openings(project.floorPlan);
    applyFloorGeometry((p) => FG.splitWall(p, floorRoomId, floorWallIndex));
    if (openings(project.floorPlan) < before) toast("Отвір на місці нового кута прибрано. Його можна додати на вибраній новій ділянці стіни.");
    floorWallIndex = null; renderFloorPlan();
  });
  $("#floorRestoreWall").addEventListener("click", () => applyFloorGeometry((p) => FG.setWall(p, floorRoomId, floorWallIndex, { removed: false })));
  $("#floorAddRoom").addEventListener("click", () => { if (!floorGeometryEditing) { stopFloorPencil(); cancelFloorGeometryDrag(); floorGeometryEditing = true; floorPanMode = false; } const next = applyFloorGeometry((p) => { const added = FG.addRoom(p); return FG.placeBeside(added, added.rooms.at(-1).id, floorRoomId).plan; }); if (!next) return; floorRoomId = next.rooms.at(-1)?.id || ""; floorWallIndex = null; floorVertexIndex = null; floorOpeningKind = null; floorScale = null; renderFloorPlan(); });
  $("#floorApplyVertex").addEventListener("click", () => applyFloorGeometry((p) => { const vertex = FG.vertexAt(p.rooms.find((r) => r.id === floorRoomId), floorVertexIndex); return FG.moveVertex(p, floorRoomId, floorVertexIndex, readFloorNumber("#floorVertexX", "координату X кута") - vertex.x, readFloorNumber("#floorVertexY", "координату Y кута") - vertex.y); }));
  const canvas = $("#floorCanvas");
  canvas.addEventListener("keydown", (event) => {
    if (!floorGeometryEditing) return;
    const target = event.target.closest("[data-floor-geometry-room], [data-floor-room]");
    if (target && ["Enter", " "].includes(event.key)) { event.preventDefault(); selectFloorGeometry(target.dataset.floorGeometryRoom || target.dataset.floorRoom, target.hasAttribute("data-floor-wall") ? Number(target.dataset.floorWall) : null, target.hasAttribute("data-floor-vertex") ? Number(target.dataset.floorVertex) : null, target.dataset.floorOpening || null); }
    if (event.key === "Escape") { event.preventDefault(); cancelFloorGeometryDrag(); renderFloorPlan(); }
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (!floorGeometryEditing || event.button !== 0 || event.isPrimary === false) return;
    const target = event.target.closest("[data-floor-geometry-room], [data-floor-room]"); if (!target) return;
    const svg = $(".floor-svg", canvas), matrix = svg.getScreenCTM(), roomId = target.dataset.floorGeometryRoom || target.dataset.floorRoom, kind = target.hasAttribute("data-floor-opening") ? "opening" : target.hasAttribute("data-floor-vertex") ? "vertex" : target.hasAttribute("data-floor-wall") ? "wall" : "room", index = kind === "vertex" ? Number(target.dataset.floorVertex) : ["wall", "opening"].includes(kind) ? Number(target.dataset.floorWall) : null;
    const arrangement = F.layout(project.floorPlan);
    floorGeometryDrag = { base: clone(project.floorPlan), roomId, kind, index, opening: target.dataset.floorOpening || null, pointerId: event.pointerId, x: event.clientX, y: event.clientY, unit: matrix.a * PanelFloorSvg.SCALE, viewport: { minX: arrangement.minX, minY: arrangement.minY, width: arrangement.width, height: arrangement.height }, changed: false, moved: false, error: null };
    floorGeometryHit = { roomId, kind, index, x: event.clientX, y: event.clientY, at: performance.now() };
    selectFloorGeometry(roomId, ["wall", "opening"].includes(kind) ? index : null, kind === "vertex" ? index : null, target.dataset.floorOpening || null);
    canvas.setPointerCapture(event.pointerId); event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    const drag = floorGeometryDrag; if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 3 && !drag.moved) return;
    drag.moved = true;
    let dx = (event.clientX - drag.x) / drag.unit, dy = (event.clientY - drag.y) / drag.unit;
    if (event.shiftKey) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
    const wallDx = dx, wallDy = dy, step = $("#floorGeometrySnap").checked && !event.altKey ? Number($("#floorGeometryGrid").value) : 0;
    if (step) { dx = Math.round(dx / step) * step; dy = Math.round(dy / step) * step; }
    try {
      drag.error = null;
      floorDockingInfo = null; floorWallAlignment = null;
      if (drag.kind === "opening") {
        floorGeometryPreview = FG.moveOpening(drag.base, drag.roomId, drag.index, drag.opening, wallDx, wallDy, { gridStepM: step });
      } else if (drag.kind === "room") {
        const result = FG.dockRoom(drag.base, drag.roomId, dx, dy, { magnet: $("#floorRoomMagnet").checked && !event.altKey }); floorGeometryPreview = result.plan; floorDockingInfo = result.docking;
      } else if (drag.kind === "wall") {
        const result = FG.dragWall(drag.base, drag.roomId, drag.index, wallDx, wallDy, { magnet: $("#floorRoomMagnet").checked && !event.altKey, gridStepM: step, snapDistanceM: Math.min(.22, 10 / drag.unit) });
        floorGeometryPreview = result.plan; floorWallAlignment = result.alignment; dx = result.dx; dy = result.dy;
      } else floorGeometryPreview = FG.moveVertex(drag.base, drag.roomId, drag.index, dx, dy);
      drag.changed = drag.kind === "opening" ? FG.wallAt(floorGeometryPreview.rooms.find((r) => r.id === drag.roomId), drag.index)[`${drag.opening}U`] !== FG.wallAt(drag.base.rooms.find((r) => r.id === drag.roomId), drag.index)[`${drag.opening}U`] : Boolean(dx || dy);
      $("#floorGeometryLive").textContent = drag.kind === "opening" ? "Переміщення отвору вздовж стіни" : floorWallAlignment ? `Вирівняно зі стіною «${floorGeometryPreview.rooms.find((r) => r.id === floorWallAlignment.targetId).name}»` : floorDockingInfo ? `Спільна стіна з «${floorGeometryPreview.rooms.find((r) => r.id === floorDockingInfo.targetId).name}» · ${floorNumber(floorDockingInfo.lengthM)} м` : `Зміщення ${floorNumber(dx)} / ${floorNumber(dy)} м`;
      if (!floorGeometryFrame) floorGeometryFrame = requestAnimationFrame(() => { floorGeometryFrame = null; renderFloorCanvas(); renderFloorGeometry(); });
    } catch (error) { drag.error = error.message; $("#floorGeometryLive").textContent = `${error.message} Відпустіть для скасування або поверніться до допустимого положення.`; }
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!floorGeometryDrag) return;
    if (event.pointerId !== floorGeometryDrag.pointerId) return;
    const next = floorGeometryPreview, { changed, moved, error } = floorGeometryDrag, docking = floorDockingInfo, alignment = floorWallAlignment;
    if (moved) floorGeometryHit = null;
    floorGeometryDrag = null; floorGeometryPreview = null; floorDockingInfo = null; floorWallAlignment = null;
    if (floorGeometryFrame) { cancelAnimationFrame(floorGeometryFrame); floorGeometryFrame = null; }
    $("#floorGeometryLive").textContent = "";
    if (error) { floorPreviousGeometryHit = null; renderFloorPlan(); toast(`${error} Переміщення скасовано.`, "error"); return; }
    if (changed && next) { floorPreviousGeometryHit = null; if (commitFloorPlan(next)) { if (alignment) toast(`Стіну вирівняно зі стіною «${next.rooms.find((r) => r.id === alignment.targetId).name}».`); else if (docking) toast(`Спільна стіна з «${next.rooms.find((r) => r.id === docking.targetId).name}» · ${floorNumber(docking.lengthM)} м. Кімнати залишилися окремими.`); } }
    else {
      renderFloorPlan(); const hit = floorGeometryHit, previous = floorPreviousGeometryHit;
      if (hit && previous && hit.roomId === previous.roomId && hit.kind === previous.kind && hit.index === previous.index && hit.at - previous.at < 500 && Math.hypot(hit.x - previous.x, hit.y - previous.y) < 12) { floorPreviousGeometryHit = null; handleFloorDoubleClick(hit); }
      else floorPreviousGeometryHit = hit;
    }
  });
  canvas.addEventListener("pointercancel", (event) => { if (floorGeometryDrag && event.pointerId === floorGeometryDrag.pointerId) { cancelFloorGeometryDrag(); renderFloorPlan(); } });
}

;
/* floor-ux-ui.js */
/* Context actions and navigation shared by room and electrical-point editing. */
let floorToolsOpen = false;
let floorPanMode = false;
let floorPanning = null;
let floorSidebarTab = "points";
let floorSidebarPending = false;

function floorSidebarGestureActive() {
  return typeof floorDrag !== "undefined" && floorDrag || typeof floorGeometryDrag !== "undefined" && floorGeometryDrag;
}
function requestFloorSidebar(tab) {
  floorSidebarTab = tab; floorSidebarPending = true;
  $("#floorToolsPanel").scrollTop = 0;
  // Opening the sidebar changes the canvas width. Wait until the pointer
  // gesture ends so the wall/point cannot jump underneath the cursor.
  if (!floorSidebarGestureActive()) { floorToolsOpen = true; floorSidebarPending = false; }
  $("#floorTemplateEditor").open = tab === "settings";
  if (tab === "settings") { $("#floorPointEditor").open = false; $("#floorRoomEditor").open = false; }
  if (tab === "points") $("#floorPointEditor").open = true;
  if (tab === "walls") $("#floorRoomEditor").open = floorWallIndex === null && floorVertexIndex === null;
  if (tab === "connections" || tab === "settings") $("#floorViewSettings").open = true;
}

function renderFloorUX() {
  if (floorSidebarPending && !floorSidebarGestureActive()) { floorToolsOpen = true; floorSidebarPending = false; }
  $(".floor-workspace").classList.toggle("tools-collapsed", !floorToolsOpen);
  $("#floorToolsPanel").setAttribute("data-context", floorSidebarTab);
  $("#floorToolsToggle").setAttribute("aria-expanded", String(floorToolsOpen));
  $("#floorPanMode").setAttribute("aria-pressed", String(floorPanMode));
  $("#floorCanvas").classList.toggle("pan-mode", floorPanMode);
  const plan = project.floorPlan, room = plan && F.layout(plan).rooms.find((r) => r.id === floorRoomId), point = plan?.points.find((p) => p.id === floorSelectedId);
  const route = !floorGeometryEditing && !floorPencilActive && floorRouteSelection;
  const connecting = floorConnectMode && !floorGeometryEditing && !floorPencilActive, source = plan?.points.find((p) => p.id === floorConnectSourceId);
  $("#floorView").classList.toggle("connecting-points", connecting);
  $("#floorSidebarTitle").textContent = floorSidebarTab === "circuits" ? "Кола плану" : floorSidebarTab === "settings" ? "Параметри плану" : floorPencilActive ? "Олівець" : connecting ? "З’єднання точок" : floorGeometryEditing ? "Стіни й кімнати" : point ? `${point.type === "junction" ? "Доза" : F.TYPES[point.type]} ${point.label}${point.type === "junction" ? " · підключення" : ""}` : "Електричні точки";
  $("#floorConnectMode").classList.toggle("hidden", floorGeometryEditing || floorPencilActive);
  $("#floorConnectMode").disabled = !plan?.points.some((p) => p.type !== "panel");
  $("#floorConnectMode").setAttribute("aria-pressed", String(connecting));
  $("#floorConnectMode").textContent = connecting ? "Готово" : "З’єднати";
  $("#floorConnectMode").title = connecting ? "Завершити з’єднання точок. Уже створені кабелі залишаться; Ctrl+Z поверне останню зміну." : "З’єднати точки мишкою: шлейфом або окремими лініями від щита.";
  $("#floorConnectionTools").classList.toggle("hidden", !connecting);
  $("#floorConnectionPattern").value = floorConnectPattern;
  $("#floorCanvas").classList.toggle("floor-connecting", connecting);
  $("#floorShowRoutes").disabled = connecting;
  const geometry = floorGeometryEditing && plan?.geometryMode === "free", wall = geometry && room && floorWallIndex !== null ? FG.wallAt(room, floorWallIndex) : null, opening = Boolean(wall && floorOpeningKind), roomSelected = geometry && room && floorWallIndex === null && floorVertexIndex === null;
  let label = geometry ? room?.name || "Додайте або виберіть кімнату" : point ? `${point.label} · ${point.name}` : room?.name || "Виберіть кімнату або електричну точку";
  let detail = geometry ? room ? `${floorNumber(room.areaM2 ?? room.widthM * room.depthM)} м²` : "Кімнати можна стикувати перетягуванням" : room ? `Нова точка додасться до «${room.name}». Коло — з фільтра або властивостей.` : "Натисніть точку для властивостей";
  if (geometry && wall) { label = $("#floorGeometrySelection").textContent; detail = "Довжину можна ввести числом; подвійний клік додає кут"; }
  if (opening) { label = `${floorOpeningKind === "door" ? "Двері" : "Вікно"} · ${room.name}`; detail = "Тягніть маркер уздовж стіни; стрілки — зсув, Delete — прибрати отвір"; }
  else if (geometry && floorVertexIndex !== null) { label += ` · кут ${floorVertexIndex + 1}`; detail = "Тягніть кут або рухайте стрілками"; }
  else if (roomSelected) { const count = FG.sharedWalls(plan).filter((s) => s.roomId === room.id || s.otherId === room.id).length; if (count) detail += ` · спільних ділянок стін: ${count}`; }
  else if (!geometry && point) { const branch = F.branches(project).find((d) => d.id === point.circuitId); detail = `${plan.rooms.find((r) => r.id === point.roomId).name} · ${branch?.label || (point.type === "panel" ? "Ввід" : "Коло не призначено")}`; }
  if (route) { label = `Кабель ${plan.points.find((p) => p.id === route.fromId)?.label} → ${plan.points.find((p) => p.id === route.toId)?.label}`; detail = "Натисніть «Вставити дозу»: кабель поділиться на живлення дози й відгалуження до точки. Esc — скасувати вибір."; }
  if (connecting) {
    label = floorConnectPattern === "radial" ? "Окремі лінії від щита" : source ? `Шлейф від ${source.label}` : "Шлейф: виберіть початок";
    detail = floorConnectPattern === "radial" ? "Клацайте потрібні точки: кожна матиме окремий кабель від щита. Для нових точок виберіть коло у фільтрі." : source ? `Натисніть наступну точку: ${source.label} → точка. Щоб почати іншу гілку, натисніть щит або порожнє місце.` : "Натисніть щит, дозу або першу точку, потім послідовно наступні. Esc або «Готово» завершує з’єднання.";
  }
  $("#floorSelectionLabel").textContent = label; $("#floorSelectionDetail").textContent = detail;
  $("#floorQuickRoomFields").classList.toggle("hidden", !roomSelected);
  $("#floorQuickPointTools").classList.toggle("hidden", geometry || floorPencilActive || connecting);
  $(".floor-context-actions").classList.toggle("hidden", connecting);
  $("#floorWallModeTools").classList.toggle("hidden", !geometry && !floorPencilActive);
  $("#floorQuickAddPoint").disabled = !room;
  $("#floorQuickAddPoint").textContent = route ? "Вставити дозу" : "+ Точка";
  $("#floorQuickWallField").classList.toggle("hidden", !geometry || !wall || opening);
  $("#floorQuickHeightField").classList.toggle("hidden", geometry || !point || connecting);
  $("#floorQuickApply").classList.toggle("hidden", connecting || !roomSelected && !(wall && !opening) && !(point && !geometry));
  if (roomSelected) { $("#floorQuickWidth").value = floorPrecise(room.widthM); $("#floorQuickDepth").value = floorPrecise(room.depthM); }
  if (wall) { const { a, b } = FG.edgeAt(room, floorWallIndex); $("#floorQuickLength").value = floorPrecise(Math.hypot(b.x - a.x, b.y - a.y)); }
  if (point) { $("#floorQuickHeight").value = F.pointHeight(plan, point); $("#floorQuickHeight").disabled = point.heightM === null; }
  $("#floorQuickDuplicate").classList.toggle("hidden", !roomSelected);
  $("#floorSplitWall").classList.toggle("hidden", !geometry || !wall || opening);
  $("#floorRestoreWall").classList.toggle("hidden", !geometry || !wall?.removed);
  $("#floorQuickDoor").disabled = !wall || wall.removed || floorPencilActive;
  $("#floorQuickWindow").disabled = !wall || wall.removed || floorPencilActive;
  $("#floorQuickDoor").textContent = wall?.doorU != null && !wall.removed ? "Двері" : "+ Двері";
  $("#floorQuickWindow").textContent = wall?.windowU != null && !wall.removed ? "Вікно" : "+ Вікно";
  $("#floorQuickDoor").setAttribute("aria-pressed", String(floorOpeningKind === "door"));
  $("#floorQuickWindow").setAttribute("aria-pressed", String(floorOpeningKind === "window"));
  $("#floorQuickProperties").classList.toggle("hidden", Boolean(wall));
  $("#floorQuickProperties").disabled = geometry ? !room : !point;
  $("#floorQuickDelete").disabled = geometry ? !room || !opening && (floorVertexIndex !== null ? FG.edgeAt(room, floorVertexIndex).ring.vertices.length <= 3 : wall?.removed) : !point || point.type === "panel";
  $("#floorQuickDelete").textContent = geometry ? opening ? `Прибрати ${floorOpeningKind === "door" ? "двері" : "вікно"}` : floorVertexIndex !== null ? "Видалити кут" : wall ? "Відкрити стіну" : "Видалити кімнату" : "Видалити точку";
}
function zoomFloorPlan(factor, anchor = null) {
  const canvas = $("#floorCanvas"), svg = $(".floor-svg", canvas); if (!svg || floorGeometryDrag || floorDrag) return;
  const old = svg.getBoundingClientRect(), box = canvas.getBoundingClientRect(), x = anchor?.x ?? box.left + canvas.clientWidth / 2, y = anchor?.y ?? box.top + canvas.clientHeight / 2, u = (x - old.left) / old.width, v = (y - old.top) / old.height;
  floorScale = Math.max(.01, Math.min(3, old.width / svg.viewBox.baseVal.width * factor)); renderFloorCanvas();
  const next = $(".floor-svg", canvas).getBoundingClientRect(); canvas.scrollLeft += next.left + u * next.width - x; canvas.scrollTop += next.top + v * next.height - y;
}
function duplicateFloorRoom() {
  if (!floorGeometryEditing || !project.floorPlan.rooms.some((r) => r.id === floorRoomId)) return;
  let copyId = null;
  const result = applyFloorGeometry((p) => { const copied = FG.duplicateRoom(p, floorRoomId); copyId = copied.roomId; return FG.placeBeside(copied.plan, copyId, floorRoomId).plan; });
  if (result) { floorRoomId = copyId; floorWallIndex = null; floorVertexIndex = null; floorScale = null; renderFloorPlan(); toast("Кімнату й точки скопійовано. Перевірте призначені кола та навантаження."); }
}
function openFloorProperties(rename = false) {
  requestFloorSidebar(floorGeometryEditing ? "walls" : "points"); renderFloorUX();
  if (floorGeometryEditing) { if (floorWallIndex === null && floorVertexIndex === null) $("#floorRoomEditor").open = true; if (rename) { $("#floorRoomName").focus(); $("#floorRoomName").select(); } }
  else $("#floorPointEditor").open = true;
  if (floorScale === null) renderFloorCanvas();
}
function applyFloorQuickFields() {
  try {
  if (floorGeometryEditing) {
    if (floorWallIndex !== null) applyFloorGeometry((p) => FG.resizeWall(p, floorRoomId, floorWallIndex, readFloorNumber("#floorQuickLength", "довжину стіни")));
    else if (floorVertexIndex === null) applyFloorGeometry((p) => FG.resizeRoom(p, floorRoomId, readFloorNumber("#floorQuickWidth", "ширину кімнати"), readFloorNumber("#floorQuickDepth", "глибину кімнати")));
  } else {
    const plan = clone(project.floorPlan), point = plan.points.find((p) => p.id === floorSelectedId);
    if (!point || point.heightM === null) return;
    point.heightM = readFloorNumber("#floorQuickHeight", "висоту точки"); delete point.placementReview; commitFloorPlan(plan);
  }
  } catch (error) { toast(error.message, "error"); }
}
function focusFloorSelection() {
  const selector = floorGeometryEditing ? floorOpeningKind && floorWallIndex !== null ? `[data-floor-geometry-room="${CSS.escape(floorRoomId)}"][data-floor-wall="${floorWallIndex}"][data-floor-opening="${floorOpeningKind}"]` : floorVertexIndex !== null ? `[data-floor-geometry-room="${CSS.escape(floorRoomId)}"][data-floor-vertex="${floorVertexIndex}"]` : floorWallIndex !== null ? `circle[data-floor-geometry-room="${CSS.escape(floorRoomId)}"][data-floor-wall="${floorWallIndex}"]` : `[data-floor-room="${CSS.escape(floorRoomId)}"]` : floorSelectedId ? `[data-floor-point="${CSS.escape(floorSelectedId)}"]` : null;
  (selector && $(selector, $("#floorCanvas")) || $("#floorCanvas")).focus({ preventScroll: true });
}
function handleFloorDoubleClick(hit) {
  if (!floorGeometryEditing || floorPanMode) return;
  if (hit.kind === "room") { selectFloorGeometry(hit.roomId); openFloorProperties(true); return; }
  if (hit.kind !== "wall") return;
  const canvas = $("#floorCanvas"), svg = $(".floor-svg", canvas), p = svg.createSVGPoint(); p.x = hit.x; p.y = hit.y;
  const local = p.matrixTransform(svg.getScreenCTM().inverse()), arrangement = F.layout(project.floorPlan), shape = arrangement.rooms.find((r) => r.id === hit.roomId), { a, b } = FG.edgeAt(shape, hit.index), x = (local.x - PanelFloorSvg.LEFT) / PanelFloorSvg.SCALE + arrangement.minX, y = (local.y - PanelFloorSvg.TOP) / PanelFloorSvg.SCALE + arrangement.minY, u = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  applyFloorGeometry((p) => FG.splitWall(p, hit.roomId, hit.index, u)); floorWallIndex = null; floorVertexIndex = null; renderFloorPlan();
}
function initFloorUX() {
  $("#floorToolsToggle").addEventListener("click", () => { requestFloorSidebar("settings"); renderFloorUX(); if (floorScale === null) renderFloorCanvas(); });
  $("#floorSidebarClose").addEventListener("click", () => { floorToolsOpen = false; floorSidebarPending = false; renderFloorUX(); if (floorScale === null) renderFloorCanvas(); });
  $("#floorPanMode").addEventListener("click", () => { const connected = stopFloorConnections(); floorPanMode = !floorPanMode; renderFloorUX(); if (connected) renderFloorCanvas(); });
  $("#floorQuickAddPoint").addEventListener("click", addFloorPoint);
  $("#floorQuickDuplicate").addEventListener("click", duplicateFloorRoom);
  $("#floorQuickProperties").addEventListener("click", () => openFloorProperties());
  [["#floorQuickDoor", "door"], ["#floorQuickWindow", "window"]].forEach(([id, kind]) => $(id).addEventListener("click", () => {
    const wall = FG.wallAt(project.floorPlan.rooms.find((r) => r.id === floorRoomId), floorWallIndex);
    if (!wall || wall.removed) return;
    if (wall[`${kind}U`] != null) { selectFloorGeometry(floorRoomId, floorWallIndex, null, kind); return; }
    const next = applyFloorGeometry((p) => FG.toggleOpening(p, floorRoomId, floorWallIndex, kind));
    if (next) { floorOpeningKind = kind; renderFloorPlan(); }
  }));
  $("#floorQuickDelete").addEventListener("click", () => { if (floorGeometryEditing) deleteFloorGeometrySelection(); else deleteFloorPoint(); });
  $("#floorQuickApply").addEventListener("click", applyFloorQuickFields);
  ["#floorQuickWidth", "#floorQuickDepth", "#floorQuickLength", "#floorQuickHeight"].forEach((id) => $(id).addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); applyFloorQuickFields(); } }));
  $("#floorRoomName").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); saveFloorRoom(); } });
  const canvas = $("#floorCanvas");
  canvas.addEventListener("pointerdown", (event) => {
    if (floorGeometryEditing || floorPanMode || floorConnectMode || event.button !== 0 || event.target.closest("[data-floor-point], [data-floor-route]")) return;
    const room = event.target.closest("[data-floor-room]"); if (!room) return;
    floorRoomId = room.dataset.floorRoom; floorSelectedId = null; floorRouteSelection = null; requestFloorSidebar("points"); renderFloorPlan();
  });
  canvas.addEventListener("wheel", (event) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); zoomFloorPlan(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .003), { x: event.clientX, y: event.clientY }); }, { passive: false });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 1 && !(floorPanMode && event.button === 0)) return;
    event.preventDefault(); event.stopImmediatePropagation(); floorPanning = { x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop }; canvas.setPointerCapture(event.pointerId); canvas.classList.add("panning");
  }, true);
  canvas.addEventListener("pointermove", (event) => { if (!floorPanning) return; event.preventDefault(); event.stopImmediatePropagation(); canvas.scrollLeft = floorPanning.left - event.clientX + floorPanning.x; canvas.scrollTop = floorPanning.top - event.clientY + floorPanning.y; }, true);
  const endPan = (event) => { if (!floorPanning) return; event.stopImmediatePropagation(); floorPanning = null; canvas.classList.remove("panning"); };
  canvas.addEventListener("pointerup", endPan, true); canvas.addEventListener("pointercancel", endPan, true);
  canvas.addEventListener("keydown", (event) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (["Enter", " "].includes(event.key) && event.target.closest("[data-floor-room], [data-floor-wall], [data-floor-vertex], [data-floor-point]")) { if (!floorGeometryEditing && event.target.closest("[data-floor-room]")) { event.preventDefault(); floorRoomId = event.target.closest("[data-floor-room]").dataset.floorRoom; floorSelectedId = null; renderFloorPlan(); } focusFloorSelection(); return; }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]; if (!delta || event.ctrlKey || event.metaKey || floorConnectMode) return;
    event.preventDefault(); const step = event.shiftKey ? .5 : .1, [dx, dy] = delta.map((v) => v * step);
    if (floorGeometryEditing && floorOpeningKind && floorWallIndex !== null) { const edge = FG.edgeAt(project.floorPlan.rooms.find((r) => r.id === floorRoomId), floorWallIndex); if (edge && Math.abs(dx * (edge.b.x - edge.a.x) + dy * (edge.b.y - edge.a.y)) < .000001) { focusFloorSelection(); return; } }
    if (floorGeometryEditing) applyFloorGeometry((p) => floorOpeningKind && floorWallIndex !== null ? FG.moveOpening(p, floorRoomId, floorWallIndex, floorOpeningKind, dx, dy) : floorVertexIndex !== null ? FG.moveVertex(p, floorRoomId, floorVertexIndex, dx, dy) : floorWallIndex !== null ? FG.moveWall(p, floorRoomId, floorWallIndex, dx, dy) : FG.dockRoom(p, floorRoomId, dx, dy, { magnet: $("#floorRoomMagnet").checked && !event.altKey, alignEnds: false }).plan);
    else { const plan = clone(project.floorPlan), point = plan.points.find((p) => p.id === floorSelectedId); if (!point) return; const room = F.layout(plan).rooms.find((r) => r.id === point.roomId), position = F.world(plan, point); const before = JSON.stringify(point); try { F.placePoint(plan, point, { x: position.x + dx, y: position.y + dy }); } catch (error) { toast(error.message, "error"); return; } if (JSON.stringify(point) !== before) { delete point.placementReview; commitFloorPlan(plan); } }
    focusFloorSelection();
  });
  document.addEventListener("keydown", (event) => {
    if (!$("#floorView").classList.contains("active") || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || $(".modal-backdrop:not(.hidden)")) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && floorGeometryEditing) { event.preventDefault(); duplicateFloorRoom(); }
    if (event.key === "Escape" && floorPanMode) { floorPanMode = false; renderFloorUX(); }
  });
}

;
/* floor-circuits-ui.js */
/* Plan circuits are independent of the panel until the user rebuilds it. */
let floorCircuitFormTarget = null;
let floorCircuitSuggestedName = "";

function suggestFloorCircuitName() {
  const kind = $("#floorCircuitKind").value, room = project.floorPlan.rooms.find((r) => r.id === $("#floorCircuitRoom").value);
  const name = `${F.CIRCUIT_KINDS[kind]}${room ? ` · ${room.name}` : ""}`, input = $("#floorCircuitName");
  if (!input.value.trim() || input.value === floorCircuitSuggestedName) input.value = name;
  floorCircuitSuggestedName = name;
}
function openFloorCircuits(fromPoint = false) {
  if (floorPencilActive && floorPencilVertices.length) { toast("Завершіть або скасуйте контур кімнати перед створенням кола.", "error"); return; }
  stopFloorPencil(); stopFloorConnections(); floorGeometryEditing = false;
  const point = project.floorPlan.points.find((p) => p.id === floorSelectedId && p.type !== "panel");
  floorCircuitFormTarget = fromPoint ? point?.id || null : null;
  requestFloorSidebar("circuits"); renderFloorPlan();
  $("#floorCircuitRoom").value = point?.roomId || floorRoomId || "";
  $("#floorCircuitKind").value = point && ["light", "switch"].includes(point.type) ? "lighting" : point?.type === "equipment" ? "equipment" : "sockets";
  $("#floorCircuitSection").value = $("#floorCircuitKind").value === "lighting" ? "1.5" : "2.5";
  $("#floorCircuitPower").value = ""; $("#floorCircuitName").value = "";
  $("#floorCircuitAssignPoint").checked = Boolean(floorCircuitFormTarget);
  $("#floorCircuitAssignRoom").checked = true;
  suggestFloorCircuitName(); renderFloorCircuits();
}
function renderFloorCircuits(report = null) {
  const plan = project.floorPlan; if (!plan) return;
  const select = $("#floorCircuitRoom"), previous = select.value;
  select.innerHTML = '<option value="">Без прив’язки до кімнати</option>' + plan.rooms.map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`).join("");
  select.value = plan.rooms.some((room) => room.id === previous) ? previous : "";
  const point = plan.points.find((p) => p.id === floorCircuitFormTarget && p.type !== "panel");
  $("#floorCircuitPointChoice").classList.toggle("hidden", !point);
  $("#floorCircuitPointLabel").textContent = point ? `Призначити точці ${point.label} · ${point.name}` : "Призначити вибраній точці";
  $("#floorCircuitsList").innerHTML = F.branches(project).map((circuit) => {
    const count = plan.points.filter((p) => p.circuitId === circuit.id).length;
    return `<div class="floor-circuit-row"><button type="button" class="floor-circuit-select" data-floor-use-circuit="${escapeHtml(circuit.id)}"><strong>${escapeHtml(circuit.label)} · ${escapeHtml(circuit.name)}</strong><small>${circuit.planned ? "Лише на плані" : "Із поточного щита"} · точок: ${count}</small></button><button type="button" class="icon-button danger" data-floor-remove-circuit="${escapeHtml(circuit.id)}" aria-label="Видалити коло ${escapeHtml(circuit.label)}" title="Прибрати коло з плану. Точки залишаться без кола; поточний щит зберігається. «Назад» повертає зміну."><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/></svg></button></div>`;
  }).join("") || '<p class="floor-help">Кіл ще немає. Створіть освітлення, розетки або окрему лінію для приладу.</p>';
  $("#floorCircuitsMode").setAttribute("aria-pressed", String(floorSidebarTab === "circuits"));
  renderFloorCircuitStatus(report);
}
function renderFloorCircuitStatus(report = null) {
  const point = project.floorPlan?.points.find((p) => p.id === floorSelectedId), notice = $("#floorPointConnectionStatus");
  $("#floorNewCircuitForPoint").classList.toggle("hidden", !point || point.type === "panel");
  notice.classList.toggle("hidden", !point || point.type === "panel");
  if (!point || point.type === "panel") return;
  const currentId = $("#floorPointCircuit").value, circuit = F.branches(project).find((c) => c.id === currentId);
  let text = "Коло не призначено. Виберіть наявне або створіть нове. Потім натисніть «Застосувати» — без кола траса не будується.", warning = true;
  if (circuit) {
    const changed = currentId !== point.circuitId || $("#floorPointSource").value !== (point.supplyFromId || "");
    if (changed) text = "Підключення ще не застосоване. Натисніть «Застосувати», щоб оновити трасу.";
    else if (report) {
      const route = report.circuits.find((c) => c.deviceId === point.circuitId)?.legs.find((leg) => leg.toId === point.id);
      if (route) { warning = false; text = `Траса побудована: ${F.sourceFor(project.floorPlan, point)?.label} → ${point.label}.${circuit.planned ? " Коло поки лише на плані; щит оновлюється окремо." : ""}`; }
      else text = report.errors.find((message) => message.includes(`${point.label}:`)) || "Траса не побудована. Перевірте джерело живлення та спільні стіни між кімнатами.";
    } else { warning = false; text = "Коло вибране. Зміни підключення збережуться кнопкою «Застосувати»."; }
  }
  notice.textContent = text; notice.classList.toggle("warning", warning);
}
function commitFloorCircuitChange(next) {
  const before = project.floorPlan;
  const drafts = typeof pendingFloorForms === "function" ? pendingFloorForms().filter((d) => d.kind === "point") : [];
  if (!commitFloorPlan(next)) return false;
  for (const saved of drafts) {
    const old = before.points.find((p) => p.id === saved.entityId), point = project.floorPlan.points.find((p) => p.id === saved.entityId);
    if (!old || !point || old.circuitId === point.circuitId && old.supplyFromId === point.supplyFromId) continue;
    const model = floorFormModel("point", point.id);
    const draft = floorFormDrafts.open(saved, model.values, model.revision);
    floorFormDrafts.edit(draft.key, { ...draft.values, floorPointCircuit: point.circuitId, floorPointSource: point.supplyFromId || "" });
    if (!saved.stale) floorFormDrafts.rebase(draft.key);
  }
  if (drafts.length) renderFloorPlan();
  return true;
}
function createFloorCircuit() {
  try {
    const result = F.createCircuit(project, { kind: $("#floorCircuitKind").value, roomId: $("#floorCircuitRoom").value, name: $("#floorCircuitName").value.trim(), sectionMm2: $("#floorCircuitSection").value === "" ? null : Number($("#floorCircuitSection").value), powerKw: $("#floorCircuitPower").value === "" ? null : Number($("#floorCircuitPower").value), assignRoom: $("#floorCircuitAssignRoom").checked, pointIds: floorCircuitFormTarget && $("#floorCircuitAssignPoint").checked ? [floorCircuitFormTarget] : [] });
    const previous = floorCircuitId; floorCircuitId = result.circuit.id;
    if (!commitFloorCircuitChange(result.plan)) { floorCircuitId = previous; return; }
    const selected = project.floorPlan.points.find((p) => p.id === floorCircuitFormTarget);
    if (selected?.circuitId === result.circuit.id) { floorSelectedId = selected.id; requestFloorSidebar("points"); }
    $("#floorShowRoutes").checked = true; renderFloorPlan();
    toast(`Створено ${result.circuit.label} · ${result.circuit.name}. Щит оновлюється окремою кнопкою.`);
  } catch (error) { toast(error.message, "error"); }
}
function initFloorCircuits() {
  $("#floorCircuitsMode").addEventListener("click", () => openFloorCircuits());
  $("#floorNewCircuitForPoint").addEventListener("click", () => openFloorCircuits(true));
  $("#floorCreateCircuit").addEventListener("click", createFloorCircuit);
  $("#floorCircuitRoom").addEventListener("change", suggestFloorCircuitName);
  $("#floorCircuitKind").addEventListener("change", () => { $("#floorCircuitSection").value = $("#floorCircuitKind").value === "lighting" ? "1.5" : "2.5"; suggestFloorCircuitName(); });
  ["#floorPointCircuit", "#floorPointSource"].forEach((selector) => $(selector).addEventListener("change", () => renderFloorCircuitStatus()));
  $("#floorCircuitsList").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-floor-remove-circuit]"), use = event.target.closest("[data-floor-use-circuit]");
    if (remove) {
      try { const id = remove.dataset.floorRemoveCircuit, next = F.removeCircuit(project, id); if (floorCircuitId === id) floorCircuitId = ""; if (commitFloorCircuitChange(next)) toast("Коло прибрано з плану. Точки збережено без кола. «Назад» повертає зміну."); }
      catch (error) { toast(error.message, "error"); }
    } else if (use) {
      floorCircuitId = use.dataset.floorUseCircuit;
      const point = project.floorPlan.points.find((p) => p.circuitId === floorCircuitId), circuit = F.branches(project).find((c) => c.id === floorCircuitId);
      floorSelectedId = point?.id || null; floorRoomId = point?.roomId || circuit?.roomId || floorRoomId;
      requestFloorSidebar("points"); $("#floorShowRoutes").checked = true; renderFloorPlan();
    }
  });
}

;
/* floor-forms-ui.js */
/* Form drafts never mutate the project until the user applies them. */
let floorDraftStorage = null;
try { floorDraftStorage = sessionStorage; } catch { /* Keep this tab's drafts in memory. */ }
const floorFormDrafts = PanelFormDrafts.create(floorDraftStorage);
const floorFormFields = {
  point: ["floorPointName", "floorPointLabel", "floorPointRoom", "floorPointX", "floorPointY", "floorPointHeight", "floorPointAtCeiling", "floorJunctionMounting", "floorPointCircuit", "floorPointSource", "floorPointControls"],
  room: ["floorRoomName", "floorRoomWidth", "floorRoomDepth", "floorRoomRow", "floorRoomDoor", "floorRoomWindow", "floorOutsideLevel"],
  settings: ["floorCeilingInput", "floorRoutingInput", "floorWallInput", "floorReserveInput", "floorAllowanceInput", "floorConfirmedInput", "floorAutoLengthsInput"]
};
const floorFormChecks = new Set(["floorPointAtCeiling", "floorConfirmedInput", "floorAutoLengthsInput"]);
const floorFormContexts = { point: null, room: null, settings: null };
let floorFormApplyingKey = null;

function floorFormModel(kind, id) {
  const plan = project.floorPlan;
  if (!plan) return null;
  if (kind === "settings") {
    const values = { floorCeilingInput: String(plan.ceilingHeightM), floorRoutingInput: plan.routing, floorWallInput: String(plan.wallThicknessM), floorReserveInput: String(plan.reservePercent), floorAllowanceInput: String(plan.endAllowanceM), floorConfirmedInput: Boolean(plan.geometryConfirmed), floorAutoLengthsInput: Boolean(plan.syncWithCircuits) };
    return { values, label: "Параметри плану", revision: JSON.stringify([values, plan.geometryMode, Boolean(plan.rooms.length)]) };
  }
  const room = F.layout(plan).rooms.find((r) => r.id === (kind === "room" ? id : plan.points.find((p) => p.id === id)?.roomId));
  if (!room) return null;
  if (kind === "room") {
    return { label: room.name, revision: JSON.stringify([plan.rooms, plan.wallThicknessM, plan.geometryMode]), values: { floorRoomName: room.name, floorRoomWidth: String(floorPrecise(room.widthM)), floorRoomDepth: String(floorPrecise(room.depthM)), floorRoomRow: room.row || "", floorRoomDoor: String(Math.round(room.doorU * 100)), floorRoomWindow: room.windowWall || "none", floorOutsideLevel: String(room.routeLevelM ?? 0) } };
  }
  const point = plan.points.find((p) => p.id === id);
  const values = { floorPointName: point.name, floorPointLabel: point.label, floorPointRoom: point.roomId, floorPointX: (point.u * room.widthM).toFixed(2), floorPointY: (point.v * room.depthM).toFixed(2), floorPointHeight: String(F.pointHeight(plan, point)), floorPointAtCeiling: point.heightM === null, floorJunctionMounting: point.type === "junction" ? F.junctionMounting(plan, point) : "wall", floorPointCircuit: point.circuitId || "", floorPointSource: point.supplyFromId || "", floorPointControls: point.controlsId || "" };
  if (point.type === "junction") values.junctionIds = plan.points.filter((p) => p.type !== "switch" && p.supplyFromId === id).map((p) => p.id).sort();
  return { label: `${point.label} · ${point.name}`, values, revision: JSON.stringify(point.type === "junction" ? plan : [point, plan.rooms, plan.ceilingHeightM, plan.points.map((p) => [p.id, p.circuitId, p.supplyFromId, p.controlsId])]) };
}

function restoreFloorForm(kind, entityId = "") {
  const model = floorFormModel(kind, entityId);
  if (!model) { floorFormContexts[kind] = null; renderFloorDraftIndicators(); return; }
  const draft = floorFormDrafts.open({ projectId: project.id, kind, entityId, label: model.label }, model.values, model.revision);
  floorFormContexts[kind] = draft.key;
  // Use the just-rendered values for clean forms; preserve precise model coordinates.
  floorFormFields[kind].forEach((id) => {
    const input = $(`#${id}`), value = draft.values[id];
    if (floorFormChecks.has(id)) input.checked = value;
    else {
      if (input.tagName === "SELECT" && value && ![...input.options].some((option) => option.value === value)) input.add(new Option("Потрібно вибрати знову", value));
      input.value = value;
    }
  });
  if (kind === "point") {
    const point = project.floorPlan.points.find((p) => p.id === entityId);
    if (draft.dirty) {
      const source = draft.values.floorPointSource;
      renderFloorSources(point, draft.values.floorPointCircuit);
      const select = $("#floorPointSource");
      if (select.tagName === "SELECT" && source && ![...select.options].some((o) => o.value === source)) select.add(new Option("Перевірте джерело", source));
      select.value = source;
    }
    $("#floorPointHeight").disabled = point.type === "junction" ? $("#floorJunctionMounting").value === "ceiling" : $("#floorPointAtCeiling").checked;
    if (point.type === "junction" && floorJunctionDraft) {
      floorJunctionDraft.selected = new Set(draft.values.junctionIds);
      floorJunctionDraft.circuitId = draft.values.floorPointCircuit;
      floorJunctionDraft.changed = Boolean(draft.changes.junctionIds || draft.changes.floorPointCircuit);
      floorJunctionDraft.fingerprint = draft.revision;
      renderFloorJunctionConnections();
    }
  }
  renderFloorDraftIndicators();
}

function recordFloorFormEdit(kind) {
  const key = floorFormContexts[kind]; if (!key) return;
  const values = Object.fromEntries(floorFormFields[kind].map((id) => [id, floorFormChecks.has(id) ? $(`#${id}`).checked : String($(`#${id}`).value)]));
  if (kind === "point" && floorJunctionDraft) values.junctionIds = [...floorJunctionDraft.selected].sort();
  floorFormDrafts.edit(key, values); renderFloorDraftIndicators();
}

function renderFloorDraftIndicators() {
  Object.entries(floorFormContexts).forEach(([kind, key]) => {
    const draft = key && floorFormDrafts.get(key), notice = $(`#floor${kind[0].toUpperCase() + kind.slice(1)}Draft`);
    notice.classList.toggle("hidden", !draft?.dirty);
    if (!draft?.dirty) return;
    notice.innerHTML = `<p>${draft.stale ? "Об’єкт змінився. Звірте чернетку з поточним планом перед застосуванням." : "Є незастосовані зміни. План і метраж ще не оновлені."}</p><div>${draft.stale ? `<button type="button" data-floor-draft-action="rebase" data-draft-kind="${kind}">Звірити з планом</button>` : ""}<button type="button" data-floor-draft-action="discard" data-draft-kind="${kind}">Скасувати зміни форми</button></div>`;
    notice.classList.toggle("stale", draft.stale);
  });
  if (typeof renderProjectSaveStatus === "function") renderProjectSaveStatus();
}

function applyFloorForm(kind, apply) {
  const key = floorFormContexts[kind];
  if (!key) return;
  recordFloorFormEdit(kind);
  const draft = floorFormDrafts.get(key), model = floorFormModel(kind, draft.entityId);
  if (!model) { toast("Об’єкт видалено. «Назад» поверне його разом із чернеткою.", "error"); return; }
  floorFormDrafts.open(draft, model.values, model.revision);
  if (floorFormDrafts.get(key).stale) { renderFloorDraftIndicators(); toast("Спочатку звірте чернетку з поточним планом.", "error"); return; }
  try {
    for (const id of floorFormFields[kind]) {
      const input = $(`#${id}`);
      if (input.disabled || input.type !== "number") continue;
      const number = Number(input.value);
      if (!String(input.value).trim() || !Number.isFinite(number) || input.min !== "" && input.min !== undefined && number < Number(input.min) || input.max !== "" && input.max !== undefined && number > Number(input.max)) {
        input.closest("details.floor-advanced")?.setAttribute("open", ""); input.focus(); throw new Error("Заповніть числові поля у вказаних межах.");
      }
    }
    floorFormApplyingKey = key; apply();
  } catch (error) { toast(error.message, "error"); }
  finally { floorFormApplyingKey = null; renderFloorDraftIndicators(); }
}

function completeFloorFormCommit() {
  if (floorFormApplyingKey) floorFormDrafts.remove(floorFormApplyingKey);
}
function pendingFloorForms() { return floorFormDrafts.pending(project.id); }
function revealFloorDraft(key) {
  const draft = floorFormDrafts.get(key); if (!draft || draft.projectId !== project.id) return;
  if (!floorFormModel(draft.kind, draft.entityId)) { toast("Об’єкт видалено. Поверніть його кнопкою «Назад» або скасуйте цю чернетку.", "error"); return; }
  $("#formDraftsModal").classList.add("hidden"); closeDrawers(); switchView("floor");
  if (draft.kind === "point") { setFloorGeometryMode(false); selectFloorPoint(draft.entityId); }
  else { if (draft.kind === "room") { floorRoomId = draft.entityId; floorSelectedId = null; floorGeometryEditing = project.floorPlan.geometryMode === "free"; floorWallIndex = null; floorVertexIndex = null; } requestFloorSidebar(draft.kind === "room" ? "walls" : "settings"); renderFloorPlan(); }
  const section = $(`#floor${draft.kind === "settings" ? "Template" : draft.kind[0].toUpperCase() + draft.kind.slice(1)}Editor`);
  section.open = true; section.scrollIntoView({ block: "nearest" });
}
function reviewFloorDrafts() {
  const pending = pendingFloorForms(); if (!pending.length) return;
  $("#formDraftsList").innerHTML = pending.map((draft, index) => `<li><strong>${escapeHtml(draft.label)}</strong><span>${draft.kind === "point" ? "Точка" : draft.kind === "room" ? "Кімната" : "Налаштування"}${floorFormModel(draft.kind, draft.entityId) ? "" : " · об’єкт видалено"}</span><div><button type="button" data-draft-review="${index}">Перейти</button><button type="button" data-draft-discard="${index}">Скасувати чернетку</button></div></li>`).join("");
  $("#formDraftsStorage").textContent = floorFormDrafts.storageAvailable ? "Чернетки зберігаються в цій вкладці, зокрема після її перезавантаження. До JSON входять лише застосовані зміни." : "Чернетки доступні в пам’яті цієї вкладки. Застосуйте їх перед перезавантаженням. До JSON входять лише застосовані зміни.";
  openModal("#formDraftsModal");
}
function initFloorForms() {
  Object.entries(floorFormFields).forEach(([kind, ids]) => ids.forEach((id) => ["input", "change"].forEach((event) => $(`#${id}`).addEventListener(event, () => recordFloorFormEdit(kind)))));
  $("#reviewFormDraftsButton").addEventListener("click", reviewFloorDrafts);
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-floor-draft-action]");
    if (action) {
      const kind = action.dataset.draftKind, key = floorFormContexts[kind], draft = floorFormDrafts.get(key); if (!draft) return;
      if (action.dataset.floorDraftAction === "discard") floorFormDrafts.remove(key);
      else {
        const model = floorFormModel(kind, draft.entityId); if (!model) return;
        floorFormDrafts.open(draft, model.values, model.revision);
        let rebased = floorFormDrafts.rebase(key);
        if (rebased.values.junctionIds) {
          const live = rebased.values.junctionIds.filter((id) => project.floorPlan.points.some((p) => p.id === id && p.type !== "switch"));
          if (live.length !== rebased.values.junctionIds.length) { floorFormDrafts.edit(key, { ...rebased.values, junctionIds: live }); toast("Видалені точки прибрано з чернетки підключень. Решту вибору збережено."); }
        }
        toast("Чернетку звірено: ваші змінені поля збережено, решта взяті з плану. Перевірте їх і натисніть «Застосувати».");
      }
      renderFloorPlan();
    }
    const review = event.target.closest("[data-draft-review]"), discard = event.target.closest("[data-draft-discard]");
    if (review) { const draft = pendingFloorForms()[Number(review.dataset.draftReview)]; if (draft) revealFloorDraft(draft.key); }
    if (discard) { const draft = pendingFloorForms()[Number(discard.dataset.draftDiscard)]; if (draft) floorFormDrafts.remove(draft.key); renderFloorPlan(); if (pendingFloorForms().length) reviewFloorDrafts(); else $("#formDraftsModal").classList.add("hidden"); }
  });
}

;
/* floor-pencil-ui.js */
/* Click or drag wall segments; commit only a valid closed room. */
const FPencil = PanelFloorPencil;
let floorPencilActive = false;
let floorPencilVertices = [], floorPencilRedo = [], floorPencilPointer = null;
let floorPencilGesture = null, floorPencilFrame = null, floorPencilBase = null, floorPencilSource = null, floorPencilAnimation = null;

function prepareFloorPencil() {
  if (floorPencilSource === project.floorPlan) return;
  if (floorPencilSource) clearFloorPencilDraft();
  floorPencilSource = project.floorPlan;
  floorPencilBase = F.editGeometry(project.floorPlan);
  const box = F.layout(floorPencilBase);
  floorPencilFrame = { minX: box.minX - 2.5, minY: box.minY - 2.5, width: Math.max(12, box.width + 5), height: Math.max(10, box.height + 5) };
}
function floorPencilOptions() { return floorPencilActive ? { viewport: floorPencilFrame, geometryOnly: true } : {}; }
function clearFloorPencilDraft() {
  floorPencilVertices = []; floorPencilRedo = []; floorPencilPointer = null; floorPencilGesture = null;
  if (floorPencilAnimation) { cancelAnimationFrame(floorPencilAnimation); floorPencilAnimation = null; }
}
function stopFloorPencil() {
  const wasActive = floorPencilActive;
  floorPencilActive = false; clearFloorPencilDraft(); floorPencilSource = null;
  if (wasActive && project.floorPlan?.geometryMode === "free") floorGeometryEditing = true;
  if (wasActive && project.floorPlan) renderFloorPlan();
}
function setFloorPencilMode(enabled) {
  cancelFloorInteractions();
  floorPencilActive = enabled; floorPanMode = false; floorGeometryEditing = !enabled && project.floorPlan?.geometryMode === "free";
  floorWallIndex = floorVertexIndex = null; floorScale = null;
  if (enabled) { requestFloorSidebar("pencil"); $("#floorPencilStep").value = $("#floorGeometryGrid").value; prepareFloorPencil(); }
  renderFloorPlan();
  if (enabled) $("#floorCanvas").focus({ preventScroll: true });
}
function renderFloorPencil() {
  $("#floorPencilMode").setAttribute("aria-pressed", String(floorPencilActive));
  $("#floorPencilToolbar").classList.toggle("hidden", !floorPencilActive);
  $("#floorView").classList.toggle("drawing-walls", floorPencilActive);
  $("#floorCanvas").classList.toggle("pencil-mode", floorPencilActive);
  if (floorPencilActive) $("#floorPointsMode").setAttribute("aria-pressed", "false");
  ["#floorCsvButton", "#floorSvgButton", "#floorPrintButton"].forEach((id) => { $(id).disabled = floorPencilActive && floorPencilVertices.length > 0; });
  if (floorPencilActive) { prepareFloorPencil(); updateFloorPencilControls(); }
}
function updateFloorPencilControls(message = "") {
  ["#floorCsvButton", "#floorSvgButton", "#floorPrintButton"].forEach((id) => { $(id).disabled = floorPencilActive && floorPencilVertices.length > 0; });
  $("#floorPencilFinish").disabled = floorPencilVertices.length < 3;
  const drafting = floorPencilVertices.length > 0 || floorPencilRedo.length > 0;
  $("#floorUndoButton").disabled = drafting ? !floorPencilVertices.length : !undoStack.length;
  $("#floorRedoButton").disabled = drafting ? !floorPencilRedo.length : !redoStack.length;
  $("#floorPencilCancel").disabled = !floorPencilVertices.length;
  const last = floorPencilVertices.at(-1), pointer = floorPencilPointer;
  $("#floorPencilStatus").textContent = message || (last && pointer ? `${floorNumber(Math.hypot(pointer.point.x - last.x, pointer.point.y - last.y))} м · ${pointer.hint || "Довільний кут"}` : floorPencilVertices.length ? `Кутів: ${floorPencilVertices.length} · наступний кут або Enter для замикання` : "Почніть на вільному місці або всередині кімнати, щоб виділити нову кімнату.");
}
function paintFloorPencil() {
  const svg = $("#floorCanvas .floor-svg");
  svg?.querySelector(".pencil-draft")?.remove();
  if (!floorPencilActive || !svg || !floorPencilFrame) return;
  const X = (x) => PanelFloorSvg.LEFT + (x - floorPencilFrame.minX) * PanelFloorSvg.SCALE;
  const Y = (y) => PanelFloorSvg.TOP + (y - floorPencilFrame.minY) * PanelFloorSvg.SCALE;
  const unit = 1 / svg.getScreenCTM().a;
  const path = (points) => points.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(" ");
  const pointer = floorPencilPointer, last = floorPencilVertices.at(-1);
  let preview = last && pointer ? [last, pointer.point] : [];
  if (pointer?.close) { const closed = FPencil.closures(floorPencilVertices, pointer.orthogonal)[0]; preview = [...closed.slice(floorPencilVertices.length - 1), closed[0]]; }
  const marks = floorPencilVertices.map((p, i) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${(i ? 4 : 7) * unit}" class="${i ? "pencil-corner" : "pencil-start"}"/>`).join("");
  const label = preview.length > 1 ? `<text x="${X((preview[0].x + preview[1].x) / 2) + 7 * unit}" y="${Y((preview[0].y + preview[1].y) / 2) - 9 * unit}" style="font-size:${11 * unit}px" class="pencil-length">${floorNumber(Math.hypot(preview[1].x - preview[0].x, preview[1].y - preview[0].y))} м</text>` : "";
  svg.insertAdjacentHTML("beforeend", `<g class="pencil-draft" pointer-events="none" aria-hidden="true"><path class="pencil-drawn" d="${path(floorPencilVertices)}"/><path class="pencil-preview ${pointer?.close ? "closing" : ""}" d="${path(preview)}"/>${marks}${pointer ? `<circle class="pencil-cursor" cx="${X(pointer.point.x)}" cy="${Y(pointer.point.y)}" r="${5 * unit}"/>` : ""}${label}</g>`);
  updateFloorPencilControls();
}
function scheduleFloorPencil() {
  if (!floorPencilAnimation) floorPencilAnimation = requestAnimationFrame(() => { floorPencilAnimation = null; paintFloorPencil(); });
}
function floorPencilPoint(event) {
  const svg = $("#floorCanvas .floor-svg"), screen = svg.createSVGPoint();
  screen.x = event.clientX; screen.y = event.clientY;
  const local = screen.matrixTransform(svg.getScreenCTM().inverse()), frame = floorPencilFrame;
  const raw = { x: Math.max(frame.minX, Math.min(frame.minX + frame.width, (local.x - PanelFloorSvg.LEFT) / PanelFloorSvg.SCALE + frame.minX)), y: Math.max(frame.minY, Math.min(frame.minY + frame.height, (local.y - PanelFloorSvg.TOP) / PanelFloorSvg.SCALE + frame.minY)) };
  return FPencil.resolve(floorPencilBase, floorPencilVertices, raw, { orthogonal: !event.altKey && ($("#floorPencilOrthogonal").checked || event.shiftKey), snap: !event.altKey && $("#floorPencilSnap").checked, gridM: Number($("#floorPencilStep").value), toleranceM: 10 / (svg.getScreenCTM().a * PanelFloorSvg.SCALE) });
}
function finishFloorPencil(options = {}) {
  try {
    const orthogonal = typeof options.orthogonal === "boolean" ? options.orthogonal : $("#floorPencilOrthogonal").checked && !options.altKey;
    const result = FPencil.complete(floorPencilBase, floorPencilVertices, { orthogonal });
    if (!commitFloorPlan(result.plan)) return;
    clearFloorPencilDraft(); floorRoomId = result.roomId; floorSelectedId = null; floorScale = null;
    renderFloorPlan();
    toast(result.partitioned ? `Створено «${result.plan.rooms.find((r) => r.id === result.roomId).name}» усередині кімнати. Площі й точки оновлено. Для проходу виберіть перегородку та додайте двері.` : "Кімнату намальовано. Можна малювати наступну або перейти до стін і точок.");
  } catch (error) { updateFloorPencilControls(error.message); toast(error.message, "error"); }
}
function backFloorPencil() {
  if (floorPencilVertices.length) floorPencilRedo.push(floorPencilVertices.pop());
  floorPencilPointer = null; floorPencilGesture = null; paintFloorPencil();
}
function undoFloorChange() {
  if (floorPencilActive && (floorPencilVertices.length || floorPencilRedo.length)) { if (floorPencilVertices.length) backFloorPencil(); return; }
  cancelFloorInteractions(); undo();
}
function redoFloorChange() {
  if (floorPencilActive && (floorPencilVertices.length || floorPencilRedo.length)) {
    if (floorPencilRedo.length) { floorPencilVertices.push(floorPencilRedo.pop()); floorPencilPointer = null; paintFloorPencil(); }
    return;
  }
  cancelFloorInteractions(); redo();
}
function initFloorPencil() {
  $("#floorPencilMode").addEventListener("click", () => setFloorPencilMode(!floorPencilActive));
  $("#floorPencilFinish").addEventListener("click", finishFloorPencil);
  $("#floorPencilCancel").addEventListener("click", () => { clearFloorPencilDraft(); paintFloorPencil(); });
  $("#floorPencilBlank").addEventListener("click", () => {
    const plan = { ...clone(project.floorPlan), geometryMode: "free", name: "Власний план", rooms: [], points: [] };
    if (commitFloorPlan(plan)) { clearFloorPencilDraft(); floorSelectedId = null; floorRoomId = ""; floorScale = null; renderFloorPlan(); toast("Чисте полотно для вашого плану. Ctrl+Z повертає попередні кімнати й точки."); }
  });
  $("#floorPencilExpand").addEventListener("click", () => {
    const f = floorPencilFrame, minX = Math.max(-99, f.minX - 3), minY = Math.max(-99, f.minY - 3);
    floorPencilFrame = { minX, minY, width: Math.min(99, f.minX + f.width + 3) - minX, height: Math.min(99, f.minY + f.height + 3) - minY };
    floorScale = null; renderFloorCanvas();
  });
  $("#floorPencilStep").addEventListener("change", () => { $("#floorGeometryGrid").value = $("#floorPencilStep").value; renderFloorCanvas(); });
  ["#floorPencilOrthogonal", "#floorPencilSnap"].forEach((id) => $(id).addEventListener("change", () => { floorPencilPointer = null; paintFloorPencil(); }));
  const canvas = $("#floorCanvas");
  canvas.addEventListener("pointerdown", (event) => {
    if (!floorPencilActive || floorPanMode || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); event.stopImmediatePropagation(); canvas.focus({ preventScroll: true });
    try {
      const before = clone(floorPencilVertices), first = !before.length;
      floorPencilPointer = floorPencilPoint(event);
      if (first) { floorPencilVertices = FPencil.append([], floorPencilPointer.point); floorPencilRedo = []; }
      floorPencilGesture = { pointerId: event.pointerId, before, first, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); paintFloorPencil();
    } catch (error) { updateFloorPencilControls(error.message); }
  }, true);
  canvas.addEventListener("pointermove", (event) => {
    if (!floorPencilActive || floorPanning || floorPanMode) return;
    event.stopImmediatePropagation();
    try { floorPencilPointer = floorPencilPoint(event); scheduleFloorPencil(); } catch (error) { updateFloorPencilControls(error.message); }
  }, true);
  canvas.addEventListener("pointerup", (event) => {
    const gesture = floorPencilGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation(); floorPencilGesture = null;
    try {
      floorPencilPointer = floorPencilPoint(event);
      if (!gesture.first || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 6) {
        if (floorPencilPointer.close) return finishFloorPencil({ orthogonal: floorPencilPointer.orthogonal });
        floorPencilVertices = FPencil.append(floorPencilVertices, floorPencilPointer.point); floorPencilRedo = [];
      }
      floorPencilPointer = null; paintFloorPencil();
    } catch (error) { floorPencilPointer = null; paintFloorPencil(); updateFloorPencilControls(error.message); }
  }, true);
  canvas.addEventListener("pointercancel", (event) => {
    if (!floorPencilGesture || floorPencilGesture.pointerId !== event.pointerId) return;
    event.stopImmediatePropagation(); floorPencilVertices = floorPencilGesture.before; floorPencilGesture = null; floorPencilPointer = null; paintFloorPencil();
  }, true);
  canvas.addEventListener("contextmenu", (event) => { if (floorPencilActive) { event.preventDefault(); backFloorPencil(); } });
  document.addEventListener("keydown", (event) => {
    if (!$("#floorView").classList.contains("active") || ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName) || event.target.isContentEditable || $(".modal-backdrop:not(.hidden)")) return;
    const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
    if (key === "p" && !modifier && !event.altKey) { event.preventDefault(); event.stopImmediatePropagation(); return setFloorPencilMode(!floorPencilActive); }
    if (!floorPencilActive) return;
    const redo = modifier && (key === "y" || key === "z" && event.shiftKey);
    if (redo && floorPencilRedo.length) { event.preventDefault(); event.stopImmediatePropagation(); floorPencilVertices.push(floorPencilRedo.pop()); floorPencilPointer = null; return paintFloorPencil(); }
    if (redo && floorPencilVertices.length) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (["backspace", "delete"].includes(key) || modifier && key === "z" && !event.shiftKey && (floorPencilVertices.length || floorPencilRedo.length)) { event.preventDefault(); event.stopImmediatePropagation(); return backFloorPencil(); }
    if (key === "escape") { event.preventDefault(); event.stopImmediatePropagation(); if (floorPencilVertices.length) { clearFloorPencilDraft(); paintFloorPencil(); } else setFloorPencilMode(false); }
    else if (key === "enter" && event.target.closest("#floorCanvas")) { event.preventDefault(); event.stopImmediatePropagation(); finishFloorPencil({ orthogonal: !event.altKey && ($("#floorPencilOrthogonal").checked || event.shiftKey) }); }
    else if (key.startsWith("arrow") && event.target.closest("#floorCanvas")) event.stopImmediatePropagation();
  }, true);
}

;
/* project-store.js */
/* Recoverable browser persistence; loading never discards unreadable records. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelProjectStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "electropanel.v3.projects.v1", ACTIVE_KEY = "electropanel.v3.active-project.v1", RECOVERY_KEY = "electropanel.v3.recovery-last-key.v1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function readString(storage, key, fallback = null) { try { return storage?.getItem(key) ?? fallback; } catch { return fallback; } }
  function writeString(storage, key, value) { try { if (!storage) return false; storage.setItem(key, String(value)); return true; } catch { return false; } }
  function load(storage, normalize) {
    const state = { projects: [], trash: [], rejected: [], malformedRaw: null, sourceRaw: null, recoveryKey: `${KEY}.recovery.${Date.now()}`, error: null };
    let raw;
    try { if (!storage) throw new Error("Локальне сховище недоступне"); raw = storage.getItem(KEY); }
    catch (error) { state.error = error.message; return state; }
    state.sourceRaw = raw;
    if (!raw) return state;
    let records;
    try { records = JSON.parse(raw); if (!Array.isArray(records)) throw new Error("Очікувався список проєктів"); }
    catch (error) { state.malformedRaw = raw; state.error = error.message; return state; }
    const ids = new Set();
    records.forEach((record, index) => {
      try {
        const item = normalize(record);
        if (ids.has(item.id)) throw new Error("Повторений ідентифікатор проєкту");
        ids.add(item.id); (item.deletedAt ? state.trash : state.projects).push(item);
      } catch (error) { state.rejected.push({ index, value: record, error: error.message }); }
    });
    return state;
  }
  function save(storage, state, projects, activeId) {
    try {
      if (!storage) throw new Error("Локальне сховище недоступне");
      if (storage.getItem(KEY) !== state.sourceRaw) {
        state.error = "Сховище змінено в іншій вкладці. Експортуйте поточний проєкт у JSON і оновіть сторінку, щоб не перезаписати чужі зміни.";
        return { ok: false, conflict: true, error: state.error };
      }
      const payload = JSON.stringify([...projects, ...state.trash, ...state.rejected.map((record) => record.value)]);
      // Keep the original bytes before replacing malformed JSON. A failed backup
      // aborts the write so quota failures cannot destroy the recovery source.
      if (state.malformedRaw !== null) { storage.setItem(state.recoveryKey, state.malformedRaw); storage.setItem(RECOVERY_KEY, state.recoveryKey); }
      storage.setItem(KEY, payload);
      state.sourceRaw = payload;
      state.malformedRaw = null; state.error = null;
      writeString(storage, ACTIVE_KEY, activeId);
      return { ok: true };
    } catch (error) { state.error = error.message; return { ok: false, error: error.message }; }
  }
  function archive(projects, trash, id, at = new Date().toISOString()) {
    const selected = projects.find((project) => project.id === id);
    if (!selected || projects.length < 2) throw new Error("Залиште хоча б один відкритий проєкт");
    return { projects: projects.filter((project) => project.id !== id).map(clone), trash: [{ ...clone(selected), deletedAt: at }, ...trash.filter((project) => project.id !== id).map(clone)] };
  }
  function restore(projects, trash, id) {
    const selected = trash.find((project) => project.id === id);
    if (!selected) throw new Error("Проєкт відсутній у кошику");
    if (projects.some((project) => project.id === id)) throw new Error("Проєкт із цим ідентифікатором уже відкритий");
    const restored = clone(selected); delete restored.deletedAt;
    return { projects: [restored, ...projects.map(clone)], trash: trash.filter((project) => project.id !== id).map(clone) };
  }
  return { KEY, ACTIVE_KEY, RECOVERY_KEY, readString, writeString, load, save, archive, restore };
});

;
/* ui-help.js */
/* Native delayed hover hints, resolved on demand without observing every render. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PanelUIHelp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const hints = {
    floorCircuitsMode: "Створити або прибрати кола плану. Щит оновлюється окремою кнопкою перебудови.",
    floorNewCircuitForPoint: "Створити коло для цієї точки та, за бажанням, вільних точок того самого типу в кімнаті.",
    floorCreateCircuit: "Зберегти коло на плані та призначити вибраним точкам. Компоненти щита поки не змінюються.",
    floorCircuitAssignRoom: "Приєднати до нового кола непризначені точки відповідного типу у вибраній кімнаті. Інші кола зберігаються.",
    undoButton: "Повернути останню зміну компоновки або проводки. Ctrl+Z.",
    redoButton: "Повторити зміну, яку повернули кнопкою «Назад». Ctrl+Y або Ctrl+Shift+Z.",
    floorUndoButton: "Повернути останню зміну плану. Під час малювання — прибрати останній кут чернетки. Ctrl+Z.",
    floorRedoButton: "Повернути скасовану зміну плану або останній кут чернетки олівця. Ctrl+Y.",
    projectStatus: "Відкрити перелік помилок, зауважень і неповних вихідних даних цього проєкту.",
    designNoticeText: "Перейти прямо до переліку помилок і зауважень розрахункової моделі.",
    designNoticeButton: "Відкрити вихідні дані об’єкта, розрахунки й перевірки щита.",
    newProjectButton: "Почати новий проєкт: обрати типовий щит або порожню компоновку. Поточний проєкт залишається в «Мої проєкти».",
    projectsButton: "Відкрити, скопіювати чи імпортувати проєкт; переглянути кошик. Проєкти зберігаються в цьому браузері.",
    exportButton: "Завантажити повний проєкт у JSON: компоновку, проводку, план і налаштування. Цей файл можна імпортувати в іншому браузері.",
    projectTitleButton: "Змінити назву проєкту.",
    layoutModeTab: "Обирати й розміщувати апарати, шини та компоненти щита.",
    wiringModeTab: "З’єднувати клеми, обирати проводи та редагувати їхні властивості й маршрути. W перемикає режим.",
    physicalViewButton: "Перемикати рівну висоту зображень і реальні паспортні габарити. Ширина, кількість модулів і розрахункові дані зберігаються.",
    boardSettingsButton: "Задати кількість DIN-рейок, модулів і, за потреби, габаритний профіль щита.",
    fitButton: "Підібрати масштаб, щоб уся компоновка щита помістилася на полотні.",
    zoomInButton: "Збільшити компоновку, не змінюючи фактичні розміри компонентів.",
    zoomOutButton: "Зменшити масштаб компоновки для загального огляду.",
    librarySearch: "Знайти апарат у бібліотеці за назвою або типом. / переводить курсор у пошук.",
    openTemplatesButton: "Обрати готову компоновку для квартири або будинку з початковими колами й проводкою.",
    addCombButton: "Додати фазну або нульову гребінку до вибраних клем у діапазоні модулів.",
    editCombButton: "Змінити клеми, провідник, тип контакту та паспортні дані гребінки.",
    combSelectGroup: "Обрати клеми однієї групи живлення в межах діапазону. Пропущені апарати залишаться поза групою.",
    combReplaceJumpers: "Прибрати дубльовані перемички між вибраними клемами, зберігши спільне живлення.",
    floorPointsMode: "Розміщувати й пересувати розетки, світильники, вимикачі, техніку та щиток; призначати кола й висоти.",
    floorGeometryMode: "Редагувати стіни, кути й кімнати; малювати власний контур, додавати двері та вікна.",
    floorPencilMode: "Намалювати кімнату кутами або відрізками. Enter замикає контур, Alt дозволяє похилу стіну, Esc скасовує чернетку. P перемикає олівець.",
    floorAddRoom: "Додати готову прямокутну кімнату біля вибраної. Її стіни, розміри та форму можна змінити.",
    floorQuickDoor: "Додати двері або вибрати наявні на стіні. Потім тягніть їхній маркер уздовж стіни. Прибрати вибраний отвір можна командою під панеллю або Delete.",
    floorQuickWindow: "Додати вікно або вибрати наявне на стіні. Потім тягніть його маркер уздовж стіни. Прибрати вибраний отвір можна командою під панеллю або Delete.",
    floorToolsToggle: "Відкрити праворуч параметри плану, прокладання кабелів і відображення. Властивості об’єкта з’являються справа після вибору.",
    floorSidebarClose: "Згорнути праву панель і збільшити полотно. Вибір інструмента або об’єкта знову відкриє його властивості.",
    floorQuickPointType: "Оберіть розетку, світильник, вимикач, техніку або дозу для відгалужень одного кола.",
    floorQuickAddPoint: "Додати точку в поточну кімнату. Якщо вибрана кабельна траса — вставити в неї дозу. Дозу також можна перетягнути на кабель; Alt дозволяє пересунути її без нового з’єднання.",
    floorQuickApply: "Застосувати введені розміри кімнати, довжину стіни або висоту точки. «Назад» поверне попереднє значення.",
    floorQuickWidth: "Ширина габаритної межі вибраної кімнати в метрах. Зміна масштабує її контур по горизонталі.",
    floorQuickDepth: "Глибина габаритної межі вибраної кімнати в метрах. Зміна масштабує її контур по вертикалі.",
    floorQuickLength: "Довжина вибраної стіни в метрах. Змінює її кінцевий кут і прилеглі ділянки.",
    floorQuickHeight: "Монтажна висота вибраної точки в метрах від чистої підлоги; впливає на вертикальну ділянку кабелю.",
    floorVertexX: "Горизонтальна координата вибраного кута на плані, у метрах. Явний 0 допустимий.",
    floorVertexY: "Вертикальна координата вибраного кута на плані, у метрах. Це координата плану, не монтажна висота.",
    floorQuickProperties: "Відкрити параметри вибраного об’єкта: назву, координати, висоту чи прив’язки. Кімнату також можна відкрити подвійним кліком.",
    floorQuickDelete: "Прибрати лише вибраний об’єкт: точку, отвір, кут або кімнату; для стіни — відкрити її. «Назад» повертає зміну.",
    floorQuickDuplicate: "Створити поруч копію кімнати з її точками. Призначені кола потрібно перевірити. Ctrl+D.",
    floorSplitWall: "Додати проміжний кут на вибраній стіні для зміни форми або ніші. Також працює подвійний клік на стіні.",
    floorRestoreWall: "Закрити раніше відкриту стіну та перебудувати кабельні проходи.",
    floorShowGrid: "Показати або сховати метричну сітку. Це не змінює окремий перемикач прив’язки до сітки.",
    floorShowRoutes: "Показати або сховати розраховані кабельні маршрути. Метраж від цього не змінюється.",
    floorShowHeights: "Показати або сховати підписи монтажних висот електричних точок.",
    floorCircuitFilter: "Підсвітити траси вибраного електричного кола; «Усі кола» повертає загальний вигляд.",
    floorRoomMagnet: "Притягувати кімнати до спільної перегородки та вирівнювати рухому стіну до сусідніх. Alt тимчасово вимикає магніт.",
    floorGeometrySnap: "Округлювати рух стін і кутів до вибраного кроку. Видимість сітки вмикається окремо.",
    floorGeometryGrid: "Крок прив’язки та метричної сітки: 5, 10, 25 або 50 см.",
    floorPanMode: "Перетягувати полотно без руху об’єктів. Також можна тягнути середньою кнопкою миші; Esc вимикає «Руку».",
    floorFitButton: "Умістити весь план у доступне місце. Враховує панелі й розмір вікна та повертає автоматичний масштаб.",
    floorZoomIn: "Збільшити план. Ctrl+коліщатко змінює масштаб під курсором.",
    floorZoomOut: "Зменшити план для огляду всіх кімнат.",
    floorPencilFinish: "Замкнути поточний контур і зберегти його як кімнату. Enter виконує ту саму дію.",
    floorPencilCancel: "Прибрати всі незбережені кути поточного контуру. Уже збережені кімнати залишаються.",
    floorPencilBlank: "Прибрати кімнати й точки для власного плану з нуля. Щит залишається; «Назад» повертає попередній план.",
    floorPencilExpand: "Додати вільне місце довкола плану для наступних кімнат. Розміри кімнат не змінюються.",
    floorPencilOrthogonal: "Автоматично вести нову стіну по горизонталі або вертикалі. Alt тимчасово дозволяє довільний кут.",
    floorPencilSnap: "Притягувати олівець до сітки й наявних стін з урахуванням товщини перегородки.",
    floorPencilStep: "Крок метричної прив’язки під час малювання.",
    floorGenerateButton: "Замінити поточний план обраним типовим ескізом із точками. «Назад» повертає попередній.",
    floorTemplateInput: "Оберіть початкову геометрію для перегенерування плану.",
    floorWallInput: "Товщина перегородок. Для довільного контуру її задають до малювання; у готовому контурі вона зафіксована.",
    floorCeilingInput: "Висота стелі для кабельних трас і вертикальних спусків, у метрах від чистої підлоги.",
    floorRoutingInput: "Вибрати прокладання по стелі зі спусками або по підлозі з підйомами до точок.",
    floorReserveInput: "Додатковий закупівельний запас кабелю у відсотках поверх траси та припусків.",
    floorAllowanceInput: "Припуск кабелю на кожний кінець відрізка для підключення.",
    floorAutoLengthsInput: "Автоматично оновлювати в розрахунках кіл найдовший шлях за змінами плану.",
    floorConfirmedInput: "Позначити, що розміри, висоти й маршрути звірені на об’єкті. Типовий ескіз сам цього не підтверджує.",
    floorConnectMode: "Увімкнути з’єднання точок клацаннями мишки: шлейфом або окремими кабелями від щита. Esc завершує режим, Ctrl+Z повертає останній зв’язок.",
    floorConnectionPattern: "Шлейф продовжується від останньої точки. Окремі лінії щоразу починаються від щита. Натисніть щит, щоб почати іншу гілку шлейфу.",
    floorJunctionMounting: "На стіні — доза рухається вздовж стін і має задану висоту. На стелі — вільно рухається в межах кімнати, висота дорівнює висоті стелі. Збережіть вибір кнопкою застосування дози.",
    floorJunctionRoomFilter: "Показати точки вибраної кімнати або всієї квартири. Прапорці в інших кімнатах зберігаються.",
    floorJunctionSearch: "Знайти точку за позначенням, назвою, типом або кімнатою. Наприклад: світильник чи розетка.",
    floorPointSource: "Оберіть джерело траси: щит, дозу або попередню точку того самого кола. Для вимикача типовий кабель керування починається від його світильника.",
    floorSnapWall: "Притягувати розетки, вимикачі й техніку до найближчої стіни. Дози на стіні завжди залишаються на стінах, а дози на стелі рухаються вільно.",
    floorApplyVertex: "Застосувати координати вибраного кута. Інші кінці та спільні грані перебудуються за геометрією плану.",
    floorApplyRoom: "Зберегти назву й параметри вибраної кімнати.",
    floorApplyPoint: "Зберегти назву, координати, монтажну висоту та коло точки. Для дози — також застосувати вибрані підключення одним кроком із можливістю скасування.",
    floorApplySettings: "Застосувати параметри трас, припусків, запасу й підтвердження обмірів.",
    floorSyncButton: "Передати найдовші шляхи з плану до електричних розрахунків. Закупівельний метраж залишається в кабельній відомості.",
    floorCsvButton: "Завантажити кабельну відомість, точки й підсумки довжин за однаковими характеристиками у CSV.",
    floorSvgButton: "Завантажити план у векторному SVG без редакторських ручок і чернетки олівця.",
    floorPrintButton: "Відкрити системний друк плану та відомостей; у діалозі можна обрати збереження у PDF.",
    csvButton: "Завантажити специфікацію обладнання та підсумки кабелів і введених довжин проводів у CSV.",
    wireCsvButton: "Завантажити з’єднання клем, характеристики проводів та введені довжини у CSV.",
    wireLengthInput: "Довжина конкретного монтажного проводу у метрах. Порожнє поле означає невідомий метраж; його не підсумовують.",
    wireTypeInput: "Марка монтажного проводу для групування у специфікації разом із кольором, перерізом і матеріалом.",
    wireColorInput: "Колір ізоляції вибраного проводу; для нейтралі й PE діють перевірки призначення.",
    wireSectionInput: "Переріз провідника у мм². Це характеристика проводу, незалежна від товщини лінії на екрані.",
    wireMaterialInput: "Матеріал проводу: Cu або Al. Підсумки для різних матеріалів не об’єднуються.",
    resetWireRouteButton: "Прибрати ручні вигини вибраного проводу й повернути автоматичний маршрут.",
    insertWireComponentButton: "Вставити сумісний апарат у вибраний провід із поділом на два з’єднання та розміщенням на вільному місці.",
    reconnectWireFromButton: "Обрати іншу початкову клему для вибраного проводу.",
    reconnectWireToButton: "Обрати іншу кінцеву клему для вибраного проводу.",
    addConsumerButton: "Створити під апаратом блок споживача з його початковою назвою й клемами. Назву споживача потім можна змінити окремо.",
    documentationButton: "Відкрити розрахункову відомість і документацію проєкту для перегляду та експорту.",
    diagramFitButton: "Умістити поточний аркуш однолінійної схеми повністю.",
    diagramWidthButton: "Масштабувати аркуш схеми за шириною робочого поля.",
    diagramMonoButton: "Перемкнути кольорове або чорно-біле відображення схеми.",
    diagramWideButton: "Розгорнути схему на ширшу область без бічних панелей.",
    diagramSvgButton: "Завантажити поточний аркуш однолінійної схеми у SVG.",
    approveLayoutButton: "Зафіксувати погодження складу й розташування обладнання; подальші зміни роблять його застарілим.",
  };
  function hint({ id = "", label = "", title = "", tag = "BUTTON", type = "", disabled = false } = {}) {
    if (["undoButton", "floorUndoButton"].includes(id) && disabled) return "Немає попередньої зміни для повернення. Після редагування стане доступною кнопка «Назад».";
    if (["redoButton", "floorRedoButton"].includes(id) && disabled) return "Немає скасованої зміни для повторення.";
    if (["floorCsvButton", "floorSvgButton", "floorPrintButton"].includes(id) && disabled) return "Завершіть або скасуйте незбережений контур олівця, щоб експортувати збережений план.";
    if (hints[id]) return hints[id];
    if (title && title.length > label.length + 8) return title;
    label = label.replace(/\s+/g, " ").trim().slice(0, 140);
    if (!label) return title;
    if (tag === "SUMMARY") return label === "Експорт" ? "Завантажити кабельну відомість CSV, план SVG або відкрити друк / PDF." : `Розгорнути або згорнути розділ «${label}».`;
    if (label === "Компоновка") return "Розміщувати обладнання щита на DIN-рейках і переглядати його з’єднання.";
    if (label === "План приміщень") return "Малювати кімнати, розміщувати електричні точки й розраховувати кабельні маршрути та метраж.";
    if (label === "Однолінійна схема") return "Переглянути схему живлення кіл, сформовану з фактичних з’єднань щита.";
    if (/^(?:Специфікація|Спецификация|Bill of materials)/.test(label)) return "Переглянути склад обладнання та згруповані підсумки довжин кабелів і проводів.";
    if (/^(?:З’єднання|Відомість з’єднань|Соединения|Ведомость соединений|Connections|Wiring schedule)/.test(label)) return "Переглянути початкову й кінцеву клему кожного проводу, його характеристики та введену довжину.";
    if (label === "Розрахунки") return "Задати вихідні дані об’єкта й переглянути розрахункові значення та перелік зауважень.";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return type === "checkbox" ? `Увімкнути або вимкнути «${label}».` : `Задати параметр «${label}».`;
    if (/^(?:Кімната|Комната|Room) ·/.test(label)) return "Обрати кімнату. У режимі стін її можна пересувати за фон; подвійний клік відкриває властивості.";
    if (/^(?:Кут|Угол|Corner) \d/.test(label)) return "Перетягнути кут для зміни форми кімнати. Стрілки зсувають вибраний кут, Delete прибирає його, якщо контур залишається допустимим.";
    if (/^(?:Додати|Добавить|Add) /.test(label)) return `${label} до компоновки щита. Після розміщення можна змінити параметри й підключити клеми.`;
    if (/^(?:Відкрити|Открыть|Open)$/.test(label)) return "Відкрити обраний проєкт із локального сховища.";
    if (/^(?:Копія|Копия|Copy)$/.test(label)) return "Створити незалежну копію проєкту з усіма з’єднаннями й планом.";
    if (/^(?:У кошик|В корзину|Move to trash|Trash)$/i.test(label)) return "Перемістити проєкт у кошик; звідти його можна відновити.";
    if (/^(?:Видалити назавжди|Удалить навсегда|Delete permanently)/.test(label)) return "Остаточно видалити цей проєкт із кошика. Цю дію не повертає історія редагування.";
    if (/^[×✕]$|^(?:Закрити|Закрыть|Close)$/.test(label)) return "Закрити відкрите вікно або панель.";
    if (/CSV/.test(label)) return `Завантажити дані розділу «${label}» у табличному файлі CSV.`;
    if (/Друк|Печать|Print|PDF/.test(label)) return "Відкрити системний діалог друку поточного документа або збереження у PDF.";
    return title || `Виконати дію «${label}».`;
  }
  function install(doc) {
    const explain = (event) => {
      const node = event.target.closest?.("button,input,select,textarea,summary,a,[role=button],[role=tab]");
      if (!node) return;
      const parentLabel = node.closest("label"), label = node.getAttribute("aria-label") || parentLabel?.querySelector("span")?.textContent || (parentLabel ? parentLabel.textContent : node.textContent) || "";
      const nativeSvgHint = node.querySelector(":scope > title");
      if (nativeSvgHint && !hints[node.id]) return;
      const text = hint({ id: node.id, label, title: node.getAttribute("title") || "", tag: node.tagName.toUpperCase(), type: node.type, disabled: node.disabled });
      if (text && node.getAttribute("title") !== text) node.setAttribute("title", text);
    };
    doc.addEventListener("pointerover", explain, true); doc.addEventListener("focusin", explain, true);
  }
  return { hint, install };
});

;
/* project-generation-ui.js */
/* Preview first; apply as one undoable transaction with a durable project copy. */
let generationDraft = null;

function renderProjectGeneration() {
  $("#generatePanelFromPlan").title = "Зібрати щит за групами точок цього плану. Спочатку відкриється попередній перегляд; поточний проєкт буде збережено окремою копією.";
  $("#generatePlanFromPanel").title = "Створити точки й кабельні траси за кінцевими автоматами щита. Наявні стіни зберігаються; зміни можна скасувати.";
}

function openProjectGeneration(direction) {
  if (floorPencilActive && floorPencilVertices.length) { toast("Спочатку завершіть або скасуйте контур кімнати, який малюєте.", "error"); return; }
  if (typeof pendingFloorForms === "function" && pendingFloorForms().length) { reviewFloorDrafts(); toast("Перед побудовою застосуйте або скасуйте чернетки форм."); return; }
  try {
    const source = clone(project);
    if (direction === "panel") PanelProjectGeneration.inspectPlan(source);
    else if (!F.branches(source, { includePlanned: false, includeExcluded: true }).length) throw new Error("Додайте до щита хоча б один кінцевий автомат або дифавтомат.");
    const input = source.devices.find((device) => /^main-/.test(device.type));
    const phases = Number(source.design?.supply?.phases || (/^main-[34]p$/.test(input?.type) ? 3 : 1));
    const amps = D.breaker(input || {})?.amps || 40;
    generationDraft = { direction, source, fingerprint: JSON.stringify(project), options: { phases, inputA: [16, 20, 25, 32, 40, 50, 63].includes(amps) ? amps : 40, earthing: source.design?.supply?.earthing || "", protectionScheme: source.design?.protectionScheme || "balanced", voltageRelay: Boolean(source.design?.voltageRelayId), surgeProtection: source.devices.some((device) => device.type.startsWith("spd-")), keepPoints: true, socketRouting: source.floorPlan?.socketRouting === "radial" ? "radial" : "junction", socketCounts: {}, templateId: F.TEMPLATES[source.design?.templateId] ? source.design.templateId : "apartment-2", loads: {} }, result: null };
    $("#generationTitle").textContent = direction === "panel" ? "Перезібрати щит за планом" : "Побудувати розводку за щитом";
    $("#generationDescription").textContent = direction === "panel" ? "Буде замінено компоненти, шини та внутрішні проводи щита. Кімнати, точки й послідовність кабельних з’єднань залишаться на своїх місцях." : "Компоненти щита залишаться на місці. Сервіс запропонує точки й кабельні траси для його кінцевих кіл.";
    $("#generationTable").innerHTML = "";
    renderGenerationOptions(); updateGenerationPreview(); openModal("#generationModal");
  } catch (error) { toast(error.message, "error"); }
}

function renderGenerationOptions() {
  const { direction, source, options } = generationDraft;
  const select = (id, label, values, value) => `<label class="field"><span>${label}</span><select id="${id}">${values.map(([v, text]) => `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  $("#generationOptions").innerHTML = direction === "panel" ? `${select("generationPhases", "Ввід", [[1, "1 фаза · 230 В"], [3, "3 фази · 230/400 В"]], options.phases)}${select("generationInput", "Ввідний автомат", [16, 20, 25, 32, 40, 50, 63].map((a) => [a, `${a} А`]), options.inputA)}${select("generationEarth", "Заземлення", [["", "Ще не визначено"], ["TN-S", "TN-S"], ["TN-C-S", "TN-C-S · N/PE розділені до щита"], ["TT", "TT · потрібна окрема перевірка"]], options.earthing)}${select("generationProtection", "Захист груп", [["balanced", "Автомати + ПЗВ / окремі дифавтомати"], ["group-rcd", "Групові ПЗВ та автомати"], ["rcbo", "Дифавтомат на кожне коло"]], options.protectionScheme)}<label class="generation-check"><input type="checkbox" id="generationRelay" ${options.voltageRelay ? "checked" : ""} ${Number(options.phases) !== 1 ? "disabled" : ""}> Додати реле напруги (однофазний ввід)</label><label class="generation-check"><input type="checkbox" id="generationSurge" ${options.surgeProtection ? "checked" : ""}> Додати ПЗІП T2 після оцінки вводу</label>` : source.floorPlan?.rooms?.length ? `<label class="generation-check"><input type="checkbox" id="generationKeepPoints" ${options.keepPoints ? "checked" : ""}> Зберегти наявні точки й налаштовану проводку</label><p>Типові прямі підключення перебудуються за вибраною схемою. Існуючі дози та шлейфи збережуться. Для повної перебудови точок зніміть прапорець. Стіни зберігаються.</p>` : select("generationTemplate", "Початкова геометрія", Object.entries(F.TEMPLATES).map(([key, value]) => [key, value.title]), options.templateId);
  if (direction === "plan") $("#generationOptions").innerHTML = select("generationSocketRouting", "Схема розеткових груп", [["junction", "Через дозу · спільний підвід"], ["radial", "Окремі кабелі від щита"]], options.socketRouting) + $("#generationOptions").innerHTML;
}

function updateGenerationPreview() {
  const draft = generationDraft;
  if (!draft) return;
  try {
    draft.result = draft.direction === "panel" ? PanelProjectGeneration.rebuildPanel(draft.source, draft.options) : PanelProjectGeneration.buildPlan(draft.source, draft.options);
    const result = draft.result, next = result.project;
    $("#generationError").textContent = "";
    $("#generationApply").disabled = false;
    $("#generationSummary").textContent = draft.direction === "panel" ? `${result.circuits.length} кіл · ${next.devices.length} компонентів · ${next.wires.length} внутрішніх проводів · щит ${next.board.rows} × ${next.board.modulesPerRow} модулів` : `Нових точок: ${result.added} · нових доз: ${result.newJunctions} · збережено: ${result.kept} · кіл щита: ${result.rows.length}`;
    $("#generationTable").innerHTML = draft.direction === "panel" ? `<thead><tr><th>Коло з плану</th><th>Точок</th><th>Потужність, кВт</th><th>Захист</th></tr></thead><tbody>${result.circuits.map((circuit) => { const record = next.design.circuits.find((r) => r.key === circuit.key), device = next.devices.find((d) => d.id === record.deviceId); return `<tr><td>${escapeHtml(circuit.name)}${circuit.wet ? '<small>Вологе приміщення</small>' : ""}</td><td>${circuit.pointCount}</td><td><input type="number" min="0" max="1000" step="0.1" data-generation-load="${circuit.key}" aria-label="Потужність: ${escapeHtml(circuit.name)}" value="${circuit.kw ?? ""}" placeholder="Не задано"></td><td>${escapeHtml(device.label)} · ${escapeHtml(device.rating)}${record.rcdId ? " + ПЗВ" : ""}</td></tr>`; }).join("")}</tbody>` : `<thead><tr><th>Коло щита / схема</th><th>Розеток</th><th>Додано точок</th><th>Збережено</th></tr></thead><tbody>${result.rows.map((row) => `<tr><td>${escapeHtml(row.label)} · ${escapeHtml(row.name)}${row.socketRoute ? `<small class="generation-socket-route">${escapeHtml(row.socketRoute)}</small>` : ""}</td><td>${row.socketCount !== null ? `<input type="number" min="1" max="498" step="1" data-generation-socket-count="${escapeHtml(row.deviceId)}" aria-label="Розеток: ${escapeHtml(row.name)}" value="${row.socketCount}" ${row.socketEditable ? "" : 'disabled title="Кількість наявних точок збережено. Для повної перебудови зніміть прапорець збереження точок."'}>` : "—"}</td><td>${row.added}</td><td>${row.retained}</td></tr>`).join("")}</tbody>`;
    $("#generationNotes").innerHTML = result.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  } catch (error) {
    draft.result = null; $("#generationApply").disabled = true;
    $("#generationError").textContent = error.message;
    $("#generationSummary").textContent = "Перевірте параметри автопобудови";
    $("#generationNotes").innerHTML = "";
  }
}

function applyProjectGeneration() {
  const draft = generationDraft;
  if (!draft?.result) return;
  if (JSON.stringify(project) !== draft.fingerprint) { $("#generationError").textContent = "Проєкт змінився після відкриття перегляду. Закрийте вікно й відкрийте його знову."; $("#generationApply").disabled = true; return; }
  // If local storage is unavailable, keep the current design intact.
  if (!persistProject({ immediate: true })) return;
  const previous = { project: clone(project), projects: clone(projects), undo: [...undoStack], redo: [...redoStack] };
  let committed = false;
  try {
    const backup = E.cloneProject(project);
    backup.name = `${project.name} · до автопобудови · ${new Date().toLocaleString("uk-UA")}`;
    snapshot(); projects.unshift(backup); project = clone(draft.result.project);
    if (!persistProject({ immediate: true })) {
      project = previous.project; projects = previous.projects; undoStack = previous.undo; redoStack = previous.redo;
      renderAll(); return;
    }
    committed = true;
    generationDraft = null; $("#generationApply").disabled = true; closeModal($("#generationModal"));
    selectedDeviceId = null; resetWiringSelection(); floorSelectedId = null; floorScale = null; floorViewportFrame = null; floorRouteSelection = null; floorGeometryEditing = false; boardAutoFit = true;
    floorRoomId = project.floorPlan?.rooms[0]?.id || ""; floorCircuitId = "";
    renderAll(); switchView(draft.direction === "panel" ? "board" : "floor");
    if (draft.direction === "panel") fitBoard(); else { requestFloorSidebar("points"); renderFloorPlan(); }
    toast("Готово. Попередню версію збережено в «Мої проєкти»; зміни також можна скасувати кнопкою «Назад».");
  } catch (error) {
    if (!committed) { project = previous.project; projects = previous.projects; undoStack = previous.undo; redoStack = previous.redo; }
    renderAll(); toast(error.message, "error");
  }
}

function initProjectGeneration() {
  $("#generatePanelFromPlan").addEventListener("click", () => openProjectGeneration("panel"));
  $("#generatePlanFromPanel").addEventListener("click", () => openProjectGeneration("plan"));
  $("#generationApply").addEventListener("click", applyProjectGeneration);
  $("#generationOptions").addEventListener("change", (event) => {
    if (!generationDraft) return;
    const target = event.target, fields = { generationPhases: "phases", generationInput: "inputA", generationEarth: "earthing", generationProtection: "protectionScheme", generationRelay: "voltageRelay", generationSurge: "surgeProtection", generationKeepPoints: "keepPoints", generationTemplate: "templateId", generationSocketRouting: "socketRouting" };
    const key = fields[target.id]; if (!key) return;
    generationDraft.options[key] = target.type === "checkbox" ? target.checked : target.value;
    if (key === "phases") { if (Number(target.value) !== 1) generationDraft.options.voltageRelay = false; renderGenerationOptions(); }
    updateGenerationPreview();
  });
  $("#generationTable").addEventListener("change", (event) => {
    if (!generationDraft) return;
    const socketId = event.target.dataset.generationSocketCount;
    if (socketId) { generationDraft.options.socketCounts[socketId] = Number(event.target.value); updateGenerationPreview(); return; }
    const key = event.target.dataset.generationLoad;
    if (!key) return;
    generationDraft.options.loads[key] = event.target.value === "" ? null : Number(event.target.value); updateGenerationPreview();
  });
}

;
/* export-hub.js */
const Install = PanelInstallation;
const kitEsc = Install.esc;
const purchaseStatus = {needed:"До замовлення",ordered:"Замовлено",received:"Отримано"};
function workPlans() { return F.buildingPlans(project); }
function purchaseRows() {
  const types = Object.fromEntries(COMPONENTS.map(c=>[c.type,c.name]));
  return Install.materials(project,Cables.calculate(project),workPlans(),{...types,...F.TYPES});
}
function kitWireRows() {
  const takeoff=Install.lengths(project);
  return E.wireRows(project).map(w=>({...w,...takeoff.get(w.id)}));
}
function kitTable(head,rows) {
  return `<table class="kit-table"><thead><tr>${head.map(c=>`<th>${kitEsc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${kitEsc(v??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function numberedDrawing() {
  const scene=Install.layout(project), bound=M.assemblyViewport(project), paths=[], heads=[];
  const owners=new Map([...project.devices,...project.busbars].map(d=>[d.id,d])), tags=new Map();
  for(const wire of project.wires){
    for(const ref of [wire.from,wire.to]){const k=E.endpointKey(ref);if(!tags.has(k))tags.set(k,[]);tags.get(k).push(wire.label);}
  }
  const nodeRects=[...scene.rectangles].map(([id,r])=>`<g><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="1.8" fill="#f0f2ef" stroke="#667977" stroke-width=".55"/><text x="${r.x+r.width/2}" y="${r.y+r.height/2}" text-anchor="middle" font-size="3.3">${kitEsc(owners.get(id)?.label)}</text></g>`).join("");
  project.wires.forEach((wire,i)=>{
    const pts=Install.wirePath(wire,scene,i);
    if(pts.length)paths.push(`<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(" ")}" fill="none" stroke="${E.COLORS[wire.color]?.hex||"#54626a"}" stroke-width=".65" stroke-linejoin="round"/>`);
  });
  const extents=[];
  for(const [key,pt] of scene.ports){
    const marks=tags.get(key);if(!marks?.length)continue;
    const up=pt.port.side==="top",step=up?-1:1;
    const offset=2+(Number(pt.port.x)||0)*4;
    heads.push(`<circle cx="${pt.x}" cy="${pt.y}" r=".85" fill="#334249"/>`);
    marks.forEach((label,i)=>{const y=pt.y+step*(offset+3*i);extents.push(y);
      heads.push(`<text x="${pt.x}" y="${y}" text-anchor="middle" font-size="2.4" stroke="white" stroke-width=".9" paint-order="stroke">${kitEsc(label)}</text>`);});
  }
  const teeth=project.combs.map(c=>{const vs=c.terminals.map(ref=>scene.ports.get(E.endpointKey(ref))).filter(Boolean).sort((a,b)=>a.x-b.x);if(vs.length<2)return "";const y=vs[0].y+(vs[0].port.side==="bottom"?1:-1)*(6+2*["N","L1","L2","L3"].indexOf(c.potential));extents.push(y);return `<g stroke="${E.COLORS[E.DEFAULT_COLORS[c.potential]]?.hex||"#80502c"}"><path d="M${vs[0].x-2} ${y}H${vs.at(-1).x+2}" stroke-width="3"/>${vs.map(p=>`<path d="M${p.x} ${y}V${p.y}" stroke="#a36636" stroke-width="1.7"/>`).join("")}</g>`;}).join("");
  const top=Math.min(bound.topMm,...extents)-4, bottom=Math.max(bound.topMm+bound.heightMm,...extents)+4;
  return `<svg viewBox="${bound.leftMm-5} ${top} ${bound.widthMm+10} ${bottom-top}" class="kit-drawing" xmlns="http://www.w3.org/2000/svg">${nodeRects}${paths.join("")}${teeth}${heads.join("")}</svg>`;
}
function railLabels() {
  const chunks=[];
  Install.labelStrips(project).forEach((rail,row)=>{
    const step=Math.max(1,Math.floor(250/rail.pitch));
    for(let start=0;start<rail.modules;start+=step){
      const end=Math.min(rail.modules,start+step);
      const cells=rail.items.filter(d=>d.slot<end&&d.slot+d.modules>start).map(d=>{
        const first=Math.max(start,d.slot),last=Math.min(end,d.slot+d.modules);
        return `<div class="rail-label" style="left:${(first-start)*rail.pitch}mm;width:${(last-first)*rail.pitch}mm"><b>${kitEsc(d.label)}</b><span>${kitEsc(d.name)}</span></div>`;
      });
      chunks.push(`<div class="label-block"><small>DIN ${row+1} · ${start+1}–${end}</small><div class="label-strip" style="width:${(end-start)*rail.pitch}mm;background-size:${rail.pitch}mm 100%">${cells.join("")}</div></div>`);
    }
  });return `<div class="label-calibration">100 mm</div>${chunks.join("")}`;
}
function printKit() {
  const sheet=(title,html)=>`<section class="kit-sheet"><header><h2>${title}</h2><span>${kitEsc(project.name)} · ${new Date().toLocaleDateString()}</span></header>${html}</section>`;
  const wires=kitWireRows(), output=[];
  if($("#kitPlans").checked) for(const floorPlan of workPlans()){
    output.push(sheet(kitEsc(floorPlan.levelName||"План приміщень"),PanelFloorSvg.render({...project,floorPlan},{showHeights:true,showRoutes:true})));
  }
  if($("#kitSld").checked){const model=S.build(project);
    for(let i=0;i<model.pages.length;i++)output.push(sheet("Однолінійна схема",S.renderSvg(model,i,{monochrome:false})));
  }
  if($("#kitAssembly").checked)output.push(sheet("Монтажна схема",numberedDrawing()));
  if($("#kitWires").checked){
    output.push(sheet("З’єднання",kitTable(["Провід","Від","До","Колір","Переріз, мм²","Довжина, м","Джерело довжини"],wires.map(w=>[w.label,w.from,w.to,w.color,w.section,w.m,Install.origins[w.origin]]))));
    if(project.floorPlan){const result=F.buildingReport(project);output.push(sheet("Кабельна відомість",kitTable(["Коло","Опис кола","Без запасу, м","Стояк, м","Запас, м","Закупівля, м"],result.circuits.map(c=>[c.label,c.name,c.incomplete?null:c.installedM,c.riserM||0,c.incomplete?null:c.reserveM,c.incomplete?null:c.purchaseM]))+result.errors.map(s=>`<p>${kitEsc(s)}</p>`).join("")));}
  }
  if($("#kitLabels").checked)output.push(sheet("Наліпки на рейки",railLabels()));
  if(!output.length){toast("Оберіть аркуші для друку","error");return;}
  const root=$("#kitPrint");root.innerHTML=output.join("");document.body.classList.add("printing-kit");
  const finish=()=>{document.body.classList.remove("printing-kit");root.replaceChildren();};window.addEventListener("afterprint",finish,{once:true});
  try{window.print();}catch(e){finish();throw e;}
}
function purchaseTable() {
  const rows=purchaseRows();
  return `<div class="kit-scroll"><table class="kit-table"><thead><tr>${["Матеріал","К-ть","Артикул","Постачальник","Ціна, грн","Сума, грн","Стан"].map(k=>`<th>${k}</th>`).join("")}</tr></thead><tbody>${rows.map((r,i)=>`<tr data-purchase="${kitEsc(r.key)}"><td>${kitEsc(r.name)}</td><td>${r.qty??"—"} ${r.unit}${r.incomplete?" *":""}</td><td><input aria-label="Артикул" data-pfield="sku" maxlength="100" value="${kitEsc(r.sku)}"></td><td><input aria-label="Постачальник" data-pfield="supplier" maxlength="100" value="${kitEsc(r.supplier)}"></td><td><input aria-label="Ціна, грн" type="number" min="0" step=".01" max="1000000000" data-pfield="price" value="${r.price??""}"></td><td data-line-total>${r.price!=null&&r.qty!=null?(r.price*r.qty).toFixed(2):"—"}</td><td><select aria-label="Стан" data-pfield="status">${Object.entries(purchaseStatus).map(([k,v])=>`<option value="${k}" ${r.status===k?"selected":""}>${v}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div><p id="kitSum"></p><button class="button primary" id="kitXlsx">Завантажити Excel</button>`;
}
function sumPurchases() {
  const rows=purchaseRows(),sum=rows.reduce((s,r)=>s+(r.qty??0)*(r.price??0),0);
  $("#kitSum").textContent=`${money(sum)} · ${rows.filter(r=>r.price==null).length} — ${"без ціни"} · ${rows.filter(r=>r.incomplete).length} — ${"неповний метраж"}`;
}
function money(v){return new Intl.NumberFormat(document.documentElement.lang,{style:"currency",currency:"UAH"}).format(v);}
function exportProcurement(){
  const rows=purchaseRows(), header=["Матеріал","Одиниця","Кількість","Артикул","Постачальник","Ціна, грн","Сума, грн","Стан","Метраж"];
  const purchase=rows.map((r,i)=>[r.name,r.unit,r.qty,r.sku,r.supplier,r.price,{formula:`IF(COUNT(C${i+2},F${i+2})<2,"",ROUND(C${i+2}*F${i+2},2))`,value:r.price!=null&&r.qty!=null?Math.round(r.qty*r.price*100)/100:null},purchaseStatus[r.status],r.incomplete?"Неповний метраж":""]);
  if(purchase.length) purchase.push(["Разом","","","","","",{formula:`SUM(G2:G${rows.length+1})`,value:rows.reduce((s,r)=>s+Math.round((r.qty||0)*(r.price||0)*100)/100,0)}]);
  const sheets=[{name:"Закупівля",widths:[64,12,12,24,26,15,15,20,22],rows:[header,...purchase]},{name:"З’єднання",rows:[["Провід","Від","До","Переріз, мм²","Колір","Довжина, м","Джерело довжини"],...kitWireRows().map(w=>[w.label,w.from,w.to,w.section,w.color,w.m,Install.origins[w.origin]])]}];
  if(project.floorPlan)sheets.push({name:"Кабелі",rows:[["Коло","Назва","Без запасу, м","Стояк, м","Запас, м","Закупівля, м"],...F.buildingReport(project).circuits.map(c=>[c.label,c.name,c.incomplete?null:c.installedM,c.riserM||0,c.incomplete?null:c.reserveM,c.incomplete?null:c.purchaseM])]});
  downloadBlob(PanelWorkbook(sheets),`${slugify(project.name)}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
function openKit(tab="installer"){
  const content=$("#kitContent");
  $$("[data-kit-tab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.kitTab===tab)));
  if(tab==="installer"){
    content.innerHTML=`<div class="kit-choices">${[["kitPlans","План приміщень"],["kitSld","Однолінійна схема"],["kitAssembly","Монтажна схема"],["kitWires","З’єднання та кабелі"],["kitLabels","Наліпки на рейки"]].map(([id,name])=>`<label><input type="checkbox" id="${id}" checked> ${name}</label>`).join("")}</div><div class="kit-label-preview">${railLabels()}</div><p>Для наліпок оберіть масштаб друку 100% і перевірте контрольні 100 мм.</p><button class="button primary" id="kitPrintButton">Друк / PDF</button>`;
    $("#kitPlans").disabled=!project.floorPlan;$("#kitPlans").checked=Boolean(project.floorPlan);$("#kitPrintButton").onclick=printKit;
  }else if(tab==="purchase"){content.innerHTML=purchaseTable();sumPurchases();$("#kitXlsx").onclick=exportProcurement;}
  else showSharing(content);
  openModal("#kitDialog");
}
function initKit() {
  $("#kitDialog").addEventListener("click",e=>{const b=e.target.closest("[data-kit-tab]");if(b)openKit(b.dataset.kitTab);});
  $("#kitProjectJson").onclick=exportProject;
  $("#kitContent").addEventListener("change",e=>{
    const k=e.target.dataset.pfield;
    if(!["price","sku","supplier","status"].includes(k))return;
    const key=e.target.closest("[data-purchase]").dataset.purchase;
    if(!e.target.reportValidity())return;
    snapshot();project.purchase||={};
    project.purchase[key]={...project.purchase[key],[k]:k==="price"?(e.target.value===""?null:e.target.valueAsNumber):e.target.value};
    persistProject();sumPurchases();
    const r=purchaseRows().find(r=>r.key===key);e.target.closest("tr").querySelector("[data-line-total]").textContent=r.price!=null&&r.qty!=null?(r.price*r.qty).toFixed(2):"—";
  });
}

;
/* workspace-tools.js */
let starterIntent="board", tracedDevice=null, traceProject=null;
function levelName(plan){return plan.levelName||"Основний поверх";}
function changeLevel(id) {
  if((project.floorPlan?.levelId||"main")===id)return true;
  if(pendingFloorForms().length){reviewFloorDrafts();return false;}
  cancelFloorInteractions();project=F.selectLevel(project,id);resetLevelView();persistProject();renderAll();return true;
}
function resetLevelView(){
  floorSelectedId=null;floorRoomId=project.floorPlan?.rooms[0]?.id||"";floorScale=null;floorCircuitId=traceProject===project.id && project.floorPlan?.points.some(p=>p.circuitId===tracedDevice)?tracedDevice:"";floorRouteSelection=null;
  floorWallIndex=null;floorVertexIndex=null;floorOpeningKind=null;floorGeometryEditing=false;floorJunctionDraft=null;
}
function renderLevels(){
  if(!project.floorPlan)return;
  const plans=workPlans(), options=plans.map(p=>`<option value="${kitEsc(p.levelId||"main")}">${kitEsc(levelName(p))}</option>`).join("");
  for(const id of ["#storeyPick","#storeySettingsPick"]){const s=$(id);s.innerHTML=options;s.value=project.floorPlan.levelId||"main";}
  $("#storeyPick").classList.toggle("hidden",plans.length<2);$("#riserLead").value=project.riserLeadM||0;
  const level=project.floorPlan;
  const total=$("#buildingSummary");total.hidden=plans.length<2;
  if(!total.hidden){const report=F.buildingReport(project);const riser=report.circuits.reduce((sum,c)=>sum+(c.riserM||0),0);total.textContent=`${"Увесь будинок"} · ${report.circuits.some(c=>c.incomplete)?"≥ ":""}${floorNumber(report.totalPurchaseM)} м · ${"Кабель у стояку"} ${floorNumber(riser)} м`;}
  $("#storeySummary").textContent=`${"Відмітка поверху"} · ${floorNumber(level.elevationM||0)} м`;
  $("#storeyElevation").value=Math.max(...plans.map(p=>p.elevationM||0))+3;
}
function tracePointInfo(){
  const box=$("#pointTrace");if(!box)return;
  const plan=project.floorPlan, p=plan?.points.find(v=>v.id===floorSelectedId);
  if(!p||p.type==="panel"){box.replaceChildren();return;}
  const ids=new Set(), chain=[];let at=p;
  while(at&&!ids.has(at.id)){ids.add(at.id);chain.unshift(at.label);at=F.sourceFor(plan,at);}
  const device=project.devices.find(d=>d.id===p.circuitId);
  box.innerHTML=`<small>${kitEsc(plan.rooms.find(r=>r.id===p.roomId)?.name)} · ${chain.map(kitEsc).join(" → ")}</small>${device?`<strong>${kitEsc(device.label)} · ${kitEsc(device.name)} · DIN ${device.row+1}</strong><div><button type="button" data-trace-board="${kitEsc(device.id)}">Показати автомат</button><button type="button" data-trace-sld="${kitEsc(device.id)}">На схемі</button></div>`:""}`;
}
function deviceWorkInfo(){
  const box=$("#deviceTrace");if(!box)return;
  const d=project.devices.find(v=>v.id===selectedDeviceId);
  if(!d){box.replaceChildren();return;}
  const points=workPlans().flatMap(p=>p.points.filter(v=>v.circuitId===d.id));
  const match=Install.catalogue(d);
  box.innerHTML=`${points.length?`<button class="button ghost" data-trace-floor="${kitEsc(d.id)}" type="button">Точки на плані · ${points.length}</button>`:""}<details><summary>Модель і наліпка</summary><label class="field"><span>Короткий підпис</span><input data-device-extra="printName" maxlength="60" value="${kitEsc(d.printName||"")}" placeholder="${kitEsc(d.name)}"></label><label class="field"><span>Артикул</span><input data-device-extra="article" maxlength="100" value="${kitEsc(d.article||"")}"></label>${match?`<small>${kitEsc(match.model)} · ${kitEsc(match.sku)} · <a href="${match.source}" target="_blank" rel="noopener">Каталог ABB</a></small><button type="button" data-article="${match.sku}">Вибрати виконання ABB</button>`:""}</details>`;
}
function traceToPlan(id){
  const levels=workPlans().filter(l=>l.points.some(p=>p.circuitId===id));
  if(!levels.length)return;
  const first=levels.includes(project.floorPlan)?project.floorPlan:levels[0];
  if(!changeLevel(first.levelId||"main"))return;
  tracedDevice=id;traceProject=project.id;switchView("floor");floorCircuitId=id;floorGeometryEditing=false;floorToolsOpen=true;
  selectFloorPoint(first.points.find(p=>p.circuitId===id).id);renderFloorCanvas();
}
function markFloorPoints(){
  if(!project.floorPlan)return;
  const points=new Map(project.floorPlan.points.map(p=>[p.id,p]));
  for(const n of $$("#floorCanvas [data-floor-point]")){
    const p=points.get(n.dataset.floorPoint);if(!p)continue;
    n.classList.toggle("trace-member",Boolean(tracedDevice)&&project.id===traceProject&&p.circuitId===tracedDevice&&floorCircuitId===tracedDevice);
  }
}
function makeClientSnapshot(){
  return {v:1,title:project.name,date:new Date().toISOString(),rails:Install.labelStrips(project),levels:workPlans().map(plan=>{
    const layout=F.layout(plan), circuits=new Map(F.branches({...project,floorPlan:plan}).map(d=>[d.id,d]));
    return {name:levelName(plan),bounds:{x:layout.minX,y:layout.minY,w:layout.width,h:layout.height},rooms:layout.rooms.map(r=>{
      const rings=(r.vertices?[r.vertices,...(r.holes||[]).map(h=>h.vertices)]:[[{x:r.x,y:r.y},{x:r.x+r.widthM,y:r.y},{x:r.x+r.widthM,y:r.y+r.depthM},{x:r.x,y:r.y+r.depthM}]]).map(a=>a.map(p=>[p.x,p.y]));
      return {name:r.name,x:r.x+r.widthM/2,y:r.y+r.depthM/2,rings};
    }),points:plan.points.map(p=>{const world=F.world(plan,p,layout),c=circuits.get(p.circuitId);return {id:p.id,type:p.type,name:p.name,label:p.label,x:world.x,y:world.y,h:world.z,room:world.room.name,circuit:c?[c.label,c.name].join(" · "):"",source:F.sourceFor(plan,p)?.label||""};})};
  })};
}
const shareApi="api/shares";
function shareHistoryKey(){return "electropanel.v3.shares."+project.id;}
function loadShareHistory(){try{const items=JSON.parse(localStorage.getItem(shareHistoryKey())||"[]");return Array.isArray(items)?items.filter(s=>s&&typeof s.id==="string"&&typeof s.token==="string"):[];}catch{return [];}}
function saveShareHistory(items){localStorage.setItem(shareHistoryKey(),JSON.stringify(items));}
function showSharing(content){
  const projectId=project.id;const viewer=new URL("viewer.html",location.href);viewer.searchParams.set("lang",document.documentElement.lang);
  const published=loadShareHistory();
  content.innerHTML=`<p>Замовник побачить зафіксовану версію плану, висоти точок і підписи щита.</p><button type="button" class="button primary" id="shareCreate">Створити посилання</button><p id="shareMode" aria-live="polite"></p><div id="shareResult" class="share-fields" hidden><input readonly id="shareUrl" aria-label="Посилання"><button class="button ghost" id="shareCopy">Копіювати</button></div><div id="managedShares">${published.map(s=>`<div class="managed-share"><span>${kitEsc(formatDate(s.date))}</span><a href="${kitEsc(viewer.href+"&id="+encodeURIComponent(s.id))}" target="_blank" rel="noopener">Перегляд</a><button type="button" data-revoke="${kitEsc(s.id)}">Відкликати</button></div>`).join("")}</div>`;
  const button=$("#shareCreate"), result=$("#shareResult"), urlField=$("#shareUrl"), mode=$("#shareMode");
  const capability=location.protocol==="file:"?Promise.resolve(false):fetch(shareApi+"/capabilities",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>v?.version===1).catch(()=>false);
  capability.then(managed=>{if(mode.isConnected)mode.textContent=managed?"Серверне посилання можна відкликати.":"Копія зберігається в самому посиланні. Її можна переглядати після надсилання без обмеження строку.";});
  button.onclick=async()=>{button.disabled=true;
    try{
      const payload=await PanelSnapshotCodec.encode(makeClientSnapshot()), managed=await capability;
      if(!button.isConnected||project.id!==projectId)return;
      if(managed){
        const res=await fetch(shareApi,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload})});if(!res.ok)throw Error();
        const v=await res.json();viewer.searchParams.set("id",v.id);
        try{saveShareHistory([...loadShareHistory(),{id:v.id,token:v.token,date:new Date().toISOString()}]);}
        catch(e){await fetch(shareApi+"/"+v.id,{method:"DELETE",headers:{Authorization:"Bearer "+v.token}});throw e;}
        showSharing(content);
      }else{
        if(payload.length>60000)throw Error("long");
        viewer.hash="s="+payload;
      }
      const out=$("#shareResult");out.hidden=false;$("#shareUrl").value=viewer.href;
    }catch(e){mode.textContent=e.message==="long"?"Цей план завеликий для автономного посилання. Скористайтеся серверним доступом або PDF.":"Не вдалося створити посилання";}finally{button.disabled=false;}
  };
  $("#shareCopy").onclick=async()=>{urlField.select();try{await navigator.clipboard.writeText(urlField.value);toast("Посилання скопійовано");}catch{urlField.focus();urlField.select();}};
  $("#managedShares").onclick=async e=>{const b=e.target.closest("[data-revoke]");if(!b)return;const entry=loadShareHistory().find(s=>s.id===b.dataset.revoke);if(!entry)return;b.disabled=true;
    try{const r=await fetch(shareApi+"/"+entry.id,{method:"DELETE",headers:{Authorization:"Bearer "+entry.token}});if(!r.ok&&r.status!==404)throw Error();saveShareHistory(loadShareHistory().filter(s=>s.id!==entry.id));showSharing(content);}catch{b.disabled=false;mode.textContent="Не вдалося відкликати посилання";}};
}
function initWorkspaceTools(){
  for(const [key,cls] of [["showCatalog","catalog-closed"],["showInspector","inspector-closed"],["showBoardHint","hint-open"]]){
    const field=$("#"+key), saved=PStore.readString(browserStorage,"electropanel.v3.view."+key);
    if(saved)field.checked=saved==="on";
    const apply=()=>{document.body.classList.toggle(cls,key==="showBoardHint"?field.checked:!field.checked);requestAnimationFrame(()=>{if(boardAutoFit)fitBoard();});};field.onchange=()=>{PStore.writeString(browserStorage,"electropanel.v3.view."+key,field.checked?"on":"off");apply();};apply();
  }
  for(const s of [$("#storeyPick"),$("#storeySettingsPick")])s.onchange=e=>{if(!changeLevel(e.target.value))renderLevels();};
  $("#storeyAdd").onclick=()=>{try{if(pendingFloorForms().length){reviewFloorDrafts();return;}const next=F.addLevel(project,$("#storeyName").value,$("#storeyElevation").valueAsNumber);snapshot();project=E.normalizeProject(next);resetLevelView();$("#storeyName").value="";persistProject();renderAll();}catch(e){toast(e.message,"error");}};
  $("#wireEndAllowance").onchange=e=>{if(!e.target.reportValidity()||!Number.isFinite(e.target.valueAsNumber))return;snapshot();project.wireEndAllowanceMm=e.target.valueAsNumber;persistProject();renderAll();};
  $("#riserLead").onchange=e=>{if(!e.target.reportValidity()||!Number.isFinite(e.target.valueAsNumber))return;snapshot();project.riserLeadM=e.target.valueAsNumber;if(project.floorPlan.syncWithCircuits)project=F.syncLengths(project);persistProject();renderAll();};
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-start],[data-trace-floor],[data-trace-board],[data-trace-sld],[data-article]");if(!b)return;
    if(b.dataset.start){starterIntent=b.dataset.start;$$("[data-start]").forEach(n=>n.setAttribute("aria-pressed",String(n===b)));}
    if(b.dataset.traceFloor)traceToPlan(b.dataset.traceFloor);
    if(b.dataset.traceBoard){switchView("board");chooseDevice(b.dataset.traceBoard);if(innerWidth<=900)toggleDrawer("inspector");}
    if(b.dataset.traceSld){
      switchView("diagram");const id=b.dataset.traceSld,index=schematicModel.pages.findIndex(p=>p.ids.includes(id));
      if(index>=0){changeSchematicPage(index);const n=$(`.sld-page.active [data-diagram-device="${CSS.escape(id)}"]`);n?.classList.add("trace-sld");n?.focus({preventScroll:true});}
      else toast("Апарат без силового відгалуження на однолінійній схемі");
    }
    if(b.dataset.article){const d=project.devices.find(v=>v.id===selectedDeviceId);if(d){snapshot();d.article=b.dataset.article;persistProject();renderAll();}}
  });
  $("#deviceTrace").addEventListener("change",e=>{const k=e.target.dataset.deviceExtra,d=project.devices.find(v=>v.id===selectedDeviceId);if(!d||!["article","printName"].includes(k))return;snapshot();d[k]=e.target.value.trim();persistProject();renderAll();});
  $("#startExample").onclick=()=>{const old=project.id;starterIntent="board";createChosenTemplate();if(project.id===old)return;project=PanelProjectGeneration.buildPlan(project).project;persistProject();renderAll();switchView("floor");};
}

;
/* app.js */
const STORAGE_KEY = "electropanel.v3.projects.v1";
const UILanguage = typeof PanelLocale === "undefined" ? null : PanelLocale;
const ACTIVE_KEY = "electropanel.v3.active-project.v1";
const HINT_KEY = "electropanel.v3.hint-dismissed.v1";
const PStore = PanelProjectStore;
const browserStorage = (() => { try { return window.localStorage; } catch { return null; } })();
let projectStorageState;
const MODULE_PX = 42;

const COMPONENTS = [
  { type: "main-2p", name: "Ввідний автомат", detail: "2P · C40 · 6 kA", category: "Захист", modules: 2, rating: "C40", phase: "L1", cable: "10", load: 0, accent: "#26343d", face: "main", photo: "mcb-1p.png", photoMode: "pole", photoScale: 1.52 },
  { type: "main-3p", name: "Ввідний автомат 3P", detail: "3P · C63 · 10 kA", category: "Захист", modules: 3, rating: "C63", phase: "3P", cable: "16", load: 0, accent: "#26343d", face: "main", photo: "mcb-1p.png", photoMode: "pole", photoScale: 1.52 },
  { type: "main-4p", name: "Ввідний автомат", detail: "4P · C63 · 10 kA", category: "Захист", modules: 4, rating: "C63", phase: "3P", cable: "16", load: 0, accent: "#26343d", face: "main", photo: "mcb-1p.png", photoMode: "pole", photoScale: 1.52 },
  { type: "mcb-1p", name: "Автоматичний вимикач", detail: "1P · B/C · 6 kA", category: "Захист", modules: 1, rating: "C16", phase: "L1", cable: "2.5", load: 2.2, accent: "#5b7281", face: "mcb", photo: "mcb-1p.png", photoMode: "pole", photoScale: 1.52 },
  { type: "mcb-2p", name: "Автоматичний вимикач", detail: "2P · C25 · 6 kA", category: "Захист", modules: 2, rating: "C25", phase: "L1", cable: "4", load: 4.5, accent: "#5b7281", face: "mcb", photo: "mcb-1p.png", photoMode: "pole", photoScale: 1.52 },
  { type: "rcbo", name: "Дифавтомат", detail: "1P+N · C16 · 30 mA", category: "Дифзахист", modules: 2, rating: "C16 / 30mA", phase: "L1", cable: "2.5", load: 2.2, accent: "#c58830", face: "rcd", photo: "rcbo.svg", photoScale: 1 },
  { type: "rcbo-afdd", name: "Дифавтомат + ПВДП", detail: "1P+N · B16 · A · 30 mA · AFDD", category: "Дифзахист", modules: 4, rating: "B16 / A / 30mA", phase: "L1", cable: "2.5", load: 2, accent: "#c58830", face: "rcd", photo: "rcbo-afdd.svg", photoScale: 1 },
  { type: "outgoing-terminal", name: "Клемник кола L/N/PE", detail: "L / N / PE · 3 затискачі", category: "Монтаж", modules: 2, rating: "L/N/PE", phase: "L1", cable: "2.5", load: 0, accent: "#de9f39", face: "contactor", photo: "terminal-block.png", photoMode: "pole", photoScale: 1.25 },
  { type: "rccb-2p", name: "ПЗВ", detail: "2P · 40 A · 30 mA", category: "Дифзахист", modules: 2, rating: "40A / 30mA", phase: "L1", cable: "6", load: 0, accent: "#2b96a6", face: "rcd", photo: "rccb-2p.svg", photoScale: 1 },
  { type: "rccb-4p", name: "ПЗВ", detail: "4P · 63 A · 30 mA", category: "Дифзахист", modules: 4, rating: "63A / 30mA", phase: "3P", cable: "10", load: 0, accent: "#2b96a6", face: "rcd", photo: "rccb-4p.svg", photoScale: 1 },
  { type: "spd-2p", name: "Обмежувач перенапруги", detail: "T2 · 2P · 20 kA", category: "Захист", modules: 2, rating: "T2 20kA", phase: "L1", cable: "6", load: 0, accent: "#6cab46", face: "spd", photo: "spd-2p.png", photoMode: "pair", photoScale: 1 },
  { type: "spd-4p", name: "Обмежувач перенапруги", detail: "T2 · 4P · 20 kA", category: "Захист", modules: 4, rating: "T2 20kA", phase: "3P", cable: "10", load: 0, accent: "#6cab46", face: "spd", photo: "spd-2p.png", photoMode: "pair", photoScale: 1 },
  { type: "contactor", name: "Модульний контактор", detail: "2P · 25 A · 230 V", category: "Керування", modules: 2, rating: "25A 230V", phase: "L1", cable: "2.5", load: 0, accent: "#b48d52", face: "contactor", photo: "contactor.png", photoScale: 1.26 },
  { type: "relay", name: "Реле напруги", detail: "1P · 40 A", category: "Керування", modules: 2, rating: "40A", phase: "L1", cable: "6", load: 0, accent: "#826aae", face: "meter", photo: "voltage-relay.png", photoScale: 1 },
  { type: "meter", name: "Лічильник енергії", detail: "1P · 40 A · Modbus", category: "Облік", modules: 2, rating: "40A", phase: "L1", cable: "6", load: 0, accent: "#668c62", face: "meter", photo: "energy-meter.png", photoScale: 1.26 },
  { type: "terminal", name: "Клемний блок", detail: "L/N/PE · 6 мм²", category: "Монтаж", modules: 1, rating: "6 мм²", phase: "N", cable: "6", load: 0, accent: "#de9f39", face: "contactor", photo: "terminal-block.png", photoScale: 1.4 },
  { type: "blank", name: "Заглушка", detail: "1 модуль", category: "Монтаж", modules: 1, rating: "1M", phase: "N", cable: "1.5", load: 0, accent: "#aab2b5", face: "blank" },
  ...ControlDevices.COMPONENTS,
];

const CATEGORY_LABELS = ["Усі", "Захист", "Дифзахист", "Керування", "Облік", "Монтаж"];
const PHASE_COLORS = { L1: "#80502c", L2: "#24282c", L3: "#8b9299", "3P": "#55636d", N: "#1976df", PE: "#24864b" };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = (iso) => Number.isFinite(Date.parse(iso)) ? new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "дату не задано";

let projects = loadProjects();
let project = getInitialProject();
let selectedDeviceId = null;
let activeCategory = "Усі";
let zoom = 1;
let boardAutoFit = true;
let undoStack = [];
let redoStack = [];
let saveTimer = null;
let draggedDeviceId = null;
let draggedComponentType = null;

function sampleProject() {
  const now = new Date().toISOString();
  return {
    id: uid(),
    version: 2,
    name: "Щит квартири",
    createdAt: now,
    updatedAt: now,
    board: M.withCapacity({ name: "ЩК-1 · квартира", reserve: 20 }, 3, 18),
    devices: [
      makeDevice("main-4p", 0, 0, { label: "QF0", name: "Ввід", rating: "C40", phase: "3P" }),
      makeDevice("spd-2p", 0, 4, { label: "SPD1", name: "Захист від імпульсів" }),
      makeDevice("rccb-2p", 0, 6, { label: "QFD1", name: "Група освітлення" }),
      makeDevice("mcb-1p", 0, 8, { label: "QF1", name: "Освітлення", rating: "B10", phase: "L1", cable: "1.5", load: 0.8 }),
      makeDevice("mcb-1p", 0, 9, { label: "QF2", name: "Розетки кімнат", phase: "L2", load: 2.1 }),
      makeDevice("mcb-1p", 0, 10, { label: "QF3", name: "Розетки кухні", phase: "L3", load: 2.8 }),
      makeDevice("rcbo", 1, 0, { label: "QFD2", name: "Пральна машина", phase: "L1", load: 2.2 }),
      makeDevice("rcbo", 1, 2, { label: "QFD3", name: "Бойлер", phase: "L2", load: 2.0 }),
      makeDevice("rcbo", 1, 4, { label: "QFD4", name: "Посудомийна машина", phase: "L3", load: 1.8 }),
      makeDevice("mcb-2p", 1, 6, { label: "QF4", name: "Варильна поверхня", rating: "C25", phase: "L1", cable: "4", load: 5.5 }),
      makeDevice("relay", 2, 0, { label: "KV1", name: "Контроль напруги", phase: "L1" }),
      makeDevice("contactor", 2, 2, { label: "KM1", name: "Непріоритетне навантаження", phase: "L1" }),
    ],
  };
}

function makeDevice(type, row, slot, overrides = {}) {
  const component = COMPONENTS.find((item) => item.type === type) || COMPONENTS[0];
  return {
    ...clone(component.config || {}),
    id: uid(), type, geometryId: M.defaultProfile(type), row, slot,
    label: overrides.label || nextLabel(component),
    name: overrides.name || component.name,
    rating: overrides.rating ?? (ControlDevices.configFor(type) ? ControlDevices.rating({ type, ...component.config, rating: component.rating }) : component.rating),
    phase: overrides.phase ?? component.phase,
    cable: String(overrides.cable ?? component.cable),
    load: Number(overrides.load ?? component.load),
  };
}

function nextLabel(component) {
  const prefix = ControlDevices.prefix(component.type) || (["terminal", "outgoing-terminal"].includes(component.type) ? "XT" : component.type === "blank" ? "BL" : component.face === "rcd" ? "QFD" : component.face === "spd" ? "SPD" : component.face === "contactor" ? "KM" : component.face === "meter" ? "K" : "QF");
  let index = 1;
  while (project.devices.some((device) => device.label === `${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function loadProjects() {
  projectStorageState = PStore.load(browserStorage, E.normalizeProject);
  return projectStorageState.projects;
}

function getInitialProject() {
  const activeId = PStore.readString(browserStorage, ACTIVE_KEY);
  const existing = projects.find((item) => item.id === activeId) || projects[0];
  if (existing) return E.normalizeProject(existing);
  const starter = E.normalizeProject(sampleProject());
  projects = [clone(starter)];
  PStore.save(browserStorage, projectStorageState, projects, starter.id);
  return starter;
}

let projectSaveStatus = { text: "Збережено локально", tone: "saved" };
function setProjectSaveStatus(text, tone) { projectSaveStatus = { text, tone }; renderProjectSaveStatus(); }
function renderProjectSaveStatus() {
  const pending = typeof pendingFloorForms === "function" ? pendingFloorForms().length : 0, button = $("#reviewFormDraftsButton");
  $("#saveStateText").textContent = projectSaveStatus.tone === "error" ? `${projectSaveStatus.text}${pending ? ` · чернеток: ${pending}` : ""}` : pending ? `Незастосовані зміни: ${pending}` : projectSaveStatus.text;
  button.disabled = !pending;
  button.classList.toggle("has-drafts", pending > 0); button.classList.toggle("save-error", projectSaveStatus.tone === "error"); button.classList.toggle("saving", projectSaveStatus.tone === "saving");
  button.title = pending ? "Переглянути й застосувати або скасувати незастосовані зміни форм" : "Застосовані зміни зберігаються локально у браузері";
}

function persistProject({ immediate = false } = {}) {
  (project.consumers || []).filter((c) => c.deviceId).forEach((consumer) => {
    const device = project.devices.find((d) => d.id === consumer.deviceId);
    if (device) { if (!consumer.nameIndependent) consumer.name = device.name; consumer.phase = device.phase; }
  });
  (project.design?.circuits || []).forEach((circuit) => {
    if (circuit.outputKind !== "consumer") return;
    const device = project.devices.find((item) => item.id === circuit.deviceId);
    const consumer = project.consumers?.find((item) => item.id === circuit.outputId);
    if (device && consumer) {
      if (!consumer.nameIndependent) consumer.name = device.name;
      if (E.PHASES.includes(device.phase)) consumer.phase = device.phase;
    }
  });
  project.updatedAt = new Date().toISOString();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = clone(project); else projects.unshift(clone(project));
  setProjectSaveStatus("Збереження…", "saving");
  clearTimeout(saveTimer);
  const save = () => {
    const result = PStore.save(browserStorage, projectStorageState, projects, project.id);
    setProjectSaveStatus(result.ok ? "Збережено локально" : "Зміни в пам’яті · експортуйте JSON", result.ok ? "saved" : "error");
    if (!result.ok) toast(result.conflict ? result.error : "Браузер не зміг зберегти проєкти. Зміни залишилися в цій вкладці; експортуйте JSON.", "error");
    return result.ok;
  };
  if (immediate) return save();
  saveTimer = setTimeout(save, 280); return true;
}

function snapshot() {
  undoStack.push(clone(project));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function undo() {
  cancelFloorInteractions(); cancelRouteDrag();
  const previous = undoStack.pop();
  if (!previous) return;
  redoStack.push(clone(project));
  project = previous;
  if (!project.floorPlan && $("#floorView").classList.contains("active")) switchView("board");
  selectedDeviceId = null;
  resetWiringSelection();
  persistProject({ immediate: true });
  renderAll();
}

function redo() {
  cancelFloorInteractions(); cancelRouteDrag();
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(clone(project));
  project = next;
  if (!project.floorPlan && $("#floorView").classList.contains("active")) switchView("board");
  selectedDeviceId = null;
  resetWiringSelection();
  persistProject({ immediate: true });
  renderAll();
}

function updateHistoryButtons() {
  $("#undoButton").disabled = undoStack.length === 0;
  $("#redoButton").disabled = redoStack.length === 0;
}

function renderAll() {
  renderProjectChrome();
  renderLibrary();
  renderBoard();
  renderInspector();
  renderDiagram();
  renderFloorPlan();
  renderBom();
  renderWireReport();
  renderWiringPalette();
  renderProjectGeneration();
  updateHistoryButtons(); renderProjectSaveStatus();
}

function renderProjectChrome() {
  $("#projectTitle").textContent = project.name;
  $("#boardTitle").textContent = project.board.name || "ЩР-1";
  $("#boardSizeText").textContent = `${project.board.rows} × ${project.board.modulesPerRow} · ${project.board.rows * project.board.modulesPerRow} мод.`;
  const ip = $(".board-meta span:last-child");
  if (ip) ip.textContent = project.board.ip;
  $("#bomBadge").textContent = project.devices.length + project.busbars.length + project.combs.length + (project.board.enclosureId || project.board.dimensions ? 1 : 0);
  document.title = `${project.name} · ElectroPanel Studio 3`;
}

function renderLibrary() {
  const query = $("#librarySearch").value.trim().toLocaleLowerCase("uk");
  const filtered = COMPONENTS.filter((component) => {
    const categoryMatch = activeCategory === "Усі" || component.category === activeCategory;
    const searchMatch = !query || `${component.name} ${component.detail} ${component.category}`.toLocaleLowerCase("uk").includes(query);
    return categoryMatch && searchMatch;
  });
  $("#libraryCount").textContent = filtered.length;
  $("#categoryTabs").innerHTML = CATEGORY_LABELS.map((category) => `<button class="category-tab ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">${category}</button>`).join("");
  $("#componentList").innerHTML = filtered.length ? filtered.map((component) => `
    <article class="component-card" draggable="true" data-component-type="${component.type}" title="Перетягніть на DIN-рейку">
      <div class="component-preview type-${component.face} ${component.photo ? "has-photo" : ""}" style="--component-accent:${component.accent};--photo-scale:${component.photoScale || 1}">${component.photo ? componentArtworkMarkup(component) : ""}</div>
      <div class="component-copy"><strong>${component.name}</strong><span>${component.detail} · ${getComponent(component.type).modules} місць</span><small class="component-dimensions">${mmText(M.dimensions({ type: component.type, geometryId: M.defaultProfile(component.type) }))}${M.defaultProfile(component.type) ? " · каталог" : " · орієнтовно"}</small></div>
      <button class="add-component" type="button" data-add-component="${component.type}" aria-label="Додати ${component.name}"><svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></button>
    </article>`).join("") : `<div class="component-list-empty">Нічого не знайдено.<br>Спробуйте іншу назву або категорію.</div>`;

  $$("[data-category]").forEach((button) => button.addEventListener("click", () => { activeCategory = button.dataset.category; renderLibrary(); }));
  $$("[data-add-component]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); addComponent(button.dataset.addComponent); }));
  $$(".component-card[data-component-type]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      draggedDeviceId = null; draggedComponentType = card.dataset.componentType;
      event.dataTransfer.setData("text/component-type", draggedComponentType);
      event.dataTransfer.effectAllowed = "copy";
      if (window.innerWidth <= 900) closeDrawers();
    });
    card.addEventListener("dragend", () => { draggedComponentType = null; clearRailInsertion(); markWireDropTarget(); });
    card.addEventListener("dblclick", () => addComponent(card.dataset.componentType));
  });
}

function getComponent(deviceOrType, board = project.board) {
  const type = typeof deviceOrType === "string" ? deviceOrType : deviceOrType.type;
  const component = COMPONENTS.find((item) => item.type === type) || COMPONENTS[0];
  const device = typeof deviceOrType === "string" ? { type, geometryId: M.defaultProfile(type) } : deviceOrType;
  return { ...component, bodyModules: component.modules, modules: M.modulesFor(device, board) };
}

function renderBoard() {
  renderMechanicalBoard();
  document.documentElement.style.setProperty("--module", `${MODULE_PX}px`);
  const rows = [];
  for (let row = 0; row < project.board.rows; row += 1) {
    const used = project.devices.filter((device) => device.row === row).reduce((sum, device) => sum + getComponent(device).modules, 0) + project.busbars.filter((bar) => bar.zone === "din" && bar.row === row).reduce((sum, bar) => sum + E.busbarModules(bar, project.board), 0);
    const devices = project.devices.filter((device) => device.row === row).sort((a, b) => a.slot - b.slot);
    rows.push(`
      <div class="din-row-wrap" style="${rowGeometryStyle(row)}">
        <div class="rail-label"><span>DIN ${row + 1}</span><span>${used} / ${project.board.modulesPerRow} мод.</span></div>
        <div class="din-row" data-row="${row}" style="width:${project.board.modulesPerRow * MODULE_PX}px">
          ${Array.from({ length: project.board.modulesPerRow }, (_, slot) => `<span class="module-number" style="left:${slot * MODULE_PX}px">${slot + 1}</span>`).join("")}
          ${devices.map(deviceMarkup).join("")}
        </div>
      </div>`);
  }
  $("#dinRows").innerHTML = rows.join("");
  renderBusbars();
  renderConsumers();
  positionPhysicalBusbars();
  if (boardAutoFit) fitBoard(); else updateZoomLayout();

  $$(".din-row").forEach((rail) => {
    rail.addEventListener("dragover", (event) => { event.preventDefault(); rail.classList.add("drag-over"); event.dataTransfer.dropEffect = draggedDeviceId ? "move" : "copy"; showRailInsertion(rail, event.clientX); });
    rail.addEventListener("dragleave", (event) => { if (!rail.contains(event.relatedTarget)) { rail.classList.remove("drag-over"); clearRailInsertion(); } });
    rail.addEventListener("drop", handleRailDrop);
  });
  $$(".board-device").forEach((node) => {
    node.addEventListener("click", (event) => { event.stopPropagation(); chooseDevice(node.dataset.deviceId); });
    node.addEventListener("dragstart", (event) => {
      draggedComponentType = null; draggedDeviceId = node.dataset.deviceId;
      node.classList.add("dragging");
      event.dataTransfer.setData("text/device-id", draggedDeviceId);
      event.dataTransfer.effectAllowed = "move";
    });
    node.addEventListener("dragend", () => { draggedDeviceId = null; clearRailInsertion(); node.classList.remove("dragging"); $$(".din-row").forEach((rail) => rail.classList.remove("drag-over")); });
  });
}

function chooseDevice(deviceId) {
  selectedDeviceId = deviceId;
  selectedWireId = selectedBusbarId = selectedCombId = null;
  renderBoard();
  renderInspector();
  renderWiringPalette();
}

function deviceMarkup(device) {
  const component = getComponent(device);
  const selected = selectedDeviceId === device.id ? "selected" : "";
  const photoClass = component.photo ? "photo-device" : "";
  return `<button class="board-device type-${component.face} ${photoClass} ${selected}" draggable="true" type="button" aria-pressed="${selectedDeviceId === device.id}" data-device-id="${escapeHtml(device.id)}" style="${deviceGeometryStyle(device)};--device-accent:${component.accent};--phase-color:${PHASE_COLORS[device.phase] || PHASE_COLORS.N};--photo-scale:${component.photoScale || 1.25}" title="${escapeHtml(device.label)} · ${escapeHtml(device.name)} · ${mmText(M.dimensions(device))}">
    ${component.photo ? devicePhotoMarkup(device, component) : `
    <div class="device-stripe"></div>
    <div class="device-face">
      <div class="device-top">${escapeHtml(device.label)}<small>${escapeHtml(device.rating)}</small></div>
      <div class="device-control"><span class="toggle-lever"></span></div>
      <div class="device-bottom"><span>${escapeHtml(shortName(device.name, component.modules))}</span><em></em></div>
      ${component.modules > 1 ? `<span class="device-width-badge">${component.modules}M</span>` : ""}
    </div>`}
  </button>`;
}

function componentArtworkMarkup(component, copies = null, display = null) {
  const modules = component.bodyModules || component.modules;
  copies ??= component.photoMode === "pole" ? modules : component.photoMode === "pair" ? Math.max(1, Math.ceil(modules / 2)) : 1;
  return PanelDeviceVisuals.artwork(component, copies, display);
}

function devicePhotoMarkup(device, component) {
  const bodyModules = component.bodyModules || component.modules;
  const copies = component.photoMode === "pole" ? bodyModules : component.photoMode === "pair" ? Math.max(1, Math.ceil(bodyModules / 2)) : 1;
  const images = componentArtworkMarkup(component, copies, PanelDeviceVisuals.dimensions(device, uniformDeviceHeight));
  return `<div class="device-photo-layer">${images}</div>
    ${device.type === "main-3p" ? '<span class="three-pole-link" aria-hidden="true"></span>' : ""}
    <div class="device-photo-overlay">
      <span class="device-ident"><strong>${escapeHtml(device.label)}</strong><small>${escapeHtml(device.rating)}</small></span>
      <span class="device-circuit-label">${escapeHtml(shortName(device.name, component.modules))}</span>
      <i class="device-phase-indicator"></i>
    </div>`;
}

function shortName(name, modules) {
  const limit = modules === 1 ? 6 : modules === 2 ? 14 : 24;
  return name.length > limit ? `${name.slice(0, limit - 1)}…` : name;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function railInsertionSlot(rail, clientX, movingId = null) {
  const position = (clientX - rail.getBoundingClientRect().left) / zoom / MODULE_PX;
  return PanelRailLayout.boundary(project, Number(rail.dataset.row), position, movingId);
}
function clearRailInsertion() { $$(".rail-insertion-marker").forEach((node) => node.remove()); }
function showRailInsertion(rail, clientX) {
  const moving = project.devices.find((d) => d.id === draggedDeviceId), type = moving?.type || draggedComponentType;
  if (!type) return;
  let slot = railInsertionSlot(rail, clientX, draggedDeviceId), row = Number(rail.dataset.row);
  if (slot + getComponent(moving || type).modules > project.board.modulesPerRow && row + 1 < project.board.rows) { row++; slot = 0; }
  const target = $(`.din-row[data-row="${row}"]`); clearRailInsertion();
  const marker = document.createElement("span"); marker.className = "rail-insertion-marker";
  marker.setAttribute("aria-hidden", "true"); marker.style.left = `${slot * MODULE_PX}px`; marker.textContent = "Вставити"; target.append(marker);
}

function handleRailDrop(event) {
  event.preventDefault();
  const rail = event.currentTarget;
  rail.classList.remove("drag-over");
  const row = Number(rail.dataset.row);
  const deviceId = event.dataTransfer.getData("text/device-id");
  const slot = railInsertionSlot(rail, event.clientX, deviceId);
  clearRailInsertion(); draggedComponentType = null; draggedDeviceId = null;
  const componentType = event.dataTransfer.getData("text/component-type");
  if (deviceId) moveDevice(deviceId, row, slot);
  else if (componentType && selectedWireId) insertComponentAtWire(componentType, selectedWireId, surfacePoint(event.clientX, event.clientY), null, { row, slot });
  else if (componentType) addComponent(componentType, row, slot);
}

function isSpaceFree(row, slot, modules, ignoredId = null) {
  if (row < 0 || row >= project.board.rows || slot < 0 || slot + modules > project.board.modulesPerRow) return false;
  const deviceConflict = project.devices.some((device) => {
    if (device.id === ignoredId || device.row !== row) return false;
    const width = getComponent(device).modules;
    return slot < device.slot + width && slot + modules > device.slot;
  });
  return !deviceConflict && !project.busbars.some((bar) => bar.id !== ignoredId && bar.zone === "din" && bar.row === row && slot < bar.slot + E.busbarModules(bar, project.board) && slot + modules > bar.slot);
}

function findFirstSpace(modules) {
  for (let row = 0; row < project.board.rows; row += 1) {
    for (let slot = 0; slot <= project.board.modulesPerRow - modules; slot += 1) {
      if (isSpaceFree(row, slot, modules)) return { row, slot };
    }
  }
  return null;
}

function addComponent(type, row = null, slot = null) {
  if (selectedWireId) return insertComponentAtWire(type, selectedWireId, null, null, row === null ? null : { row, slot });
  try {
    const component = getComponent(type), target = row === null ? findFirstSpace(component.modules) : { row, slot };
    if (!target) throw new Error("У щиті немає вільного місця для цього пристрою");
    const result = PanelRailLayout.place(project, makeDevice(type, target.row, target.slot), target.row, target.slot);
    const error = M.checks(result.project).find((issue) => issue.level === "error"); if (error) throw new Error(error.text);
    snapshot(); project = result.project; resetWiringSelection(); selectedDeviceId = result.device.id;
    persistProject(); renderAll();
    toast(`${component.name} додано на DIN ${result.target.row + 1}${result.shifted.length ? ` · зміщено елементів: ${result.shifted.length}` : ""}`);
  } catch (error) { toast(error.message, "error"); }
}

function nearestSpaceAtPoint(modules, point, ignoredId = null) {
  const surface = $("#wiringSurface").getBoundingClientRect();
  const candidates = [];
  $$(".din-row").forEach((rail) => {
    const row = Number(rail.dataset.row), rect = rail.getBoundingClientRect();
    for (let slot = 0; slot <= project.board.modulesPerRow - modules; slot += 1) {
      if (!isSpaceFree(row, slot, modules, ignoredId)) continue;
      const x = (rect.left - surface.left) / zoom + (slot + modules / 2) * MODULE_PX;
      const y = (rect.top - surface.top + rect.height / 2) / zoom;
      candidates.push({ row, slot, distance: (x - point.x) ** 2 + (y - point.y) ** 2 });
    }
  });
  return candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.slot - b.slot)[0] || null;
}

function insertComponentAtWire(type, wireId, point = null, existingId = null, placement = null) {
  try {
    if (!$("#boardView").classList.contains("active")) switchView("board");
    const existing = project.devices.find((device) => device.id === existingId);
    const component = getComponent(existing || type);
    const anchor = point || wireInsertionPoint || wireMidpoint(wireId);
    const target = placement || nearestSpaceAtPoint(component.modules, anchor, existingId);
    if (!target) throw new Error("У щиті немає вільного місця для цього пристрою");
    const device = existing ? { ...clone(existing), row: target.row, slot: target.slot } : makeDevice(type, target.row, target.slot, { load: 0 });
    const originalWire = project.wires.find((wire) => wire.id === wireId), originalLabel = originalWire?.label;
    const layout = placement ? PanelRailLayout.place(project, device, target.row, target.slot) : null;
    const result = E.insertDeviceInWire(layout?.project || project, wireId, layout?.device || device);
    const error = M.checks(result.project).find((issue) => issue.level === "error");
    if (error) throw new Error(error.text);
    snapshot(); project = result.project;
    resetWiringSelection(); selectedDeviceId = device.id;
    persistProject(); renderAll();
    const pairLabels = result.pair.map((portId) => E.deviceTerminals(result.device).find((port) => port.portId === portId)?.label || portId);
    toast(`${device.label} вставлено в ${originalLabel} через ${pairLabels.join(" → ")}, DIN ${target.row + 1}. Інші полюси й живлення підключаються окремо.${originalWire?.lengthM ? " Уточніть довжини двох нових відрізків проводу." : ""}`);
  } catch (error) { toast(error.message, "error"); }
}

function moveDevice(id, row, slot) {
  const device = project.devices.find((item) => item.id === id); if (!device) return;
  try {
    const result = PanelRailLayout.place(project, device, row, slot);
    if (!result.movedIds.length) return;
    const error = M.checks(result.project).find((issue) => issue.level === "error"); if (error) throw new Error(error.text);
    snapshot(); project = result.project; selectedDeviceId = id; resetWiringSelection();
    persistProject(); renderAll();
  } catch (error) { toast(error.message, "error"); }
}

function deleteSelectedDevice() {
  if (!selectedDeviceId) return;
  snapshot();
  project = E.removeEntity(project, "device", selectedDeviceId);
  selectedDeviceId = null;
  resetWiringSelection();
  persistProject();
  renderAll();
  toast("Компонент видалено");
}

function projectPhaseCount() {
  const configured = Number(project.design?.supply?.phases ?? project.board.phases);
  if ([1, 3].includes(configured)) return configured;
  const incoming = project.devices.find((device) => device.type.startsWith("main-"));
  if (incoming) return /-[34]p$/.test(incoming.type) ? 3 : 1;
  return project.devices.some((device) => ["3P", "L2", "L3"].includes(device.phase)) ? 3 : 1;
}

function renderInspector() {
  const totalModules = project.board.rows * project.board.modulesPerRow;
  const usedModules = project.devices.reduce((sum, device) => sum + getComponent(device).modules, 0) + project.busbars.filter((bar) => bar.zone === "din").reduce((sum, bar) => sum + E.busbarModules(bar, project.board), 0);
  const totalLoad = project.devices.reduce((sum, device) => sum + Number(device.load || 0), 0);
  $("#usedModulesMetric").innerHTML = `${usedModules}<small>/${totalModules}</small>`;
  $("#modulesProgress").style.width = `${Math.min(100, (usedModules / totalModules) * 100)}%`;
  $("#loadMetric").innerHTML = `${number(totalLoad)}<small>кВт</small>`;

  const phases = { L1: 0, L2: 0, L3: 0 };
  project.devices.forEach((device) => {
    const load = Number(device.load || 0);
    if (device.phase === "3P") { phases.L1 += load / 3; phases.L2 += load / 3; phases.L3 += load / 3; }
    else if (phases[device.phase] !== undefined) phases[device.phase] += load;
  });
  const maxPhase = Math.max(...Object.values(phases), 1);
  Object.entries(phases).forEach(([phase, value]) => {
    $(`#phase${phase}Bar`).style.width = `${(value / maxPhase) * 100}%`;
    $(`#phase${phase}Value`).textContent = `${number(value)} кВт`;
  });
  const values = Object.values(phases);
  const imbalance = Math.max(...values) - Math.min(...values);
  const phaseCount = projectPhaseCount();
  $(".phase-balance").classList.toggle("hidden", phaseCount === 1);
  $("#balanceText").textContent = phaseCount === 1 ? "однофазний ввід" : imbalance <= 1 ? "добрий баланс" : `перекіс ${number(imbalance)} кВт`;

  const checks = [...validateProject(usedModules, totalModules, phases, phaseCount), ...wiringChecks(), ...M.checks(project).filter((issue) => issue.level === "error").map((issue) => ({ level: "error", title: "Габарити й місце", text: issue.text }))];
  const warnings = checks.filter((check) => check.level !== "success").length;
  $("#projectStatus").className = `status-pill ${warnings ? "warning" : "success"}`;
  $("#projectStatus").setAttribute("aria-controls", "projectCheckSection");
  $("#projectStatus").innerHTML = `<i></i> ${warnings ? `${warnings} зауваж.` : "Базові перевірки"}`;
  $("#checkCount").textContent = checks.length;
  $("#checkList").innerHTML = checks.map((check) => `<article class="check-item ${check.level}"><span class="check-icon">${check.level === "success" ? "✓" : "!"}</span><div class="check-copy"><strong>${escapeHtml(check.title)}</strong><span>${escapeHtml(check.text)}</span></div></article>`).join("");

  const device = project.devices.find((item) => item.id === selectedDeviceId);
  $("#deviceInspector").classList.toggle("hidden", !device);
  $("#replaceAfddButton").classList.toggle("hidden", device?.type !== "rcbo-afdd");
  const consumer = device && E.consumerForDevice(project, device.id), consumerButton = $("#addConsumerButton");
  consumerButton.classList.toggle("hidden", !E.canAddConsumer(device));
  consumerButton.disabled = Boolean(consumer);
  consumerButton.textContent = consumer ? "Споживача додано" : "Додати споживача";
  $("#consumerNameField").classList.toggle("hidden", !consumer);
  $("#consumerNameInput").value = consumer?.name || "";
  $("#addConsumerHelp").classList.toggle("hidden", !E.canAddConsumer(device));
  if (device) {
    const component = getComponent(device);
    $("#inspectorDeviceName").textContent = component.name;
    $("#deviceLabelInput").value = device.label;
    $("#deviceNameInput").value = device.name;
    $("#deviceRatingInput").value = device.rating;
    $("#devicePhaseInput").innerHTML = (/-[34]p$/.test(device.type) ? ["3P"] : device.type === "terminal" ? ["L1", "L2", "L3", "N", "PE"] : ["L1", "L2", "L3"]).map((phase) => `<option>${phase}</option>`).join("") + (device.phase === "3P" && !/-[34]p$/.test(device.type) ? '<option value="3P" disabled>3P · перевірте модель</option>' : "");
    $("#devicePhaseInput").value = device.phase;
    $("#deviceLoadInput").value = device.load;
    $("#deviceCableInput").value = device.cable;
    $("#deviceLocation").textContent = `DIN ${device.row + 1} · модулі ${device.slot + 1}–${device.slot + component.modules}`;
  }
  renderWiringInspector();
  renderControlInspector();
  renderDesignReport();
  renderGeometryInspector();
  renderMechanicalSummary();
  if (typeof deviceWorkInfo === "function") deviceWorkInfo();
}

function validateProject(used, total, phases, phaseCount = projectPhaseCount()) {
  const checks = [];
  const hasMain = project.devices.some((device) => getComponent(device).face === "main");
  checks.push(hasMain ? { level: "success", title: "Ввідний захист", text: "У проєкті присутній ввідний автомат." } : { level: "error", title: "Немає ввідного автомата", text: "Додайте ввідний захисний апарат." });
  const reserve = ((total - used) / total) * 100;
  checks.push(reserve >= project.board.reserve ? { level: "success", title: "Резерв модулів", text: `Вільно ${total - used} мод. (${Math.round(reserve)}%).` } : { level: "warning", title: "Малий резерв", text: `Залишилось ${total - used} мод.; задано резерв ${project.board.reserve}%.` });
  const diffCount = project.devices.filter((device) => ["rcd", "rcbo"].includes(getComponent(device).face) || device.type.startsWith("rccb")).length;
  checks.push(diffCount ? { level: "success", title: "Диференційний захист", text: `Встановлено пристроїв: ${diffCount}.` } : { level: "warning", title: "Немає дифзахисту", text: "Перевірте необхідність ПЗВ або дифавтоматів." });
  const phaseValues = Object.values(phases);
  const imbalance = Math.max(...phaseValues) - Math.min(...phaseValues);
  if (phaseCount === 3) checks.push(imbalance <= 1 ? { level: "success", title: "Баланс фаз", text: "Навантаження розподілене рівномірно." } : { level: "warning", title: "Перекіс фаз", text: `Різниця між фазами ≈ ${number(imbalance)} кВт.` });
  return checks;
}

function bindInspectorInputs() {
  $("#consumerNameInput").addEventListener("change", (event) => {
    const consumer = E.consumerForDevice(project, selectedDeviceId); if (!consumer) return;
    try { const next = E.renameConsumer(project, consumer.id, event.target.value); snapshot(); project = next; persistProject(); renderAll(); }
    catch (error) { toast(error.message, "error"); renderInspector(); }
  });
  $("#addConsumerButton").addEventListener("click", () => {
    try {
      const result = E.addConsumer(project, selectedDeviceId); if (!result.created) return;
      snapshot(); project = result.project; resetWiringSelection(); persistProject(); renderAll(); setWiringMode(true); closeDrawers();
      toast("Споживача додано під апаратом. Натисніть вихідну клему апарата, потім клему споживача, щоб провести провід.");
    } catch (error) { toast(error.message, "error"); }
  });
  const bindings = [
    ["#deviceLabelInput", "label", (value) => value],
    ["#deviceNameInput", "name", (value) => value],
    ["#deviceRatingInput", "rating", (value) => value],
    ["#devicePhaseInput", "phase", (value) => value],
    ["#deviceLoadInput", "load", (value) => value.trim() === "" ? null : Number(value)],
    ["#deviceCableInput", "cable", (value) => value],
  ];
  bindings.forEach(([selector, key, normalize]) => {
    $(selector).addEventListener("change", (event) => {
      const device = project.devices.find((item) => item.id === selectedDeviceId);
      if (!device) return;
      snapshot();
      D.updateDevice(project, device.id, { [key]: normalize(event.target.value) });
      persistProject();
      renderAll();
    });
  });
}

function renderDiagram() {
  renderConnectedDiagram();
}

function getBomRows() {
  const grouped = new Map();
  project.devices.forEach((device) => {
    const component = getComponent(device);
    const d = M.dimensions(device);
    const key = `${device.type}|${device.rating}|${device.geometryId || ""}|${JSON.stringify(device.dimensions || {})}`;
    if (!grouped.has(key)) grouped.set(key, { component: { ...component, name: `${component.name} · ${d.model} · ${mmText(d)}${d.verified ? "" : " (орієнтовно)"}` }, rating: device.rating, count: 0 });
    grouped.get(key).count += 1;
  });
  project.busbars.forEach((bar) => {
    const key = `bar|${bar.potential}|${bar.terminals}|${bar.ratedCurrent || ""}|${JSON.stringify(bar.dimensions || {})}`;
    const dimensions = bar.dimensions ? ` · ${bar.dimensions.model || "Власна модель"} · ${mmText(bar.dimensions)}` : " · габарити не задано";
    if (!grouped.has(key)) grouped.set(key, { component: { name: `Шина ${bar.potential}, ${bar.terminals} клем${dimensions}`, category: "Монтаж", modules: bar.zone === "din" ? E.busbarModules(bar, project.board) : 0 }, rating: bar.ratedCurrent ? `${bar.ratedCurrent} А` : "Номінал не задано", count: 0 });
    grouped.get(key).count += 1;
  });
  project.combs.forEach((comb) => {
    const key = `comb|${comb.potential}|${comb.terminals.length}|${comb.ratedCurrent || ""}|${comb.contactType || ""}|${comb.series || ""}`;
    if (!grouped.has(key)) grouped.set(key, { component: { name: `Гребінка ${comb.potential}, ${comb.terminals.length} контактів${comb.contactType ? ` · ${comb.contactType.toUpperCase()}` : ""}${comb.series ? ` · ${comb.series}` : ""}`, category: "Монтаж", modules: 0 }, rating: comb.ratedCurrent ? `${comb.ratedCurrent} А` : "Номінал не задано", count: 0 });
    grouped.get(key).count += 1;
  });
  project.wires.forEach((wire) => {
    const key = `wire|${wire.material}|${wire.section}|${wire.color}`;
    if (!grouped.has(key)) grouped.set(key, { component: { name: `Провід ${wire.material} ${wire.section} мм²`, category: "Проводи · відрізки", modules: 0 }, rating: E.COLORS[wire.color]?.label || wire.color, count: 0 });
    grouped.get(key).count += 1;
  });
  if (project.board.enclosureId || project.board.dimensions) {
    const b = M.boardGeometry(project.board);
    grouped.set("enclosure", { component: { name: `${b.model} · ${mmText(b)}`, category: "Корпус", modules: 0 }, rating: `${project.board.rows}×${project.board.modulesPerRow} · ${project.board.ip}`, count: 1 });
  }
  return [...grouped.values()].sort((a, b) => a.component.category.localeCompare(b.component.category, "uk") || a.component.name.localeCompare(b.component.name, "uk"));
}

function renderBom() {
  const rows = getBomRows();
  const totalModules = project.devices.reduce((sum, device) => sum + getComponent(device).modules, 0);
  const categories = new Set(project.devices.map((device) => getComponent(device).category)).size;
  $("#bomSummary").innerHTML = `
    <article class="bom-summary-card"><span>Апаратів / шин / корпусів</span><strong>${project.devices.length + project.busbars.length + project.combs.length + (project.board.enclosureId || project.board.dimensions ? 1 : 0)}</strong></article>
    <article class="bom-summary-card"><span>Унікальних типів</span><strong>${rows.length}</strong></article>
    <article class="bom-summary-card"><span>Зайнято місця</span><strong>${totalModules}<small>мод.</small></strong></article>`;
  $("#bomTableBody").innerHTML = rows.map((row, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td><strong>${escapeHtml(row.component.name)}</strong><br><small>${escapeHtml(row.component.category)}</small></td><td>${escapeHtml(row.rating)}</td><td>${row.component.modules || "—"}</td><td>${row.count}</td></tr>`).join("");
  $("#bomEmpty").classList.toggle("hidden", rows.length > 0);
  $(".bom-table").classList.toggle("hidden", rows.length === 0);
  renderBomCables();
  void categories;
}

function number(value) {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(value);
}

function switchView(view) {
  if (view !== "floor") cancelFloorInteractions();
  if (view !== "board") { cancelRouteDrag(); cancelPendingWire(false); }
  document.body.classList.toggle("floor-mode", view === "floor");
  document.body.classList.toggle("report-mode", ["bom", "wires", "design"].includes(view));
  document.body.classList.toggle("diagram-mode", view === "diagram");
  document.body.classList.toggle("diagram-expanded", view === "diagram" && schematicExpanded);
  $$(".view-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  $$('[data-view-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $("#canvasToolbar").classList.toggle("hidden", view !== "board");
  $(".editor-area").classList.toggle("document-mode", view !== "board");
  if (view === "floor") { ensureFloorPlan(); renderFloorPlan(); }
  if (view === "diagram") renderDiagram();
  if (view === "bom") renderBom();
  if (view === "wires") renderWireReport();
  if (view === "design") renderDesignReport();
  if (view === "board") requestAnimationFrame(() => { updateZoomLayout(); scheduleWiringPaint(); });
}

function openProjectIssues() {
  if (D.calculate(project)) {
    closeDrawers(); switchView("design");
    const section = $("#designIssues");
    section.scrollIntoView({ block: "start" }); section.focus({ preventScroll: true });
  } else {
    switchView("board");
    if (window.innerWidth <= 900 && !$(".inspector-panel").classList.contains("drawer-open")) toggleDrawer("inspector");
    const section = $("#projectCheckSection");
    section.scrollIntoView({ block: "start" }); section.focus({ preventScroll: true });
  }
}

function setZoom(next, autoFit = false) {
  if (!Number.isFinite(next) || autoFit && next <= 0) return;
  boardAutoFit = autoFit;
  zoom = autoFit ? next : Math.max(.01, Math.min(1.65, next));
  updateZoomLayout();
  scheduleWiringPaint();
}

function updateZoomLayout() {
  const board = $("#boardShell");
  const native = boardSceneSize(), size = PanelViewport.atScale(native.width, native.height, zoom);
  if (!size) return;
  $("#boardScaleFrame").style.width = `${size.width}px`;
  $("#boardScaleFrame").style.height = `${size.height}px`;
  board.style.transform = `scale(${zoom})`;
  $("#zoomValue").textContent = `${Math.round(zoom * 100)}%`;
}

function boardSceneSize() {
  const board = $("#boardShell"), style = getComputedStyle(board);
  return { width: parseFloat(style.width) || board.offsetWidth, height: parseFloat(style.height) || board.offsetHeight };
}

function fitBoard() {
  const canvas = $("#canvas");
  if (!$("#boardView").classList.contains("active")) return;
  const native = boardSceneSize(), padding = getComputedStyle($("#canvasStage"));
  const availableWidth = canvas.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight) - 2;
  const availableHeight = canvas.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - 2;
  const size = PanelViewport.fit(native.width, native.height, availableWidth, availableHeight);
  if (!size) return;
  setZoom(size.scale, true);
  canvas.scrollLeft = 0; canvas.scrollTop = 0;
}

function openModal(id) { cancelFloorInteractions(); cancelRouteDrag(); $(id).classList.remove("hidden"); }
function closeModal(node) { node.closest(".modal-backdrop")?.classList.add("hidden"); }

function renderProjectList() {
  $("#projectList").innerHTML = projects.map((item) => {
    const moduleCount = item.devices.reduce((sum, device) => sum + getComponent(device, item.board).modules, 0);
    return `<article class="project-row">
      <div class="project-thumb"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h8"/></svg></div>
      <div class="project-copy"><strong>${escapeHtml(item.name)}</strong><span>${moduleCount} мод. · ${formatDate(item.updatedAt)}</span></div>
      <div class="project-row-actions">
        <button type="button" data-open-project="${escapeHtml(item.id)}">${item.id === project.id ? "Відкрито" : "Відкрити"}</button>
        <button type="button" data-duplicate-project="${escapeHtml(item.id)}">Копія</button>
        ${projects.length > 1 ? `<button class="danger-text" type="button" data-delete-project="${escapeHtml(item.id)}">У кошик</button>` : ""}
      </div>
    </article>`;
  }).join("");
  $$("[data-open-project]").forEach((button) => button.addEventListener("click", () => openProject(button.dataset.openProject)));
  $$("[data-duplicate-project]").forEach((button) => button.addEventListener("click", () => duplicateProject(button.dataset.duplicateProject)));
  $$("[data-delete-project]").forEach((button) => button.addEventListener("click", () => deleteProject(button.dataset.deleteProject)));
  $("#projectTrashCount").textContent = projectStorageState.trash.length;
  $("#projectTrashList").innerHTML = projectStorageState.trash.map((item) => `<article class="project-row"><div class="project-copy"><strong>${escapeHtml(item.name)}</strong><span>У кошику · ${formatDate(item.deletedAt)}</span></div><button type="button" class="button ghost" data-restore-project="${escapeHtml(item.id)}">Відновити</button></article>`).join("") || '<p class="project-storage-note">Кошик порожній.</p>';
  $$("[data-restore-project]").forEach((button) => button.addEventListener("click", () => restoreProject(button.dataset.restoreProject)));
  const recovery = projectStorageState.rejected.length || projectStorageState.malformedRaw !== null || PStore.readString(browserStorage, PStore.RECOVERY_KEY);
  $("#projectRecovery").classList.toggle("hidden", !recovery);
  $("#projectRecoveryText").textContent = projectStorageState.rejected.length ? `${projectStorageState.rejected.length} записів не вдалося відкрити. Оригінали збережено; здорові проєкти доступні.` : "Оригінал пошкодженого сховища збережено для відновлення.";
}

function restoreProject(id) {
  try { const result = PStore.restore(projects, projectStorageState.trash, id); projects = result.projects; projectStorageState.trash = result.trash; persistProject({ immediate: true }); renderProjectList(); toast("Проєкт відновлено з кошика"); }
  catch (error) { toast(error.message, "error"); }
}
function exportProjectRecovery() {
  const backupKey = PStore.readString(browserStorage, PStore.RECOVERY_KEY);
  downloadBlob(JSON.stringify({ format: "electropanel-recovery", rejected: projectStorageState.rejected, original: projectStorageState.malformedRaw ?? (backupKey ? PStore.readString(browserStorage, backupKey) : null) }, null, 2), "electropanel-recovery.json", "application/json");
}

function newProject() {
  openTemplateChooser();
}

function newEmptyProject() {
  const now = new Date().toISOString();
  persistProject({ immediate: true });
  const created = E.normalizeProject({ id: uid(), version: 2, name: `Новий проєкт ${projects.length + 1}`, createdAt: now, updatedAt: now, board: M.withCapacity({ name: "ЩР-1", reserve: 20 }, 3, 18), devices: [] });
  projects.unshift(clone(created));
  project = created;
  selectedDeviceId = null;
  resetWiringSelection();
  setWiringMode(false);
  undoStack = [];
  redoStack = [];
  persistProject({ immediate: true });
  $$(".modal-backdrop").forEach((modal) => modal.classList.add("hidden"));
  switchView("board");
  renderAll();
  toast("Створено новий локальний проєкт");
}

function openProject(id) {
  cancelFloorInteractions();
  persistProject({ immediate: true });
  const found = projects.find((item) => item.id === id);
  if (!found) return;
  project = E.normalizeProject(found);
  selectedDeviceId = null;
  resetWiringSelection();
  undoStack = [];
  redoStack = [];
  PStore.writeString(browserStorage, ACTIVE_KEY, project.id);
  $("#projectModal").classList.add("hidden");
  if ($("#floorView").classList.contains("active")) ensureFloorPlan();
  renderAll();
}

function duplicateProject(id) {
  const source = projects.find((item) => item.id === id);
  if (!source) return;
  persistProject({ immediate: true });
  const copy = E.cloneProject(source);
  copy.name = `${copy.name} · копія`;
  copy.createdAt = copy.updatedAt = new Date().toISOString();
  projects.unshift(copy);
  persistProject({ immediate: true });
  renderProjectList();
  toast("Копію проєкту створено");
}

function deleteProject(id) {
  persistProject({ immediate: true });
  let archived;
  try { archived = PStore.archive(projects, projectStorageState.trash, id); } catch (error) { return toast(error.message, "error"); }
  if (id === project.id) {
    const fallback = projects.find((item) => item.id !== id);
    if (!fallback) return;
    project = E.normalizeProject(fallback);
    selectedDeviceId = null;
    resetWiringSelection();
    undoStack = [];
    redoStack = [];
  }
  projects = archived.projects; projectStorageState.trash = archived.trash;
  if ($("#floorView").classList.contains("active")) ensureFloorPlan();
  persistProject({ immediate: true });
  renderProjectList();
  renderAll();
  toast("Проєкт перенесено в кошик. Його можна відновити у «Мої проєкти».");
}

function exportProject() {
  const payload = JSON.stringify({ format: "electropanel-project", exportedAt: new Date().toISOString(), project }, null, 2);
  downloadBlob(payload, `${slugify(project.name)}.electropanel.json`, "application/json");
  toast("Файл проєкту експортовано");
}

function importProject(file) {
  if (file.size > 10 * 1024 * 1024) return toast("Файл проєкту перевищує 10 МБ. Перевірте, чи обрано JSON проєкту.", "error");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = E.cloneProject(parsed.project || parsed);
      imported.name = `${imported.name || "Імпортований проєкт"} · імпорт`;
      imported.createdAt = imported.updatedAt = new Date().toISOString();
      projects.unshift(imported);
      project = clone(imported);
      selectedDeviceId = null;
      resetWiringSelection();
      undoStack = [];
      redoStack = [];
      persistProject({ immediate: true });
      $("#projectModal").classList.add("hidden");
      if ($("#floorView").classList.contains("active")) ensureFloorPlan();
      renderAll();
      toast("Проєкт успішно імпортовано");
    } catch (error) {
      toast(`Не вдалося прочитати файл: ${error.message}`, "error");
    }
  };
  reader.onerror = () => toast("Не вдалося прочитати файл. Спробуйте відкрити його повторно.", "error");
  reader.readAsText(file);
}

function exportCsv() {
  const rows = [["Поз.", "Найменування", "Категорія", "Параметри", "Модулі", "Кількість"]];
  getBomRows().forEach((row, index) => rows.push([index + 1, row.component.name, row.component.category, row.rating, row.component.modules, row.count]));
  rows.push(...Cables.csvRows(Cables.calculate(project), E.COLORS));
  const csv = csvContent(rows);
  downloadBlob(csv, `${slugify(project.name)}-bom.csv`, "text/csv;charset=utf-8");
  toast("Специфікацію CSV сформовано");
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value) {
  return value.toLocaleLowerCase("uk").replace(/[^a-zа-яіїєґ0-9]+/giu, "-").replace(/(^-|-$)/g, "") || "electropanel-project";
}

function applyBoardSettings() {
  try {
  const nextBoard = {
    ...clone(project.board),
    name: $("#boardNameInput").value.trim() || "ЩР-1",
    rows: Number($("#boardRowsInput").value),
    modulesPerRow: Number($("#boardModulesInput").value),
    ip: $("#boardIpInput").value,
    reserve: Math.max(0, Math.min(50, Number($("#boardReserveInput").value) || 0)),
    earthing: $("#boardEarthingInput").value,
    penSplit: $("#boardEarthingInput").value === "TN-C-S" && $("#boardPenSplitInput").checked,
  };
  if (project.busbars.some((bar) => bar.potential === "PEN") && !nextBoard.penSplit) {
    toast("Спершу приберіть PEN-шину або залиште точку поділу PEN у TN-C-S.", "error"); return false;
  }
  const draft = clone(project);
  draft.board = readMechanicalBoard(nextBoard);
  const candidate = E.normalizeProject(M.repack(draft));
  if (E.validate(candidate).some((issue) => issue.code === "comb-potential")) {
    toast("Цей розмір розділить апарати однієї гребінки між рейками. Спершу змініть гребінку.", "error"); return false;
  }
  snapshot();
  project = candidate;
  setUniformDeviceHeight(!$("#boardPhysicalInput").checked, false);
  selectedDeviceId = project.devices.some((device) => device.id === selectedDeviceId) ? selectedDeviceId : null;
  persistProject();
  $("#settingsModal").classList.add("hidden");
  renderAll();
  setTimeout(fitBoard, 0);
  toast("Параметри щита оновлено");
  return true;
  } catch (error) { toast(error.message, "error"); return false; }
}

function openBoardSettings() {
  $("#boardNameInput").value = project.board.name || "ЩР-1";
  $("#boardRowsInput").value = project.board.rows;
  $("#boardModulesInput").value = project.board.modulesPerRow;
  $("#boardIpInput").value = project.board.ip;
  $("#boardReserveInput").value = project.board.reserve;
  $("#boardEarthingInput").value = project.board.earthing;
  $("#boardPenSplitInput").checked = project.board.penSplit;
  prepareMechanicalBoardForm();
  openModal("#settingsModal");
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  $("#toastRegion").append(node);
  setTimeout(() => node.remove(), 3200);
}

function bindEvents() {
  $("#librarySearch").addEventListener("input", renderLibrary);
  $("#newProjectButton").addEventListener("click", newProject);
  $("#newProjectModalButton").addEventListener("click", newProject);
  $("#projectsButton").addEventListener("click", () => { renderProjectList(); openModal("#projectModal"); });
  $("#exportRecoveryButton").addEventListener("click", exportProjectRecovery);
  $("#exportButton").addEventListener("click", () => openKit());
  $("#importInput").addEventListener("change", (event) => { const [file] = event.target.files; if (file) importProject(file); event.target.value = ""; });
  $("#undoButton").addEventListener("click", undo);
  $("#redoButton").addEventListener("click", redo);
  $("#zoomOutButton").addEventListener("click", () => setZoom(zoom - .1));
  $("#zoomInButton").addEventListener("click", () => setZoom(zoom + .1));
  $("#fitButton").addEventListener("click", fitBoard);
  $("#boardSettingsButton").addEventListener("click", openBoardSettings);
  $("#mobileLibraryButton").addEventListener("click", () => toggleDrawer("library"));
  $("#mobileInspectorButton").addEventListener("click", () => toggleDrawer("inspector"));
  $("#projectStatus").addEventListener("click", openProjectIssues);
  $("#drawerBackdrop").addEventListener("click", closeDrawers);
  $("#applySettingsButton").addEventListener("click", applyBoardSettings);
  $("#deleteDeviceButton").addEventListener("click", deleteSelectedDevice);
  $$(".view-tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  $$(".modal-close").forEach((button) => button.addEventListener("click", () => closeModal(button)));
  $$(".modal-backdrop").forEach((modal) => modal.addEventListener("mousedown", (event) => { if (event.target === modal) modal.classList.add("hidden"); }));
  $("#projectTitleButton").addEventListener("click", () => { $("#renameProjectInput").value = project.name; openModal("#renameModal"); setTimeout(() => $("#renameProjectInput").select(), 0); });
  $("#renameProjectSaveButton").addEventListener("click", () => {
    const name = $("#renameProjectInput").value.trim();
    if (!name) return;
    snapshot(); project.name = name; persistProject(); $("#renameModal").classList.add("hidden"); renderProjectChrome(); toast("Проєкт перейменовано");
  });
  $("#renameProjectInput").addEventListener("keydown", (event) => { if (event.key === "Enter") $("#renameProjectSaveButton").click(); });
  $("#csvButton").addEventListener("click", exportCsv);
  $("#printDiagramButton").addEventListener("click", () => window.print());
  $("#printBomButton").addEventListener("click", () => window.print());
  $("#documentationButton").addEventListener("click", () => openKit());
  $("#canvasHint button").addEventListener("click", () => { $("#canvasHint").classList.add("hidden"); PStore.writeString(browserStorage, HINT_KEY, "1"); });
  if (PStore.readString(browserStorage, HINT_KEY)) $("#canvasHint").classList.add("hidden");
  bindInspectorInputs();

  document.addEventListener("keydown", (event) => {
    const editing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    const modal = $(".modal-backdrop:not(.hidden)");
    if (modal) { if (event.key === "Escape") { event.preventDefault(); $$(".modal-backdrop").forEach((node) => node.classList.add("hidden")); } return; }
    if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); cancelFloorInteractions(); event.shiftKey ? redo() : undo(); }
    if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); cancelFloorInteractions(); redo(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (persistProject({ immediate: true })) toast("Проєкт збережено локально"); }
    if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
      if ($("#floorView").classList.contains("active")) { event.preventDefault(); cancelFloorInteractions(); if (floorGeometryEditing) deleteFloorGeometrySelection(); else if (floorSelectedId) deleteFloorPoint(); return; }
      if (!$("#boardView").classList.contains("active")) return;
      event.preventDefault();
      if (selectedWireId) deleteWiringEntity("wire", selectedWireId);
      else if (selectedBusbarId) deleteWiringEntity("busbar", selectedBusbarId);
      else if (selectedCombId) deleteWiringEntity("comb", selectedCombId);
      else deleteSelectedDevice();
    }
    if (!editing && event.key === "/" && $("#boardView").classList.contains("active")) {
      event.preventDefault();
      if (wiringMode) setWiringMode(false);
      if (window.innerWidth <= 900 && !$(".library-panel").classList.contains("drawer-open")) toggleDrawer("library");
      $("#librarySearch").focus();
    }
    if (event.key === "Escape") { cancelFloorInteractions(); cancelRouteDrag(); $$(".modal-backdrop").forEach((modal) => modal.classList.add("hidden")); closeDrawers(); selectedDeviceId = null; resetWiringSelection(); renderBoard(); renderInspector(); renderWiringPalette(); }
  });

  let boardViewportFrame = null;
  const resizeBoard = () => {
    if (boardViewportFrame !== null) return;
    boardViewportFrame = requestAnimationFrame(() => {
      boardViewportFrame = null;
      if (!$("#boardView").classList.contains("active")) return;
      if (boardAutoFit) fitBoard(); else updateZoomLayout();
      scheduleWiringPaint();
    });
  };
  window.addEventListener("resize", resizeBoard);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(resizeBoard);
    observer.observe($("#canvas")); observer.observe($("#boardShell"));
  }
  window.addEventListener("pagehide", () => persistProject({ immediate: true }));
}

function toggleDrawer(name) {
  const panel = name === "library" ? $(".library-panel") : $(".inspector-panel");
  const other = name === "library" ? $(".inspector-panel") : $(".library-panel");
  const opening = !panel.classList.contains("drawer-open");
  other.classList.remove("drawer-open");
  panel.classList.toggle("drawer-open", opening);
  $("#drawerBackdrop").classList.toggle("hidden", !opening);
}

function closeDrawers() {
  $(".library-panel").classList.remove("drawer-open");
  $(".inspector-panel").classList.remove("drawer-open");
  $("#drawerBackdrop").classList.add("hidden");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// A language switch transfers the current session locally, including undo history.
const languageSession = UILanguage?.consumeTransfer();
if (languageSession?.version === 1 && languageSession.project && Array.isArray(languageSession.projects)) {
  try {
    const restored = E.normalizeProject(languageSession.project);
    projects = languageSession.projects.map((item) => E.normalizeProject(item));
    project = restored;
    undoStack = (languageSession.undo || []).slice(-50).map((item) => E.normalizeProject(item));
    redoStack = (languageSession.redo || []).slice(-50).map((item) => E.normalizeProject(item));
    selectedDeviceId = languageSession.selectedDeviceId || null;
    floorSelectedId = languageSession.floorSelectedId || null;
    floorRoomId = languageSession.floorRoomId || floorRoomId;
    floorSidebarTab = languageSession.floorSidebarTab || floorSidebarTab;
  } catch { /* Existing project storage remains the recovery path for invalid transfer data. */ }
}
UILanguage?.prepareChange(() => {
  if (floorPencilVertices.length || floorGeometryDrag || floorDrag || $("#generationModal:not(.hidden)")) { toast("Завершіть або скасуйте поточне малювання чи попередній перегляд перед зміною мови.", "error"); return false; }
  persistProject({ immediate: true });
  const state = { version: 1, project: clone(project), projects: projects.map((item) => item.id === project.id ? clone(project) : item), undo: undoStack, redo: redoStack, selectedDeviceId, floorSelectedId, floorRoomId, floorSidebarTab, view: $(".view-tab.active")?.dataset.view || $("[data-view].active")?.dataset.view || "board" };
  if (!UILanguage.storeTransfer(state)) { toast("Не вдалося зберегти сеанс для зміни мови. Експортуйте проєкт у JSON і спробуйте знову.", "error"); return false; }
  return true;
});

bindEvents();
initWiring();
initControls();
initMechanical();
initSchematic();
initFloorPlan();
initFloorGeometry();
initFloorUX();
initFloorPencil();
initFloorForms();
initFloorCircuits();
initProjectIssues();
initCableReports();
initProjectGeneration();
initKit(); initWorkspaceTools();
PanelUIHelp.install(document);
renderAll();
initTemplates();
if (languageSession?.view && ["board", "floor", "diagram", "bom", "wires", "design"].includes(languageSession.view)) switchView(languageSession.view);
registerServiceWorker();
if (projectStorageState.error) { setProjectSaveStatus("Зміни в пам’яті · експортуйте JSON", "error"); toast("Локальне сховище недоступне. Можна працювати й експортувати JSON.", "error"); }
else if (projectStorageState.rejected.length || PStore.readString(browserStorage, PStore.RECOVERY_KEY)) toast("Є збережені дані для відновлення. Відкрийте «Мої проєкти».", "error");
setTimeout(fitBoard, 60);
