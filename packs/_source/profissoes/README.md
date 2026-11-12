# Produtos físicos de profissões

Este diretório contém 86 produtos físicos e sete pastas para o compêndio Immortals-system.equipamentos.

A pasta Profissões contém Pílulas, Inscrições, Talismãs, Matrizes, Ferramentas e Tesouros. Inclui ferramentas, livros e quatro tipos genéricos de tesouros.

Os arquivos JSON mantêm os identificadores nativos e as chaves !items! ou !folders!. São fontes para revisão e empacotamento separado; gerar estas fontes não escreve em bancos de dados.

Regerar: node utils/profession-products-content.mjs. A publicação no Equipamentos usa as APIs nativas e adiciona somente documentos ausentes, preservando edições.
