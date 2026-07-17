/**
 * PromptDeMerde.com — footer-projects.js
 *
 * Synopsis : Carrousel auto des projets DreamProjectAI dans le footer.
 * Objectif : Défilement automatique (~2,8 s), navigation manuelle et passerelles externes.
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
        url: 'https://www.dreamproject.online/prj/promptdemerde/',
        cta: 'Voir la fiche projet \u2192'
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

function resolveProjects() {
    var I = window.PDM && window.PDM.I18n;
    var fromLocale = I && I.getFooterProjects ? I.getFooterProjects() : [];
    if (Array.isArray(fromLocale) && fromLocale.length) {
        return fromLocale.map(function(p, i) {
            var base = PROJECTS[i] || {};
            return {
                id: base.id || ('p' + i),
                badge: p.badge || base.badge || '',
                title: p.title || base.title || '',
                tagline: p.tagline || base.tagline || '',
                url: base.url || '#',
                cta: p.cta || base.cta || ''
            };
        });
    }
    return PROJECTS.slice();
}

function activeProjects() {
    return resolveProjects();
}

function refreshProjectsFromLocale() {
    var list = resolveProjects();
    PROJECTS.length = 0;
    for (var i = 0; i < list.length; i++) PROJECTS.push(list[i]);
}

var AUTOPLAY_MS = 2800;
var ANIM_EXIT_MS = 200;
var ANIM_ENTER_MS = 320;

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
var direction = 1;
var autoTimer = null;
var paused = false;
var animating = false;
var exitTimer = null;
var enterTimer = null;

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearAutoplay() {
    if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
    }
}

function startAutoplay() {
    clearAutoplay();
    if (prefersReducedMotion() || PROJECTS.length <= 1 || paused) return;
    autoTimer = setInterval(function() {
        direction = 1;
        step(1, true);
    }, AUTOPLAY_MS);
}

function resetAutoplay() {
    clearAutoplay();
    startAutoplay();
}

function pauseAutoplay() {
    paused = true;
    clearAutoplay();
}

function resumeAutoplay() {
    paused = false;
    startAutoplay();
}

function slideDirection(from, to) {
    var fwd = (to - from + PROJECTS.length) % PROJECTS.length;
    var bwd = (from - to + PROJECTS.length) % PROJECTS.length;
    return fwd <= bwd ? 1 : -1;
}

function updateDots(i) {
    var dots = dotsEl.querySelectorAll('.dp-projects-dot');
    for (var d = 0; d < dots.length; d++) {
        var active = d === i;
        dots[d].classList.toggle('is-active', active);
        dots[d].classList.toggle('dp-projects-dot--progress', active && !prefersReducedMotion());
        dots[d].setAttribute('aria-selected', active ? 'true' : 'false');
        dots[d].tabIndex = active ? 0 : -1;
        if (active && !prefersReducedMotion()) {
            dots[d].style.animation = 'none';
            void dots[d].offsetWidth;
            dots[d].style.animation = '';
        }
    }
}

function applySlideContent(project) {
    badgeEl.textContent = project.badge;
    titleEl.textContent = project.title;
    taglineEl.textContent = project.tagline;
    ctaEl.textContent = project.cta;
    ctaEl.href = project.url;
}

function cancelPendingAnim() {
    if (exitTimer) {
        clearTimeout(exitTimer);
        exitTimer = null;
    }
    if (enterTimer) {
        clearTimeout(enterTimer);
        enterTimer = null;
    }
    animating = false;
}

function clearViewportAnim() {
    viewport.classList.remove(
        'dp-projects-viewport--exit',
        'dp-projects-viewport--enter',
        'dp-projects-viewport--fwd',
        'dp-projects-viewport--bwd'
    );
}

function renderSlide(i, dir, instant) {
    var project = PROJECTS[i];
    if (!project || !viewport) return;

    if (typeof dir === 'number') direction = dir >= 0 ? 1 : -1;
    var dirClass = direction >= 0 ? 'dp-projects-viewport--fwd' : 'dp-projects-viewport--bwd';

    if (instant) {
        cancelPendingAnim();
        index = i;
        applySlideContent(project);
        clearViewportAnim();
        updateDots(i);
        prevBtn.disabled = PROJECTS.length <= 1;
        nextBtn.disabled = PROJECTS.length <= 1;
        return;
    }

    cancelPendingAnim();
    animating = true;
    clearViewportAnim();
    viewport.classList.add('dp-projects-viewport--exit', dirClass);

    exitTimer = window.setTimeout(function() {
        exitTimer = null;
        index = i;
        applySlideContent(project);
        viewport.classList.remove('dp-projects-viewport--exit');
        void viewport.offsetWidth;
        viewport.classList.add('dp-projects-viewport--enter', dirClass);

        enterTimer = window.setTimeout(function() {
            enterTimer = null;
            clearViewportAnim();
            animating = false;
        }, ANIM_ENTER_MS);
    }, ANIM_EXIT_MS);

    updateDots(i);
    prevBtn.disabled = PROJECTS.length <= 1;
    nextBtn.disabled = PROJECTS.length <= 1;
}

function step(delta, fromAutoplay) {
    if (!PROJECTS.length) return;
    if (!fromAutoplay) direction = delta >= 0 ? 1 : -1;
    var next = (index + delta + PROJECTS.length) % PROJECTS.length;
    renderSlide(next, direction);
    if (!fromAutoplay) resetAutoplay();
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
            dot.addEventListener('click', function() {
                if (idx === index) return;
                direction = slideDirection(index, idx);
                renderSlide(idx, direction);
                resetAutoplay();
            });
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

function refreshFromLocale() {
    if (!root || !viewport) return;
    refreshProjectsFromLocale();
    buildDots();
    index = Math.min(index, Math.max(PROJECTS.length - 1, 0));
    renderSlide(index, 1, true);
    resetAutoplay();
}

function init() {
    root = document.getElementById('footer-projects');
    refreshProjectsFromLocale();
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
    renderSlide(0, 1, true);

    prevBtn.addEventListener('click', function() { step(-1); });
    nextBtn.addEventListener('click', function() { step(1); });
    root.addEventListener('keydown', onKeydown);

    root.addEventListener('mouseenter', pauseAutoplay);
    root.addEventListener('mouseleave', resumeAutoplay);
    root.addEventListener('focusin', pauseAutoplay);
    root.addEventListener('focusout', function(event) {
        if (!root.contains(event.relatedTarget)) resumeAutoplay();
    });

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) pauseAutoplay();
        else resumeAutoplay();
    });

    startAutoplay();
}

document.addEventListener('pdm:localechange', refreshFromLocale);

window.PDM = window.PDM || {};
window.PDM.FooterProjects = {
    init: init,
    refresh: refreshFromLocale,
    getProjects: function() { return PROJECTS.slice(); }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
