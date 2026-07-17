/**
 * PromptDeMerde.com — animation-synopsis.js
 *
 * Synopsis : Saisie clavier simulée du synopsis profil dans le header terminal.
 * Objectif : Effet typing aléatoire, boucle légère, setTimeout unique, GPU-safe.
 */
(function () {
    'use strict';

    var TYPO_POOL = 'azertyuiopqsdfghjklmwxcvbn';
    var LATIN_TYPABLE_RE = /\p{Script=Latin}/u;

    var state = {
        target: '',
        graphemes: [],
        buffer: '',
        bufferGraphemes: [],
        index: 0,
        typoBudget: 0,
        persona: null,
        timer: null,
        maxVisible: 40,
        running: false,
        destroyed: false,
        paused: false
    };

    function synopsisResolve() {
        return window.PDM && window.PDM.SynopsisResolve;
    }

    function segmentGraphemes(text) {
        var SR = synopsisResolve();
        if (SR && typeof SR.segmentGraphemes === 'function') {
            return SR.segmentGraphemes(text);
        }
        return Array.from(String(text || ''));
    }

    function clampSynopsis(text) {
        var SR = synopsisResolve();
        if (SR && typeof SR.clampSynopsis === 'function') {
            return SR.clampSynopsis(text);
        }
        var s = String(text || '').trim();
        var graphemes = segmentGraphemes(s);
        if (graphemes.length > 100) graphemes = graphemes.slice(0, 100);
        return graphemes.join('');
    }

    function getUiLocale() {
        var I = window.PDM && window.PDM.I18n;
        if (I && typeof I.getLocale === 'function') {
            return I.getLocale();
        }
        return 'fr';
    }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function randInt(max) {
        return Math.floor(Math.random() * max);
    }

    function randomPersona() {
        return {
            baseDelay: 50 + randInt(8) * 10,
            jitter: randInt(6) * 8,
            burstChance: 0.05 + randInt(5) * 0.02,
            burstMs: 180 + randInt(7) * 30,
            typoChance: 0.02 + randInt(5) * 0.015,
            typoCorrectDelay: 90 + randInt(6) * 20,
            speedFactor: 0.75 + randInt(11) * 0.05,
            backspaceDelay: 25 + randInt(5) * 10,
            loopPauseMs: 2200 + randInt(13) * 150,
            startHesitation: randInt(9) * 40,
            maxTypos: 1 + randInt(3),
            hesitateMidChance: 0.08 + randInt(4) * 0.04,
            doubleStrikeChance: 0.04 + randInt(3) * 0.02
        };
    }

    function randomTypoChar() {
        return TYPO_POOL.charAt(randInt(TYPO_POOL.length));
    }

    function isLatinTypable(grapheme) {
        if (!grapheme) return false;
        try {
            return LATIN_TYPABLE_RE.test(grapheme);
        } catch (e) {
            return /^[\x00-\x7F]$/.test(grapheme);
        }
    }

    function getRoot() {
        return document.getElementById('nav-synopsis');
    }

    function getTextEl() {
        return document.getElementById('nav-synopsis-text');
    }

    function getViewportEl() {
        return document.getElementById('nav-synopsis-viewport');
    }

    function getPromptRoot() {
        return document.getElementById('nav-prompt');
    }

    function clearTimer() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    }

    function charWidthDivisor(locale) {
        locale = String(locale || 'fr');
        if (locale === 'ja' || locale === 'zh' || locale === 'ko') return 12;
        if (locale === 'ar') return 9;
        return 7.2;
    }

    function measureMaxVisible() {
        var vp = getViewportEl();
        var width = vp && vp.clientWidth > 24 ? vp.clientWidth : 0;
        if (!width) {
            var row = document.querySelector('.nav-prompt-row');
            var wrap = getRoot();
            if (row && wrap) {
                width = Math.max(96, row.clientWidth - wrap.offsetLeft - 48);
            }
        }
        if (!width) width = 200;
        var divisor = charWidthDivisor(getUiLocale());
        return Math.max(12, Math.min(80, Math.floor(width / divisor)));
    }

    function visibleGraphemes(graphemes, maxVisible) {
        if (!graphemes || !graphemes.length) return '';
        if (graphemes.length <= maxVisible) return graphemes.join('');
        return graphemes.slice(-maxVisible).join('');
    }

    function render() {
        var textEl = getTextEl();
        if (!textEl) return;
        textEl.textContent = visibleGraphemes(state.bufferGraphemes, state.maxVisible);
    }

    function pushGrapheme(grapheme) {
        state.bufferGraphemes.push(grapheme);
        state.buffer = state.bufferGraphemes.join('');
    }

    function popGrapheme() {
        if (!state.bufferGraphemes.length) return '';
        state.bufferGraphemes.pop();
        state.buffer = state.bufferGraphemes.join('');
        return state.buffer;
    }

    function typingDelay() {
        var p = state.persona;
        var d = (p.baseDelay + randInt(Math.max(1, Math.floor(p.jitter / 8) + 1)) * 8) / p.speedFactor;
        if (Math.random() < p.burstChance) d += p.burstMs;
        return Math.round(d);
    }

    function schedule(fn, ms) {
        clearTimer();
        state.timer = setTimeout(fn, Math.max(0, ms));
    }

    function finishLoop() {
        state.running = false;
        var promptRoot = getPromptRoot();
        if (promptRoot) promptRoot.classList.remove('is-synopsis-typing');
        if (state.destroyed || prefersReducedMotion() || document.hidden) return;
        schedule(beginLoop, state.persona ? state.persona.loopPauseMs : 2600);
    }

    function beginLoop() {
        if (state.destroyed || prefersReducedMotion() || document.hidden || !state.graphemes.length) return;
        state.persona = randomPersona();
        state.buffer = '';
        state.bufferGraphemes = [];
        state.index = 0;
        state.typoBudget = state.persona.maxTypos;
        state.running = true;
        state.maxVisible = measureMaxVisible();
        var promptRoot = getPromptRoot();
        if (promptRoot) promptRoot.classList.add('is-synopsis-typing');
        render();
        schedule(stepType, state.persona.startHesitation);
    }

    function stepType() {
        if (state.destroyed || state.paused || document.hidden) {
            state.running = false;
            return;
        }

        if (state.index >= state.graphemes.length) {
            finishLoop();
            return;
        }

        var p = state.persona;
        var nextGrapheme = state.graphemes[state.index];

        if (Math.random() < p.hesitateMidChance) {
            schedule(stepType, p.burstMs);
            return;
        }

        if (state.typoBudget > 0 && state.index > 1 && isLatinTypable(nextGrapheme) &&
            Math.random() < p.typoChance) {
            state.typoBudget--;
            pushGrapheme(randomTypoChar());
            render();
            schedule(function () {
                popGrapheme();
                render();
                schedule(stepType, p.typoCorrectDelay);
            }, typingDelay());
            return;
        }

        pushGrapheme(nextGrapheme);
        state.index++;
        render();

        if (Math.random() < p.doubleStrikeChance && state.index < state.graphemes.length &&
            isLatinTypable(state.graphemes[state.index])) {
            pushGrapheme(state.graphemes[state.index]);
            render();
            schedule(function () {
                popGrapheme();
                render();
                schedule(stepType, p.backspaceDelay);
            }, typingDelay());
            return;
        }

        schedule(stepType, typingDelay());
    }

    function showStatic(text) {
        var root = getRoot();
        var textEl = getTextEl();
        if (!root || !textEl) return;
        state.maxVisible = measureMaxVisible();
        var graphemes = segmentGraphemes(text);
        textEl.textContent = visibleGraphemes(graphemes, state.maxVisible);
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
    }

    function start(text) {
        stop();
        state.target = clampSynopsis(text);
        state.graphemes = segmentGraphemes(state.target);
        if (!state.graphemes.length) return;

        var root = getRoot();
        if (!root) return;

        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        state.maxVisible = measureMaxVisible();

        if (prefersReducedMotion()) {
            showStatic(state.target);
            return;
        }

        beginLoop();
    }

    function stop() {
        clearTimer();
        state.running = false;
        state.paused = false;
        state.buffer = '';
        state.bufferGraphemes = [];
        state.graphemes = [];
        state.index = 0;
        var promptRoot = getPromptRoot();
        if (promptRoot) promptRoot.classList.remove('is-synopsis-typing');
    }

    function refresh(text) {
        start(text);
    }

    function resolveSynopsisText() {
        if (window.PDM && window.PDM.Storage && typeof window.PDM.Storage.getProfileSynopsisEffective === 'function') {
            return window.PDM.Storage.getProfileSynopsisEffective();
        }
        var SR = synopsisResolve();
        if (SR && typeof SR.resolveDefaultProfileSynopsis === 'function') {
            return SR.resolveDefaultProfileSynopsis();
        }
        var CS = window.PDM && window.PDM.ConfigSchema;
        if (CS && typeof CS.getLocaleDefault === 'function') {
            return CS.getLocaleDefault('DEFAULT_PROFILE_SYNOPSIS');
        }
        return CS && CS.DEFAULT_PROFILE_SYNOPSIS ? CS.DEFAULT_PROFILE_SYNOPSIS : '';
    }

    function bootFromStorage() {
        start(resolveSynopsisText());
    }

    function onVisibilityChange() {
        if (document.hidden) {
            state.paused = true;
            clearTimer();
            return;
        }
        state.paused = false;
        if (!state.destroyed && !prefersReducedMotion() && state.graphemes.length && !state.running) {
            beginLoop();
        }
    }

    var resizeTimer = null;
    function onResize() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeTimer = null;
            state.maxVisible = measureMaxVisible();
            render();
        }, 200);
    }

    function initListeners() {
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('pagehide', function () {
            state.destroyed = true;
            stop();
        }, { once: true });
    }

    window.PDM = window.PDM || {};
    window.PDM.AnimationSynopsis = {
        start: start,
        refresh: refresh,
        stop: stop,
        bootFromStorage: bootFromStorage
    };

    initListeners();
})();
