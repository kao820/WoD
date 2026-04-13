export function capitalize(s: string): string {
  return s.substring(0, 1).toUpperCase() + s.substring(1)
}

export function stripOrderingPrefix(s: string): string {
  return s.replace(/^(?:[0-9]+|[A-Za-zА-Яа-я]{2,}[0-9]+)\s*[-._]?\s*/, "")
}

export function classNames(
  displayClass?: "mobile-only" | "desktop-only",
  ...classes: string[]
): string {
  if (displayClass) {
    classes.push(displayClass)
  }
  return classes.join(" ")
}
