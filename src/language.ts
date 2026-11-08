export type Language = "zh" | "en";

export function readLanguage(value: unknown): Language {
  return value === "en" ? "en" : "zh";
}

export function copy(language: Language, chinese: string, english: string): string {
  return language === "en" ? english : chinese;
}
