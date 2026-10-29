import municipiosSp from './data/municipios-sp.json';

/** A prospecção só cobre São Paulo: a UF fica fixa aqui e em nenhum outro lugar. */
export const UF_PADRAO = 'SP';

/** Sem acento e sem caixa: "sao jose" acha "São José dos Campos". */
export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const indice = (municipiosSp as string[]).map((nome) => ({ nome, chave: normalizar(nome) }));

/** Nome oficial do IBGE para o que foi digitado (ignora acento e caixa); null se não for município de SP. */
export function municipioOficial(texto: string): string | null {
  const chave = normalizar(texto);
  if (!chave) return null;
  return indice.find((m) => m.chave === chave)?.nome ?? null;
}

/** Até `limite` sugestões: primeiro as que começam com o termo, depois as que o contêm no meio. */
export function sugerirMunicipios(texto: string, limite = 8): string[] {
  const termo = normalizar(texto);
  if (!termo) return [];
  const comeca: string[] = [];
  const contem: string[] = [];
  for (const m of indice) {
    if (m.chave.startsWith(termo)) comeca.push(m.nome);
    else if (m.chave.includes(termo)) contem.push(m.nome);
    if (comeca.length >= limite) break;
  }
  return [...comeca, ...contem].slice(0, limite);
}
