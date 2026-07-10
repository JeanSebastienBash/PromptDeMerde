/**
 * PromptDeMerde.com — config-schema-core.js
 *
 * Synopsis : Constantes schéma pdm-config, clés et valeurs par défaut.
 * Objectif : Créer PDM.ConfigSchema (CS) et ses constantes ; helpers dans config-schema-helpers.js, build/normalisation dans config-schema-build.js.
 */
(function() {

var CS = {};

CS.VERSION = '1.11.0';
CS.CONFIG_TYPE = 'pdm-config';
CS.DEFAULT_ACTIVE_PROFILE = 'speech2texte';
CS.DEFAULT_PLATFORM_URL = 'https://promptdemerde.com';

CS.STT_ENGINES = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
CS.LANGUAGES = ['fr', 'en'];
CS.CONTEXT_POSITIONS = ['after_system', 'before_system'];
CS.STT_COMPUTE = ['cpu', 'gpu'];

CS.THEME_IDS = [
    'light', 'day', 'dark',
    'orange-day', 'orange', 'red-day', 'red', 'gray-day', 'gray', 'yellow-day', 'yellow',
    'fuchsia-day', 'fuchsia', 'ocean-day', 'ocean', 'forest-day', 'forest', 'cyber-day', 'cyber',
    'rose-day', 'rose', 'terminal-day', 'terminal'
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
    'pdm_llm_thinking_max_chars',
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
    'pdm_audio_blobs',
    'pdm_workspace_ui'
];

CS.WORKSPACE_UI_IDENTITY_KEYS = ['username', 'hostname', 'usernameAlt'];
CS.WORKSPACE_UI_BRAND_KEYS = [
    'firstWord', 'secondWord', 'extension', 'showExtension',
    'firstWordClass', 'secondWordClass', 'extensionClass'
];
CS.WORKSPACE_UI_TEXT_KEYS = [
    'inputPlaceholder', 'inputAriaLabel', 'outputPlaceholder', 'thinkingPlaceholder',
    'submitLabel', 'submitLabelRunning', 'cancelLabel', 'resetLabel', 'resetTitle',
    'emptyPromptError', 'noContextError', 'promptGuardHtml', 'guardNoContextTitle',
    'inferenceCancelNotif', 'copyThinkingEmpty', 'inferenceRunningReset',
    'dictationRunningReset', 'dictationRunningClear', 'inferenceRunningDictation',
    'inferenceConnecting', 'inferenceRunningPlaceholder', 'inferenceFinalizing',
    'inferenceOutputAfterThinking', 'inferenceInterrupted', 'inferenceErrorPrefix',
    'inferenceThinkingLimit', 'inferenceThinkingLimitDone',
    'contextNoProfilesHint', 'contextSelectAllEmpty', 'contextBulkNone',
    'contextBulkAllActive', 'contextBulkAllInactive',
    'audioClearTitle', 'audioClearProcessingTitle', 'audioClearCancelTitle',
    'audioProcessingPlaceholder', 'audioFileDefault', 'audioTranscribingLabel',
    'audioPrepDetail', 'audioProcessingHint', 'audioDoneLabel', 'audioNewInput',
    'audioInferenceWait', 'audioDictationImportWait', 'audioTranscribeFail',
    'audioTranscriptionCancelled', 'audioModeExited', 'audioEngineUnavailable',
    'thinkingUnavailableMsg', 'thinkingUnavailableHint',
    'thinkingToggleOn', 'thinkingToggleOff', 'thinkingEnabledNotif', 'thinkingDisabledNotif',
    'historySaveFail', 'historyEmpty', 'historyPurgeTitle'
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
        firstWordClass: '',
        secondWordClass: 'red',
        extensionClass: 'logo-dotcom'
    },
    texts: {
        inputPlaceholder: 'Ex: \u00e9cris un truc cool sur les chats',
        inputAriaLabel: 'Colle ton prompt de merde ici',
        outputPlaceholder: 'Le prompt nettoy\u00e9 appara\u00eetra ici\u2026',
        thinkingPlaceholder: 'La r\u00e9flexion appara\u00eetra ici en direct\u2026',
        submitLabel: 'NETTOYER CE TAS DE MERDE \u2192',
        submitLabelRunning: '\u23f3 Nettoyage en cours...',
        cancelLabel: '\u23f9 Arr\u00eater',
        resetLabel: 'Reset',
        resetTitle: 'R\u00e9initialiser saisie et r\u00e9sultat',
        emptyPromptError: 'Tu as oubli\u00e9 de coller ton prompt.',
        noContextError: 'Active le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.',
        promptGuardHtml: 'Active le <a href="#prompts">prompt syst\u00e8me</a> ou un <a href="#prompts">contexte</a> pour lancer le LLM.',
        guardNoContextTitle: 'Active le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.',
        inferenceCancelNotif: 'Inf\u00e9rence annul\u00e9e par l\'utilisateur.',
        copyThinkingEmpty: 'Aucune r\u00e9flexion \u00e0 copier.',
        inferenceRunningReset: 'Nettoyage en cours \u2014 arr\u00eate-le avant de r\u00e9initialiser.',
        dictationRunningReset: 'Arr\u00eate la dict\u00e9e avant de r\u00e9initialiser.',
        dictationRunningClear: 'Arr\u00eate la dict\u00e9e avant d\'effacer.',
        inferenceRunningDictation: 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.',
        inferenceConnecting: '\u23f3 Connexion au serveur...',
        inferenceRunningPlaceholder: '\u23f3 Le nettoyage est en cours...',
        inferenceFinalizing: 'Finalisation du nettoyage\u2026',
        inferenceOutputAfterThinking: 'Le prompt nettoy\u00e9 appara\u00eetra ici apr\u00e8s la r\u00e9flexion\u2026',
        inferenceInterrupted: '\u23f9 Interrompu \u2014 texte partiel conserv\u00e9',
        inferenceErrorPrefix: '\u274c Erreur : ',
        inferenceThinkingLimit: 'Limite de r\u00e9flexion atteinte ({{max}} caract\u00e8res) \u2014 poursuite du nettoyage.',
        inferenceThinkingLimitDone: 'Limite de r\u00e9flexion atteinte ({{max}} caract\u00e8res).',
        contextNoProfilesHint: 'Aucune option pour l\u2019instant. Cr\u00e9e-en dans l\u2019onglet Prompts.',
        contextSelectAllEmpty: 'Cr\u00e9e d\u2019abord un prompt de contexte.',
        contextBulkNone: 'Aucun prompt de contexte \u00e0 modifier.',
        contextBulkAllActive: 'Tous les prompts de contexte sont actifs.',
        contextBulkAllInactive: 'Tous les prompts de contexte sont inactifs.',
        audioClearTitle: 'Effacer la saisie',
        audioClearProcessingTitle: 'Annuler la transcription',
        audioClearCancelTitle: 'Quitter le mode audio et repasser en saisie / dict\u00e9e',
        audioProcessingPlaceholder: 'Transcription en cours\u2026 (Whisper Maxi, 100\u00a0% local)',
        audioFileDefault: 'Fichier audio',
        audioTranscribingLabel: 'Transcription de \u00ab {{name}} \u00bb',
        audioPrepDetail: 'Pr\u00e9paration\u2026',
        audioProcessingHint: 'Dict\u00e9e et saisie apr\u00e8s transcription \u2014 \u00c9chap ou corbeille pour annuler.',
        audioDoneLabel: 'Transcription termin\u00e9e \u2014 {{name}}',
        audioNewInput: 'Nouvelle saisie',
        audioInferenceWait: 'Nettoyage en cours \u2014 attends la fin.',
        audioDictationImportWait: 'Arr\u00eate la dict\u00e9e avant d\'importer un audio.',
        audioTranscribeFail: '\u00c9chec de la transcription : ',
        audioTranscriptionCancelled: 'Transcription annul\u00e9e.',
        audioModeExited: 'Mode audio quitt\u00e9 \u2014 saisie manuelle ou dict\u00e9e disponibles.',
        audioEngineUnavailable: 'Moteur audio (Whisper Maxi) indisponible.',
        thinkingUnavailableMsg: 'La r\u00e9flexion n\u2019est pas disponible pour ce mod\u00e8le.',
        thinkingUnavailableHint: 'Ce mod\u00e8le ne prend pas en charge la r\u00e9flexion : activer cette option n\u2019aura aucun effet.',
        thinkingToggleOn: 'R\u00e9flexion activ\u00e9e \u2014 cliquer pour d\u00e9sactiver',
        thinkingToggleOff: 'R\u00e9flexion d\u00e9sactiv\u00e9e \u2014 cliquer pour activer',
        thinkingEnabledNotif: 'R\u00e9flexion activ\u00e9e',
        thinkingDisabledNotif: 'R\u00e9flexion d\u00e9sactiv\u00e9e',
        historySaveFail: 'Impossible d\u2019enregistrer l\u2019historique des nettoyages.',
        historyEmpty: 'Aucune entr\u00e9e.',
        historyPurgeTitle: 'Purger tout l\'historique local'
    }
};

CS.REQUIRED_ROOT_KEYS = CS.META_KEYS.concat(CS.PDM_KEYS);

CS.PROFILE_KEYS = ['id', 'tag', 'prompt', 'active', 'origin'];
CS.PROFILE_ORIGIN_KEYS = [
    'method', 'generatedAt', 'createdAt', 'provider', 'model',
    'systemPrompt', 'userPrompt', 'sourceFile'
];
CS.PROFILE_ORIGIN_METHODS = ['ai_intent', 'ai_title', 'manual', 'profile_bundle'];
CS.WORKSPACE_KEYS = [
    'input', 'output', 'thinking', 'savedAt', 'contextPanelOpen',
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount'
];
CS.WORKSPACE_INPUT_SOURCES = ['manual', 'audio-file', 'audio-dictation'];
CS.AUDIO_META_KEYS = [
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount'
];
CS.HISTORY_REQUIRED = ['id', 'type', 'at', 'input'];
CS.HISTORY_OPTIONAL = [
    'output', 'thinking', 'systemPrompt', 'systemPromptEffective',
    'contextPosition', 'activeContexts', 'usage', 'duration_ms', 'provider', 'model',
    'inputSource', 'audioFileName', 'audioFileSize', 'audioMimeType', 'audioLastModified', 'audioRef', 'audioSegmentCount'
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

window.PDM = window.PDM || {};
window.PDM.ConfigSchema = CS;

})();
