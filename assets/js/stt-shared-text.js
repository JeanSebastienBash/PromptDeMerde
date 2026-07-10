/**
 * PromptDeMerde.com — stt-shared-text.js
 *
 * Synopsis : Session texte dictée interim/final.
 * Objectif : createTextSession et joinText pour liaison textarea.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-text] PDM.STT.Shared not found.'); return; }

Shared.joinText = function(a, b) {
    var left = (a || '').replace(/\s+$/, '');
    var right = (b || '').replace(/^\s+/, '').replace(/\s+$/, '');
    if (!right) return left;
    if (!left) return right;
    return left + ' ' + right;
};

Shared.createTextSession = function(els, onSave) {
    var session = {
        committedBase: '',
        finalizedSession: '',
        currentInterim: ''
    };

    session.buildDisplayText = function() {
        var full = Shared.joinText(session.committedBase, session.finalizedSession);
        full = Shared.joinText(full, session.currentInterim);
        if (full.length > Shared.MAX_CHARS) full = full.slice(0, Shared.MAX_CHARS);
        return full;
    };

    session.apply = function() {
        if (!els.input) return 0;
        var text = session.buildDisplayText();
        els.input.value = text;
        if (els.charCount) els.charCount.textContent = text.length + ' / ' + Shared.MAX_CHARS;
        els.input.scrollTop = els.input.scrollHeight;
        return text.length;
    };

    session.triggerSave = function() {
        if (onSave) onSave();
    };

    session.reset = function() {
        session.committedBase = els.input ? els.input.value : '';
        session.finalizedSession = '';
        session.currentInterim = '';
    };

    session.finalizeInterim = function() {
        if (session.currentInterim) {
            session.finalizedSession = Shared.joinText(session.finalizedSession, session.currentInterim.trim());
            session.currentInterim = '';
        }
    };

    session.setInterim = function(text) {
        session.currentInterim = text || '';
        session.apply();
    };

    session.setFinalized = function(text) {
        session.finalizedSession = Shared.joinText(session.finalizedSession, (text || '').trim());
        session.currentInterim = '';
        session.apply();
        session.triggerSave();
    };

    return session;
};

})();
