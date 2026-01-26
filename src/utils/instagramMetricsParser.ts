/**
 * Parser para arquivos CSV exportados do Instagram/Meta Business Suite
 * 
 * Formato esperado:
 * sep=,
 * "Nome da Métrica"
 * "Data","Primary"
 * "2026-01-16T01:00:00","139"
 */

export type MetricType = 'seguidores' | 'visitas' | 'clicks' | 'interacoes' | 'alcance' | 'visualizacoes';

export interface ParsedMetricData {
  data: string; // YYYY-MM-DD
  metrica: MetricType;
  valor: number;
}

export interface ParsedInstagramFile {
  metricType: MetricType;
  targetTable: 'followers_data' | 'marketing_data';
  records: ParsedMetricData[];
  fileName: string;
}

// Mapeamento de títulos do arquivo para tipo de métrica
const METRIC_TITLE_MAP: Record<string, { type: MetricType; table: 'followers_data' | 'marketing_data' }> = {
  'Seguidores no Instagram': { type: 'seguidores', table: 'followers_data' },
  'Visitas ao perfil do Instagram': { type: 'visitas', table: 'marketing_data' },
  'Cliques no link do Instagram': { type: 'clicks', table: 'marketing_data' },
  'Interações com o conteúdo': { type: 'interacoes', table: 'marketing_data' },
  'Alcance': { type: 'alcance', table: 'marketing_data' },
  'Visualizações': { type: 'visualizacoes', table: 'marketing_data' },
};

/**
 * Detecta se o arquivo está no formato Instagram Export
 */
export function isInstagramFormat(content: string): boolean {
  const lines = content.split('\n').map(l => l.trim());
  // Verifica se a primeira linha é "sep=," ou se a segunda linha é um título de métrica
  if (lines[0]?.startsWith('sep=')) {
    return true;
  }
  // Também verifica se tem aspas no início (formato CSV com aspas)
  if (lines[0]?.startsWith('"') && lines[1]?.startsWith('"Data"')) {
    return true;
  }
  return false;
}

/**
 * Extrai o título da métrica do arquivo
 */
export function extractMetricTitle(content: string): string | null {
  const lines = content.split('\n').map(l => l.trim());
  
  // Pula a linha "sep=," se existir
  let titleLineIndex = 0;
  if (lines[0]?.startsWith('sep=')) {
    titleLineIndex = 1;
  }
  
  const titleLine = lines[titleLineIndex];
  if (!titleLine) return null;
  
  // Remove aspas do título
  return titleLine.replace(/^"/, '').replace(/"$/, '');
}

/**
 * Identifica o tipo de métrica baseado no título do arquivo
 */
export function identifyMetricType(title: string): { type: MetricType; table: 'followers_data' | 'marketing_data' } | null {
  // Busca exata primeiro
  if (METRIC_TITLE_MAP[title]) {
    return METRIC_TITLE_MAP[title];
  }
  
  // Busca parcial (case insensitive)
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('seguidores')) {
    return { type: 'seguidores', table: 'followers_data' };
  }
  if (titleLower.includes('visitas') || titleLower.includes('perfil')) {
    return { type: 'visitas', table: 'marketing_data' };
  }
  if (titleLower.includes('cliques') || titleLower.includes('link')) {
    return { type: 'clicks', table: 'marketing_data' };
  }
  if (titleLower.includes('interaç') || titleLower.includes('interac')) {
    return { type: 'interacoes', table: 'marketing_data' };
  }
  if (titleLower.includes('alcance')) {
    return { type: 'alcance', table: 'marketing_data' };
  }
  if (titleLower.includes('visualiza')) {
    return { type: 'visualizacoes', table: 'marketing_data' };
  }
  
  return null;
}

/**
 * Converte data ISO para formato YYYY-MM-DD
 */
export function parseInstagramDate(isoDate: string): string {
  // Remove aspas se existirem
  const cleanDate = isoDate.replace(/"/g, '');
  
  // Formato: "2026-01-16T01:00:00" -> "2026-01-16"
  const match = cleanDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  
  // Tenta parse como Date
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignora erro
  }
  
  return cleanDate;
}

/**
 * Faz o parse de um arquivo CSV no formato Instagram Export
 */
export function parseInstagramCSV(content: string, fileName: string): ParsedInstagramFile | null {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length < 3) {
    console.warn('Arquivo muito curto para ser um CSV do Instagram');
    return null;
  }
  
  // Identifica onde começam os dados
  let dataStartIndex = 0;
  
  // Pula "sep=,"
  if (lines[0]?.startsWith('sep=')) {
    dataStartIndex = 1;
  }
  
  // Extrai o título da métrica
  const title = lines[dataStartIndex]?.replace(/^"/, '').replace(/"$/, '');
  const metricInfo = identifyMetricType(title || '');
  
  if (!metricInfo) {
    console.warn(`Tipo de métrica não reconhecido: ${title}`);
    return null;
  }
  
  // Pula o título
  dataStartIndex++;
  
  // Pula o header ("Data","Primary")
  if (lines[dataStartIndex]?.toLowerCase().includes('data')) {
    dataStartIndex++;
  }
  
  // Parse dos dados
  const records: ParsedMetricData[] = [];
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Parse CSV simples (considera que os valores estão entre aspas)
    const matches = line.match(/"([^"]+)","([^"]+)"/);
    if (matches) {
      const [, dateStr, valueStr] = matches;
      const data = parseInstagramDate(dateStr);
      const valor = parseInt(valueStr, 10);
      
      if (data && !isNaN(valor)) {
        records.push({
          data,
          metrica: metricInfo.type,
          valor,
        });
      }
    } else {
      // Tenta parse sem aspas
      const parts = line.split(',');
      if (parts.length >= 2) {
        const data = parseInstagramDate(parts[0]);
        const valor = parseInt(parts[1], 10);
        
        if (data && !isNaN(valor)) {
          records.push({
            data,
            metrica: metricInfo.type,
            valor,
          });
        }
      }
    }
  }
  
  if (records.length === 0) {
    console.warn('Nenhum registro válido encontrado no arquivo');
    return null;
  }
  
  return {
    metricType: metricInfo.type,
    targetTable: metricInfo.table,
    records,
    fileName,
  };
}

/**
 * Processa múltiplos arquivos CSV do Instagram
 */
export function parseMultipleInstagramCSVs(
  files: { content: string; fileName: string }[]
): ParsedInstagramFile[] {
  const results: ParsedInstagramFile[] = [];
  
  for (const file of files) {
    const parsed = parseInstagramCSV(file.content, file.fileName);
    if (parsed) {
      results.push(parsed);
    }
  }
  
  return results;
}

/**
 * Agrupa os dados parseados por tabela de destino
 */
export function groupByTargetTable(parsedFiles: ParsedInstagramFile[]): {
  followersData: ParsedMetricData[];
  marketingData: ParsedMetricData[];
} {
  const followersData: ParsedMetricData[] = [];
  const marketingData: ParsedMetricData[] = [];
  
  for (const file of parsedFiles) {
    if (file.targetTable === 'followers_data') {
      followersData.push(...file.records);
    } else {
      marketingData.push(...file.records);
    }
  }
  
  return { followersData, marketingData };
}

/**
 * Converte dados de seguidores para o formato esperado pelo banco
 */
export function convertToFollowersFormat(data: ParsedMetricData[]): Array<{
  data: string;
  total_seguidores: number;
}> {
  return data.map(d => ({
    data: d.data,
    total_seguidores: d.valor,
  }));
}

/**
 * Converte dados de marketing para o formato esperado pelo banco
 */
export function convertToMarketingFormat(data: ParsedMetricData[]): Array<{
  data: string;
  metrica: string;
  valor: number;
}> {
  return data.map(d => ({
    data: d.data,
    metrica: d.metrica,
    valor: d.valor,
  }));
}
