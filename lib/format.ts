export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function eta(n: number): string {
  return `${n} min`;
}

export function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}
