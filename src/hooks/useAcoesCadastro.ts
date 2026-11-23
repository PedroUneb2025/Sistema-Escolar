import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Operacoes = Record<string, unknown>;
type DocumentoApi = { paths: Record<string, Operacoes> };

// As versões da API que só oferecem relatórios permitem a consulta dos cadastros.
export function useAcoesCadastro(recurso: 'alunos' | 'professores') {
  const [paths, setPaths] = useState<DocumentoApi['paths']>({});
  useEffect(() => {
    const controller = new AbortController();
    api.get<DocumentoApi>('/openapi.json', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setPaths(data.paths ?? {});
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const modelo = recurso === 'alunos' ? '/alunos/{id_aluno}' : '/professores/{id_professor}';
  const detalhe = paths[modelo];
  return {
    editar: Boolean(detalhe?.get && detalhe.put),
    alterarStatus: Boolean(paths[modelo + '/status']?.patch),
  };
}
