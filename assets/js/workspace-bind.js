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
/* ===== WORKSPACE ===== */
A.bindWorkspace = function() {
    if (A._wsBound) return;
    A._wsBound = true;

    var btn = document.getElementById('sniperise-btn');
    if (btn) btn.addEventListener('click', function(){ A.doSniperise(); });

    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', function(){
            if (window.PDM._activeAbort) {
                window.PDM._inferenceUserCancel = true;
                window.PDM._activeAbort.abort();
                window.PDM.UI.notif(wuText('inferenceCancelNotif'), 'err');
            }
        });
    }

    /* ===== Boutons copie workspace ===== */
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

    var resetBtn = document.getElementById('ws-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', function(){
        if (A.isInferenceActive()) {
            window.PDM.UI.notif(wuText('inferenceRunningReset'), 'err');
            return;
        }
        if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
            window.PDM.UI.notif(wuText('dictationRunningReset'), 'err');
            return;
        }
        var inpEl = document.getElementById('ws-input');
        if (inpEl) inpEl.value = '';
        var cc = document.getElementById('char-count');
        if (cc) cc.textContent = '0 / 50000';
        A.clearWorkspaceOutput();
        if (inpEl) inpEl.focus();
        document.dispatchEvent(new CustomEvent('pdm:workspace-reset'));
    });

    var clearInput = document.getElementById('ws-input-clear');
    if (clearInput) clearInput.addEventListener('click', function(){
        if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
            window.PDM.UI.notif(wuText('dictationRunningClear'), 'err');
            return;
        }
        var inpEl = document.getElementById('ws-input');
        if (!inpEl) return;
        inpEl.value = '';
        var cc = document.getElementById('char-count');
        if (cc) cc.textContent = '0 / 50000';
        A.syncWorkspaceOutputWithInput();
        A.scheduleWorkspaceSave();
        inpEl.focus();
        document.dispatchEvent(new CustomEvent('pdm:workspace-input-clear'));
    });

    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.addEventListener('input', function(){
            var c = document.getElementById('char-count');
            if (c) c.textContent = inp.value.length + ' / 50000';
            A.syncWorkspaceOutputWithInput();
            A.scheduleWorkspaceSave();
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
    if (badge) badge.textContent = active + ' actif' + (active !== 1 ? 's' : '');
    A.updateContextBulkButtons(list.length, active);
};

A.updateContextBulkButtons = function(total, active) {
    var selectAll = document.getElementById('context-select-all-btn');
    var clearAll = document.getElementById('context-clear-all-btn');
    if (selectAll) {
        selectAll.disabled = total === 0 || active === total;
        selectAll.title = total === 0 ? wuText('contextSelectAllEmpty') : 'Tout s\u00e9lectionner';
    }
    if (clearAll) {
        clearAll.disabled = total === 0 || active === 0;
        clearAll.title = total === 0 ? wuText('contextSelectAllEmpty') : 'Tout d\u00e9s\u00e9lectionner';
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
