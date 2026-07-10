/**
 * PromptDeMerde.com — workspace-inference.js
 *
 * Synopsis : Inférence sniperise LLM.
 * Objectif : Orchestrer doSniperise et le streaming thinking/content.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-inference] PDM.App not found.'); return; }

function wu() { return window.PDM && window.PDM.WorkspaceUi; }
function wuText(key, vars) {
    return wu() ? wu().text(key, vars) : '';
}

var SNIPERISE_BTN_LABEL = A.SNIPERISE_BTN_LABEL;
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
        window.PDM.UI.notif(wuText('emptyPromptError'), 'err');
        return;
    }
    if (!A.canSendToLlm()) {
        window.PDM.UI.notif(wuText('noContextError'), 'err');
        window.location.hash = 'prompts';
        return;
    }

    if (typeof A.flushPromptsFromDom === 'function') A.flushPromptsFromDom();

    var provider = A.getActiveProviderId();
    var model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(provider);
    var sys = window.PDM.Storage.getSystemPromptEffective();
    var profiles = window.PDM.Profiles.load();

    /* NE PAS appeler loader(true) ici — ça activerait le skeleton 
       qui CACHE le textarea output. On gère l'affichage manuellement. */

    /* Préparer l'affichage live dans #output-text */
    var outputTa = document.getElementById('output-text');
    var outputBox = document.getElementById('output-box');
    var outputMeta = document.getElementById('output-meta');
    A.syncThinkingPanel('', { reset: true });
    A.syncThinkingUnavailableWorkspace();
    if (outputTa) { outputTa.value = ''; outputTa.placeholder = wuText('inferenceRunningPlaceholder'); }
    if (outputBox) outputBox.classList.add('show');
    if (outputMeta) outputMeta.innerHTML = '<span class="val">' + wuText('inferenceConnecting') + '</span>';

    /* Callback streaming: appelé à chaque token reçu */
    var startTime = Date.now();
    var contentTokenCount = 0;
    var thinkingTokenCount = 0;
    var thinkingLimitNotified = false;

    function shouldRunContentPass(data) {
        if (!data) return false;
        if (data.continueWithoutThinking) return true;
        return !!(data.thinkingLimitExceeded && !String(data.result || '').trim());
    }

    function runContentPass(preservedThinking, limitMax) {
        A.syncThinkingPanel(preservedThinking, {
            streaming: false,
            open: true,
            thinkingLimitReached: true
        });
        if (outputTa) outputTa.placeholder = wuText('inferenceFinalizing');
        if (outputMeta) outputMeta.innerHTML = '<span class="val">' + wuText('inferenceFinalizing') + '</span>';
        window.PDM._inferenceThinkingContinue = true;
        return new Promise(function(resolve) {
            setTimeout(resolve, 300);
        }).then(function() {
            return window.PDM.LLM.sniperise(provider, model, null, sys, profiles, prompt, {
                think: false,
                onToken: function(fullText, chunk, info) {
                    onToken(fullText, chunk, Object.assign({}, info || {}, {
                        fullThinking: preservedThinking,
                        phase: 'content',
                        thinkingLimitReached: true
                    }));
                }
            });
        }).then(function(data2) {
            window.PDM._inferenceThinkingContinue = false;
            data2.thinking = preservedThinking;
            data2.thinkingLimitExceeded = true;
            data2.thinkingLimitMax = limitMax;
            return data2;
        }).catch(function(err) {
            window.PDM._inferenceThinkingContinue = false;
            throw err;
        });
    }

    var onToken = function(fullText, chunk, info) {
        var fullThinking = (info && info.fullThinking) || '';
        var elapsedSec = (Date.now() - startTime) / 1000;
        /* Sauvegarder pour navigation pendant inférence */
        window.PDM._wsBackup = { text: fullText, thinking: fullThinking };
        if (outputBox) outputBox.classList.add('streaming');

        if (info && info.phase === 'thinking' && chunk) thinkingTokenCount++;

        if (fullThinking) {
            A.syncThinkingPanel(fullThinking, {
                streaming: !!(info && info.phase === 'thinking' && !info.thinkingLimitReached),
                open: true,
                thinkingLimitReached: !!(info && info.thinkingLimitReached)
            });
        }

        if (info && info.thinkingLimitReached && !thinkingLimitNotified) {
            thinkingLimitNotified = true;
            window.PDM.UI.notif(
                wuText('inferenceThinkingLimit', { max: window.PDM.Storage.getLlmThinkingMaxChars() }),
                'info'
            );
        }

        /* Phase réflexion : stream dans le panneau, prompt nettoyé pas encore prêt */
        if (info && info.phase === 'thinking' && !fullText) {
            if (outputTa) outputTa.placeholder = wuText('inferenceOutputAfterThinking');
            A.renderStreamMeta(outputMeta, {
                phase: 'thinking',
                elapsedSec: elapsedSec,
                thinkingTokens: thinkingTokenCount,
                thinkingChars: fullThinking.length,
                thinkingLimitMax: window.PDM.Storage.getLlmThinkingMaxChars(),
                thinkingLimitReached: !!(info && info.thinkingLimitReached)
            });
            return;
        }

        if (info && info.phase === 'content' && fullThinking) {
            A.syncThinkingPanel(fullThinking, { streaming: false, open: true });
        }

        if (chunk) contentTokenCount++;
        if (outputTa) {
            outputTa.value = fullText;
            outputTa.placeholder = fullText ? '' : wuText('outputPlaceholder');
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
    if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = wu() ? wu().submitLabelRunning() : '\u23f3 Nettoyage en cours...'; }
    var sttBtn = document.getElementById('stt-btn');
    if (sttBtn) sttBtn.disabled = true;
    var resetBtnStart = document.getElementById('ws-reset-btn');
    if (resetBtnStart) {
        resetBtnStart.disabled = true;
        resetBtnStart.title = wuText('inferenceRunningReset');
    }

    window.PDM.LLM.sniperise(provider, model, null, sys, profiles, prompt, { onToken: onToken }).then(function(data){
        if (shouldRunContentPass(data)) {
            return runContentPass(data.thinking || '', data.thinkingLimitMax);
        }
        return data;
    }).then(function(data){
        if (!data) return;
        /* Affichage final avec stats complètes */
        var durationMs = Date.now() - startTime;
        if (data && !data.duration_ms) data.duration_ms = durationMs;
        if (outputTa) outputTa.value = data.result || '';
        if (outputBox) outputBox.classList.remove('streaming');
        A.syncThinkingPanel(data.thinking || '', {
            streaming: false,
            open: true,
            thinkingLimitReached: !!(data && data.thinkingLimitExceeded)
        });
        if (data && data.thinkingLimitExceeded && !thinkingLimitNotified) {
            window.PDM.UI.notif(
                wuText('inferenceThinkingLimitDone', { max: data.thinkingLimitMax || window.PDM.Storage.getLlmThinkingMaxChars() }),
                'info'
            );
        }
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
            thinkingLimitReached: !!(data && data.thinkingLimitExceeded),
            thinkingLimitMax: data && data.thinkingLimitMax,
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
            if (window.PDM._inferenceModelSwitch || window.PDM._inferenceThinkingContinue) {
                window.PDM._inferenceModelSwitch = false;
                window.PDM._inferenceThinkingContinue = false;
                return;
            }
            var thinkingTa = document.getElementById('thinking-text');
            window.PDM._wsBackup = {
                text: outputTa ? outputTa.value : '',
                thinking: thinkingTa ? thinkingTa.value : '',
                final: false
            };
            if (outputBox) outputBox.classList.remove('streaming');
            if (outputMeta) {
                outputMeta.innerHTML = '<span class="val">' + wuText('inferenceInterrupted') + '</span>';
            }
            A.saveWorkspaceFromDom();
            return;
        }
        window.PDM.UI.notif('Erreur : ' + err.message, 'err');
        if (outputBox) outputBox.classList.remove('streaming');
        if (outputTa) { outputTa.value = ''; outputTa.placeholder = wuText('inferenceErrorPrefix') + err.message; }
        if (outputMeta) outputMeta.innerHTML = '<span class="val" style="color:#f44">\u274c ' + window.PDM.UI.escapeHtml(err.message) + '</span>';
    }).finally(function(){
        if (window.PDM._pendingInferenceRestart) {
            window.PDM._pendingInferenceRestart = false;
            window.PDM._inferenceModelSwitch = false;
            setTimeout(function(){ A.doSniperise(); }, 0);
            return;
        }
        /* Le loader n'a pas été activé, donc pas besoin de le désactiver.
           On laisse juste le résultat visible dans #output-text */
        if (outputBox) outputBox.classList.remove('streaming');
        /* Cacher le bouton Arrêter */
        var cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        var sniperBtn = document.getElementById('sniperise-btn');
        if (sniperBtn) {
            sniperBtn.disabled = false;
            sniperBtn.textContent = wu() ? wu().submitLabel() : SNIPERISE_BTN_LABEL;
        }
        var resetBtnEnd = document.getElementById('ws-reset-btn');
        if (resetBtnEnd) {
            resetBtnEnd.disabled = false;
            resetBtnEnd.title = wuText('resetTitle');
        }
        var sttBtnEnd = document.getElementById('stt-btn');
        if (sttBtnEnd) sttBtnEnd.disabled = false;
        window.PDM._activeAbort = null;
        window.PDM._inferenceUserCancel = false;
        window.PDM._inferenceThinkingContinue = false;
        A.updateWorkspacePromptGuard();
        if (window.PDM.STT && window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();
    });
};

})();
