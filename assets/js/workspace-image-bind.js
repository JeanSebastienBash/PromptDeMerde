/**
 * PromptDeMerde.com — workspace-image-bind.js
 *
 * Synopsis : Import image Workspace → description via modèle vision Ollama.
 * Objectif : File picker (pas de drag-and-drop), injection du texte dans #ws-input.
 */
(function(){
'use strict';

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-image-bind] PDM.App not found.'); return; }

var imageJobGen = 0;
var activeAbort = null;
var processing = false;

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function syncInputTools() {
    if (window.PDM && window.PDM.WorkspaceInputTools) {
        window.PDM.WorkspaceInputTools.sync();
    }
}

function statusEl() {
    return document.getElementById('ws-image-status');
}

function setStatus(visible, text, processingOn) {
    var st = statusEl();
    if (!st) return;
    if (!visible) {
        st.hidden = true;
        st.textContent = '';
        st.classList.remove('ws-image-status-processing', 'ws-image-status-done');
        return;
    }
    st.hidden = false;
    st.textContent = text || '';
    st.classList.toggle('ws-image-status-processing', !!processingOn);
    st.classList.toggle('ws-image-status-done', !processingOn);
}

function setInput(text) {
    var inp = document.getElementById('ws-input');
    if (!inp) return;
    inp.value = text || '';
    var cc = document.getElementById('char-count');
    if (cc) {
        var max = window.PDM.STT && window.PDM.STT.Shared && window.PDM.STT.Shared.MAX_CHARS
            ? window.PDM.STT.Shared.MAX_CHARS
            : 50000;
        cc.textContent = inp.value.length + ' / ' + max;
    }
}

function busy() {
    if (processing) {
        window.PDM.UI.notif(wuText('imageImportBlockedTitle'), 'err');
        return true;
    }
    if (A.isInferenceActive && A.isInferenceActive()) {
        window.PDM.UI.notif(wuText('imageInferenceWait'), 'err');
        return true;
    }
    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
        window.PDM.UI.notif(wuText('imageDictationImportWait'), 'err');
        return true;
    }
    if (A.isWorkspaceAudioMode && A.isWorkspaceAudioMode()) {
        window.PDM.UI.notif(wuText('imageAudioModeWait'), 'err');
        return true;
    }
    if (A.isWorkspaceAudioProcessing && A.isWorkspaceAudioProcessing()) {
        window.PDM.UI.notif(wuText('imageAudioModeWait'), 'err');
        return true;
    }
    return false;
}

function cancelJob() {
    imageJobGen++;
    if (activeAbort) {
        try { activeAbort.abort(); } catch (e) {}
        activeAbort = null;
    }
    processing = false;
    A._wsImageProcessing = false;
    setStatus(false);
    syncInputTools();
}

function errMsg(err) {
    return err && err.message ? String(err.message) : String(err || '');
}

function lookLikeMissingModel(err) {
    var low = errMsg(err).toLowerCase();
    if (err && err.code === 'MODEL_NOT_FOUND') return true;
    if (low.indexOf('no such model') >= 0) return true;
    if (low.indexOf('model') >= 0 && (low.indexOf('not found') >= 0 || low.indexOf('404') >= 0)) return true;
    if (/try\s+['`]?ollama\s+pull/i.test(low)) return true;
    return false;
}

function lookLikeUnreachable(err) {
    var low = errMsg(err).toLowerCase();
    if (err && (err.code === 'PROXY_TOKEN_MISSING' || err.code === 'OLLAMA_UNREACHABLE')) return true;
    if (/failed to fetch|networkerror|load failed|network request failed|econnrefused|enotfound|etimedout/i.test(low)) return true;
    if (/injoignable|unreachable|cors ollama|proxy.*refus|token non renseign/i.test(low)) return true;
    if (/ollama\s+http\s+(502|503|504)/i.test(low)) return true;
    return false;
}

function lookLikeTimeout(err) {
    var low = errMsg(err).toLowerCase();
    if (err && err.code === 'TIMEOUT') return true;
    if (/timeout|d[eé]lai|took more than|aucune r[eé]ponse depuis/i.test(low)) return true;
    return false;
}

function classifyImageError(err) {
    var msg = errMsg(err);
    if (err && err.userCancelled) return 'imageCancelled';
    if (msg === 'image-unsupported') return 'imageUnsupported';
    if (msg === 'image-too-large') return 'imageTooLarge';
    if (msg === 'image-decode-fail') return 'imageDecodeFail';
    if (msg === 'vision-unavailable') return 'imageVisionUnavailable';
    if (msg === 'empty-vision') return 'imageEmptyResult';
    if (lookLikeMissingModel(err)) return 'imageModelMissing';
    if (lookLikeTimeout(err)) return 'imageAnalyzeTimeout';
    if (lookLikeUnreachable(err)) return 'imageOllamaUnreachable';
    return 'imageAnalyzeFail';
}

function handleFile(file) {
    if (!file || busy()) return;
    var Enc = window.PDM.WorkspaceImageEncode;
    if (!Enc || !Enc.isAcceptedFile(file)) {
        window.PDM.UI.notif(wuText('imageUnsupported'), 'err');
        return;
    }

    var job = ++imageJobGen;
    processing = true;
    A._wsImageProcessing = true;
    syncInputTools();
    setStatus(true, wuText('imageAnalyzing', { name: file.name || wuText('imageFileDefault') }), true);

    var controller = new AbortController();
    activeAbort = controller;

    Enc.encodeFile(file).then(function(b64) {
        if (job !== imageJobGen) return null;
        var S = window.PDM.Storage;
        var model = S.getImageModel ? S.getImageModel() : 'moondream';
        var prompt = S.getImagePromptEffective ? S.getImagePromptEffective() : '';
        var provider = window.PDM.Providers && window.PDM.Providers.get
            ? window.PDM.Providers.get(S.getProvider())
            : null;
        if (!provider || typeof provider.visionDescribe !== 'function') {
            throw new Error('vision-unavailable');
        }
        setStatus(true, wuText('imageAnalyzingOllama', { model: model }), true);
        return provider.visionDescribe(model, prompt, b64, {
            abortController: controller,
            streaming: false,
            think: false
        }).then(function(data) {
            return { data: data, model: model };
        });
    }).then(function(pack) {
        if (!pack || job !== imageJobGen) return;
        var text = pack.data && pack.data.result != null ? String(pack.data.result).trim() : '';
        if (!text) throw new Error('empty-vision');
        setInput(text);
        var prev = window.PDM.Storage.getWorkspace ? window.PDM.Storage.getWorkspace() : {};
        window.PDM.Storage.setWorkspace(Object.assign({}, prev, {
            input: text,
            inputSource: 'image-file',
            audioFileName: null,
            audioFileSize: null,
            audioMimeType: null,
            audioLastModified: null,
            audioRef: null,
            audioSegmentCount: null
        }));
        if (A.scheduleWorkspaceSave) A.scheduleWorkspaceSave();
        setStatus(true, wuText('imageDoneLabel', { name: file.name || wuText('imageFileDefault') }), false);
        window.PDM.UI.notif(wuText('imageDoneNotif'), 'ok');
        var inp = document.getElementById('ws-input');
        if (inp) inp.focus();
    }).catch(function(err) {
        if (job !== imageJobGen) return;
        if (err && (err.name === 'AbortError' || (err.message && String(err.message).toLowerCase().indexOf('abort') >= 0))) {
            if (lookLikeTimeout(err)) {
                var modelTo = window.PDM.Storage.getImageModel ? window.PDM.Storage.getImageModel() : 'moondream';
                window.PDM.UI.notif(wuText('imageAnalyzeTimeout', { model: modelTo }), 'err');
                setInput('');
                return;
            }
            window.PDM.UI.notif(wuText('imageCancelled'), 'info');
            return;
        }
        var model = window.PDM.Storage.getImageModel ? window.PDM.Storage.getImageModel() : 'moondream';
        var key = classifyImageError(err);
        var kind = key === 'imageCancelled' ? 'info' : 'err';
        window.PDM.UI.notif(wuText(key, { model: model }), kind);
        if (kind === 'err') setInput('');
    }).finally(function() {
        if (job !== imageJobGen) return;
        processing = false;
        A._wsImageProcessing = false;
        activeAbort = null;
        syncInputTools();
    });
}

A.isWorkspaceImageProcessing = function() {
    return !!processing;
};

A.cancelWorkspaceImageJob = function() {
    if (!processing) return;
    cancelJob();
    window.PDM.UI.notif(wuText('imageCancelled'), 'info');
};

A.bindWorkspaceImage = function() {
    if (A._wsImageBound) return;
    A._wsImageBound = true;

    var btn = document.getElementById('ws-image-file-btn');
    var picker = document.getElementById('ws-image-file-input');
    if (btn && picker) {
        btn.addEventListener('click', function() {
            if (btn.disabled || busy()) return;
            picker.click();
        });
        picker.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
            e.target.value = '';
        });
    }

    if (!A._wsImageEventsBound) {
        A._wsImageEventsBound = true;
        document.addEventListener('pdm:workspace-reset', function() {
            cancelJob();
            setStatus(false);
        });
        document.addEventListener('pdm:workspace-input-clear', function() {
            if (processing) {
                cancelJob();
                setInput('');
            }
        });
    }

    syncInputTools();
};

})();
