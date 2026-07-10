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
A.refreshWorkspace = function() {
    if (typeof A.syncWorkspaceUiLabels === 'function') A.syncWorkspaceUiLabels();
    A.refreshWorkspaceLlmConfig();
    A.updateWorkspaceConfigDisplay();
    A.updateThinkingAvailabilityUi();
    A.updateContextInjectUI();
    A.reloadTags();
    A.refreshSTT();
    A.updateWorkspacePromptGuard();
    A.renderAllHistories();
    if (window.PDM.STT && window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();

    /* Navigation pendant inférence : ne PAS effacer l'output si on a un backup */
    if (A.isInferenceActive()) {
        /* Inférence en cours : restaurer le bouton Arrêter */
        var cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        var sniperBtn = document.getElementById('sniperise-btn');
        if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.submitLabelRunning() : '\u23f3 Nettoyage en cours...'; }
        var sttBtn = document.getElementById('stt-btn');
        if (sttBtn) { sttBtn.disabled = true; sttBtn.title = window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text('inferenceRunningDictation') : 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.'; }
        /* Si on a un backup du streaming en cours, le restaurer */
        if (window.PDM._wsBackup) {
            var outputTa = document.getElementById('output-text');
            var outputBox = document.getElementById('output-box');
            if (outputTa) outputTa.value = window.PDM._wsBackup.text || '';
            if (outputBox) outputBox.classList.add('show', 'streaming');
            A.syncThinkingPanel(window.PDM._wsBackup.thinking || '', {
                streaming: true,
                open: true
            });
        }
        if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
            window.PDM.WorkspaceUi.applyWorkspaceTexts();
        }
        return; /* NE PAS appeler hideOutput() */
    }

    /* Pas d'inférence en cours : restaurer le dernier résultat si disponible */
    if (window.PDM._wsBackup && (window.PDM._wsBackup.text || window.PDM._wsBackup.thinking)) {
        var outputTa = document.getElementById('output-text');
        var outputBox = document.getElementById('output-box');
        if (outputTa) outputTa.value = window.PDM._wsBackup.text || '';
        if (outputBox) outputBox.classList.add('show');
        A.syncThinkingPanel(window.PDM._wsBackup.thinking || '', { streaming: false });
        if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
            window.PDM.WorkspaceUi.applyWorkspaceTexts();
        }
        return;
    }

    /* Restaurer depuis localStorage (brouillon + dernier résultat persisté) */
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
            window.PDM.UI.notif(window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text('historySaveFail') : 'Impossible d\u2019enregistrer l\u2019historique des nettoyages.', 'err');
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
            // Pour audio-dictation, on garde le même audioRef (pas de clonage nécessaire)
            entryPayload.audioRef = audio.audioRef;
            finishSave(entryPayload);
            return;
        }
    }

    finishSave(entryPayload);
};

})();
