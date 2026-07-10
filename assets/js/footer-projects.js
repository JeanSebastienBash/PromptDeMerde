/**
 * PromptDeMerde.com — footer-projects.js
 *
 * Synopsis : Carrousel des projets DreamProjectAI dans le footer.
 * Objectif : Permettre de parcourir les projets et accéder à une passerelle externe par projet.
 */
(function() {

var PROJECTS = [
    {
        id: 'commercify',
        badge: 'C2C',
        title: 'Commercify',
        tagline: 'Premi\u00e8re plateforme globale de petites annonces sur internet',
        url: 'https://commercify.online',
        cta: 'D\u00e9couvrir Commercify \u2192'
    },
    {
        id: 'promptdemerde',
        badge: 'PROMPT',
        title: 'PromptDeMerde',
        tagline: 'Dictez et transformez votre prompt en instructions claires via Ollama',
        url: 'https://github.com/JeanSebastienBash/promptdemerde',
        cta: 'Voir le d\u00e9p\u00f4t GitHub \u2192'
    },
    {
        id: 'genericvoice',
        badge: 'TTS',
        title: 'GenericVoice',
        tagline: 'Text to speech unifi\u00e9 \u2014 Edge, eSpeak, Piper',
        url: 'https://github.com/JeanSebastienBash/GenericVoice',
        cta: 'Voir le projet GenericVoice \u2192'
    }
];

var root = null;
var viewport = null;
var badgeEl = null;
var titleEl = null;
var taglineEl = null;
var ctaEl = null;
var dotsEl = null;
var prevBtn = null;
var nextBtn = null;
var index = 0;

function renderSlide(i) {
    var project = PROJECTS[i];
    if (!project || !viewport) return;

    index = i;
    badgeEl.textContent = project.badge;
    titleEl.textContent = project.title;
    taglineEl.textContent = project.tagline;
    ctaEl.textContent = project.cta;
    ctaEl.href = project.url;

    viewport.classList.remove('dp-projects-viewport--changing');
    void viewport.offsetWidth;
    viewport.classList.add('dp-projects-viewport--changing');
    window.setTimeout(function() {
        viewport.classList.remove('dp-projects-viewport--changing');
    }, 220);

    var dots = dotsEl.querySelectorAll('.dp-projects-dot');
    for (var d = 0; d < dots.length; d++) {
        var active = d === i;
        dots[d].classList.toggle('is-active', active);
        dots[d].setAttribute('aria-selected', active ? 'true' : 'false');
        dots[d].tabIndex = active ? 0 : -1;
    }

    prevBtn.disabled = PROJECTS.length <= 1;
    nextBtn.disabled = PROJECTS.length <= 1;
}

function step(delta) {
    if (!PROJECTS.length) return;
    var next = (index + delta + PROJECTS.length) % PROJECTS.length;
    renderSlide(next);
}

function buildDots() {
    dotsEl.innerHTML = '';
    for (var i = 0; i < PROJECTS.length; i++) {
        (function(idx) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'dp-projects-dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', PROJECTS[idx].title);
            dot.addEventListener('click', function() { renderSlide(idx); });
            dotsEl.appendChild(dot);
        })(i);
    }
}

function onKeydown(event) {
    if (!root || !root.contains(document.activeElement)) return;
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
    }
}

function init() {
    root = document.getElementById('footer-projects');
    if (!root || !PROJECTS.length) return;

    viewport = document.getElementById('footer-projects-viewport');
    badgeEl = document.getElementById('footer-projects-badge');
    titleEl = document.getElementById('footer-projects-title');
    taglineEl = document.getElementById('footer-projects-tagline');
    ctaEl = document.getElementById('footer-projects-cta');
    dotsEl = document.getElementById('footer-projects-dots');
    prevBtn = document.getElementById('footer-projects-prev');
    nextBtn = document.getElementById('footer-projects-next');

    buildDots();
    renderSlide(0);

    prevBtn.addEventListener('click', function() { step(-1); });
    nextBtn.addEventListener('click', function() { step(1); });
    root.addEventListener('keydown', onKeydown);
}

window.PDM = window.PDM || {};
window.PDM.FooterProjects = { init: init, getProjects: function() { return PROJECTS.slice(); } };

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
