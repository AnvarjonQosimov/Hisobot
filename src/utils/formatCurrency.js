export const convertCurrencyAmount = (amount, currency, targetCurrency, dollarRate) => {
  const value = Number(amount) || 0;
  if (currency === targetCurrency) return value;
  if (targetCurrency === "sum") return value * dollarRate;
  return dollarRate > 0 ? value / dollarRate : 0;
};

export const formatMoneyAmount = (
  amount,
  currency,
  displayMode,
  dollarRate,
  somLabel,
) => {
  const value = displayMode === "combined"
    ? Number(amount) || 0
    : convertCurrencyAmount(amount, currency, displayMode, dollarRate);
  const shownCurrency = displayMode === "combined" ? currency : displayMode;
  return `${value.toLocaleString()} ${shownCurrency === "sum" ? somLabel : "$"}`;
};

export const formatMoneyTotals = (
  sumAmount,
  dollarAmount,
  displayMode,
  dollarRate,
  somLabel,
) => {
  if (displayMode === "combined") {
    return `${(Number(sumAmount) || 0).toLocaleString()} ${somLabel} / ${(Number(dollarAmount) || 0).toLocaleString()} $`;
  }

  const total = displayMode === "sum"
    ? (Number(sumAmount) || 0) + (Number(dollarAmount) || 0) * dollarRate
    : (Number(dollarAmount) || 0) +
      (dollarRate > 0 ? (Number(sumAmount) || 0) / dollarRate : 0);
  return `${total.toLocaleString()} ${displayMode === "sum" ? somLabel : "$"}`;
};
