/**
 * PromptDeMerde.com — Schéma canonique pdm-config et validation stricte import/export JSON.
 */
(function() {

var CS = {};

CS.VERSION = '1.4.0';
CS.CONFIG_TYPE = 'pdm-config';

CS.STT_ENGINES = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
CS.LANGUAGES = ['fr', 'en'];
CS.CONTEXT_POSITIONS = ['after_system', 'before_system'];
CS.STT_COMPUTE = ['cpu', 'gpu'];

CS.THEME_IDS = [
    'light', 'dark', 'orange', 'red', 'gray', 'yellow', 'fuchsia',
    'ocean', 'forest', 'cyber', 'rose', 'terminal'
];

CS.META_KEYS = ['version', 'type', 'exportedAt'];

CS.PDM_KEYS = [
    'pdm_provider',
    'pdm_model',
    'pdm_system_prompt',
    'pdm_system_prompt_enabled',
    'pdm_profiles',
    'pdm_language',
    'pdm_theme',
    'pdm_history_count',
    'pdm_clean_history',
    'pdm_workspace',
    'pdm_stt_device_id',
    'pdm_stt_engine',
    'pdm_stt_compute',
    'pdm_context_position',
    'pdm_ollama_url',
    'pdm_llm_thinking_enabled',
    'pdm_token_ollama'
];

CS.REQUIRED_ROOT_KEYS = CS.META_KEYS.concat(CS.PDM_KEYS);

CS.PROFILE_KEYS = ['id', 'tag', 'prompt', 'active'];
CS.WORKSPACE_KEYS = ['input', 'output', 'thinking', 'savedAt'];
CS.HISTORY_REQUIRED = ['id', 'type', 'at', 'input'];
CS.HISTORY_OPTIONAL = [
    'output', 'thinking', 'systemPrompt', 'systemPromptEffective',
    'contextPosition', 'activeContexts', 'usage', 'duration_ms', 'provider', 'model'
];

CS.DEFAULT_PROFILES = [
    { id: 'p001', tag: 'CorrigeGrammaire', prompt: "Corrige la grammaire, l'orthographe et la ponctuation du texte source avant de le reformuler en prompt.", active: false },
    { id: 'p002', tag: 'TonFormel', prompt: 'Adopte un ton formel et professionnel dans le prompt reformulé. Utilise un vocabulaire soutenu et une structure rigoureuse.', active: false },
    { id: 'p003', tag: 'AntiBullshit', prompt: 'Va droit au but. Pas de blabla, pas de formule de politesse, pas de transition. Contenu brut, concis, directement exploitable.', active: false }
];

var SEMVER_RE = /^\d+\.\d+\.\d+$/;
var ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isStrictBoolean(v) {
    return v === true || v === false;
}

function isIso8601(v) {
    if (typeof v !== 'string' || !ISO8601_RE.test(v)) return false;
    return !isNaN(Date.parse(v));
}

function isHttpUrl(v) {
    if (typeof v !== 'string' || !v.length) return false;
    try {
        var u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

function hasOnlyKeys(obj, allowed) {
    if (!isPlainObject(obj)) return false;
    var set = {};
    for (var i = 0; i < allowed.length; i++) set[allowed[i]] = true;
    for (var k in obj) {
        if (obj.hasOwnProperty(k) && !set[k]) return false;
    }
    return true;
}

function validateProfileTag(tag, path, errors) {
    if (window.PDM && window.PDM.Profiles && typeof window.PDM.Profiles.validateTag === 'function') {
        var err = window.PDM.Profiles.validateTag(tag);
        if (err) errors.push(path + '.tag : ' + err);
        return;
    }
    if (typeof tag !== 'string' || !/^[A-Z][a-zA-Z0-9]*$/.test(tag)) {
        errors.push(path + '.tag : tag invalide (majuscule initiale, alphanumérique, max 30 car.)');
    }
}

function getEnabledProviders() {
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getEnabledProviders === 'function') {
        return window.PDM.Env.getEnabledProviders();
    }
    return ['ollama'];
}

function getDefaultProvider() {
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getDefaultProvider === 'function') {
        return window.PDM.Env.getDefaultProvider();
    }
    return 'ollama';
}

function defaultThemeId() {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

CS.normalizeLegacyConfig = function(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    var copy = JSON.parse(JSON.stringify(data));

    if (copy.type === 'system-prompt' || copy.type === 'prompts') {
        return copy;
    }

    if (!copy.type && copy.version && copy.pdm_provider !== undefined) {
        copy.type = CS.CONFIG_TYPE;
    }

    if (copy.pdm_ollama_url === undefined && copy.pdm_endpoint !== undefined) {
        copy.pdm_ollama_url = copy.pdm_endpoint;
    }
    delete copy.pdm_endpoint;

    if (copy.pdm_token_ollama === undefined && copy.tokens && typeof copy.tokens === 'object') {
        copy.pdm_token_ollama = copy.tokens.ollama != null ? String(copy.tokens.ollama) : '';
    }
    delete copy.tokens;

    delete copy.pdm_stt_model;
    delete copy.pdm_version;

    return copy;
};

CS.buildDefaultConfig = function() {
    var history = [];
    return {
        version: CS.VERSION,
        type: CS.CONFIG_TYPE,
        exportedAt: new Date().toISOString(),
        pdm_provider: getDefaultProvider(),
        pdm_model: '',
        pdm_system_prompt: '',
        pdm_system_prompt_enabled: true,
        pdm_profiles: JSON.parse(JSON.stringify(CS.DEFAULT_PROFILES)),
        pdm_language: 'fr',
        pdm_theme: defaultThemeId(),
        pdm_history_count: 0,
        pdm_clean_history: history,
        pdm_workspace: { input: '', output: '', thinking: '', savedAt: null },
        pdm_stt_device_id: '',
        pdm_stt_engine: 'vosk-maxi',
        pdm_stt_compute: 'cpu',
        pdm_context_position: 'after_system',
        pdm_ollama_url: 'http://localhost:11434',
        pdm_llm_thinking_enabled: false,
        pdm_token_ollama: ''
    };
};

CS.validatePdmConfig = function(data) {
    var errors = [];

    if (!isPlainObject(data)) {
        return { ok: false, errors: ['La racine doit être un objet JSON.'] };
    }

    if (data.type === 'system-prompt' || data.type === 'prompts') {
        errors.push('Format « ' + data.type + ' » non supporté — seul « pdm-config » complet est accepté.');
        return { ok: false, errors: errors };
    }

    if (data.type !== CS.CONFIG_TYPE) {
        errors.push('type doit être "' + CS.CONFIG_TYPE + '".');
    }

    if (typeof data.version !== 'string' || !SEMVER_RE.test(data.version)) {
        errors.push('version doit être une chaîne semver (ex. 1.4.0).');
    }

    if (data.exportedAt !== undefined && data.exportedAt !== null) {
        if (typeof data.exportedAt !== 'string' || !isIso8601(data.exportedAt)) {
            errors.push('exportedAt doit être une date ISO 8601 valide ou être absent.');
        }
    }

    var allowedRoot = {};
    for (var rk = 0; rk < CS.REQUIRED_ROOT_KEYS.length; rk++) {
        allowedRoot[CS.REQUIRED_ROOT_KEYS[rk]] = true;
    }
    for (var key in data) {
        if (!data.hasOwnProperty(key)) continue;
        if (!allowedRoot[key]) {
            errors.push('Clé racine inconnue : ' + key + '.');
        }
    }

    for (var mi = 0; mi < CS.META_KEYS.length; mi++) {
        var mk = CS.META_KEYS[mi];
        if (mk === 'exportedAt') continue;
        if (data[mk] === undefined || data[mk] === null) {
            errors.push('Clé racine manquante : ' + mk + '.');
        }
    }

    for (var pi = 0; pi < CS.PDM_KEYS.length; pi++) {
        var pk = CS.PDM_KEYS[pi];
        if (data[pk] === undefined) {
            errors.push('Clé manquante : ' + pk + '.');
        }
    }

    if (errors.length) {
        return { ok: false, errors: errors };
    }

    var providers = getEnabledProviders();
    if (typeof data.pdm_provider !== 'string' || providers.indexOf(data.pdm_provider) === -1) {
        errors.push('pdm_provider invalide — valeurs acceptées : ' + providers.join(', ') + '.');
    }

    if (typeof data.pdm_model !== 'string') {
        errors.push('pdm_model doit être une chaîne.');
    }

    if (typeof data.pdm_ollama_url !== 'string' || !isHttpUrl(data.pdm_ollama_url)) {
        errors.push('pdm_ollama_url doit être une URL http(s) valide.');
    }

    if (typeof data.pdm_system_prompt !== 'string') {
        errors.push('pdm_system_prompt doit être une chaîne.');
    }

    if (!isStrictBoolean(data.pdm_system_prompt_enabled)) {
        errors.push('pdm_system_prompt_enabled doit être un booléen (true ou false).');
    }

    if (!isStrictBoolean(data.pdm_llm_thinking_enabled)) {
        errors.push('pdm_llm_thinking_enabled doit être un booléen (true ou false).');
    }

    if (CS.LANGUAGES.indexOf(data.pdm_language) === -1) {
        errors.push('pdm_language invalide — valeurs acceptées : fr, en.');
    }

    if (CS.THEME_IDS.indexOf(data.pdm_theme) === -1) {
        errors.push('pdm_theme invalide — valeurs acceptées : ' + CS.THEME_IDS.join(', ') + '.');
    }

    if (CS.CONTEXT_POSITIONS.indexOf(data.pdm_context_position) === -1) {
        errors.push('pdm_context_position invalide — valeurs acceptées : after_system, before_system.');
    }

    if (CS.STT_ENGINES.indexOf(data.pdm_stt_engine) === -1) {
        errors.push('pdm_stt_engine invalide — valeurs acceptées : ' + CS.STT_ENGINES.join(', ') + '.');
    }

    if (CS.STT_COMPUTE.indexOf(data.pdm_stt_compute) === -1) {
        errors.push('pdm_stt_compute invalide — valeurs acceptées : cpu, gpu.');
    }

    if (typeof data.pdm_stt_device_id !== 'string') {
        errors.push('pdm_stt_device_id doit être une chaîne.');
    }

    if (typeof data.pdm_token_ollama !== 'string') {
        errors.push('pdm_token_ollama doit être une chaîne (vide autorisée).');
    }

    if (!Array.isArray(data.pdm_profiles)) {
        errors.push('pdm_profiles doit être un tableau.');
    } else if (data.pdm_profiles.length > 999) {
        errors.push('pdm_profiles : maximum 999 profils.');
    } else {
        for (var i = 0; i < data.pdm_profiles.length; i++) {
            var prof = data.pdm_profiles[i];
            var pPath = 'pdm_profiles[' + i + ']';
            if (!isPlainObject(prof)) {
                errors.push(pPath + ' doit être un objet.');
                continue;
            }
            if (!hasOnlyKeys(prof, CS.PROFILE_KEYS)) {
                errors.push(pPath + ' : clés autorisées uniquement — id, tag, prompt, active.');
            }
            if (typeof prof.id !== 'string' || !prof.id.length) {
                errors.push(pPath + '.id doit être une chaîne non vide.');
            }
            if (typeof prof.prompt !== 'string') {
                errors.push(pPath + '.prompt doit être une chaîne.');
            }
            if (!isStrictBoolean(prof.active)) {
                errors.push(pPath + '.active doit être un booléen.');
            }
            validateProfileTag(prof.tag, pPath, errors);
        }
    }

    if (!isPlainObject(data.pdm_workspace)) {
        errors.push('pdm_workspace doit être un objet.');
    } else if (!hasOnlyKeys(data.pdm_workspace, CS.WORKSPACE_KEYS)) {
        errors.push('pdm_workspace : clés autorisées uniquement — input, output, thinking, savedAt.');
    } else {
        var ws = data.pdm_workspace;
        if (typeof ws.input !== 'string') errors.push('pdm_workspace.input doit être une chaîne.');
        if (typeof ws.output !== 'string') errors.push('pdm_workspace.output doit être une chaîne.');
        if (typeof ws.thinking !== 'string') errors.push('pdm_workspace.thinking doit être une chaîne.');
        if (ws.savedAt !== null && (typeof ws.savedAt !== 'string' || !isIso8601(ws.savedAt))) {
            errors.push('pdm_workspace.savedAt doit être null ou une date ISO 8601 valide.');
        }
    }

    if (!Array.isArray(data.pdm_clean_history)) {
        errors.push('pdm_clean_history doit être un tableau.');
    } else if (data.pdm_clean_history.length > 100) {
        errors.push('pdm_clean_history : maximum 100 entrées.');
    } else {
        var histAllowed = CS.HISTORY_REQUIRED.concat(CS.HISTORY_OPTIONAL);
        for (var hi = 0; hi < data.pdm_clean_history.length; hi++) {
            var entry = data.pdm_clean_history[hi];
            var hPath = 'pdm_clean_history[' + hi + ']';
            if (!isPlainObject(entry)) {
                errors.push(hPath + ' doit être un objet.');
                continue;
            }
            if (!hasOnlyKeys(entry, histAllowed)) {
                errors.push(hPath + ' : contient une clé non reconnue.');
            }
            for (var hr = 0; hr < CS.HISTORY_REQUIRED.length; hr++) {
                var req = CS.HISTORY_REQUIRED[hr];
                if (entry[req] === undefined || entry[req] === null) {
                    errors.push(hPath + '.' + req + ' est obligatoire.');
                }
            }
            if (typeof entry.id !== 'string' || !entry.id.length) {
                errors.push(hPath + '.id doit être une chaîne non vide.');
            }
            if (typeof entry.type !== 'string' || !entry.type.length) {
                errors.push(hPath + '.type doit être une chaîne non vide.');
            }
            if (typeof entry.at !== 'string' || !isIso8601(entry.at)) {
                errors.push(hPath + '.at doit être une date ISO 8601 valide.');
            }
            if (typeof entry.input !== 'string') {
                errors.push(hPath + '.input doit être une chaîne.');
            }
            if (entry.activeContexts !== undefined && !Array.isArray(entry.activeContexts)) {
                errors.push(hPath + '.activeContexts doit être un tableau.');
            }
            if (entry.usage !== undefined && entry.usage !== null && !isPlainObject(entry.usage)) {
                errors.push(hPath + '.usage doit être un objet ou null.');
            }
            if (entry.duration_ms !== undefined && typeof entry.duration_ms !== 'number') {
                errors.push(hPath + '.duration_ms doit être un nombre.');
            }
            if (entry.provider !== undefined) {
                if (typeof entry.provider !== 'string' || entry.provider.length > 64) {
                    errors.push(hPath + '.provider invalide (chaîne, max 64 car.).');
                } else if (/[<>&]/.test(entry.provider)) {
                    errors.push(hPath + '.provider contient des caractères interdits.');
                }
            }
            if (entry.model !== undefined) {
                if (typeof entry.model !== 'string' || entry.model.length > 128) {
                    errors.push(hPath + '.model invalide (chaîne, max 128 car.).');
                } else if (/[<>&]/.test(entry.model)) {
                    errors.push(hPath + '.model contient des caractères interdits.');
                }
            }
        }
    }

    if (typeof data.pdm_history_count !== 'number' || !Number.isInteger(data.pdm_history_count)) {
        errors.push('pdm_history_count doit être un entier.');
    } else if (Array.isArray(data.pdm_clean_history) &&
        data.pdm_history_count !== data.pdm_clean_history.length) {
        errors.push('pdm_history_count (' + data.pdm_history_count +
            ') doit être égal à la longueur de pdm_clean_history (' +
            data.pdm_clean_history.length + ').');
    }

    return { ok: errors.length === 0, errors: errors };
};

window.PDM = window.PDM || {};
window.PDM.ConfigSchema = CS;

})();
