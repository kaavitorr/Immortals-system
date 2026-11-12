/** Manual profession ledgers; recipe content and game-specific crafting rules are independent. */
export const PROFESSION_SCOPE = "Immortals-system";
export const PROFESSION_STATUSES = Object.freeze([
  {value: "planned", label: "Planejado"},
  {value: "active", label: "Em andamento"},
  {value: "complete", label: "Concluído"}
]);
export const PROFESSIONS = Object.freeze([
  {
    "key": "beasts",
    "label": "Bestas",
    "title": "Criador de Bestas",
    "tagline": "Linhagens, vínculos e desenvolvimento",
    "description": "Um bestiário vivo para acompanhar a criação, os cuidados e o treinamento de suas bestas.",
    "projectsTitle": "Criação e treinamento",
    "referencesTitle": "Bestiário",
    "projectAction": "Novo registro",
    "referenceAction": "Registrar no bestiário",
    "specialtyPlaceholder": "Espécies, linhagens ou métodos",
    "fields": [
      {
        "key": "lineage",
        "label": "Espécie ou linhagem",
        "placeholder": "A origem da besta",
        "type": "text"
      },
      {
        "key": "bond",
        "label": "Vínculo",
        "placeholder": "Como a besta se relaciona com você",
        "type": "text"
      },
      {
        "key": "care",
        "label": "Cuidados e treinamento",
        "placeholder": "Criação, desenvolvimento e treino",
        "type": "text"
      }
    ]
  },
  {
    "key": "artisan",
    "label": "Artesão",
    "title": "Mestre Artesão",
    "tagline": "Equipamentos que carregam um legado",
    "description": "Da escolha dos materiais ao último acabamento: organize os equipamentos que deseja criar e os modelos que domina.",
    "projectsTitle": "Bancada de equipamentos",
    "referencesTitle": "Modelos e métodos",
    "projectAction": "Novo projeto",
    "referenceAction": "Novo modelo",
    "specialtyPlaceholder": "Armas, armaduras ou outros equipamentos",
    "fields": [
      {
        "key": "category",
        "label": "Tipo de equipamento",
        "placeholder": "Arma, armadura, acessório…",
        "type": "text"
      },
      {
        "key": "materials",
        "label": "Materiais",
        "placeholder": "O que será usado na criação",
        "type": "text"
      }
    ]
  },
  {
    "key": "inscriptions",
    "label": "Inscrições",
    "title": "Mestre de Inscrições",
    "tagline": "Qi conduzido pelo traço e pelo selo",
    "description": "Preserve inscrições e acompanhe a preparação de talismãs, reunindo seus suportes, tintas e efeitos.",
    "projectsTitle": "Talismãs em preparação",
    "referencesTitle": "Manuscritos e inscrições",
    "projectAction": "Novo talismã",
    "referenceAction": "Nova inscrição",
    "specialtyPlaceholder": "Selos, proteções ou outros talismãs",
    "fields": [
      {
        "key": "support",
        "label": "Suporte e tinta",
        "placeholder": "Papel, metal, tinta ou outro suporte",
        "type": "text"
      },
      {
        "key": "effect",
        "label": "Inscrição ou efeito",
        "placeholder": "A intenção do talismã",
        "type": "text"
      }
    ]
  },
  {
    "key": "matrices",
    "label": "Matrizes",
    "title": "Mestre de Matrizes",
    "tagline": "Formações fixas e portáteis",
    "description": "Desenhe formações para um lugar ou para um suporte portátil e mantenha seus diagramas e componentes organizados.",
    "projectsTitle": "Matrizes em preparação",
    "referencesTitle": "Diagramas de matrizes",
    "projectAction": "Nova matriz",
    "referenceAction": "Novo diagrama",
    "specialtyPlaceholder": "Proteção, contenção ou outras formações",
    "fields": [
      {
        "key": "mode",
        "label": "Forma da matriz",
        "type": "select",
        "options": [
          {
            "value": "fixed",
            "label": "Fixa — em um lugar"
          },
          {
            "value": "portable",
            "label": "Portátil — em um suporte"
          }
        ]
      },
      {
        "key": "site",
        "label": "Local ou suporte",
        "placeholder": "Onde a matriz será montada",
        "type": "text"
      },
      {
        "key": "scope",
        "label": "Área ou alcance",
        "placeholder": "Descreva a área da formação",
        "type": "text"
      }
    ]
  },
  {
    "key": "alchemy",
    "label": "Alquimista",
    "title": "Alquimista",
    "tagline": "Essências transformadas em pílulas",
    "description": "Reúna fórmulas, registre ingredientes e acompanhe os lotes preparados na sua fornalha alquímica.",
    "projectsTitle": "Lotes de pílulas",
    "referencesTitle": "Fórmulas alquímicas",
    "projectAction": "Novo lote",
    "referenceAction": "Nova fórmula",
    "specialtyPlaceholder": "Essências, recuperação ou outros preparados",
    "fields": [
      {
        "key": "ingredients",
        "label": "Ingredientes",
        "placeholder": "Ervas, essências e outros componentes",
        "type": "text"
      },
      {
        "key": "result",
        "label": "Pílulas e efeito",
        "placeholder": "O resultado pretendido",
        "type": "text"
      },
      {
        "key": "quantity",
        "label": "Quantidade do lote",
        "placeholder": "Quantidade prevista de pílulas",
        "type": "text"
      }
    ]
  }
]);

const text = value => typeof value === "string" ? value
  : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
const validId = id => typeof id === "string" && /^[A-Za-z0-9]{8,32}$/.test(id)
  && !["constructor", "prototype"].includes(id);

export function getProfessionDefinition(key) {
  const definition = PROFESSIONS.find(profession => profession.key === key);
  if (!definition) throw Error("Profissão inválida.");
  return definition;
}

function savedProfession(actor, key) {
  const root = actor.flags?.[PROFESSION_SCOPE]?.professions ?? actor.getFlag?.(PROFESSION_SCOPE, "professions") ?? {};
  return root?.[key] ?? {};
}

/** Normalize known fields while ignoring incomplete or obsolete saved records when reading. */
function recordData(definition, data, {strict = true} = {}) {
  const name = text(data?.name).trim();
  const kind = data?.kind;
  if (!name || !["project", "reference"].includes(kind)) {
    if (!strict) return null;
    throw Error("Informe um nome para o registro.");
  }
  const status = kind === "project" ? (data.status ?? "planned") : "";
  if (kind === "project" && !PROFESSION_STATUSES.some(option => option.value === status)) {
    if (!strict) return null;
    throw Error("Situação do projeto inválida.");
  }
  const fields = {};
  for (const spec of definition.fields) {
    const value = text(data.fields?.[spec.key]);
    if (spec.type !== "select") {
      fields[spec.key] = value;
      continue;
    }
    const selected = value || spec.options[0].value;
    if (!spec.options.some(option => option.value === selected)) {
      if (!strict) return null;
      throw Error("Escolha uma forma válida para a matriz.");
    }
    fields[spec.key] = selected;
  }
  return {name, kind, status, notes: text(data.notes), fields};
}

/** Presentation only; never modifies an actor or its stored references. */
export function professionState(actor, key) {
  const definition = getProfessionDefinition(key);
  const saved = savedProfession(actor, key);
  const records = [];
  for (const [id, raw] of Object.entries(saved.records ?? {})) {
    if (!validId(id)) continue;
    const record = recordData(definition, raw, {strict: false});
    if (!record) continue;
    const fieldValues = definition.fields.map(spec => ({
      label: spec.label,
      value: spec.type === "select" ? spec.options.find(option => option.value === record.fields[spec.key])?.label
        : record.fields[spec.key]
    }));
    records.push({
      ...record, id, professionKey: key,
      statusLabel: PROFESSION_STATUSES.find(status => status.value === record.status)?.label ?? "Método",
      fieldValues,
      summary: fieldValues.filter(field => field.value).map(field => field.value).join(" · "),
      statusOptions: PROFESSION_STATUSES.map(status => ({...status, selected: status.value === record.status}))
    });
  }
  const order = {active: 0, planned: 1, complete: 2};
  const projects = records.filter(record => record.kind === "project")
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "pt-BR"));
  const references = records.filter(record => record.kind === "reference")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return {
    ...definition,
    profile: {specialty: text(saved.specialty), tradition: text(saved.tradition), notes: text(saved.notes)},
    projects, references,
    counts: {
      projects: projects.length, references: references.length,
      active: projects.filter(record => record.status === "active").length,
      complete: projects.filter(record => record.status === "complete").length, total: records.length
    },
    hasProjects: projects.length > 0, hasReferences: references.length > 0
  };
}

export function prepareProfessionProfileUpdate(actor, key, field, value) {
  getProfessionDefinition(key);
  if (!["specialty", "tradition", "notes"].includes(field)) throw Error("Campo de profissão inválido.");
  return {["flags." + PROFESSION_SCOPE + ".professions." + key + "." + field]: text(value)};
}

function requireRecord(actor, key, id) {
  if (!validId(id)) throw Error("Registro inválido.");
  const state = professionState(actor, key);
  const record = [...state.projects, ...state.references].find(record => record.id === id);
  if (!record) throw Error("O registro não está mais neste ofício.");
  return record;
}

export function prepareProfessionRecordUpdate(actor, key, id, data, {create = false} = {}) {
  const definition = getProfessionDefinition(key);
  if (!validId(id)) throw Error("Registro inválido.");
  const existing = professionState(actor, key);
  const found = [...existing.projects, ...existing.references].find(record => record.id === id);
  if (create && found) throw Error("Este registro já existe.");
  if (!create && !found) throw Error("O registro não está mais neste ofício.");
  const record = recordData(definition, data);
  if (found && found.kind !== record.kind) throw Error("O tipo do registro não pode ser alterado.");
  return {["flags." + PROFESSION_SCOPE + ".professions." + key + ".records." + id]: record};
}

export function prepareProfessionRecordDelete(actor, key, id) {
  requireRecord(actor, key, id);
  return {["flags." + PROFESSION_SCOPE + ".professions." + key + ".records.-=" + id]: null};
}

export function prepareProfessionStatusUpdate(actor, key, id, status) {
  const record = requireRecord(actor, key, id);
  if (record.kind !== "project" || !PROFESSION_STATUSES.some(option => option.value === status)) {
    throw Error("Situação do projeto inválida.");
  }
  return {["flags." + PROFESSION_SCOPE + ".professions." + key + ".records." + id + ".status"]: status};
}

export function professionProjectFromReference(actor, key, id) {
  const record = requireRecord(actor, key, id);
  if (record.kind !== "reference") throw Error("Escolha um método do acervo.");
  return {name: record.name, kind: "project", status: "planned", fields: {...record.fields}, notes: record.notes};
}
