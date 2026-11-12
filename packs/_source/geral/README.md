# Geral

O catálogo público contém apenas Antecedentes: 23 origens e uma subpasta com suas características vinculadas (48 documentos contando as duas pastas). Cultivador, recursos, progressão, reinos, Corpo, Alma e habilidades elementais são internos e integrados à ficha.

A fábrica central é `module/systems/cultivator-content.mjs`. Os antecedentes são definidos em `wuxia-backgrounds-data.mjs` e preparados por `wuxia-backgrounds.mjs`. Gere os JSON com `node utils/cultivator-content.mjs`.

Ao carregar o mundo, o mestre ativo inclui antecedentes ausentes e remove somente os IDs antigos conhecidos das regras integradas pela API nativa. Cópias e conteúdo personalizado são preservados e movidos antes da remoção de suas pastas. O bloqueio original do pack é restaurado. Não substitua arquivos de banco de dados abertos.

As características de antecedente usam a perícia Sorte. Usos por descanso são nativos; limites semanais e mensais exigem reposição manual conforme o calendário. O criador aplica uma vez os PO e as condições iniciais explícitas. Os equipamentos e manuais permanecem descritos para escolha e configuração, sem estatísticas inventadas.

A tabela numérica de absorção dos manuais ainda será fornecida pelo autor.
