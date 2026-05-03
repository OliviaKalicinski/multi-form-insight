/**
 * R34 — Corrige mojibake (UTF-8 lido como Latin-1) em strings.
 *
 * Caso típico: "ó" (UTF-8: 0xC3 0xB3) lido como Latin-1 vira "Ã³"
 * (Ã = 0xC3, ³ = 0xB3). Acontece quando importer de CSV usa encoding
 * errado.
 *
 * Estratégia: re-encoda string como Latin-1 e decoda os bytes como
 * UTF-8. Heurística anti-falso-positivo: só aplica se o resultado
 * tem MENOS ocorrências de 'Ã' que o original.
 *
 * Mesma lógica da função SQL `fix_mojibake` (migration 20260502190000)
 * — pra dupla camada (DB trigger + correção no frontend antes de salvar).
 */
export function fixMojibake(s: unknown): string {
  if (typeof s !== "string" || !s) return (s as string) ?? "";
  if (!s.includes("Ã")) return s;

  try {
    // Encoda cada char como byte Latin-1 (assume code points <= 0xFF)
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code > 0xff) {
        // Tem caractere fora de Latin-1 — não é mojibake puro, abandona
        return s;
      }
      bytes[i] = code;
    }
    const fixed = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    const origCount = (s.match(/Ã/g) || []).length;
    const fixedCount = (fixed.match(/Ã/g) || []).length;

    return fixedCount < origCount ? fixed : s;
  } catch {
    return s;
  }
}
