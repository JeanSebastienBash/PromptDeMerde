/**
 * PromptDeMerde.com — workspace-inference.js
 *
 * Synopsis : Inférence sniperise LLM.
 * Objectif : Orchestrer doSniperise et le streaming thinking/content.
 *
 * Pilote (norme snap 42) : profil JSON → format + think:false (une requête, pas de reprise).
 * INPUT long : multi-pass sur la zone saisie uniquement (InputChunk) — pas le moteur STT.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-inference] PDM.App not found.'); return; }

function wu() { return window.PDM && window.PDM.WorkspaceUi; }
function wuText(key, vars) {
    return wu() ? wu().text(key, vars) : '';
}

function getFormatIsText() {
    var S = window.PDM && window.PDM.Storage;
    if (S && typeof S.getOutputDisplayFormat === 'function') {
        return S.getOutputDisplayFormat() === 'text';
    }
    return true;
}

function looksLikeOutputJsonEnvelope(s) {
    var t = String(s || '').trim();
    return t.charAt(0) === '{' && /"output_[a-z]{2}"\s*:/.test(t);
}

var SNIPERISE_BTN_LABEL = A.SNIPERISE_BTN_LABEL;
A.doSniperise = function() {
    if (A.isInferenceActive()) return;
    if (window.PDM._compressActive) return;

    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
        if (typeof window.PDM.STT.warnAndStop === 'function') {
            window.PDM.STT.warnAndStop({
                notifyMessage: wuText('dictationStoppedForClean'),
                notifyType: 'info'
            });
        } else {
            window.PDM.STT.stop({ silent: true });
            if (window.PDM.STT.renderUi) window.PDM.STT.renderUi();
            window.PDM.UI.notif(wuText('dictationStoppedForClean'), 'info');
        }
        A.saveWorkspaceFromDom();
    }

    var inpGate = document.getElementById('ws-input');
    var promptGate = inpGate ? inpGate.value.trim() : '';
    if (!promptGate) {
        window.PDM.UI.notif(wuText('emptyPromptError'), 'err');
        return;
    }
    if (!A.canSendToLlm()) {
        window.PDM.UI.notif(wuText('noContextError'), 'err');
        window.location.hash = 'prompts';
        return;
    }

    if (typeof A.flushPromptsFromDom === 'function') A.flushPromptsFromDom();

    if (typeof A.beginCleanTrace === 'function') A.beginCleanTrace();

    var providerGate = A.getActiveProviderId();
    var modelGate = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(providerGate);
    if (!modelGate || !String(modelGate).trim()) {
        var IGate = window.PDM && window.PDM.I18n;
        window.PDM.UI.notif(IGate ? IGate.t('prompts.noModelSelected') : 'Aucun modèle LLM sélectionné (Options).', 'err');
        window.location.hash = 'settings';
        return;
    }
    if (window.PDM.ProxyTokenSession && typeof window.PDM.ProxyTokenSession.isTokenMissing === 'function'
        && window.PDM.ProxyTokenSession.isTokenMissing()) {
        if (typeof window.PDM.ProxyTokenSession.notifyTokenMissing === 'function') {
            window.PDM.ProxyTokenSession.notifyTokenMissing();
        }
        return;
    }

    var PC = window.PDM.PromptCompress;
    if (PC && typeof PC.maybeRunBeforeInference === 'function') {
        PC.maybeRunBeforeInference().then(function() {
            if (typeof A.sealCleanTraceAfterPreCompress === 'function') {
                A.sealCleanTraceAfterPreCompress();
            }
            A._doSniperiseAfterCompress();
        }).catch(function() { /* notif déjà affichée */ });
        return;
    }
    if (typeof A.sealCleanTraceAfterPreCompress === 'function') {
        A.sealCleanTraceAfterPreCompress();
    }
    A._doSniperiseAfterCompress();
};

A._doSniperiseAfterCompress = function() {
    if (A.isInferenceActive()) return;
    if (window.PDM._compressActive) return;

    var inp = document.getElementById('ws-input');
    var prompt = inp ? inp.value.trim() : '';
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
    if (!model || !String(model).trim()) {
        var I = window.PDM && window.PDM.I18n;
        window.PDM.UI.notif(I ? I.t('prompts.noModelSelected') : 'Aucun modèle LLM sélectionné (Options).', 'err');
        window.location.hash = 'settings';
        return;
    }
    if (window.PDM.ProxyTokenSession && typeof window.PDM.ProxyTokenSession.isTokenMissing === 'function'
        && window.PDM.ProxyTokenSession.isTokenMissing()) {
        if (typeof window.PDM.ProxyTokenSession.notifyTokenMissing === 'function') {
            window.PDM.ProxyTokenSession.notifyTokenMissing();
        }
        return;
    }
    var sys = window.PDM.Storage.getSystemPromptEffective();
    var profiles = window.PDM.Profiles.load();
    var outJsonEnabled = window.PDM.Storage.isOutputJsonEnabled && window.PDM.Storage.isOutputJsonEnabled();
    var outJsonSchema = outJsonEnabled && window.PDM.Storage.getOutputJsonSchemaEffective
        ? window.PDM.Storage.getOutputJsonSchemaEffective()
        : null;
    var POJ = window.PDM.ProfileOutputJson;

    function canonicalizeOutput(raw) {
        if (typeof A.extractPlainOutput === 'function') {
            return A.extractPlainOutput(raw || '');
        }
        return String(raw || '');
    }

    var llmBaseOpts = {};
    var freeformJson = false;
    if (outJsonEnabled && outJsonSchema) {
        llmBaseOpts.think = false;
        freeformJson = !!(POJ && typeof POJ.isFreeformOutputLangSchema === 'function'
            && POJ.isFreeformOutputLangSchema(outJsonSchema));
        if (freeformJson) {
            delete llmBaseOpts.format;
        } else {
            var genFormat = outJsonSchema;
            if (POJ && typeof POJ.relaxSchemaForGeneration === 'function') {
                genFormat = POJ.relaxSchemaForGeneration(outJsonSchema, 0, {
                    stripMaxLength: true,
                    stripMinLength: true
                });
            }
            llmBaseOpts.format = genFormat;
        }
    }
    if (freeformJson && POJ) {
        var langForOut = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr';
        var patternForOut = window.PDM.Storage.getOutputJsonKeyPattern
            ? window.PDM.Storage.getOutputJsonKeyPattern()
            : 'output_{lang}';
        sys = String(sys || '')
            .replace(/<output_contract>[\s\S]*?<\/output_contract>/gi,
                '<output_contract>\nTexte brut UTF-8 uniquement. Pas d’objet JSON.\n</output_contract>')
            .replace(/\{"output_[a-z]{2}"\s*:\s*"\.\.\."\}/g, '(texte brut)')
            .replace(/Un seul objet JSON[^\n]*/gi, 'Une seule chaîne texte brut (pas de JSON).')
            .replace(/Aucun texte hors JSON[^\n]*/gi, 'Aucun préambule hors texte final.');
        if (typeof POJ.freeformJsonSystemSuffix === 'function') {
            sys = sys + POJ.freeformJsonSystemSuffix(langForOut, patternForOut);
        }
    }

    var outputTa = document.getElementById('output-text');
    var outputBox = document.getElementById('output-box');
    var outputMeta = document.getElementById('output-meta');
    A.syncThinkingPanel('', { reset: true });
    A.syncThinkingUnavailableWorkspace();
    if (outputTa) { outputTa.value = ''; outputTa.placeholder = wuText('inferenceRunningPlaceholder'); }
    if (outputBox) {
        outputBox.classList.remove('output-box--empty');
        outputBox.classList.add('streaming');
    }
    if (outputMeta) outputMeta.innerHTML = '<span class="val">' + wuText('inferenceConnecting') + '</span>';

    var startTime = Date.now();
    var contentTokenCount = 0;
    var thinkingTokenCount = 0;
    var thinkingLimitNotified = false;
    var metaTickId = setInterval(function() {
        if (!A.isInferenceActive || !A.isInferenceActive()) return;
        if (!outputMeta) return;
        A.renderStreamMeta(outputMeta, {
            elapsedSec: (Date.now() - startTime) / 1000,
            contentTokens: contentTokenCount,
            thinkingTokens: thinkingTokenCount,
            chars: outputTa && outputTa.value ? outputTa.value.length : 0
        });
    }, 400);
    function clearMetaTick() {
        if (metaTickId) { clearInterval(metaTickId); metaTickId = null; }
    }

    function shouldRunContentPass(data) {
        if (!data) return false;
        if (data.continueWithoutThinking) return true;
        return !!(data.thinkingLimitExceeded && !String(data.result || '').trim());
    }

    var streamPrefix = '';
    var accumulatedThinking = '';
    var activeChunkIndex = 0;
    var activeChunkTotal = 1;
    var contentPassUserText = prompt;

    function syncOutputToPrefix() {
        if (outputTa) {
            outputTa.value = streamPrefix || '';
            outputTa.placeholder = streamPrefix ? '' : wuText('inferenceRunningPlaceholder');
            outputTa.scrollTop = outputTa.scrollHeight;
        }
        if (outputBox) outputBox.classList.add('streaming');
    }

    function liveExtract(fullText) {
        var live = String(fullText || '');
        if (typeof A.extractPlainOutput === 'function') {
            if (looksLikeOutputJsonEnvelope(live) || live.indexOf('"output_') !== -1) {
                live = A.extractPlainOutput(live);
            }
        }
        var POJlive = window.PDM && window.PDM.ProfileOutputJson;
        if (POJlive && typeof POJlive.stripEnvelopeResidue === 'function') {
            live = POJlive.stripEnvelopeResidue(live);
        }
        return live;
    }

    var onToken = function(fullText, chunk, info) {
        var fullThinking = (info && info.fullThinking) || '';
        var elapsedSec = (Date.now() - startTime) / 1000;
        var piece = liveExtract(fullText);
        var display = streamPrefix
            ? (streamPrefix + (piece ? '\n\n' : '') + piece)
            : piece;
        window.PDM._wsBackup = {
            raw: display,
            text: display,
            thinking: fullThinking
        };
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
            outputTa.value = display;
            outputTa.placeholder = display ? '' : wuText('inferenceRunningPlaceholder');
            outputTa.scrollTop = outputTa.scrollHeight;
        }
        if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
            window.PDM.UI.syncOutputEmptyState();
        }
        A.renderStreamMeta(outputMeta, {
            elapsedSec: elapsedSec,
            contentTokens: contentTokenCount,
            thinkingTokens: thinkingTokenCount,
            thinkingChars: fullThinking.length,
            chars: display.length,
            streamChunks: contentTokenCount,
            chunkIndex: activeChunkIndex,
            chunkTotal: activeChunkTotal
        });
    };

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
            return window.PDM.LLM.sniperise(provider, model, null, sys, profiles, contentPassUserText, Object.assign({
                think: false,
                idleTimeoutMs: 0,
                onToken: function(fullText, chunk, info) {
                    onToken(fullText, chunk, Object.assign({}, info || {}, {
                        fullThinking: preservedThinking,
                        phase: 'content',
                        thinkingLimitReached: true
                    }));
                }
            }, outJsonEnabled && outJsonSchema
                ? { format: llmBaseOpts.format, think: false }
                : {}));
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

    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    var sniperBtn = document.getElementById('sniperise-btn');
    if (sniperBtn) { sniperBtn.disabled = true; sniperBtn.textContent = wu() ? wu().submitLabelRunning() : wuText('submitLabelRunning'); }
    var sttBtn = document.getElementById('stt-btn');
    if (sttBtn) sttBtn.disabled = true;
    var resetBtnsStart = document.querySelectorAll('.ws-reset-btn');
    for (var rsi = 0; rsi < resetBtnsStart.length; rsi++) {
        resetBtnsStart[rsi].disabled = true;
        resetBtnsStart[rsi].title = wuText('inferenceRunningReset');
    }

    // Découpe zone INPUT uniquement (jamais le pipeline dictée / Whisper / Vosk / Parakeet)
    var IC = window.PDM && window.PDM.InputChunk;
    var inputChunks = [prompt];
    if (IC && typeof IC.shouldChunk === 'function' && IC.shouldChunk(prompt, sys, profiles)) {
        var sz = IC.chunkSizeFor(sys, profiles);
        inputChunks = IC.splitText(prompt, sz);
        if (!inputChunks.length) inputChunks = [prompt];
        window.PDM.UI.notif(
            wuText('inferenceChunking', { n: String(inputChunks.length), chars: String(prompt.length) }),
            'info'
        );
    }
    activeChunkTotal = inputChunks.length;

    function runOneInference(userText) {
        contentPassUserText = userText;
        syncOutputToPrefix();
        return window.PDM.LLM.sniperise(
            provider, model, null, sys, profiles, userText,
            Object.assign({}, llmBaseOpts, { onToken: onToken, idleTimeoutMs: 0 })
        ).then(function(data) {
            if (shouldRunContentPass(data)) {
                return runContentPass(data.thinking || '', data.thinkingLimitMax);
            }
            return data;
        });
    }

    function runInputChunks(index, accPlain, lastData) {
        if (index >= inputChunks.length) {
            return Promise.resolve({
                data: lastData || { result: accPlain },
                plain: accPlain
            });
        }
        activeChunkIndex = index + 1;
        var rawChunk = inputChunks[index];
        var userPayload = IC && typeof IC.wrapUserChunk === 'function'
            ? IC.wrapUserChunk(rawChunk, {
                index: index,
                total: inputChunks.length
            })
            : rawChunk;

        return runOneInference(userPayload).then(function(data) {
            var piece = canonicalizeOutput(data && data.result != null ? data.result : '');
            if (IC && typeof IC.unwrapEchoedUserWrapper === 'function') {
                piece = canonicalizeOutput(IC.unwrapEchoedUserWrapper(piece, rawChunk));
            }
            if (IC && typeof IC.looksLikeMetaDrift === 'function'
                && IC.looksLikeMetaDrift(piece, rawChunk)) {
                window.PDM.UI.notif(wuText('inferenceMetaDriftWarn'), 'err');
            }
            var thinkPiece = String((data && data.thinking) || '');
            if (thinkPiece) {
                accumulatedThinking = accumulatedThinking
                    ? (accumulatedThinking + '\n\n---\n\n' + thinkPiece)
                    : thinkPiece;
            }
            var nextAcc = accPlain ? (accPlain + '\n\n' + piece) : piece;
            streamPrefix = nextAcc;
            if (outputTa) {
                outputTa.value = nextAcc;
                outputTa.scrollTop = outputTa.scrollHeight;
            }
            if (data) data.thinking = accumulatedThinking;
            return runInputChunks(index + 1, nextAcc, data);
        });
    }

    runInputChunks(0, '', null).then(function(pack){
        var data = pack && pack.data;
        var plainOut = pack && pack.plain != null ? pack.plain : '';
        clearMetaTick();
        if (!data && !plainOut) return;
        if (!data) data = { result: plainOut };
        var durationMs = Date.now() - startTime;
        if (data && !data.duration_ms) data.duration_ms = durationMs;
        // IMPORTANT : data.result = dernier chunk seulement. Le texte mérité = pack.plain (tous les passes).
        plainOut = canonicalizeOutput(plainOut || String(data.result || ''));
        var rawOut = plainOut;
        var plainThink = String(data.thinking || '');
        data.result = plainOut;
        if (outputBox) outputBox.classList.remove('streaming');
        window.PDM._wsBackup = {
            raw: rawOut,
            text: plainOut,
            plain: plainOut,
            thinking: plainThink,
            plainThinking: plainThink,
            final: true
        };
        if (outputTa) {
            outputTa.value = typeof A.wrapOutputForDisplay === 'function'
                ? A.wrapOutputForDisplay(plainOut)
                : plainOut;
            if (plainOut) outputTa.placeholder = '';
        }
        if (typeof A.applyWorkspaceOutputFormat === 'function') {
            A.applyWorkspaceOutputFormat();
        }
        if (outputTa && !String(outputTa.value || '').trim() && plainOut) {
            outputTa.value = plainOut;
        }
        if (outputTa && getFormatIsText() && looksLikeOutputJsonEnvelope(outputTa.value)) {
            outputTa.value = plainOut || canonicalizeOutput(outputTa.value);
        }
        A.syncThinkingPanel(
            typeof A.wrapOutputForDisplay === 'function'
                ? A.wrapOutputForDisplay(plainThink, null, 'thinking')
                : plainThink,
            {
                streaming: false,
                open: true,
                thinkingLimitReached: !!(data && data.thinkingLimitExceeded)
            }
        );
        if (data && data.thinkingLimitExceeded && !thinkingLimitNotified) {
            window.PDM.UI.notif(
                wuText('inferenceThinkingLimitDone', { max: data.thinkingLimitMax || window.PDM.Storage.getLlmThinkingMaxChars() }),
                'info'
            );
        }
        window.PDM.UI.showOutput(outputTa ? outputTa.value : plainOut, data);
        A.renderStreamMeta(outputMeta, {
            done: true,
            elapsedSec: durationMs / 1000,
            contentTokens: contentTokenCount || (data && data.eval_count) || 0,
            thinkingTokens: thinkingTokenCount,
            thinkingChars: plainThink.length,
            thinkingLimitReached: !!(data && data.thinkingLimitExceeded),
            thinkingLimitMax: data && data.thinkingLimitMax,
            chars: plainOut.length,
            doneReason: data && data.done_reason,
            evalCount: data && data.eval_count,
            chunkIndex: activeChunkTotal,
            chunkTotal: activeChunkTotal
        });
        if (data && data.done_reason === 'length' && window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(
                'Sortie arrêtée (done_reason=length) — plafond tokens atteint. Monte Tokens de sortie ou vérifie num_predict.',
                'info'
            );
        }

        function finalizeClean() {
            var bak = window.PDM._wsBackup;
            if (bak && bak.plain != null && String(bak.plain).trim()) {
                plainOut = String(bak.plain);
            } else if (bak && bak.text != null) {
                plainOut = canonicalizeOutput(bak.text);
            }
            var trace = typeof A.takeCleanTrace === 'function' ? A.takeCleanTrace() : null;
            A._saveCleanEntry({
                provider: provider,
                model: (data && data.model) || model,
                input: prompt,
                output: plainOut,
                thinking: plainThink,
                systemPrompt: sys,
                systemPromptEffective: window.PDM.LLM.buildSystemWithProfiles(sys, profiles),
                contextPosition: window.PDM.Storage.getContextPosition(),
                activeContexts: A._collectActiveContexts(profiles),
                usage: data && data.usage,
                duration_ms: durationMs,
                trace: trace
            });
            A.renderAllHistories();
            A.saveWorkspaceFromDom();
        }

        var outputBeforePost = plainOut;
        var PCpost = window.PDM.PromptCompress;
        if (PCpost && typeof PCpost.maybeRunAfterInference === 'function') {
            return PCpost.maybeRunAfterInference().then(function() {
                var bak2 = window.PDM._wsBackup;
                var afterPlain = plainOut;
                if (bak2 && bak2.plain != null && String(bak2.plain).trim()) {
                    afterPlain = String(bak2.plain);
                }
                if (typeof A.sealCleanTraceOutput === 'function') {
                    A.sealCleanTraceOutput(outputBeforePost, afterPlain, plainThink);
                }
                finalizeClean();
            }, function() {
                if (typeof A.sealCleanTraceOutput === 'function') {
                    A.sealCleanTraceOutput(outputBeforePost, outputBeforePost, plainThink);
                }
                finalizeClean();
            });
        }
        if (typeof A.sealCleanTraceOutput === 'function') {
            A.sealCleanTraceOutput(outputBeforePost, outputBeforePost, plainThink);
        }
        finalizeClean();
    }).catch(function(err){
        clearMetaTick();
        if (err && err.userCancelled) {
            if (window.PDM._inferenceModelSwitch || window.PDM._inferenceThinkingContinue) {
                window.PDM._inferenceModelSwitch = false;
                window.PDM._inferenceThinkingContinue = false;
                return;
            }
            var thinkingTa = document.getElementById('thinking-text');
            var rawCancel = outputTa ? outputTa.value : '';
            var plainCancel = canonicalizeOutput(rawCancel);
            var thinkCancel = thinkingTa ? thinkingTa.value : '';
            window.PDM._wsBackup = {
                text: plainCancel,
                plain: plainCancel,
                thinking: thinkCancel,
                plainThinking: thinkCancel,
                final: false
            };
            if (typeof A.applyWorkspaceOutputFormat === 'function') {
                A.applyWorkspaceOutputFormat();
            }
            if (outputBox) outputBox.classList.remove('streaming');
            if (outputMeta) {
                outputMeta.innerHTML = '<span class="val">' + wuText('inferenceInterrupted') + '</span>';
            }
            A.saveWorkspaceFromDom();
            return;
        }
        if (err && err.code === 'PROXY_TOKEN_MISSING') {
            if (window.PDM.ProxyTokenSession && typeof window.PDM.ProxyTokenSession.notifyTokenMissing === 'function') {
                window.PDM.ProxyTokenSession.notifyTokenMissing();
            } else {
                window.PDM.UI.notif(err.message, 'err');
            }
        } else {
            window.PDM.UI.notif(wuText('inferenceErrorPrefix') + err.message, 'err');
        }
        if (outputBox) outputBox.classList.remove('streaming');
        if (outputTa) {
            outputTa.value = '';
            outputTa.placeholder = (err && err.code === 'PROXY_TOKEN_MISSING')
                ? err.message
                : wuText('inferenceErrorPrefix') + err.message;
        }
        if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
            window.PDM.UI.syncOutputEmptyState();
        }
        if (outputMeta) {
            var metaMsg = (err && err.code === 'PROXY_TOKEN_MISSING') ? err.message : err.message;
            outputMeta.innerHTML = '<span class="val" style="color:#f44">\u274c ' + window.PDM.UI.escapeHtml(metaMsg) + '</span>';
        }
    }).finally(function(){
        if (window.PDM._pendingInferenceRestart) {
            window.PDM._pendingInferenceRestart = false;
            window.PDM._inferenceModelSwitch = false;
            setTimeout(function(){ A.doSniperise(); }, 0);
            return;
        }
        if (outputBox) outputBox.classList.remove('streaming');
        var cancelBtnEnd = document.getElementById('cancel-btn');
        if (cancelBtnEnd) cancelBtnEnd.style.display = 'none';
        var sniperBtnEnd = document.getElementById('sniperise-btn');
        if (sniperBtnEnd) {
            sniperBtnEnd.disabled = false;
            sniperBtnEnd.textContent = wu() ? wu().submitLabel() : SNIPERISE_BTN_LABEL;
        }
        var resetBtnsEnd = document.querySelectorAll('.ws-reset-btn');
        for (var rei = 0; rei < resetBtnsEnd.length; rei++) {
            resetBtnsEnd[rei].disabled = false;
            resetBtnsEnd[rei].title = wuText('resetTitle');
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
