/**
 * PromptDeMerde.com — proxy-token-session.js
 *
 * Synopsis : Token proxy en sessionStorage (Options LLM uniquement, sans modale boot).
 * Objectif : Champ libre Options → LLM ; case « Je n'ai pas de token » → flux A direct.
 */
(function() {

var PTS = {};

function stgT(key, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var msg = I.t('settings.' + key);
        if (msg && msg.indexOf('settings.') !== 0) return msg;
    }
    return fallback;
}

function ollamaT(key, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var msg = I.t('js.ollama.' + key);
        if (msg && msg.indexOf('js.ollama.') !== 0) return msg;
    }
    return fallback;
}

function isRequired() {
    return window.PDM.Env && typeof window.PDM.Env.isProxyAuthRequired === 'function'
        && window.PDM.Env.isProxyAuthRequired();
}

function tokenSectionMode() {
    var Env = window.PDM.Env;
    if (!Env) return 'hidden';
    if (typeof Env.isPreprod === 'function' && Env.isPreprod()) return 'preprod';
    if (typeof Env.isSelfHosted === 'function' && Env.isSelfHosted()) return 'selfhosted';
    if (isRequired()) return 'input';
    return 'hidden';
}

PTS.shouldUseDirectOllama = function() {
    if (!isRequired()) return false;
    return window.PDM.Storage && window.PDM.Storage.isLlmDirectLocal
        ? window.PDM.Storage.isLlmDirectLocal()
        : true;
};

PTS.getLlmRoute = function() {
    if (!isRequired()) return 'relay';
    return PTS.shouldUseDirectOllama() ? 'direct' : 'proxy';
};

PTS.shouldSkipLlmBootstrapOnBoot = function() {
    if (!isRequired()) return false;
    if (PTS.shouldUseDirectOllama()) return false;
    return PTS.isTokenMissing();
};

function switchToProxyFlowIfTokenPresent(input, checkbox) {
    if (!input || !isRequired()) return false;
    var token = String(input.value || '').trim();
    if (!token) return false;
    if (checkbox && checkbox.checked) {
        checkbox.checked = false;
    }
    if (window.PDM.Storage && window.PDM.Storage.setLlmDirectLocal) {
        window.PDM.Storage.setLlmDirectLocal(false);
    }
    syncTokenInputState(input, checkbox);
    return true;
}

PTS.isWrapVisible = function() {
    return tokenSectionMode() !== 'hidden';
};

PTS.isTokenMissing = function() {
    if (!isRequired()) return false;
    if (PTS.shouldUseDirectOllama()) return false;
    var token = window.PDM.Storage && window.PDM.Storage.getProxyToken
        ? String(window.PDM.Storage.getProxyToken()).trim()
        : '';
    return !token;
};

PTS.notifyTokenMissing = function() {
    var title = ollamaT('proxyTokenMissing', 'Token non renseigné.');
    var doc = ollamaT('proxyTokenMissingDoc', 'Documentation technique GitHub : paramétrage du token proxy, puis saisie dans Options → LLM.');
    if (window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(title, 'err');
        window.PDM.UI.notif(doc, 'info');
    }
    if (window.PDM && window.PDM.Docs && typeof window.PDM.Docs.openTechDoc === 'function') {
        window.PDM.Docs.openTechDoc();
    }
    window.location.hash = 'settings';
};

function syncTokenInputState(input, checkbox) {
    if (!input) return;
    var direct = checkbox ? !!checkbox.checked : PTS.shouldUseDirectOllama();
    input.disabled = direct;
    input.setAttribute('aria-disabled', direct ? 'true' : 'false');
    if (direct) {
        input.classList.add('stg-input-disabled');
    } else {
        input.classList.remove('stg-input-disabled');
    }
}

PTS.syncOptionsField = function() {
    var wrap = document.getElementById('llm-proxy-token-wrap');
    var infoText = document.getElementById('llm-proxy-token-info-text');
    var form = document.getElementById('llm-proxy-token-form');
    var input = document.getElementById('llm-proxy-token');
    var checkbox = document.getElementById('llm-proxy-token-none');
    if (!wrap) return;

    var mode = tokenSectionMode();
    var showInput = mode === 'input';
    var showInfo = mode === 'preprod' || mode === 'selfhosted';

    wrap.hidden = mode === 'hidden';
    wrap.classList.toggle('stg-llm-proxy-token-row--info', showInfo);
    wrap.classList.toggle('stg-llm-proxy-token-row--input', showInput);
    if (mode === 'hidden') return;

    if (form) form.hidden = !showInput;
    if (infoText) infoText.hidden = !showInfo;

    if (showInfo && infoText) {
        var i18nKey = mode === 'preprod'
            ? 'proxyTokenNotRequiredPreprod'
            : 'proxyTokenNotRequiredSelfHosted';
        var fallback = mode === 'preprod'
            ? 'Préprod / aucun token nécessaire'
            : 'Auto-hébergé / aucun token nécessaire';
        infoText.setAttribute('data-i18n', 'settings.' + i18nKey);
        infoText.textContent = stgT(i18nKey, fallback);
    }

    if (showInput) {
        var directLocal = PTS.shouldUseDirectOllama();
        if (checkbox && document.activeElement !== checkbox) {
            checkbox.checked = directLocal;
        }
        if (input) {
            var token = window.PDM.Storage && window.PDM.Storage.getProxyToken
                ? window.PDM.Storage.getProxyToken()
                : '';
            if (document.activeElement !== input) {
                input.value = token;
            }
            syncTokenInputState(input, checkbox);
        }
    }
};

PTS.promptIfNeeded = function() {
    if (window.PDM.Storage && window.PDM.Storage.purgeProxyTokenLegacy) {
        window.PDM.Storage.purgeProxyTokenLegacy();
    }
    PTS.syncOptionsField();
    return Promise.resolve(true);
};

function persistTokenAndMaybeBootstrap(input) {
    if (!input) return;
    var checkbox = document.getElementById('llm-proxy-token-none');
    var switched = switchToProxyFlowIfTokenPresent(input, checkbox);
    if (input.disabled && !switched) return;
    if (window.PDM.Storage && window.PDM.Storage.setProxyToken) {
        window.PDM.Storage.setProxyToken(input.value);
    }
    if (isRequired() && !PTS.shouldUseDirectOllama() && String(input.value || '').trim()
        && window.PDM.App && typeof window.PDM.App.bootstrapLlmFromProvider === 'function') {
        window.PDM.App.bootstrapLlmFromProvider({ thinkingOffOnAuto: true });
    }
}

function onDirectModeChange(checked) {
    if (window.PDM.Storage && window.PDM.Storage.setLlmDirectLocal) {
        window.PDM.Storage.setLlmDirectLocal(!!checked);
    }
    var input = document.getElementById('llm-proxy-token');
    var checkbox = document.getElementById('llm-proxy-token-none');
    syncTokenInputState(input, checkbox);
    if (checked && window.PDM.App && typeof window.PDM.App.bootstrapLlmFromProvider === 'function') {
        window.PDM.App.bootstrapLlmFromProvider({ thinkingOffOnAuto: true });
        return;
    }
    if (!checked && input && String(input.value || '').trim()
        && window.PDM.App && typeof window.PDM.App.bootstrapLlmFromProvider === 'function') {
        window.PDM.App.bootstrapLlmFromProvider({ thinkingOffOnAuto: true });
    }
}

PTS.bindOptionsField = function() {
    var input = document.getElementById('llm-proxy-token');
    var checkbox = document.getElementById('llm-proxy-token-none');
    if (input && !input._pdmProxyTokenBound) {
        input._pdmProxyTokenBound = true;
        var saveTimer = null;
        function persistAndMaybeBootstrap() {
            persistTokenAndMaybeBootstrap(input);
        }
        input.addEventListener('input', function() {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(persistAndMaybeBootstrap, 400);
        });
        input.addEventListener('blur', function() {
            clearTimeout(saveTimer);
            persistAndMaybeBootstrap();
        });
    }
    if (checkbox && !checkbox._pdmProxyDirectBound) {
        checkbox._pdmProxyDirectBound = true;
        checkbox.addEventListener('change', function() {
            onDirectModeChange(checkbox.checked);
        });
    }
};

window.PDM = window.PDM || {};
window.PDM.ProxyTokenSession = PTS;

})();
