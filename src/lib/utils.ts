const CURRENCY_LABELS: Record<string, string> = {
  TRY: "TL",
  USD: "USD",
  AZN: "AZN",
  EUR: "EUR",
};

export function formatMoney(amount: number | string, currency: string = "AZN") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${CURRENCY_LABELS[currency] ?? currency}`;
}

export function formatDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
