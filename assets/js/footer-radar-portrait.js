/**
 * PromptDeMerde.com — footer-radar-portrait.js
 *
 * Révélations aléatoires du portrait dans la cible footer (sync radar, perf).
 * Pause hors viewport ; aucune boucle rAF.
 */
(function() {
    var SCAN_MS = 4200;
    var art, photo, scan;
    var active = false;
    var timers = [];
    var reduced = false;

    function clearTimers() {
        var i;
        for (i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function setDrift() {
        art.style.setProperty('--pdm-drift-x', rand(-3.4, 3.4).toFixed(2) + '%');
        art.style.setProperty('--pdm-drift-y', rand(-3, 3).toFixed(2) + '%');
        art.style.setProperty('--pdm-zoom', rand(1.02, 1.07).toFixed(3));
    }

    function hideReveal() {
        photo.classList.remove('is-revealed');
        art.classList.remove('is-veil-lift');
    }

    function pulseReveal(strength, duration) {
        if (!active) return;
        photo.style.setProperty('--pdm-reveal-k', String(strength));
        photo.classList.add('is-revealed');
        art.classList.add('is-veil-lift');
        timers.push(setTimeout(hideReveal, duration));
    }

    function planCycle() {
        var reveals = [];
        var roll = Math.random();
        var count = roll < 0.22 ? 0 : (roll < 0.72 ? 1 : 2);
        var i, at, dur, strength;

        for (i = 0; i < count; i++) {
            at = rand(0.3, 0.62);
            dur = rand(240, 560);
            strength = rand(0.72, 1);
            reveals.push({ at: at, dur: dur, strength: strength });
        }

        reveals.sort(function(a, b) { return a.at - b.at; });

        for (i = 0; i < reveals.length; i++) {
            (function(r) {
                timers.push(setTimeout(function() {
                    pulseReveal(r.strength, r.dur);
                }, Math.round(r.at * SCAN_MS)));
            })(reveals[i]);
        }
    }

    function onScanCycle() {
        if (!active) return;
        clearTimers();
        hideReveal();
        setDrift();
        planCycle();
    }

    function start() {
        if (!art || reduced) return;
        active = true;
        hideReveal();
        setDrift();
        planCycle();
        scan.addEventListener('animationiteration', onScanCycle);
    }

    function stop() {
        active = false;
        scan.removeEventListener('animationiteration', onScanCycle);
        clearTimers();
        hideReveal();
    }

    function init() {
        reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        art = document.querySelector('.footer-brand-art');
        if (!art) return;
        photo = art.querySelector('.footer-brand-photo');
        scan = art.querySelector('.footer-brand-scan');
        if (!photo || !scan) return;

        if (reduced) return;

        var footer = document.getElementById('main-footer') || art;
        if (!window.IntersectionObserver) {
            start();
            return;
        }

        var io = new IntersectionObserver(function(entries) {
            var visible = entries.some(function(e) { return e.isIntersecting; });
            if (visible) start();
            else stop();
        }, { rootMargin: '48px 0px', threshold: 0.04 });

        io.observe(footer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
