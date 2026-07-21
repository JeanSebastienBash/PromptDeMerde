/**
 * PromptDeMerde.com — workspace-bind.js
 *
 * Synopsis : Bindings UI écran Workspace.
 * Objectif : Attacher les événements boutons, saisie, contextes bulk et badge.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-bind] PDM.App not found.'); return; }

function wu() { return window.PDM && window.PDM.WorkspaceUi; }
function wuText(key, vars) {
    return wu() ? wu().text(key, vars) : '';
}
function wsI18n(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.' + key, vars) : '';
}
function wsCharCount(n) {
    return wsI18n('charCount', { count: n });
}

function stripLastWord(value) {
    var noTrailingSpace = value.replace(/\s+$/, '');
    if (!noTrailingSpace) return '';
    return noTrailingSpace.replace(/\S+$/, '').replace(/\s+$/, '');
}

function stripWordBeforePosition(value, pos) {
    var before = value.slice(0, pos);
    var after = value.slice(pos);
    var trimmedEnd = before.replace(/\s+$/, '');
    if (!trimmedEnd) {
        return { value: after.replace(/^\s+/, ''), pos: 0 };
    }
    var newBefore = trimmedEnd.replace(/\S+$/, '').replace(/\s+$/, '');
    return { value: newBefore + after, pos: newBefore.length };
}

A.deleteWordFromInput = function(inp, target) {
    if (!inp) return;
    var mode = target || 'end';
    var value = inp.value;
    var newValue;
    var caret;

    if (mode === 'cursor') {
        if (inp.selectionStart !== inp.selectionEnd) return;
        var at = inp.selectionStart != null ? inp.selectionStart : value.length;
        var sliced = stripWordBeforePosition(value, at);
        newValue = sliced.value;
        caret = sliced.pos;
    } else {
        newValue = stripLastWord(value);
        caret = newValue.length;
    }

    if (newValue === value) return;
    inp.value = newValue;
    if (caret != null) {
        inp.selectionStart = caret;
        inp.selectionEnd = caret;
    }
    inp.dispatchEvent(new Event('input', { bubbles: true }));
};

A.bindWorkspace = function() {
    if (A._wsBound) return;
    A._wsBound = true;

    var btn = document.getElementById('sniperise-btn');
    if (btn) btn.addEventListener('click', function(){ A.doSniperise(); });

    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', function(){
            if (window.PDM._compressActive && window.PDM.PromptCompress
                && typeof window.PDM.PromptCompress.cancel === 'function') {
                window.PDM.PromptCompress.cancel();
                return;
            }
            if (window.PDM._activeAbort) {
                window.PDM._inferenceUserCancel = true;
                window.PDM._activeAbort.abort();
                window.PDM.UI.notif(wuText('inferenceCancelNotif'), 'err');
            }
        });
    }

    var copy = document.getElementById('copy-btn');
    if (copy) copy.addEventListener('click', function(){
        var ta = document.getElementById('output-text');
        if (ta) window.PDM.UI.copy(ta.value);
    });

    var copyThinking = document.getElementById('copy-thinking-btn');
    if (copyThinking) copyThinking.addEventListener('click', function(){
        var ta = document.getElementById('thinking-text');
        if (ta && ta.value.trim()) {
            window.PDM.UI.copy(ta.value);
        } else {
            window.PDM.UI.notif(wuText('copyThinkingEmpty'), 'err');
        }
    });

    var resetBtns = document.querySelectorAll('.ws-reset-btn');
    function onWorkspaceResetClick() {
        if (A.isInferenceActive()) {
            window.PDM.UI.notif(wuText('inferenceRunningReset'), 'err');
            return;
        }
        if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
            window.PDM.UI.notif(wuText('dictationRunningReset'), 'err');
            return;
        }
        var confirmMsg = wuText('resetConfirm') || 'Réinitialiser la saisie et le résultat ?';
        if (!confirm(confirmMsg)) return;
        var inpEl = document.getElementById('ws-input');
        if (inpEl) inpEl.value = '';
        A.clearWorkspaceOutput();
        document.dispatchEvent(new CustomEvent('pdm:workspace-reset'));
        if (inpEl) {
            inpEl.dispatchEvent(new Event('input', { bubbles: true }));
            inpEl.focus();
        }
    }
    for (var ri = 0; ri < resetBtns.length; ri++) {
        resetBtns[ri].addEventListener('click', onWorkspaceResetClick);
    }

    var clearInput = document.getElementById('ws-input-clear');
    if (clearInput) clearInput.addEventListener('click', function(){
        if (clearInput.disabled) return;
        if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
            window.PDM.UI.notif(wuText('dictationRunningClear'), 'err');
            return;
        }
        var inpEl = document.getElementById('ws-input');
        if (!inpEl) return;
        inpEl.value = '';
        var cc = document.getElementById('char-count');
        if (cc) cc.textContent = wsCharCount(0);
        A.syncWorkspaceOutputWithInput();
        A.scheduleWorkspaceSave();
        inpEl.focus();
        document.dispatchEvent(new CustomEvent('pdm:workspace-input-clear'));
    });

    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.addEventListener('input', function(){


            var STT = window.PDM.STT;
            var session = STT && STT.getActiveTextSession ? STT.getActiveTextSession() : null;
            if (session && session.reconcileExternalEdit) session.reconcileExternalEdit();

            var c = document.getElementById('char-count');
            if (c) c.textContent = wsCharCount(inp.value.length);
            A.syncWorkspaceOutputWithInput();
            A.scheduleWorkspaceSave();
            if (window.PDM.WorkspaceInputTools) window.PDM.WorkspaceInputTools.sync();
        });

        inp.addEventListener('keydown', function(e) {
            var Storage = window.PDM && window.PDM.Storage;
            if (!Storage || !Storage.eventMatchesSttDeleteWordShortcut || !Storage.eventMatchesSttDeleteWordShortcut(e)) return;
            e.preventDefault();
            var target = Storage.getSttDeleteWordTarget ? Storage.getSttDeleteWordTarget() : 'end';
            A.deleteWordFromInput(inp, target);
        });
    }

    var selectAllContexts = document.getElementById('context-select-all-btn');
    if (selectAllContexts) {
        selectAllContexts.addEventListener('click', function(){
            A.setAllWorkspaceContexts(true);
        });
    }

    var clearAllContexts = document.getElementById('context-clear-all-btn');
    if (clearAllContexts) {
        clearAllContexts.addEventListener('click', function(){
            A.setAllWorkspaceContexts(false);
        });
    }

    var contextPanel = document.getElementById('context-panel');
    if (contextPanel) {
        contextPanel.addEventListener('toggle', function() {
            A.scheduleWorkspaceSave();
        });
    }

var ml = document.getElementById('profiles-link');
    if (ml) {
        ml.addEventListener('click', function(e){
            e.preventDefault();
            window.location.hash = 'prompts';
        });
    }
};

A.updateContextBadge = function() {
    var badge = document.getElementById('context-active-count');
    var list = window.PDM.Profiles.load();
    var active = 0;
    for (var i = 0; i < list.length; i++) {
        if (list[i].active) active++;
    }
    if (badge) {
        badge.textContent = active === 1
            ? wsI18n('contextActive', { count: active })
            : wsI18n('contextActivePlural', { count: active });
    }
    A.updateContextBulkButtons(list.length, active);
};

A.updateContextBulkButtons = function(total, active) {
    var selectAll = document.getElementById('context-select-all-btn');
    var clearAll = document.getElementById('context-clear-all-btn');
    if (selectAll) {
        selectAll.disabled = total === 0 || active === total;
        selectAll.title = total === 0 ? wuText('contextSelectAllEmpty') : wsI18n('contextSelectAllTitle');
    }
    if (clearAll) {
        clearAll.disabled = total === 0 || active === 0;
        clearAll.title = total === 0 ? wuText('contextSelectAllEmpty') : wsI18n('contextClearAllTitle');
    }
};

A.setAllWorkspaceContexts = function(active) {
    var total = window.PDM.Profiles.setAllActive(active);
    A.reloadTags();
    A.rebuildProfileList();
    A.updateWorkspacePromptGuard();
    if (!total) {
        window.PDM.UI.notif(wuText('contextBulkNone'), 'info');
        return;
    }
    window.PDM.UI.notif(active ? wuText('contextBulkAllActive') : wuText('contextBulkAllInactive'), 'ok');
};

A.getDefaultProviderId = function() {
    return window.PDM.Providers.defaultProvider();
};

A.updateWorkspaceConfigDisplay = function() {
    A.syncWorkspaceOutputModelSelect();
};

})();
