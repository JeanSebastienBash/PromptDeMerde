/**
 * PromptDeMerde.com — polish.js
 *
 * Synopsis : Micro-interactions UI (scroll reveal, animations légères).
 * Objectif : Améliorer la navigation et les transitions sans modifier la logique métier.
 */
(function(){
"use strict";

var UI = window.PDM && window.PDM.UI;
if (!UI) { console.warn('[polish] PDM.UI not found — polish disabled.'); return; }

/* ─────────────────────────────────────────────────────
   1. SCROLL REVEAL — IntersectionObserver
   ───────────────────────────────────────────────────── */
function initReveal() {
    var targets = document.querySelectorAll(
        '.pricing-card, .sol-card, .feature-card, .hero-left, .hero-right, ' +
        '.section-title, .section-desc, .hero-title, .hero-sub, ' +
        '.prompt-box, .config-section, .about-text, .footer-col, ' +
        '.section-badge, .video-container, .code-box'
    );
    targets.forEach(function(el, i){
        el.classList.add('reveal');
        el.classList.add('reveal-delay-' + Math.min(i % 4 + 1, 4));
    });

    if (!('IntersectionObserver' in window)) {
        targets.forEach(function(el){ el.classList.add('visible'); });
        return;
    }

    var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    targets.forEach(function(el){ obs.observe(el); });
}

/* ─────────────────────────────────────────────────────
   2. RIPPLE EFFECT — on interactive buttons
   ───────────────────────────────────────────────────── */
function initRipple() {
    var targets = document.querySelectorAll(
        '.btn-sniperise, .btn-copy, .btn-again, .btn, .snip-btn, .tag'
    );
    targets.forEach(function(btn){
        btn.addEventListener('click', function(e){
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var ripple = document.createElement('span');
            ripple.className = 'ripple';
            var size = Math.max(rect.width, rect.height) * 1.2;
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (x - size / 2) + 'px';
            ripple.style.top  = (y - size / 2) + 'px';
            this.appendChild(ripple);
            setTimeout(function(){ ripple.remove(); }, 600);
        });
    });
}

/* ─────────────────────────────────────────────────────
   3. TYPING EFFECT — on hero demo "after" text
   ─────────────────────────────────────────────────────
   The hero demo works via PDM.App.showDemoPair(idx) which
   sets innerHTML of #demo-after .demo-text.
   We DON'T override that function (it's not exposed on PDM).
   Instead, we observe mutations on #demo-after .demo-text
   and re-type its content with a cursor. */
function initTypingEffect() {
    var afterEl = document.querySelector('#demo-after .demo-text');
    if (!afterEl) return;

    var cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.style.display = 'none';
    /* Will be appended to afterEl when typing */

    var isTyping = false;
    var typeTimer = null;

    var observer = new MutationObserver(function(){
        /* Only react if text was set externally (not by our own typing) */
        if (isTyping) return;

        var fullText = afterEl.textContent;
        if (!fullText || !fullText.trim()) return;

        /* Clear existing text and type it out */
        isTyping = true;
        afterEl.textContent = '';
        cursor.style.display = 'inline-block';
        afterEl.appendChild(cursor);

        var charIdx = 0;
        clearInterval(typeTimer);
        typeTimer = setInterval(function(){
            if (charIdx < fullText.length) {
                var textNode = document.createTextNode(fullText[charIdx]);
                // Vérifie que cursor est bien dans afterEl avant insertBefore
                if (cursor.parentNode === afterEl) {
                    afterEl.insertBefore(textNode, cursor);
                } else {
                    afterEl.appendChild(textNode);
                }
                charIdx++;
            } else {
                clearInterval(typeTimer);
                setTimeout(function(){
                    cursor.style.display = 'none';
                    isTyping = false;
                }, 1500);
            }
        }, 30);
    });

    observer.observe(afterEl, { childList: true, characterData: true, subtree: true });
}

/* ─────────────────────────────────────────────────────
   4. NOTIFICATION ENHANCEMENT — slide-out animation
   ─────────────────────────────────────────────────────
   We observe #notif-box for new .notif elements and
   replace the inline opacity fade with our CSS class fade.
   Does NOT override U.notif — adds a parallel observer. */
function initNotifEnhance() {
    var box = document.getElementById('notif-box');
    if (!box) return;

    var obs = new MutationObserver(function(mutations){
        mutations.forEach(function(m){
            m.addedNodes.forEach(function(node){
                if (node.nodeType !== 1 || !node.classList || !node.classList.contains('notif')) return;

                /* Override the inline removal that U.notif sets at 3000ms */
                /* We use our own class-based fade-out instead */
                var fadeTimer = setTimeout(function(){
                    node.classList.add('fade-out');
                    var removeTimer = setTimeout(function(){
                        if (node.parentNode) node.remove();
                    }, 350);
                    /* Store for cleanup */
                    node._polishRemoveTimer = removeTimer;
                }, 2700);

                /* Store timer reference so we don't double-fire */
                node._polishFadeTimer = fadeTimer;
            });
        });
    });
    obs.observe(box, { childList: true });
}

/* ─────────────────────────────────────────────────────
   5. COPY FEEDBACK — show checkmark on copy button
   ───────────────────────────────────────────────────── */
function initCopyFeedback() {
    /* Use event delegation on the document */
    document.addEventListener('click', function(e){
        var btn = e.target.closest('.btn-copy, #copy-btn');
        if (!btn) return;

        setTimeout(function(){
            var existing = btn.querySelector('.copy-feedback');
            if (existing) return;
            var fb = document.createElement('span');
            fb.className = 'copy-feedback';
            fb.innerHTML = '<span class="check">\u2713</span> Copi\u00e9';
            btn.appendChild(fb);
            setTimeout(function(){ fb.remove(); }, 2000);
        }, 150);
    });
}

/* ─────────────────────────────────────────────────────
   6. SKELETON LOADER — INERT, ne cache PAS l'output
   ───────────────────────────────────────────────────── */
function showSkeleton(target) {
    // NE FAIT RENAISSON — le textarea doit rester visible pendant le streaming
    // Le loader CSS #loader gère l'animation globale
    if (!target) return;
    // Ajouter seulement une bordure pulsante visuelle, sans toucher au contenu
    target.classList.add('loading');
}

function hideSkeleton(target) {
    // NE FAIT RENAISSON — le textarea reste visible
    if (!target) return;
    target.classList.remove('loading');
}

// SKELETON LOADER DÉSACTIVÉ — on gère l'animation directement dans app.js
// Le loader #loader global gère l'état de chargement
/*
var _origLoader = UI.loader;
UI.loader = function(on) {
    _origLoader.call(UI, on);
    var outputEl = document.getElementById('output-box');
    if (on) { showSkeleton(outputEl); }
    else    { hideSkeleton(outputEl); }
};
*/

/* ─────────────────────────────────────────────────────
   8. CHAR COUNTER BAR — enhance existing #char-count
   ─────────────────────────────────────────────────────
   HTML already has:
     <textarea id="ws-input" maxlength="50000">
     <div id="char-count" class="char-count">0 / 50000</div>
   We inject a visual bar BEFORE the #char-count div. */
function initCharCounter() {
    var ta = document.getElementById('ws-input') || document.getElementById('landing-prompt');
    var countEl = document.getElementById('char-count');
    if (!ta || !countEl) return;

    var wrap = document.createElement('div');
    wrap.className = 'char-counter-wrap';

    var bar = document.createElement('div');
    bar.className = 'char-counter-bar';
    var fill = document.createElement('div');
    fill.className = 'char-counter-fill';
    bar.appendChild(fill);

    wrap.appendChild(bar);
    /* Insert the bar BEFORE the existing #char-count div */
    countEl.parentNode.insertBefore(wrap, countEl);

    var maxLen = ta.getAttribute('maxlength') || 50000;
    function update() {
        var len = ta.value.length;
        var pct = Math.min((len / maxLen) * 100, 100);
        fill.style.width = pct + '%';
        countEl.textContent = len + ' / ' + maxLen;
        fill.classList.remove('warn', 'danger');
        if (pct > 90)      fill.classList.add('danger');
        else if (pct > 70) fill.classList.add('warn');
    }

    ta.addEventListener('input', update);
    update(); /* Initial render */
}

/* ─────────────────────────────────────────────────────
   9. SMOOTH SECTION TRANSITIONS
   ─────────────────────────────────────────────────────
   Post-hook U.show to suppress transition flicker
   during section switch. */
function initSectionTransitions() {
    var _origShow = UI.show;
    UI.show = function(id) {
        /* Kill transitions on all sections during the switch */
        document.querySelectorAll('.section').forEach(function(s){
            s.classList.add('no-transition');
        });
        _origShow.call(UI, id);
        /* Re-enable after 2 animation frames */
        requestAnimationFrame(function(){
            requestAnimationFrame(function(){
                document.querySelectorAll('.section').forEach(function(s){
                    s.classList.remove('no-transition');
                });
            });
        });
    };
}

/* ─────────────────────────────────────────────────────
   10. KEYBOARD SHORTCUTS
   ───────────────────────────────────────────────────── */
function initShortcuts() {
    document.addEventListener('keydown', function(e){
        /* Ctrl/Cmd + Enter → Sniperise (fire the sniperise button) */
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            var btn = document.getElementById('sniperise-btn');
            if (btn && !btn.disabled) btn.click();
        }
        /* Escape → close burger menu */
        if (e.key === 'Escape') {
            var links = document.getElementById('nav-links');
            var burger = document.getElementById('nav-burger');
            if (links && links.classList.contains('open')) {
                links.classList.remove('open');
                if (burger) {
                    burger.textContent = '\u2630';
                    burger.setAttribute('aria-expanded', 'false');
                }
            }
        }
    });
}

// Initialize router — will be called in init() below
// initHashRouter(); // REMOVED: routing handled by app.js (PDM.App.router)

/* ─────────────────────────────────────────────────────
   INIT — run all polish modules
   ───────────────────────────────────────────────────── */
function init() {
    initReveal();
    initRipple();
    initTypingEffect();
    initNotifEnhance();
    initCopyFeedback();
    initCharCounter();
    initSectionTransitions();
    initShortcuts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
