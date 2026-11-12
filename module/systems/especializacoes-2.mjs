import {qiTalentImageForSource} from "./general-content-art.mjs";
import {qiTalentStableId} from "./qi-talents-activities.mjs";
import { isCultivator, cultivatorProgression } from "./cultivator-rules.mjs";
import Ruleset from "./ruleset.mjs";
import {QI_TALENTS,QI_TALENT_CATEGORIES} from "./qi-talents-data.mjs";
import {qiTalentCompendiumDocuments,qiTalentDocument} from "./qi-talents-content.mjs";
import {qiTalentRequirement,qiTalentBudget,qiTalentPurchaseUpdate} from "./qi-talents-rules.mjs";
import {CULTIVATION_RANKS} from "./cultivation-data.mjs";
import {withElementalActorLock} from "./elemental-runtime.mjs";

/**
 * ── ESPECIALIZAÇÕES 2.0 (Skill Tree) ────────────────────────────────────────
 * Motor de dados da árvore: carrega os feats do compendium
 * "Geral - 2.0" (flags.Immortals-system.especializacao = { categoria, caminho,
 * requisitos[] }), monta o grafo categoria → caminho → habilidades e avalia
 * requisitos contra o ator.
 *
 * Estado adquirido: flags.Immortals-system.especializacoes = [nome, ...]
 * Orçamento de escolhas: estilo.espIniciais + 2×⌊nível/2⌋ + Surto de Potencial
 * (3 no 10º nível, +5 no 15º, +5 no 20º) + concessão do Mestre
 * (system.legacy2.especiaisExtra).
 */

const PACK = "jujutsu-compendium.geral-2-0";

/** Cores por categoria (mesmas das pastas do compendium). */
export const CORES_CATEGORIA = Object.freeze({
  "Habilidades de Qi":"var(--iw-color-accent)","Adaptação Física":"var(--iw-color-bronze)","Imortalidade":"var(--iw-color-bronze-light)",
  "Feitiço Inato": "#8a4fd0",
  "Técnicas de Barreira": "#4f8ad0",
  "Proezas Físicas": "#c05040",
  "Habilidades Especiais": "var(--iw-color-accent-bright)",
  "Energia Reversa": "#40b070",
  "Domínio e Anti-Domínio": "#d04080"
});

/** Ordem fixa das categorias no hexágono (sentido horário, topo primeiro). */
export const ORDEM_CATEGORIAS = Object.freeze([...QI_TALENT_CATEGORIES]);
const ORDEM_LEGADA = Object.freeze([
  "Feitiço Inato",
  "Técnicas de Barreira",
  "Proezas Físicas",
  "Habilidades Especiais",
  "Energia Reversa",
  "Domínio e Anti-Domínio"
]);

/* ── Cache do grafo (recarregado quando o índice muda) ────────────────────── */

let _grafo = null;
let _porNome = null;
let _qiGraphMode = false;
const qiDefinitions=new Map(QI_TALENTS.map(node=>[node.id,node]));
const qiNames=new Map(QI_TALENTS.flatMap(node=>[node.name,...(node.aliases??[])].map(name=>[name,node.name])));
const normalizeChoices=values=>[...new Set((Array.isArray(values)?values:[]).map(name=>qiNames.get(name)??name))];

/**
 * Carrega o grafo de especializações do compendium.
 * @returns {Promise<{categorias: object[], porNome: Map}>}
 *   categorias: [{ nome, cor, caminhos: [{ nome, cor, nos: [no] }] }]
 *   no: { nome, categoria, caminho, requisitos[], uuid, img, descricao }
 */
export async function carregarGrafo() {
  const systemPack=game.packs?.get?.("Immortals-system.geral"),legacyPack=!systemPack?game.packs?.get?.(PACK):null;
  _qiGraphMode=!!systemPack||!legacyPack;
  const live=await (systemPack??legacyPack)?.getDocuments?.()??[];
  const builtins=_qiGraphMode?qiTalentCompendiumDocuments().filter(doc=>doc.type==='feat'):[];
  const identity=doc=>doc.flags?.['Immortals-system']?.talentoQi?.id??doc.name;
  const byName=new Map(builtins.map(doc=>[identity(doc),doc]));
  for(const doc of live){const metadata=doc.flags?.['Immortals-system'];if(_qiGraphMode?!metadata?.talentoQi:!(metadata?.talentoQi??metadata?.especializacao))continue;byName.set(identity(doc),doc);}
  const nos=[];
  for(const doc of byName.values()){
    const esp=doc.flags?.['Immortals-system']?.talentoQi??doc.flags?.['Immortals-system']?.especializacao;if(!esp)continue;
    const canonical=doc.flags?.['Immortals-system']?.talentoQi?qiDefinitions.get(esp.id)?.name??doc.name:doc.name;
    if(canonical!==doc.name)qiNames.set(doc.name,canonical);
    nos.push({nome:canonical,displayName:doc.name,id:esp.id,qiTalent:!!doc.flags?.['Immortals-system']?.talentoQi,categoria:esp.categoria,caminho:esp.caminho??null,caminhos:esp.caminhos??null,
      requisitos:esp.requisitos??[],requirementRules:esp.requirementRules??null,basic:!!esp.basic,
      uuid:doc.uuid??'Compendium.Immortals-system.geral.Item.'+doc._id,img:doc.flags?.['Immortals-system']?.talentoQi?qiTalentImageForSource(esp.id,doc.img):doc.img??'systems/Immortals-system/icons/svg/items/feature.svg',descricao:doc.system?.description?.value??''});
  }
  const overrides=game.settings?.get('Immortals-system','especializacoesReq')??{};
  for(const no of nos)if(Array.isArray(overrides[no.nome])){no.requisitos=overrides[no.nome];no.requirementRules=null;no.requirementsOverridden=true;}
  _porNome=new Map(nos.map(no=>[no.nome,no]));
  const order=_qiGraphMode?ORDEM_CATEGORIAS:ORDEM_LEGADA;
  const categorias=[...new Set([...order,...nos.map(no=>no.categoria)])].filter(nome=>nos.some(no=>no.categoria===nome)).map(nome=>({nome,cor:CORES_CATEGORIA[nome]??'var(--iw-color-accent)',caminhos:[]}));
  for(const no of nos){const category=categorias.find(cat=>cat.nome===no.categoria);if(!category)continue;for(const name of no.caminhos?.length?no.caminhos:[no.caminho]){if(!name)continue;let branch=category.caminhos.find(path=>path.nome===name);if(!branch){branch={nome:name,cor:category.cor,nos:[]};category.caminhos.push(branch);}branch.nos.push(no);}}
  _grafo={categorias,porNome:_porNome,qiTalents:_qiGraphMode};return _grafo;
}

/** Grafo em cache (carrega na primeira chamada). */
export function obterGrafo() {
  return _grafo ?? carregarGrafo();
}

/* ── Estado adquirido ─────────────────────────────────────────────────────── */

/** Nomes das especializações adquiridas pelo ator. */
export function adquiridas(actor) {
  return normalizeChoices(actor?.getFlag?.("Immortals-system", "especializacoes") ?? []).filter(name=>!concedidas(actor).includes(name));
}

import {speciesGrantedTalentNames} from "./species-progression.mjs";

/** Nomes concedidos pelo Mestre — não consomem escolha de especialização. */
export function concedidas(actor) {
  return [...new Set([...normalizeChoices(actor?.getFlag?.("Immortals-system", "especializacoesConcedidas") ?? []),...speciesGrantedTalentNames(actor)])];
}

/** Todas as especializações que o ator possui (normais + concedidas). */
export function possuidas(actor) {
  return [...new Set([...concedidas(actor), ...adquiridas(actor)])];
}

/** O ator possui a especialização? */
export function tem(actor, nome) {
  return possuidas(actor).includes(nome);
}

/** Registra/esquece uma especialização (persistência atômica). */
export async function aprender(actor,nome,{force=false}={}){
  nome=qiNames.get(nome)??nome;
  if(actor?.isOwner===false)throw new Error('Você não tem permissão para editar esta ficha.');
  return withElementalActorLock(actor,'learn-qi:'+nome,async()=>{
    if(actor?.isOwner===false)throw new Error('Você não tem permissão para editar esta ficha.');
    const lista=adquiridas(actor);if(lista.includes(nome)||concedidas(actor).includes(nome))return;
    const no=_porNome?.get(nome);
    if(_qiGraphMode){
      if(!no)throw new Error('Talento de Qi desconhecido.');
      const forced=force&&globalThis.game?.user?.isGM;
      if(!forced&&avaliarNo(actor,no).estado!=='disponivel')throw new Error('Os requisitos deste talento não foram cumpridos.');
      if(!forced&&escolhasDisponiveis(actor)<=0&&!slotRestritoPara(actor,no))throw new Error('Não há escolhas de Talento de Qi disponíveis.');
    }
    await criarItemEspecializacao(actor,nome);
    await actor.setFlag('Immortals-system','especializacoes',[...lista,nome]);
  });
}

export async function esquecer(actor, nome) {
  return withElementalActorLock(actor,'qi-'+"esquecer"+':'+nome,async()=>{
  nome=qiNames.get(nome)??nome;
  if(actor?.isOwner===false)throw Error("Você não tem permissão para editar esta ficha.");
  const lista = adquiridas(actor);
  if ( !lista.includes(nome) ) return;
  await actor.setFlag("Immortals-system", "especializacoes", lista.filter(n => n !== nome));
  await removerItemEspecializacao(actor, nome);

  });
}

/** Concede uma especialização sem gastar escolha (concessão do Mestre). */
export async function conceder(actor, nome) {
  return withElementalActorLock(actor,'qi-'+"conceder"+':'+nome,async()=>{
  nome=qiNames.get(nome)??nome;
  if(_qiGraphMode&&(actor?.isOwner===false||!globalThis.game?.user?.isGM))throw Error("Somente o mestre pode conceder talentos nesta ficha.");
  if ( tem(actor, nome) ) return;
  const lista = concedidas(actor);
  if ( lista.includes(nome) ) return;
  await actor.setFlag("Immortals-system", "especializacoesConcedidas", [...lista, nome]);
  await criarItemEspecializacao(actor, nome);

  });
}

/** Retira uma concessão do Mestre (e o feat espelhado na ficha). */
export async function revogarConcessao(actor, nome) {
  return withElementalActorLock(actor,'qi-'+"revogarConcessao"+':'+nome,async()=>{
  nome=qiNames.get(nome)??nome;
  if(_qiGraphMode&&(actor?.isOwner===false||!globalThis.game?.user?.isGM))throw Error("Somente o mestre pode revogar talentos nesta ficha.");
  const lista = concedidas(actor);
  if ( !lista.includes(nome) ) return;
  await actor.setFlag("Immortals-system", "especializacoesConcedidas", lista.filter(n => n !== nome));
  await removerItemEspecializacao(actor, nome);

  });
}

/**
 * Cria na ficha o feat do compendium referente à especialização aprendida.
 * O item recebe a flag especializacaoAdquirida (identifica o que a árvore
 * concedeu) e featureSection para agrupar na aba Características.
 */
async function criarItemEspecializacao(actor,nome){
  const no=_porNome?.get(nome);if(!no?.uuid)return;
  const items=Array.from(actor.items??[]);
  if(items.some(item=>no.qiTalent?item.flags?.['Immortals-system']?.qiTalentManaged===true&&item.flags['Immortals-system'].qiTalentId===no.id:item.name===nome&&item.getFlag?.('Immortals-system','especializacaoAdquirida')))return;
  let doc;try{doc=await globalThis.fromUuid?.(no.uuid);}catch{}
  doc??=no.qiTalent?qiTalentDocument(no.id):null;if(!doc)return;
  const dados=typeof doc.toObject==='function'?doc.toObject():structuredClone(doc);delete dados._id;delete dados.uuid;if(no.qiTalent)dados._id=qiTalentStableId('qi-talent:actor-item:'+actor.uuid+':'+no.id);dados.folder=null;dados._stats={...dados._stats,compendiumSource:no.uuid};
  dados.flags??={};dados.flags['Immortals-system']={...dados.flags['Immortals-system'],especializacaoAdquirida:true,featureSection:no.qiTalent?'jj-talents':'jj-combat',...(no.qiTalent?{qiTalentManaged:true,qiTalentId:no.id}:{especializacao:no})};
  if(actor.createEmbeddedDocuments)return actor.createEmbeddedDocuments('Item',[dados],{render:false,keepId:!!no.qiTalent});
  return globalThis.Item?.implementation?.create(dados,{parent:actor,keepId:!!no.qiTalent});
}

/** Remove da ficha o feat concedido pela árvore para a especialização. */
async function removerItemEspecializacao(actor,nome){
 const targetId=_porNome?.get(nome)?.id;
 const items=Array.from(actor.items??[]).filter(item=>_qiGraphMode?targetId&&item.flags?.['Immortals-system']?.qiTalentManaged===true&&item.flags['Immortals-system'].qiTalentId===targetId:item.name===nome&&item.getFlag?.('Immortals-system','especializacaoAdquirida'));
 if(items.length)await actor.deleteEmbeddedDocuments('Item',items.map(item=>item.id));
}

/**
 * Concilia itens ↔ estado da árvore: cria o feat de especializações
 * adquiridas sem item (ex.: aprendidas antes desta sincronização) e
 * remove itens concedidos cuja escolha foi desfeita. Idempotente.
 */
export async function sincronizarEspecializacoes(actor,grafo){
  return withElementalActorLock(actor,'sync-qi-talents',async()=>{
  if(!actor||!grafo?.porNome||actor.isOwner===false||actor.pack||actor.compendium)return;
  const lista=possuidas(actor),items=Array.from(actor.items??[]);
  const granted=items.filter(item=>grafo.qiTalents?item.flags?.['Immortals-system']?.qiTalentManaged===true:item.getFlag?.('Immortals-system','especializacaoAdquirida'));
  for(const nome of lista){const no=grafo.porNome.get(nome);if(!no)continue;const exists=items.some(item=>no.qiTalent?item.flags?.['Immortals-system']?.qiTalentId===no.id&&item.flags?.['Immortals-system']?.qiTalentManaged===true:item.name===nome);if(!exists)await criarItemEspecializacao(actor,nome);}
  const ownedIds=new Set(lista.map(name=>grafo.porNome.get(name)?.id).filter(Boolean));
  const remove=granted.filter(item=>grafo.qiTalents?!ownedIds.has(item.flags?.["Immortals-system"]?.qiTalentId):!lista.includes(item.name));if(remove.length)await actor.deleteEmbeddedDocuments('Item',remove.map(item=>item.id),{render:false});

  });
}

/* ── Orçamento de escolhas ───────────────────────────────────────────────── */

/**
 * Total de escolhas de especialização do ator:
 * Estilo (grátis iniciais) + 2 por nível par + Surto de Potencial
 * (3 no 10º, +5 no 15º, +5 no 20º) + concessão do Mestre + slots do
 * caminho do Estilo na criação (Médico de Campo +1, Mestre de Barreiras +3).
 */
export function escolhasTotais(actor) {
  if (isCultivator(actor)) return qiTalentBudget(actor,{learned:adquiridas(actor),granted:concedidas(actor),nodes:_porNome??new Map()}).total;
  const estilo = Ruleset.estilo(actor) ?? {};
  const nivel = Ruleset.nivel(actor);
  const iniciais = Number(estilo.espIniciais ?? 0);
  const porNivel = 2 * Math.floor(nivel / 2);
  const surto = (nivel >= 20 ? 5 : 0) + (nivel >= 15 ? 5 : 0) + (nivel >= 10 ? 3 : 0);
  const extra = Number(actor?.system?.legacy2?.especiaisExtra ?? 0);
  const caminho = Number(actor?.getFlag?.("Immortals-system", "caminhoEstilo")?.slotsExtras ?? 0);
  return iniciais + porNivel + surto + extra + caminho;
}

/** One discounted purchase per realm; the separate ten-PC exchange remains available. */
export async function comprarTalentoQi(actor){
 if(actor?.isOwner!==true)throw new Error('Você não tem permissão para editar esta ficha.');
 return withElementalActorLock(actor,'buy-qi-talent',async()=>{if(actor.isOwner!==true)throw new Error('Você não tem permissão para editar esta ficha.');const updates=qiTalentPurchaseUpdate(actor);await actor.update(updates);return updates;});
}

/** Escolhas ainda disponíveis. */
export function escolhasDisponiveis(actor) {
  if(isCultivator(actor))return qiTalentBudget(actor,{learned:adquiridas(actor),granted:concedidas(actor),nodes:_porNome??new Map()}).available;
  return Math.max(0, escolhasTotais(actor) - adquiridas(actor).length);
}

/* ── Slots restritos de caminho (Mestre de Barreiras / Médico de Campo) ─────
 * Feats de caminho concedem escolhas que SÓ podem ser gastas na categoria/
 * habilidade deles. Contagem dinâmica: cada habilidade já adquirida que casa
 * com o grupo consome um slot — sem dupla contagem com a criação (as escolhas
 * feitas lá já estão em adquiridas). */
const CAMINHOS_SLOTS = Object.freeze([
  { identificador: "mestre-de-barreiras", nome: "Mestre de Barreiras", rotulo: "Técnicas de Barreira",
    quantidade: 3, casa: no => no.categoria === "Técnicas de Barreira" },
  { identificador: "medico-de-campo", nome: "Médico de Campo", rotulo: "Energia Reversa",
    quantidade: 1, casa: no => no.categoria === "Energia Reversa" && no.nome === "Energia Reversa" }
]);

function temCaminho(actor, def) {
  const alvo = def.nome.toLocaleLowerCase();
  const idAlvo = def.identificador.toLocaleLowerCase();
  return Array.from(actor?.items ?? []).some(item =>
    (item.type === "feat" || item.type === "subclass")
    && (String(item.system?.identifier ?? item.identifier ?? "").trim().toLocaleLowerCase() === idAlvo
      || String(item.name ?? "").trim().toLocaleLowerCase() === alvo));
}

/** Slots restritos de caminho no ator: [{ rotulo, quantidade, usados, disponiveis, casa }]. */
export function escolhasRestritas(actor) {
  const porNome = _porNome??new Map();
  const aprendidas = adquiridas(actor);
  const grupos = [];
  if(isCultivator(actor)){
    const pool=qiTalentBudget(actor,{learned:aprendidas,granted:concedidas(actor),nodes:porNome}).restricted.immortality;
    if(pool.total)grupos.push({id:'qi-immortality',rotulo:'Imortalidade',quantidade:pool.total,usados:pool.used,disponiveis:pool.available,casa:no=>no.categoria==='Imortalidade'});
    return grupos;
  }
  for ( const def of CAMINHOS_SLOTS ) {
    if ( !temCaminho(actor, def) ) continue;
    const usados = aprendidas.filter(n => def.casa(porNome.get(n) ?? {})).length;
    grupos.push({ id: def.identificador, rotulo: def.rotulo, quantidade: def.quantidade,
      usados, disponiveis: Math.max(0, def.quantidade - usados), casa: def.casa });
  }
  return grupos;
}

/** Slot restrito livre que pode pagar este nó (ou null). */
export function slotRestritoPara(actor, no) {
  return escolhasRestritas(actor).find(grupo => grupo.disponiveis > 0 && grupo.casa(no)) ?? null;
}

/* ── Motor de requisitos ─────────────────────────────────────────────────── */

const RX_CONTAGEM = /^(?:todas as outras\s+)?(\d+)\s*[Hh]abilidades?\s*(?:de\s+especializa[çc][ãa]o\s+)?(?:do|da|de)\s+(.+)$/i;
const RX_NIVEL = /^(?:\d+)º?\s*n[íi]vel(?:\s+(?:de\s+personagem))?(?:\s*ou\s*superior)?$/i;
const RX_ATRIBUTO = /^(\d+)\s*[Pp]ontos?\s*de\s+([A-ZÀ-Ú][a-zà-ú]+)$/;

const NIVEL_PAR_TEXTO = { "4": 4, "3": 3, "2": 2, "1": 1 };

/** Nome do atributo em pt → chave (Força→str, Presença→cha…). */
const MAPA_ATRIBUTOS = {
  "forca": "str", "força": "str", "agilidade": "dex", "constituicao": "con",
  "constituição": "con", "intelecto": "int", "sabedoria": "wis", "presenca": "cha", "presença": "cha"
};

const ESTILOS_CONHECIDOS = ["Restringido", "Lutador", "Sentinela", "Especialista", "Estrategista"];

/* ── Restrições de Estilo sobre a árvore ─────────────────────────────────────
 * Restringido: sem Feitiço Inato, Técnicas de Barreira, Domínio e
 * Anti-Domínio nem Energia Reversa; em Proezas Físicas só Corpo de Guerreiro
 * (sem Punho Divergente nem Canalização de Energia); em Habilidades
 * Especiais só Existência Aprimorada (Ofensivo/Defensivo) — sem Novo Estilo
 * das Sombras nem Ressonância da Alma. Vale na skill tree E no creation. */
export const RESTRICOES_ESTILO = Object.freeze({
  restringido: Object.freeze({
    categoriasBloqueadas: ["Feitiço Inato", "Técnicas de Barreira", "Domínio e Anti-Domínio", "Energia Reversa"],
    caminhosBloqueados: Object.freeze({
      "Proezas Físicas": ["Punho Divergente", "Canalização de Energia"],
      "Habilidades Especiais": ["Novo Estilo das Sombras", "Ressonância da Alma"]
    })
  })
});

/** O documento de classe do estilo do ator (não só as flags legacy2). */
export function documentoEstilo(actor) {
  return actor?.itemTypes?.class?.find(c => !!c.getFlag?.("Immortals-system", "legacy2")) ?? null;
}

/** Restrições que o estilo do documento impõe à árvore (null se nenhuma). */
export function restricaoDoEstilo(estilo) {
  const chave = String(estilo?.system?.identifier ?? estilo?.name ?? "").toLowerCase().trim();
  return RESTRICOES_ESTILO[chave] ?? null;
}

/** Motivo pelo qual o estilo não permite o nó — ou null se permitido. */
export function bloqueioDeEstilo(estilo, no) {
  const restricao = restricaoDoEstilo(estilo);
  if ( !restricao || !no?.caminho ) return null;
  if ( restricao.categoriasBloqueadas.includes(no.categoria) )
    return `O Restringido não pode aprender habilidades de ${no.categoria}.`;
  const caminhos = restricao.caminhosBloqueados[no.categoria];
  if ( caminhos?.includes(no.caminho) )
    return `O Restringido não pode aprender o caminho ${no.caminho}.`;
  return null;
}

/**
 * Avalia UM requisito textual contra o ator.
 * @returns {{ok: boolean, texto: string, tipo: string}} tipo: nó|contagem|nivel|atributo|estilo|info
 */
function avaliarRequisito(actor, requisito, nomeNo) {
  const req = String(requisito).trim();

  // (a) nome de outro nó do grafo (com ou sem >< na fonte original)
  const limpo = req.replaceAll(">", "").replaceAll("<", "").trim();
  if ( _porNome?.has(limpo) ) {
    return { ok: possuidas(actor).includes(limpo), texto: limpo, tipo: "no" };
  }

  // "A ou B (ou C…)" — requisitos alternativos: basta UMA das partes. Só vale
  // como alternativa se TODAS as partes forem requisitos reconhecíveis; com
  // qualquer parte desconhecida o texto inteiro cai no teste a seguir.
  if ( /\s+ou\s+/i.test(req) ) {
    const partes = req.split(/\s+ou\s+/i).map(p => p.trim());
    if ( partes.length > 1 ) {
      const res = partes.map(p => avaliarRequisito(actor, p, nomeNo));
      if ( res.every(r => r.tipo !== "info") ) {
        return { ok: res.some(r => r.ok), texto: req, tipo: "alternativo" };
      }
    }
  }

  // "A e B" — cumulativos: TODAS as partes obrigatórias, mesma guarda do OU.
  // (Nós com " e " no nome — "Cone e Leque", "Domínio e Anti-Domínio" — já
  // foram resolvidos no (a); parte desconhecida rejeita o split inteiro.)
  if ( req.includes(" e ") ) {
    const partes = req.split(/\s+e\s+/).map(p => p.trim());
    if ( partes.length > 1 ) {
      const res = partes.map(p => avaliarRequisito(actor, p, nomeNo));
      if ( res.every(r => r.tipo !== "info") ) {
        return { ok: res.every(r => r.ok), texto: req, tipo: "cumulativo" };
      }
    }
  }

  // (b) "N Habilidades do/de <alvo>" — alvo pode ser caminho ("Existência
  //     Aprimorada - Ofensivo"), categoria ("Energia Reversa") ou o total
  //     geral ("Especialização [Totais]"). Aceita prefixo "Todas as outras".
  const mCont = req.match(RX_CONTAGEM);
  if ( mCont ) {
    const qtd = Number(mCont[1]);
    const alvo = mCont[2].trim().replace(/\s+totais?$/i, "").trim();
    if ( /^especializa/i.test(alvo) ) {
      return { ok: possuidas(actor).length >= qtd, texto: req, tipo: "contagem" };
    }
    const norm = (s) => (s ?? "").toLowerCase();
    const ehCategoria = [...new Set([...(_porNome?.values() ?? [])].map(n => n.categoria))]
      .some(c => norm(c) === norm(alvo));
    const tem = possuidas(actor).filter(nome => {
      const no = _porNome?.get(nome);
      if ( !no ) return false;
      return ehCategoria ? norm(no.categoria) === norm(alvo)
                         : norm(no.caminho) === norm(alvo);
    }).length;
    return { ok: tem >= qtd, texto: req, tipo: "contagem" };
  }

  // (c) nível
  if ( RX_NIVEL.test(req) ) {
    const num = parseInt(req, 10);
    return { ok: Ruleset.nivel(actor) >= num, texto: req, tipo: "nivel" };
  }

  // (d) atributo
  const mAtr = req.match(RX_ATRIBUTO);
  if ( mAtr ) {
    const chave = MAPA_ATRIBUTOS[mAtr[2].toLowerCase()];
    if ( chave ) {
      const valor = Number(actor?.system?.abilities?.[chave]?.value ?? 0);
      return { ok: valor >= Number(mAtr[1]), texto: req, tipo: "atributo" };
    }
  }

  // (e) estilo de combate
  if ( ESTILOS_CONHECIDOS.some(e => req.toLowerCase() === e.toLowerCase()) ) {
    const classe = actor?.itemTypes?.class?.find(c => !!c.getFlag("Immortals-system", "legacy2"));
    return { ok: classe?.name?.toLowerCase() === req.toLowerCase(), texto: req, tipo: "estilo" };
  }

  const rank=CULTIVATION_RANKS.find(rank=>rank.name.toLocaleLowerCase()===limpo.toLocaleLowerCase());
  const body=/^(\d+)[ºª]?\s*Portão$/i.exec(limpo),soul=/^(\d+)[ºª]?\s*Revolução$/i.exec(limpo),count=/^(\d+)\s+talentos?\s+de\s+Qi(?:\s+quaisquer|\s+qualquer)?$/i.exec(limpo);
  const bodyStart=/^Forjando (?:o|do) Corpo$/i.test(limpo)?1:/^Temperando a Medula$/i.test(limpo)?2:null;
  const rule=rank?{type:'rank',min:rank.rank}:body?{type:'body',min:Number(body[1])+2}:bodyStart?{type:'body',min:bodyStart}:soul?{type:'soul',min:Number(soul[1])+1}:/^Avatar da Alma$/i.test(limpo)?{type:'soul',min:1}:count?{type:'count',min:Number(count[1])}:/^Um gesto qualquer$/i.test(limpo)?{type:'anyGesture'}:null;
  if(rule){const result=qiTalentRequirement(actor,rule,{has:id=>possuidas(actor).includes(qiDefinitions.get(id)?.name),learnedCount:possuidas(actor).filter(name=>_porNome?.get(name)?.qiTalent).length});return {ok:result.ok,texto:req,tipo:result.type};}

  // (f) requisito-informativo (validação fica com o Mestre)
  return { ok: false, texto: req, tipo: "info" };
}

/**
 * Estado de um nó para o ator: adquirido | disponível | bloqueado.
 * @returns {{estado: string, pendencias: {texto,tipo}[], informativos: string[]}}
 */
/* ── Modificadores lendários que liberam requisitos ────────────────────────
 * Receptáculo Destinado permite adquirir "Abençoado Pelas Faíscas Negras"
 * ignorando qualquer requisito. No ator real o modificador é um feat da
 * seção jj-legendary-modifiers; no draft da criação o pseudo-ator carrega
 * os nomes escolhidos em flags.Immortals-system.modLendarioNomes. */
const IGNORA_REQUISITOS = Object.freeze({ "Abençoado Pelas Faíscas Negras": "Receptáculo Destinado" });

const nomeChave = nome => String(nome ?? "").trim().toLocaleLowerCase();

function temModificadorLendario(actor, nome) {
  const alvo = nomeChave(nome);
  if ( Array.isArray(actor?.flags?.["Immortals-system"]?.modLendarioNomes)
    && actor.flags["Immortals-system"].modLendarioNomes.some(n => nomeChave(n) === alvo) ) return true;
  return Array.from(actor?.items ?? []).some(item => item.type === "feat"
    && nomeChave(item.name) === alvo
    && (item.getFlag?.("Immortals-system", "featureSection") ?? item.flags?.["Immortals-system"]?.featureSection) === "jj-legendary-modifiers");
}

export function avaliarNo(actor, no) {
  if ( tem(actor, no.nome) ) return { estado: "adquirido", pendencias: [], informativos: [] };

  if(no.qiTalent&&no.requirementRules&&!no.requirementsOverridden){
    const owned=new Set(possuidas(actor));
    const result=qiTalentRequirement(actor,no.requirementRules,{has:id=>{const def=qiDefinitions.get(id);return !!def&&(owned.has(def.name)||(def.aliases??[]).some(name=>owned.has(name)));},learnedCount:[...owned].filter(name=>_porNome?.get(name)?.qiTalent).length});
    return result.ok?{estado:'disponivel',pendencias:[],informativos:[]}:{estado:'bloqueado',pendencias:result.type==='info'?[]:[{texto:no.requisitos?.join('; ')||result.text,tipo:result.type}],informativos:result.type==='info'?[result.text]:[]};
  }
  const pendencias = [];
  const informativos = [];
  const bloqueio = bloqueioDeEstilo(documentoEstilo(actor), no);
  if ( bloqueio ) pendencias.push({ texto: bloqueio });
  for ( const req of no.requisitos ?? [] ) {
    const res = avaliarRequisito(actor, req, no.nome);
    if ( res.tipo === "info" ) informativos.push(res.texto);
    else if ( !res.ok ) pendencias.push(res);
  }
  const liberador = Object.entries(IGNORA_REQUISITOS)
    .find(([noNome]) => nomeChave(noNome) === nomeChave(no.nome))?.[1];
  if ( liberador && temModificadorLendario(actor, liberador) ) {
    pendencias.length = 0;
    informativos.length = 0;
  }
  const estado = (pendencias.length === 0) && (informativos.length === 0)
    ? "disponivel"
    : "bloqueado";
  return { estado, pendencias, informativos };
}
