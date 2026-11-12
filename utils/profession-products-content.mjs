import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {professionProductCompendiumDocuments} from "../module/systems/profession-products-content.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const readme = "# Produtos físicos de profissões\n\n"
  + "Este diretório contém 86 produtos físicos e sete pastas para o compêndio Immortals-system.equipamentos.\n\n"
  + "A pasta Profissões contém Pílulas, Inscrições, Talismãs, Matrizes, Ferramentas e Tesouros. "
  + "Inclui ferramentas, livros e quatro tipos genéricos de tesouros.\n\n"
  + "Os arquivos JSON mantêm os identificadores nativos e as chaves !items! ou !folders!. "
  + "São fontes para revisão e empacotamento separado; gerar estas fontes não escreve em bancos de dados.\n\n"
  + "Regerar: node utils/profession-products-content.mjs. "
  + "A publicação no Equipamentos usa as APIs nativas e adiciona somente documentos ausentes, preservando edições.\n";

/** Generate reviewable source files only in packs/_source/profissoes beneath the selected project root. */
export async function writeProfessionProductSources({projectRoot = defaultRoot} = {}) {
  const destination = path.resolve(projectRoot, "packs", "_source", "profissoes");
  const documents = professionProductCompendiumDocuments();
  await fs.mkdir(destination, {recursive: true});
  for (const document of documents) {
    const folder = document.type === "Item";
    const record = {...document, _key: (folder ? "!folders!" : "!items!") + document._id};
    const filename = slug(document.name) + "-" + document._id + ".json";
    await fs.writeFile(path.join(destination, filename), JSON.stringify(record, null, 2) + "\n");
  }
  await fs.writeFile(path.join(destination, "README.md"), readme);
  return {destination, items: documents.filter(document => document.type !== "Item").length,
    folders: documents.filter(document => document.type === "Item").length};
}

if (process.argv[1] && (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)) {
  const result = await writeProfessionProductSources();
  console.log(result.items + " produtos físicos e " + result.folders + " pastas gerados em packs/_source/profissoes.");
}
