/**
 * PromptDeMerde.com — config-schema-security.js
 *
 * Synopsis : Limites taille, anti pollution prototype et contrôles import JSON v2.
 * Objectif : Étendre PDM.ConfigSchema avec les gardes-fous sécurité import/export.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-security] PDM.ConfigSchema not found.'); return; }

CS.SECURITY_JSON_V2 = true;
CS.MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
CS.MAX_IMPORT_ZIP_BYTES = 20 * 1024 * 1024;
CS.MAX_PARSED_PAYLOAD_BYTES = 8 * 1024 * 1024;
CS.MAX_AUDIO_BLOBS_TOTAL_BYTES = 50 * 1024 * 1024;
CS.MAX_AUDIO_BLOB_REFS = 50;
CS.MAX_AUDIO_SEGMENTS_PER_REF = 500;

CS.STRING_LIMITS = {
    pdm_system_prompt: 100000,
    pdm_image_prompt: 100000,
    pdm_context_gen_system: 48000,
    pdm_context_gen_user_intent: 32000,
    pdm_context_gen_user_title: 32000,
    pdm_context_inject_header: 32000,
    pdm_context_gen_tag_intent_suffix: 16000,
    pdm_context_gen_forced_tag_system_suffix: 32000,
    pdm_context_gen_retry_system_suffix: 16000,
    pdm_context_gen_retry_user_suffix: 16000,
    pdm_context_profile_line_template: 8000,
    pdm_token_ollama: 512,
    pdm_model: 256,
    pdm_image_model: 256,
    pdm_stt_device_id: 256,
    pdm_stt_vosk_lang: 16,
    pdm_active_profile: 128,
    workspace_text: 50000,
    workspace_ui_text: 4096,
    workspace_identity: 128,
    profile_prompt: 16384,
    profile_tag: 32,
    profile_id: 128,
    history_input: 50000,
    history_output: 50000,
    history_thinking: 100000,
    audio_ref: 128,
    audio_file_name: 512
};

var _BLOCKED_KEYS = { __proto__: true, constructor: true, prototype: true };

CS._checkValueSecurity = function(value, path, errors, depth) {
    depth = depth || 0;
    if (depth > 32) {
        errors.push(path + ' : structure trop profonde.');
        return;
    }
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            CS._checkValueSecurity(value[i], path + '[' + i + ']', errors, depth + 1);
        }
        return;
    }
    if (!CS.isPlainObject(value)) {
        errors.push(path + ' : type non autorisé.');
        return;
    }
    for (var key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        if (_BLOCKED_KEYS[key]) {
            errors.push(path + ' : clé interdite « ' + key + ' ».');
            continue;
        }
        CS._checkValueSecurity(value[key], path + '.' + key, errors, depth + 1);
    }
};

CS.checkPrototypePollution = function(data) {
    var errors = [];
    CS._checkValueSecurity(data, 'racine', errors, 0);
    return errors;
};

CS.estimatePayloadBytes = function(value, depth) {
    depth = depth || 0;
    if (depth > 32) return 0;
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number' || typeof value === 'boolean') return 16;
    if (Array.isArray(value)) {
        var sum = 0;
        for (var i = 0; i < value.length; i++) {
            sum += CS.estimatePayloadBytes(value[i], depth + 1);
        }
        return sum;
    }
    if (CS.isPlainObject(value)) {
        var total = 0;
        for (var k in value) {
            if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
            total += k.length * 2;
            total += CS.estimatePayloadBytes(value[k], depth + 1);
        }
        return total;
    }
    return 0;
};

CS._failStringLength = function(value, max, path, errors) {
    if (typeof value !== 'string') return;
    if (value.length > max) {
        errors.push(path + ' dépasse ' + max + ' caractères (' + value.length + ').');
    }
};

CS.validateStringLengths = function(data, errors) {
    var L = CS.STRING_LIMITS;
    CS._failStringLength(data.pdm_system_prompt, L.pdm_system_prompt, 'pdm_system_prompt', errors);
    CS._failStringLength(data.pdm_image_prompt, L.pdm_image_prompt, 'pdm_image_prompt', errors);
    CS._failStringLength(data.pdm_token_ollama, L.pdm_token_ollama, 'pdm_token_ollama', errors);
    CS._failStringLength(data.pdm_model, L.pdm_model, 'pdm_model', errors);
    CS._failStringLength(data.pdm_image_model, L.pdm_image_model, 'pdm_image_model', errors);
    CS._failStringLength(data.pdm_stt_device_id, L.pdm_stt_device_id, 'pdm_stt_device_id', errors);
    CS._failStringLength(data.pdm_stt_vosk_lang, L.pdm_stt_vosk_lang, 'pdm_stt_vosk_lang', errors);
    CS._failStringLength(data.pdm_active_profile, L.pdm_active_profile, 'pdm_active_profile', errors);
    CS._failStringLength(data.pdm_context_gen_system, L.pdm_context_gen_system, 'pdm_context_gen_system', errors);
    CS._failStringLength(data.pdm_context_gen_user_intent, L.pdm_context_gen_user_intent, 'pdm_context_gen_user_intent', errors);
    CS._failStringLength(data.pdm_context_gen_user_title, L.pdm_context_gen_user_title, 'pdm_context_gen_user_title', errors);
    CS._failStringLength(data.pdm_context_inject_header, L.pdm_context_inject_header, 'pdm_context_inject_header', errors);
    CS._failStringLength(data.pdm_context_gen_tag_intent_suffix, L.pdm_context_gen_tag_intent_suffix, 'pdm_context_gen_tag_intent_suffix', errors);
    CS._failStringLength(data.pdm_context_gen_forced_tag_system_suffix, L.pdm_context_gen_forced_tag_system_suffix, 'pdm_context_gen_forced_tag_system_suffix', errors);
    CS._failStringLength(data.pdm_context_gen_retry_system_suffix, L.pdm_context_gen_retry_system_suffix, 'pdm_context_gen_retry_system_suffix', errors);
    CS._failStringLength(data.pdm_context_gen_retry_user_suffix, L.pdm_context_gen_retry_user_suffix, 'pdm_context_gen_retry_user_suffix', errors);
    CS._failStringLength(data.pdm_context_profile_line_template, L.pdm_context_profile_line_template, 'pdm_context_profile_line_template', errors);

    if (CS.isPlainObject(data.pdm_workspace)) {
        var ws = data.pdm_workspace;
        CS._failStringLength(ws.input, L.workspace_text, 'pdm_workspace.input', errors);
        CS._failStringLength(ws.output, L.workspace_text, 'pdm_workspace.output', errors);
        CS._failStringLength(ws.thinking, L.workspace_text, 'pdm_workspace.thinking', errors);
        CS._failStringLength(ws.audioFileName, L.audio_file_name, 'pdm_workspace.audioFileName', errors);
        CS._failStringLength(ws.audioRef, L.audio_ref, 'pdm_workspace.audioRef', errors);
    }

    if (CS.isPlainObject(data.pdm_workspace_ui)) {
        var wui = data.pdm_workspace_ui;
        if (CS.isPlainObject(wui.identity)) {
            CS._failStringLength(wui.identity.username, L.workspace_identity, 'pdm_workspace_ui.identity.username', errors);
            CS._failStringLength(wui.identity.hostname, L.workspace_identity, 'pdm_workspace_ui.identity.hostname', errors);
            CS._failStringLength(wui.identity.usernameAlt, L.workspace_identity, 'pdm_workspace_ui.identity.usernameAlt', errors);
        }
        if (CS.isPlainObject(wui.texts)) {
            for (var tk in wui.texts) {
                if (!wui.texts.hasOwnProperty(tk)) continue;
                CS._failStringLength(wui.texts[tk], L.workspace_ui_text, 'pdm_workspace_ui.texts.' + tk, errors);
                if (tk === 'promptGuardHtml' && CS.containsDangerousWorkspaceHtml(wui.texts[tk])) {
                    errors.push('pdm_workspace_ui.texts.promptGuardHtml contient du HTML non autorisé (script, événement inline, javascript:).');
                }
            }
        }
    }

    if (Array.isArray(data.pdm_profiles)) {
        for (var pi = 0; pi < data.pdm_profiles.length; pi++) {
            var prof = data.pdm_profiles[pi];
            var pPath = 'pdm_profiles[' + pi + ']';
            if (!prof || typeof prof !== 'object') continue;
            CS._failStringLength(prof.id, L.profile_id, pPath + '.id', errors);
            CS._failStringLength(prof.tag, L.profile_tag, pPath + '.tag', errors);
            CS._failStringLength(prof.prompt, L.profile_prompt, pPath + '.prompt', errors);
        }
    }

    if (Array.isArray(data.pdm_clean_history)) {
        for (var hi = 0; hi < data.pdm_clean_history.length; hi++) {
            var entry = data.pdm_clean_history[hi];
            var hPath = 'pdm_clean_history[' + hi + ']';
            if (!entry || typeof entry !== 'object') continue;
            CS._failStringLength(entry.input, L.history_input, hPath + '.input', errors);
            if (entry.output !== undefined) CS._failStringLength(entry.output, L.history_output, hPath + '.output', errors);
            if (entry.thinking !== undefined) CS._failStringLength(entry.thinking, L.history_thinking, hPath + '.thinking', errors);
            if (entry.audioFileName !== undefined) CS._failStringLength(entry.audioFileName, L.audio_file_name, hPath + '.audioFileName', errors);
            if (entry.audioRef !== undefined) CS._failStringLength(entry.audioRef, L.audio_ref, hPath + '.audioRef', errors);
        }
    }
};

CS.validateAudioBlobsSecurity = function(audioBlobs, errors) {
    if (!CS.isPlainObject(audioBlobs)) return;
    var refs = Object.keys(audioBlobs);
    if (refs.length > CS.MAX_AUDIO_BLOB_REFS) {
        errors.push('pdm_audio_blobs : maximum ' + CS.MAX_AUDIO_BLOB_REFS + ' enregistrements.');
        return;
    }
    var totalBase64 = 0;
    for (var i = 0; i < refs.length; i++) {
        var audioRef = refs[i];
        if (typeof audioRef !== 'string' || !audioRef.length) {
            errors.push('pdm_audio_blobs : clé audioRef invalide.');
            continue;
        }
        CS._failStringLength(audioRef, CS.STRING_LIMITS.audio_ref, 'pdm_audio_blobs[' + audioRef + ']', errors);
        var entry = audioBlobs[audioRef];
        if (!CS.isPlainObject(entry) || !Array.isArray(entry.segments)) {
            errors.push('pdm_audio_blobs[' + audioRef + '] : format invalide (objet segments requis).');
            continue;
        }
        if (entry.segments.length > CS.MAX_AUDIO_SEGMENTS_PER_REF) {
            errors.push('pdm_audio_blobs[' + audioRef + '] : trop de segments (max ' + CS.MAX_AUDIO_SEGMENTS_PER_REF + ').');
        }
        for (var s = 0; s < entry.segments.length; s++) {
            var seg = entry.segments[s];
            var segPath = 'pdm_audio_blobs[' + audioRef + '].segments[' + s + ']';
            if (!CS.isPlainObject(seg) || typeof seg.base64 !== 'string' || !seg.base64.length) {
                errors.push(segPath + ' : base64 requis.');
                continue;
            }
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(seg.base64)) {
                errors.push(segPath + ' : base64 invalide.');
            }
            totalBase64 += seg.base64.length;
        }
    }
    if (totalBase64 > CS.MAX_AUDIO_BLOBS_TOTAL_BYTES) {
        errors.push('pdm_audio_blobs : taille totale base64 > ' + Math.round(CS.MAX_AUDIO_BLOBS_TOTAL_BYTES / 1024 / 1024) + ' Mo.');
    }
};

CS.runImportSecurityChecks = function(data) {
    var errors = [];
    if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Données invalides.'] };
    }
    var pollution = CS.checkPrototypePollution(data);
    if (pollution.length) errors = errors.concat(pollution);
    var payloadBytes = CS.estimatePayloadBytes(data);
    if (payloadBytes > CS.MAX_PARSED_PAYLOAD_BYTES) {
        errors.push('Payload JSON trop volumineux (~' + Math.round(payloadBytes / 1024 / 1024) + ' Mo, max ' +
            Math.round(CS.MAX_PARSED_PAYLOAD_BYTES / 1024 / 1024) + ' Mo).');
    }
    return { ok: errors.length === 0, errors: errors, payloadBytes: payloadBytes };
};

})();
