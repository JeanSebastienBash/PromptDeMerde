/**
 * PromptDeMerde.com — ollama-missing-nudge.js
 * Synopsis : Nudge non bloquant si Ollama absent au boot (tous envs).
 * Objectif : Rappel disclaimer + liens install ; sortie rapide (× / Escape) ; 1× / session.
 */
(function() {
'use strict';

var SESSION_KEY = 'pdm_ollama_missing_nudge';
var AUTO_MS = 5000;
var MARK = 'assets/images/third-party/ollama-mark.png';
var URL_INSTALL = 'https://ollama.com/download';
var URL_MODELS = 'https://ollama.com/library';
var _el = null;
var _timer = null;
var _onKey = null;

function t(key) {
    var I = window.PDM && window.PDM.I18n;
    if (!I) return key;
    if (key === 'p1') return I.t('nudge.ollamaMissing.p1');
    if (key === 'p2') return I.t('nudge.ollamaMissing.p2');
    if (key === 'install') return I.t('nudge.ollamaMissing.install');
    if (key === 'models') return I.t('nudge.ollamaMissing.models');
    if (key === 'close') return I.t('nudge.ollamaMissing.close');
    return key;
}

function alreadyShown() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return true; }
}

function markShown() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
}

function clearTimer() {
    if (_timer) { clearTimeout(_timer); _timer = null; }
}

function dismiss() {
    clearTimer();
    if (_onKey) {
        document.removeEventListener('keydown', _onKey);
        _onKey = null;
    }
    if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
    _el = null;
}

function scheduleAuto() {
    clearTimer();
    _timer = setTimeout(dismiss, AUTO_MS);
}

function makeLink(href, label) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'ollama-nudge__link';
    a.textContent = label;
    return a;
}

function makeCloseBtn() {
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'ollama-nudge__close';
    close.setAttribute('aria-label', t('close'));
    close.textContent = '\u00d7';
    close.addEventListener('click', dismiss);
    return close;
}

function makeBody() {
    var body = document.createElement('div');
    body.className = 'ollama-nudge__body';
    var p1 = document.createElement('p');
    p1.className = 'ollama-nudge__p';
    p1.textContent = t('p1');
    var p2 = document.createElement('p');
    p2.className = 'ollama-nudge__p';
    p2.textContent = t('p2');
    var links = document.createElement('div');
    links.className = 'ollama-nudge__links';
    links.appendChild(makeLink(URL_INSTALL, t('install')));
    links.appendChild(makeLink(URL_MODELS, t('models')));
    body.appendChild(p1);
    body.appendChild(p2);
    body.appendChild(links);
    return body;
}

function buildCard() {
    var card = document.createElement('aside');
    card.id = 'ollama-missing-nudge';
    card.className = 'ollama-nudge';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    var row = document.createElement('div');
    row.className = 'ollama-nudge__row';
    var img = document.createElement('img');
    img.src = MARK;
    img.alt = 'Ollama';
    img.width = 32;
    img.height = 32;
    img.className = 'ollama-nudge__mark';
    img.decoding = 'async';
    row.appendChild(img);
    row.appendChild(makeBody());
    card.appendChild(makeCloseBtn());
    card.appendChild(row);
    card.addEventListener('mouseenter', clearTimer);
    card.addEventListener('mouseleave', scheduleAuto);
    return card;
}

function show() {
    if (_el || alreadyShown()) return;
    markShown();
    _el = buildCard();
    document.body.appendChild(_el);
    _onKey = function(ev) {
        if (ev.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', _onKey);
    scheduleAuto();
}

window.PDM = window.PDM || {};
window.PDM.OllamaMissingNudge = {
    maybeShow: function(result) {
        if (result && result.ok) return;
        show();
    }
};
})();
