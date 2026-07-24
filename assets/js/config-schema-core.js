/**
 * PromptDeMerde.com — config-schema-core.js
 *
 * Synopsis : Constantes schéma pdm-config, clés et valeurs par défaut.
 * Objectif : Créer PDM.ConfigSchema (CS) et ses constantes ; helpers dans config-schema-helpers.js, build/normalisation dans config-schema-build.js.
 */
(function() {

var CS = {};

CS.VERSION = '1.24.2';

CS.CONFIG_TYPE = 'pdm-config';
CS.DEFAULT_ACTIVE_PROFILE = '';

CS.DEFAULT_THEME_ID = 'marron-day';

CS.resolveDefaultActiveProfile = function() {
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getBootProfileId === 'function') {
        var boot = I.getBootProfileId();
        if (boot) return boot;
    }
    if (I && typeof I.getBootManifest === 'function') {
        var manifest = I.getBootManifest();
        if (manifest && manifest.defaultProfileId) return String(manifest.defaultProfileId);
    }
    return CS.DEFAULT_ACTIVE_PROFILE || '';
};
CS.DEFAULT_PLATFORM_URL = 'https://promptdemerde.com';
CS.MAX_PROFILE_SYNOPSIS_LEN = 100;
CS.DEFAULT_PROFILE_SYNOPSIS = 'Sniperise les prompts — corriger, optimiser et structurer le texte.';

CS.STT_ENGINES = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
CS.IMAGE_VISION_MODELS = [
    'moondream',
    'llava-phi3',
    'bakllava',
    'minicpm-v',
    'qwen2.5-vl:3b',
    'llava:7b',
    'llama3.2-vision:11b',
    'granite3.2-vision'
];
CS.DEFAULT_IMAGE_MODEL = 'moondream';

/** Familles / motifs vision — exclus des sélecteurs LLM texte (règle immuable). */
CS.IMAGE_VISION_NAME_RE = /(?:^|[/_\-])(?:moondream|llava|bakllava|minicpm-v|minicpm_v|granite\d*(?:\.\d+)?-vision|llama\d*(?:\.\d+)?-vision|qwen\d*(?:\.\d+)?-vl|.*-vision|.*-vl)(?:$|[/_\-:])/i;

CS.normalizeModelBaseId = function(id) {
    var raw = String(id || '').trim().toLowerCase();
    if (!raw) return '';
    var slash = raw.lastIndexOf('/');
    if (slash >= 0) raw = raw.slice(slash + 1);
    var colon = raw.indexOf(':');
    if (colon >= 0) raw = raw.slice(0, colon);
    return raw;
};

CS.isVisionModelId = function(id) {
    var raw = String(id || '').trim().toLowerCase();
    if (!raw) return false;
    var base = CS.normalizeModelBaseId(raw);
    var list = CS.IMAGE_VISION_MODELS || [];
    for (var i = 0; i < list.length; i++) {
        var entry = String(list[i] || '').toLowerCase();
        var entryBase = CS.normalizeModelBaseId(entry);
        if (raw === entry || base === entryBase) return true;
        if (entryBase && (base.indexOf(entryBase) === 0 || raw.indexOf(entryBase) === 0)) return true;
    }
    if (CS.IMAGE_VISION_NAME_RE && CS.IMAGE_VISION_NAME_RE.test(raw)) return true;
    if (CS.IMAGE_VISION_NAME_RE && CS.IMAGE_VISION_NAME_RE.test(base)) return true;
    return false;
};

CS.isVisionModel = function(modelOrId) {
    if (modelOrId && typeof modelOrId === 'object') {
        return CS.isVisionModelId(modelOrId.id || modelOrId.name || '');
    }
    return CS.isVisionModelId(modelOrId);
};

CS.filterTextLlmModels = function(models) {
    if (!Array.isArray(models)) return [];
    var out = [];
    for (var i = 0; i < models.length; i++) {
        if (!CS.isVisionModel(models[i])) out.push(models[i]);
    }
    return out;
};

CS.LANGUAGES = ['fr', 'en', 'ar', 'zh', 'eo', 'es', 'de', 'pt', 'it', 'ru', 'ja', 'ko'];
CS.CONTEXT_POSITIONS = ['after_system', 'before_system'];
CS.STT_COMPUTE = ['cpu', 'gpu'];
CS.STT_DELETE_WORD_SHORTCUTS = ['ctrl+backspace', 'ctrl+delete', 'alt+backspace', 'ctrl+shift+backspace'];
CS.STT_DELETE_WORD_TARGETS = ['end', 'cursor'];
CS.STT_VOSK_LANGS = [
    'fr', 'en-us', 'ar', 'cn', 'eo', 'es', 'de', 'pt', 'it', 'ru', 'ja', 'ko',
    'en-in', 'tr', 'vn', 'nl', 'ca', 'fa', 'hi', 'pl', 'cs', 'uz', 'kz', 'uk', 'sv', 'br', 'gu', 'tg', 'te', 'ky', 'ka'
];

CS.THEME_IDS = [
    'light', 'dark',
    'noir-day', 'noir', 'gris-day', 'gris',
    'bleu-day', 'bleu', 'marine-day', 'marine', 'indigo-day', 'indigo', 'cyan-day', 'cyan', 'turquoise-day', 'turquoise',
    'vert-day', 'vert', 'lime-day', 'lime', 'menthe-day', 'menthe', 'olive-day', 'olive',
    'jaune-day', 'jaune', 'or-day', 'or', 'ambre-day', 'ambre', 'orange-day', 'orange',
    'rouge-day', 'rouge', 'corail-day', 'corail', 'rose-day', 'rose', 'magenta-day', 'magenta',
    'violet-day', 'violet', 'lavande-day', 'lavande', 'fuchsia-day', 'fuchsia', 'prune-day', 'prune',
    'marron-day', 'marron'
];

CS.META_KEYS = ['version', 'type', 'exportedAt'];

CS.PDM_KEYS = [
    'pdm_provider',
    'pdm_model',
    'pdm_image_model',
    'pdm_image_prompt',
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
    'pdm_stt_insert_at_cursor',
    'pdm_stt_delete_word_enabled',
    'pdm_stt_delete_word_shortcut',
    'pdm_stt_delete_word_target',
    'pdm_stt_vosk_lang',
    'pdm_context_position',
    'pdm_ollama_url',
    'pdm_llm_thinking_enabled',
    'pdm_llm_thinking_max_chars',
    'pdm_llm_temperature',
    'pdm_llm_max_tokens',
    'pdm_llm_input_char_budget',
    'pdm_llm_timeout_sec',
    'pdm_token_ollama',
    'pdm_context_gen_system',
    'pdm_context_gen_user_intent',
    'pdm_context_gen_user_title',
    'pdm_context_inject_header',
    'pdm_context_gen_tag_intent_suffix',
    'pdm_context_gen_forced_tag_system_suffix',
    'pdm_context_gen_retry_system_suffix',
    'pdm_context_gen_retry_user_suffix',
    'pdm_active_profile',
    'pdm_project',
    'pdm_context_profile_line_template',
    'pdm_context_gen_max_tokens',
    'pdm_context_gen_temperature',
    'pdm_context_gen_retry_temperature',
    'pdm_context_gen_max_retries',
    'pdm_context_gen_json_schema',
    'pdm_output_json_enabled',
    'pdm_output_json_schema',
    'pdm_output_json_key_pattern',
    'pdm_output_json_value_schema',
    'pdm_output_display_format',
    'pdm_audio_blobs',
    'pdm_workspace_ui'
];

CS.WORKSPACE_UI_IDENTITY_KEYS = ['username', 'hostname', 'usernameAlt'];
CS.WORKSPACE_UI_BRAND_KEYS = [
    'firstWord', 'secondWord', 'extension', 'showExtension',
    'firstWordClass', 'secondWordClass', 'extensionClass',
    'firstWordColor', 'secondWordColor'
];
CS.WORKSPACE_UI_BRAND_WORD_MAX = 32;
CS.WORKSPACE_UI_TEXT_KEYS = [
    'inputPlaceholder', 'inputAriaLabel', 'outputPlaceholder', 'outputPendingPlaceholder', 'thinkingPlaceholder',
    'submitLabel', 'submitLabelRunning', 'cancelLabel', 'resetLabel', 'resetTitle', 'resetConfirm',
    'emptyPromptError', 'iterateEmptyOutput', 'noContextError', 'promptGuardHtml', 'guardNoContextTitle',
    'inferenceCancelNotif', 'copyThinkingEmpty', 'inferenceRunningReset',
    'dictationRunningReset', 'dictationRunningClear', 'inferenceRunningDictation',
    'inferenceConnecting', 'inferenceRunningPlaceholder', 'inferenceFinalizing',
    'inferenceOutputAfterThinking', 'inferenceInterrupted', 'inferenceErrorPrefix',
    'inferenceThinkingLimit', 'inferenceThinkingLimitDone',
    'inferenceLengthLimit',
    'contextNoProfilesHint', 'contextSelectAllEmpty', 'contextBulkNone',
    'contextBulkAllActive', 'contextBulkAllInactive',
    'compressTokens', 'compressTokensTitle', 'compressPanelTitle',
    'compressTargetsAria', 'compressIncludeSystem', 'compressIncludeContexts',
    'compressIncludeInput', 'compressIncludeOutput',
    'compressBadge', 'compressLockOutput', 'compressCancel', 'compressCancelTitle', 'compressCancelled',
    'compressNothing', 'compressNoActiveContexts', 'compressNoOutputYet',
    'compressNoModel', 'compressBusyInference', 'compressConfirm',
    'compressRunning', 'compressProgress', 'compressDone', 'compressDoneNotif', 'compressError',
    'compressLabelSystem', 'compressLabelContext', 'compressLabelInput', 'compressLabelOutput',
    'compressTipSystemOff', 'compressTipSystemOn', 'compressTipSystemDone',
    'compressTipContextsOff', 'compressTipContextsOn', 'compressTipContextsDone', 'compressTipContextsEmpty',
    'compressTipInputOff', 'compressTipInputOn', 'compressTipInputDone',
    'compressTipOutputOff', 'compressTipOutputOn', 'compressTipOutputDone', 'compressTipOutputEmpty',
    'inferenceChunking', 'inferenceMetaRetry', 'inferenceMetaDriftWarn',
    'audioClearTitle', 'audioClearProcessingTitle', 'audioClearCancelTitle',
    'audioProcessingPlaceholder', 'audioFileDefault', 'audioTranscribingLabel',
    'audioPrepDetail', 'audioProcessingHint', 'audioDoneLabel', 'audioNewInput',
    'audioInferenceWait', 'audioDictationImportWait', 'audioTranscribeFail',
    'audioModelMissing', 'audioUnsupportedMedia',
    'audioTranscriptionCancelled', 'audioModeExited', 'audioEngineUnavailable',
    'audioImportTitle', 'audioImportAriaLabel', 'audioImportBlockedTitle',
    'audioImportImpossibleInference', 'audioImportImpossibleDictation', 'audioImportImpossibleAudioMode',
    'imageImportTitle', 'imageImportAriaLabel', 'imageImportBlockedTitle',
    'imageImportImpossibleInference', 'imageImportImpossibleDictation', 'imageImportImpossibleAudioMode',
    'imageInferenceWait', 'imageDictationImportWait', 'imageAudioModeWait',
    'imageFileDefault', 'imageAnalyzing', 'imageAnalyzingOllama', 'imageDoneLabel', 'imageDoneNotif',
    'imageCancelled', 'imageUnsupported', 'imageTooLarge', 'imageDecodeFail',
    'imageVisionUnavailable', 'imageAnalyzeFail', 'imageModelMissing',
    'imageEmptyResult', 'imageOllamaUnreachable', 'imageAnalyzeTimeout',
    'downloadAriaLabel', 'downloadReadyTitle', 'downloadNothingTitle', 'downloadBusyTitle',
    'downloadImpossibleNothing', 'downloadImpossibleDictation', 'downloadImpossibleInference', 'downloadImpossibleAudioMode', 'downloadImpossibleHybridAudio',
    'downloadNothingMsg', 'downloadFailMsg', 'downloadOkMsg', 'clearNothingTitle',
    'clearImpossibleNothing', 'clearImpossibleDictation',
    'audioNewInputBlockedTitle', 'audioNewInputImpossible', 'audioClearFailMsg',
    'ttsDownloadAriaLabel', 'ttsDownloadTitle', 'ttsV2UnavailableTitle', 'ttsV2UnavailableMsg',
    'ttsImpossibleEmpty', 'ttsImpossibleDictation', 'ttsImpossibleInference', 'ttsImpossibleAudioMode',
    'thinkingUnavailableMsg', 'thinkingUnavailableHint', 'thinkingUnsupportedShort',
    'thinkingToggleOn', 'thinkingToggleOff', 'thinkingEnabledNotif', 'thinkingDisabledNotif',
    'llmOptionsBtn', 'llmOptionsBtnOpen', 'llmOptionsAuto', 'llmTemperatureLabel',
    'llmTemperatureHint', 'llmMaxTokensLabel', 'llmMaxTokensHint', 'llmTimeoutLabel', 'llmTimeoutHint', 'llmThinkingMaxLabel',
    'llmOptionsBadgeAuto', 'llmOptionsBadgeCustom', 'llmOptionsBadgeRefused',
    'historySaveFail', 'historyEmpty', 'historyPurgeTitle',
    'dictationStoppedForClean', 'customProfileSynopsis', 'llmModelSavedInfo', 'providerSaved',
    'llmModelEmpty', 'thinkingMaxUnlimited', 'thinkingMaxHintValue', 'modelChangeRestartTitle',
    'audioProgressDecode', 'audioProgressModel', 'audioProgressTranscribeSegment', 'audioProgressTranscribeFile',
    'audioProgressDefault', 'audioRecordingDeleted', 'errorGeneric', 'errorRefSuffix',
    'streamTime', 'streamThinking', 'streamThinkingTokens', 'streamSpeed', 'streamSpeedThinking', 'streamSpeedAvg',
    'streamTokens', 'streamChars', 'streamLimitReached', 'streamThinkingLimitReached',
    'streamInProgressBrain', 'streamInProgressDot', 'streamThinkingBadgeLimit', 'streamThinkingBadgeProgress',
    'streamBadgeChars', 'streamBadgeCharsMax',
    'audioExportZipHeader', 'audioExportZipGenerated'
];

CS.DEFAULT_WORKSPACE_UI = {
    identity: {
        username: 'chnek',
        hostname: 'promptdemerde',
        usernameAlt: 'sniper'
    },
    brand: {
        firstWord: 'Prompt',
        secondWord: 'DeMerde',
        extension: '.com',
        showExtension: true,
        firstWordClass: 'logo-word1',
        secondWordClass: 'red',
        extensionClass: 'logo-dotcom',
        firstWordColor: '',
        secondWordColor: ''
    },
    texts: {
        inputPlaceholder: 'Ex: \u00e9cris un truc cool sur les chats',
        inputAriaLabel: 'Zone de saisie du prompt',
        outputPlaceholder: 'Le prompt nettoy\u00e9 appara\u00eetra ici\u2026',
        outputPendingPlaceholder: 'Aucune correction n\u2019a encore \u00e9t\u00e9 effectu\u00e9e\u2026',
        thinkingPlaceholder: 'La r\u00e9flexion appara\u00eetra ici en direct\u2026',
        submitLabel: 'NETTOYER CE TAS DE MERDE \u2192',
        submitLabelRunning: '\u23f3 Nettoyage en cours...',
        cancelLabel: '\u23f9 Arr\u00eater',
        resetLabel: 'Reset',
        resetTitle: 'R\u00e9initialiser saisie et r\u00e9sultat',
        resetConfirm: 'R\u00e9initialiser la saisie et le r\u00e9sultat\u00a0? Cette action est irr\u00e9versible.',
        emptyPromptError: 'Aucun texte dans Input. Coller un prompt avant de nettoyer.',
        iterateEmptyOutput: 'Aucun texte dans Output. Lancer une inf\u00e9rence avant d\u2019it\u00e9rer.',
        noContextError: 'Activer le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.',
        promptGuardHtml: 'Activer le <a href="#prompts">prompt syst\u00e8me</a> ou un <a href="#prompts">contexte</a> pour lancer le LLM.',
        guardNoContextTitle: 'Activer le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.',
        inferenceCancelNotif: 'Inf\u00e9rence annul\u00e9e par l\'utilisateur.',
        copyThinkingEmpty: 'Aucune r\u00e9flexion \u00e0 copier.',
        inferenceRunningReset: 'Nettoyage en cours \u2014 l\u2019interrompre avant de r\u00e9initialiser.',
        dictationRunningReset: 'Dict\u00e9e vocale en cours \u2014 l\u2019interrompre avant de r\u00e9initialiser.',
        dictationRunningClear: 'Dict\u00e9e vocale en cours \u2014 l\u2019interrompre avant d\u2019effacer.',
        inferenceRunningDictation: 'Nettoyage en cours \u2014 l\u2019interrompre avant la dict\u00e9e vocale.',
        inferenceConnecting: '\u23f3 Connexion au serveur...',
        inferenceRunningPlaceholder: '\u23f3 Le nettoyage est en cours...',
        inferenceFinalizing: 'Finalisation du nettoyage\u2026',
        inferenceOutputAfterThinking: 'Le prompt nettoy\u00e9 appara\u00eetra ici apr\u00e8s la r\u00e9flexion\u2026',
        inferenceInterrupted: '\u23f9 Interrompu \u2014 texte partiel conserv\u00e9',
        inferenceErrorPrefix: '\u274c Erreur : ',
        inferenceThinkingLimit: 'Limite de r\u00e9flexion atteinte ({{max}} caract\u00e8res) \u2014 poursuite du nettoyage.',
        inferenceThinkingLimitDone: 'Limite de r\u00e9flexion atteinte ({{max}} caract\u00e8res).',
        inferenceLengthLimit: 'Sortie arr\u00eat\u00e9e \u2014 plafond de tokens atteint. Augmenter Tokens de sortie (Options LLM) ou v\u00e9rifier num_predict.',
        contextNoProfilesHint: 'Aucune option pour l\u2019instant. En cr\u00e9er dans l\u2019onglet Prompts.',
        contextSelectAllEmpty: 'Cr\u00e9er d\u2019abord un prompt de contexte.',
        contextBulkNone: 'Aucun prompt de contexte \u00e0 modifier.',
        contextBulkAllActive: 'Tous les prompts de contexte sont actifs.',
        contextBulkAllInactive: 'Tous les prompts de contexte sont inactifs.',
        compressTokens: 'Compresser les tokens',
        compressTokensTitle: 'Au clic sur Nettoyer : les cibles coch\u00e9es (prompt syst\u00e8me, prompts de contexte, zone Input) sont compress\u00e9es avant l\u2019inf\u00e9rence ; la zone Output, si coch\u00e9e, apr\u00e8s (affichage seulement).',
        compressPanelTitle: 'Compression des tokens',
        compressTargetsAria: 'Cibles de compression',
        compressIncludeSystem: 'Prompt syst\u00e8me',
        compressIncludeContexts: 'Prompts de contexte (actifs)',
        compressIncludeInput: 'Zone Input',
        compressIncludeOutput: 'Zone Output',
        compressBadge: '{{count}} bloc(s)',
        compressLockOutput: 'Compression en cours \u2014 Output verrouill\u00e9',
        compressCancel: 'Arr\u00eater',
        compressCancelTitle: 'Arr\u00eater la compression des tokens',
        compressCancelled: 'Compression arr\u00eat\u00e9e.',
        compressNothing: 'Rien \u00e0 compresser : coche au moins une cible avec du contenu (prompt syst\u00e8me, prompts de contexte, zone Input ou zone Output).',
        compressNoActiveContexts: 'Aucun prompt de contexte actif. Active au moins un #Tag, ou d\u00e9coche « Prompts de contexte » pour ne pas les inclure.',
        compressNoOutputYet: 'Aucun texte Output \u00e0 compresser pour l\u2019instant (sera appliqu\u00e9 apr\u00e8s Nettoyer si la case reste coch\u00e9e).',
        compressNoModel: 'Aucun mod\u00e8le LLM s\u00e9lectionn\u00e9 (Options).',
        compressBusyInference: 'Compression d\u00e9j\u00e0 en cours.',
        compressConfirm: 'Compresser {{count}} bloc(s) ({{chars}} caract\u00e8res) :\n{{labels}}\n\nLes textes list\u00e9s seront remplac\u00e9s dans cette session.',
        compressRunning: 'Compression en cours\u2026',
        compressProgress: 'Compression {{i}}/{{n}} \u2014 {{label}}',
        compressDone: 'Tokens r\u00e9duits : {{before}} \u2192 {{after}} (\u2212{{pct}} %)',
        compressDoneNotif: 'Compression OK (\u2212{{pct}} % de caract\u00e8res).',
        compressError: 'Compression \u00e9chou\u00e9e : {{msg}}',
        compressLabelSystem: 'prompt syst\u00e8me',
        compressLabelContext: 'prompt de contexte {{tag}}',
        compressLabelInput: 'texte de la zone Input',
        compressLabelOutput: 'texte de la zone Output',
        compressTipSystemOff: 'Cochez pour compresser le prompt syst\u00e8me au prochain Nettoyer (avant l\u2019inf\u00e9rence).',
        compressTipSystemOn: 'Le prompt syst\u00e8me sera compress\u00e9 au clic Nettoyer. D\u00e9cochez pour l\u2019exclure.',
        compressTipSystemDone: 'Le prompt syst\u00e8me est d\u00e9j\u00e0 compress\u00e9 (pastille verte). Rien d\u2019autre \u00e0 cliquer.',
        compressTipContextsOff: 'Cochez pour compresser les prompts de contexte actifs au prochain Nettoyer (avant l\u2019inf\u00e9rence).',
        compressTipContextsOn: 'Les prompts de contexte actifs seront compress\u00e9s au clic Nettoyer. D\u00e9cochez pour les exclure.',
        compressTipContextsDone: 'Les prompts de contexte actifs sont d\u00e9j\u00e0 compress\u00e9s (pastille verte). Rien d\u2019autre \u00e0 cliquer.',
        compressTipContextsEmpty: 'Aucun prompt de contexte actif. Activez au moins un #Tag avant de les inclure.',
        compressTipInputOff: 'Cochez pour compresser le texte de la zone Input au prochain Nettoyer (avant l\u2019inf\u00e9rence).',
        compressTipInputOn: 'Le texte de la zone Input sera compress\u00e9 au clic Nettoyer. D\u00e9cochez pour l\u2019exclure.',
        compressTipInputDone: 'Le texte de la zone Input est d\u00e9j\u00e0 compress\u00e9 (pastille verte). Rien d\u2019autre \u00e0 cliquer.',
        compressTipOutputOff: 'Cochez pour raccourcir le texte Output affich\u00e9 juste apr\u00e8s Nettoyer (n\u2019influence pas le prochain Nettoyer).',
        compressTipOutputOn: 'Apr\u00e8s Nettoyer, le texte Output affich\u00e9 sera raccourci. D\u00e9cochez pour l\u2019exclure.',
        compressTipOutputDone: 'Output d\u00e9j\u00e0 compress\u00e9 (pastille verte). Rien d\u2019autre \u00e0 cliquer \u2014 un nouveau Nettoyer reg\u00e9n\u00e8re un Output neuf.',
        compressTipOutputEmpty: 'Pas encore de texte Output. Il sera compress\u00e9 apr\u00e8s le prochain Nettoyer si la case reste coch\u00e9e.',
        inferenceChunking: 'INPUT long ({{chars}} car.) \u2014 nettoyage en {{n}} passe(s).',
        inferenceMetaRetry: 'D\u00e9rive m\u00e9ta d\u00e9tect\u00e9e \u2014 consigne non respect\u00e9e.',
        inferenceMetaDriftWarn: 'Sortie hors consignes syst\u00e8me d\u00e9tect\u00e9e (m\u00e9ta / sniper). R\u00e9duire les contextes actifs ou compresser les tokens.',
        audioClearTitle: 'Effacer la saisie',
        audioClearProcessingTitle: 'Annuler la transcription',
        audioClearCancelTitle: 'Quitter le mode audio et repasser en saisie / dict\u00e9e vocale',
        audioProcessingPlaceholder: 'Transcription en cours\u2026 (Whisper Maxi, 100\u00a0% local)',
        audioFileDefault: 'Fichier audio',
        audioTranscribingLabel: 'Transcription de \u00ab {{name}} \u00bb',
        audioPrepDetail: 'Pr\u00e9paration\u2026',
        audioProcessingHint: 'Dict\u00e9e vocale et saisie apr\u00e8s transcription \u2014 \u00c9chap ou corbeille pour annuler l\u2019import en cours.',
        audioDoneLabel: 'Transcription termin\u00e9e \u2014 {{name}}',
        audioNewInput: 'Nouvelle saisie',
        audioInferenceWait: 'Nettoyage en cours \u2014 attendre la fin.',
        audioDictationImportWait: 'Dict\u00e9e vocale en cours \u2014 l\u2019interrompre avant d\u2019importer un audio.',
        audioTranscribeFail: 'Transcription audio \u00e9chou\u00e9e. V\u00e9rifiez le fichier et Whisper Maxi (Options \u2192 Dict\u00e9e vocale / assets STT).',
        audioModelMissing: 'Mod\u00e8le Whisper Maxi introuvable \u2014 restaure les assets STT (install/restore-large-assets.sh).',
        audioUnsupportedMedia: 'Ce fichier audio ou vid\u00e9o n\u2019est pas d\u00e9codable dans ce navigateur.',
        audioTranscriptionCancelled: 'Transcription annul\u00e9e.',
        audioModeExited: 'Mode audio quitt\u00e9 \u2014 saisie manuelle ou dict\u00e9e vocale disponibles.',
        audioEngineUnavailable: 'Whisper Maxi indisponible. Restaurez les assets STT ou changez de moteur dans Options \u2192 Dict\u00e9e vocale.',
        audioImportTitle: 'Importer un fichier audio (Whisper Maxi, local)',
        audioImportAriaLabel: 'Importer un fichier audio',
        audioImportBlockedTitle: 'Quitter le mode audio avant d\u2019importer un autre fichier.',
        audioImportImpossibleInference: 'Import audio impossible \u2014 attendre la fin du nettoyage.',
        audioImportImpossibleDictation: 'Import audio impossible \u2014 interrompre la dict\u00e9e vocale d\u2019abord.',
        audioImportImpossibleAudioMode: 'Import audio impossible \u2014 quitter le mode fichier audio d\u2019abord.',
        imageImportTitle: 'Importer une image (description Ollama vision)',
        imageImportAriaLabel: 'Importer une image',
        imageImportBlockedTitle: 'Analyse d\u2019image d\u00e9j\u00e0 en cours.',
        imageImportImpossibleInference: 'Import image impossible \u2014 attendre la fin du nettoyage.',
        imageImportImpossibleDictation: 'Import image impossible \u2014 interrompre la dict\u00e9e vocale d\u2019abord.',
        imageImportImpossibleAudioMode: 'Import image impossible \u2014 quitter le mode fichier audio d\u2019abord.',
        imageInferenceWait: 'Nettoyage en cours \u2014 attendre la fin.',
        imageDictationImportWait: 'Dict\u00e9e vocale en cours \u2014 l\u2019interrompre avant d\u2019importer une image.',
        imageAudioModeWait: 'Quitter le mode audio avant d\u2019importer une image.',
        imageFileDefault: 'Image',
        imageAnalyzing: 'Analyse de \u00ab {{name}} \u00bb\u2026',
        imageAnalyzingOllama: 'Analyse de l\'image en cours (Ollama/{{model}})\u2026',
        imageDoneLabel: 'Description pr\u00eate \u2014 {{name}}',
        imageDoneNotif: 'Description d\u2019image ins\u00e9r\u00e9e dans Input.',
        imageCancelled: 'Analyse d\u2019image annul\u00e9e.',
        imageUnsupported: 'Format non accept\u00e9 (PNG, JPEG, WebP, GIF). Choisissez un autre fichier.',
        imageTooLarge: 'Image trop lourde apr\u00e8s compression. Choisissez un fichier plus l\u00e9ger.',
        imageDecodeFail: 'Fichier illisible comme image. R\u00e9essayez avec PNG, JPEG, WebP ou GIF.',
        imageVisionUnavailable: 'Vision r\u00e9serv\u00e9e \u00e0 Ollama. Choisissez Ollama dans Options \u2192 LLM.',
        imageAnalyzeFail: 'Analyse vision \u00e9chou\u00e9e (cause inconnue). V\u00e9rifiez Ollama et Prompts \u2192 Prompts image.',
        imageModelMissing: 'Mod\u00e8le {{model}} introuvable dans Ollama. Lancez ollama pull {{model}}, puis v\u00e9rifiez Prompts \u2192 Prompts image.',
        imageEmptyResult: 'Ollama n\u2019a renvoy\u00e9 aucun texte. R\u00e9essayez ou changez le mod\u00e8le dans Prompts \u2192 Prompts image.',
        imageOllamaUnreachable: 'Ollama injoignable. Lancez Ollama, puis v\u00e9rifiez Options \u2192 LLM (URL / proxy).',
        imageAnalyzeTimeout: 'D\u00e9lai d\u00e9pass\u00e9 sur l\u2019analyse. R\u00e9essayez ou prenez un mod\u00e8le plus l\u00e9ger (Prompts \u2192 Prompts image).',
        downloadReadyTitle: 'T\u00e9l\u00e9charger le MP3 global contenant l\u2019ensemble des morceaux de dict\u00e9e vocale de cette session.',
        downloadAriaLabel: 'T\u00e9l\u00e9charger le MP3 global de dict\u00e9e vocale (tous les morceaux fusionn\u00e9s)',
        downloadNothingTitle: 'Dict\u00e9e vocale : rien \u00e0 t\u00e9l\u00e9charger \u2014 aucun morceau enregistr\u00e9.',
        downloadBusyTitle: 'T\u00e9l\u00e9chargement du fichier audio global de dict\u00e9e vocale en cours\u2026',
        downloadImpossibleNothing: 'T\u00e9l\u00e9chargement impossible \u2014 aucun morceau de dict\u00e9e vocale enregistr\u00e9 pour l\u2019instant.',
        downloadImpossibleDictation: 'T\u00e9l\u00e9chargement impossible \u2014 interrompre la dict\u00e9e vocale avant de r\u00e9cup\u00e9rer le fichier global.',
        downloadImpossibleInference: 'T\u00e9l\u00e9chargement impossible \u2014 attendre la fin du nettoyage LLM.',
        downloadImpossibleAudioMode: 'T\u00e9l\u00e9chargement impossible \u2014 quitter le mode fichier audio (import \ud83c\udfb5).',
        downloadImpossibleHybridAudio: 'T\u00e9l\u00e9chargement indisponible \u2014 dict\u00e9e vocale apr\u00e8s import fichier audio.',
        downloadNothingMsg: 'Rien \u00e0 t\u00e9l\u00e9charger pour le moment.',
        downloadFailMsg: 'Le t\u00e9l\u00e9chargement est impossible.',
        downloadOkMsg: 'T\u00e9l\u00e9chargement lanc\u00e9.',
        clearNothingTitle: 'Rien \u00e0 effacer.',
        clearImpossibleNothing: 'Effacement impossible \u2014 il n\'y a rien \u00e0 effacer.',
        clearImpossibleDictation: 'Effacement impossible \u2014 interrompre la dict\u00e9e vocale d\u2019abord.',
        audioNewInputBlockedTitle: 'Attendre la fin de la transcription ou interrompre la dict\u00e9e vocale.',
        audioNewInputImpossible: 'Nouvelle saisie impossible \u2014 attendre la fin de la transcription ou interrompre la dict\u00e9e vocale.',
        audioClearFailMsg: 'Impossible de supprimer l\'enregistrement audio.',
        ttsDownloadAriaLabel: 'T\u00e9l\u00e9charger une version audio TTS du texte (Entr\u00e9e, Sortie, ou les deux)',
        ttsDownloadTitle: 'T\u00e9l\u00e9charger une version audio TTS du texte \u2014 source au choix : zone Entr\u00e9e seule, zone Sortie seule, ou Entr\u00e9e + Sortie ensemble. Pas encore disponible (v2, GenericVoice).',
        ttsV2UnavailableTitle: 'T\u00e9l\u00e9charger une version audio TTS du texte \u2014 source au choix : zone Entr\u00e9e seule, zone Sortie seule, ou Entr\u00e9e + Sortie ensemble. Pas encore disponible (v2, GenericVoice).',
        ttsV2UnavailableMsg: 'La synth\u00e8se vocale (TTS) n\u2019est pas encore disponible.',
        ttsImpossibleEmpty: 'TTS impossible \u2014 aucun texte en Entr\u00e9e ni en Sortie \u00e0 synth\u00e9tiser.',
        ttsImpossibleDictation: 'TTS impossible \u2014 interrompre la dict\u00e9e vocale avant de g\u00e9n\u00e9rer l\u2019audio.',
        ttsImpossibleInference: 'TTS impossible \u2014 attendre la fin du nettoyage LLM.',
        ttsImpossibleAudioMode: 'TTS impossible \u2014 quitter le mode fichier audio (import \ud83c\udfb5).',
        thinkingUnavailableMsg: 'La r\u00e9flexion n\u2019est pas disponible pour ce mod\u00e8le.',
        thinkingUnavailableHint: 'Ce mod\u00e8le ne prend pas en charge la r\u00e9flexion : activer cette option n\u2019aura aucun effet.',
        thinkingUnsupportedShort: 'R\u00e9flexion non disponible pour ce mod\u00e8le.',
        thinkingToggleOn: 'R\u00e9flexion activ\u00e9e \u2014 cliquer pour d\u00e9sactiver',
        thinkingToggleOff: 'R\u00e9flexion d\u00e9sactiv\u00e9e \u2014 cliquer pour activer',
        thinkingEnabledNotif: 'R\u00e9flexion activ\u00e9e',
        thinkingDisabledNotif: 'R\u00e9flexion d\u00e9sactiv\u00e9e',
        llmOptionsBtn: 'Options LLM \u2014 cliquer pour afficher ou masquer les r\u00e9glages',
        llmOptionsBtnOpen: 'Options LLM \u2014 cliquer pour masquer les r\u00e9glages',
        llmOptionsAuto: 'Auto',
        llmTemperatureLabel: 'Temp\u00e9rature',
        llmTemperatureHint: 'Strict \u2190 \u2192 Cr\u00e9atif \u00b7 Auto = comportement actuel',
        llmMaxTokensLabel: 'Tokens de sortie',
        llmMaxTokensHint: 'Limite la longueur g\u00e9n\u00e9r\u00e9e \u00b7 Auto = pas de limite explicite',
        llmTimeoutLabel: 'Timeout inf\u00e9rence',
        llmTimeoutHint: 'Dur\u00e9e max avant coupure (connexion et streaming)',
        llmThinkingMaxLabel: 'Caract\u00e8res max de r\u00e9flexion',
        llmOptionsBadgeAuto: 'AUTO',
        llmOptionsBadgeCustom: '{{count}} r\u00e9glage(s)',
        llmOptionsBadgeRefused: 'REFUS\u00c9',
        historySaveFail: 'Impossible d\u2019enregistrer l\u2019historique des nettoyages.',
        historyEmpty: 'Aucune entr\u00e9e.',
        historyPurgeTitle: 'Purger tout l\'historique local',
        dictationStoppedForClean: 'Dict\u00e9e vocale arr\u00eat\u00e9e \u2014 nettoyage du texte actuel.',
        customProfileSynopsis: 'Profil {{label}} \u2014 configuration personnalis\u00e9e PromptDeMerde.',
        llmModelSavedInfo: 'Mod\u00e8le LLM : {{model}}',
        providerSaved: 'Provider sauvegard\u00e9.',
        llmModelEmpty: '-- Aucun mod\u00e8le --',
        thinkingMaxUnlimited: 'Illimit\u00e9 (0)',
        thinkingMaxHintValue: '{{max}} car. autoris\u00e9s \u00b7 0 = illimit\u00e9',
        modelChangeRestartTitle: 'Changer de mod\u00e8le relancera le nettoyage',
        audioProgressDecode: 'Lecture du fichier audio\u2026',
        audioProgressModel: 'Chargement de Whisper Maxi\u2026',
        audioProgressTranscribeSegment: 'Transcription\u2026 segment {{idx}}/{{total}}',
        audioProgressTranscribeFile: 'Transcription du fichier audio\u2026',
        audioProgressDefault: 'Transcription en cours\u2026',
        audioRecordingDeleted: 'Enregistrement audio supprim\u00e9.',
        errorGeneric: 'Erreur inattendue. R\u00e9essayez ; si cela continue, Options \u2192 LLM et la console navigateur.',
        errorRefSuffix: ' (r\u00e9f. {{code}})',
        streamTime: 'Temps:',
        streamThinking: 'R\u00e9flexion:',
        streamThinkingTokens: 'Tokens r\u00e9flexion:',
        streamSpeed: 'Vitesse:',
        streamSpeedThinking: 'Vitesse r\u00e9flexion:',
        streamSpeedAvg: 'Vitesse moy.:',
        streamTokens: 'Tokens:',
        streamChars: 'Caract\u00e8res:',
        streamLimitReached: 'Limite atteinte',
        streamThinkingLimitReached: 'Limite r\u00e9flexion atteinte',
        streamInProgressBrain: '\ud83e\udde0 EN COURS',
        streamInProgressDot: '\u25cf EN COURS',
        streamThinkingBadgeLimit: ' \u00b7 LIMITE',
        streamThinkingBadgeProgress: ' \u00b7 \u25cf EN COURS',
        streamBadgeChars: '{{len}} car.',
        streamBadgeCharsMax: '{{len}}/{{max}} car.',
        audioExportZipHeader: 'Enregistrement dict\u00e9e vocale WebM\n',
        audioExportZipGenerated: 'G\u00e9n\u00e9r\u00e9: {{date}}\n'
    }
};

CS.REQUIRED_ROOT_KEYS = CS.META_KEYS.concat(CS.PDM_KEYS);
CS.OPTIONAL_ROOT_KEYS = ['i18n', 'langs'];
CS.MAX_I18N_LANGS = 12;

CS.PROFILE_KEYS = ['id', 'tag', 'prompt', 'active', 'origin'];
CS.PROFILE_ORIGIN_KEYS = [
    'method', 'generatedAt', 'createdAt', 'provider', 'model',
    'systemPrompt', 'userPrompt', 'sourceFile'
];
CS.PROFILE_ORIGIN_METHODS = ['ai_intent', 'ai_title', 'manual', 'profile_bundle'];
CS.WORKSPACE_KEYS = [
    'input', 'output', 'thinking', 'savedAt', 'contextPanelOpen',
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount',
    'compressIncludeSystem', 'compressIncludeContexts', 'compressIncludeInput', 'compressIncludeOutput'
];
CS.WORKSPACE_INPUT_SOURCES = ['manual', 'audio-file', 'audio-dictation', 'image-file'];
CS.AUDIO_META_KEYS = [
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount'
];
CS.HISTORY_REQUIRED = ['id', 'type', 'at', 'input'];
CS.HISTORY_OPTIONAL = [
    'output', 'thinking', 'systemPrompt', 'systemPromptEffective',
    'contextPosition', 'activeContexts', 'usage', 'duration_ms', 'provider', 'model',
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount',
    'trace'
];

CS.DEFAULT_PROFILES = [
    { id: 'p001', tag: 'CorrigeGrammaire', prompt: "Corrige la grammaire, l'orthographe et la ponctuation du texte source avant de le reformuler en prompt.", active: false },
    { id: 'p002', tag: 'TonFormel', prompt: 'Adopte un ton formel et professionnel dans le prompt reformulé. Utilise un vocabulaire soutenu et une structure rigoureuse.', active: false },
    { id: 'p003', tag: 'AntiBullshit', prompt: 'Va droit au but. Pas de blabla, pas de formule de politesse, pas de transition. Contenu brut, concis, directement exploitable.', active: false }
];

CS.DEFAULT_CONTEXT_GEN_SYSTEM = (
    'Tu es un générateur JSON pour PromptDeMerde (reformulation de prompts).\n' +
    'Tu ne converses pas : aucune phrase introductive, aucune question, aucun markdown, aucune explication.\n' +
    'Sortie OBLIGATOIRE : un seul objet JSON avec exactement les clés "tag" et "prompt".\n' +
    'Exemple (invente ton propre tag, ne recopie pas) : {"tag":"UpperCase","prompt":"Reformule toujours le texte en majuscules."}\n' +
    'Règles tag : un mot PascalCase (ex. TonFormel), lettres/chiffres uniquement, sans dièse.'
);

CS.DEFAULT_CONTEXT_GEN_USER_INTENT = 'Génère le meilleur prompt de contexte pour ce besoin :\n';

CS.DEFAULT_CONTEXT_GEN_USER_TITLE = (
    'Génère le meilleur prompt de contexte pour un profil nommé #{{title}}.\n' +
    'Le tag doit être exactement "{{title}}" (majuscule au début, sans espace).\n' +
    'Les instructions doivent décrire précisément le comportement attendu lors de la reformulation de prompts utilisateur, en cohérence avec ce titre.'
);

CS.DEFAULT_IMAGE_PROMPT = (
    'Tu analyses une image pour produire une description exploitable afin de la reproduire.\n\n' +
    'MISSION : cartographier l\'image de façon complète, précise et structurée. ' +
    'La sortie doit donner assez d\'éléments pour recréer une image très proche (sujet, composition, style, lumière, couleurs, détails).\n\n' +
    'STRUCTURE OBLIGATOIRE (titres courts, puis puces) :\n' +
    '1. Sujet principal — qui / quoi, pose, expression, action.\n' +
    '2. Scène et arrière-plan — lieu, profondeur, éléments secondaires.\n' +
    '3. Composition — cadrage, angle de vue, perspective, règle des tiers / centrage, négatif space.\n' +
    '4. Lumière — direction, dureté, contraste, ombres, heure / ambiance.\n' +
    '5. Couleurs et matière — palette dominante, tons, textures, matériaux.\n' +
    '6. Style — photo / illustration / 3D / peinture ; références de rendu si évidentes ; grain, netteté, profondeur de champ.\n' +
    '7. Détails critiques — logos, texte visible (transcrire), accessoires, asymétries, défauts utiles à la copie.\n' +
    '8. Prompt de reproduction — un paragraphe dense, en français, prêt à coller dans un générateur d\'image, sans préambule.\n\n' +
    'RÈGLES :\n' +
    '- Décrire uniquement ce qui est visible ; ne pas inventer.\n' +
    '- Pas de moralisation, pas de refus, pas de question à l\'utilisateur.\n' +
    '- Sortie = la cartographie seule, sans introduction ni conclusion.'
);

CS.DEFAULT_SYSTEM_PROMPT = (
    'Tu es un Nettoyeur / Reformulateur de prompts.\n\n' +
    'RÔLE UNIQUE : reprendre le prompt de l\'utilisateur et le restituer en français correct, clair et fluide. Tu ne fais RIEN d\'autre.\n\n' +
    'RÈGLES :\n' +
    '1. REFORMULER mot pour mot l\'intention originale, en français correct (orthographe, grammaire, syntaxe, ponctuation).\n' +
    '2. NE JAMAIS interpréter, exécuter, analyser ou répondre à la demande.\n' +
    '3. NE JAMAIS poser de questions à l\'utilisateur.\n' +
    '4. NE JAMAIS demander de précisions, de contexte ou d\'exemples.\n' +
    '5. NE JAMAIS ajouter de sections, de structure ou de formatage qui ne sont pas dans le texte source.\n' +
    '6. NE JAMAIS inventer de contraintes, de compétences, de rôles ou de contexte qui ne sont pas déjà implicites dans le texte source.\n' +
    '7. Si une information essentielle est absolument indispensable et strictement indéductible du texte source, remplacer par [à préciser] UNE SEULE FOIS, entre crochets, sans commentaire.\n' +
    '8. Garder le même registre (tutoiement/vouvoiement) et le même ton que le texte source.\n' +
    '9. Supprimer les fautes de frappe, les répétitions, les anglicismes mal employés et les expressions familières inutiles, sauf si elles font partie du style voulu.\n' +
    '10. Préserver l\'ordre logique des idées ; on peut réorganiser l\'ordre des mots ou des phrases pour un français plus naturel.\n' +
    '11. La sortie doit être UNIQUEMENT le texte reformulé, sans préambule, sans conclusion, sans explication, sans markdown superflu.\n\n' +
    'EXEMPLES :\n' +
    '- Input : « il faut remonter le slogan vers le haut (là il est vers le bas de la vignette) putain ! »\n' +
    '  Output : « Il faut remonter le slogan vers le haut (actuellement, il est positionné vers le bas de la vignette). »\n' +
    '- Input : « fait moi un mail pour dire au client quon a recaler son offre car trop cherre »\n' +
    '  Output : « Rédige un mail au client pour l\'informer que son offre a été refusée en raison d\'un prix trop élevé. »\n\n' +
    'RAPPEL : tu es un nettoyeur de texte, pas un assistant conversationnel.'
);

CS.DEFAULT_CONTEXT_INJECT_HEADER = 'INSTRUCTIONS SUPPLÉMENTAIRES (profils actifs) :\n';

CS.DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX = '\n\nLe tag DOIT être exactement "{{tag}}" (majuscule au début, sans dièse).';

CS.DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX = '\nLe champ "tag" DOIT être exactement "{{tag}}".';

CS.DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX = '\nTa réponse précédente était invalide (prose ou JSON absent). JSON uniquement, rien d\'autre.';

CS.DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX = '\n\nRAPPEL STRICT : réponds UNIQUEMENT par {"tag":"...","prompt":"..."} — pas de texte avant ni après.';

CS.DEFAULT_CONTEXT_PROFILE_LINE_TEMPLATE = '- #{{tag}} : {{prompt}}\n';

CS.DEFAULT_CONTEXT_GEN_MAX_TOKENS = 512;
CS.DEFAULT_CONTEXT_GEN_TEMPERATURE = 0.2;
CS.DEFAULT_CONTEXT_GEN_RETRY_TEMPERATURE = 0.1;
CS.DEFAULT_CONTEXT_GEN_MAX_RETRIES = 2;
CS.MAX_CONTEXT_GEN_MAX_TOKENS = 8192;
CS.MAX_CONTEXT_GEN_MAX_RETRIES = 10;

CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA = {
    type: 'object',
    properties: {
        tag: { type: 'string' },
        prompt: { type: 'string' }
    },
    required: ['tag', 'prompt'],
    additionalProperties: false
};

CS._SEMVER_RE = /^\d+\.\d+\.\d+$/;
CS._ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

CS.LOCALE_DEFAULT_KEYS = {
    DEFAULT_SYSTEM_PROMPT: 'prompts.systemPromptPlaceholder',
    DEFAULT_IMAGE_PROMPT: 'prompts.imagePromptDefault',
    DEFAULT_CONTEXT_GEN_SYSTEM: 'contextGen.system',
    DEFAULT_CONTEXT_GEN_USER_INTENT: 'contextGen.userIntent',
    DEFAULT_CONTEXT_GEN_USER_TITLE: 'contextGen.userTitle',
    DEFAULT_CONTEXT_INJECT_HEADER: 'contextGen.injectHeader',
    DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX: 'contextGen.tagIntentSuffix',
    DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX: 'contextGen.forcedTagSystemSuffix',
    DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX: 'contextGen.retrySystemSuffix',
    DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX: 'contextGen.retryUserSuffix',
    DEFAULT_CONTEXT_PROFILE_LINE_TEMPLATE: 'contextGen.profileLineTemplate',
    DEFAULT_PROFILE_SYNOPSIS: 'schemaDefaults.profileSynopsis'
};

function localeDefaultLooksMissing(fullKey, translated) {
    return !translated || translated === fullKey || translated.indexOf(fullKey) === 0;
}

CS.getLocaleDefault = function(field, vars) {
    var raw = CS[field];
    var i18nKey = CS.LOCALE_DEFAULT_KEYS[field];
    if (i18nKey) {
        var I = window.PDM && window.PDM.I18n;
        if (I) {
            var val = I.t(i18nKey, vars);
            if (!localeDefaultLooksMissing(i18nKey, val)) return val;
        }
    }
    if (vars && raw != null) {
        var out = String(raw);
        for (var k in vars) {
            if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
            out = out.split('{{' + k + '}}').join(String(vars[k]));
        }
        return out;
    }
    return raw != null ? String(raw) : '';
};

window.PDM = window.PDM || {};
window.PDM.ConfigSchema = CS;

})();
