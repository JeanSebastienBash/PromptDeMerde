/**
 * PromptDeMerde.com — ollama.js
 *
 * Synopsis : Adaptateur provider Ollama (HTTP, streaming, UI).
 * Objectif : Appeler le proxy PHP, streamer les réponses et peupler l'UI LLM/marketing.
 */
(function() {

var PDM_LLM_TIMEOUT_MS = 120000;
var PDM_LLM_IDLE_TIMEOUT_MS = 60000;

var COPY = {
    'faq.llm': 'Oui. Toutes les fonctionnalités sont ouvertes sans quota commercial. Le LLM passe uniquement par <strong>Ollama</strong> en local.',
    'faq.llm.cloud': 'Non. Ce dépôt fonctionne avec <strong>Ollama</strong> installé en amont sur votre machine (<a href="https://ollama.ai/download" target="_blank" rel="noopener">ollama.ai</a>). Aucune clé API cloud n\'est requise.',
    'faq.export': 'paramètres, prompts, historique, brouillon Workspace, configuration Ollama, dictée vocale',
    'faq.models': '<strong>Ollama uniquement</strong> (modèles locaux). URL dans <a href="#settings">Options</a> ; modèle dans le <a href="#workspace">Workspace</a>.',
    'settings.backup': 'prompts, moteur LLM (Ollama), dictée vocale, historique',
    'legal.features': 'Ollama local, prompts de contexte illimités, prompt système personnalisable, dictée vocale (Vosk Maxi par défaut, Vosk Mini, Whisper Mini/Maxi et Parakeet en option), export/import de configuration.',
    'legal.prereq': 'Disposer d\'une instance Ollama fonctionnelle pour le nettoyage des prompts',
    'legal.output': 'Des réponses générées par votre modèle Ollama local',
    'privacy.llm': 'Le traitement des prompts s\'effectue via <strong>Ollama</strong>, à installer préalablement sur votre machine ou votre réseau. Le fichier <code>lib/proxy/ollama/olama.php</code> assure un relais technique (CORS) vers Ollama, <strong>sans persistance</strong> des contenus transités — les prompts ne sont pas conservés sur le serveur après la requête.',
    'privacy.backup': 'réglages, prompts, historique, configuration Ollama, dictée vocale',
    'privacy.transit': 'Lors d\'un nettoyage, votre texte, le prompt système et les contextes actifs sont transmis à votre instance <strong>Ollama</strong> via <code>lib/proxy/ollama/olama.php</code> — <strong>transit en mémoire uniquement</strong>, aucune conservation côté serveur',
    'privacy.atRest': 'Les clés ci-dessus restent dans votre navigateur. Seul le <strong>nettoyage LLM</strong> envoie le texte en cours (et les instructions actives) au proxy vers Ollama — sans les conserver sur le serveur. Aucune télémétrie.',
    'privacy.guarantee': 'Garantie produit : aucune base de données, aucune session PHP, aucune télémétrie, aucune écriture applicative des prompts sur disque. Code open source auditable. L\'auto-hébergement permet de contrôler entièrement l\'infrastructure.',
    'privacy.stt': 'Le nettoyage des prompts utilise <strong>Ollama</strong> sur votre machine ou votre réseau. La dictée vocale embarque des modèles locaux (Vosk, Whisper, Parakeet) sans appel à un service cloud pour l\'audio.',
    'storage.provider': 'ollama',
    'storage.url.desc': 'URL Ollama locale'
};

function llmTimeoutSeconds(ms) {
    return Math.round((ms || PDM_LLM_TIMEOUT_MS) / 1000);
}

function getThinkingMaxChars(allowThinking) {
    if (!allowThinking) return 0;
    if (!window.PDM.Storage || !window.PDM.Storage.getLlmThinkingMaxChars) return 0;
    return window.PDM.Storage.getLlmThinkingMaxChars();
}

function mapAbortError(err, opts) {
    if (err.name !== 'AbortError') throw err;
    if (window.PDM._inferenceUserCancel) {
        var cancelled = new Error('Inférence interrompue.');
        cancelled.userCancelled = true;
        throw cancelled;
    }
    if (window.PDM._inferenceAbortReason === 'thinking_limit') {
        var maxChars = window.PDM.Storage && window.PDM.Storage.getLlmThinkingMaxChars
            ? window.PDM.Storage.getLlmThinkingMaxChars()
            : 5000;
        var thinkingLimit = new Error('Limite de réflexion atteinte (' + maxChars + ' caractères).');
        thinkingLimit.thinkingLimitExceeded = true;
        throw thinkingLimit;
    }
    opts = opts || {};
    if (opts.abortReason === 'idle') {
        throw new Error('⏱️ Timeout : aucune réponse depuis ' + llmTimeoutSeconds(opts.idleTimeoutMs) + ' secondes.');
    }
    throw new Error('⏱️ Timeout : l\'inférence a pris plus de ' + llmTimeoutSeconds(opts.timeoutMs) + ' secondes.');
}

function normalizeOllamaUrl(url) {
    var u = String(url || 'http://localhost:11434').trim();
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    u = u.replace(/\/api\/chat\/?$/i, '').replace(/\/\/$/, '/');
    return u.replace(/\/$/, '');
}

function getProxyUrl() {
    var rel = (window.PDM.Env && window.PDM.Env.getServerPath('ollamaProxy')) || 'lib/proxy/ollama/olama.php';
    try {
        return new URL(rel, document.baseURI || window.location.href).href.split('#')[0];
    } catch (e) {
        var path = window.location.pathname || '/';
        var dir = path.substring(0, path.lastIndexOf('/') + 1);
        return window.location.origin + dir + rel;
    }
}

function buildProxyHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var url = normalizeOllamaUrl(adapter.storage.getUrl());
    if (url) headers['X-Ollama-Url'] = url;
    var proxyToken = window.PDM.Storage && window.PDM.Storage.getProxyToken
        ? window.PDM.Storage.getProxyToken()
        : '';
    if (proxyToken) headers['X-PDM-Proxy-Token'] = proxyToken;
    return headers;
}

function buildOllamaChatBody(model, messages, stream, options) {
    var body = { model: model, messages: messages, stream: stream };
    options = options || {};
    if (options.format) body.format = options.format;
    if (options.think === true) body.think = true;
    else if (options.think === false) body.think = false;
    if (options.maxTokens || options.temperature != null) {
        body.options = {};
        if (options.maxTokens) body.options.num_predict = options.maxTokens;
        if (options.temperature != null) body.options.temperature = options.temperature;
    }
    return body;
}

function ollamaDirect(model, sysPrompt, userPrompt, options) {
    options = options || {};
    var timeoutMs = options.timeoutMs || PDM_LLM_TIMEOUT_MS;
    var proxyUrl = getProxyUrl();
    var messages = [];
    if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
    messages.push({ role: 'user', content: userPrompt });

    var controller = new AbortController();
    window.PDM._activeAbort = controller;
    var timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);

    return fetch(proxyUrl + '?path=api/chat', {
        method: 'POST',
        headers: buildProxyHeaders(),
        body: JSON.stringify(buildOllamaChatBody(model, messages, false, options)),
        signal: controller.signal
    }).then(function(res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Ollama HTTP ' + res.status + ' via proxy');
        return res.json();
    }).then(function(data) {
        window.PDM._activeAbort = null;
        if (!data.message && !data.response && !data.result) {
            throw new Error('Réponse Ollama invalide: ' + JSON.stringify(data).slice(0, 200));
        }
        var allowThinking = options.think !== false;
        var msg = data.message || {};
        var rawThinking = msg.thinking != null ? String(msg.thinking) : '';
        var content = data.result != null ? String(data.result)
            : data.response != null ? String(data.response)
            : msg.content != null ? String(msg.content) : '';
        if (options.format === 'json' && !content && rawThinking) content = rawThinking;
        if (!allowThinking && !content && rawThinking) content = rawThinking;
        var thinking = allowThinking ? rawThinking : '';
        var thinkingMaxChars = getThinkingMaxChars(allowThinking);
        if (thinkingMaxChars > 0 && thinking.length > thinkingMaxChars) {
            thinking = thinking.slice(0, thinkingMaxChars);
        }
        var durationMs = data.total_duration ? Math.round(data.total_duration / 1e6) : 0;
        var promptTokens = data.prompt_eval_count || 0;
        var completionTokens = data.eval_count || 0;
        return {
            result: content,
            thinking: thinking,
            model: data.model || model,
            thinkingLimitExceeded: thinkingMaxChars > 0 && rawThinking.length > thinkingMaxChars,
            thinkingLimitMax: thinkingMaxChars > 0 ? thinkingMaxChars : undefined,
            usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens
            },
            duration_ms: durationMs
        };
    }).catch(function(err) {
        clearTimeout(timeoutId);
        window.PDM._activeAbort = null;
        mapAbortError(err, { timeoutMs: timeoutMs });
    });
}

function ollamaStream(model, sysPrompt, userPrompt, onToken, options) {
    options = options || {};
    var timeoutMs = options.timeoutMs || PDM_LLM_TIMEOUT_MS;
    var idleTimeoutMs = options.idleTimeoutMs || PDM_LLM_IDLE_TIMEOUT_MS;
    var proxyUrl = getProxyUrl();
    var messages = [];
    if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
    messages.push({ role: 'user', content: userPrompt });

    var fullText = '';
    var fullThinking = '';
    var lastModel = model;
    var allowThinking = options.think !== false;
    var thinkingMaxChars = getThinkingMaxChars(allowThinking);
    var thinkingLimitReached = false;
    var thinkingLimitAbortScheduled = false;
    var controller = new AbortController();
    window.PDM._activeAbort = controller;
    var abortReason = 'connect';
    var timeoutId = setTimeout(function() {
        abortReason = 'connect';
        controller.abort();
    }, timeoutMs);
    var idleTimeoutId = null;

    function clearIdleTimeout() {
        if (idleTimeoutId) { clearTimeout(idleTimeoutId); idleTimeoutId = null; }
    }
    function resetIdleTimeout() {
        clearIdleTimeout();
        idleTimeoutId = setTimeout(function() {
            abortReason = 'idle';
            controller.abort();
        }, idleTimeoutMs);
    }

    return fetch(proxyUrl + '?path=api/chat', {
        method: 'POST',
        headers: buildProxyHeaders(),
        body: JSON.stringify(buildOllamaChatBody(model, messages, true, options)),
        signal: controller.signal
    }).then(function(res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Ollama HTTP ' + res.status + ' via proxy');
        resetIdleTimeout();
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        function applyThinkingLimit(chunk) {
            if (!chunk || thinkingMaxChars <= 0) return '';
            if (thinkingLimitReached) return '';
            var remaining = thinkingMaxChars - fullThinking.length;
            if (remaining <= 0) {
                thinkingLimitReached = true;
                return '';
            }
            if (chunk.length > remaining) {
                thinkingLimitReached = true;
                return chunk.slice(0, remaining);
            }
            return chunk;
        }

        function scheduleThinkingLimitContinue() {
            if (thinkingLimitAbortScheduled || thinkingMaxChars <= 0) return;
            thinkingLimitAbortScheduled = true;
            window.PDM._inferenceAbortReason = 'thinking_limit_continue';
            setTimeout(function() { controller.abort(); }, 0);
        }

        function processLine(line) {
            line = line.trim();
            if (!line) return false;
            try {
                var obj = JSON.parse(line);
                if (!obj.message) return false;
                lastModel = obj.model || lastModel;
                var rawThinking = obj.message.thinking != null ? String(obj.message.thinking) : '';
                var content = obj.message.content != null ? String(obj.message.content) : '';
                if (!content && obj.result != null) content = String(obj.result);
                /* format:json — certains modèles (Qwen3…) mettent le JSON dans thinking */
                if (options.format === 'json' && !content && rawThinking) content = rawThinking;
                /* Certains modèles (ex. Qwen3) ignorent think:false et remplissent thinking */
                if (!allowThinking && !content && rawThinking) content = rawThinking;
                var thinking = allowThinking && rawThinking ? rawThinking : '';
                if (thinking) thinking = applyThinkingLimit(thinking);
                if (thinking) {
                    fullThinking += thinking;
                    if (onToken) onToken(fullText, thinking, {
                        phase: 'thinking',
                        fullThinking: fullThinking,
                        thinkingLimitReached: thinkingLimitReached
                    });
                }
                if (thinkingLimitReached) scheduleThinkingLimitContinue();
                if (content) {
                    fullText += content;
                    if (onToken) onToken(fullText, content, {
                        phase: 'content',
                        fullThinking: fullThinking,
                        thinkingLimitReached: thinkingLimitReached
                    });
                }
                if (obj.done && !fullText && content) {
                    fullText = content;
                    if (onToken) onToken(fullText, content, { phase: 'content', final: true, fullThinking: fullThinking });
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        function readChunk() {
            return reader.read().then(function(result) {
                if (result.done) {
                    clearIdleTimeout();
                    if (buffer.trim()) processLine(buffer.trim());
                    window.PDM._activeAbort = null;
                    var needsContentPass = !!(thinkingLimitReached && allowThinking && !fullText);
                    return {
                        result: fullText,
                        thinking: fullThinking,
                        model: lastModel,
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                        duration_ms: 0,
                        thinkingLimitExceeded: thinkingLimitReached,
                        thinkingLimitMax: thinkingLimitReached ? thinkingMaxChars : undefined,
                        continueWithoutThinking: needsContentPass
                    };
                }
                buffer += decoder.decode(result.value, { stream: true });
                var lines = buffer.split('\n');
                buffer = lines.pop() || '';
                var progressed = false;
                for (var i = 0; i < lines.length; i++) {
                    if (processLine(lines[i])) progressed = true;
                }
                if (progressed) resetIdleTimeout();
                return readChunk();
            });
        }
        return readChunk();
    }).catch(function(err) {
        clearTimeout(timeoutId);
        clearIdleTimeout();
        window.PDM._activeAbort = null;
        if (err && err.name === 'AbortError' && window.PDM._inferenceAbortReason === 'thinking_limit_continue') {
            window.PDM._inferenceAbortReason = null;
            return {
                result: fullText,
                thinking: fullThinking,
                model: lastModel,
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                duration_ms: 0,
                continueWithoutThinking: true,
                thinkingLimitExceeded: true,
                thinkingLimitMax: thinkingMaxChars
            };
        }
        mapAbortError(err, { timeoutMs: timeoutMs, idleTimeoutMs: idleTimeoutMs, abortReason: abortReason });
    });
}

function fetchOllamaModels() {
    var proxyUrl = getProxyUrl();
    return fetch(proxyUrl + '?path=api/tags', { method: 'GET', cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('Ollama injoignable via proxy — HTTP ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (!data.models || !Array.isArray(data.models) || data.models.length === 0) return [];
            return data.models.map(function(m) {
                var sizeGB = m.size ? (m.size / 1073741824).toFixed(1) + ' GB' : '';
                var details = sizeGB ? ' (' + sizeGB + ')' : '';
                return { id: m.name, label: m.name, ctx: details || '?', thinkingSupported: null };
            });
        });
}

function fetchOllamaModelCapabilities(modelName) {
    if (!modelName) return Promise.resolve(false);
    var proxyUrl = getProxyUrl();
    return fetch(proxyUrl + '?path=api/show', {
        method: 'POST',
        headers: buildProxyHeaders(),
        body: JSON.stringify({ model: modelName })
    }).then(function(res) {
        if (!res.ok) return false;
        return res.json();
    }).then(function(data) {
        if (!data || !Array.isArray(data.capabilities)) return null;
        return data.capabilities.indexOf('thinking') !== -1;
    }).catch(function() {
        return null;
    });
}

function enrichOllamaModels(models) {
    if (!models || !models.length) return Promise.resolve([]);
    return Promise.resolve(models.map(function(m) {
        return {
            id: m.id,
            label: m.label,
            ctx: m.ctx,
            thinkingSupported: m.thinkingSupported != null ? m.thinkingSupported : null
        };
    }));
}

function applyMarketingCopy(root) {
    root = root || document;
    Object.keys(COPY).forEach(function(key) {
        var nodes = root.querySelectorAll('[data-pdm-copy="' + key + '"]');
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].innerHTML = COPY[key];
        }
    });
}

function applySettingsUi(card) {
    card = card || document.getElementById('llm-settings-card');
    if (!card) return;
    card.hidden = false;
    var endpointWrap = document.getElementById('llm-endpoint-wrap');
    if (endpointWrap) endpointWrap.hidden = !!adapter.hideEndpointUrl;
    var ep = document.getElementById('llm-endpoint-url');
    if (ep && adapter.storage) ep.placeholder = adapter.storage.defaultUrl || '';
}

var adapter = {
    id: 'ollama',
    label: 'Ollama',
    docUrl: 'https://ollama.ai/download',
    isLocal: true,

    storage: {
        urlKey: 'pdm_ollama_url',
        getUrl: function() {
            return window.PDM.Storage.getOllamaUrl();
        },
        setUrl: function(u) {
            return window.PDM.Storage.setOllamaUrl(u);
        },
        defaultUrl: 'http://localhost:11434'
    },

    formatBadge: function(model) {
        return model || '—';
    },

    formatStatusInProgress: function(model) {
        return 'Génération en cours (' + (model || '—') + ')...';
    },

    getErrorHints: function(err, model) {
        var msg = err && err.message ? err.message : String(err);
        if (msg.indexOf('Timeout') !== -1) {
            msg += ' Essaie un modèle plus léger dans le Workspace.';
        }
        return msg;
    },

    getEmptyModelsHint: function() {
        return 'Aucun modèle détecté.';
    },

    getModelsCountHint: function(n) {
        return n + ' modèle(s) détecté(s)';
    },

    saveEndpointNotification: function() {
        return 'URL sauvegardée.';
    },

    sniperise: function(model, sysPrompt, userPrompt, options) {
        options = options || {};
        var onToken = options.onToken || null;
        if (options.streaming === false) {
            return ollamaDirect(model, sysPrompt, userPrompt, options).then(function(data) {
                var text = data.result != null ? String(data.result) : '';
                if (onToken && text) onToken(text, text, { phase: 'content' });
                return data;
            });
        }
        return ollamaStream(model, sysPrompt, userPrompt, onToken, options);
    },

    complete: function(model, systemPrompt, userPrompt, options) {
        options = options || {};
        if (options.streaming) {
            return ollamaStream(model, systemPrompt, userPrompt, options.onToken || null, options);
        }
        return ollamaDirect(model, systemPrompt, userPrompt, options);
    },

    test: function(baseUrl) {
        if (baseUrl) adapter.storage.setUrl(baseUrl);
        return fetchOllamaModels().then(function(models) {
            return { ok: true, models: models };
        }).catch(function(err) {
            return { ok: false, error: err.message || String(err) };
        });
    },

    fetchModels: fetchOllamaModels,

    fetchModelCapabilities: function(modelId) {
        return fetchOllamaModelCapabilities(modelId).then(function(supported) {
            return { thinkingSupported: supported };
        });
    },

    enrichModels: enrichOllamaModels,

    applyMarketingCopy: applyMarketingCopy,
    applySettingsUi: applySettingsUi
};

window.PDM = window.PDM || {};
if (window.PDM.Providers && window.PDM.Providers.register) {
    window.PDM.Providers.register(adapter);
}

})();
