import { AudienceData, AgeGenderData, CityData, CountryData, AudienceMetrics } from "@/types/marketing";

// Midpoints for age range calculation
const AGE_MIDPOINTS: Record<string, number> = {
  "18-24": 21,
  "25-34": 29.5,
  "35-44": 39.5,
  "45-54": 49.5,
  "55-64": 59.5,
  "65+": 70,
};

/**
 * Normalize CSV text from various encodings (UTF-16, UTF-8 with BOM, etc.)
 */
function normalizeCSVText(text: string): string {
  let normalized = text;
  
  // Remove null bytes (UTF-16 artifact)
  normalized = normalized.replace(/\x00/g, '');
  
  // Remove ALL possible BOM characters at the start
  normalized = normalized.replace(/^[\uFEFF\uFFFE]+/, '');
  
  // Remove sep= directive line with various formats (Excel/Instagram export artifact)
  // Can be: sep=, "sep=", 'sep=', sep=; etc.
  normalized = normalized.replace(/^["']?sep=.?["']?\s*[\r\n]+/i, '');
  
  // Split into lines and filter out empty/invalid lines
  const lines = normalized.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    // Remove empty lines, lines with only quotes, or lines with only separators
    return trimmed.length > 0 && 
           trimmed !== '""' && 
           trimmed !== "''" && 
           trimmed !== ";" && 
           trimmed !== ",";
  });
  
  return lines.join('\n');
}

/**
 * Parse the multi-section Instagram Audience CSV
 * Format:
 * - Section 1: "Faixa etária e gênero" (Age/Gender table)
 * - Section 2: "Principais cidades" (Cities - 2 rows: names, percentages)
 * - Section 3: "Principais países" (Countries - 2 rows: names, percentages)
 */
export function parseAudienceCSV(csvText: string): AudienceData {
  // Normalize encoding before processing
  const normalizedText = normalizeCSVText(csvText);
  
  // DEBUG: Log parsing information
  console.log("=== AUDIENCE CSV DEBUG ===");
  console.log("Raw text length:", csvText.length);
  console.log("Normalized text length:", normalizedText.length);
  console.log("First 500 chars of normalized:", normalizedText.substring(0, 500));
  
  const lines = normalizedText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  console.log("Total lines found:", lines.length);
  console.log("First 15 lines:", lines.slice(0, 15));
  
  // Find section indices
  let ageGenderStart = -1;
  let citiesStart = -1;
  let countriesStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (lowerLine.includes("faixa etária") || lowerLine.includes("faixa etaria") || (lowerLine.includes("mulheres") && lowerLine.includes("homens"))) {
      ageGenderStart = i;
    } else if (lowerLine.includes("principais cidades") || lowerLine.includes("cidades")) {
      citiesStart = i;
    } else if (lowerLine.includes("principais países") || lowerLine.includes("principais paises") || lowerLine.includes("países") || lowerLine.includes("paises")) {
      countriesStart = i;
    }
  }
  
  // Parse age/gender section
  const ageGenderData = parseAgeGenderSection(lines, ageGenderStart, citiesStart);
  
  // Parse cities section
  const citiesData = parseCitiesSection(lines, citiesStart, countriesStart);
  
  // Parse countries section
  const countriesData = parseCountriesSection(lines, countriesStart);
  
  // Calculate metrics
  const metrics = calculateAudienceMetrics(ageGenderData, citiesData, countriesData);
  
  return {
    dataReferencia: new Date().toISOString().split('T')[0],
    faixaEtariaGenero: ageGenderData,
    cidades: citiesData,
    paises: countriesData,
    metricas: metrics,
  };
}

function parseAgeGenderSection(lines: string[], start: number, end: number): AgeGenderData[] {
  const result: AgeGenderData[] = [];
  const endIndex = end > start ? end : lines.length;
  
  for (let i = start; i < endIndex; i++) {
    const line = lines[i];
    // Look for lines that start with age range pattern (e.g., "18-24", "65+")
    const match = line.match(/^["']?(\d{2}-\d{2}|\d{2}\+)["']?[,;]?\s*([\d.,]+)[,;]?\s*([\d.,]+)/);
    if (match) {
      const faixa = match[1];
      const mulheres = parseNumber(match[2]);
      const homens = parseNumber(match[3]);
      result.push({
        faixa,
        mulheres,
        homens,
        total: mulheres + homens,
      });
    }
  }
  
  return result;
}

function parseCitiesSection(lines: string[], start: number, end: number): CityData[] {
  const result: CityData[] = [];
  if (start < 0) return result;
  
  const endIndex = end > start ? end : lines.length;
  
  // Look for two consecutive lines: city names and percentages
  for (let i = start; i < endIndex - 1; i++) {
    const line1Parts = parseCSVLine(lines[i]);
    const line2Parts = parseCSVLine(lines[i + 1]);
    
    // Check if line2 looks like percentages (contains numbers with . or ,)
    const hasNumbers = line2Parts.some(p => /[\d.,]+/.test(p) && !p.includes("-"));
    const line1HasCities = line1Parts.some(p => /[A-Za-zÀ-ÿ]/.test(p) && p.includes(","));
    
    if (line1HasCities && hasNumbers) {
      // Match cities with percentages
      const cities = line1Parts.filter(p => p.length > 0 && /[A-Za-zÀ-ÿ]/.test(p));
      const percentages = line2Parts.filter(p => /[\d.,]+/.test(p)).map(parseNumber);
      
      for (let j = 0; j < Math.min(cities.length, percentages.length); j++) {
        if (cities[j] && percentages[j] > 0) {
          result.push({
            cidade: cities[j].trim(),
            percentual: percentages[j],
          });
        }
      }
      break;
    }
  }
  
  return result.sort((a, b) => b.percentual - a.percentual);
}

function parseCountriesSection(lines: string[], start: number): CountryData[] {
  const result: CountryData[] = [];
  if (start < 0) return result;
  
  // Look for two consecutive lines: country names and percentages
  for (let i = start; i < lines.length - 1; i++) {
    const line1Parts = parseCSVLine(lines[i]);
    const line2Parts = parseCSVLine(lines[i + 1]);
    
    // Check if line2 looks like percentages
    const hasNumbers = line2Parts.some(p => /[\d.,]+/.test(p));
    const line1HasCountries = line1Parts.some(p => /[A-Za-zÀ-ÿ]/.test(p) && p.length > 2);
    
    if (line1HasCountries && hasNumbers) {
      const countries = line1Parts.filter(p => p.length > 0 && /[A-Za-zÀ-ÿ]/.test(p) && !p.toLowerCase().includes("país"));
      const percentages = line2Parts.filter(p => /[\d.,]+/.test(p)).map(parseNumber);
      
      for (let j = 0; j < Math.min(countries.length, percentages.length); j++) {
        if (countries[j] && percentages[j] > 0) {
          result.push({
            pais: countries[j].trim(),
            percentual: percentages[j],
          });
        }
      }
      break;
    }
  }
  
  return result.sort((a, b) => b.percentual - a.percentual);
}

function parseCSVLine(line: string): string[] {
  // Handle both comma and semicolon separators
  const separator = line.includes(";") ? ";" : ",";
  return line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ""));
}

function parseNumber(value: string): number {
  if (!value) return 0;
  // Handle Brazilian format (1.234,56) and American format (1,234.56)
  const cleaned = value.trim().replace(/[^\d.,\-]/g, "");
  
  // Detect format
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  
  if (lastComma > lastDot) {
    // Brazilian format
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  } else {
    // American format or simple number
    return parseFloat(cleaned.replace(/,/g, "")) || 0;
  }
}

/**
 * Calculate all audience metrics based on the formulas provided
 */
export function calculateAudienceMetrics(
  ageGender: AgeGenderData[],
  cities: CityData[],
  countries: CountryData[]
): AudienceMetrics {
  // Gender metrics
  const totalMulheres = ageGender.reduce((sum, item) => sum + item.mulheres, 0);
  const totalHomens = ageGender.reduce((sum, item) => sum + item.homens, 0);
  const genderSkew = totalHomens > 0 ? totalMulheres / totalHomens : 0;
  
  // Age metrics
  const faixaDominante = ageGender.reduce((max, item) => 
    item.total > (max?.total || 0) ? item : max, ageGender[0])?.faixa || "";
  const faixaDominanteTotal = ageGender.find(a => a.faixa === faixaDominante)?.total || 0;
  const concentracaoEtaria = faixaDominanteTotal / 100;
  
  // Calculate approximate average age
  const idadeMediaAproximada = ageGender.reduce((sum, item) => {
    const midpoint = AGE_MIDPOINTS[item.faixa] || 0;
    return sum + (item.total * midpoint);
  }, 0) / 100;
  
  // City metrics
  const cidadeDominante = cities[0]?.cidade || "";
  const top3Cidades = cities.slice(0, 3).reduce((sum, c) => sum + c.percentual, 0);
  const top5Total = cities.slice(0, 5).reduce((sum, c) => sum + c.percentual, 0);
  const dispersaoUrbana = 1 - (top5Total / 100);
  
  // Country metrics
  const brasilData = countries.find(c => c.pais.toLowerCase() === "brasil");
  const dependenciaBrasil = brasilData?.percentual || 0;
  const publicoInternacional = 100 - dependenciaBrasil;
  
  return {
    totalMulheres,
    totalHomens,
    genderSkew,
    faixaDominante,
    concentracaoEtaria,
    idadeMediaAproximada,
    cidadeDominante,
    top3Cidades,
    dispersaoUrbana,
    dependenciaBrasil,
    publicoInternacional,
  };
}

/**
 * Validate that the parsed data has all required sections
 */
export function validateAudienceData(data: AudienceData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.faixaEtariaGenero.length === 0) {
    errors.push("Dados de faixa etária e gênero não encontrados");
  }
  
  if (data.cidades.length === 0) {
    errors.push("Dados de cidades não encontrados");
  }
  
  if (data.paises.length === 0) {
    errors.push("Dados de países não encontrados");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
