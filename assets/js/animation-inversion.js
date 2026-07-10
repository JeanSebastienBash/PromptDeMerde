/**
 * PromptDeMerde.com — animation-inversion.js
 *
 * Synopsis : Boucle header « Univers inversé » — chnek ↔ sniper, effets A–E aléatoires.
 * Objectif : Séquence mélangée à chaque rechargement ; pauses en pas de 100 ms ; GPU-only.
 */
(function () {
    'use strict';

    var EFFECTS = ['metaphysical', 'quantum', 'glitch', 'morph', 'retro'];

    function getFromText() {
        var el = getUsernameEl();
        return el ? (el.getAttribute('data-from') || 'chnek') : 'chnek';
    }

    function getToText() {
        var el = getUsernameEl();
        return el ? (el.getAttribute('data-to') || 'sniper') : 'sniper';
    }

    var PAUSE_BASE_MS = 1200;
    var PAUSE_JITTER_STEPS = 8;
    var PAUSE_STEP_MS = 100;

    var state = {
        currentText: 'chnek',
        effectQueue: [],
        effectIndex: 0,
        loopTimer: null,
        running: false,
        destroyed: false
    };

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function escapeHtml(ch) {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '"') return '&quot;';
        return ch;
    }

    function wrapLetters(str) {
        var out = '';
        for (var i = 0; i < str.length; i++) {
            out += '<span class="prompt-letter" style="--i:' + i + '">' + escapeHtml(str.charAt(i)) + '</span>';
        }
        return out;
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    function randomPhaseMs() {
        return 300 + Math.floor(Math.random() * 3) * 100;
    }

    function randomPauseMs() {
        var jitter = Math.floor(Math.random() * PAUSE_JITTER_STEPS) * PAUSE_STEP_MS;
        return PAUSE_BASE_MS + jitter;
    }

    function getUsernameEl() {
        return document.querySelector('.prompt-username-inverted');
    }

    function getPromptRoot() {
        return document.getElementById('nav-prompt');
    }

    function readUsername(el) {
        var textEl = el.querySelector('.prompt-username-text');
        return (textEl ? textEl.textContent : el.textContent).trim();
    }

    function clearEffectClasses(el) {
        for (var i = 0; i < EFFECTS.length; i++) {
            el.classList.remove('effect-' + EFFECTS[i]);
        }
    }

    function setDurations(el, collapseMs, expandMs) {
        el.style.setProperty('--inv-collapse-dur', collapseMs + 'ms');
        el.style.setProperty('--inv-expand-dur', expandMs + 'ms');
        el.style.setProperty('--inv-portal-dur', (collapseMs + expandMs) + 'ms');
    }

    function applyStable(usernameEl, promptRoot, text, glowing) {
        clearEffectClasses(usernameEl);
        usernameEl.classList.remove('is-inverting', 'phase-collapse', 'phase-expand');
        usernameEl.classList.toggle('is-complete', !!glowing);
        usernameEl.innerHTML = '<span class="prompt-username-text">' + text + '</span>';
        usernameEl.removeAttribute('aria-busy');
        usernameEl.style.willChange = '';
        if (promptRoot) promptRoot.classList.remove('is-inverting');
        state.currentText = text;
    }

    function nextEffect() {
        if (state.effectIndex >= state.effectQueue.length) {
            state.effectQueue = shuffle(EFFECTS);
            state.effectIndex = 0;
        }
        return state.effectQueue[state.effectIndex++];
    }

    function waitPhase(el, durationMs) {
        return new Promise(function (resolve) {
            var done = false;
            function finish() {
                if (done) return;
                done = true;
                el.removeEventListener('animationend', onEnd);
                clearTimeout(fallback);
                resolve();
            }
            function onEnd(e) {
                if (e.target !== el) return;
                finish();
            }
            el.addEventListener('animationend', onEnd);
            var fallback = setTimeout(finish, durationMs + 100);
        });
    }

    function runAnimation(usernameEl, promptRoot, fromText, toText, effect) {
        var collapseMs = randomPhaseMs();
        var expandMs = randomPhaseMs();
        var totalMs = collapseMs + expandMs;

        clearEffectClasses(usernameEl);
        usernameEl.classList.remove('is-complete', 'phase-collapse', 'phase-expand');
        usernameEl.classList.add('is-inverting', 'effect-' + effect);
        usernameEl.style.willChange = 'transform';
        if (promptRoot) promptRoot.classList.add('is-inverting');
        usernameEl.setAttribute('aria-busy', 'true');
        usernameEl.setAttribute('aria-live', 'polite');
        setDurations(usernameEl, collapseMs, expandMs);

        usernameEl.innerHTML = wrapLetters(fromText);
        void usernameEl.offsetWidth;
        usernameEl.classList.add('phase-collapse');

        return waitPhase(usernameEl, collapseMs).then(function () {
            usernameEl.classList.remove('phase-collapse');
            usernameEl.innerHTML = wrapLetters(toText);
            void usernameEl.offsetWidth;
            usernameEl.classList.add('phase-expand');
            return waitPhase(usernameEl, expandMs);
        }).then(function () {
            applyStable(usernameEl, promptRoot, toText, true);
            return totalMs;
        });
    }

    function clearLoopTimer() {
        if (state.loopTimer) {
            clearTimeout(state.loopTimer);
            state.loopTimer = null;
        }
    }

    function scheduleNext(usernameEl, promptRoot) {
        if (state.destroyed || prefersReducedMotion() || document.hidden) return;
        clearLoopTimer();
        state.loopTimer = setTimeout(function () {
            state.loopTimer = null;
            runCycle(usernameEl, promptRoot);
        }, randomPauseMs());
    }

    function runCycle(usernameEl, promptRoot) {
        if (state.destroyed || state.running || document.hidden) return;

        var fromText = state.currentText;
        var original = getFromText();
        var replacement = getToText();
        var toText = fromText === original ? replacement : original;
        var effect = nextEffect();

        state.running = true;
        runAnimation(usernameEl, promptRoot, fromText, toText, effect)
            .catch(function () {
                applyStable(usernameEl, promptRoot, toText, true);
            })
            .then(function () {
                state.running = false;
                if (!state.destroyed && !prefersReducedMotion()) {
                    scheduleNext(usernameEl, promptRoot);
                }
            });
    }

    function init() {
        var usernameEl = getUsernameEl();
        if (!usernameEl) return;

        var promptRoot = getPromptRoot();
        state.currentText = readUsername(usernameEl);
        state.effectQueue = shuffle(EFFECTS);
        state.effectIndex = 0;

        if (prefersReducedMotion()) {
            applyStable(usernameEl, promptRoot, getToText(), false);
            return;
        }

        runCycle(usernameEl, promptRoot);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                clearLoopTimer();
            } else if (!state.running && !state.destroyed && !prefersReducedMotion()) {
                scheduleNext(usernameEl, promptRoot);
            }
        });

        window.addEventListener('pagehide', function () {
            state.destroyed = true;
            clearLoopTimer();
        }, { once: true });
    }

    function refreshIdentity(fromText, toText) {
        var usernameEl = getUsernameEl();
        if (!usernameEl) return;
        var promptRoot = getPromptRoot();
        if (fromText) usernameEl.setAttribute('data-from', fromText);
        if (toText) usernameEl.setAttribute('data-to', toText);
        state.currentText = fromText || getFromText();
        clearLoopTimer();
        state.running = false;
        if (prefersReducedMotion()) {
            applyStable(usernameEl, promptRoot, getToText(), false);
            return;
        }
        if (!state.destroyed) {
            runCycle(usernameEl, promptRoot);
        }
    }

    window.PDM = window.PDM || {};
    window.PDM.AnimationInversion = {
        refreshIdentity: refreshIdentity
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
