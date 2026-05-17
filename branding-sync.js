(function () {
    const CACHE_KEY = 'elawadiBrandingCache';
    const CONTENT_ENDPOINTS = ['api/content', 'data/content.json'];
    const DEFAULT_LOADER_VISIBLE_MS = 900;
    const loaderStartedAt = Date.now();
    let loaderLifecycleStarted = false;

    function normalizeAssetUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
        if (raw.startsWith('/')) return raw;
        return raw.replace(/^\.?\//, '');
    }

    function getPageLang() {
        const htmlLang = document.documentElement.getAttribute('lang');
        if (htmlLang) return htmlLang.toLowerCase().startsWith('en') ? 'en' : 'ar';
        return (location.pathname || '').toLowerCase().includes('-en.html') ? 'en' : 'ar';
    }

    function setLogoImage(target, logoUrl) {
        if (!target || !logoUrl) return;

        if (target.tagName && target.tagName.toLowerCase() === 'img') {
            target.src = logoUrl;
            target.alt = target.alt || 'Logo';
            return;
        }

        const existingImg = target.querySelector && target.querySelector('img');
        if (existingImg) {
            existingImg.src = logoUrl;
            existingImg.alt = existingImg.alt || 'Logo';
            return;
        }

        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = 'Logo';
        img.className = target.classList.contains('loader-logo') ? 'loader-img' : 'nav-logo-img';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = 'inherit';
        target.textContent = '';
        target.appendChild(img);
    }

    function readCachedContent() {
        const isAdminPreview = new URLSearchParams(window.location.search).get('adminPreview') === '1';
        const keys = isAdminPreview
            ? ['adminLivePreviewDraft', 'siteContentCache', CACHE_KEY]
            : ['siteContentCache', CACHE_KEY];
        for (const key of keys) {
            try {
                const cached = localStorage.getItem(key);
                if (!cached) continue;
                const parsed = JSON.parse(cached);
                if (parsed && parsed.branding) return parsed;
            } catch (error) {}
        }
        return null;
    }

    function upsertIcon(rel, href) {
        if (!href) return;
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
        }
        link.href = href;
    }

    function hexToRgb(value) {
        const clean = String(value || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(clean)) return '201,161,58';
        return [
            parseInt(clean.slice(0, 2), 16),
            parseInt(clean.slice(2, 4), 16),
            parseInt(clean.slice(4, 6), 16)
        ].join(',');
    }

    function normalizeLoaderSettings(settings = {}) {
        const logoSize = Math.min(220, Math.max(60, Number(settings.logoSize) || 120));
        const speed = Math.min(2.5, Math.max(0.5, Number(settings.animationSpeed) || 1.2));
        const backgroundDelay = Math.min(1500, Math.max(0, Number(settings.backgroundDelay) || 0));
        const backgroundDisplayDuration = Math.min(5000, Math.max(300, Number(settings.backgroundDisplayDuration) || DEFAULT_LOADER_VISIBLE_MS));
        const logoDelay = Math.min(1500, Math.max(0, Number(settings.logoDelay) || 0));
        const displayDuration = Math.min(5000, Math.max(300, Number(settings.displayDuration) || DEFAULT_LOADER_VISIBLE_MS));
        const fadeDuration = Math.min(1800, Math.max(250, Number(settings.fadeDuration) || 800));
        const glowColor = /^#[0-9a-f]{6}$/i.test(String(settings.glowColor || '')) ? settings.glowColor : '#C9A13A';
        const glowSize = Math.min(120, Math.max(20, Number(settings.glowSize) || 58));
        const rawGlowOpacity = Number(settings.glowOpacity);
        const glowOpacity = Number.isFinite(rawGlowOpacity) ? Math.min(0.9, Math.max(0, rawGlowOpacity)) : 0.24;
        return {
            logo: normalizeAssetUrl(settings.logo || settings.loadingLogo || ''),
            backgroundColor: /^#[0-9a-f]{6}$/i.test(String(settings.backgroundColor || '')) ? settings.backgroundColor : '#0D0D0D',
            logoSize,
            speed,
            backgroundDelay,
            backgroundDisplayDuration,
            logoDelay,
            displayDuration,
            fadeDuration,
            glowColor,
            glowSize,
            glowOpacity,
            glowIntensity: ['none', 'soft', 'medium', 'strong'].includes(settings.glowIntensity) ? settings.glowIntensity : 'medium',
            animationEffect: ['pulse', 'float', 'rotate', 'none'].includes(settings.animationEffect) ? settings.animationEffect : 'pulse',
            loadingTextEffect: ['shine', 'dots', 'pulse', 'none'].includes(settings.loadingTextEffect) ? settings.loadingTextEffect : 'shine',
            loadingTextAr: String(settings.loadingTextAr || settings.loadingText || 'جاري التحميل'),
            loadingTextEn: String(settings.loadingTextEn || settings.loadingText || 'Loading'),
            showLogo: settings.showLogo !== false,
            enableAnimation: settings.enableAnimation !== false
        };
    }

    function ensureLoaderStyle() {
        if (document.getElementById('elawadi-loader-settings-style')) return;
        const style = document.createElement('style');
        style.id = 'elawadi-loader-settings-style';
        style.textContent = `
            @keyframes elawadiLoaderPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .86; } }
            @keyframes elawadiLoaderFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
            @keyframes elawadiLoaderRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .elawadi-managed-loader {
                position: fixed;
                inset: 0;
                z-index: 2147483000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }
            .elawadi-managed-loader.hidden {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
            .elawadi-managed-loader .loader-content {
                text-align: center;
                position: relative;
            }
            .elawadi-managed-loader .loader-logo {
                margin: 0 auto 34px;
                border-radius: 28px;
                position: relative;
            }
            .elawadi-managed-loader .loader-logo::before {
                content: "";
                position: absolute;
                inset: var(--elawadi-loader-glow-inset, -58%);
                z-index: -1;
                border-radius: 999px;
                background: radial-gradient(circle, var(--elawadi-loader-glow-color, #C9A13A), transparent 66%);
                opacity: var(--elawadi-loader-glow-opacity, .24);
                pointer-events: none;
                filter: blur(8px);
            }
            .elawadi-managed-loader .loader-bar {
                width: 220px;
                height: 3px;
                margin: 0 auto;
                border-radius: 999px;
                background: rgba(255,255,255,.08);
                overflow: hidden;
            }
            .elawadi-managed-loader .loader-progress {
                height: 100%;
                width: 42%;
                border-radius: inherit;
                background: linear-gradient(90deg, transparent, #C9A13A, transparent);
                animation: elawadiLoaderProgress 1.2s ease-in-out infinite;
            }
            @keyframes elawadiLoaderProgress {
                0% { transform: translateX(130%); }
                100% { transform: translateX(-260%); }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureUniversalLoader(content, revealLoader) {
        if (!document.body) return [];
        ensureLoaderStyle();

        let loaders = Array.from(document.querySelectorAll('.loader, #loader, #project-loader'));
        let createdLoader = false;
        if (!loaders.length) {
            const settings = normalizeLoaderSettings((content && content.loaderSettings) || {});
            const logoUrl = settings.logo;
            const loader = document.createElement('div');
            loader.id = 'loader';
            loader.className = 'loader elawadi-managed-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-logo">${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="loader-img">` : ''}</div>
                    <div class="loader-bar"><div class="loader-progress"></div></div>
                </div>
            `;
            document.body.prepend(loader);
            loaders = [loader];
            createdLoader = true;
        }

        loaders.forEach((loader) => {
            loader.classList.add('elawadi-managed-loader');
            if (revealLoader || createdLoader) {
                loader.classList.remove('hidden');
                loader.style.display = 'flex';
                loader.style.opacity = '1';
                loader.style.visibility = 'visible';
                loader.style.pointerEvents = 'auto';
            }
            if (!loader.querySelector('.loader-logo') && !loader.querySelector('.loader-ring')) {
                const contentBox = loader.querySelector('.loader-content') || loader;
                const logo = document.createElement('div');
                logo.className = 'loader-logo';
                contentBox.prepend(logo);
            }
            if (!loader.querySelector('.loader-bar')) {
                const contentBox = loader.querySelector('.loader-content') || loader;
                const bar = document.createElement('div');
                bar.className = 'loader-bar';
                bar.innerHTML = '<div class="loader-progress"></div>';
                contentBox.appendChild(bar);
            }
        });
        return loaders;
    }

    function scheduleLoaderHide(settings) {
        if (document.documentElement.classList.contains('elawadi-courses-logo-first') && window.__elawadiLoaderBootSettings?.fadeDuration) {
            settings.fadeDuration = window.__elawadiLoaderBootSettings.fadeDuration;
            settings.backgroundDelay = window.__elawadiLoaderBootSettings.backgroundDelay || settings.backgroundDelay;
            settings.backgroundDisplayDuration = window.__elawadiLoaderBootSettings.backgroundDisplayDuration || settings.backgroundDisplayDuration;
            settings.logoDelay = window.__elawadiLoaderBootSettings.logoDelay || settings.logoDelay;
            settings.displayDuration = window.__elawadiLoaderBootSettings.displayDuration || settings.displayDuration;
        }
        const elapsed = Date.now() - loaderStartedAt;
        const backgroundEnd = settings.backgroundDelay + settings.backgroundDisplayDuration;
        const logoEnd = settings.logoDelay + settings.displayDuration;
        const backgroundWait = Math.max(0, backgroundEnd - elapsed);
        const logoWait = Math.max(0, logoEnd - elapsed);
        const finalWait = Math.max(0, Math.max(backgroundEnd, logoEnd) - elapsed);
        window.clearTimeout(window.__elawadiLoaderHideTimer);
        window.clearTimeout(window.__elawadiLoaderBgHideTimer);
        window.clearTimeout(window.__elawadiLoaderCleanupTimer);
        document.documentElement.classList.remove('elawadi-loader-bg-finished');
        document.documentElement.classList.remove('elawadi-loader-finished');
        window.__elawadiLoaderBgHideTimer = window.setTimeout(() => {
            document.documentElement.classList.add('elawadi-loader-bg-finished');
        }, backgroundWait);
        window.__elawadiLoaderHideTimer = window.setTimeout(() => {
            document.documentElement.classList.add('elawadi-loader-finished');
            document.querySelectorAll('.elawadi-managed-loader').forEach((loader) => {
                loader.classList.add('hidden');
                window.setTimeout(() => {
                    loader.style.display = 'none';
                    loader.style.pointerEvents = 'none';
                }, settings.fadeDuration + 80);
            });
        }, logoWait);
        window.__elawadiLoaderCleanupTimer = window.setTimeout(() => {
            document.documentElement.classList.remove('elawadi-loader-booting');
            document.documentElement.classList.remove('elawadi-loader-finished');
            document.documentElement.classList.remove('elawadi-loader-bg-finished');
        }, finalWait + settings.fadeDuration + 140);
    }

    function applyLoaderSettings(content) {
        const isCourseLogoFirstPage = document.documentElement.classList.contains('elawadi-courses-logo-first');
        const hasLoaderSettings = !!(content && content.loaderSettings && typeof content.loaderSettings === 'object');
        const settings = normalizeLoaderSettings(hasLoaderSettings ? content.loaderSettings : {});
        const bootSettings = isCourseLogoFirstPage && !hasLoaderSettings ? window.__elawadiLoaderBootSettings : null;
        if (bootSettings) {
            settings.logo = normalizeAssetUrl(bootSettings.logo || settings.logo);
            settings.backgroundColor = /^#[0-9a-f]{6}$/i.test(String(bootSettings.backgroundColor || '')) ? bootSettings.backgroundColor : settings.backgroundColor;
            settings.logoSize = Math.min(220, Math.max(60, Number(bootSettings.logoSize) || settings.logoSize));
            settings.speed = Math.min(2.5, Math.max(0.5, Number(bootSettings.animationSpeed) || (bootSettings.duration ? 1.8 / Number(bootSettings.duration) : settings.speed)));
            settings.backgroundDelay = Math.min(1500, Math.max(0, Number(bootSettings.backgroundDelay) || settings.backgroundDelay));
            settings.backgroundDisplayDuration = Math.min(5000, Math.max(300, Number(bootSettings.backgroundDisplayDuration) || settings.backgroundDisplayDuration));
            settings.logoDelay = Math.min(1500, Math.max(0, Number(bootSettings.logoDelay) || settings.logoDelay));
            settings.displayDuration = Math.min(5000, Math.max(300, Number(bootSettings.displayDuration) || settings.displayDuration));
            settings.fadeDuration = Math.min(1800, Math.max(250, Number(bootSettings.fadeDuration) || settings.fadeDuration));
            settings.glowColor = /^#[0-9a-f]{6}$/i.test(String(bootSettings.glowColor || '')) ? bootSettings.glowColor : settings.glowColor;
            settings.glowSize = Math.min(120, Math.max(20, Number(bootSettings.glowSize) || settings.glowSize));
            const rawBootGlowOpacity = Number(bootSettings.glowOpacity);
            settings.glowOpacity = Number.isFinite(rawBootGlowOpacity) ? Math.min(0.9, Math.max(0, rawBootGlowOpacity)) : settings.glowOpacity;
            settings.glowIntensity = ['none', 'soft', 'medium', 'strong'].includes(bootSettings.glowIntensity) ? bootSettings.glowIntensity : settings.glowIntensity;
            settings.animationEffect = ['pulse', 'float', 'rotate', 'none'].includes(bootSettings.effect || bootSettings.animationEffect) ? (bootSettings.effect || bootSettings.animationEffect) : settings.animationEffect;
            settings.loadingTextEffect = ['shine', 'dots', 'pulse', 'none'].includes(bootSettings.loadingTextEffect) ? bootSettings.loadingTextEffect : settings.loadingTextEffect;
            settings.loadingTextAr = String(bootSettings.loadingTextAr || bootSettings.loadingText || settings.loadingTextAr);
            settings.loadingTextEn = String(bootSettings.loadingTextEn || bootSettings.loadingText || settings.loadingTextEn);
            settings.showLogo = bootSettings.showLogo !== false;
            settings.enableAnimation = bootSettings.enableAnimation !== false;
        }
        const glowRgb = hexToRgb(settings.glowColor);
        const glowMap = {
            none: 'none',
            soft: `0 0 ${Math.round(settings.glowSize * 0.42)}px rgba(${glowRgb}, ${Math.min(0.35, settings.glowOpacity)})`,
            medium: `0 0 ${Math.round(settings.glowSize * 0.8)}px rgba(${glowRgb}, ${Math.min(0.55, settings.glowOpacity + 0.18)})`,
            strong: `0 0 ${Math.round(settings.glowSize * 1.25)}px rgba(${glowRgb}, ${Math.min(0.82, settings.glowOpacity + 0.36)})`
        };
        const glow = glowMap[settings.glowIntensity] || glowMap.medium;
        const duration = `${Math.max(0.6, 1.8 / settings.speed)}s`;
        const loaderLogoUrl = settings.logo;
        const shouldRevealLoader = !loaderLifecycleStarted;
        loaderLifecycleStarted = true;
        ensureUniversalLoader(content, shouldRevealLoader);

        const root = document.documentElement.style;
        root.setProperty('--elawadi-loader-glow-color', settings.glowColor);
        root.setProperty('--elawadi-loader-glow-size', `${settings.glowSize}%`);
        root.setProperty('--elawadi-loader-glow-inset', `-${settings.glowSize}%`);
        root.setProperty('--elawadi-loader-glow-opacity', String(settings.glowOpacity));
        root.setProperty('--elawadi-loader-bg-delay', `${settings.backgroundDelay}ms`);
        root.setProperty('--elawadi-loader-logo-delay', `${settings.logoDelay}ms`);

        document.querySelectorAll('.loader, #loader, #project-loader').forEach((loader) => {
            loader.style.background = settings.backgroundColor;
            loader.style.transition = `opacity ${settings.fadeDuration}ms ease, visibility ${settings.fadeDuration}ms ease`;
            const contentBox = loader.querySelector('.loader-content');
            if (contentBox) {
                contentBox.style.animationDelay = `${settings.logoDelay}ms`;
            }
        });

        document.querySelectorAll('.loader-logo').forEach((logo) => {
            if (loaderLogoUrl && !logo.querySelector('img')) {
                logo.textContent = '';
                const img = document.createElement('img');
                img.src = loaderLogoUrl;
                img.alt = 'Loading Logo';
                img.className = 'loader-img';
                logo.appendChild(img);
            }
            logo.style.width = `${settings.logoSize}px`;
            logo.style.height = `${settings.logoSize}px`;
            logo.style.display = settings.showLogo ? 'inline-flex' : 'none';
            logo.style.alignItems = 'center';
            logo.style.justifyContent = 'center';
            logo.style.filter = glow === 'none' ? 'none' : `drop-shadow(${glow})`;
            if (isCourseLogoFirstPage) {
                logo.style.backgroundImage = loaderLogoUrl ? `url("${loaderLogoUrl.replace(/"/g, '\\"')}")` : '';
                logo.style.backgroundSize = 'contain';
                logo.style.backgroundRepeat = 'no-repeat';
                logo.style.backgroundPosition = 'center';
                logo.style.willChange = 'opacity, transform';
                logo.style.transform = 'translateZ(0) scale(1)';
                logo.style.animation = (!settings.enableAnimation || settings.animationEffect === 'none') ? 'none' : `elawadiLoader${settings.animationEffect[0].toUpperCase() + settings.animationEffect.slice(1)} ${duration} ease-in-out infinite`;
            } else {
                logo.style.willChange = 'opacity, transform';
                logo.style.transform = 'translateZ(0)';
                logo.style.animation = (!settings.enableAnimation || settings.animationEffect === 'none') ? 'none' : `elawadiLoader${settings.animationEffect[0].toUpperCase() + settings.animationEffect.slice(1)} ${duration} ease-in-out infinite`;
            }
        });

        document.querySelectorAll('.loader-img, .loader-logo img').forEach((img) => {
            if (loaderLogoUrl) {
                img.src = loaderLogoUrl;
                img.alt = img.alt || 'Loading Logo';
            }
            img.style.width = `${settings.logoSize}px`;
            img.style.height = `${settings.logoSize}px`;
            img.style.objectFit = 'contain';
            img.style.filter = glow === 'none' ? 'none' : `drop-shadow(${glow})`;
            if (isCourseLogoFirstPage) {
                img.style.visibility = 'hidden';
                img.style.opacity = '0';
                img.style.filter = 'none';
                img.style.animation = 'none';
            }
        });

        document.querySelectorAll('.loader-progress').forEach((bar) => {
            bar.style.animationDuration = `${Math.max(0.7, 2 / settings.speed)}s`;
        });

        const loadingText = getPageLang() === 'en' ? settings.loadingTextEn : settings.loadingTextAr;
        document.querySelectorAll('.loader-label').forEach((label) => {
            label.textContent = loadingText;
        });

        document.querySelectorAll('.loader-ring').forEach((ring) => {
            ring.style.width = `${settings.logoSize}px`;
            ring.style.height = `${settings.logoSize}px`;
            ring.style.display = settings.showLogo ? '' : 'none';
            ring.style.filter = glow === 'none' ? 'none' : `drop-shadow(${glow})`;
            ring.style.animationDuration = settings.enableAnimation ? duration : '0s';
        });

        if (document.readyState === 'complete') {
            scheduleLoaderHide(settings);
        } else {
            window.addEventListener('load', () => scheduleLoaderHide(settings), { once: true });
        }
    }

    function applyBranding(content, options = {}) {
        const branding = content && content.branding;
        if (!branding || typeof branding !== 'object') return;

        const logoUrl = normalizeAssetUrl(branding.logo);
        const faviconUrl = normalizeAssetUrl(branding.favicon || branding.logo);
        const lang = getPageLang();
        const langBranding = branding[lang] || {};

        if (langBranding.siteName) {
            document.querySelectorAll('.logo-text, .nav-logo-text, .footer-logo-text').forEach((el) => {
                el.textContent = langBranding.siteName;
            });
        }

        if (logoUrl) {
            document.querySelectorAll([
                'img.nav-logo-img',
                'img.logo-img',
                '.nav-logo > img',
                '.checkout-notice-nav .nav-logo > img',
                '.logo-icon-wrapper',
                '.nav-logo-icon',
                '.footer-logo-icon',
                '.logo-icon'
            ].join(',')).forEach((el) => setLogoImage(el, logoUrl));
        }

        if (faviconUrl) {
            upsertIcon('icon', faviconUrl);
            upsertIcon('shortcut icon', faviconUrl);
            upsertIcon('apple-touch-icon', faviconUrl);
        }

        if (!options.skipLoader) {
            applyLoaderSettings(content);
        }

        window.elawadiBranding = branding;
    }

    async function fetchContent() {
        for (const endpoint of CONTENT_ENDPOINTS) {
            try {
                const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
                if (!response.ok) continue;
                return await response.json();
            } catch (error) {}
        }
        return null;
    }

    async function syncBranding() {
        const cached = readCachedContent();
        if (cached) applyBranding(cached, { skipLoader: true });

        const content = await fetchContent();
        if (!content) return;
        applyBranding(content);
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(content));
        } catch (error) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncBranding);
    } else {
        syncBranding();
    }

    window.addEventListener('pageshow', syncBranding);
    window.addEventListener('storage', (event) => {
        if (['adminLivePreviewDraft', 'siteContentCache', CACHE_KEY].includes(event.key)) {
            const cached = readCachedContent();
            if (cached) applyBranding(cached);
        }
    });
})();
