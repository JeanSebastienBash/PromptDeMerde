/**
 * PromptDeMerde.com — stt-shared-core.js
 *
 * Synopsis : Constantes STT et registre moteurs.
 * Objectif : Créer PDM.STT.Shared et registerEngine.
 */
(function() {
var Shared = {};

Shared.MAX_CHARS = 50000;
Shared.MIC_ICON = '\uD83C\uDFA4';

Shared.WHISPER_LANG_MAP = {
    fr: 'french',
    en: 'english',
    ar: 'arabic',
    zh: 'chinese',
    eo: 'english',
    es: 'spanish',
    de: 'german',
    pt: 'portuguese',
    it: 'italian',
    ru: 'russian',
    ja: 'japanese',
    ko: 'korean'
};

Shared.ENGINE_I18N_KEYS = {
    'vosk-mini': 'voskMini',
    'vosk-maxi': 'voskMaxi',
    'whisper-mini': 'whisperMini',
    'whisper-maxi': 'whisperMaxi',
    parakeet: 'parakeet'
};

Shared.sttT = function(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('stt.' + key, vars) : '';
};

Shared.getSttLocale = function() {
    var I = window.PDM && window.PDM.I18n;
    if (I && I.getLocale) return I.getLocale();
    if (window.PDM && window.PDM.Storage) {
        return window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr';
    }
    return 'fr';
};

Shared.whisperLanguage = function(lang) {
    lang = lang || Shared.getSttLocale();
    return Shared.WHISPER_LANG_MAP[lang] || Shared.WHISPER_LANG_MAP.en || 'english';
};

Shared.engineLabel = function(engineId) {
    var i18nKey = Shared.ENGINE_I18N_KEYS[engineId];
    if (i18nKey) {
        var label = Shared.sttT('engines.' + i18nKey);
        if (label && label.indexOf('stt.') !== 0) return label;
    }
    return engineId;
};

Shared.getBtnStart = function() {
    return Shared.sttT('dictate') || (Shared.MIC_ICON + ' D\u00e9marrer dict\u00e9e vocale');
};

Shared.getBtnStop = function() {
    return Shared.sttT('btnStop') || '\u23F9 Stopper la dict\u00e9e vocale';
};

Shared.getBtnCancelLoad = function() {
    return Shared.sttT('btnCancelLoad') || '\u23F9 ANNULER LE CHARGEMENT';
};

Shared.BTN_START = Shared.getBtnStart();
Shared.BTN_STOP = Shared.getBtnStop();
Shared.BTN_CANCEL_LOAD = Shared.getBtnCancelLoad();

Shared.STATE_UNSUPPORTED = 'unsupported';
Shared.STATE_IDLE = 'idle';
Shared.STATE_LOADING = 'loading';
Shared.STATE_PERMISSION = 'permission';
Shared.STATE_LISTENING = 'listening';
Shared.STATE_ERROR = 'error';

window.PDM = window.PDM || {};
window.PDM.STT = window.PDM.STT || {};
window.PDM.STT.Shared = Shared;

window.PDM.STT._engines = window.PDM.STT._engines || {};
window.PDM.STT.registerEngine = window.PDM.STT.registerEngine || function(engine) {
    if (!engine || !engine.id) return;
    window.PDM.STT._engines[engine.id] = engine;
};
})();
