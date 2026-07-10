/**
 * PromptDeMerde.com — polish-textarea-resize.js
 *
 * Synopsis : Poignée de redimensionnement custom pour les textarea.
 * Objectif : Une seule poignée visible, zone cliquable élargie (toute la surface).
 */
(function () {
    'use strict';

    var SELECTOR = '.ws-textarea, .output-text, .thinking-text, .form-textarea, .cfg-ta, .profile-prompt';
    var bound = new WeakSet();

    function parseLength(value, fallback) {
        var n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function getHeightLimits(textarea) {
        var cs = getComputedStyle(textarea);
        return {
            min: parseLength(cs.minHeight, 80),
            max: cs.maxHeight === 'none' ? Infinity : parseLength(cs.maxHeight, Infinity)
        };
    }

    function bindGrip(textarea, grip) {
        var limits = { min: 80, max: Infinity };
        var startY = 0;
        var startH = 0;
        var dragging = false;

        function stopDrag() {
            if (!dragging) return;
            dragging = false;
            grip.classList.remove('is-dragging');
            document.body.classList.remove('pdm-resize-dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onStop);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onStop);
            document.removeEventListener('touchcancel', onStop);
        }

        function applyHeight(next) {
            textarea.style.height = Math.min(limits.max, Math.max(limits.min, next)) + 'px';
        }

        function onMove(clientY) {
            applyHeight(startH + (clientY - startY));
        }

        function onTouchMove(e) {
            if (!dragging || !e.touches.length) return;
            e.preventDefault();
            onMove(e.touches[0].clientY);
        }

        function onStop() {
            stopDrag();
        }

        function beginDrag(clientY) {
            limits = getHeightLimits(textarea);
            startY = clientY;
            startH = textarea.getBoundingClientRect().height;
            dragging = true;
            grip.classList.add('is-dragging');
            document.body.classList.add('pdm-resize-dragging');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onStop);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onStop);
            document.addEventListener('touchcancel', onStop);
        }

        function onMouseMove(e) {
            if (!dragging) return;
            e.preventDefault();
            onMove(e.clientY);
        }

        grip.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            beginDrag(e.clientY);
        });

        grip.addEventListener('touchstart', function (e) {
            if (!e.touches.length) return;
            e.preventDefault();
            beginDrag(e.touches[0].clientY);
        }, { passive: false });
    }

    function ensureWrap(textarea) {
        var parent = textarea.parentElement;
        if (parent && parent.classList.contains('pdm-resize-wrap')) {
            return parent;
        }
        if (!parent) return null;

        var wrap = document.createElement('div');
        wrap.className = 'pdm-resize-wrap pdm-resize-host';
        parent.insertBefore(wrap, textarea);
        wrap.appendChild(textarea);
        return wrap;
    }

    function bindTextarea(textarea) {
        if (!textarea || bound.has(textarea)) return;
        if (textarea.dataset.pdmResize === 'off') return;

        var host = ensureWrap(textarea);
        if (!host) return;

        bound.add(textarea);
        textarea.classList.add('pdm-resize-target');

        if (host.querySelector(':scope > .pdm-resize-grip')) return;

        var grip = document.createElement('div');
        grip.className = 'pdm-resize-grip';
        grip.setAttribute('role', 'separator');
        grip.setAttribute('aria-orientation', 'horizontal');
        grip.setAttribute('aria-label', 'Redimensionner la zone de texte');
        if (textarea.id) grip.dataset.for = textarea.id;

        host.appendChild(grip);
        bindGrip(textarea, grip);
    }

    function scan(root) {
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(SELECTOR).forEach(bindTextarea);
    }

    function initObserver() {
        if (!('MutationObserver' in window)) return;
        var obs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches(SELECTOR)) bindTextarea(node);
                    if (node.querySelectorAll) scan(node);
                });
            });
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        scan(document);
        initObserver();
    }

    window.PDM = window.PDM || {};
    window.PDM.PolishTextareaResize = { scan: scan };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
