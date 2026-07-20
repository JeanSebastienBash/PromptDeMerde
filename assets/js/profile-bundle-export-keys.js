/**
 * PromptDeMerde.com — profile-bundle-export-keys.js
 *
 * Synopsis : Clés session/config et indices MD export ZIP.
 * Objectif : Étendre ProfileBundleExport avec buildManifest/Index et écriture MD.
 */
(function() {

window.PDM = window.PDM || {};
var PBE = window.PDM.ProfileBundleExport = window.PDM.ProfileBundleExport || {};
var PB = window.PDM && window.PDM.ProfileBundle;
var CS = window.PDM && window.PDM.ConfigSchema;

PBE.SESSION_KEYS = [
    'pdm_provider', 'pdm_model', 'pdm_image_model', 'pdm_ollama_url', 'pdm_token_ollama',
    'pdm_llm_thinking_enabled', 'pdm_llm_thinking_max_chars', 'pdm_llm_temperature',
    'pdm_llm_max_tokens', 'pdm_llm_timeout_sec', 'pdm_language',
    'pdm_history_count', 'pdm_clean_history', 'pdm_workspace', 'pdm_audio_blobs'
];

PBE.CONFIG_KEYS = [
    'version', 'type', 'exportedAt',
    'pdm_system_prompt_enabled', 'pdm_theme',
    'pdm_image_prompt',
    'pdm_stt_device_id', 'pdm_stt_engine', 'pdm_stt_compute', 'pdm_stt_insert_at_cursor',
    'pdm_stt_delete_word_enabled', 'pdm_stt_delete_word_shortcut', 'pdm_stt_delete_word_target',
    'pdm_stt_vosk_lang',
    'pdm_context_position',
    'pdm_context_gen_max_tokens', 'pdm_context_gen_temperature', 'pdm_context_gen_retry_temperature',
    'pdm_context_gen_max_retries', 'pdm_context_gen_json_schema',
    'pdm_output_json_enabled', 'pdm_output_json_schema',
    'pdm_output_json_key_pattern', 'pdm_output_json_value_schema',
    'pdm_output_display_format',
    'pdm_active_profile', 'pdm_project', 'pdm_workspace_ui'
];

PBE.GEN_PROMPT_CONFIG_KEYS = PB && PB.GEN_PROMPT_STORAGE_KEYS
    ? PB.GEN_PROMPT_STORAGE_KEYS.slice()
    : [
        'pdm_context_gen_system', 'pdm_context_gen_user_intent', 'pdm_context_gen_user_title',
        'pdm_context_inject_header', 'pdm_context_gen_tag_intent_suffix',
        'pdm_context_gen_forced_tag_system_suffix', 'pdm_context_gen_retry_system_suffix',
        'pdm_context_gen_retry_user_suffix', 'pdm_context_profile_line_template'
    ];

PBE.buildManifest = function(label, profileId) {
    var S = window.PDM && window.PDM.Storage;
    var project = S && S.getProjectEffective ? S.getProjectEffective() : null;
    return {
        id: String(profileId || 'custom-profile'),
        label: String(label || 'MonProfil'),
        synopsis: '',
        project: project ? JSON.parse(JSON.stringify(project)) : {
            platform_url: 'https://promptdemerde.com',
            name: String(label || 'MonProfil'),
            url: 'https://promptdemerde.com',
            vitrine_url: 'https://dreamproject.online'
        }
    };
};

PBE.buildPromptsIndex = function(profiles, systemEnabled) {
    var contexts = [];
    var list = Array.isArray(profiles) ? profiles : [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.tag) continue;
        contexts.push({
            id: String(p.id || ('c' + String(i + 1).padStart(3, '0'))),
            tag: String(p.tag),
            active: !!p.active,
            pathTemplate: PB ? PB.CONTEXT_PATH_TEMPLATE : 'contexts/{locale}/{tag}.md'
        });
    }
    return {
        version: '1.0.0',
        type: 'pdm-profile-prompts',
        system: {
            enabled: systemEnabled !== false,
            pathTemplate: PB ? PB.SYSTEM_PATH_TEMPLATE : 'prompts/{locale}/system.md'
        },
        contexts: contexts
    };
};

PBE.buildLocalesIndex = function(promptLocales, defaultLocale) {
    var locales = Array.isArray(promptLocales) && promptLocales.length ? promptLocales.slice() : ['fr'];
    var def = String(defaultLocale || locales[0] || 'fr');
    if (locales.indexOf(def) < 0) def = locales[0];
    if (PB && typeof PB.buildDefaultLocalesIndex === 'function') {
        return PB.buildDefaultLocalesIndex(locales, def);
    }
    return {
        version: '1.0.0',
        type: 'pdm-profile-locales',
        defaultLocale: def,
        locales: locales
    };
};

PBE.writeGenPromptMdFiles = function(files, locale, genValues) {
    locale = String(locale || 'fr');
    genValues = genValues && typeof genValues === 'object' ? genValues : {};
    var specs = PB && PB.GEN_PROMPT_SPECS ? PB.GEN_PROMPT_SPECS : [];
    for (var i = 0; i < specs.length; i++) {
        var spec = specs[i];
        if (!spec || !spec.fileName || !spec.storageKey) continue;
        var rel = (PB && PB.GEN_PROMPT_DIR ? PB.GEN_PROMPT_DIR : 'gen-prompts') + '/' + locale + '/' + spec.fileName;
        files[rel] = String(genValues[spec.storageKey] != null ? genValues[spec.storageKey] : '').trim() + '\n';
    }
};

PBE.collectGenPromptValues = function(S, locData) {
    var out = {};
    var specs = PB && PB.GEN_PROMPT_SPECS ? PB.GEN_PROMPT_SPECS : [];
    for (var i = 0; i < specs.length; i++) {
        var key = specs[i].storageKey;
        if (locData && locData.gen && locData.gen[key] != null) {
            out[key] = String(locData.gen[key]);
            continue;
        }
        var getter = PBE._genPromptGetter(S, key);
        out[key] = getter ? String(getter()) : '';
    }
    return out;
};

PBE._genPromptGetter = function(S, storageKey) {
    if (!S) return null;
    var GPS = window.PDM && window.PDM.GenPromptSpecs;
    var fn = GPS && typeof GPS.storageGetterName === 'function'
        ? GPS.storageGetterName(storageKey)
        : null;
    return fn && typeof S[fn] === 'function' ? S[fn]() : null;
};

PBE.buildGenPromptsIndex = function() {
    if (PB && typeof PB.buildDefaultGenPromptsIndex === 'function') {
        return PB.buildDefaultGenPromptsIndex();
    }
    return { version: '1.0.0', type: 'pdm-profile-gen-prompts', templates: [] };
};

PBE.writePromptMdFiles = function(files, locale, systemPrompt, profiles) {
    locale = String(locale || 'fr');
    var sysPath = 'prompts/' + locale + '/system.md';
    files[sysPath] = String(systemPrompt || '').trim() + '\n';
    var list = Array.isArray(profiles) ? profiles : [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.tag) continue;
        var ctxPath = 'contexts/' + locale + '/' + String(p.tag) + '.md';
        files[ctxPath] = String(p.prompt || '').trim() + '\n';
    }
};

PBE.profilesAlignedToIndex = function(wantedProfiles, locProfiles) {
    var wanted = Array.isArray(wantedProfiles) ? wantedProfiles : [];
    if (!wanted.length) return [];
    var byTag = {};
    var list = Array.isArray(locProfiles) ? locProfiles : [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (p && p.tag) byTag[String(p.tag)] = p;
    }
    var out = [];
    for (var j = 0; j < wanted.length; j++) {
        var w = wanted[j];
        if (!w || !w.tag) continue;
        out.push(byTag[String(w.tag)] || w);
    }
    return out;
};


})();
