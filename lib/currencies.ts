export const Currencies = [
  { value: "USD", label: "$ Dollar", locale: "en-US" },
  { value: "EUR", label: "€ Euro", locale: "de-DE" },
  // { value: "RSD", label: "RSD Dinar", locale: "sr-SR" },
];

export type Currency = (typeof Currencies)[0];
