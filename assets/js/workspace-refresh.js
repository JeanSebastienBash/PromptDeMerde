/**
 * PromptDeMerde.com — workspace-refresh.js
 *
 * Synopsis : Rafraîchissement écran Workspace.
 * Objectif : Recharger tags, helpers historique et refreshWorkspace.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-refresh] PDM.App not found.'); return; }

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}
A.refreshWorkspace = function() {
    if (typeof A.syncWorkspaceUiLabels === 'function') A.syncWorkspaceUiLabels();
    A.refreshWorkspaceLlmConfig();
    A.updateWorkspaceConfigDisplay();
    A.updateThinkingAvailabilityUi();
    if (typeof A.syncLlmOptionsUi === 'function') A.syncLlmOptionsUi();
    A.updateContextInjectUI();
    A.reloadTags();
    A.refreshSTT();
    A.updateWorkspacePromptGuard();
    A.renderAllHistories();
    if (window.PDM.STT && window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();

    if (A.isInferenceActive()) {
        var cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        var sniperBtn = document.getElementById('sniperise-btn');
        if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.submitLabelRunning() : wuText('submitLabelRunning'); }
        var sttBtn = document.getElementById('stt-btn');
        if (sttBtn) { sttBtn.disabled = true; sttBtn.title = window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text('inferenceRunningDictation') : wuText('inferenceRunningDictation'); }
        if (window.PDM._wsBackup) {
            var outputBox = document.getElementById('output-box');
            if (outputBox) outputBox.classList.add('streaming');
            if (typeof A.applyWorkspaceOutputFormat === 'function') {
                A.applyWorkspaceOutputFormat();
            } else {
                var outputTa = document.getElementById('output-text');
                if (outputTa) outputTa.value = window.PDM._wsBackup.text || '';
            }
            var thinkSrc = window.PDM._wsBackup.plainThinking != null
                ? window.PDM._wsBackup.plainThinking
                : (window.PDM._wsBackup.thinking || '');
            A.syncThinkingPanel(
                typeof A.wrapOutputForDisplay === 'function'
                    ? A.wrapOutputForDisplay(thinkSrc, null, 'thinking')
                    : thinkSrc,
                {
                    streaming: true,
                    open: true
                }
            );
        }
        if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
            window.PDM.WorkspaceUi.applyWorkspaceTexts();
        }
        return;
    }

    if (window.PDM._wsBackup && (window.PDM._wsBackup.text || window.PDM._wsBackup.thinking || window.PDM._wsBackup.plain)) {
        if (typeof A.applyWorkspaceOutputFormat === 'function') {
            A.applyWorkspaceOutputFormat();
        } else {
            var outputTa = document.getElementById('output-text');
            if (outputTa) outputTa.value = window.PDM._wsBackup.text || '';
        }
        var thinkPlain = window.PDM._wsBackup.plainThinking != null
            ? window.PDM._wsBackup.plainThinking
            : (window.PDM._wsBackup.thinking || '');
        A.syncThinkingPanel(
            typeof A.wrapOutputForDisplay === 'function'
                ? A.wrapOutputForDisplay(thinkPlain, null, 'thinking')
                : thinkPlain,
            { streaming: false }
        );
        if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
            window.PDM.UI.syncOutputEmptyState();
        }
        if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
            window.PDM.WorkspaceUi.applyWorkspaceTexts();
        }
        return;
    }

    A.restoreWorkspaceFromStorage();

    if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
        window.PDM.WorkspaceUi.applyWorkspaceTexts();
    }
};

A.reloadTags = function() {
    var box = document.getElementById('profiles-tags');
    if (!box) return;
    var list = window.PDM.Profiles.load();
    window.PDM.UI.renderTags(list, box, function() {
        A.updateContextBadge();
        A.updateWorkspacePromptGuard();
    });
    A.updateContextBadge();
    A.updateWorkspacePromptGuard();
};

A._collectActiveContexts = function(profiles) {
    var out = [];
    if (!profiles || !profiles.length) return out;
    for (var i = 0; i < profiles.length; i++) {
        if (!profiles[i].active) continue;
        out.push({
            id: profiles[i].id,
            tag: profiles[i].tag,
            prompt: profiles[i].prompt
        });
    }
    return out;
};

A._saveCleanEntry = function(opts) {
    if (!opts || !opts.input) return;

    var audio = window.PDM.Storage.getWorkspaceAudio ? window.PDM.Storage.getWorkspaceAudio() : null;
    var entryPayload = {
        provider: opts.provider,
        model: opts.model,
        input: opts.input,
        output: opts.output,
        thinking: opts.thinking,
        systemPrompt: opts.systemPrompt,
        systemPromptEffective: opts.systemPromptEffective,
        contextPosition: opts.contextPosition,
        activeContexts: opts.activeContexts,
        usage: opts.usage,
        duration_ms: opts.duration_ms
    };
    if (opts.trace && typeof opts.trace === 'object') {
        entryPayload.trace = opts.trace;
    }

    if (audio && (audio.inputSource === 'audio-file' || audio.inputSource === 'audio-dictation')) {
        entryPayload.inputSource = audio.inputSource;
        entryPayload.audioFileName = audio.audioFileName;
        entryPayload.audioFileSize = audio.audioFileSize;
        entryPayload.audioMimeType = audio.audioMimeType;
        entryPayload.audioLastModified = audio.audioLastModified;
        entryPayload.audioSegmentCount = audio.audioSegmentCount;
    }

    function finishSave(payload) {
        var item = window.PDM.Storage.addCleanEntry(payload);
        if (!item) {
            window.PDM.UI.notif(wuText('historySaveFail'), 'err');
            return;
        }
        if (window.PDM.Storage.syncHistoryAudioOrphans) {
            window.PDM.Storage.syncHistoryAudioOrphans();
        }
    }

    if (audio && (audio.inputSource === 'audio-file' || audio.inputSource === 'audio-dictation') && audio.audioRef) {
        var list = window.PDM.Storage.getCleanHistory();
        var entryId = 'h' + Date.now() + '-' + list.length;
        entryPayload.id = entryId;

        if (audio.inputSource === 'audio-file' && window.PDM.StorageAudioBlobs && window.PDM.StorageAudioBlobs.cloneRef) {
            entryPayload.audioRef = entryId;
            window.PDM.StorageAudioBlobs.cloneRef(audio.audioRef, entryId).then(function(ok) {
                if (!ok) entryPayload.audioRef = null;
                finishSave(entryPayload);
            });
            return;
        } else if (audio.inputSource === 'audio-dictation' && window.PDM.STTDictationRecorder) {
            entryPayload.audioRef = audio.audioRef;
            finishSave(entryPayload);
            return;
        }
    }

    finishSave(entryPayload);
};

})();
