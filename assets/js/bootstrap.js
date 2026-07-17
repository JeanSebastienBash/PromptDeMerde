/**
 * PromptDeMerde.com — bootstrap.js
 *
 * Synopsis : Chargeur dynamique des scripts listés par lib/env/env.php.
 * Objectif : Injecter les modules autorisés puis lancer PDM.App.init().
 */
(function() {

var MODULE_SCRIPTS = {
    'assets/js/stt-parakeet.js': true,
    'assets/js/stt-whisper.js': true
};

function isModuleScript(src) {
    var base = src.split('?')[0];
    return !!MODULE_SCRIPTS[src] || !!MODULE_SCRIPTS[base];
}

function isHomepageBundleScript(src) {
    return String(src).indexOf('assets/homepage/') === 0;
}

function loadScript(src) {
    return new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        if (isModuleScript(src)) s.type = 'module';
        s.onload = function() { resolve(); };
        s.onerror = function() {
            if (isHomepageBundleScript(src)) {
                console.warn('[PDM.Bootstrap] Script homepage ignoré (fallback workspace):', src);
                if (window.PDM && window.PDM.Homepage && typeof window.PDM.Homepage.forceWorkspace === 'function') {
                    window.PDM.Homepage.forceWorkspace('script: ' + src);
                }
                resolve();
                return;
            }
            reject(new Error('Script load failed: ' + src));
        };
        document.body.appendChild(s);
    });
}

function loadAllScripts(urls) {
    var chain = Promise.resolve();
    for (var i = 0; i < urls.length; i++) {
        (function(url) {
            chain = chain.then(function() { return loadScript(url); });
        })(urls[i]);
    }
    return chain;
}

function startApp() {
    if (window.PDM && window.PDM.Providers && window.PDM.Providers.afterScriptsLoaded) {
        window.PDM.Providers.afterScriptsLoaded();
    }
    if (window.PDM && window.PDM.App && typeof window.PDM.App.init === 'function') {
        window.PDM.App.init();
    }
}

function hideBootLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return;
    loader.classList.remove('on');
    loader.hidden = true;
}

function boot() {
    if (!window.PDM || !window.PDM.Env) {
        console.error('[PDM.Bootstrap] PDM.Env manquant — fallback workspace');
        hideBootLoader();
        if (window.location.hash.replace(/^#/, '') === 'landing') {
            window.location.replace('#workspace');
        }
        return;
    }
    window.PDM.Env.ready().then(function() {
        var chain = Promise.resolve();
        if (window.PDM.I18n && typeof window.PDM.I18n.init === 'function') {
            chain = window.PDM.I18n.init();
        }
        return chain.then(function() {
            if (window.PDM.I18n && typeof window.PDM.I18n.isMaintenance === 'function' &&
                window.PDM.I18n.isMaintenance()) {
                return;
            }
            return loadAllScripts(window.PDM.Env.getScripts());
        });
    }).then(function() {
        if (window.PDM.I18n && typeof window.PDM.I18n.isMaintenance === 'function' &&
            window.PDM.I18n.isMaintenance()) {
            return;
        }
        startApp();
    }).catch(function(err) {
        if (window.PDM.I18n && typeof window.PDM.I18n.isMaintenance === 'function' &&
            window.PDM.I18n.isMaintenance()) {
            return;
        }
        console.error('[PDM.Bootstrap]', err);
        if (window.PDM && window.PDM.Homepage && typeof window.PDM.Homepage.forceWorkspace === 'function') {
            window.PDM.Homepage.forceWorkspace('bootstrap');
        } else if (window.location.hash.replace(/^#/, '') === 'landing') {
            window.location.replace('#workspace');
        }
    }).finally(function() {
        hideBootLoader();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

})();
