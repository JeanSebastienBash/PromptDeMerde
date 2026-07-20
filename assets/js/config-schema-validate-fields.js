/**
 * PromptDeMerde.com — config-schema-validate-fields.js
 *
 * Synopsis : Validation des champs scalaires et de l'UI workspace de pdm-config.
 * Objectif : Étendre PDM.ConfigSchema avec _validateScalarFields et _validateGenAndUiFields (appelés par validatePdmConfig).
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate-fields] PDM.ConfigSchema not found.'); return; }

CS._validateScalarFields = function(data, errors) {
    var providers = CS.getEnabledProviders();
    if (typeof data.pdm_provider !== 'string' || providers.indexOf(data.pdm_provider) === -1) {
        errors.push('pdm_provider invalide — valeurs acceptées : ' + providers.join(', ') + '.');
    }

    if (typeof data.pdm_model !== 'string') {
        errors.push('pdm_model doit être une chaîne.');
    }

    if (typeof data.pdm_image_model !== 'string') {
        errors.push('pdm_image_model doit être une chaîne.');
    } else if (Array.isArray(CS.IMAGE_VISION_MODELS) && CS.IMAGE_VISION_MODELS.indexOf(data.pdm_image_model) < 0) {
        errors.push('pdm_image_model invalide — valeurs acceptées : ' + CS.IMAGE_VISION_MODELS.join(', ') + '.');
    }

    if (typeof data.pdm_image_prompt !== 'string') {
        errors.push('pdm_image_prompt doit être une chaîne.');
    } else if (!data.pdm_image_prompt.trim()) {
        errors.push('pdm_image_prompt ne peut pas être vide.');
    }

    if (typeof data.pdm_ollama_url !== 'string' || !CS.isHttpUrl(data.pdm_ollama_url)) {
        errors.push('pdm_ollama_url doit être une URL http(s) valide.');
    }

    if (typeof data.pdm_system_prompt !== 'string') {
        errors.push('pdm_system_prompt doit être une chaîne.');
    }

    if (!CS.isStrictBoolean(data.pdm_system_prompt_enabled)) {
        errors.push('pdm_system_prompt_enabled doit être un booléen (true ou false).');
    }

    if (!CS.isStrictBoolean(data.pdm_llm_thinking_enabled)) {
        errors.push('pdm_llm_thinking_enabled doit être un booléen (true ou false).');
    }

    if (typeof data.pdm_llm_thinking_max_chars !== 'number' || !Number.isInteger(data.pdm_llm_thinking_max_chars)) {
        errors.push('pdm_llm_thinking_max_chars doit être un entier.');
    } else if (data.pdm_llm_thinking_max_chars < 0 || data.pdm_llm_thinking_max_chars > 100000) {
        errors.push('pdm_llm_thinking_max_chars doit être entre 0 et 100000 (0 = illimité).');
    }

    if (data.pdm_llm_temperature !== null && data.pdm_llm_temperature !== undefined) {
        if (typeof data.pdm_llm_temperature !== 'number' || !Number.isFinite(data.pdm_llm_temperature)) {
            errors.push('pdm_llm_temperature doit être un nombre (0 = défaut).');
        } else if (data.pdm_llm_temperature < 0 || data.pdm_llm_temperature > 2) {
            errors.push('pdm_llm_temperature doit être entre 0 et 2.');
        }
    }

    if (data.pdm_llm_max_tokens !== null && data.pdm_llm_max_tokens !== undefined) {
        if (typeof data.pdm_llm_max_tokens !== 'number' || !Number.isInteger(data.pdm_llm_max_tokens)) {
            errors.push('pdm_llm_max_tokens doit être un entier (0 = défaut).');
        } else if (data.pdm_llm_max_tokens < 0 || data.pdm_llm_max_tokens > 32768) {
            errors.push('pdm_llm_max_tokens doit être entre 0 et 32768 (0 = illimité).');
        }
    }

    if (typeof data.pdm_llm_timeout_sec !== 'number' || !Number.isInteger(data.pdm_llm_timeout_sec)) {
        errors.push('pdm_llm_timeout_sec doit être un entier.');
    } else if (data.pdm_llm_timeout_sec < 0 || data.pdm_llm_timeout_sec > 86400) {
        errors.push('pdm_llm_timeout_sec doit être entre 0 et 86400 (0 = illimité).');
    }

    if (typeof data.pdm_language !== 'string' || !String(data.pdm_language).trim()) {
        errors.push('pdm_language doit être une chaîne non vide.');
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

    if (!CS.isStrictBoolean(data.pdm_stt_insert_at_cursor)) {
        errors.push('pdm_stt_insert_at_cursor doit être un booléen (true ou false).');
    }

    if (data.pdm_stt_delete_word_enabled !== undefined && !CS.isStrictBoolean(data.pdm_stt_delete_word_enabled)) {
        errors.push('pdm_stt_delete_word_enabled doit être un booléen (true ou false).');
    }

    if (data.pdm_stt_delete_word_shortcut !== undefined
        && CS.STT_DELETE_WORD_SHORTCUTS.indexOf(data.pdm_stt_delete_word_shortcut) === -1) {
        errors.push('pdm_stt_delete_word_shortcut invalide — valeurs acceptées : ' + CS.STT_DELETE_WORD_SHORTCUTS.join(', ') + '.');
    }

    if (data.pdm_stt_delete_word_target !== undefined
        && CS.STT_DELETE_WORD_TARGETS.indexOf(data.pdm_stt_delete_word_target) === -1) {
        errors.push('pdm_stt_delete_word_target invalide — valeurs acceptées : ' + CS.STT_DELETE_WORD_TARGETS.join(', ') + '.');
    }

    if (typeof data.pdm_stt_device_id !== 'string') {
        errors.push('pdm_stt_device_id doit être une chaîne.');
    }

    if (data.pdm_stt_vosk_lang !== undefined) {
        if (typeof data.pdm_stt_vosk_lang !== 'string' || CS.STT_VOSK_LANGS.indexOf(data.pdm_stt_vosk_lang) === -1) {
            errors.push('pdm_stt_vosk_lang invalide — valeurs acceptées : ' + CS.STT_VOSK_LANGS.join(', ') + '.');
        }
    }

    if (typeof data.pdm_token_ollama !== 'string') {
        errors.push('pdm_token_ollama doit être une chaîne (vide autorisée).');
    }

    if (typeof data.pdm_context_gen_system !== 'string') {
        errors.push('pdm_context_gen_system doit être une chaîne.');
    } else if (!data.pdm_context_gen_system.trim()) {
        errors.push('pdm_context_gen_system ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_user_intent !== 'string') {
        errors.push('pdm_context_gen_user_intent doit être une chaîne.');
    } else if (!data.pdm_context_gen_user_intent.trim()) {
        errors.push('pdm_context_gen_user_intent ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_user_title !== 'string') {
        errors.push('pdm_context_gen_user_title doit être une chaîne.');
    } else if (!data.pdm_context_gen_user_title.trim()) {
        errors.push('pdm_context_gen_user_title ne peut pas être vide.');
    }

    if (typeof data.pdm_context_inject_header !== 'string') {
        errors.push('pdm_context_inject_header doit être une chaîne.');
    } else if (!data.pdm_context_inject_header.trim()) {
        errors.push('pdm_context_inject_header ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_tag_intent_suffix !== 'string') {
        errors.push('pdm_context_gen_tag_intent_suffix doit être une chaîne.');
    } else if (!data.pdm_context_gen_tag_intent_suffix.trim()) {
        errors.push('pdm_context_gen_tag_intent_suffix ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_forced_tag_system_suffix !== 'string') {
        errors.push('pdm_context_gen_forced_tag_system_suffix doit être une chaîne.');
    } else if (!data.pdm_context_gen_forced_tag_system_suffix.trim()) {
        errors.push('pdm_context_gen_forced_tag_system_suffix ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_retry_system_suffix !== 'string') {
        errors.push('pdm_context_gen_retry_system_suffix doit être une chaîne.');
    } else if (!data.pdm_context_gen_retry_system_suffix.trim()) {
        errors.push('pdm_context_gen_retry_system_suffix ne peut pas être vide.');
    }
    if (typeof data.pdm_context_gen_retry_user_suffix !== 'string') {
        errors.push('pdm_context_gen_retry_user_suffix doit être une chaîne.');
    } else if (!data.pdm_context_gen_retry_user_suffix.trim()) {
        errors.push('pdm_context_gen_retry_user_suffix ne peut pas être vide.');
    }
    if (typeof data.pdm_active_profile !== 'string') {
        errors.push('pdm_active_profile doit être une chaîne.');
    } else if (!data.pdm_active_profile.trim()) {
        errors.push('pdm_active_profile ne peut pas être vide.');
    }
};

CS._validateGenAndUiFields = function(data, errors) {
    if (data.pdm_project !== undefined) {
        if (!CS.isPlainObject(data.pdm_project)) {
            errors.push('pdm_project doit être un objet.');
        } else {
            var projKeys = ['platform_url', 'name', 'url', 'vitrine_url'];
            for (var pj = 0; pj < projKeys.length; pj++) {
                var pk = projKeys[pj];
                if (typeof data.pdm_project[pk] !== 'string' || !data.pdm_project[pk].trim()) {
                    errors.push('pdm_project.' + pk + ' doit être une chaîne non vide.');
                }
            }
        }
    }

    if (typeof data.pdm_context_profile_line_template !== 'string') {
        errors.push('pdm_context_profile_line_template doit être une chaîne.');
    } else if (!data.pdm_context_profile_line_template.trim()) {
        errors.push('pdm_context_profile_line_template ne peut pas être vide.');
    }

    if (typeof data.pdm_context_gen_max_tokens !== 'number' || !Number.isInteger(data.pdm_context_gen_max_tokens)) {
        errors.push('pdm_context_gen_max_tokens doit être un entier.');
    } else if (data.pdm_context_gen_max_tokens < 1 || data.pdm_context_gen_max_tokens > 8192) {
        errors.push('pdm_context_gen_max_tokens doit être entre 1 et 8192.');
    }

    if (typeof data.pdm_context_gen_temperature !== 'number' || !Number.isFinite(data.pdm_context_gen_temperature)) {
        errors.push('pdm_context_gen_temperature doit être un nombre.');
    } else if (data.pdm_context_gen_temperature < 0 || data.pdm_context_gen_temperature > 2) {
        errors.push('pdm_context_gen_temperature doit être entre 0 et 2.');
    }

    if (typeof data.pdm_context_gen_retry_temperature !== 'number' || !Number.isFinite(data.pdm_context_gen_retry_temperature)) {
        errors.push('pdm_context_gen_retry_temperature doit être un nombre.');
    } else if (data.pdm_context_gen_retry_temperature < 0 || data.pdm_context_gen_retry_temperature > 2) {
        errors.push('pdm_context_gen_retry_temperature doit être entre 0 et 2.');
    }

    if (typeof data.pdm_context_gen_max_retries !== 'number' || !Number.isInteger(data.pdm_context_gen_max_retries)) {
        errors.push('pdm_context_gen_max_retries doit être un entier.');
    } else if (data.pdm_context_gen_max_retries < 0 || data.pdm_context_gen_max_retries > 10) {
        errors.push('pdm_context_gen_max_retries doit être entre 0 et 10.');
    }

    if (!CS.isPlainObject(data.pdm_context_gen_json_schema)) {
        errors.push('pdm_context_gen_json_schema doit être un objet JSON Schema.');
    }

    if (data.pdm_output_json_enabled !== undefined && !CS.isStrictBoolean(data.pdm_output_json_enabled)) {
        errors.push('pdm_output_json_enabled doit être un booléen.');
    }
    if (data.pdm_output_json_schema !== undefined && data.pdm_output_json_schema !== null
        && !CS.isPlainObject(data.pdm_output_json_schema)) {
        errors.push('pdm_output_json_schema doit être un objet JSON Schema ou null.');
    }
    if (data.pdm_output_json_enabled === true && !CS.isPlainObject(data.pdm_output_json_schema)) {
        errors.push('pdm_output_json_enabled=true exige pdm_output_json_schema objet.');
    }
    if (data.pdm_output_json_key_pattern !== undefined && data.pdm_output_json_key_pattern !== null
        && typeof data.pdm_output_json_key_pattern !== 'string') {
        errors.push('pdm_output_json_key_pattern doit être une chaîne ou null.');
    }
    if (data.pdm_output_json_value_schema !== undefined && data.pdm_output_json_value_schema !== null
        && !CS.isPlainObject(data.pdm_output_json_value_schema)) {
        errors.push('pdm_output_json_value_schema doit être un objet JSON Schema ou null.');
    }
    if (data.pdm_output_display_format !== undefined && data.pdm_output_display_format !== null) {
        var fmtOk = data.pdm_output_display_format === 'text'
            || data.pdm_output_display_format === 'json'
            || data.pdm_output_display_format === 'html';
        if (!fmtOk) {
            errors.push('pdm_output_display_format doit être "text", "json" ou "html".');
        }
    }

    if (!CS.isPlainObject(data.pdm_audio_blobs)) {
        errors.push('pdm_audio_blobs doit être un objet.');
    } else if (typeof CS.validateAudioBlobsSecurity === 'function') {
        CS.validateAudioBlobsSecurity(data.pdm_audio_blobs, errors);
    }

    if (!CS.isPlainObject(data.pdm_workspace_ui)) {
        errors.push('pdm_workspace_ui doit être un objet.');
    } else {
        var wui = data.pdm_workspace_ui;
        var wuiAllowed = { identity: true, brand: true, texts: true };
        for (var wk in wui) {
            if (wui.hasOwnProperty(wk) && !wuiAllowed[wk]) {
                errors.push('pdm_workspace_ui : clé inconnue — ' + wk + '.');
            }
        }
        if (wui.identity !== undefined) {
            if (!CS.isPlainObject(wui.identity)) {
                errors.push('pdm_workspace_ui.identity doit être un objet.');
            } else if (!CS.hasOnlyKeys(wui.identity, CS.WORKSPACE_UI_IDENTITY_KEYS)) {
                errors.push('pdm_workspace_ui.identity : clés autorisées — ' + CS.WORKSPACE_UI_IDENTITY_KEYS.join(', ') + '.');
            } else {
                for (var wi = 0; wi < CS.WORKSPACE_UI_IDENTITY_KEYS.length; wi++) {
                    var wik = CS.WORKSPACE_UI_IDENTITY_KEYS[wi];
                    if (wui.identity[wik] !== undefined && typeof wui.identity[wik] !== 'string') {
                        errors.push('pdm_workspace_ui.identity.' + wik + ' doit être une chaîne.');
                    }
                }
                if (typeof wui.identity.username !== 'string' || !wui.identity.username.trim()) {
                    errors.push('pdm_workspace_ui.identity.username ne peut pas être vide.');
                }
                if (typeof wui.identity.hostname !== 'string' || !wui.identity.hostname.trim()) {
                    errors.push('pdm_workspace_ui.identity.hostname ne peut pas être vide.');
                }
            }
        }
        if (wui.brand !== undefined) {
            if (!CS.isPlainObject(wui.brand)) {
                errors.push('pdm_workspace_ui.brand doit être un objet.');
            } else if (!CS.hasOnlyKeys(wui.brand, CS.WORKSPACE_UI_BRAND_KEYS)) {
                errors.push('pdm_workspace_ui.brand : clés autorisées — ' + CS.WORKSPACE_UI_BRAND_KEYS.join(', ') + '.');
            } else {
                var wordMax = CS.WORKSPACE_UI_BRAND_WORD_MAX || 32;
                var wordKeys = { firstWord: true, secondWord: true };
                for (var wb = 0; wb < CS.WORKSPACE_UI_BRAND_KEYS.length; wb++) {
                    var wbk = CS.WORKSPACE_UI_BRAND_KEYS[wb];
                    if (wui.brand[wbk] === undefined) continue;
                    if (wbk === 'showExtension') {
                        if (!CS.isStrictBoolean(wui.brand.showExtension)) {
                            errors.push('pdm_workspace_ui.brand.showExtension doit être un booléen.');
                        }
                    } else if (wbk === 'firstWordColor' || wbk === 'secondWordColor') {
                        if (typeof CS.isBrandHexColor === 'function') {
                            if (!CS.isBrandHexColor(wui.brand[wbk])) {
                                errors.push('pdm_workspace_ui.brand.' + wbk + ' doit être "" ou un hex #RGB / #RRGGBB.');
                            }
                        } else if (typeof wui.brand[wbk] !== 'string') {
                            errors.push('pdm_workspace_ui.brand.' + wbk + ' doit être une chaîne.');
                        }
                    } else if (typeof wui.brand[wbk] !== 'string') {
                        errors.push('pdm_workspace_ui.brand.' + wbk + ' doit être une chaîne.');
                    } else if (wordKeys[wbk]) {
                        var word = String(wui.brand[wbk]).trim();
                        if (!word) {
                            errors.push('pdm_workspace_ui.brand.' + wbk + ' ne peut pas être vide.');
                        } else if (word.length > wordMax) {
                            errors.push('pdm_workspace_ui.brand.' + wbk + ' : max ' + wordMax + ' caractères.');
                        }
                    } else if (String(wui.brand[wbk]).length > wordMax &&
                        (wbk === 'extension' || wbk === 'firstWordClass' || wbk === 'secondWordClass' || wbk === 'extensionClass')) {
                        errors.push('pdm_workspace_ui.brand.' + wbk + ' : max ' + wordMax + ' caractères.');
                    }
                }
            }
        }
        if (wui.texts !== undefined) {
            if (!CS.isPlainObject(wui.texts)) {
                errors.push('pdm_workspace_ui.texts doit être un objet.');
            } else {
                for (var wt in wui.texts) {
                    if (!wui.texts.hasOwnProperty(wt)) continue;
                    if (CS.WORKSPACE_UI_TEXT_KEYS.indexOf(wt) === -1) {
                        errors.push('pdm_workspace_ui.texts : clé inconnue — ' + wt + '.');
                    } else if (typeof wui.texts[wt] !== 'string') {
                        errors.push('pdm_workspace_ui.texts.' + wt + ' doit être une chaîne.');
                    }
                }
            }
        }
    }
};

CS._validateOptionalI18n = function(data, errors) {
    var hasI18n = data.i18n !== undefined && data.i18n !== null;
    var hasLangs = data.langs !== undefined && data.langs !== null;
    if (!hasI18n && !hasLangs) return;
    if (hasI18n !== hasLangs) {
        errors.push('i18n et langs doivent être présents ensemble ou absents tous les deux.');
        return;
    }
    if (!Array.isArray(data.langs)) {
        errors.push('langs doit être un tableau.');
        return;
    }
    if (data.langs.length < 1 || data.langs.length > CS.MAX_I18N_LANGS) {
        errors.push('langs doit contenir entre 1 et ' + CS.MAX_I18N_LANGS + ' codes.');
    }
    if (!CS.isPlainObject(data.i18n)) {
        errors.push('i18n doit être un objet.');
        return;
    }
    for (var i = 0; i < data.langs.length; i++) {
        var code = data.langs[i];
        if (typeof code !== 'string' || !code.trim()) {
            errors.push('langs[' + i + '] doit être un code langue non vide.');
            continue;
        }
        if (!CS.isPlainObject(data.i18n[code])) {
            errors.push('i18n.' + code + ' doit être un objet dictionnaire.');
        }
    }
};

})();
