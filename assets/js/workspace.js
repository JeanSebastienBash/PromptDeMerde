/**
 * PromptDeMerde.com — Workspace, nettoyage LLM et configuration modèle.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace] PDM.App not found.'); return; }
var SNIPERISE_BTN_LABEL = A.SNIPERISE_BTN_LABEL;

A.isInferenceActive = function() {
    return window.PDM._activeAbort !== null && window.PDM._activeAbort !== undefined;
};

A.canSendToLlm = function() {
    return window.PDM.Storage.canSendToLlm();
};

A.updateWorkspacePromptGuard = function() {
    var ok = A.canSendToLlm();
    var guard = document.getElementById('ws-prompt-guard');
    var btn = document.getElementById('sniperise-btn');
    var panel = document.querySelector('.ws-panel.ws-input');
    var inferActive = A.isInferenceActive();

    if (guard) guard.style.display = ok ? 'none' : 'block';
    if (panel) panel.classList.toggle('ws-blocked', !ok);

    var sttBtn = document.getElementById('stt-btn');
    if (window.PDM.STT && typeof window.PDM.STT.updateDictationButton === 'function') {
        window.PDM.STT.updateDictationButton();
    } else if (sttBtn) {
        sttBtn.disabled = !!inferActive;
        sttBtn.title = inferActive ? 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.' : '';
    }

    if (btn && !inferActive) {
        btn.disabled = !ok;
        btn.title = ok ? '' : 'Active le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.';
    }
};

A.saveWorkspaceFromDom = function() {
    var inp = document.getElementById('ws-input');
    var outputTa = document.getElementById('output-text');
    var thinkingTa = document.getElementById('thinking-text');
    return window.PDM.Storage.setWorkspace({
        input: inp ? inp.value : '',
        output: outputTa ? outputTa.value : '',
        thinking: thinkingTa ? thinkingTa.value : ''
    });
};

A.scheduleWorkspaceSave = function() {
    if (A._wsSaveTimer) clearTimeout(A._wsSaveTimer);
    A._wsSaveTimer = setTimeout(function() {
        A._wsSaveTimer = null;
        A.saveWorkspaceFromDom();
    }, 300);
};

A.restoreWorkspaceFromStorage = function() {
    var ws = window.PDM.Storage.getWorkspace();
    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.value = ws.input || '';
        var c = document.getElementById('char-count');
        if (c) c.textContent = inp.value.length + ' / 50000';
    }
    if (ws.output || ws.thinking) {
        var outputTa = document.getElementById('output-text');
        var outputBox = document.getElementById('output-box');
        if (outputTa) outputTa.value = ws.output || '';
        if (outputBox) outputBox.classList.add('show');
        A.syncThinkingPanel(ws.thinking || '', { streaming: false });
        window.PDM._wsBackup = {
            text: ws.output || '',
            thinking: ws.thinking || '',
            final: true
        };
    } else {
        window.PDM.UI.hideOutput();
    }
};

/* ===== WORKSPACE ===== */
A.bindWorkspace = function() {
    var btn = document.getElementById('sniperise-btn');
    if (btn) btn.addEventListener('click', function(){ A.doSniperise(); });

    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', function(){
            if (window.PDM._activeAbort) {
                window.PDM._inferenceUserCancel = true;
                window.PDM._activeAbort.abort();
                window.PDM.UI.notif('Inférence annulée par l\'utilisateur.', 'err');
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
            window.PDM.UI.notif('Aucune réflexion à copier.', 'err');
        }
    });

    var again = document.getElementById('again-btn');
    if (again) again.addEventListener('click', function(){
        document.getElementById('ws-input').value = '';
        window.PDM.UI.hideOutput();
        window.PDM._wsBackup = null;
        window.PDM.Storage.setWorkspace({ input: '', output: '', thinking: '' });
        document.getElementById('ws-input').focus();
    });

    var clearInput = document.getElementById('ws-input-clear');
    if (clearInput) clearInput.addEventListener('click', function(){
        if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
            window.PDM.UI.notif('Arr\u00eate la dict\u00e9e avant d\'effacer.', 'err');
            return;
        }
        var inpEl = document.getElementById('ws-input');
        if (!inpEl) return;
        inpEl.value = '';
        var cc = document.getElementById('char-count');
        if (cc) cc.textContent = '0 / 50000';
        A.scheduleWorkspaceSave();
        inpEl.focus();
    });

    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.addEventListener('input', function(){
            var c = document.getElementById('char-count');
            if (c) c.textContent = inp.value.length + ' / 50000';
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
        selectAll.title = total === 0 ? 'Crée d’abord un prompt de contexte.' : '';
    }
    if (clearAll) {
        clearAll.disabled = total === 0 || active === 0;
        clearAll.title = total === 0 ? 'Crée d’abord un prompt de contexte.' : '';
    }
};

A.setAllWorkspaceContexts = function(active) {
    var total = window.PDM.Profiles.setAllActive(active);
    A.reloadTags();
    A.rebuildProfileList();
    A.updateWorkspacePromptGuard();
    if (!total) {
        window.PDM.UI.notif('Aucun prompt de contexte à modifier.', 'info');
        return;
    }
    window.PDM.UI.notif(active ? 'Tous les prompts de contexte sont actifs.' : 'Tous les prompts de contexte sont inactifs.', 'ok');
};

A.getDefaultProviderId = function() {
    return window.PDM.Providers.defaultProvider();
};

A.updateWorkspaceConfigDisplay = function() {
    var provider = A.getActiveProviderId();
    var model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) ||
        window.PDM.Providers.defaultModel(provider);
    var el = document.getElementById('ws-model-name');
    if (el) el.textContent = model || '— non configuré —';
};

A.renderStreamMeta = function(metaEl, opts) {
    if (!metaEl) return;
    opts = opts || {};
    var elapsedSec = Math.max(opts.elapsedSec || 0, 0.001);
    var elapsed = elapsedSec.toFixed(1);
    var contentTokens = opts.contentTokens || 0;
    var thinkingTokens = opts.thinkingTokens || 0;
    var html = '<span>Temps: <span class="val">' + elapsed + 's</span></span>';

    if (opts.phase === 'thinking') {
        html += '<span>R\u00e9flexion: <span class="val">' + (opts.thinkingChars || 0) + ' car.</span></span>';
        html += '<span>Tokens r\u00e9flexion: <span class="val">' + thinkingTokens + '</span></span>';
        if (thinkingTokens > 0) {
            html += '<span>Vitesse: <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
        }
        if (!opts.done) html += '<span class="streaming-dot">🧠 EN COURS</span>';
        metaEl.innerHTML = html;
        return;
    }

    html += '<span>Tokens: <span class="val">' + contentTokens + '</span></span>';
    if (contentTokens > 0) {
        html += '<span>Vitesse: <span class="val">' + (contentTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.chars !== undefined) {
        html += '<span>Caract\u00e8res: <span class="val">' + opts.chars + '</span></span>';
    }
    if (opts.thinkingChars) {
        html += '<span>R\u00e9flexion: <span class="val">' + opts.thinkingChars + ' car.</span></span>';
    }
    if (thinkingTokens > 0) {
        html += '<span>Tokens r\u00e9flexion: <span class="val">' + thinkingTokens + '</span></span>';
        html += '<span>Vitesse r\u00e9flexion: <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.done && (contentTokens + thinkingTokens) > 0) {
        html += '<span>Vitesse moy.: <span class="val">' + ((contentTokens + thinkingTokens) / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (!opts.done) html += '<span class="streaming-dot">● EN COURS</span>';
    metaEl.innerHTML = html;
};

A.syncThinkingPanel = function(thinkingText, opts) {
    opts = opts || {};
    var panel = document.getElementById('thinking-panel');
    var ta = document.getElementById('thinking-text');
    var badge = document.getElementById('thinking-badge');
    var unavailable = document.getElementById('thinking-unavailable-msg');
    if (!panel || !ta) return;

    if (!thinkingText) {
        if (opts.reset) {
            ta.value = '';
            panel.classList.remove('show', 'streaming', 'thinking-unavailable-active');
            if (badge) badge.textContent = '';
            if (unavailable) {
                unavailable.hidden = true;
                unavailable.textContent = '';
            }
        }
        return;
    }

    if (unavailable) {
        unavailable.hidden = true;
        unavailable.textContent = '';
    }
    panel.classList.remove('thinking-unavailable-active');

    panel.classList.add('show');
    ta.value = thinkingText;
    ta.scrollTop = ta.scrollHeight;

    if (opts.streaming) {
        panel.classList.add('streaming');
        if (opts.open !== false) panel.open = true;
    } else {
        panel.classList.remove('streaming');
    }

    if (badge) {
        badge.textContent = thinkingText.length + ' car.' +
            (opts.streaming ? ' · ● EN COURS' : '');
    }
};

A.refreshWorkspace = function() {
    A.refreshWorkspaceLlmConfig();
    A.updateWorkspaceConfigDisplay();
    A.updateThinkingAvailabilityUi();
    A.updateContextInjectUI();
    A.reloadTags();
    A.refreshSTT();
    A.updateWorkspacePromptGuard();
    A.renderAllHistories();

    /* Navigation pendant inférence : ne PAS effacer l'output si on a un backup */
    if (A.isInferenceActive()) {
        /* Inférence en cours : restaurer le bouton Arrêter */
        var cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        var sniperBtn = document.getElementById('sniperise-btn');
        if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = '⏳ Nettoyage en cours...'; }
        var sttBtn = document.getElementById('stt-btn');
        if (sttBtn) { sttBtn.disabled = true; sttBtn.title = 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.'; }
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
        return; /* NE PAS appeler hideOutput() */
    }

    /* Pas d'inférence en cours : restaurer le dernier résultat si disponible */
    if (window.PDM._wsBackup && (window.PDM._wsBackup.text || window.PDM._wsBackup.thinking)) {
        var outputTa = document.getElementById('output-text');
        var outputBox = document.getElementById('output-box');
        if (outputTa) outputTa.value = window.PDM._wsBackup.text || '';
        if (outputBox) outputBox.classList.add('show');
        A.syncThinkingPanel(window.PDM._wsBackup.thinking || '', { streaming: false });
        return;
    }

    /* Restaurer depuis localStorage (brouillon + dernier résultat persisté) */
    A.restoreWorkspaceFromStorage();
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
    var item = window.PDM.Storage.addCleanEntry({
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
    });
    if (!item) {
        window.PDM.UI.notif('Impossible d\u2019enregistrer l\u2019historique des nettoyages.', 'err');
    }
};

A.doSniperise = function() {
    if (A.isInferenceActive()) return;

    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
        window.PDM.STT.stop({ silent: true });
        if (window.PDM.STT.renderUi) window.PDM.STT.renderUi();
        A.saveWorkspaceFromDom();
        window.PDM.UI.notif('Dict\u00e9e arr\u00eat\u00e9e \u2014 nettoyage du texte actuel.', 'info');
    }

    var inp = document.getElementById('ws-input');
    var prompt = inp.value.trim();
    if (!prompt) {
        window.PDM.UI.notif('Tu as oubli\u00e9 de coller ton prompt.', 'err');
        return;
    }
    if (!A.canSendToLlm()) {
        window.PDM.UI.notif('Active le prompt syst\u00e8me ou au moins un prompt de contexte dans Prompts.', 'err');
        window.location.hash = 'prompts';
        return;
    }

    var provider = A.getActiveProviderId();
    var model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(provider);
    var sys = window.PDM.Storage.get(window.PDM.Storage.KEYS.SYSTEM_PROMPT) || '';
    var profiles = window.PDM.Profiles.load();

    /* NE PAS appeler loader(true) ici — ça activerait le skeleton 
       qui CACHE le textarea output. On gère l'affichage manuellement. */

    /* Préparer l'affichage live dans #output-text */
    var outputTa = document.getElementById('output-text');
    var outputBox = document.getElementById('output-box');
    var outputMeta = document.getElementById('output-meta');
    A.syncThinkingPanel('', { reset: true });
    A.syncThinkingUnavailableWorkspace();
    if (outputTa) { outputTa.value = ''; outputTa.placeholder = '⏳ Le nettoyage est en cours...'; }
    if (outputBox) outputBox.classList.add('show');
    if (outputMeta) outputMeta.innerHTML = '<span class="val">⏳ Connexion au serveur...</span>';

    /* Callback streaming: appelé à chaque token reçu */
    var startTime = Date.now();
    var contentTokenCount = 0;
    var thinkingTokenCount = 0;
    var onToken = function(fullText, chunk, info) {
        var fullThinking = (info && info.fullThinking) || '';
        var elapsedSec = (Date.now() - startTime) / 1000;
        /* Sauvegarder pour navigation pendant inférence */
        window.PDM._wsBackup = { text: fullText, thinking: fullThinking };
        if (outputBox) outputBox.classList.add('streaming');

        if (info && info.phase === 'thinking' && chunk) thinkingTokenCount++;

        if (fullThinking) {
            A.syncThinkingPanel(fullThinking, {
                streaming: !!(info && info.phase === 'thinking'),
                open: true
            });
        }

        /* Phase réflexion : stream dans le panneau, prompt nettoyé pas encore prêt */
        if (info && info.phase === 'thinking' && !fullText) {
            if (outputTa) outputTa.placeholder = 'Le prompt nettoyé apparaîtra ici après la réflexion…';
            A.renderStreamMeta(outputMeta, {
                phase: 'thinking',
                elapsedSec: elapsedSec,
                thinkingTokens: thinkingTokenCount,
                thinkingChars: fullThinking.length
            });
            return;
        }

        if (info && info.phase === 'content' && fullThinking) {
            A.syncThinkingPanel(fullThinking, { streaming: false, open: true });
        }

        if (chunk) contentTokenCount++;
        if (outputTa) {
            outputTa.value = fullText;
            outputTa.placeholder = fullText ? '' : 'Le prompt nettoyé apparaîtra ici…';
            /* Auto-scroll vers le bas */
            outputTa.scrollTop = outputTa.scrollHeight;
        }
        A.renderStreamMeta(outputMeta, {
            elapsedSec: elapsedSec,
            contentTokens: contentTokenCount,
            thinkingTokens: thinkingTokenCount,
            thinkingChars: fullThinking.length,
            chars: fullText.length
        });
    };

    /* Afficher le bouton Arrêter et désactiver Nettoyer + dictée */
    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    var sniperBtn = document.getElementById('sniperise-btn');
    if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = '⏳ Nettoyage en cours...'; }
    var sttBtn = document.getElementById('stt-btn');
    if (sttBtn) sttBtn.disabled = true;

    window.PDM.LLM.sniperise(provider, model, null, sys, profiles, prompt, { onToken: onToken }).then(function(data){
        /* Affichage final avec stats complètes */
        var durationMs = Date.now() - startTime;
        if (data && !data.duration_ms) data.duration_ms = durationMs;
        if (outputTa) outputTa.value = data.result || '';
        if (outputBox) outputBox.classList.remove('streaming');
        A.syncThinkingPanel(data.thinking || '', { streaming: false, open: true });
        /* Sauvegarder le résultat final pour la navigation */
        window.PDM._wsBackup = {
            text: data.result || '',
            thinking: data.thinking || '',
            final: true
        };
        window.PDM.UI.showOutput(data.result, data);
        A.renderStreamMeta(outputMeta, {
            done: true,
            elapsedSec: durationMs / 1000,
            contentTokens: contentTokenCount,
            thinkingTokens: thinkingTokenCount,
            thinkingChars: (data.thinking || '').length,
            chars: (data.result || '').length
        });
        A._saveCleanEntry({
            provider: provider,
            model: (data && data.model) || model,
            input: prompt,
            output: (data && data.result) || '',
            thinking: (data && data.thinking) || '',
            systemPrompt: sys,
            systemPromptEffective: window.PDM.LLM.buildSystemWithProfiles(sys, profiles),
            contextPosition: window.PDM.Storage.getContextPosition(),
            activeContexts: A._collectActiveContexts(profiles),
            usage: data && data.usage,
            duration_ms: durationMs
        });
        A.renderAllHistories();
        A.saveWorkspaceFromDom();
    }).catch(function(err){
        if (err && err.userCancelled) {
            var thinkingTa = document.getElementById('thinking-text');
            window.PDM._wsBackup = {
                text: outputTa ? outputTa.value : '',
                thinking: thinkingTa ? thinkingTa.value : '',
                final: false
            };
            if (outputBox) outputBox.classList.remove('streaming');
            if (outputMeta) {
                outputMeta.innerHTML = '<span class="val">⏹ Interrompu — texte partiel conservé</span>';
            }
            A.saveWorkspaceFromDom();
            return;
        }
        window.PDM.UI.notif('Erreur : ' + err.message, 'err');
        if (outputBox) outputBox.classList.remove('streaming');
        if (outputTa) { outputTa.value = ''; outputTa.placeholder = '❌ Erreur : ' + err.message; }
        if (outputMeta) outputMeta.innerHTML = '<span class="val" style="color:#f44">\u274c ' + window.PDM.UI.escapeHtml(err.message) + '</span>';
    }).finally(function(){
        /* Le loader n'a pas été activé, donc pas besoin de le désactiver.
           On laisse juste le résultat visible dans #output-text */
        if (outputBox) outputBox.classList.remove('streaming');
        /* Cacher le bouton Arrêter */
        var cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        var sniperBtn = document.getElementById('sniperise-btn');
        if (sniperBtn) sniperBtn.textContent = SNIPERISE_BTN_LABEL;
        window.PDM._activeAbort = null;
        window.PDM._inferenceUserCancel = false;
        A.updateWorkspacePromptGuard();
    });
};

A.THINKING_UNAVAILABLE_MSG = 'La r\u00e9flexion n\u2019est pas disponible pour ce mod\u00e8le.';
A.THINKING_UNAVAILABLE_HINT = 'Ce mod\u00e8le ne prend pas en charge la r\u00e9flexion : activer cette option n\u2019aura aucun effet.';

A.getActiveModelId = function() {
    var provider = A.getActiveProviderId();
    return window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) ||
        window.PDM.Providers.defaultModel(provider);
};

A.modelSupportsThinking = function(modelId) {
    return window.PDM.Providers.modelSupportsThinking(A.getActiveProviderId(), modelId || A.getActiveModelId());
};

A.enrichLlmModelsCapabilities = function(models) {
    var adapter = A.getActiveProvider();
    if (!adapter || !adapter.enrichModels) return Promise.resolve(models || []);
    return adapter.enrichModels(models || []).then(function(enriched) {
        var pid = A.getActiveProviderId();
        if (pid) window.PDM.Providers.setModels(pid, enriched);
        return enriched;
    });
};

A.refreshModelThinkingCapability = function(modelId) {
    var model = modelId || A.getActiveModelId();
    var adapter = A.getActiveProvider();
    if (!adapter || !adapter.fetchModelCapabilities || !model) {
        return Promise.resolve(A.modelSupportsThinking(model));
    }
    return adapter.fetchModelCapabilities(model).then(function(meta) {
        window.PDM.Providers.updateModelMeta(A.getActiveProviderId(), model, meta);
        return meta.thinkingSupported === true;
    });
};

A.syncLlmThinkingRadios = function() {
    var on = document.getElementById('llm-thinking-on');
    var off = document.getElementById('llm-thinking-off');
    var enabled = window.PDM.Storage.isLlmThinkingEnabled();
    if (on) on.checked = enabled;
    if (off) off.checked = !enabled;
};

A.updateThinkingAvailabilityUi = function() {
    var model = A.getActiveModelId();
    var wantsThinking = window.PDM.Storage.isLlmThinkingEnabled();
    var meta = window.PDM.Providers.modelMeta(A.getActiveProviderId(), model);
    var knownUnsupported = !!(meta && meta.thinkingSupported === false);
    var hint = document.getElementById('llm-thinking-hint');
    if (hint) {
        if (wantsThinking && model && knownUnsupported) {
            hint.hidden = false;
            hint.textContent = A.THINKING_UNAVAILABLE_HINT;
        } else {
            hint.hidden = true;
            hint.textContent = '';
        }
    }
    A.syncThinkingUnavailableWorkspace();
};

A.syncThinkingUnavailableWorkspace = function() {
    var panel = document.getElementById('thinking-panel');
    var msgEl = document.getElementById('thinking-unavailable-msg');
    var ta = document.getElementById('thinking-text');
    var model = A.getActiveModelId();
    var wantsThinking = window.PDM.Storage.isLlmThinkingEnabled();
    var meta = window.PDM.Providers.modelMeta(A.getActiveProviderId(), model);
    var knownUnsupported = !!(meta && meta.thinkingSupported === false);
    var showUnavailable = !!(wantsThinking && model && knownUnsupported);

    if (msgEl) {
        msgEl.hidden = !showUnavailable;
        msgEl.textContent = showUnavailable ? A.THINKING_UNAVAILABLE_MSG : '';
    }
    if (panel) {
        panel.classList.toggle('thinking-unavailable-active', showUnavailable);
        if (showUnavailable) {
            panel.classList.add('show');
            panel.open = true;
        } else {
            panel.classList.remove('thinking-unavailable-active');
            if (ta && !ta.value) {
                panel.classList.remove('show');
            }
        }
    }
    if (ta && showUnavailable) {
        ta.value = '';
    }
};

A.saveLlmThinkingModeFromUi = function() {
    var on = document.getElementById('llm-thinking-on');
    window.PDM.Storage.setLlmThinkingEnabled(!!(on && on.checked));
};

/* ===== OPTIONS LLM CONFIG ===== */
A.updateConfigModelInfo = function() {
    var sel = document.getElementById('config-model');
    var info = document.getElementById('config-model-info');
    if (!sel || !info) return;
    var models = window.PDM.Providers.models(A.getActiveProviderId());
    var m = null;
    for (var i = 0; i < models.length; i++) {
        if (models[i].id === sel.value) { m = models[i]; break; }
    }
    info.textContent = m ? 'Contexte max : ' + m.ctx : '';
};

A.bindWorkspaceLlmConfig = function() {
    var providerSelect = document.getElementById('llm-provider-select');
    if (providerSelect) {
        providerSelect.addEventListener('change', function() {
            if (!window.PDM.Providers.has(providerSelect.value)) {
                providerSelect.value = A.getActiveProviderId() || A.getDefaultProviderId();
                window.PDM.UI.notif('Ce provider sera disponible plus tard.', 'info');
                return;
            }
            window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, providerSelect.value);
            A.refreshWorkspaceLlmConfig();
            window.PDM.Providers.applyActiveSettingsUi();
            A.doSaveProvider({ silent: true });
            A.updateWorkspaceConfigDisplay();
        });
    }

    var ms = document.getElementById('config-model');
    if (ms) {
        ms.addEventListener('change', function(){
            A.doSaveModel({ silent: true });
            A.updateConfigModelInfo();
            A.refreshModelThinkingCapability(ms.value).then(function() {
                A.updateThinkingAvailabilityUi();
            });
        });
    }

    var thinkingOff = document.getElementById('llm-thinking-off');
    var thinkingOn = document.getElementById('llm-thinking-on');
    if (thinkingOff) {
        thinkingOff.addEventListener('change', function() {
            if (!thinkingOff.checked) return;
            A.saveLlmThinkingModeFromUi();
            A.updateThinkingAvailabilityUi();
        });
    }
    if (thinkingOn) {
        thinkingOn.addEventListener('change', function() {
            if (!thinkingOn.checked) return;
            A.saveLlmThinkingModeFromUi();
            A.updateThinkingAvailabilityUi();
        });
    }

    var epInput = document.getElementById('llm-endpoint-url');
    if (epInput) {
        var endpointSaveTimer = null;
        epInput.addEventListener('input', function() {
            clearTimeout(endpointSaveTimer);
            endpointSaveTimer = setTimeout(function() {
                A.doSaveProvider({ silent: true });
            }, 800);
        });
        epInput.addEventListener('blur', function() {
            clearTimeout(endpointSaveTimer);
            A.doSaveProvider({ silent: true });
        });
    }

    var btnTestLlm = document.getElementById('btn-test-llm');
    if (btnTestLlm) btnTestLlm.addEventListener('click', function(){ A.doTest(false, 'llm-test-status'); });
};

A.syncLlmProviderSelect = function() {
    if (window.PDM.Providers.populateProviderSelect) {
        window.PDM.Providers.populateProviderSelect();
    }
};

A.refreshWorkspaceLlmConfig = function() {
    var cp = A.getActiveProviderId();
    if (cp) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, cp);
    var adapter = A.getActiveProvider();
    A.syncLlmProviderSelect();

    var ep = document.getElementById('llm-endpoint-url');
    if (ep && adapter && adapter.storage) {
        ep.disabled = false;
        ep.value = adapter.storage.getUrl() || '';
    }

    A.refreshConfigModels(cp);
    A.syncLlmThinkingRadios();
    A.refreshModelThinkingCapability().then(function() {
        A.updateThinkingAvailabilityUi();
    });
};

A.refreshConfigModels = function(pid) {
    var sel = document.getElementById('config-model');
    if (!sel) return;

    sel.disabled = false;
    var models = window.PDM.Providers.models(pid);
    var curr = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    sel.innerHTML = '';
    var found = false;
    for (var i = 0; i < models.length; i++) {
        var o = document.createElement('option');
        o.value = models[i].id;
        o.textContent = models[i].label + ' (' + models[i].ctx + ')';
        if (models[i].id === curr) { o.selected = true; found = true; }
        sel.appendChild(o);
    }
    if (!found && models.length > 0) {
        sel.options[0].selected = true;
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
    }

    var info = document.getElementById('config-model-info');
    if (info) {
        var m = null;
        for (var j = 0; j < models.length; j++) {
            if (models[j].id === sel.value) { m = models[j]; break; }
        }
        info.textContent = m ? 'Contexte max : ' + m.ctx : '';
    }
};


})();
