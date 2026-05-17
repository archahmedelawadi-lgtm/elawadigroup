(function () {
    document.documentElement.classList.add('elawadi-loader-booting');

    var endpoints = ['api/content', 'data/content.json'];
    var fallback = {
        logo: '/uploads/20260510053602148083.png',
        backgroundColor: '#0D0D0D',
        logoSize: 120,
        animationSpeed: 1.2,
        backgroundDelay: 0,
        backgroundDisplayDuration: 900,
        logoDelay: 0,
        displayDuration: 900,
        fadeDuration: 650,
        glowIntensity: 'medium',
        glowColor: '#C9A13A',
        glowSize: 58,
        glowOpacity: 0.24,
        loadingTextEffect: 'shine',
        loadingTextAr: 'جاري التحميل',
        loadingTextEn: 'Loading',
        animationEffect: 'pulse',
        showLogo: true,
        enableAnimation: true
    };

    function cleanUrl(value) {
        var raw = String(value || '').trim();
        if (!raw) return '';
        if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw) || raw.charAt(0) === '/') return raw;
        return raw.replace(/^\.?\//, '');
    }

    function readContent() {
        var params = new URLSearchParams(window.location.search || '');
        var storageKeys = params.get('adminPreview') === '1'
            ? ['adminLivePreviewDraft', 'siteContentCache', 'elawadiBrandingCache']
            : ['siteContentCache', 'elawadiBrandingCache'];

        for (var keyIndex = 0; keyIndex < storageKeys.length; keyIndex += 1) {
            try {
                var cached = localStorage.getItem(storageKeys[keyIndex]);
                if (!cached) continue;
                var parsed = JSON.parse(cached);
                if (parsed && parsed.loaderSettings) return parsed;
            } catch (error) {}
        }

        for (var i = 0; i < endpoints.length; i += 1) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', endpoints[i] + (endpoints[i].indexOf('?') > -1 ? '&' : '?') + 'boot=' + Date.now(), false);
                xhr.setRequestHeader('Cache-Control', 'no-cache');
                xhr.send(null);
                if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                    return JSON.parse(xhr.responseText);
                }
            } catch (error) {}
        }
        return {};
    }

    function normalize(content) {
        var loader = content.loaderSettings || {};
        var branding = content.branding || {};
        var size = Math.min(220, Math.max(60, Number(loader.logoSize) || fallback.logoSize));
        var speed = Math.min(2.5, Math.max(0.5, Number(loader.animationSpeed) || fallback.animationSpeed));
        var bgDelay = Math.min(1500, Math.max(0, Number(loader.backgroundDelay) || fallback.backgroundDelay));
        var bgDisplay = Math.min(5000, Math.max(300, Number(loader.backgroundDisplayDuration) || fallback.backgroundDisplayDuration));
        var delay = Math.min(1500, Math.max(0, Number(loader.logoDelay) || fallback.logoDelay));
        var display = Math.min(5000, Math.max(300, Number(loader.displayDuration) || fallback.displayDuration));
        var fade = Math.min(1800, Math.max(250, Number(loader.fadeDuration) || fallback.fadeDuration));
        var glowColor = /^#[0-9a-f]{6}$/i.test(String(loader.glowColor || '')) ? loader.glowColor : fallback.glowColor;
        var glowSize = Math.min(120, Math.max(20, Number(loader.glowSize) || fallback.glowSize));
        var rawGlowOpacity = Number(loader.glowOpacity);
        var glowOpacity = Number.isFinite(rawGlowOpacity) ? Math.min(0.9, Math.max(0, rawGlowOpacity)) : fallback.glowOpacity;
        var glowMap = {
            none: 'none',
            soft: '0 0 24px rgba(201, 161, 58, 0.28)',
            medium: '0 0 46px rgba(201, 161, 58, 0.48)',
            strong: '0 0 76px rgba(201, 161, 58, 0.72)'
        };
        var effect = ['pulse', 'float', 'rotate', 'none'].indexOf(loader.animationEffect) > -1 ? loader.animationEffect : fallback.animationEffect;
        var textEffect = ['shine', 'dots', 'pulse', 'none'].indexOf(loader.loadingTextEffect) > -1 ? loader.loadingTextEffect : fallback.loadingTextEffect;
        var loadingTextAr = String(loader.loadingTextAr || loader.loadingText || fallback.loadingTextAr);
        var loadingTextEn = String(loader.loadingTextEn || loader.loadingText || fallback.loadingTextEn);
        var glow = glowMap[loader.glowIntensity] || glowMap.medium;
        return {
            logo: cleanUrl(loader.logo || loader.loadingLogo || fallback.logo),
            backgroundColor: /^#[0-9a-f]{6}$/i.test(String(loader.backgroundColor || '')) ? loader.backgroundColor : fallback.backgroundColor,
            logoSize: size,
            backgroundDelay: bgDelay,
            backgroundDisplayDuration: bgDisplay,
            logoDelay: delay,
            displayDuration: display,
            fadeDuration: fade,
            duration: Math.max(0.6, 1.8 / speed),
            glow: glow,
            glowColor: glowColor,
            glowSize: glowSize,
            glowOpacity: glowOpacity,
            effect: effect,
            loadingTextEffect: textEffect,
            loadingTextAr: loadingTextAr,
            loadingTextEn: loadingTextEn,
            showLogo: loader.showLogo !== false,
            enableAnimation: loader.enableAnimation !== false
        };
    }

    function cssUrl(url) {
        return String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function cssContent(value) {
        return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function getPageLang() {
        var lang = document.documentElement.getAttribute('lang') || '';
        if (lang.toLowerCase().indexOf('en') === 0) return 'en';
        return (location.pathname || '').toLowerCase().indexOf('-en.html') > -1 ? 'en' : 'ar';
    }

    function hexToRgb(value) {
        var clean = String(value || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(clean)) return '201,161,58';
        return [
            parseInt(clean.slice(0, 2), 16),
            parseInt(clean.slice(2, 4), 16),
            parseInt(clean.slice(4, 6), 16)
        ].join(',');
    }

    var preset = window.__elawadiLoaderBootSettings;
    var settings = preset && preset.noSyncFetch ? preset : normalize(readContent());
    settings.backgroundDelay = Math.min(1500, Math.max(0, Number(settings.backgroundDelay) || fallback.backgroundDelay));
    settings.backgroundDisplayDuration = Math.min(5000, Math.max(300, Number(settings.backgroundDisplayDuration) || fallback.backgroundDisplayDuration));
    settings.logoDelay = Math.min(1500, Math.max(0, Number(settings.logoDelay) || fallback.logoDelay));
    settings.displayDuration = Math.min(5000, Math.max(300, Number(settings.displayDuration) || fallback.displayDuration));
    settings.fadeDuration = Math.min(1800, Math.max(250, Number(settings.fadeDuration) || fallback.fadeDuration));
    settings.glowColor = /^#[0-9a-f]{6}$/i.test(String(settings.glowColor || '')) ? settings.glowColor : fallback.glowColor;
    settings.glowSize = Math.min(120, Math.max(20, Number(settings.glowSize) || fallback.glowSize));
    var rawSettingsGlowOpacity = Number(settings.glowOpacity);
    settings.glowOpacity = Number.isFinite(rawSettingsGlowOpacity) ? Math.min(0.9, Math.max(0, rawSettingsGlowOpacity)) : fallback.glowOpacity;
    settings.loadingTextEffect = ['shine', 'dots', 'pulse', 'none'].indexOf(settings.loadingTextEffect) > -1 ? settings.loadingTextEffect : fallback.loadingTextEffect;
    settings.loadingTextAr = String(settings.loadingTextAr || settings.loadingText || fallback.loadingTextAr);
    settings.loadingTextEn = String(settings.loadingTextEn || settings.loadingText || fallback.loadingTextEn);
    settings.loadingText = getPageLang() === 'en' ? settings.loadingTextEn : settings.loadingTextAr;
    window.__elawadiLoaderBootSettings = settings;

    if (settings.logo) {
        try {
            var preload = document.createElement('link');
            preload.rel = 'preload';
            preload.as = 'image';
            preload.href = settings.logo;
            preload.fetchPriority = 'high';
            document.head.appendChild(preload);
        } catch (error) {}
    }

    var style = document.createElement('style');
    style.id = 'elawadi-loader-boot-style';
    style.textContent = [
        ':root{',
        '--elawadi-loader-logo:url("' + cssUrl(settings.logo) + '");',
        '--elawadi-loader-bg:' + settings.backgroundColor + ';',
        '--elawadi-loader-size:' + settings.logoSize + 'px;',
        '--elawadi-loader-duration:' + settings.duration + 's;',
        '--elawadi-loader-bg-delay:' + settings.backgroundDelay + 'ms;',
        '--elawadi-loader-bg-display:' + settings.backgroundDisplayDuration + 'ms;',
        '--elawadi-loader-logo-delay:' + settings.logoDelay + 'ms;',
        '--elawadi-loader-display:' + settings.displayDuration + 'ms;',
        '--elawadi-loader-fade:' + settings.fadeDuration + 'ms;',
        '--elawadi-loader-glow:' + settings.glow + ';',
        '--elawadi-loader-glow-color:' + settings.glowColor + ';',
        '--elawadi-loader-glow-size:' + settings.glowSize + '%;',
        '--elawadi-loader-glow-inset:-' + settings.glowSize + '%;',
        '--elawadi-loader-glow-opacity:' + settings.glowOpacity + ';',
        '}',
        '.loader,#loader,#project-loader{position:fixed!important;inset:0!important;z-index:2147483500!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--elawadi-loader-bg,#0D0D0D)!important;opacity:1;visibility:visible;pointer-events:auto;}',
        '.loader.hidden,#loader.hidden,#project-loader.hidden{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}',
        '.loader-content{text-align:center;position:relative;opacity:0;animation:elawadiLoaderContentIn .38s ease var(--elawadi-loader-logo-delay,0ms) forwards;}',
        '.loader-bar{width:220px;height:3px;margin:34px auto 0;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;}',
        '.loader-progress{height:100%;width:42%;border-radius:inherit;background:linear-gradient(90deg,transparent,#C9A13A,transparent);animation:elawadiLoaderProgress 1.2s ease-in-out infinite;}',
        '.loader-label{display:none;margin:0;color:#C9A13A;font-size:0;line-height:1;text-transform:uppercase;letter-spacing:.36em;font-weight:500;}',
        '.loader-label::before{content:"' + cssContent(settings.loadingText) + '";font-size:13px;}',
        '.loader-logo,.loader-ring{position:relative;width:var(--elawadi-loader-size,120px)!important;height:var(--elawadi-loader-size,120px)!important;display:' + (settings.showLogo ? 'inline-flex' : 'none') + '!important;align-items:center;justify-content:center;background-image:var(--elawadi-loader-logo)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;filter:' + (settings.glow === 'none' ? 'none' : 'drop-shadow(' + settings.glow + ')') + '!important;}',
        '.loader-logo::before,.loader-ring::before{content:"";position:absolute;inset:var(--elawadi-loader-glow-inset,-58%);z-index:-1;border-radius:999px;background:radial-gradient(circle,var(--elawadi-loader-glow-color,#C9A13A),transparent 66%);opacity:var(--elawadi-loader-glow-opacity,.24);pointer-events:none;filter:blur(8px);}',
        '.loader-logo>img,.loader-ring>img,.loader-img[data-loader-placeholder="true"],.loader-logo>i,.loader-logo>.logo-icon{opacity:0!important;}',
        'html.elawadi-courses-logo-first .loader,html.elawadi-courses-logo-first #loader{background:transparent!important;z-index:2147483700!important;}',
        'html.elawadi-courses-logo-first .loader .loader-logo,html.elawadi-courses-logo-first #loader .loader-logo{opacity:1!important;}',
        'html.elawadi-courses-logo-first .loader-logo{background-image:var(--elawadi-loader-logo)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;filter:' + (settings.glow === 'none' ? 'none' : 'drop-shadow(' + settings.glow + ')') + '!important;will-change:opacity,transform;backface-visibility:hidden;transform:translateZ(0) scale(1);animation:elawadiLoaderPulse var(--elawadi-loader-duration,1.5s) ease-in-out infinite!important;}',
        'html.elawadi-courses-logo-first .loader-logo>img{display:block!important;visibility:hidden!important;opacity:0!important;width:100%!important;height:100%!important;object-fit:contain!important;border-radius:inherit!important;filter:none!important;animation:none!important;}',
        'html.elawadi-courses-logo-first .loader-bar{width:260px!important;height:1px!important;margin:32px auto 0!important;background:linear-gradient(90deg,transparent,rgba(201,161,58,.76),transparent)!important;overflow:visible!important;}',
        'html.elawadi-courses-logo-first .loader-progress{display:none!important;animation:none!important;}',
        'html.elawadi-courses-logo-first .loader-label{display:block!important;margin-top:24px!important;}',
        settings.loadingTextEffect === 'shine' ? 'html.elawadi-courses-logo-first .loader-label::before{background:linear-gradient(90deg,#C9A13A,#fff3bf,#C9A13A);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:elawadiLoadingShine 1.6s ease-in-out infinite!important;}' : '',
        settings.loadingTextEffect === 'dots' ? 'html.elawadi-courses-logo-first .loader-label::after{content:"";font-size:13px;animation:elawadiLoadingDots 1.2s steps(4,end) infinite;}' : '',
        settings.loadingTextEffect === 'pulse' ? 'html.elawadi-courses-logo-first .loader-label{animation:elawadiLoadingPulse 1.15s ease-in-out infinite!important;}' : '',
        'html.elawadi-courses-logo-first .loader,html.elawadi-courses-logo-first #loader{transition:opacity var(--elawadi-loader-fade,650ms) ease,visibility var(--elawadi-loader-fade,650ms) ease!important;will-change:opacity;transform:translateZ(0);}',
        'html.elawadi-courses-logo-first.elawadi-loader-bg-finished body > :not(#loader){visibility:visible!important;}',
        'html.elawadi-loader-booting::before{content:"";position:fixed;inset:0;z-index:2147483600;background:var(--elawadi-loader-bg,#0D0D0D);opacity:1;visibility:visible;transition:opacity var(--elawadi-loader-fade,650ms) ease,visibility var(--elawadi-loader-fade,650ms) ease;will-change:opacity;transform:translateZ(0);}',
        'html.elawadi-courses-logo-first.elawadi-loader-booting::before{background:var(--elawadi-loader-bg,#0D0D0D);opacity:0;animation:elawadiCoursesBgIn var(--elawadi-loader-fade,650ms) ease var(--elawadi-loader-bg-delay,0ms) forwards;}',
        'html.elawadi-loader-bg-finished::before{opacity:0!important;visibility:hidden!important;}',
        'html.elawadi-loader-booting::after{content:none!important;}',
        'html.elawadi-courses-logo-first.elawadi-loader-booting::after{content:none!important;}',
        'html.elawadi-loader-booting.elawadi-loader-bg-finished::before{opacity:0;visibility:hidden;}',
        settings.enableAnimation && settings.effect !== 'none' ? 'html:not(.elawadi-courses-logo-first) .loader-logo,html:not(.elawadi-courses-logo-first) .loader-ring{animation:elawadiLoader' + settings.effect.charAt(0).toUpperCase() + settings.effect.slice(1) + ' var(--elawadi-loader-duration,1.5s) ease-in-out infinite!important;}' : '.loader-logo,.loader-ring{animation:none!important;}',
        '@keyframes elawadiLoaderPulse{0%,100%{transform:translateZ(0) scale(1);opacity:1}50%{transform:translateZ(0) scale(1.08);opacity:.86}}',
        '@keyframes elawadiLoaderFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}',
        '@keyframes elawadiLoaderRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@keyframes elawadiLoaderProgress{0%{transform:translateX(130%)}100%{transform:translateX(-260%)}}',
        '@keyframes elawadiLoaderContentIn{from{opacity:0;transform:translate3d(0,8px,0) scale(.98)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}',
        '@keyframes elawadiLoadingShine{0%{background-position:120% 0}100%{background-position:-120% 0}}',
        '@keyframes elawadiLoadingDots{0%{content:""}25%{content:"."}50%{content:".."}75%,100%{content:"..."}}',
        '@keyframes elawadiLoadingPulse{0%,100%{opacity:.62}50%{opacity:1}}',
        '@keyframes elawadiCoursesBgIn{from{opacity:0}to{opacity:1}}',
        '@keyframes elawadiCoursesLogoIn{from{opacity:0}to{opacity:1}}'
    ].join('');
    document.head.appendChild(style);
})();
