/**
 * PromptDeMerde.com — stt-shared-text.js
 *
 * Synopsis : Session texte dictée interim/final, éditable en temps réel.
 * Objectif : createTextSession (modèle par découpe/« span vivant ») et joinText pour liaison textarea.
 *
 * Modèle : la valeur du textarea est la seule source de vérité. La dictée insère/replace un
 * segment « vivant » (l'équivalent du texte provisoire d'un IME) à une ancre calculée selon le
 * réglage fin/curseur ; tout le reste du texte n'est jamais retouché, ce qui permet à l'utilisateur
 * de modifier librement au clavier pendant que le flux vocal continue.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-text] PDM.STT.Shared not found.'); return; }

function wsCharCount(n) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.charCount', { count: n }) : (n + ' / ' + Shared.MAX_CHARS);
}

Shared.joinText = function(a, b) {
    var left = (a || '').replace(/\s+$/, '');
    var right = (b || '').replace(/^\s+/, '').replace(/\s+$/, '');
    if (!right) return left;
    if (!left) return right;
    return left + ' ' + right;
};

function commonPrefixLen(a, b) {
    var max = Math.min(a.length, b.length);
    var i = 0;
    while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) i++;
    return i;
}

function commonSuffixLen(a, b, maxLen) {
    var i = 0;
    while (i < maxLen && a.charCodeAt(a.length - 1 - i) === b.charCodeAt(b.length - 1 - i)) i++;
    return i;
}

function adjustOffset(offset, spliceStart, spliceEnd, insertedLen) {
    if (offset == null) return offset;


    if (offset < spliceStart) return offset;
    if (offset >= spliceEnd) return offset - (spliceEnd - spliceStart) + insertedLen;
    return spliceStart + insertedLen;
}

function insertAtCursorMode() {
    return !!(window.PDM && window.PDM.Storage && window.PDM.Storage.getSttInsertAtCursor && window.PDM.Storage.getSttInsertAtCursor());
}

Shared.createTextSession = function(els, onSave) {
    var session = {
        lastKnownValue: els.input ? els.input.value : '',
        liveStart: -1,
        liveLen: 0,
        hasAnchor: false
    };

    session.computeAnchor = function(value) {
        var inp = els.input;
        if (inp && insertAtCursorMode()) {
            var s = inp.selectionStart, e = inp.selectionEnd;
            if (typeof s === 'number' && typeof e === 'number' && s >= 0 && e >= s && e <= value.length) {
                return { start: s, end: e };
            }
        }
        return { start: value.length, end: value.length };
    };

    session.triggerSave = function() {
        if (onSave) onSave();
    };

    session.reset = function() {
        session.lastKnownValue = els.input ? els.input.value : '';
        session.liveStart = -1;
        session.liveLen = 0;
        session.hasAnchor = false;
    };

    session.finalizeInterim = function() {
        if (session.hasAnchor) {
            session.hasAnchor = false;
            session.liveStart = -1;
            session.liveLen = 0;
        }
    };



    session.applyLiveText = function(text, commit) {
        if (!els.input) return session.lastKnownValue.length;
        var inp = els.input;
        var selStart = inp.selectionStart;
        var selEnd = inp.selectionEnd;
        var hasSel = typeof selStart === 'number' && typeof selEnd === 'number';
        var value = inp.value;
        var trimmed = (text || '').replace(/^\s+/, '').replace(/\s+$/, '');

        var spliceStart, spliceEnd;
        if (session.hasAnchor) {
            spliceStart = session.liveStart;
            spliceEnd = Math.min(value.length, session.liveStart + session.liveLen);
        } else if (trimmed) {
            var anchor = session.computeAnchor(value);
            spliceStart = anchor.start;
            spliceEnd = anchor.end;
        } else {
            session.lastKnownValue = value;
            return value.length;
        }

        var before = value.slice(0, spliceStart);
        var after = value.slice(spliceEnd);
        var insertText = trimmed;
        if (insertText && before && !/\s$/.test(before)) insertText = ' ' + insertText;

        var newValue = before + insertText + after;
        var clipped = false;
        if (newValue.length > Shared.MAX_CHARS) {
            newValue = newValue.slice(0, Shared.MAX_CHARS);
            clipped = true;
        }
        inp.value = newValue;

        var insertedLen = Math.max(0, newValue.length - after.length - before.length);

        if (hasSel) {
            var newSelStart = adjustOffset(selStart, spliceStart, spliceEnd, insertedLen);
            var newSelEnd = adjustOffset(selEnd, spliceStart, spliceEnd, insertedLen);
            try { inp.setSelectionRange(newSelStart, newSelEnd); } catch (e) {}
        }

        if (commit || clipped) {
            session.hasAnchor = false;
            session.liveStart = -1;
            session.liveLen = 0;
        } else {
            session.hasAnchor = true;
            session.liveStart = spliceStart;
            session.liveLen = insertedLen;
        }

        if (els.charCount) els.charCount.textContent = wsCharCount(newValue.length);
        if (spliceStart + insertedLen >= newValue.length) inp.scrollTop = inp.scrollHeight;

        session.lastKnownValue = newValue;
        return newValue.length;
    };

    session.setInterim = function(text) {
        session.applyLiveText(text, false);
    };

    session.setFinalized = function(text) {
        session.applyLiveText(text, true);
        session.triggerSave();
    };





    session.reconcileExternalEdit = function() {
        if (!els.input) return;
        var oldValue = session.lastKnownValue;
        var newValue = els.input.value;
        if (oldValue === newValue) return;

        if (!session.hasAnchor || session.liveLen === 0) {
            session.lastKnownValue = newValue;
            return;
        }

        var prefix = commonPrefixLen(oldValue, newValue);
        var maxSuffix = Math.min(oldValue.length - prefix, newValue.length - prefix);
        var suffix = commonSuffixLen(oldValue, newValue, Math.max(0, maxSuffix));
        var spliceStart = prefix;
        var spliceEnd = oldValue.length - suffix;
        var insertedLen = (newValue.length - suffix) - prefix;

        var liveEnd = session.liveStart + session.liveLen;
        if (spliceEnd <= session.liveStart) {
            session.liveStart = adjustOffset(session.liveStart, spliceStart, spliceEnd, insertedLen);
        } else if (spliceStart >= liveEnd) {

        } else {

            session.hasAnchor = false;
            session.liveStart = -1;
            session.liveLen = 0;
        }

        session.lastKnownValue = newValue;
    };



    session.apply = function() {
        if (!els.input) return 0;
        var text = els.input.value;
        if (els.charCount) els.charCount.textContent = wsCharCount(text.length);
        els.input.scrollTop = els.input.scrollHeight;
        session.lastKnownValue = text;
        return text.length;
    };

    return session;
};

})();
