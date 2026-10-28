import { z } from 'zod';

const quantidade = z
  .number({ error: 'Informe um número' })
  .int('Use número inteiro')
  .min(0, 'Não pode ser negativo');

/** Dimensionamento do ambiente: usado na nova validação e no LTO do prospect. */
export const levantamentoSchema = z
  .object({
    qtdServidores: quantidade,
    qtdPdvs: quantidade,
    qtdRetaguardas: quantidade,
    consultaPreco: z.boolean(),
    qtdConsultaPreco: z.union([z.number(), z.nan()]),
    outros: z.string().optional(),
  })
  // Só valida a quantidade se o campo estiver visível
  .superRefine((d, ctx) => {
    if (!d.consultaPreco) return;
    const r = quantidade.safeParse(d.qtdConsultaPreco);
    if (!r.success) {
      ctx.addIssue({ code: 'custom', path: ['qtdConsultaPreco'], message: r.error.issues[0].message });
    }
  });

export type LevantamentoForm = z.infer<typeof levantamentoSchema>;

export const levantamentoPadrao: LevantamentoForm = {
  qtdServidores: 1,
  qtdPdvs: 0,
  qtdRetaguardas: 0,
  consultaPreco: false,
  qtdConsultaPreco: 0,
};

/** Converte o formulário no corpo da API (quantidade de consulta de preço só vale se marcada). */
export function dadosLevantamento(d: LevantamentoForm) {
  return {
    qtdServidores: d.qtdServidores,
    qtdPdvs: d.qtdPdvs,
    qtdRetaguardas: d.qtdRetaguardas,
    consultaPreco: d.consultaPreco,
    qtdConsultaPreco: d.consultaPreco ? d.qtdConsultaPreco : 0,
    outros: d.outros,
  };
}
