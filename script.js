const FALLBACK_MONEY = {
  currency: "BRL",
  country: "BR",
  locale: "pt-BR",
  rate: 4.9773,
};
const BASE_USD = 30;
const REWARDS = [8.5, 6, 9.5, 7, 5.5, 10];
const MONEY_CACHE_TTL = 6 * 60 * 60 * 1000;
const COUNTRY_CURRENCY = {
  AD: "EUR",
  AE: "AED",
  AF: "AFN",
  AG: "XCD",
  AI: "XCD",
  AL: "ALL",
  AM: "AMD",
  AO: "AOA",
  AR: "ARS",
  AT: "EUR",
  AU: "AUD",
  AW: "AWG",
  AZ: "AZN",
  BA: "BAM",
  BB: "BBD",
  BD: "BDT",
  BE: "EUR",
  BF: "XOF",
  BG: "BGN",
  BH: "BHD",
  BI: "BIF",
  BJ: "XOF",
  BM: "BMD",
  BN: "BND",
  BO: "BOB",
  BR: "BRL",
  BS: "BSD",
  BT: "BTN",
  BW: "BWP",
  BY: "BYN",
  BZ: "BZD",
  CA: "CAD",
  CD: "CDF",
  CH: "CHF",
  CL: "CLP",
  CN: "CNY",
  CO: "COP",
  CR: "CRC",
  CU: "CUP",
  CV: "CVE",
  CY: "EUR",
  CZ: "CZK",
  DE: "EUR",
  DK: "DKK",
  DO: "DOP",
  DZ: "DZD",
  EC: "USD",
  EE: "EUR",
  EG: "EGP",
  ES: "EUR",
  FI: "EUR",
  FJ: "FJD",
  FR: "EUR",
  GB: "GBP",
  GE: "GEL",
  GH: "GHS",
  GR: "EUR",
  GT: "GTQ",
  HK: "HKD",
  HN: "HNL",
  HR: "EUR",
  HT: "HTG",
  HU: "HUF",
  ID: "IDR",
  IE: "EUR",
  IL: "ILS",
  IN: "INR",
  IQ: "IQD",
  IS: "ISK",
  IT: "EUR",
  JM: "JMD",
  JP: "JPY",
  KE: "KES",
  KH: "KHR",
  KR: "KRW",
  KW: "KWD",
  KZ: "KZT",
  LK: "LKR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MA: "MAD",
  MD: "MDL",
  MX: "MXN",
  MY: "MYR",
  NG: "NGN",
  NI: "NIO",
  NL: "EUR",
  NO: "NOK",
  NP: "NPR",
  NZ: "NZD",
  PA: "PAB",
  PE: "PEN",
  PH: "PHP",
  PK: "PKR",
  PL: "PLN",
  PT: "EUR",
  PY: "PYG",
  QA: "QAR",
  RO: "RON",
  RS: "RSD",
  RU: "RUB",
  SA: "SAR",
  SE: "SEK",
  SG: "SGD",
  SI: "EUR",
  SK: "EUR",
  TH: "THB",
  TN: "TND",
  TR: "TRY",
  TW: "TWD",
  UA: "UAH",
  US: "USD",
  UY: "UYU",
  VE: "VES",
  VN: "VND",
  ZA: "ZAR",
};

const GEO_APIS = [
  {
    url: "https://ipwho.is/",
    parse: (data) => ({
      country: data?.country_code,
      currency: data?.currency?.code,
      locale: undefined,
    }),
  },
  {
    url: "https://ipapi.co/json/",
    parse: (data) => ({
      country: data?.country_code,
      currency: data?.currency,
      locale: data?.languages?.split(",")?.[0],
    }),
  },
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    parse: (data) => ({
      country: data?.country_code,
      currency: COUNTRY_CURRENCY[data?.country_code],
      locale: undefined,
    }),
  },
];

const RATE_APIS = [
  {
    url: () => "https://open.er-api.com/v6/latest/USD",
    parse: (data, currency) => data?.rates?.[currency],
  },
  {
    url: (currency) => `https://api.frankfurter.app/latest?from=USD&to=${currency}`,
    parse: (data, currency) => data?.rates?.[currency],
  },
  {
    url: () => "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    parse: (data, currency) => data?.usd?.[currency.toLowerCase()],
  },
  {
    url: () => "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
    parse: (data, currency) => data?.usd?.[currency.toLowerCase()],
  },
];

const usd = (value) => `$${Number(value).toFixed(2)}`;

function withTimeout(promise, ms = 2600) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function getCachedMoney() {
  try {
    const cached = JSON.parse(sessionStorage.getItem("localMoney"));

    if (cached?.rate && cached?.currency) {
      return cached;
    }
  } catch {
    // Use fallback below.
  }

  return FALLBACK_MONEY;
}

function saveMoney(money) {
  sessionStorage.setItem(
    "localMoney",
    JSON.stringify({
      ...money,
      cachedAt: Date.now(),
    }),
  );
}

function hasFreshMoneyCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem("localMoney"));

    return Boolean(
      cached?.rate &&
        cached?.currency &&
        cached?.cachedAt &&
        Date.now() - cached.cachedAt < MONEY_CACHE_TTL,
    );
  } catch {
    return false;
  }
}

function countryName(country) {
  if (!country) {
    return "tu país";
  }

  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(country) || "tu país";
  } catch {
    return country;
  }
}

function renderCountry(country) {
  document.querySelectorAll("[data-local-country]").forEach((item) => {
    item.textContent = countryName(country);
  });
}

function normalizeLocale(country, locale) {
  if (locale) {
    return locale;
  }

  if (country) {
    return `${navigator.language.split("-")[0] || "en"}-${country}`;
  }

  return navigator.language || FALLBACK_MONEY.locale;
}

function moneyFormatter(money) {
  try {
    return new Intl.NumberFormat(money.locale, {
      style: "currency",
      currency: money.currency,
      maximumFractionDigits: money.currency === "JPY" || money.currency === "KRW" ? 0 : 2,
    });
  } catch {
    return new Intl.NumberFormat(FALLBACK_MONEY.locale, {
      style: "currency",
      currency: FALLBACK_MONEY.currency,
    });
  }
}

function formatLocal(valueUsd, money = getCachedMoney()) {
  return moneyFormatter(money).format(valueUsd * money.rate);
}

function renderText(selector, value) {
  const item = document.querySelector(selector);

  if (item) {
    item.textContent = value;
  }
}

async function detectCurrency() {
  for (const api of GEO_APIS) {
    try {
      const response = await withTimeout(fetch(api.url, { cache: "no-store" }));
      const geo = api.parse(await response.json());
      const country = geo.country?.toUpperCase();
      const currency = (geo.currency || COUNTRY_CURRENCY[country])?.toUpperCase();

      if (currency && /^[A-Z]{3}$/.test(currency)) {
        return {
          country,
          currency,
          locale: normalizeLocale(country, geo.locale),
        };
      }
    } catch {
      // Try the next geolocation provider.
    }
  }

  return {
    country: "BR",
    currency: FALLBACK_MONEY.currency,
    locale: FALLBACK_MONEY.locale,
  };
}

async function getUsdRate(currency) {
  if (currency === "USD") {
    return 1;
  }

  for (const api of RATE_APIS) {
    try {
      const response = await withTimeout(fetch(api.url(currency), { cache: "force-cache" }));
      const rate = Number(api.parse(await response.json(), currency));

      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
    } catch {
      // Try the next exchange-rate provider.
    }
  }

  return currency === FALLBACK_MONEY.currency ? FALLBACK_MONEY.rate : null;
}

async function refreshMoney() {
  if (hasFreshMoneyCache()) {
    return;
  }

  const detected = await detectCurrency();
  const rate = await getUsdRate(detected.currency);

  if (!rate) {
    saveMoney(FALLBACK_MONEY);
    renderMoney(FALLBACK_MONEY);
    renderCountry(FALLBACK_MONEY.country);
    return;
  }

  const money = {
    country: detected.country,
    currency: detected.currency,
    locale: detected.locale,
    rate,
  };

  saveMoney(money);
  renderMoney(money);
  renderCountry(money.country);
}

function renderMoney(money = getCachedMoney()) {
  const step = Number(document.body.dataset.step || 0);
  const reward = Number(document.body.dataset.rewardUsd || 0);
  const earnedBefore = REWARDS.slice(0, Math.max(step - 1, 0)).reduce(
    (total, value) => total + value,
    0,
  );
  const balance = BASE_USD + earnedBefore;
  const earned = REWARDS.reduce((total, value) => total + value, 0);
  const total = BASE_USD + earned;

  renderText('[data-money="balance-brl"]', formatLocal(balance, money));
  renderText('[data-money="balance-usd"]', `(${usd(balance)})`);
  renderText('[data-money="reward-brl"]', formatLocal(reward, money));
  renderText('[data-money="reward-usd"]', `(${usd(reward)})`);
  renderText('[data-money="modal-balance-brl"]', formatLocal(balance + reward, money));
  renderText('[data-money="modal-balance-usd"]', `(${usd(balance + reward)})`);
  renderText('[data-money="modal-reward-brl"]', formatLocal(reward, money));
  renderText('[data-money="modal-reward-usd"]', `(${usd(reward)})`);
  renderText('[data-money="summary-total-brl"]', formatLocal(total, money));
  renderText('[data-money="summary-total-usd"]', `(${usd(total)})`);
  renderText('[data-money="summary-main-brl"]', formatLocal(total, money));
  renderText('[data-money="summary-main-usd"]', `≈ ${usd(total)} USD`);
  renderText('[data-money="summary-start-brl"]', formatLocal(BASE_USD, money));
  renderText('[data-money="summary-start-usd"]', `(${usd(BASE_USD)})`);
  renderText('[data-money="summary-earned-brl"]', `+${formatLocal(earned, money)}`);
  renderText('[data-money="summary-earned-usd"]', `(${usd(earned)})`);
  renderText('[data-money="summary-box-total-brl"]', formatLocal(total, money));
  renderText('[data-money="summary-box-total-usd"]', usd(total));

  document.querySelectorAll("[data-summary-card]").forEach((card) => {
    const index = Number(card.dataset.summaryCard) - 1;
    const reward = REWARDS[index];
    const rewardNode = card.querySelector("strong");

    if (rewardNode) {
      rewardNode.textContent = `+${formatLocal(reward, money)} (${usd(reward)})`;
    }
  });
}

function setupLookPage() {
  const modal = document.querySelector("#reward-modal");
  const audio = document.querySelector("#cash-sound");
  const next = document.body.dataset.next;
  const step = document.body.dataset.step;

  document.querySelectorAll(".answer").forEach((button) => {
    button.addEventListener("click", () => {
      sessionStorage.setItem(
        `look${step}`,
        JSON.stringify({
          emoji: button.dataset.emoji,
          text: button.dataset.text,
        }),
      );

      document.querySelectorAll(".answer").forEach((item) => {
        item.disabled = true;
      });

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }

      modal.hidden = false;
      document.body.classList.add("modal-open");
    });
  });

  document.querySelectorAll("#modal-action, #modal-close").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = next;
    });
  });
}

function setupSummaryPage() {
  document.querySelectorAll("[data-summary-card]").forEach((card) => {
    const step = card.dataset.summaryCard;
    let saved;

    try {
      saved = JSON.parse(sessionStorage.getItem(`look${step}`) || "null");
    } catch {
      saved = null;
    }

    if (!saved) {
      return;
    }

    card.querySelector(`[data-summary-emoji="${step}"]`).textContent = saved.emoji;
    card.querySelector(`[data-summary-text="${step}"]`).textContent = saved.text;
  });
}

function setupWatchingCounter() {
  const count = document.querySelector("#watching-count");

  if (!count) {
    return;
  }

  let current = Number(sessionStorage.getItem("watchingCount")) || 534;
  count.textContent = current;

  function tick() {
    current += Math.floor(Math.random() * 3) + 1;
    sessionStorage.setItem("watchingCount", String(current));
    count.textContent = current;
    setTimeout(tick, Math.floor(Math.random() * 2600) + 2200);
  }

  setTimeout(tick, 1800);
}

function setupDelayedReveal() {
  const items = Array.from(document.querySelectorAll("[data-delay-reveal]"));

  if (!items.length) {
    return;
  }

  const timers = new Map();

  function clearRevealTimers() {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  function showDelayedItems() {
    clearRevealTimers();
    items.forEach((item) => {
      item.hidden = false;
    });
  }

  function startDelayedItems() {
    clearRevealTimers();
    items.forEach((item) => {
      item.hidden = true;
      const delay = Number(item.dataset.delayReveal);

      if (!Number.isFinite(delay) || delay <= 0) {
        item.hidden = false;
        return;
      }

      timers.set(
        item,
        setTimeout(() => {
          item.hidden = false;
          timers.delete(item);
        }, delay),
      );
    });
  }

  startDelayedItems();

  window.vslDelay = {
    enable: startDelayedItems,
    disable: showDelayedItems,
  };
}

const runWhenIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 900));
const needsMoney = document.querySelector("[data-money]");
const needsCountry = document.querySelector("[data-local-country]");

if (needsMoney || needsCountry) {
  const cachedMoney = getCachedMoney();

  renderMoney(cachedMoney);
  renderCountry(cachedMoney.country);
  runWhenIdle(refreshMoney);
}

setupWatchingCounter();
setupDelayedReveal();

if (document.body.dataset.page === "look") {
  setupLookPage();
}

if (document.body.dataset.page === "summary") {
  setupSummaryPage();
}
