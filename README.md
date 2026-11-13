# Immortals Legacy

Sistema de RPG de cultivo e artes marciais para o [Foundry Virtual Tabletop](https://foundryvtt.com), com Qi, Corpo, Alma e calendário de campanha.

## Instalação

No Foundry VTT, abra **Sistemas → Instalar Sistema** e cole a URL do manifesto:

```text
https://github.com/kaavitorr/Immortals-system/releases/latest/download/system.json
```

Também é possível baixar `immortals-system.zip` na [página de releases](https://github.com/kaavitorr/Immortals-system/releases) e extrair o conteúdo em `Data/systems/Immortals-system/`.

## Funcionalidades

- Fichas de personagens e PdNs com cultivo de Qi, Corpo e Alma.
- Criação de personagem e árvores de habilidades.
- Calendário, técnicas e manuais de cultivo e combate.
- Compêndios de regras, equipamentos, materiais, taxonomias, arquétipos e habilidades.

## Compatibilidade

- Foundry VTT 14.367 ou posterior, verificado na versão 14.
- Versão atual: **1.2.4**.

## Desenvolvimento

Requisitos: Node.js 24 e Python 3 para empacotar releases.

```bash
npm ci
npm test
npm run build:css
npm run dist
```

O código fica em `module/`, os templates em `templates/` e os estilos em `less/`. Os compêndios nativos em `packs/` acompanham a versão atual editada no Foundry e são incluídos diretamente no ZIP. As fontes de trabalho ficam em `packs/_source/`; antes de recompilar um compêndio, exporte suas edições do Foundry para essas fontes.

## Publicação

Atualize a versão e o link `download` em `system.json`, faça o commit e envie uma tag correspondente, como `v1.2.4`. O GitHub Actions testa o projeto e publica `system.json` e `immortals-system.zip` na release.

## Licença e créditos

O código é baseado no sistema dnd5e para Foundry VTT, licenciado sob [MIT](https://opensource.org/licenses/MIT). O conteúdo derivado da SRD 5.1 segue a licença [CC BY 4.0](https://www.dndbeyond.com/attachments/39j2li89/SRD5.1-CCBY4.0License.pdf).

## Autor

**Noroi** — [Discord](https://discord.gg/hld20)
