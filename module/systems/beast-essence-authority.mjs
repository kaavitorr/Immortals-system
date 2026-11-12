/** One elected document owner executes every native Beast Essence mutation. */
const CHANNEL = "system.Immortals-system";
const ACTIONS = new Set(["queue", "activate", "deactivate", "setToken", "remove", "completeRest", "sync", "turn", "cultivationDestiny"]);
const registrations = new WeakMap();
const REQUEST_KEYS = new Set(["type", "version", "requestId", "requesterId", "executorId", "actorUuid", "action", "args"]);
const RESPONSE_KEYS = new Set(["type", "version", "requestId", "requesterId", "executorId", "actorUuid", "action", "ok", "result", "error"]);
const ACTOR_UUID = /^(?:Scene\.[\w-]{1,64}\.Token\.[\w-]{1,64}\.)?Actor\.[\w-]{1,64}$/;
const usersOf = game => Array.from(game?.users?.contents ?? game?.users ?? []);
const userById = (game, id) => game.users?.get?.(id) ?? usersOf(game).find(user => user.id===id);
const ordered = users => users.sort((a, b) => String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0);
const owns = (actor, user) => {
  if (!actor || !user) return false;
  try {
    if (typeof actor.testUserPermission==="function") return actor.testUserPermission(user, "OWNER")===true;
    return user.isGM===true || Number(actor.ownership?.[user.id] ?? actor.ownership?.default ?? 0)>=3;
  } catch {return false;}
};
const plain = value => value!==null && typeof value==="object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const identifier = value => typeof value==="string" && /^[A-Za-z0-9:_-]{1,160}$/.test(value);
const safeError = error => String(error?.message ?? error ?? "Não foi possível concluir a ação da essência.")
  .replace(/[\u0000-\u001f]/g, " ").replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c])).slice(0, 512);

/**
 * Elect the same active player owner on every client, falling back to an active Narrator.
 * @param {object} actor
 * @param {object} game
 * @returns {object|null}
 */
export function beastEssenceExecutor(actor, game=globalThis.game) {
  if (actor?.type!=="character") return null;
  const active=usersOf(game).filter(user => user.active===true);
  const owner=ordered(active.filter(user => !user.isGM&&owns(actor, user)))[0];
  if (owner) return owner;
  const gm=game?.users?.activeGM;
  return gm?.active===true && gm.isGM===true ? gm : ordered(active.filter(user => user.isGM))[0]??null;
}

/**
 * Automatic upkeep and reconciliation use the same election as explicit commands.
 * @param {object} actor
 * @returns {boolean}
 */
export function mayExecuteBeastEssence(actor) {
  const game=globalThis.game;
  return !!game?.user?.active && beastEssenceExecutor(actor, game)?.id===game.user.id;
}

/**
 * Accept a native world or synthetic character Actor UUID only.
 * @param {object} actor
 * @param {string} uuid
 */
function validateActor(actor, uuid=actor?.uuid) {
  if (actor?.type!=="character" || typeof uuid!=="string" || uuid.length>256 || !ACTOR_UUID.test(uuid) || actor.uuid!==uuid) throw new Error("Escolha uma ficha de personagem válida para a essência.");
}

/**
 * The wire accepts only this fixed command vocabulary and its bounded primitive arguments.
 * @param {string} action
 * @param {string[]} args
 */
function validateAction(action, args) {
  if (!ACTIONS.has(action) || !Array.isArray(args)) throw new Error("Ação de Essência de Besta inválida.");
  const count=action==="turn"?3:["queue", "setToken", "completeRest", "cultivationDestiny"].includes(action)?1:0;
  if (args.length!==count || args.some(arg => typeof arg!=="string")) throw new Error("Argumentos inválidos para a ação da essência.");
  if (action==="cultivationDestiny" && (args[0].length>200000||!args[0].trim())) throw new Error("Comando de herança inválido.");
  if (action==="turn" && (!/^Combat\.[A-Za-z0-9_-]{1,64}$/.test(args[0])
    || !/^[A-Za-z0-9_-]{1,64}$/.test(args[1]) || !/^[1-9][0-9]{0,6}$/.test(args[2])
    || Number(args[2])>1000000)) throw new Error("Identidade ou rodada de combate inválida para a essência.");
  if (action==="queue" && !/^[A-Za-z0-9_-]{1,64}$/.test(args[0])) throw new Error("Identificador de essência inválido.");
  if (action==="completeRest" && (!args[0].trim() || args[0].length>512 || /[\u0000-\u001f]/.test(args[0]))) throw new Error("Comprovante de descanso inválido.");
  if (action==="setToken" && (args[0].length>4096 || /[\u0000-\u001f]/.test(args[0])
    || (args[0] && !/^(?:https?:\/\/|data:image\/|[^:]+$)/i.test(args[0])))) throw new Error("Caminho de imagem do token inválido.");
}

/**
 * Never serialize native documents, flags, actor updates or a complete essence definition.
 * @param {*} value
 * @returns {*}
 */
function resultReceipt(value) {
  if (value===null || value===undefined) return null;
  if (typeof value==="boolean") return value;
  if (typeof value==="number") return Number.isFinite(value)?value:null;
  if (typeof value==="string") return value.slice(0, 256);
  if (!plain(value)) return null;
  const result={};
  for (const key of ["success", "cancelled"]) if (typeof value[key]==="boolean")result[key]=value[key];
  for (const key of ["dc", "total", "pointsRemaining", "pointsSpent"]) if (typeof value[key]==="number"&&Number.isFinite(value[key]))result[key]=value[key];
  const id=value.essenceId??value.definition?.id;
  if (typeof id==="string")result.essenceId=id.slice(0, 256);
  return Object.keys(result).length?result:null;
}

/**
 * Reject unsolicited structures and unknown protocol fields before document resolution.
 * @param {object} payload
 * @param {string} type
 * @returns {boolean}
 */
function validEnvelope(payload, type) {
  const keys=type==="essencerequest"?REQUEST_KEYS:RESPONSE_KEYS;
  return plain(payload) && payload.type===type && payload.version===1
    && Object.keys(payload).every(key => keys.has(key)) && identifier(payload.requestId)
    && identifier(payload.requesterId) && identifier(payload.executorId)
    && typeof payload.actorUuid==="string" && payload.actorUuid.length<=256 && ACTOR_UUID.test(payload.actorUuid)
    && ACTIONS.has(payload.action);
}

/**
 * Register native, non-routed handlers. The server's second socket argument authenticates the sender.
 * @param {object} handlers
 * @param {object} options
 * @returns {object}
 */
export function registerBeastEssenceAuthority(handlers, options={}) {
  const game=options.game??globalThis.game;
  if (!game?.socket?.on || !game.socket.emit) throw new Error("A conexão da autoridade de essência ainda não está disponível.");
  if (!plain(handlers) || Object.keys(handlers).some(action => !ACTIONS.has(action)||typeof handlers[action]!=="function")) throw new Error("Registre apenas ações nativas conhecidas de Essência de Besta.");
  if (registrations.has(game)) {const registered=registrations.get(game);registered.addHandlers(handlers);return registered;}
  const resolve=options.resolve??globalThis.fromUuid;
  const timeoutMs=Math.max(1, Math.min(60000, Number(options.timeoutMs)||60000));
  const requestIdFactory=options.requestIdFactory??(() => globalThis.crypto.randomUUID());
  const pending=new Map(); const executed=new Map();
  let closed=false;
  const requireOwner=(actor, id) => {
    validateActor(actor);
    const user=userById(game, id);
    if (!user?.active || !owns(actor, user)) throw new Error("Você não tem permissão de proprietário para esta ficha.");
    return user;
  };
  const requireExecutor=(actor, id) => {
    if (game.user?.id!==id || !game.user?.active || beastEssenceExecutor(actor, game)?.id!==id) throw new Error("O executor responsável pela essência mudou. Tente novamente após a sincronização.");
  };
  const invoke=async (actor, action, args, requesterId, executorId) => {
    validateAction(action, args); requireOwner(actor, requesterId); requireExecutor(actor, executorId);
    const handler=Object.hasOwn(handlers, action)?handlers[action]:null;
    if (!handler) throw new Error("Esta ação de essência não está disponível no executor.");
    const authorize=()=>{requireOwner(actor,requesterId);requireExecutor(actor,executorId);};
    const result=action==="cultivationDestiny"?await handler(actor,...args,{authorize}):await handler(actor, ...args);
    requireOwner(actor, requesterId); requireExecutor(actor, executorId);
    return resultReceipt(result);
  };
  const emit=(payload, recipient) => {
    if (!closed)game.socket.emit(CHANNEL, payload, {recipients: [recipient]});
  };
  const respond=(request, response) => emit({type: "essenceresponse", version: 1, requestId: request.requestId,
    requesterId: request.requesterId, executorId: request.executorId, actorUuid: request.actorUuid,
    action: request.action, ...response}, request.requesterId);
  const settle=(id, error, result) => {
    const waiting=pending.get(id); if (!waiting) return;
    clearTimeout(waiting.timer); pending.delete(id);
    if (error)waiting.reject(error); else waiting.resolve(result);
  };

  /**
   * Reauthorize every request, including a cached reply, using the server-authenticated sender.
   * @param {object} request
   * @param {string} senderId
   * @returns {Promise<void>}
   */
  async function receiveRequest(request, senderId) {
    if (!validEnvelope(request, "essencerequest") || request.requesterId!==senderId || request.executorId!==game.user?.id) return;
    try {validateAction(request.action, request.args);}
    catch (error) {respond(request, {ok: false, error: safeError(error)}); return;}
    const requester=userById(game, senderId);
    if (!requester?.active) return;
    const key=`${senderId}:${request.requestId}`;
    const fingerprint=JSON.stringify([request.actorUuid, request.executorId, request.action, request.args]);
    let actor;
    try {
      actor=await resolve?.(request.actorUuid);
      validateActor(actor, request.actorUuid);
      requireOwner(actor, senderId);
      requireExecutor(actor, request.executorId);
    } catch (error) {respond(request, {ok: false, error: safeError(error)}); return;}
    // Even cached results require fresh ownership and executor checks; UUID resolution also yields.
    const repeated=executed.get(key);
    if (repeated) {
      if (repeated.fingerprint!==fingerprint) {respond(request, {ok: false, error: "O identificador da solicitação já foi usado para outra ação."}); return;}
      respond(request, await repeated.response); return;
    }
    const entry={fingerprint, response: null};
    executed.set(key, entry);
    entry.response=Promise.resolve()
      .then(() => invoke(actor, request.action, [...request.args], senderId, request.executorId))
      .then(result => ({ok: true, result}), error => ({ok: false, error: safeError(error)}));
    respond(request, await entry.response);
  }

  /**
   * Match a response to its outstanding request and expected authenticated executor.
   * @param {object} response
   * @param {string} senderId
   */
  function receiveResponse(response, senderId) {
    if (!validEnvelope(response, "essenceresponse") || response.requesterId!==game.user?.id) return;
    const waiting=pending.get(response.requestId);
    if (!waiting || senderId!==waiting.executorId || response.executorId!==senderId
      || response.actorUuid!==waiting.actor.uuid || response.action!==waiting.action || typeof response.ok!=="boolean") return;
    try {
      requireOwner(waiting.actor, game.user.id);
      if (beastEssenceExecutor(waiting.actor, game)?.id!==waiting.executorId) throw new Error("O executor responsável pela essência mudou. Tente novamente após a sincronização.");
      if (!response.ok) throw new Error(typeof response.error==="string"?response.error.slice(0, 512):"A ação de essência não pôde ser concluída.");
      settle(response.requestId, null, resultReceipt(response.result));
    } catch (error) {settle(response.requestId, error);}
  }

  const receive=(payload, senderId) => {
    if (closed || !identifier(senderId)) return;
    if (payload?.type==="essencerequest") void receiveRequest(payload, senderId).catch(() => {});
    else if (payload?.type==="essenceresponse")receiveResponse(payload, senderId);
  };
  game.socket.on(CHANNEL, receive);
  const authority={
    addHandlers(next){if(!plain(next)||Object.keys(next).some(action=>!ACTIONS.has(action)||typeof next[action]!=="function"))throw new Error("Ações nativas inválidas.");for(const[action,fn]of Object.entries(next))if(!Object.hasOwn(handlers,action))handlers[action]=fn;},
    async dispatch(actor, action, args=[]) {
      if (closed) throw new Error("A autoridade de essência foi encerrada.");
      validateActor(actor); validateAction(action, args); requireOwner(actor, game.user?.id);
      const executor=beastEssenceExecutor(actor, game);
      if (!executor) throw new Error("Nenhum proprietário ou Narrador ativo está disponível para executar esta ação.");
      if (executor.id===game.user.id) return invoke(actor, action, [...args], game.user.id, executor.id);
      const requestId=`${game.user.id}:${requestIdFactory()}`;
      if (!identifier(requestId)||pending.has(requestId)) throw new Error("Não foi possível identificar a solicitação de essência.");
      return new Promise((resolvePromise, reject) => {
        const timer=setTimeout(() => settle(requestId, new Error("O executor não respondeu a tempo. A ação pode ainda estar em andamento; aguarde antes de tentar novamente.")), timeoutMs);
        pending.set(requestId, {actor, action, executorId: executor.id, timer, resolve: resolvePromise, reject});
        try {emit({type: "essencerequest", version: 1, requestId, requesterId: game.user.id, executorId: executor.id,
          actorUuid: actor.uuid, action, args: [...args]}, executor.id);}
        catch (error) {settle(requestId, new Error(safeError(error)));}
      });
    },
    unregister() {
      if (closed) return; closed=true; game.socket.off?.(CHANNEL, receive); registrations.delete(game);
      for (const id of pending.keys())settle(id, new Error("A conexão da autoridade de essência foi encerrada."));
      executed.clear();
    }
  };
  registrations.set(game, authority);
  return authority;
}

/**
 * Owners route mutations to the elected client; a timeout never retries them locally.
 * @param {object} actor
 * @param {string} action
 * @param {string[]} args
 * @returns {Promise<*>}
 */
export async function dispatchBeastEssenceAction(actor, action, args=[]) {
  const authority=registrations.get(globalThis.game);
  if (!authority) throw new Error("A autoridade de Essência de Besta ainda não foi inicializada.");
  return authority.dispatch(actor, action, args);
}
