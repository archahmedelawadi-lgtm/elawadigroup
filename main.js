let siteContent = null;
window.siteContent = window.siteContent || null; // Make it global (don't overwrite if already set)
let currentLang = 'ar';
let lastContentUpdateToken = localStorage.getItem('contentUpdatedAt') || '';
const DEFAULT_CONTACT_PHONE = '+201002512669';
const DEFAULT_CONTACT_WHATSAPP = 'https://wa.me/201002512669';
const CONTENT_LIVE_SYNC_INTERVAL_MS = 2000;
const DESIGN_SYSTEM_VAR_MAP = {
    brand: {
        primary: '--color-primary',
        secondary: '--color-secondary',
        accent: '--color-accent',
        gold: '--color-gold',
        premiumHighlight: '--color-premium-highlight'
    },
    background: {
        mainBg: '--color-bg-main',
        sectionBg: '--color-bg-section',
        cardBg: '--color-bg-card',
        glassBg: '--color-bg-glass',
        heroOverlay: '--color-hero-overlay'
    },
    typography: {
        primaryText: '--color-text-primary',
        secondaryText: '--color-text-secondary',
        mutedText: '--color-text-muted',
        headingText: '--color-text-heading',
        lightText: '--color-text-light'
    },
    interactive: {
        buttonPrimary: '--color-btn-primary',
        buttonSecondary: '--color-btn-secondary',
        hover: '--color-hover',
        active: '--color-active',
        focusRing: '--color-focus-ring',
        linkColor: '--color-link'
    },
    hoverEffects: {
        projectHover: '--color-project-hover',
        cardHover: '--color-card-hover',
        buttonHover: '--color-btn-hover',
        navHover: '--color-nav-hover',
        imageHover: '--color-image-hover'
    },
    borders: {
        border: '--color-border',
        divider: '--color-divider',
        inputBorder: '--color-input-border',
        cardStroke: '--color-card-stroke',
        glowStroke: '--color-glow-stroke'
    },
    effects: {
        gradientStart: '--color-grad-start',
        gradientEnd: '--color-grad-end',
        shadowTint: '--color-shadow-tint',
        blurOverlay: '--color-blur-overlay',
        ambientLight: '--color-ambient-light'
    },
    siteCore: {
        primary: '--primary',
        secondary: '--secondary',
        accent: '--accent',
        accentDark: '--accent-dark',
        accentLight: '--accent-light',
        accentGlow: '--accent-glow',
        accentSubtle: '--accent-subtle',
        bgDark: '--bg-dark',
        bgDarkSecondary: '--bg-dark-secondary',
        bgCard: '--bg-card',
        bgCardHover: '--bg-card-hover',
        white: '--white',
        textLight: '--text-light',
        textMuted: '--text-muted',
        textDark: '--text-dark',
        textCream: '--text-cream',
        textGold: '--text-gold',
        borderSoft: '--border-soft',
        borderGold: '--border-gold',
        premiumBlue: '--premium-blue',
        premiumBlueDeep: '--premium-blue-deep',
        premiumShadow: '--premium-shadow',
        premiumOverlay: '--premium-overlay'
    }
};

function getColorEntryHex(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    if (typeof entry.hex === 'string') return entry.hex.trim();
    return '';
}

function getColorEntryCssValue(entry) {
    const hex = getColorEntryHex(entry);
    if (!hex) return '';
    const opacity = typeof entry === 'object' && entry.opacity !== undefined ? Number(entry.opacity) : 1;
    if (Number.isFinite(opacity) && opacity < 1 && hex.startsWith('#') && hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if ([r, g, b].every(Number.isFinite)) {
            return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
        }
    }
    return hex;
}

function getContentSavedAtNumber(content) {
    const raw = content && content._savedAt;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function applyDesignSystemFromContent(content = siteContent) {
    const colors = content?.designSystem?.colors;
    if (!colors || typeof colors !== 'object') return;

    const root = document.documentElement;
    const setVar = (cssVarName, value) => {
        if (!cssVarName || typeof value !== 'string') return;
        const normalized = value.trim();
        if (!normalized) return;
        root.style.setProperty(cssVarName, normalized);
    };
    const readColor = (cat, key) => getColorEntryCssValue(colors?.[cat]?.[key]);

    Object.keys(DESIGN_SYSTEM_VAR_MAP).forEach((cat) => {
        const categoryMap = DESIGN_SYSTEM_VAR_MAP[cat];
        Object.keys(categoryMap).forEach((key) => {
            const value = readColor(cat, key);
            if (value) setVar(categoryMap[key], value);
        });
    });

    const primary = readColor('siteCore', 'primary') || readColor('brand', 'primary');
    const secondary = readColor('siteCore', 'secondary') || readColor('brand', 'secondary');
    const accent = readColor('siteCore', 'accent') || readColor('brand', 'accent') || readColor('brand', 'gold');
    const accentLight = readColor('siteCore', 'accentLight') || readColor('brand', 'premiumHighlight');
    const accentDark = readColor('siteCore', 'accentDark') || readColor('interactive', 'hover');
    const mainBg = readColor('siteCore', 'bgDark') || readColor('background', 'mainBg');
    const sectionBg = readColor('siteCore', 'bgDarkSecondary') || readColor('background', 'sectionBg');
    const cardBg = readColor('siteCore', 'bgCard') || readColor('background', 'cardBg');
    const primaryText = readColor('siteCore', 'textDark') || readColor('typography', 'primaryText');
    const secondaryText = readColor('siteCore', 'textLight') || readColor('typography', 'secondaryText');
    const mutedText = readColor('siteCore', 'textMuted') || readColor('typography', 'mutedText');
    const focusRing = readColor('siteCore', 'accentGlow') || readColor('interactive', 'focusRing');
    const borderSoft = readColor('siteCore', 'borderSoft') || readColor('borders', 'border');

    setVar('--primary', primary);
    setVar('--secondary', secondary);
    setVar('--accent', accent);
    setVar('--accent-dark', accentDark || accent);
    setVar('--accent-light', accentLight || accent);
    setVar('--accent-glow', focusRing);
    setVar('--accent-subtle', borderSoft);

    setVar('--gold', accent);
    setVar('--gold-dark', accentDark || accent);
    setVar('--gold-light', accentLight || accent);
    setVar('--primary-dark', accentDark || accent);

    setVar('--bg-dark', mainBg);
    setVar('--bg-dark-secondary', sectionBg || mainBg);
    setVar('--bg-card', cardBg || secondary || mainBg);
    setVar('--bg-card-hover', cardBg || secondary || mainBg);

    setVar('--dark', mainBg);
    setVar('--dark-lighter', sectionBg || mainBg);
    setVar('--dark-light', cardBg || secondary || mainBg);

    setVar('--text-dark', primaryText);
    setVar('--text-light', secondaryText);
    setVar('--text-muted', mutedText);
    setVar('--text-gold', accent);

    setVar('--white', primaryText);
    setVar('--gray', secondaryText);
    setVar('--gray-light', mutedText);
}

function getUiEffectsSettings(content = siteContent) {
    const source = content?.uiEffects || {};
    const cards = source.cards || {};
    const featured = source.featured || {};
    const projectDisplaySource = source.projectDisplay || {};
    const sectionDefaults = {
        services: { enabled: true, theme: 'custom', cardRadiusPx: 24, gapPx: 18, cardLiftPx: 6, imageZoom: 1.05, shadowOpacity: 0.25 },
        projects: { enabled: true, theme: 'custom', cardRadiusPx: 24, gapPx: 18, cardLiftPx: 6, imageZoom: 1.05, shadowOpacity: 0.25 },
        featured: { enabled: true, theme: 'custom', cardRadiusPx: 24, gapPx: 18, cardLiftPx: 6, imageZoom: 1.05, shadowOpacity: 0.25 },
        courses: { enabled: true, theme: 'custom', cardRadiusPx: 22, gapPx: 18, cardLiftPx: 5, imageZoom: 1.04, shadowOpacity: 0.22 },
        blog: { enabled: true, theme: 'custom', cardRadiusPx: 22, gapPx: 18, cardLiftPx: 5, imageZoom: 1.04, shadowOpacity: 0.22 },
        about: { enabled: true, theme: 'custom', cardRadiusPx: 22, gapPx: 18, cardLiftPx: 5, imageZoom: 1.04, shadowOpacity: 0.20 },
        contact: { enabled: true, theme: 'custom', cardRadiusPx: 22, gapPx: 18, cardLiftPx: 5, imageZoom: 1.02, shadowOpacity: 0.18 },
        gallery: { enabled: true, theme: 'custom', cardRadiusPx: 26, gapPx: 18, cardLiftPx: 5, imageZoom: 1.04, shadowOpacity: 0.22 }
    };
    const asNumber = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    const normalizeSection = (key) => {
        const fallback = sectionDefaults[key];
        const value = source.sections?.[key] || {};
        return {
            enabled: value.enabled !== false,
            theme: ['custom', 'almimar', 'codex-premium'].includes(value.theme) ? value.theme : fallback.theme,
            cardRadiusPx: Math.min(44, Math.max(6, asNumber(value.cardRadiusPx, fallback.cardRadiusPx))),
            gapPx: Math.min(44, Math.max(6, asNumber(value.gapPx, fallback.gapPx))),
            cardLiftPx: Math.min(24, Math.max(0, asNumber(value.cardLiftPx, fallback.cardLiftPx))),
            imageZoom: Math.min(1.18, Math.max(1, asNumber(value.imageZoom, fallback.imageZoom))),
            shadowOpacity: Math.min(1, Math.max(0, asNumber(value.shadowOpacity, fallback.shadowOpacity)))
        };
    };
    const isHex = (value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());
    const projectDisplayDefaults = {
        theme: 'classic',
        enabledHome: false,
        enabledPortfolio: false,
        primaryCardColor: '#F6F3EC',
        backgroundColor: '#EFEAE1',
        textColor: '#1D1A16',
        accentColor: '#C4933A',
        radiusPx: 34,
        shadowOpacity: 0.22,
        hoverLiftPx: 8,
        imageZoom: 1.035,
        scrollSpeed: 1.15,
        cardSpacingPx: 28,
        overlapPx: 86,
        stickyTopPx: 112,
        grayscale: 0.78,
        buttonColor: '#1D1A16',
        buttonHoverColor: '#C4933A'
    };

    return {
        preset: ['elawadi-luxury', 'almimar-spaciaz', 'custom'].includes(source.preset) ? source.preset : 'elawadi-luxury',
        cards: {
            hoverEnabled: cards.hoverEnabled !== false,
            effectType: ['luxury-lift', 'gold-glow', 'soft-scale', 'image-focus', 'calm'].includes(cards.effectType) ? cards.effectType : 'luxury-lift',
            hoverLiftPx: Math.min(20, Math.max(0, asNumber(cards.hoverLiftPx, 6))),
            hoverScale: Math.min(1.12, Math.max(1, asNumber(cards.hoverScale, 1.02))),
            imageZoom: Math.min(1.2, Math.max(1, asNumber(cards.imageZoom, 1.05))),
            shadowOpacity: Math.min(1, Math.max(0, asNumber(cards.shadowOpacity, 0.25))),
            transitionMs: Math.min(1200, Math.max(120, asNumber(cards.transitionMs, 450)))
        },
        buttons: {
            hoverEnabled: source.buttons?.hoverEnabled !== false,
            effectType: ['gold-shine', 'glow-pulse', 'soft-lift', 'border-fill', 'press-depth', 'calm'].includes(source.buttons?.effectType) ? source.buttons.effectType : 'gold-shine',
            liftPx: Math.min(12, Math.max(0, asNumber(source.buttons?.liftPx, 3))),
            glowOpacity: Math.min(1, Math.max(0, asNumber(source.buttons?.glowOpacity, 0.35))),
            scale: Math.min(1.08, Math.max(1, asNumber(source.buttons?.scale, 1.02))),
            transitionMs: Math.min(900, Math.max(120, asNumber(source.buttons?.transitionMs, 320)))
        },
        featured: {
            showMiniGrid: featured.showMiniGrid !== false,
            showScrollGrid: featured.showScrollGrid !== false,
            cardRadiusPx: Math.min(40, Math.max(8, asNumber(featured.cardRadiusPx, 24))),
            gapPx: Math.min(40, Math.max(8, asNumber(featured.gapPx, 18))),
            cardLiftPx: Math.min(24, Math.max(0, asNumber(featured.cardLiftPx, 6)))
        },
        projectDisplay: {
            theme: ['classic', 'almimar-editorial'].includes(projectDisplaySource.theme) ? projectDisplaySource.theme : projectDisplayDefaults.theme,
            enabledHome: projectDisplaySource.enabledHome === true,
            enabledPortfolio: projectDisplaySource.enabledPortfolio === true,
            primaryCardColor: isHex(projectDisplaySource.primaryCardColor) ? projectDisplaySource.primaryCardColor : projectDisplayDefaults.primaryCardColor,
            backgroundColor: isHex(projectDisplaySource.backgroundColor) ? projectDisplaySource.backgroundColor : projectDisplayDefaults.backgroundColor,
            textColor: isHex(projectDisplaySource.textColor) ? projectDisplaySource.textColor : projectDisplayDefaults.textColor,
            accentColor: isHex(projectDisplaySource.accentColor) ? projectDisplaySource.accentColor : projectDisplayDefaults.accentColor,
            radiusPx: Math.min(56, Math.max(12, asNumber(projectDisplaySource.radiusPx, projectDisplayDefaults.radiusPx))),
            shadowOpacity: Math.min(0.65, Math.max(0, asNumber(projectDisplaySource.shadowOpacity, projectDisplayDefaults.shadowOpacity))),
            hoverLiftPx: Math.min(18, Math.max(0, asNumber(projectDisplaySource.hoverLiftPx, projectDisplayDefaults.hoverLiftPx))),
            imageZoom: Math.min(1.12, Math.max(1, asNumber(projectDisplaySource.imageZoom, projectDisplayDefaults.imageZoom))),
            scrollSpeed: Math.min(2, Math.max(0.4, asNumber(projectDisplaySource.scrollSpeed, projectDisplayDefaults.scrollSpeed))),
            cardSpacingPx: Math.min(72, Math.max(12, asNumber(projectDisplaySource.cardSpacingPx, projectDisplayDefaults.cardSpacingPx))),
            overlapPx: Math.min(180, Math.max(0, asNumber(projectDisplaySource.overlapPx, projectDisplayDefaults.overlapPx))),
            stickyTopPx: Math.min(220, Math.max(40, asNumber(projectDisplaySource.stickyTopPx, projectDisplayDefaults.stickyTopPx))),
            grayscale: Math.min(1, Math.max(0, asNumber(projectDisplaySource.grayscale, projectDisplayDefaults.grayscale))),
            buttonColor: isHex(projectDisplaySource.buttonColor) ? projectDisplaySource.buttonColor : projectDisplayDefaults.buttonColor,
            buttonHoverColor: isHex(projectDisplaySource.buttonHoverColor) ? projectDisplaySource.buttonHoverColor : projectDisplayDefaults.buttonHoverColor
        },
        sections: Object.fromEntries(Object.keys(sectionDefaults).map((key) => [key, normalizeSection(key)]))
    };
}

function ensureUiEffectsRuntimeStyle() {
    if (document.getElementById('ui-effects-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'ui-effects-runtime-style';
    style.textContent = `
        .service-card,.service-card-lux,.service-gallery-card,.project-main-card,.project-side-card,.project-grid-card,.portfolio-item,.project-mini-card,.scroll-project-card,.course-card,.blog-card,.team-card,.value-card,.timeline-card,.stat-card,.contact-info-card,.model-card,.gallery-stack-card,.hero-copy-card{transition-property:transform,box-shadow,border-color,background-color,filter,opacity!important;transition-duration:calc(var(--fx-card-transition-ms,450)*1ms)!important;transition-timing-function:cubic-bezier(.22,1,.36,1)!important;will-change:transform}
        .service-card,.service-card-lux,.service-gallery-card{border-radius:var(--fx-services-radius,24px)!important}.project-main-card,.project-side-card,.project-grid-card,.portfolio-item{border-radius:var(--fx-projects-radius,24px)!important}.project-mini-card,.scroll-project-card{border-radius:var(--fx-featured-radius,24px)!important}.course-card{border-radius:var(--fx-courses-radius,22px)!important}.blog-card{border-radius:var(--fx-blog-radius,22px)!important}.team-card,.value-card,.timeline-card,.stat-card{border-radius:var(--fx-about-radius,22px)!important}.contact-info-card{border-radius:var(--fx-contact-radius,22px)!important}.model-card,.gallery-stack-card,.hero-copy-card{border-radius:var(--fx-gallery-radius,26px)!important}
        .services-showcase,.services-gallery-grid,.services-grid{gap:var(--fx-services-gap,18px)!important}.projects-grid,.portfolio-grid,.project-grid{gap:var(--fx-projects-gap,18px)!important}.projects-mini-grid,.scroll-projects-grid{gap:var(--fx-featured-gap,18px)!important}.courses-grid{gap:var(--fx-courses-gap,18px)!important}.blog-grid,.blog-posts-grid{gap:var(--fx-blog-gap,18px)!important}.team-grid,.values-grid,.timeline-grid,.stats-grid{gap:var(--fx-about-gap,18px)!important}.contact-info-grid,.contact-grid{gap:var(--fx-contact-gap,18px)!important}
        .service-card:hover,.service-card-lux:hover,.service-gallery-card:hover{transform:translateY(calc(var(--fx-services-lift,6px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-services-shadow-opacity,.25))!important}
        .project-main-card:hover,.project-side-card:hover,.project-grid-card:hover,.portfolio-item:hover{transform:translateY(calc(var(--fx-projects-lift,6px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-projects-shadow-opacity,.25))!important}
        .project-mini-card:hover,.scroll-project-card:hover{transform:translateY(calc(var(--fx-featured-lift,var(--fx-featured-card-lift,6px))*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-featured-shadow-opacity,.25))!important}
        .course-card:hover{transform:translateY(calc(var(--fx-courses-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-courses-shadow-opacity,.22))!important}
        .blog-card:hover{transform:translateY(calc(var(--fx-blog-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-blog-shadow-opacity,.22))!important}
        .team-card:hover,.value-card:hover,.timeline-card:hover,.stat-card:hover{transform:translateY(calc(var(--fx-about-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-about-shadow-opacity,.20))!important}
        .contact-info-card:hover{transform:translateY(calc(var(--fx-contact-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-contact-shadow-opacity,.18))!important}
        .model-card:hover,.gallery-stack-card:hover,.hero-copy-card:hover{transform:translateY(calc(var(--fx-gallery-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-gallery-shadow-opacity,.22))!important}
        .service-card:hover img,.service-gallery-card:hover img,.service-card-lux:hover img{transform:scale(calc(1 + ((var(--fx-services-image-scale,1.05) - 1)*var(--fx-card-hover-enabled,1))))!important}.project-main-card:hover img,.project-side-card:hover img,.project-grid-card:hover img,.portfolio-item:hover img{transform:scale(calc(1 + ((var(--fx-projects-image-scale,1.05) - 1)*var(--fx-card-hover-enabled,1))))!important}.project-mini-card:hover img,.scroll-project-card:hover img{transform:scale(calc(1 + ((var(--fx-featured-image-scale,1.05) - 1)*var(--fx-card-hover-enabled,1))))!important}.course-card:hover img,.course-card:hover video{transform:scale(calc(1 + ((var(--fx-courses-image-scale,1.04) - 1)*var(--fx-card-hover-enabled,1))))!important}.blog-card:hover img{transform:scale(calc(1 + ((var(--fx-blog-image-scale,1.04) - 1)*var(--fx-card-hover-enabled,1))))!important}.team-card:hover img,.value-card:hover img,.timeline-card:hover img{transform:scale(calc(1 + ((var(--fx-about-image-scale,1.04) - 1)*var(--fx-card-hover-enabled,1))))!important}
        body[data-fx-section-services="0"] .service-card:hover,body[data-fx-section-services="0"] .service-card-lux:hover,body[data-fx-section-services="0"] .service-gallery-card:hover,body[data-fx-section-projects="0"] .project-main-card:hover,body[data-fx-section-projects="0"] .project-side-card:hover,body[data-fx-section-projects="0"] .project-grid-card:hover,body[data-fx-section-projects="0"] .portfolio-item:hover,body[data-fx-section-featured="0"] .project-mini-card:hover,body[data-fx-section-featured="0"] .scroll-project-card:hover,body[data-fx-section-courses="0"] .course-card:hover,body[data-fx-section-blog="0"] .blog-card:hover,body[data-fx-section-about="0"] .team-card:hover,body[data-fx-section-about="0"] .value-card:hover,body[data-fx-section-about="0"] .timeline-card:hover,body[data-fx-section-about="0"] .stat-card:hover,body[data-fx-section-contact="0"] .contact-info-card:hover,body[data-fx-section-gallery="0"] .model-card:hover,body[data-fx-section-gallery="0"] .gallery-stack-card:hover,body[data-fx-section-gallery="0"] .hero-copy-card:hover{transform:none!important;box-shadow:none!important}
        body[data-fx-card-effect="image-focus"] .service-card:hover,body[data-fx-card-effect="image-focus"] .service-card-lux:hover,body[data-fx-card-effect="image-focus"] .service-gallery-card:hover,body[data-fx-card-effect="image-focus"] .project-main-card:hover,body[data-fx-card-effect="image-focus"] .project-side-card:hover,body[data-fx-card-effect="image-focus"] .project-grid-card:hover,body[data-fx-card-effect="image-focus"] .portfolio-item:hover,body[data-fx-card-effect="image-focus"] .project-mini-card:hover,body[data-fx-card-effect="image-focus"] .scroll-project-card:hover,body[data-fx-card-effect="image-focus"] .course-card:hover,body[data-fx-card-effect="image-focus"] .blog-card:hover,body[data-fx-card-effect="image-focus"] .team-card:hover,body[data-fx-card-effect="image-focus"] .value-card:hover,body[data-fx-card-effect="image-focus"] .contact-info-card:hover{background:var(--bg-card)!important;border-color:color-mix(in srgb,var(--accent) 18%,var(--border))!important;box-shadow:0 10px 28px rgba(0,0,0,calc(var(--fx-card-shadow-opacity,.12)*.85))!important}
        body[data-fx-section-theme-services="almimar"] .service-card,body[data-fx-section-theme-services="almimar"] .service-card-lux,body[data-fx-section-theme-projects="almimar"] .portfolio-item,body[data-fx-section-theme-projects="almimar"] .project-main-card,body[data-fx-section-theme-featured="almimar"] .project-mini-card,body[data-fx-section-theme-featured="almimar"] .scroll-project-card,body[data-fx-section-theme-courses="almimar"] .course-card,body[data-fx-section-theme-blog="almimar"] .blog-card,body[data-fx-section-theme-about="almimar"] .team-card,body[data-fx-section-theme-contact="almimar"] .contact-info-card,body[data-fx-section-theme-gallery="almimar"] .model-card{border-color:color-mix(in srgb,var(--accent) 16%,var(--border))!important;box-shadow:0 10px 28px rgba(0,0,0,.12)!important}
        body[data-fx-section-theme-services="almimar"] .service-card img,body[data-fx-section-theme-projects="almimar"] .portfolio-item img,body[data-fx-section-theme-featured="almimar"] .project-mini-card img,body[data-fx-section-theme-courses="almimar"] .course-card img,body[data-fx-section-theme-blog="almimar"] .blog-card img{filter:grayscale(.25) contrast(1.04)!important}
        body[data-fx-section-theme-services="codex-premium"] .service-card:hover,body[data-fx-section-theme-services="codex-premium"] .service-card-lux:hover,body[data-fx-section-theme-projects="codex-premium"] .portfolio-item:hover,body[data-fx-section-theme-projects="codex-premium"] .project-main-card:hover,body[data-fx-section-theme-featured="codex-premium"] .project-mini-card:hover,body[data-fx-section-theme-featured="codex-premium"] .scroll-project-card:hover,body[data-fx-section-theme-courses="codex-premium"] .course-card:hover,body[data-fx-section-theme-blog="codex-premium"] .blog-card:hover,body[data-fx-section-theme-about="codex-premium"] .team-card:hover,body[data-fx-section-theme-contact="codex-premium"] .contact-info-card:hover,body[data-fx-section-theme-gallery="codex-premium"] .model-card:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--border))!important;box-shadow:0 24px 72px rgba(0,0,0,var(--fx-card-shadow-opacity,.34)),0 0 42px color-mix(in srgb,var(--accent) 32%,transparent)!important}
        [data-fx-card-section]{transition-property:transform,box-shadow,border-color,background-color,filter,opacity!important;transition-duration:calc(var(--fx-card-transition-ms,450)*1ms)!important;transition-timing-function:cubic-bezier(.22,1,.36,1)!important;will-change:transform}
        [data-fx-card-section="services"]{border-radius:var(--fx-services-radius,24px)!important}[data-fx-card-section="projects"]{border-radius:var(--fx-projects-radius,24px)!important}[data-fx-card-section="featured"]{border-radius:var(--fx-featured-radius,24px)!important}[data-fx-card-section="courses"]{border-radius:var(--fx-courses-radius,22px)!important}[data-fx-card-section="blog"]{border-radius:var(--fx-blog-radius,22px)!important}[data-fx-card-section="about"]{border-radius:var(--fx-about-radius,22px)!important}[data-fx-card-section="contact"]{border-radius:var(--fx-contact-radius,22px)!important}[data-fx-card-section="gallery"]{border-radius:var(--fx-gallery-radius,26px)!important}
        [data-fx-card-section="services"]:hover{transform:translateY(calc(var(--fx-services-lift,6px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-services-shadow-opacity,.25))!important}
        [data-fx-card-section="projects"]:hover{transform:translateY(calc(var(--fx-projects-lift,6px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-projects-shadow-opacity,.25))!important}
        [data-fx-card-section="featured"]:hover{transform:translateY(calc(var(--fx-featured-lift,var(--fx-featured-card-lift,6px))*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-featured-shadow-opacity,.25))!important}
        [data-fx-card-section="courses"]:hover{transform:translateY(calc(var(--fx-courses-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-courses-shadow-opacity,.22))!important}
        [data-fx-card-section="blog"]:hover{transform:translateY(calc(var(--fx-blog-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-blog-shadow-opacity,.22))!important}
        [data-fx-card-section="about"]:hover{transform:translateY(calc(var(--fx-about-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-about-shadow-opacity,.20))!important}
        [data-fx-card-section="contact"]:hover{transform:translateY(calc(var(--fx-contact-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-contact-shadow-opacity,.18))!important}
        [data-fx-card-section="gallery"]:hover{transform:translateY(calc(var(--fx-gallery-lift,5px)*-1*var(--fx-card-hover-enabled,1))) scale(calc(1 + ((var(--fx-card-hover-scale,1.02) - 1)*var(--fx-card-hover-enabled,1))))!important;box-shadow:0 18px 48px rgba(0,0,0,var(--fx-gallery-shadow-opacity,.22))!important}
        [data-fx-card-section="services"]:hover img,[data-fx-card-section="services"]:hover video{transform:scale(var(--fx-services-image-scale,1.05))!important}
        [data-fx-card-section="projects"]:hover img,[data-fx-card-section="projects"]:hover video{transform:scale(var(--fx-projects-image-scale,1.05))!important}
        [data-fx-card-section="featured"]:hover img,[data-fx-card-section="featured"]:hover video{transform:scale(var(--fx-featured-image-scale,1.05))!important}
        [data-fx-card-section="courses"]:hover img,[data-fx-card-section="courses"]:hover video{transform:scale(var(--fx-courses-image-scale,1.04))!important}
        [data-fx-card-section="blog"]:hover img,[data-fx-card-section="blog"]:hover video{transform:scale(var(--fx-blog-image-scale,1.04))!important}
        [data-fx-card-section="about"]:hover img,[data-fx-card-section="about"]:hover video{transform:scale(var(--fx-about-image-scale,1.04))!important}
        [data-fx-card-section="contact"]:hover img,[data-fx-card-section="contact"]:hover video{transform:scale(var(--fx-contact-image-scale,1.02))!important}
        [data-fx-card-section="gallery"]:hover img,[data-fx-card-section="gallery"]:hover video{transform:scale(var(--fx-gallery-image-scale,1.04))!important}
        [data-fx-disabled="1"]:hover{transform:none!important;box-shadow:none!important}
        [data-fx-section-theme="almimar"]{border-color:color-mix(in srgb,var(--accent) 16%,var(--border))!important;box-shadow:0 10px 28px rgba(0,0,0,.12)!important}
        [data-fx-section-theme="almimar"] img{filter:grayscale(.25) contrast(1.04)!important}
        [data-fx-section-theme="codex-premium"]:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--border))!important;box-shadow:0 24px 72px rgba(0,0,0,var(--fx-card-shadow-opacity,.34)),0 0 42px color-mix(in srgb,var(--accent) 32%,transparent)!important}
        body[data-fx-button-effect="soft-lift"] .btn:hover,body[data-fx-button-effect="soft-lift"] button:hover,body[data-fx-button-effect="soft-lift"] .submit-btn:hover,body[data-fx-button-effect="soft-lift"] .nav-cta:hover,body[data-fx-button-effect="soft-lift"] .btn-lux:hover,body[data-fx-button-effect="soft-lift"] .cta-button:hover{transform:translateY(calc(var(--fx-button-lift,1px)*-1)) scale(var(--fx-button-scale,1.01))!important;background:color-mix(in srgb,var(--accent) 82%,var(--bg-card))!important;box-shadow:0 10px 24px rgba(0,0,0,var(--fx-button-glow-opacity,.12))!important}
    `;
    document.head.appendChild(style);
}

function applyUiEffectsTargets(effects = getUiEffectsSettings()) {
    const sectionSelectors = {
        services: '.service-card, .service-card-lux, .service-gallery-card, .service-item, [class*="service"][class*="card"]',
        projects: '.project-main-card, .project-side-card, .project-grid-card, .portfolio-item, .project-card, [class*="portfolio"][class*="item"], [class*="project"][class*="card"]',
        featured: '.project-mini-card, .scroll-project-card, .featured-project-card, [class*="featured"][class*="card"]',
        courses: '.course-card, .course-item, [class*="course"][class*="card"]',
        blog: '.blog-card, .blog-post-card, .post-card, [class*="blog"][class*="card"]',
        about: '.team-card, .value-card, .timeline-card, .stat-card, [class*="team"][class*="card"], [class*="value"][class*="card"]',
        contact: '.contact-info-card, .contact-card, [class*="contact"][class*="card"]',
        gallery: '.model-card, .gallery-stack-card, .hero-copy-card, .gallery-card, [class*="gallery"][class*="card"]'
    };

    Object.entries(sectionSelectors).forEach(([section, selector]) => {
        document.querySelectorAll(selector).forEach((card) => {
            card.dataset.fxCardSection = section;
            const sectionSettings = effects.sections?.[section];
            if (sectionSettings?.theme) card.dataset.fxSectionTheme = sectionSettings.theme;
            if (sectionSettings?.enabled === false) {
                card.dataset.fxDisabled = '1';
            } else {
                delete card.dataset.fxDisabled;
            }
        });
    });
}

function cleanupProjectDisplayMotion() {
    document.querySelectorAll('.project-display-cinematic-stack').forEach((container) => {
        if (container._projectDisplayTriggers) {
            container._projectDisplayTriggers.forEach((trigger) => trigger && trigger.kill && trigger.kill());
            container._projectDisplayTriggers = [];
        }
        container.classList.remove('project-display-cinematic-stack');
        container.querySelectorAll('.project-display-card').forEach((card) => {
            card.classList.remove('project-display-card');
            card.style.removeProperty('z-index');
            card.style.removeProperty('--project-card-index');
            card.style.removeProperty('transform');
            card.style.removeProperty('opacity');
            card.style.removeProperty('will-change');
            if (card._gsap) {
                try { gsap.set(card, { clearProps: 'all' }); } catch (_) {}
            }
        });
    });
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
    }
}

function ensureProjectDisplayRuntimeStyle() {
    if (document.getElementById('project-display-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'project-display-runtime-style';
    style.textContent = `
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .lux-services,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-section{background:var(--project-display-bg,#EFEAE1)!important;color:var(--project-display-text,#1D1A16)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .lux-services .section-title,body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .lux-services .section-subtitle,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-section .section-title,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-section .section-subtitle{color:var(--project-display-text,#1D1A16)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] #servicesShowcase,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .modern-portfolio-grid,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-grid-full{display:grid!important;grid-template-columns:1fr!important;gap:var(--project-display-spacing,28px)!important;max-width:1180px;margin-inline:auto;perspective:1400px}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card{min-height:clamp(420px,58vh,680px)!important;border-radius:var(--project-display-radius,34px)!important;background:var(--project-display-card-bg,#F6F3EC)!important;color:var(--project-display-text,#1D1A16)!important;border:1px solid color-mix(in srgb,var(--project-display-accent,#C4933A) 28%,transparent)!important;box-shadow:0 34px 90px rgba(20,17,12,var(--project-display-shadow-opacity,.22))!important;overflow:hidden;will-change:transform,opacity;transform-origin:center center;margin-top:calc(var(--project-display-overlap,86px)*-.35);display:grid!important;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux:first-child,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item:first-child,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card:first-child{margin-top:0}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux.is-reversed{grid-template-columns:minmax(320px,.95fr) minmax(0,1.05fr)!important}body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux.is-reversed .service-media-lux{order:2}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-media-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item>img,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item>video,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-image-wrapper{min-height:100%!important;filter:grayscale(var(--project-display-grayscale,.78)) contrast(1.05)!important;transition:transform .9s cubic-bezier(.22,.61,.36,1),filter .9s cubic-bezier(.22,.61,.36,1)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux:hover,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item:hover,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card:hover{transform:translateY(calc(var(--project-display-hover-lift,8px)*-1))!important;box-shadow:0 42px 115px rgba(20,17,12,calc(var(--project-display-shadow-opacity,.22) + .12))!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux:hover img,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item:hover img,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item:hover video,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card:hover img,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card:hover video{transform:scale(var(--project-display-image-zoom,1.035))!important;filter:grayscale(calc(var(--project-display-grayscale,.78)*.65)) contrast(1.08)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-content-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-overlay,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-info{position:relative!important;inset:auto!important;min-height:100%;padding:clamp(30px,5vw,76px)!important;background:transparent!important;color:var(--project-display-text,#1D1A16)!important;display:flex!important;flex-direction:column;justify-content:center;align-items:flex-start}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-title-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-overlay h3,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-title{color:var(--project-display-text,#1D1A16)!important;font-size:clamp(2rem,4.4vw,4.8rem)!important;line-height:.98!important;letter-spacing:0!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-desc-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-overlay span,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-desc,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-category{color:color-mix(in srgb,var(--project-display-text,#1D1A16) 72%,transparent)!important;font-size:clamp(1rem,1.4vw,1.22rem)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-action-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .view-project{width:56px!important;height:56px!important;border-radius:50%!important;background:var(--project-display-button,#1D1A16)!important;color:var(--project-display-card-bg,#F6F3EC)!important;transition:transform .65s cubic-bezier(.22,.61,.36,1),background-color .65s cubic-bezier(.22,.61,.36,1)!important}
        body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux:hover .service-action-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item:hover .view-project{transform:rotate(45deg) scale(1.06)!important;background:var(--project-display-button-hover,#C4933A)!important}
        @media(max-width:900px){body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .portfolio-item,body[data-project-display-theme="almimar-editorial"][data-project-display-portfolio="1"] .project-card{grid-template-columns:1fr!important;min-height:auto!important;margin-top:0}body[data-project-display-theme="almimar-editorial"][data-project-display-home="1"] .service-card-lux.is-reversed .service-media-lux{order:0}}
    `;
    document.head.appendChild(style);
}

function applyUiEffectsFromContent(content = siteContent) {
    const effects = getUiEffectsSettings(content);
    const root = document.documentElement;
    const body = document.body;
    ensureUiEffectsRuntimeStyle();
    ensureProjectDisplayRuntimeStyle();

    root.style.setProperty('--fx-card-hover-enabled', effects.cards.hoverEnabled ? '1' : '0');
    root.style.setProperty('--fx-card-hover-lift', `${effects.cards.hoverLiftPx}px`);
    root.style.setProperty('--fx-card-hover-scale', String(effects.cards.hoverScale));
    root.style.setProperty('--fx-card-image-scale', String(effects.cards.imageZoom));
    root.style.setProperty('--fx-card-shadow-opacity', String(effects.cards.shadowOpacity));
    root.style.setProperty('--fx-card-transition-ms', String(effects.cards.transitionMs));
    root.style.setProperty('--fx-button-hover-enabled', effects.buttons.hoverEnabled ? '1' : '0');
    root.style.setProperty('--fx-button-lift', `${effects.buttons.liftPx}px`);
    root.style.setProperty('--fx-button-glow-opacity', String(effects.buttons.glowOpacity));
    root.style.setProperty('--fx-button-scale', String(effects.buttons.scale));
    root.style.setProperty('--fx-button-transition-ms', String(effects.buttons.transitionMs));
    root.style.setProperty('--fx-featured-radius', `${effects.featured.cardRadiusPx}px`);
    root.style.setProperty('--fx-featured-gap', `${effects.featured.gapPx}px`);
    root.style.setProperty('--fx-featured-card-lift', `${effects.featured.cardLiftPx}px`);
    root.style.setProperty('--project-display-card-bg', effects.projectDisplay.primaryCardColor);
    root.style.setProperty('--project-display-bg', effects.projectDisplay.backgroundColor);
    root.style.setProperty('--project-display-text', effects.projectDisplay.textColor);
    root.style.setProperty('--project-display-accent', effects.projectDisplay.accentColor);
    root.style.setProperty('--project-display-radius', `${effects.projectDisplay.radiusPx}px`);
    root.style.setProperty('--project-display-shadow-opacity', String(effects.projectDisplay.shadowOpacity));
    root.style.setProperty('--project-display-hover-lift', `${effects.projectDisplay.hoverLiftPx}px`);
    root.style.setProperty('--project-display-image-zoom', String(effects.projectDisplay.imageZoom));
    root.style.setProperty('--project-display-scroll-speed', String(effects.projectDisplay.scrollSpeed));
    root.style.setProperty('--project-display-spacing', `${effects.projectDisplay.cardSpacingPx}px`);
    root.style.setProperty('--project-display-overlap', `${effects.projectDisplay.overlapPx}px`);
    root.style.setProperty('--project-display-sticky-top', `${effects.projectDisplay.stickyTopPx}px`);
    root.style.setProperty('--project-display-grayscale', String(effects.projectDisplay.grayscale));
    root.style.setProperty('--project-display-button', effects.projectDisplay.buttonColor);
    root.style.setProperty('--project-display-button-hover', effects.projectDisplay.buttonHoverColor);
    Object.entries(effects.sections).forEach(([key, value]) => {
        root.style.setProperty(`--fx-${key}-radius`, `${value.cardRadiusPx}px`);
        root.style.setProperty(`--fx-${key}-gap`, `${value.gapPx}px`);
        root.style.setProperty(`--fx-${key}-lift`, `${value.cardLiftPx}px`);
        root.style.setProperty(`--fx-${key}-image-scale`, String(value.imageZoom));
        root.style.setProperty(`--fx-${key}-shadow-opacity`, String(value.shadowOpacity));
    });

    if (body) {
        body.setAttribute('data-fx-card-effect', effects.cards.effectType);
        body.setAttribute('data-fx-button-effect', effects.buttons.effectType);
        body.setAttribute('data-project-display-theme', effects.projectDisplay.theme);
        body.setAttribute('data-project-display-home', effects.projectDisplay.enabledHome ? '1' : '0');
        body.setAttribute('data-project-display-portfolio', effects.projectDisplay.enabledPortfolio ? '1' : '0');
        body.setAttribute('data-fx-featured-mini', effects.featured.showMiniGrid ? '1' : '0');
        body.setAttribute('data-fx-featured-scroll', effects.featured.showScrollGrid ? '1' : '0');
        Object.entries(effects.sections).forEach(([key, value]) => {
            body.setAttribute(`data-fx-section-${key}`, value.enabled ? '1' : '0');
            body.setAttribute(`data-fx-section-theme-${key}`, value.theme || 'custom');
        });
    }

    applyUiEffectsTargets(effects);
}

async function refreshContentFromServerIfUpdated() {
    if (!document.hasFocus()) return;
    const isAdminPreview = new URLSearchParams(window.location.search).get('adminPreview') === '1';
    if (isAdminPreview) return;

    try {
        const res = await fetchWithFallback('api/content', { cache: 'no-store' });
        const latest = await res.json();
        const latestSavedAt = getContentSavedAtNumber(latest);
        if (!latestSavedAt) return;

        const currentSavedAt = getContentSavedAtNumber(siteContent);
        if (currentSavedAt && latestSavedAt <= currentSavedAt) return;

        siteContent = latest;
        window.siteContent = siteContent;
        normalizeContactContent(siteContent);
        normalizeSocialContent(siteContent);
        normalizePortfolioSections(siteContent);
        applyLanguageContent();
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();

        try {
            localStorage.setItem('siteContentCache', JSON.stringify(siteContent));
        } catch (_) {}
    } catch (error) {
        console.warn('Live sync skipped:', error);
    }
}

function toLanguageHref(href, lang) {
    if (!href) return href;
    if (
        href.startsWith('#') ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
    ) {
        return href;
    }

    const match = href.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!match) return href;
    let base = match[1] || '';
    const query = match[2] || '';
    const hash = match[3] || '';

    if (!base || !base.endsWith('.html')) return href;
    if (base.endsWith('admin.html')) return href;

    if (lang === 'en') {
        if (!base.endsWith('-en.html')) {
            base = base.replace(/\.html$/, '-en.html');
        }
    } else {
        base = base.replace(/-en\.html$/, '.html');
    }

    return `${base}${query}${hash}`;
}

function normalizeInternalLinksForLanguage(lang) {
    document.querySelectorAll('a[href]').forEach((link) => {
        const currentHref = link.getAttribute('href');
        const normalized = toLanguageHref(currentHref, lang);
        if (normalized && normalized !== currentHref) {
            link.setAttribute('href', normalized);
        }
    });
}

function getApiCandidates(path) {
    let cleanPath = String(path || '');
    const candidates = [];
    const origin = window.location.origin;
    const hostname = window.location.hostname || '';
    const isLocalHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1';
    const isFileProtocol = window.location.protocol === 'file:';

    // Calculate subdirectory depth from pathname
    // e.g., /subdir/page.html -> depth 1, /subdir/subdir2/page.html -> depth 2
    let pathname = window.location.pathname || '';
    let depth = 0;
    if (pathname) {
        const parts = pathname.split('/').filter(p => p && !p.endsWith('.html') && !p.endsWith('.htm'));
        depth = parts.length;
    }

    // Build relative prefix based on depth (e.g., '', '../', '../../', etc.)
    const relPrefix = depth > 0 ? '../'.repeat(depth) : './';
    const apiBase = relPrefix + 'api/';
    const dataBase = relPrefix + 'data/';

    // 1. Subdirectory-aware relative API paths (primary for hosting compatibility)
    if (cleanPath.startsWith('/') || cleanPath.startsWith('api/')) {
        candidates.push(apiBase + cleanPath.replace(/^\/?/, ''));
        candidates.push('./' + cleanPath.replace(/^\/?/, ''));
        candidates.push(cleanPath.replace(/^\/?/, ''));
    } else {
        candidates.push(apiBase + cleanPath);
        candidates.push('./' + cleanPath);
        candidates.push(cleanPath);
    }

    // 2. Current origin absolute URL
    if (origin && origin !== 'null') {
        let absPath = cleanPath;
        if (absPath.startsWith('./')) absPath = absPath.substring(1);
        candidates.push(`${origin}${absPath.startsWith('/') ? '' : '/'}${absPath}`);
    }

    // 3. Local JSON file fallbacks (critical for static hosting without API server)
    if (cleanPath.includes('/content') || cleanPath === 'api/content') {
        candidates.push(dataBase + 'content.json');
        candidates.push(relPrefix + 'data/content.json');
        candidates.push('./data/content.json');
        candidates.push('data/content.json');
    }

    // 4. Local development ports only when running locally.
    // This avoids long network stalls on production domains.
    if (isLocalHost || isFileProtocol) {
        const localPorts = ['5000', '8000', '8080'];
        localPorts.forEach(port => {
            let absPath = cleanPath;
            if (absPath.startsWith('./')) absPath = absPath.substring(1);
            candidates.push(`http://127.0.0.1:${port}${absPath.startsWith('/') ? '' : '/'}${absPath}`);
            candidates.push(`http://localhost:${port}${absPath.startsWith('/') ? '' : '/'}${absPath}`);
        });
    }

    return [...new Set(candidates)];
}

async function fetchWithFallback(path, options = {}) {
    let lastErr = null;
    const candidates = getApiCandidates(path);
    for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        const controller = new AbortController();
        const timeoutMs = i === 0 ? 5000 : 2500;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            if (res.ok) return res;
            lastErr = new Error(`HTTP ${res.status} from ${url}`);
        } catch (err) {
            lastErr = err;
        } finally {
            clearTimeout(timeoutId);
        }
    }
    throw lastErr || new Error(`Failed to fetch ${path}`);
}

const DEFAULT_PORTFOLIO_SECTIONS = [
    { id: 'all', ar: 'الكل', en: 'All', active: true, system: true },
    { id: 'apartment', ar: 'شقق', en: 'Apartments', active: true },
    { id: 'kitchen', ar: 'مطابخ', en: 'Kitchens', active: true },
    { id: 'bedroom', ar: 'غرف نوم', en: 'Bedrooms', active: true },
    { id: 'reception', ar: 'ريسبشن', en: 'Reception', active: true },
    { id: 'bathroom', ar: 'حمامات', en: 'Bathrooms', active: true },
    { id: 'facade', ar: 'واجهات', en: 'Facades', active: true }
];

const SOCIAL_ICON_DEFAULTS = {
    whatsapp: { label: 'WhatsApp', iconClass: 'fab fa-whatsapp' },
    facebook: { label: 'Facebook', iconClass: 'fab fa-facebook-f' },
    instagram: { label: 'Instagram', iconClass: 'fab fa-instagram' },
    twitter: { label: 'Twitter', iconClass: 'fab fa-twitter' },
    linkedin: { label: 'LinkedIn', iconClass: 'fab fa-linkedin-in' },
    behance: { label: 'Behance', iconClass: 'fab fa-behance' },
    pinterest: { label: 'Pinterest', iconClass: 'fab fa-pinterest-p' },
    telegram: { label: 'Telegram', iconClass: 'fab fa-telegram-plane' },
    youtube: { label: 'YouTube', iconClass: 'fab fa-youtube' },
    tiktok: { label: 'TikTok', iconClass: 'fab fa-tiktok' }
};

const SOCIAL_LINK_ORDER = ['facebook', 'instagram', 'twitter', 'linkedin', 'behance', 'pinterest', 'telegram', 'youtube', 'tiktok'];

const FALLBACK_CONTENT = {
  branding: {
    logo: "/uploads/20260416114117041013.png",
    favicon: "/uploads/20260416114117041013.png",
    ar: { siteName: "استوديو العوضي", tagline: "معماريون، مهندسون، ومدراء إبداعيون" },
    en: { siteName: "ELAWADI STUDIO", tagline: "ARCHITECTS & ENGINEERS" }
  },
  hero: {
    textStyle: {
      titleColor: "#ffffff",
      subtitleColor: "#f4f4f4",
      titleFontFamily: "'Tajawal', sans-serif",
      subtitleFontFamily: "'Tajawal', sans-serif"
    },
    layerMotion: {
      buildingRiseDuration: 1.4,
      cloudBackDuration: 18,
      cloudFrontDuration: 14
    },
    slides: [
      {
        ar: { title: "نصمم لك إرثاً معمارياً يعيش للأجيال", subtitle: "أعلى معايير الدقة الهندسية والفخامة الكلاسيكية" },
        en: { title: "Designing Architectural Legacies for Generations", subtitle: "Highest standards of engineering precision and classical luxury" },
        image: "/uploads/20260424012620941629.png"
      }
    ]
  },
  about: {
    ar: {
      shortText: "نقدم خدمات التصميم الداخلي والمعماري.",
      text: "أهلاً بك، أنا مهندس تصميم داخلي ومعماري بخبرة أكثر من 10 سنوات.",
      stats: { experience: "+10 سنوات", projects: "+250 مشروع" }
    },
    en: {
      shortText: "Providing interior and architectural design services.",
      text: "Welcome, I am an interior and architectural designer with over 10 years of experience.",
      stats: { experience: "+10 Years", projects: "+250 Projects" }
    },
    image: "/uploads/20260425005347866687.jpeg"
  },
  services: [
    { ar: { title: "تصميم شقق كاملة", description: "تصميم متكامل للشقق من الألف إلى الياء" }, en: { title: "Full Apartment Design", description: "Integrated design for apartments from A to Z" }, icon: "fa-home", image: "/uploads/20260423195738220901.gif" },
    { ar: { title: "تصميم غرف منفصلة", description: "تصميم غرف محددة" }, en: { title: "Separate Room Design", description: "Design for specific rooms" }, icon: "fa-door-open", image: "/uploads/20260423221017168668.png" },
    { ar: { title: "تصميم واجهات", description: "تصميم واجهات خارجية مميزة" }, en: { title: "Facade Design", description: "Unique exterior facade designs" }, icon: "fa-building", image: "/uploads/20260423221100158990.png" },
    { ar: { title: "تصميم 3D واقعي", description: "نماذج 3D واقعية" }, en: { title: "Realistic 3D Design", description: "Realistic 3D models" }, icon: "fa-cube", image: "/uploads/20260423221457738492.png" }
  ],
  portfolio: [],
  contact: {
    phone: "+201002512669",
    email: "info@elawadi-studio.com",
    ar: { address: "مقر الشركة الأول: الإسكندرية - مصر | مقر الشركة الثاني: الرياض - المملكة العربية السعودية" },
    en: { address: "Headquarters 1: Alexandria - Egypt | Headquarters 2: Riyadh - Saudi Arabia" },
    whatsapp: "https://wa.me/201002512669"
  },
  ui: {
    ar: {
      home: "الرئيسية",
      projects: "مشاريعنا",
      services: "خدماتنا",
      about: "من نحن",
      blog: "مدونتنا",
      contact: "اتصل بنا",
      book_consultation: "احجز استشارتك",
      read_more: "اقرأ المزيد",
      order_now: "اطلب الخدمة الآن",
      send_message: "أرسل رسالة",
      copyright: "© 2026 استوديو العوضي. جميع الحقوق محفوظة"
    },
    en: {
      home: "Home",
      projects: "Our Projects",
      services: "Our Services",
      about: "About Us",
      blog: "Our Blog",
      contact: "Contact Us",
      book_consultation: "Book Consultation",
      read_more: "Read More",
      order_now: "Order Service Now",
      send_message: "Send a Message",
      copyright: "© 2026 ELAWADI STUDIO. All Rights Reserved"
    }
  }
};

const DEFAULT_HERO_TEXT_STYLE = Object.freeze({
    slideDurationSec: 5,
    ar: {
        titleColor: '#ffffff',
        subtitleColor: '#f4f4f4',
        titleFontFamily: "'Tajawal', sans-serif",
        subtitleFontFamily: "'Tajawal', sans-serif",
        textBackgroundColor: '#000000',
        textBackgroundOpacity: 0,
        textBackgroundX: 50,
        textBackgroundY: 50,
        titleFontSizeDesktop: 80,
        titleFontSizeMobile: 45,
        subtitleFontSizeDesktop: 22,
        subtitleFontSizeMobile: 18,
    },
    en: {
        titleColor: '#ffffff',
        subtitleColor: '#f4f4f4',
        titleFontFamily: "'Tajawal', sans-serif",
        subtitleFontFamily: "'Tajawal', sans-serif",
        textBackgroundColor: '#000000',
        textBackgroundOpacity: 0,
        textBackgroundX: 50,
        textBackgroundY: 50,
        titleFontSizeDesktop: 80,
        titleFontSizeMobile: 45,
        subtitleFontSizeDesktop: 22,
        subtitleFontSizeMobile: 18,
    },
    textBehindBuilding: true,
    behindTextAr: "نصمم مستقبل يعكس طموحك",
    behindTextEn: "We design future that reflects your ambition",
    behindTextLoopDurationSec: 60,
    behindTextLoopDistanceVw: 10,
    behindTextOpacity: 0.05,
    behindTextColor: '#ffffff',
    behindTextBlur: 2,
    behindTextSizeVw: 12,
    cinematicText: {
        enabled: true,
        ar: {
            text: "نصمم مستقبل يعكس طموحك",
            fontSizeDesktop: 160,
            fontSizeMobile: 92,
            color: "#ffffff",
            opacity: 0.38,
            duration: 26,
            loopGap: 0,
            posX: 0,
            posY: 84,
            startPos: 100,
            endPos: -100,
            direction: "rtl"
        },
        en: {
            text: "We design future that reflects your ambition",
            fontSizeDesktop: 160,
            fontSizeMobile: 92,
            color: "#ffffff",
            opacity: 0.38,
            duration: 26,
            loopGap: 0,
            posX: 0,
            posY: 84,
            startPos: -100,
            endPos: 100,
            direction: "ltr"
        }
    }
});

const DEFAULT_HERO_LAYER_MOTION = Object.freeze({
    buildingRiseDuration: 1.4,
    cloudBackDuration: 18,
    cloudFrontDuration: 14,
    cloudBackShiftX: -18,
    cloudBackShiftY: 12,
    cloudFrontShiftX: 22,
    cloudFrontShiftY: -10
});

function getHeroTextStyleSettings(hero) {
    const raw = hero?.textStyle || {};
    const asNumber = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    
    // Pick the correct settings based on current language
    const lang = currentLang === 'en' ? 'en' : 'ar';
    const langRaw = raw[lang] || {};
    const langDefaults = DEFAULT_HERO_TEXT_STYLE[lang];

    return {
        titleColor: langRaw.titleColor || raw.titleColor || langDefaults.titleColor,
        subtitleColor: langRaw.subtitleColor || raw.subtitleColor || langDefaults.subtitleColor,
        titleFontFamily: langRaw.titleFontFamily || raw.titleFontFamily || langDefaults.titleFontFamily,
        subtitleFontFamily: langRaw.subtitleFontFamily || raw.subtitleFontFamily || langDefaults.subtitleFontFamily,
        textBackgroundColor: langRaw.textBackgroundColor || raw.textBackgroundColor || langDefaults.textBackgroundColor,
        textBackgroundOpacity: Math.min(1, Math.max(0, asNumber(langRaw.textBackgroundOpacity ?? raw.textBackgroundOpacity, langDefaults.textBackgroundOpacity))),
        textBackgroundX: Math.min(100, Math.max(0, asNumber(langRaw.textBackgroundX ?? raw.textBackgroundX, langDefaults.textBackgroundX))),
        textBackgroundY: Math.min(100, Math.max(0, asNumber(langRaw.textBackgroundY ?? raw.textBackgroundY, langDefaults.textBackgroundY))),
        titleFontSizeDesktop: asNumber(langRaw.titleFontSizeDesktop ?? raw.titleFontSizeDesktop, langDefaults.titleFontSizeDesktop),
        titleFontSizeMobile: asNumber(langRaw.titleFontSizeMobile ?? raw.titleFontSizeMobile, langDefaults.titleFontSizeMobile),
        subtitleFontSizeDesktop: asNumber(langRaw.subtitleFontSizeDesktop ?? raw.subtitleFontSizeDesktop, langDefaults.subtitleFontSizeDesktop),
        subtitleFontSizeMobile: asNumber(langRaw.subtitleFontSizeMobile ?? raw.subtitleFontSizeMobile, langDefaults.subtitleFontSizeMobile),
        textBehindBuilding: raw.textBehindBuilding !== false,
        slideDurationSec: Math.min(20, Math.max(2, asNumber(raw.slideDurationSec, DEFAULT_HERO_TEXT_STYLE.slideDurationSec))),
        behindTextLoopDurationSec: Math.min(60, Math.max(4, asNumber(raw.behindTextLoopDurationSec, DEFAULT_HERO_TEXT_STYLE.behindTextLoopDurationSec))),
        behindTextLoopDistanceVw: Math.min(40, Math.max(4, asNumber(raw.behindTextLoopDistanceVw, DEFAULT_HERO_TEXT_STYLE.behindTextLoopDistanceVw))),
        behindTextColor: raw.behindTextColor || DEFAULT_HERO_TEXT_STYLE.behindTextColor,
        behindTextOpacity: Math.min(1, Math.max(0.05, asNumber(raw.behindTextOpacity, DEFAULT_HERO_TEXT_STYLE.behindTextOpacity))),
        behindTextSizeVw: Math.min(18, Math.max(3, asNumber(raw.behindTextSizeVw, DEFAULT_HERO_TEXT_STYLE.behindTextSizeVw))),
        cinematicText: {
            enabled: raw.cinematicText?.enabled !== false,
            ar: {
                text: raw.cinematicText?.ar?.text || DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.text,
                fontSizeDesktop: asNumber(raw.cinematicText?.ar?.fontSizeDesktop, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.fontSizeDesktop),
                fontSizeMobile: asNumber(raw.cinematicText?.ar?.fontSizeMobile, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.fontSizeMobile),
                color: raw.cinematicText?.ar?.color || DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.color,
                opacity: asNumber(raw.cinematicText?.ar?.opacity, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.opacity),
                duration: asNumber(raw.cinematicText?.ar?.duration, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.duration),
                loopGap: Math.min(10000, Math.max(0, asNumber(raw.cinematicText?.ar?.loopGap, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.loopGap))),
                posX: asNumber(raw.cinematicText?.ar?.posX, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.posX),
                posY: asNumber(raw.cinematicText?.ar?.posY, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.posY),
                startPos: asNumber(raw.cinematicText?.ar?.startPos, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.startPos),
                endPos: asNumber(raw.cinematicText?.ar?.endPos, DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.endPos),
                direction: raw.cinematicText?.ar?.direction || DEFAULT_HERO_TEXT_STYLE.cinematicText.ar.direction
            },
            en: {
                text: raw.cinematicText?.en?.text || DEFAULT_HERO_TEXT_STYLE.cinematicText.en.text,
                fontSizeDesktop: asNumber(raw.cinematicText?.en?.fontSizeDesktop, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.fontSizeDesktop),
                fontSizeMobile: asNumber(raw.cinematicText?.en?.fontSizeMobile, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.fontSizeMobile),
                color: raw.cinematicText?.en?.color || DEFAULT_HERO_TEXT_STYLE.cinematicText.en.color,
                opacity: asNumber(raw.cinematicText?.en?.opacity, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.opacity),
                duration: asNumber(raw.cinematicText?.en?.duration, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.duration),
                loopGap: Math.min(10000, Math.max(0, asNumber(raw.cinematicText?.en?.loopGap, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.loopGap))),
                posX: asNumber(raw.cinematicText?.en?.posX, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.posX),
                posY: asNumber(raw.cinematicText?.en?.posY, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.posY),
                startPos: asNumber(raw.cinematicText?.en?.startPos, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.startPos),
                endPos: asNumber(raw.cinematicText?.en?.endPos, DEFAULT_HERO_TEXT_STYLE.cinematicText.en.endPos),
                direction: raw.cinematicText?.en?.direction || DEFAULT_HERO_TEXT_STYLE.cinematicText.en.direction
            }
        }
    };
}

function getHeroLayerMotionSettings(hero) {
    const raw = hero?.layerMotion || {};
    const asNumber = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    return {
        buildingRiseDuration: Math.min(4, Math.max(0.3, asNumber(raw.buildingRiseDuration, DEFAULT_HERO_LAYER_MOTION.buildingRiseDuration))),
        cloudBackDuration: Math.min(60, Math.max(4, asNumber(raw.cloudBackDuration, DEFAULT_HERO_LAYER_MOTION.cloudBackDuration))),
        cloudFrontDuration: Math.min(60, Math.max(4, asNumber(raw.cloudFrontDuration, DEFAULT_HERO_LAYER_MOTION.cloudFrontDuration))),
        cloudBackShiftX: Math.min(120, Math.max(-120, asNumber(raw.cloudBackShiftX, DEFAULT_HERO_LAYER_MOTION.cloudBackShiftX))),
        cloudBackShiftY: Math.min(120, Math.max(-120, asNumber(raw.cloudBackShiftY, DEFAULT_HERO_LAYER_MOTION.cloudBackShiftY))),
        cloudFrontShiftX: Math.min(120, Math.max(-120, asNumber(raw.cloudFrontShiftX, DEFAULT_HERO_LAYER_MOTION.cloudFrontShiftX))),
        cloudFrontShiftY: Math.min(120, Math.max(-120, asNumber(raw.cloudFrontShiftY, DEFAULT_HERO_LAYER_MOTION.cloudFrontShiftY)))
    };
}

function applyHeroTextStyles(hero) {
    const settings = getHeroTextStyleSettings(hero);
    const projectHoverFromDesignSystem = siteContent?.designSystem?.colors?.hoverEffects?.projectHover;
    const projectHoverColor = getColorEntryHex(projectHoverFromDesignSystem) || settings.projectHoverColor || '#00d1ff';
    const projectHoverOpacity = projectHoverFromDesignSystem?.opacity ?? settings.projectHoverOpacity ?? 0.65;
    const titleEls = document.querySelectorAll('.hero-title-lux, .hero-title');
    const subtitleEls = document.querySelectorAll('.hero-subtitle-lux, .hero-subtitle');
    const heroSection = document.getElementById('homeHero');
    const heroTextPanel = document.querySelector('.hero-text-panel');

    // Allow Content to move across the entire screen
    const heroContent = document.querySelector('.hero-content-lux');
    
    // Apply Dynamic Project Hover Style via CSS Variables
    document.documentElement.style.setProperty('--project-hover-color', projectHoverColor);
    document.documentElement.style.setProperty('--project-hover-opacity', projectHoverOpacity);

    if (heroContent) {
        heroContent.style.maxWidth = 'none'; 
        heroContent.style.width = '100%';
        heroContent.style.height = '100%';
        heroContent.style.margin = '0';
        heroContent.style.padding = '0';
        heroContent.style.position = 'absolute';
        heroContent.style.inset = '0';
        heroContent.style.display = 'block';
        heroContent.style.pointerEvents = 'none'; // Container shouldn't block layers
    }

    if (heroTextPanel) {
        heroTextPanel.style.pointerEvents = 'auto'; // Content inside should be clickable
        heroTextPanel.style.backgroundColor = settings.textBackgroundOpacity > 0
            ? hexToRgba(settings.textBackgroundColor, settings.textBackgroundOpacity)
            : 'transparent';
        heroTextPanel.style.backdropFilter = settings.textBackgroundOpacity > 0 ? 'blur(2px)' : 'none';
        heroTextPanel.style.padding = settings.textBackgroundOpacity > 0 ? '20px 24px' : '0';
        heroTextPanel.style.borderRadius = settings.textBackgroundOpacity > 0 ? '18px' : '0';
        
        // Dynamic Positioning
        const bgX = settings.textBackgroundX ?? 50;
        const bgY = settings.textBackgroundY ?? 50;
        
        heroTextPanel.style.position = 'absolute'; 
        heroTextPanel.style.top = `${bgY}%`;
        heroTextPanel.style.left = `${bgX}%`;
        heroTextPanel.style.bottom = 'auto';
        heroTextPanel.style.right = 'auto';
        heroTextPanel.style.transform = `translate(-${bgX}%, -${bgY}%)`;
    }

    titleEls.forEach((el) => {
        el.style.color = settings.titleColor;
        el.style.fontFamily = settings.titleFontFamily;
        const isMobile = window.innerWidth < 1024;
        const fontSize = isMobile ? settings.titleFontSizeMobile : settings.titleFontSizeDesktop;
        if (fontSize) {
            el.style.fontSize = isMobile ? `${fontSize}px` : `${fontSize}px`;
            // Use clamp for better responsiveness if possible, or just set it
            if (!isMobile) {
                el.style.fontSize = `clamp(${settings.titleFontSizeMobile}px, 5vw, ${settings.titleFontSizeDesktop}px)`;
            } else {
                el.style.fontSize = `${settings.titleFontSizeMobile}px`;
            }
        }
    });

    subtitleEls.forEach((el) => {
        el.style.color = settings.subtitleColor;
        el.style.fontFamily = settings.subtitleFontFamily;
        const isMobile = window.innerWidth < 1024;
        const fontSize = isMobile ? settings.subtitleFontSizeMobile : settings.subtitleFontSizeDesktop;
        if (fontSize) {
            el.style.fontSize = `${fontSize}px`;
        }
    });

    if (heroSection) {
        const cinematic = settings.cinematicText || {};
        const isRtl = document.documentElement.dir === 'rtl';
        const langSettings = isRtl ? (cinematic.ar || {}) : (cinematic.en || {});
        const isMobile = window.innerWidth < 1024;

        heroSection.classList.toggle('hero-text-behind-building', !!cinematic.enabled);
        
        if (cinematic.enabled) {
            const duration = Number.isFinite(Number(langSettings.duration)) ? Math.max(4, Number(langSettings.duration)) : 60;
            const opacity = Number.isFinite(Number(langSettings.opacity))
                ? Math.min(1, Math.max(0, Number(langSettings.opacity)))
                : 0.2;
            const fontSize = isMobile ? (langSettings.fontSizeMobile || 120) : (langSettings.fontSizeDesktop || 200);
            const color = langSettings.color || '#ffffff';
            const loopGap = Math.max(0, Number(langSettings.loopGap) || 0);
            const rawPosY = Number(langSettings.posY);
            let verticalPos = Number.isFinite(rawPosY) ? rawPosY : 50;
            // Backward compatibility: old saved values used bottom-offset semantics (e.g. 4 => near bottom).
            if (verticalPos >= 0 && verticalPos <= 20) {
                verticalPos = 100 - verticalPos;
            }
            verticalPos = Math.min(98, Math.max(2, verticalPos));

            // Keep old vars + set the actual marquee vars used by CSS.
            heroSection.style.setProperty('--hero-behind-text-duration', `${duration}s`);
            heroSection.style.setProperty('--marquee-speed', `${duration}s`);
            heroSection.style.setProperty('--hero-behind-text-color', color);
            heroSection.style.setProperty('--hero-behind-text-opacity', String(opacity));
            heroSection.style.setProperty('--hero-behind-text-size', `${fontSize}px`);
            heroSection.style.setProperty('--marquee-color', hexToRgba(color, opacity));
            heroSection.style.setProperty('--marquee-opacity', String(opacity));
            heroSection.style.setProperty('--marquee-size', `${fontSize}px`);
            heroSection.style.setProperty('--marquee-gap', `${loopGap}px`);
            heroSection.style.setProperty('--marquee-y', `${verticalPos}%`);
            
            heroSection.style.setProperty('--hero-behind-text-start-pos', `${langSettings.startPos ?? 0}%`);
            heroSection.style.setProperty('--hero-behind-text-end-pos', `${langSettings.endPos ?? 0}%`);
            heroSection.style.setProperty('--hero-behind-text-v-offset', `${langSettings.posY ?? 50}%`);
            heroSection.style.setProperty('--hero-behind-text-h-offset', `${langSettings.posX ?? 0}px`);
            
            const direction = langSettings.direction || (isRtl ? 'rtl' : 'ltr');
            heroSection.classList.toggle('hero-text-rtl', direction === 'rtl');
            heroSection.classList.toggle('hero-text-ltr', direction === 'ltr');
        }
    }
}

function setHeroBehindTextContent(slide, lang) {
    const activeSlide = document.querySelector('.hero-slide.active');
    const heroSection = document.getElementById('homeHero');
    const heroTextSettings = getHeroTextStyleSettings(siteContent?.hero || {});
    const cinematic = heroTextSettings.cinematicText || {};
    
    const isRtlMode = document.documentElement.dir === 'rtl';
    const langSettings = isRtlMode ? (cinematic.ar || {}) : (cinematic.en || {});
    
    const hasCinematicText = langSettings.text && String(langSettings.text).trim();
    
    if (!activeSlide) return;
    const targets = activeSlide.querySelectorAll('.hero-behind-text');
    if (!targets.length) return;

    if (hasCinematicText) {
        const text = String(langSettings.text || '').trim();
        targets.forEach((target) => {
            target.textContent = text;
            target.style.display = text ? 'block' : 'none';
            target.style.fontFamily = heroTextSettings.titleFontFamily;
        });

        if (heroSection) {
            heroSection.classList.toggle('hero-text-behind-building', cinematic.enabled && Boolean(text));
        }
        refreshHeroBehindTextLoop(activeSlide);
    }
}

function refreshHeroBehindTextLoop(slideEl = null) {
    // Kept for backward compatibility; seamless marquee uses pure CSS translateX(-50%).
    return;
}

function isHexColor(value) {
    return /^#([0-9a-f]{3}){1,2}$/i.test(String(value || ''));
}

function normalizeHeroTextStyleRuntime(hero) {
    if (!hero || typeof hero !== 'object') return;
    if (!hero.textStyle || typeof hero.textStyle !== 'object') hero.textStyle = {};
    const ts = hero.textStyle;
    const defaults = DEFAULT_HERO_TEXT_STYLE;
    if (!isHexColor(ts.behindTextColor)) ts.behindTextColor = defaults.behindTextColor;
    if (typeof ts.behindTextLoopDurationSec !== 'number') ts.behindTextLoopDurationSec = defaults.behindTextLoopDurationSec;
    if (typeof ts.behindTextLoopDistanceVw !== 'number') ts.behindTextLoopDistanceVw = defaults.behindTextLoopDistanceVw;
    if (typeof ts.behindTextOpacity !== 'number') ts.behindTextOpacity = defaults.behindTextOpacity;
    if (typeof ts.behindTextSizeVw !== 'number') ts.behindTextSizeVw = defaults.behindTextSizeVw;
    
    // Support Cinematic Text Normalization
    if (!ts.cinematicText || typeof ts.cinematicText !== 'object') {
        ts.cinematicText = JSON.parse(JSON.stringify(defaults.cinematicText));
    }
    
    const slides = Array.isArray(hero.slides) ? hero.slides : [];
    slides.forEach((slide) => {
        if (!slide.ar) slide.ar = {};
        if (!slide.en) slide.en = {};
        if (typeof slide.ar.behindText !== 'string') slide.ar.behindText = '';
        if (typeof slide.en.behindText !== 'string') slide.en.behindText = '';
        const rawScale = Number(slide.buildingScale);
        slide.buildingScale = Number.isFinite(rawScale) ? Math.min(2, Math.max(0.6, rawScale)) : 1;
    });
}

function hexToRgba(hexColor, alpha = 1) {
    let hex = String(hexColor || '').trim();
    if (!/^#([0-9a-f]{3}){1,2}$/i.test(hex)) {
        return `rgba(0,0,0,${Math.min(1, Math.max(0, alpha))})`;
    }
    
    if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = Math.min(1, Math.max(0, Number(alpha) || 0));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function applyHeroLayerMotion(hero) {
    const motion = getHeroLayerMotionSettings(hero);
    document.querySelectorAll('.hero-layer-building').forEach((el) => {
        el.style.animationDuration = `${motion.buildingRiseDuration}s`;
        el.style.zIndex = '12'; // Ensure building is above text
    });
    document.querySelectorAll('.hero-layer-cloud-back').forEach((el) => {
        el.style.animationDuration = `${motion.cloudBackDuration}s`;
        el.style.setProperty('--cloud-back-x', `${motion.cloudBackShiftX}px`);
        el.style.setProperty('--cloud-back-y', `${motion.cloudBackShiftY}px`);
    });
    document.querySelectorAll('.hero-layer-cloud-front').forEach((el) => {
        el.style.animationDuration = `${motion.cloudFrontDuration}s`;
        el.style.setProperty('--cloud-front-x', `${motion.cloudFrontShiftX}px`);
        el.style.setProperty('--cloud-front-y', `${motion.cloudFrontShiftY}px`);
    });
}

/**
 * Tower Parallax - Premium Motion Effect
 * Handles smooth scrolling and mouse-based parallax for the hero tower image.
 */
let towerRafId = null;
let currentTowerY = 0;
let targetTowerY = 0;
let towerMouseY = 0;
let towerScrollY = 0;

function initTowerParallax() {
    const tower = siteContent?.hero?.towerParallax;
    if (!tower || tower.enabled === false) return;

    const towerEl = document.querySelector('.hero-tower-parallax-img');
    if (!towerEl) return;

    const isMobile = window.innerWidth < 1024;
    const speed = Number(isMobile ? tower.speedMobile : tower.speedDesktop) || 0.08;
    const maxShift = Number(isMobile ? tower.maxShiftMobile : tower.maxShiftDesktop) || 24;
    const mouseFactor = Number(tower.mouseSpeedFactor || 1);
    const ease = 0.08;

    // Respect reduced motion settings if enabled
    if (tower.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const updateMotion = () => {
        // Base target from scroll
        let target = towerScrollY * speed;
        
        // Add mouse influence if on desktop
        if (!isMobile) {
            target += towerMouseY * mouseFactor;
        }

        // Clamp to max shift
        target = Math.max(-maxShift, Math.min(maxShift, target));
        
        // Smoothing
        currentTowerY += (target - currentTowerY) * ease;

        // Apply transform including static offsets
        const offsetY = Number(isMobile ? tower.offsetYMobile : tower.offsetY) || 0;
        const offsetX = Number(isMobile ? tower.offsetXMobile : tower.offsetX) || 0;
        
        towerEl.style.transform = `translate3d(calc(-50% + ${offsetX}px), ${(currentTowerY + offsetY).toFixed(2)}px, 0) scale(var(--tower-scale, 1))`;

        towerRafId = requestAnimationFrame(updateMotion);
    };

    window.addEventListener('scroll', () => {
        towerScrollY = window.scrollY;
    }, { passive: true });

    if (!isMobile) {
        window.addEventListener('mousemove', (e) => {
            const relY = e.clientY / window.innerHeight;
            towerMouseY = (relY - 0.5) * (maxShift * 2);
        }, { passive: true });
    }

    // Start loop
    if (towerRafId) cancelAnimationFrame(towerRafId);
    towerRafId = requestAnimationFrame(updateMotion);
}

window.addEventListener('DOMContentLoaded', async function() {
    window.contentTs = Date.now();
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    const savedLang = localStorage.getItem('siteLang');
    const path = (window.location.pathname || '').toLowerCase();

    // Dedicated page language should control direction/layout, not previous localStorage value.
    const isEnglishPage = path.includes('-en.html') ||
                         path.endsWith('/en') ||
                         document.documentElement.lang === 'en';
    const isArabicPage = document.documentElement.lang === 'ar' ||
                         (!isEnglishPage && path.endsWith('.html'));

    if (isEnglishPage) {
        currentLang = 'en';
        localStorage.setItem('siteLang', 'en');
    } else if (isArabicPage) {
        currentLang = 'ar';
        localStorage.setItem('siteLang', 'ar');
    } else if (savedLang) {
        currentLang = savedLang;
    } else {
        currentLang = 'ar';
    }
    normalizeInternalLinksForLanguage(currentLang);

    initLoader();
    initCustomCursor();
    initMouseParticles();
    initPageTransitions();
    // Create and wire language switcher immediately so it never waits on async content.
    initMobileLanguageSwitcher();
    initLanguageSwitcher();
    
    await loadDynamicContent();
    
    updatePageDirection(currentLang);
    applyLanguageContent();
    initProjectsCounter();
    
    initScrollAnimations();
    init3DTiltEffect();
    initParallax();
    initMagneticButtons();
    initHeader();
    initHeroAnimations();
    initHeroSlider();
    initTowerParallax();
    initPortfolioFilter();
    // initMobileMenu(); // Disabled because each HTML file has its own inline script for mobile menu toggle
    initContentSync();
    initContactForm();
    
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
        loader.style.pointerEvents = 'none';
    }
});

let heroLoopResizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(heroLoopResizeTimer);
    heroLoopResizeTimer = setTimeout(() => refreshHeroBehindTextLoop(), 120);
});
window.addEventListener('load', () => refreshHeroBehindTextLoop());
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => refreshHeroBehindTextLoop());
}

function updatePageDirection(lang) {
    const isRtl = lang === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.classList.remove('rtl-mode', 'ltr-mode');
    document.body.classList.add(isRtl ? 'rtl-mode' : 'ltr-mode');

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

async function loadDynamicContent(force = false) {
    const params = new URLSearchParams(window.location.search);
    const isAdminPreview = params.get('adminPreview') === '1';
    if (isAdminPreview) {
        const draftRaw = localStorage.getItem('adminLivePreviewDraft');
        if (draftRaw) {
            try {
                siteContent = JSON.parse(draftRaw);
                window.siteContent = siteContent;
                normalizeContactContent(siteContent);
                normalizeSocialContent(siteContent);
                normalizePortfolioSections(siteContent);
                return;
            } catch (e) {
                console.warn('Failed to parse admin live preview draft, fallback to API.', e);
            }
        }
    }

    const cacheBust = `ts=${Date.now()}`;
    try {
        const res = await fetchWithFallback('api/content', { cache: 'no-store' });
        siteContent = await res.json();
        window.siteContent = siteContent;
        try {
            localStorage.setItem('siteContentCache', JSON.stringify(siteContent));
        } catch (_) {}
        normalizeContactContent(siteContent);
        normalizeSocialContent(siteContent);
        normalizePortfolioSections(siteContent);
        return;
    } catch (e) {
        console.error('API content load failed, trying local JSON fallback:', e);
    }

    // Prefer last saved admin cache before static JSON fallback.
    try {
        const cached = localStorage.getItem('siteContentCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
                siteContent = parsed;
                window.siteContent = siteContent;
                normalizeContactContent(siteContent);
                normalizeSocialContent(siteContent);
                normalizePortfolioSections(siteContent);
                return;
            }
        }
    } catch (e) {
        console.warn('Failed to parse siteContentCache, trying local JSON fallback.', e);
    }

    const localSources = [`./data/content.json?${cacheBust}`, `data/content.json?${cacheBust}`];
    for (const source of localSources) {
        try {
            const res = await fetch(source, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to load ${source}`);
            siteContent = await res.json();
            window.siteContent = siteContent;
            try {
                localStorage.setItem('siteContentCache', JSON.stringify(siteContent));
            } catch (_) {}
            normalizeContactContent(siteContent);
            normalizeSocialContent(siteContent);
            normalizePortfolioSections(siteContent);
            return;
        } catch (e) {
            console.error(`Load error from ${source}:`, e);
        }
    }

    // Last safe fallback after local files.
    try {
        const cached = localStorage.getItem('siteContentCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
                siteContent = parsed;
                window.siteContent = siteContent;
                normalizeContactContent(siteContent);
                normalizeSocialContent(siteContent);
                normalizePortfolioSections(siteContent);
                return;
            }
        }
    } catch (e) {
        console.warn('Failed to parse local cached content, continue to static fallback.', e);
    }

    console.error("All content sources failed, using static fallback data");
    siteContent = FALLBACK_CONTENT;
    window.siteContent = siteContent; // Global sync
    normalizeContactContent(siteContent);
    normalizeSocialContent(siteContent);
    normalizePortfolioSections(siteContent);
}

async function refreshDynamicContentIfNeeded(force = false) {
    const currentToken = localStorage.getItem('contentUpdatedAt') || '';
    if (!force && currentToken === lastContentUpdateToken) return;

    lastContentUpdateToken = currentToken;
    await loadDynamicContent(true); // Force fetch new data
    applyLanguageContent();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
}

function slugifySectionId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `section-${Date.now()}`;
}

function escapeHtml(text) {
    return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getDefaultPortfolioSections(ui = {}) {
    return DEFAULT_PORTFOLIO_SECTIONS.map(section => ({
        ...section,
        ar: section.id === 'all' ? (ui.ar?.all || section.ar) : section.ar,
        en: section.id === 'all' ? (ui.en?.all || section.en) : section.en
    }));
}

function normalizeSocialContent(data) {
    if (!data) return;

    const currentSocial = data.social || {};
    const normalizedSocial = {};

    SOCIAL_LINK_ORDER.forEach(platform => {
        const raw = currentSocial[platform];
        if (typeof raw === 'string') {
            normalizedSocial[platform] = {
                url: raw,
                active: raw !== '#' && raw.trim() !== ''
            };
            return;
        }

        normalizedSocial[platform] = {
            url: raw?.url || '',
            active: raw?.active !== undefined ? !!raw.active : !!raw?.url
        };
    });

    data.social = normalizedSocial;

    const currentIcons = data.socialIcons || {};
    const normalizedIcons = {};

    Object.entries(SOCIAL_ICON_DEFAULTS).forEach(([platform, def]) => {
        const raw = currentIcons[platform] || {};
        normalizedIcons[platform] = {
            type: raw.type === 'custom' ? 'custom' : 'font',
            iconClass: raw.iconClass || def.iconClass,
            customIcon: raw.customIcon || ''
        };
    });

    data.socialIcons = normalizedIcons;
}

function normalizeContactContent(data) {
    if (!data) return;
    if (!data.contact || typeof data.contact !== 'object') data.contact = {};
    // Keep admin values as the source of truth; only provide fallback defaults when empty.
    const phone = String(data.contact.phone || '').trim();
    const whatsapp = String(data.contact.whatsapp || '').trim();
    data.contact.phone = phone || DEFAULT_CONTACT_PHONE;
    data.contact.whatsapp = whatsapp || DEFAULT_CONTACT_WHATSAPP;
}

function getSocialUrl(data, platform) {
    if (platform === 'whatsapp') {
        return data?.contact?.whatsapp || '';
    }

    const entry = data?.social?.[platform];
    if (typeof entry === 'string') return entry;
    return entry?.url || '';
}

function isSocialActive(data, platform) {
    if (platform === 'whatsapp') {
        return !!getSocialUrl(data, platform);
    }

    const entry = data?.social?.[platform];
    if (typeof entry === 'string') {
        return entry !== '#' && entry.trim() !== '';
    }

    return !!entry?.active && !!entry?.url;
}

function getSocialIconMarkup(data, platform, label = '', options = {}) {
    const config = data?.socialIcons?.[platform] || {};
    const globalConfig = data?.socialIconsGlobal || {};
    const fallback = SOCIAL_ICON_DEFAULTS[platform] || { iconClass: 'fas fa-link' };
    const iconClass = config.iconClass || fallback.iconClass;

    let style = '';
    const bgColor = options.noBg ? 'transparent' : (config.bgColor || globalConfig.bgColor || '#C7A252');
    const iconColor = config.iconColor || globalConfig.color || '#000000';
    const size = options.noSize ? '' : (config.size || globalConfig.size || '45');
    const shape = config.shape || globalConfig.shape || 'circle';

    if (bgColor) style += `background:${bgColor};`;
    if (iconColor) style += `color:${iconColor};`;
    if (size) style += `width:${size}px;height:${size}px;`;

    if (!options.noBg) {
        if (shape === 'circle') {
            style += 'border-radius:50%;';
        } else if (shape === 'square') {
            style += 'border-radius:0;';
        } else if (shape === 'rounded') {
            style += 'border-radius:12px;';
        } else if (shape === 'none') {
            style += 'background:transparent;border-radius:0;';
        }
    }

    if (config.type === 'custom' && config.customIcon) {
        return `<img src="${escapeHtml(config.customIcon)}" alt="${escapeHtml(label || fallback.label || platform)}" class="social-icon-media" style="${style}">`;
    }

    return `<i class="${escapeHtml(iconClass)}" aria-hidden="true" style="${style}"></i>`;
}

function renderSocialLinks(data) {
    document.querySelectorAll('.social-links[data-social-style]').forEach(container => {
        const style = container.dataset.socialStyle || 'minimal';
        const customLinkClass = (container.dataset.socialLinkClass || '').trim();
        const linkClass = customLinkClass || (style === 'contact' ? 'social-link' : 'social-link-item');
        const activePlatforms = SOCIAL_LINK_ORDER.filter(platform => isSocialActive(data, platform));

        container.innerHTML = activePlatforms.map(platform => {
            const href = getSocialUrl(data, platform);
            const label = SOCIAL_ICON_DEFAULTS[platform]?.label || platform;
            return `<a href="${escapeHtml(href)}" class="${linkClass}" target="_blank" rel="noopener noreferrer" data-hover aria-label="${escapeHtml(label)}">
                ${getSocialIconMarkup(data, platform, label)}
            </a>`;
        }).join('');
    });

    // Legacy footers that still use `.footer-social` without dynamic markers.
    document.querySelectorAll('.footer-social:not(.social-links)').forEach(container => {
        const activePlatforms = SOCIAL_LINK_ORDER.filter(platform => isSocialActive(data, platform));
        container.innerHTML = activePlatforms.map(platform => {
            const href = getSocialUrl(data, platform);
            const label = SOCIAL_ICON_DEFAULTS[platform]?.label || platform;
            return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}">
                ${getSocialIconMarkup(data, platform, label, { noBg: true, noSize: true })}
            </a>`;
        }).join('');
    });
}

function removeFooterServicesSections() {
    const serviceTitles = ['خدماتنا', 'our services', 'services'];
    document.querySelectorAll('footer .footer-title, footer .footer-column h4, footer h4').forEach((titleEl) => {
        const title = String(titleEl.textContent || '').trim().toLowerCase();
        if (!serviceTitles.includes(title)) return;
        const block = titleEl.closest('.footer-column') || titleEl.closest('div');
        if (block) block.remove();
    });
}

function applyHomeVisibility(contentData) {
    const saved = (contentData && typeof contentData.homeVisibility === 'object') ? contentData.homeVisibility : {};
    const hasFeaturedSelection = Array.isArray(contentData?.featuredProjectIds) && contentData.featuredProjectIds.length > 0;
    const visibility = {
        hero: saved.hero !== false,
        services: saved.services !== false,
        stats: saved.stats !== false,
        // If admin selected featured projects, keep this section visible.
        featured: hasFeaturedSelection ? true : (saved.featured !== false),
        cta: saved.cta !== false,
        whatsapp: saved.whatsapp !== false
    };

    const toggleSelectors = (selectors, isVisible) => {
        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => {
                el.style.display = isVisible ? '' : 'none';
            });
        });
    };

    toggleSelectors(['#homeHero'], visibility.hero);
    toggleSelectors(['section.lux-services', '.services-preview'], visibility.services);
    toggleSelectors(['section.lux-stats', '.projects-counter-section', '.stats-section'], visibility.stats);
    toggleSelectors(['.featured-projects-section', '.projects-mini-grid', '.scroll-projects-grid', '.portfolio-preview'], visibility.featured);
    toggleSelectors(['section.lux-cta', '.cta'], visibility.cta);
    toggleSelectors(['.whatsapp-float'], visibility.whatsapp);
}

function updateSiteWhatsAppIcons(data) {
    const whatsappUrl = getSocialUrl(data, 'whatsapp') || '#';
    const whatsappIcon = getSocialIconMarkup(data, 'whatsapp', 'WhatsApp');
    const whatsappIconNoBg = getSocialIconMarkup(data, 'whatsapp', 'WhatsApp', { noBg: true, noSize: true });

    document.querySelectorAll('.whatsapp-float').forEach(link => {
        link.href = whatsappUrl;
        link.innerHTML = whatsappIconNoBg;
    });

    document.querySelectorAll('.btn-whatsapp').forEach(link => {
        link.href = whatsappUrl;
        const oldIcon = link.querySelector('i, img, .social-icon-media');
        if (oldIcon) {
            oldIcon.outerHTML = whatsappIconNoBg;
        } else {
            link.insertAdjacentHTML('afterbegin', whatsappIconNoBg);
        }
    });

    document.querySelectorAll('.contact-method.whatsapp').forEach(link => {
        link.href = whatsappUrl;
        const iconBox = link.querySelector('.method-icon');
        if (iconBox) iconBox.innerHTML = whatsappIconNoBg;
    });
}

function syncContactBindings(data, lang) {
    if (!data || !data.contact) return;

    const phone = data.contact.phone || '';
    const email = data.contact.email || '';
    const address = data.contact[lang]?.address || data.contact.ar?.address || data.contact.en?.address || '';
    const addressHtml = escapeHtml(address).replace(/\s*\|\s*/g, '<br>');
    const whatsappUrl = getSocialUrl(data, 'whatsapp') || '#';
    const phoneDigits = String(phone).replace(/[^\d+]/g, '');

    document.querySelectorAll('[data-content="address"]').forEach(el => { el.innerHTML = addressHtml; });
    document.querySelectorAll('[data-content="phone"]').forEach(el => { el.textContent = phone; el.style.direction = 'ltr'; el.style.unicodeBidi = 'embed'; });
    document.querySelectorAll('[data-content="email"]').forEach(el => { el.textContent = email; });

    document.querySelectorAll('.nav-call a').forEach(link => {
        link.textContent = phone;
        link.style.direction = 'ltr';
        link.style.unicodeBidi = 'embed';
        link.href = whatsappUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        if (!link.closest('.nav-call')) {
            if (phoneDigits) link.href = `tel:${phoneDigits}`;
        }
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        if (email) {
            link.href = `mailto:${email}`;
            if (!link.querySelector('i, img, .social-icon-media')) {
                link.textContent = email;
            }
        }
    });
    document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
        try {
            const target = new URL(whatsappUrl, window.location.origin);
            const current = new URL(link.href, window.location.origin);
            const text = current.searchParams.get('text');
            if (text) target.searchParams.set('text', text);
            link.href = target.toString();
        } catch (_) {
            link.href = whatsappUrl;
        }
    });

    document.querySelectorAll('.contact-info-card').forEach(card => {
        const valueEl = card.querySelector('.contact-info-value');
        if (!valueEl) return;
        if (card.querySelector('.fa-whatsapp')) {
            valueEl.textContent = phone;
            valueEl.style.direction = 'ltr';
            card.href = whatsappUrl;
        } else if (card.querySelector('.fa-envelope')) {
            valueEl.textContent = email;
            if (email) card.href = `mailto:${email}`;
        } else if (card.querySelector('.fa-phone, .fa-phone-alt')) {
            valueEl.textContent = phone;
            valueEl.style.direction = 'ltr';
            if (phoneDigits) card.href = `tel:${phoneDigits}`;
        } else if (card.querySelector('.fa-map-marker-alt')) {
            valueEl.innerHTML = addressHtml;
        }
    });

    // Update footer contact blocks (static HTML across many pages).
    const updateIconTextBlock = (iconSelector, textHtml, href = '') => {
        const makeLink = () => {
            if (!href) return textHtml;
            const isExternal = /^https?:\/\//i.test(href);
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${escapeHtml(href)}"${targetAttr} style="color:inherit;text-decoration:none;">${textHtml}</a>`;
        };
        const linkedText = makeLink();
        document.querySelectorAll(iconSelector).forEach((icon) => {
            const footerItem = icon.closest('.footer-contact-item');
            if (footerItem) {
                const textNode = footerItem.querySelector('span');
                if (textNode) textNode.innerHTML = linkedText;
                return;
            }
            const listItem = icon.closest('li');
            if (listItem) {
                listItem.innerHTML = `${icon.outerHTML} ${linkedText}`;
            }
        });
    };

    if (phone) updateIconTextBlock('.fa-phone, .fa-phone-alt', escapeHtml(phone), whatsappUrl);
    if (email) updateIconTextBlock('.fa-envelope', escapeHtml(email), `mailto:${email}`);
    if (addressHtml) updateIconTextBlock('.fa-map-marker-alt, .fa-location-dot', addressHtml);
}

function normalizePortfolioSections(data) {
    if (!data) return;

    const defaults = getDefaultPortfolioSections(data.ui || {});
    const existing = Array.isArray(data.portfolioSections) ? data.portfolioSections : [];
    const existingMap = new Map(
        existing
            .filter(section => section && section.id)
            .map(section => [slugifySectionId(section.id), section])
    );

    const merged = defaults.map(section => {
        const current = existingMap.get(section.id) || {};
        existingMap.delete(section.id);
        return {
            id: section.id,
            ar: current.ar || section.ar,
            en: current.en || section.en,
            active: current.active !== undefined ? !!current.active : section.active !== false,
            system: section.system || !!current.system
        };
    });

    existingMap.forEach(section => {
        const id = slugifySectionId(section.id);
        if (!id || id === 'all') return;
        merged.push({
            id,
            ar: section.ar || section.id,
            en: section.en || section.id,
            active: section.active !== false,
            system: !!section.system
        });
    });

    data.portfolioSections = merged;

    if (Array.isArray(data.portfolio)) {
        data.portfolio = data.portfolio.map(project => {
            const currentType = slugifySectionId(project?.type || 'apartment');
            const validType = merged.some(section => section.id === currentType && section.id !== 'all')
                ? currentType
                : (merged.find(section => section.id !== 'all')?.id || 'apartment');
            return {
                ...project,
                type: validType
            };
        });
    }
}

function renderPortfolioFilters(data, lang) {
    const container = document.querySelector('.portfolio-filter');
    if (!container) return;

    const savedFilter = container.dataset.currentFilter || container.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const sections = (data.portfolioSections || []).filter(section => section.active !== false);
    const hasAll = sections.some(section => section.id === 'all');
    const list = hasAll ? sections : [{ id: 'all', ar: 'الكل', en: 'All', active: true, system: true }, ...sections];

    container.innerHTML = list.map(section => `
        <button class="filter-btn${section.id === savedFilter ? ' active' : ''}" data-filter="${section.id}" data-hover type="button">
            ${escapeHtml(section[lang] || section.en || section.id)}
        </button>
    `).join('');

    const nextFilter = list.some(section => section.id === savedFilter) ? savedFilter : 'all';
    container.dataset.currentFilter = nextFilter;
    applyPortfolioFilter(nextFilter);
}

function applyPortfolioFilter(filter) {
    const container = document.querySelector('.portfolio-filter');
    if (container) {
        container.dataset.currentFilter = filter;
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }

    const allItems = document.querySelectorAll('.portfolio-item');
    if (filter === 'all') {
        // Show ALL items when "الكل" is selected
        allItems.forEach(item => {
            item.style.display = 'block';
        });
    } else {
        // Show only items matching the selected category
        allItems.forEach(item => {
            const itemCategory = item.getAttribute('data-category') || '';
            item.style.display = (itemCategory === filter) ? 'block' : 'none';
        });
    }
}

function setTextPreserveIcon(el, text) {
    if (!el || !text) return;
    const icon = el.querySelector('i');
    if (!icon) {
        el.textContent = text;
        return;
    }
    Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
    el.appendChild(document.createTextNode(' ' + text));
}

const STATIC_TEXT_PAIRS = [
    ['الرئيسية', 'Home'],
    ['مشاريعنا', 'Our Projects'],
    ['خدماتنا', 'Our Services'],
    ['من نحن', 'About Us'],
    ['مدونتنا', 'Our Blog'],
    ['اتصل بنا', 'Contact Us'],
    ['احجز استشارتك', 'Book Consultation'],
    ['اقرأ المزيد', 'Read More'],
    ['واتساب', 'WhatsApp'],
    ['الاسم الكامل', 'Full Name'],
    ['رقم الهاتف', 'Phone Number'],
    ['البريد الإلكتروني', 'Email'],
    ['تفاصيل المشروع', 'Project Details'],
    ['نوع المشروع', 'Project Type'],
    ['اختر نوع المشروع', 'Select Project Type'],
    ['أرسل رسالة', 'Send Message'],
    ['عرض الألبوم', 'View Album'],
    ['اطلب الخدمة الآن', 'Order Service Now'],
    ['جاهز لتحويل حلمك إلى واقع؟', 'Ready to turn your dream into reality?'],
    ['ابدأ مشروعك الآن', 'Start Your Project Now']
];

function buildStaticMap(targetLang) {
    if (targetLang === 'en') {
        return Object.fromEntries(STATIC_TEXT_PAIRS.map(([ar, en]) => [ar, en]));
    }
    return Object.fromEntries(STATIC_TEXT_PAIRS.map(([ar, en]) => [en, ar]));
}

function translateByMap(rawValue, map) {
    if (!rawValue || typeof rawValue !== 'string') return rawValue;
    let result = rawValue;
    // Replace longer phrases first for better accuracy.
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    keys.forEach(key => {
        if (!key) return;
        if (result.includes(key)) {
            result = result.split(key).join(map[key]);
        }
    });
    return result;
}

function translateStaticPageText(targetLang) {
    const map = buildStaticMap(targetLang);

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            if (parent.closest('script, style, textarea, .lang-tabs, .lang-btn, .mobile-lang-switch')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {
        const translated = translateByMap(node.nodeValue, map);
        if (translated !== node.nodeValue) {
            node.nodeValue = translated;
        }
    });

    document.querySelectorAll('[placeholder]').forEach(el => {
        const translated = translateByMap(el.getAttribute('placeholder'), map);
        if (translated) el.setAttribute('placeholder', translated);
    });

    document.querySelectorAll('[title]').forEach(el => {
        const translated = translateByMap(el.getAttribute('title'), map);
        if (translated) el.setAttribute('title', translated);
    });

    document.querySelectorAll('[aria-label]').forEach(el => {
        const translated = translateByMap(el.getAttribute('aria-label'), map);
        if (translated) el.setAttribute('aria-label', translated);
    });
}

function applyCommonStaticTranslations(ui) {
    if (!ui) return;

    document.querySelectorAll('.nav-links a[href="index.html"]').forEach(el => el.textContent = ui.home || el.textContent);
    document.querySelectorAll('.nav-links a[href="portfolio.html"]').forEach(el => el.textContent = ui.projects || el.textContent);
    document.querySelectorAll('.nav-links a[href="services.html"]').forEach(el => el.textContent = ui.services || el.textContent);
    document.querySelectorAll('.nav-links a[href="about.html"]').forEach(el => el.textContent = ui.about || el.textContent);
    document.querySelectorAll('.nav-links a[href="blog.html"]').forEach(el => el.textContent = ui.blog || el.textContent);
    document.querySelectorAll('.nav-links a[href="contact.html"]').forEach(el => el.textContent = ui.contact || el.textContent);
    document.querySelectorAll('.nav-cta').forEach(el => el.textContent = ui.book_consultation || el.textContent);

    document.querySelectorAll('.footer-links a[href="index.html"]').forEach(el => setTextPreserveIcon(el, ui.home || el.textContent));
    document.querySelectorAll('.footer-links a[href="portfolio.html"]').forEach(el => setTextPreserveIcon(el, ui.projects || el.textContent));
    document.querySelectorAll('.footer-links a[href="services.html"]').forEach(el => setTextPreserveIcon(el, ui.services || el.textContent));
    document.querySelectorAll('.footer-links a[href="about.html"]').forEach(el => setTextPreserveIcon(el, ui.about || el.textContent));
    document.querySelectorAll('.footer-links a[href="blog.html"]').forEach(el => setTextPreserveIcon(el, ui.blog || el.textContent));
    document.querySelectorAll('.footer-links a[href="contact.html"]').forEach(el => setTextPreserveIcon(el, ui.contact || el.textContent));
}

function applyLanguageContent() {
    if (!siteContent) {
        return;
    }
    
    const isEnglishStaticPage = (window.location.pathname || '').toLowerCase().includes('-en.html');
    const lang = isEnglishStaticPage ? 'en' : currentLang;
    const data = siteContent;
    applyDesignSystemFromContent(data);
    applyUiEffectsFromContent(data);
    updatePageDirection(lang);

    // Branding
    if (data.branding) {
        if (data.branding[lang]) {
            document.querySelectorAll('.logo-text, .nav-logo-text, .footer-logo-text').forEach(el => {
                el.textContent = data.branding[lang].siteName;
            });
            document.querySelectorAll('.ref-branding small').forEach(el => el.textContent = data.branding[lang].tagline);
            document.title = data.branding[lang].siteName + ' | ' + data.branding[lang].tagline;
        }
        
        if (data.branding.logo) {
            const logoUrl = getMediaUrl({ image: data.branding.logo });
            document.querySelectorAll('img.nav-logo-img, img.logo-img, .nav-logo > img, .checkout-notice-nav .nav-logo > img').forEach(el => {
                el.src = logoUrl;
                el.alt = el.alt || 'Logo';
            });
            document.querySelectorAll('.logo-icon-wrapper, .nav-logo-icon, .footer-logo-icon, .logo-icon').forEach(el => {
                const existingImg = el.querySelector('img');
                if (existingImg) {
                    existingImg.src = logoUrl;
                    existingImg.alt = existingImg.alt || 'Logo';
                } else {
                    el.innerHTML = `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="nav-logo-img" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;">`;
                }
            });
        }

        const loaderLogoSource = data.loaderSettings?.logo || data.branding.logo;
        if (loaderLogoSource) {
            const loaderLogoUrl = getMediaUrl({ image: loaderLogoSource });
            document.querySelectorAll('img.loader-img, .loader-logo img').forEach(el => {
                el.src = loaderLogoUrl;
                el.alt = el.alt || 'Loading Logo';
            });
            document.querySelectorAll('.loader-logo').forEach(el => {
                if (!el.querySelector('img')) {
                    el.innerHTML = `<img src="${escapeHtml(loaderLogoUrl)}" alt="Loading Logo" class="loader-img" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;">`;
                }
            });
        }

        const faviconSource = data.branding.favicon || data.branding.logo;
        if (faviconSource) {
            const faviconUrl = getMediaUrl({ image: faviconSource });
            const upsertLink = (selector, relValue) => {
                let link = document.querySelector(selector);
                if (!link) {
                    link = document.createElement('link');
                    link.setAttribute('rel', relValue);
                    document.head.appendChild(link);
                }
                link.setAttribute('href', faviconUrl);
            };
            upsertLink("link[rel='icon']", 'icon');
            upsertLink("link[rel='shortcut icon']", 'shortcut icon');
            upsertLink("link[rel='apple-touch-icon']", 'apple-touch-icon');
        }
    }

    // All data-i18n elements
    if (data.ui && data.ui[lang]) {
        const ui = data.ui[lang];
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const translation = ui[key];
            if (translation) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translation;
                } else if (el.tagName === 'SELECT') {
                    el.querySelectorAll('option').forEach(opt => {
                        const optKey = opt.dataset.i18n;
                        if (optKey && ui[optKey]) opt.textContent = ui[optKey];
                    });
                } else {
                    el.textContent = translation;
                }
            }
        });
        applyCommonStaticTranslations(ui);
    }

    // Hero Slides
    if (data.hero && data.hero.slides && data.hero.slides.length > 0) {
        normalizeHeroTextStyleRuntime(data.hero);
        renderHomeHeroSlides(data, lang);
        applyHeroTextStyles(data.hero);

        // Initial setup for the first slide if needed
        const slide = data.hero.slides.find((item) => item?.enabled !== false) || data.hero.slides[0];
        if (slide && slide[lang]) {
            const hTitle = document.querySelector('.hero-title');
            const hSub = document.querySelector('.hero-subtitle');
            const hTitleLux = document.querySelector('.hero-title-lux');
            const hSubLux = document.querySelector('.hero-subtitle-lux');
            const hImgContainer = document.querySelector('.hero-image-container');
            if (hTitle) hTitle.innerHTML = (slide[lang].title || '').replace(/\n/g, '<br>');
            if (hSub) hSub.textContent = slide[lang].subtitle || '';
            if (hTitleLux) hTitleLux.innerHTML = (slide[lang].title || '').replace(/\n/g, '<br>');
            if (hSubLux) hSubLux.textContent = slide[lang].subtitle || '';
            setHeroBehindTextContent(slide, lang);
            if (hImgContainer) {
                const mediaUrl = getMediaUrl(slide);
                const isVideo = slide.mediaType === 'video' || (mediaUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i));
                if (isVideo && mediaUrl) {
                    hImgContainer.innerHTML = `<video src="${mediaUrl}" autoplay muted loop playsinline class="hero-main-img" style="width:100%;height:100%;object-fit:cover;"></video>`;
                } else if (mediaUrl) {
                    hImgContainer.innerHTML = `<img src="${mediaUrl}" alt="" class="hero-main-img">`;
                }
            }
        }
        // Re-initialize slider with new content
        if (typeof initHeroSlider === 'function') {
            initHeroSlider();
        }
    }

    // About section
    if (data.about && data.about[lang]) {
        document.querySelectorAll('[data-content="about-text"]').forEach(el => {
            el.textContent = data.about[lang].text || data.about[lang].shortText;
        });
        const abPageTitle = document.querySelector('[data-content="about-page-title"]');
        if (abPageTitle) abPageTitle.textContent = lang === 'ar' ? 'من نحن' : 'About Us';
        const abPageSub = document.querySelector('[data-content="about-page-subtitle"]');
        if (abPageSub) abPageSub.textContent = data.about[lang].shortText;
        document.querySelectorAll('[data-stat="experience"]').forEach(el => el.textContent = data.about[lang].stats.experience);
        document.querySelectorAll('[data-stat="projects"]').forEach(el => el.textContent = data.about[lang].stats.projects);
    }

    // About story image
    if (data.about && data.about.image) {
        const storyImg = document.querySelector('[data-content="about-story-image"]');
        if (storyImg) {
            storyImg.src = getMediaUrl({ image: data.about.image });
        }
    }

    // Contact
    syncContactBindings(data, lang);

    renderSocialLinks(data);
    updateSiteWhatsAppIcons(data);
    removeFooterServicesSections();
    renderPortfolioFilters(data, lang);
    updateDynamicGrids(data, lang);
    applyHomeVisibility(data);
    normalizeInternalLinksForLanguage(lang);
    applyUiEffectsTargets(getUiEffectsSettings(data));
    setTimeout(initProjectDisplayMotion, 0);
}

function renderHomeHeroSlides(data, lang) {
    const heroContainer = document.getElementById('heroSlidesContainer');
    if (!heroContainer) return;

    const heroSection = document.getElementById('homeHero');
    const heroPrevBtn = document.getElementById('heroNavPrev');
    const heroNextBtn = document.getElementById('heroNavNext');
    const allSlidesRaw = Array.isArray(data?.hero?.slides) ? data.hero.slides : [];
    const allSlides = allSlidesRaw.filter((slide) => slide?.enabled !== false);
    const videoOnlyMode = data?.hero?.videoOnlyMode === true;
    const slidesToRender = videoOnlyMode
        ? (() => {
            const firstVideo = allSlides.find((slide) => {
                const mediaUrl = getMediaUrl(slide) || '';
                return slide?.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl);
            });
            const fallbackSlide = allSlides.find((slide) => !!getMediaUrl(slide));
            return firstVideo ? [firstVideo] : (fallbackSlide ? [fallbackSlide] : []);
        })()
        : allSlides;

    if (!slidesToRender.length) {
        heroContainer.innerHTML = '';
        if (heroSection) heroSection.classList.remove('hero-layered-scene');
        if (heroPrevBtn) heroPrevBtn.style.display = 'none';
        if (heroNextBtn) heroNextBtn.style.display = 'none';
        applyHeroLayerMotion(data?.hero);
        return;
    }

    const hasLayeredScene = slidesToRender.some((slide) =>
        Boolean(
            (slide?.showBuilding !== false && slide?.buildingImage) ||
            (slide?.showCloudBack !== false && slide?.cloudBackImage) ||
            (slide?.showCloudFront !== false && slide?.cloudFrontImage)
        )
    );
    if (heroSection) heroSection.classList.toggle('hero-layered-scene', hasLayeredScene);

    heroContainer.innerHTML = slidesToRender.map((slide, i) => {
        const aspectClass = slide.aspectRatio ? `aspect-${slide.aspectRatio.replace(':', '-')}` : 'aspect-fill';
        const mediaUrl = getMediaUrl(slide);
        const buildingUrl = getMediaUrl(slide.buildingImage || '');
        const cloudBackUrl = getMediaUrl(slide.cloudBackImage || '');
        const cloudFrontUrl = getMediaUrl(slide.cloudFrontImage || '');
        
        // Use Cinematic Text from Admin Settings
        const ts = getHeroTextStyleSettings(data?.hero);
        const isRtlMode = document.documentElement.dir === 'rtl';
        const cinematic = ts.cinematicText || {};
        const langSettings = isRtlMode ? (cinematic.ar || {}) : (cinematic.en || {});
        
        let slideBehindText = isRtlMode ? (slide.ar?.behindText || "") : (slide.en?.behindText || "");
        const behindText = escapeHtml(String(langSettings.text || slideBehindText || (isRtlMode ? "نصمم مستقبل يعكس طموحك" : "We design future that reflects your ambition")).trim());
        
        const buildingOffsetX = Number.isFinite(Number(slide.buildingOffsetX)) ? Number(slide.buildingOffsetX) : 0;
        const buildingOffsetY = Number.isFinite(Number(slide.buildingOffsetY)) ? Number(slide.buildingOffsetY) : 0;
        const buildingScaleRaw = Number(slide.buildingScale);
        const buildingScale = Number.isFinite(buildingScaleRaw) ? Math.min(2, Math.max(0.6, buildingScaleRaw)) : 1;
        const buildingStyle = `style="--building-x:${Math.max(-450, Math.min(450, buildingOffsetX))}px;--building-y:${Math.max(-350, Math.min(350, buildingOffsetY))}px;--building-scale:${buildingScale};"`;
        const isVideo = slide.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl || '');
        const mediaHtml = isVideo
            ? `<video src="${mediaUrl}" autoplay muted loop playsinline preload="metadata" class="hero-main-img hero-main-video"></video>`
            : `<img src="${mediaUrl}" alt="${slide[lang]?.title || ''}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${i === 0 ? 'high' : 'low'}" class="hero-main-img">`;
        
        const behindTextHtml = (ts.cinematicText?.enabled && behindText)
            ? `<div class="marquee-wrapper" aria-hidden="true">
                <div class="marquee-track">
                    <div class="marquee-text">${behindText}</div>
                    <div class="marquee-text">${behindText}</div>
                </div>
               </div>`
            : '';
        const cloudBackHtml = (slide.showCloudBack !== false && cloudBackUrl)
            ? `<img src="${cloudBackUrl}" alt="" loading="lazy" decoding="async" fetchpriority="low" class="hero-layer-cloud hero-layer-cloud-back">`
            : '';

        // Optimization: If global tower parallax is enabled, we hide the building layer for the first slide 
        // because the parallax tower will take its place as a global overlay.
        const tower = data?.hero?.towerParallax;
        const isParallaxEnabled = tower && tower.enabled !== false;
        const buildingHtml = (slide.showBuilding !== false && buildingUrl && !(i === 0 && isParallaxEnabled))
            ? `<img src="${buildingUrl}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${i === 0 ? 'high' : 'low'}" class="hero-layer-building" ${buildingStyle}>`
            : '';

        const cloudFrontHtml = (slide.showCloudFront !== false && cloudFrontUrl)
            ? `<img src="${cloudFrontUrl}" alt="" loading="lazy" decoding="async" fetchpriority="low" class="hero-layer-cloud hero-layer-cloud-front">`
            : '';
        return `<div class="hero-slide ${aspectClass} ${i === 0 ? 'active' : ''}">
            <div class="hero-media-layer">${mediaHtml}</div>
            ${behindTextHtml}
            ${cloudBackHtml}
            ${buildingHtml}
            ${cloudFrontHtml}
        </div>`;
    }).join('');

    const showHeroArrows = !videoOnlyMode && slidesToRender.length > 1;
    if (heroSection) heroSection.classList.toggle('hero-video-only', !showHeroArrows);
    if (heroPrevBtn) heroPrevBtn.style.display = showHeroArrows ? '' : 'none';
    if (heroNextBtn) heroNextBtn.style.display = showHeroArrows ? '' : 'none';

    // Tower Parallax Support
    const tower = data?.hero?.towerParallax;
    if (tower && tower.enabled !== false && heroSection) {
        const isMobile = window.innerWidth < 1024;
        // Priority: 1. Global tower image, 2. Slide 1 building image, 3. Empty (hide)
        const towerImageUrl = getMediaUrl(tower.image) || (slidesToRender[0] ? getMediaUrl(slidesToRender[0].buildingImage) : '');
        const towerScale = isMobile ? (tower.scaleMobile || 1) : (tower.scale || 1);
        
        if (towerImageUrl) {
            let towerHtml = `
                <div class="hero-tower-parallax-container">
                    <img src="${towerImageUrl}" class="hero-tower-parallax-img" style="--tower-scale: ${towerScale}">
                </div>
            `;
            
            // Remove existing if any
            const existingTower = heroSection.querySelector('.hero-tower-parallax-container');
            if (existingTower) existingTower.remove();
            
            heroSection.insertAdjacentHTML('beforeend', towerHtml);
            initTowerParallax();
        }
    }

    applyHeroLayerMotion(data?.hero);
    applyHeroTextStyles(data?.hero);
    const firstSlideForBehindText = slidesToRender[0];
    if (firstSlideForBehindText) {
        setHeroBehindTextContent(firstSlideForBehindText, lang);
    }
}

function getMediaUrl(item) {
    if (!item) return '';
    
    let url = "";
    
    if (typeof item === 'string') {
        url = item;
    } else {
        // 1. Respect declared media type first
        if (item.mediaType === 'video') {
            url = item.video || item.image || "";
        } else if (item.mediaType === 'image') {
            url = item.image || item.video || "";
        } else {
            url = item.image || item.video || "";
        }
        
        // 2. Check images array (common in portfolio)
        if (!url && Array.isArray(item.images) && item.images.length > 0) {
            url = item.images[0];
        }
        
        // 3. Check slides array (common in projects)
        if (!url && Array.isArray(item.slides) && item.slides.length > 0) {
            const firstSlide = item.slides[0];
            url = firstSlide.image || firstSlide.video || "";
        }
    }
    
    if (!url || typeof url !== 'string' || url.trim() === "") return '';
    
    url = url.trim();
    
    // Final Path Normalization
    if (url.startsWith('http') || url.startsWith('data:')) return url; // Don't touch external URLs or base64
    
    // Remove leading slashes
    url = url.replace(/^\/+/, '');
    
    // Ensure path starts with uploads/
    if (!url.startsWith('uploads/')) {
        url = 'uploads/' + url;
    }
    
    // Use root-relative path (works on all hosting setups)
    url = '/' + url;
    
    // Fix double slashes
    url = url.replace(/\/\//g, '/');

    // Add cache-busting timestamp
    const ts = window.contentTs || Date.now();
    url += (url.includes('?') ? '&' : '?') + 'ts=' + ts;
    
    return url;
}

function getSlideMediaUrl(slide) {
    return getMediaUrl(slide) || slide.image || '';
}

function normalizeUrl(url, addCacheBust = true) {
    if (!url) return '';
    
    let normalized = url;
    if (typeof url === 'string') {
        // Remove leading slashes and ensure uploads/ prefix
        normalized = url.replace(/^\/+/, '');
        if (!normalized.startsWith('uploads/') && !normalized.startsWith('http')) {
            normalized = 'uploads/' + normalized;
        }
        // Convert to root-relative path
        if (!normalized.startsWith('http')) {
            normalized = '/' + normalized;
        }
    } else if (url && url.image) {
        normalized = url.image.replace(/^\/+/, '');
        if (!normalized.startsWith('uploads/') && !normalized.startsWith('http')) {
            normalized = 'uploads/' + normalized;
        }
        if (!normalized.startsWith('http')) {
            normalized = '/' + normalized;
        }
    }

    if (typeof normalized === 'string') {
        normalized = normalized.replace(/\/+/g, '/');
    }
    
    if (addCacheBust && window.contentTs && typeof normalized === 'string' && !normalized.includes('ts=')) {
        normalized += (normalized.includes('?') ? '&' : '?') + `ts=${window.contentTs}`;
    }
    return normalized;
}

function navigateToProjectDetail(index, targetPage) {
    const safeIndex = Math.max(0, Number(index) || 0);
    try {
        const portfolio = Array.isArray(window.siteContent?.portfolio) ? window.siteContent.portfolio : [];
        if (portfolio.length > 0) {
            localStorage.setItem('projectDetailPortfolioCache', JSON.stringify(portfolio));
        }
        localStorage.setItem('projectDetailTargetIndex', String(safeIndex));
        localStorage.setItem('projectDetailCachedAt', String(Date.now()));
    } catch (_) {}
    const fallbackPage = (currentLang === 'en') ? 'project-detail-en.html' : 'project-detail.html';
    const finalPage = targetPage || fallbackPage;
    window.location.href = `${finalPage}?id=${safeIndex}`;
}

function ensureFeaturedHomeContainers() {
    let miniGrid = document.querySelector('.projects-mini-grid');
    let scrollProjectsGrid = document.querySelector('.scroll-projects-grid');
    if (miniGrid && scrollProjectsGrid) return { miniGrid, scrollProjectsGrid };

    const servicesSection = document.querySelector('section.lux-services');
    const statsSection = document.querySelector('section.lux-stats');
    const ctaSection = document.querySelector('section.lux-cta');
    const anchor = statsSection || ctaSection;
    if (!servicesSection || !anchor || !anchor.parentNode) {
        return {
            miniGrid: miniGrid || null,
            scrollProjectsGrid: scrollProjectsGrid || null
        };
    }

    if (!document.getElementById('dynamicFeaturedProjectsStyles')) {
        const style = document.createElement('style');
        style.id = 'dynamicFeaturedProjectsStyles';
        style.textContent = `
            .featured-projects-section { padding: 70px 5%; background: #0f0f0f; }
            .featured-projects-title { color: #C7A252; font-size: 2rem; margin: 0 0 12px; font-weight: 700; }
            .featured-projects-subtitle { color: #aaa; margin: 0 0 24px; font-size: .95rem; }
            .projects-mini-grid, .scroll-projects-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
            .projects-mini-grid { margin-bottom: 16px; }
            .project-mini-card { position: relative; min-height: 180px; border-radius: 14px; overflow: hidden; border: 1px solid #2b2b2b; background: #151515; cursor: pointer; }
            .project-mini-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .project-mini-overlay { position: absolute; inset: auto 0 0 0; padding: 12px; background: linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.12)); }
            .project-mini-overlay h3 { margin: 0; color: #fff; font-size: .95rem; }
            .project-mini-overlay span { color: #cfcfcf; font-size: .78rem; }
        `;
        document.head.appendChild(style);
    }

    const section = document.createElement('section');
    section.className = 'featured-projects-section';
    section.innerHTML = `
        <div class="section-header fade-in">
            <h2 class="featured-projects-title">المشاريع المميزة</h2>
            <p class="featured-projects-subtitle">يتم التحكم فيها من لوحة الأدمن</p>
        </div>
        <div class="projects-mini-grid"></div>
        <div id="scrollProjectsCarousel" class="scroll-projects-grid"></div>
    `;
    anchor.parentNode.insertBefore(section, anchor);

    miniGrid = section.querySelector('.projects-mini-grid');
    scrollProjectsGrid = section.querySelector('.scroll-projects-grid');
    return { miniGrid, scrollProjectsGrid };
}

function updateDynamicGrids(data, lang) {
    if (!data || typeof data !== 'object') return;

    const isEnglishPage = lang === 'en' || (window.location.pathname || '').toLowerCase().includes('-en.html');
    const projectDetailPage = isEnglishPage ? 'project-detail-en.html' : 'project-detail.html';
    const servicesPage = isEnglishPage ? 'services-en.html' : 'services.html';
    const contactPage = isEnglishPage ? 'contact-en.html' : 'contact.html';

    // Services Grid (Home)
    if (data.services && data.services.length > 0) {
        const whyGrid = document.querySelector('.why-us-grid');
        if (whyGrid) {
            whyGrid.innerHTML = data.services.slice(0, 3).map((srv, i) => {
                const icon = srv.icon && srv.icon.startsWith('fa') ? `<i class="fas ${srv.icon}"></i>` : '';
                const mediaUrl = getMediaUrl(srv);
                // Keep cards lightweight on mobile; avoid hidden image preloads.
                const imgHtml = '';
                
                return `<a href="${servicesPage}#service-${i}" class="why-us-card" style="text-decoration:none">
                    <div class="card-icon">${icon}</div>
                    <h3>${srv[lang]?.title || ''}</h3>
                    <p>${srv[lang]?.description || ''}</p>
                    ${imgHtml}
                </a>`;
            }).join('');
        }

        const servicesShowcase = document.getElementById('servicesShowcase');
        if (servicesShowcase) {
            initMobileServiceCardStack(servicesShowcase);
        }
    }

    // Portfolio Mini
    if (data.portfolio && data.portfolio.length > 0) {
        const totalProjects = data.portfolio.length;
        const hasExplicitFeaturedConfig = Array.isArray(data.featuredProjectIds);
        const featuredIds = hasExplicitFeaturedConfig
            ? data.featuredProjectIds
                .map((value) => Number(value))
                .filter((index, pos, arr) => Number.isInteger(index) && index >= 0 && index < totalProjects && arr.indexOf(index) === pos)
            : [];
        const sourceIndices = hasExplicitFeaturedConfig
            ? featuredIds
            : Array.from({ length: Math.min(6, totalProjects) }, (_, i) => i);
        const featuredEntries = sourceIndices
            .map((projectIndex) => ({
                project: data.portfolio[projectIndex],
                index: projectIndex
            }))
            .filter((entry) => !!entry.project);
        const fallbackImage = '/uploads/20260424013231583519.png';

        // Home page: render selected featured projects in the main showcase area (instead of services cards).
        const isHomePage = !!document.getElementById('homeHero');
        const servicesShowcase = document.getElementById('servicesShowcase');
        if (isHomePage && servicesShowcase && featuredEntries.length > 0) {
            const isEnglish = lang === 'en';
            const sectionTitle = document.querySelector('.lux-services .section-title');
            const sectionSubtitle = document.querySelector('.lux-services .section-subtitle');
            if (sectionTitle) {
                sectionTitle.textContent = isEnglish ? 'Featured Projects' : 'المشاريع المميزة';
            }
            if (sectionSubtitle) {
                sectionSubtitle.textContent = isEnglish
                    ? 'Projects selected from admin panel'
                    : 'المشاريع التي تم اختيارها من لوحة الأدمن';
            }

            servicesShowcase.innerHTML = featuredEntries.map(({ project: proj, index }, i) => {
                const img = getMediaUrl(proj) || fallbackImage;
                const title = proj[lang]?.title || proj.ar?.title || proj.en?.title || (isEnglish ? `Project ${index + 1}` : `مشروع ${index + 1}`);
                const desc = proj[lang]?.description || proj.ar?.description || proj.en?.description || '';
                return `
                    <article class="service-card-lux ${i % 2 ? 'is-reversed' : ''} fade-in"
                             style="animation-delay:${i * 0.08}s; cursor:pointer;"
                             onclick="navigateToProjectDetail(${index}, '${projectDetailPage}')">
                        <div class="service-media-lux">
                            <img src="${img}" alt="${title}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.src='${fallbackImage}'">
                        </div>
                        <div class="service-content-lux">
                            <h3 class="service-title-lux">${title}</h3>
                            <div class="service-divider-lux"></div>
                            <p class="service-desc-lux">${desc}</p>
                        </div>
                        <span class="service-action-lux"><i class="fas fa-arrow-up-right-from-square"></i></span>
                    </article>
                `;
            }).join('');
            initMobileServiceCardStack(servicesShowcase);
        }

        const homeProjectContainers = ensureFeaturedHomeContainers();
        const miniGrid = homeProjectContainers.miniGrid;
        if (miniGrid) {
            miniGrid.innerHTML = featuredEntries.map(({ project: proj, index }) => {
                const img = getMediaUrl(proj) || fallbackImage;
                const title = proj[lang]?.title || proj.ar?.title || proj.en?.title || `Project ${index + 1}`;
                const category = proj[lang]?.category || proj.ar?.category || proj.en?.category || '';
                return `<div class="project-mini-card" onclick="navigateToProjectDetail(${index}, '${projectDetailPage}')">
                    <img src="${img}" alt="${title}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.src='${fallbackImage}'">
                    <div class="project-mini-overlay">
                        <h3>${title}</h3>
                        <span>${category}</span>
                    </div>
                </div>`;
            }).join('');
        }

        const scrollProjectsGrid = homeProjectContainers.scrollProjectsGrid;
        if (scrollProjectsGrid) {
            scrollProjectsGrid.innerHTML = featuredEntries.map(({ project: proj, index }) => {
                const img = getMediaUrl(proj) || fallbackImage;
                const title = proj[lang]?.title || proj.ar?.title || proj.en?.title || `Project ${index + 1}`;
                const category = proj[lang]?.category || proj.ar?.category || proj.en?.category || '';
                return `<div class="project-mini-card scroll-project-card" data-project-index="${index}" onclick="navigateToProjectDetail(${index}, '${projectDetailPage}')">
                    <img src="${img}" alt="${title}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.src='${fallbackImage}'">
                    <div class="project-mini-overlay">
                        <h3>${title}</h3>
                        <span>${category}</span>
                    </div>
                </div>`;
            }).join('');
            initScrollProjectsReveal();
        }
    }

    // Services Page
    const srvPage = document.querySelector('.services-grid-full');
    if (srvPage && data.services) {
        srvPage.innerHTML = data.services.map((srv, i) => {
            const mediaUrl = getMediaUrl(srv);
            if (!mediaUrl) return '';
            const isVideo = mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);
            const mediaHtml = isVideo
                ? `<video src="${mediaUrl}" autoplay muted loop playsinline class="service-vid" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`
                : `<img src="${mediaUrl}" alt="" loading="lazy" decoding="async" fetchpriority="low" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src=''">`;
            return `
            <div class="service-detail-card" id="service-${i}">
                <div class="service-img" style="background:#222; overflow:hidden; display:flex; align-items:center; justify-content:center;">${mediaHtml}</div>
                <div class="service-info">
                    <div class="service-icon-box"><i class="fas ${srv.icon}"></i></div>
                    <h2>${srv[lang]?.title || ''}</h2>
                    <p>${srv[lang]?.description || ''}</p>
                    <a href="${contactPage}" class="btn btn-primary">${data.ui[lang]?.order_now || ''}</a>
                </div>
            </div>`;
        }).join('');
    }

    // Portfolio Page
    const portPage = document.querySelector('.portfolio-grid-full');
    if (portPage && data.portfolio) {
        portPage.innerHTML = data.portfolio.map((proj, i) => {
            const mediaUrl = getMediaUrl(proj);
            const isVideo = mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);
            
            let mediaElement;
            if (isVideo) {
                mediaElement = `<video src="${mediaUrl}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
            } else if (mediaUrl) {
                mediaElement = `<img src="${mediaUrl}" alt="${proj[lang]?.title || ''}" loading="lazy" decoding="async" fetchpriority="low" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.opacity='0'">`;
            } else {
                mediaElement = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2a2a2a 0%,#1a1a1a 100%);">
                    <i class="fas fa-image" style="font-size:48px;color:#C7A252;opacity:0.6;"></i>
                </div>`;
            }
                
            return `<div class="portfolio-item" data-category="${proj.type}" onclick="navigateToProjectDetail(${i}, '${projectDetailPage}')">
                ${mediaElement}
                <div class="portfolio-overlay">
                    <h3>${proj[lang]?.title || ''}</h3>
                    <span>${proj[lang]?.category || ''}</span>
                </div>
            </div>`;
        }).join('');
        const activeFilter = document.querySelector('.portfolio-filter')?.dataset.currentFilter || 'all';
        applyPortfolioFilter(activeFilter);
    }

    // Team Section (About Page)
    const teamGrid = document.querySelector('#teamGrid, .team-grid');
    if (teamGrid && data.about && data.about.team && data.about.team.length > 0) {
        const settings = data.about.teamSettings || {};
        const imageHeight = settings.imageHeight || 350;
        const gridColumns = settings.gridColumns || 3;
        const imageObjectFit = settings.imageObjectFit || 'cover';

        teamGrid.innerHTML = data.about.team.map((member, i) => {
            const mediaUrl = getMediaUrl(member);
            return `<div class="team-card">
                <div class="team-image">
                    <img src="${mediaUrl}" alt="${member[lang]?.name || ''}" loading="lazy" decoding="async" fetchpriority="low" style="width:100%;height:${imageHeight}px;object-fit:${imageObjectFit};" onerror="this.src=''">
                    <div class="team-image-overlay"></div>
                    <div class="team-social">
                        ${renderMemberSocial(member.social, lang)}
                    </div>
                </div>
                <div class="team-info">
                    <h3 class="team-name">${member[lang]?.name || ''}</h3>
                    <p class="team-role">${member[lang]?.role || ''}</p>
                    ${member[lang]?.bio ? `<p class="team-bio">${member[lang].bio}</p>` : ''}
                </div>
            </div>`;
        }).join('');

        teamGrid.style.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;

        teamGrid.querySelectorAll('.team-skeleton').forEach(el => el.remove());

        setTimeout(() => {
            teamGrid.querySelectorAll('.team-card').forEach((card, i) => {
                setTimeout(() => card.classList.add('team-loaded'), i * 100);
            });
        }, 100);
    } else if (teamGrid) {
        const skeletonExists = teamGrid.querySelector('.team-skeleton');
        if (!skeletonExists && !teamGrid.querySelector('.team-empty')) {
            teamGrid.innerHTML = `
                <div class="team-empty">
                    <i class="fas fa-users"></i>
                    <p>لا يوجد أعضاء فريق حالياً</p>
                    <small>أضف أعضاء الفريق من لوحة التحكم</small>
                </div>
            `;
        }
    }

    // Timeline Section
    if (data.about && data.about.timeline && data.about.timeline.length > 0) {
        const timelineGrid = document.querySelector('.timeline');
        if (timelineGrid) {
            timelineGrid.innerHTML = data.about.timeline.map((item, i) => `
                <div class="timeline-item fade-in">
                    <div class="timeline-card">
                        <span class="timeline-year">${item.year || ''}</span>
                        <h3 class="timeline-title">${item[lang]?.title || ''}</h3>
                        <p class="timeline-desc">${item[lang]?.desc || ''}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

function renderMemberSocial(social, lang) {
    if (!social) return '';
    return Object.entries(social).map(([platform, info]) => {
        if (!info || !info.url) return '';
        return `<a href="${info.url}" target="_blank"><i class="fab fa-${platform}"></i></a>`;
    }).join('');
}

function initLanguageSwitcher() {
    // Support legacy markup like: <div class="nav-lang"><button>AR</button><button>EN</button></div>
    document.querySelectorAll('.nav-lang button').forEach(btn => {
        const label = (btn.textContent || '').trim().toLowerCase();
        if (!btn.dataset.lang && (label === 'ar' || label === 'en')) {
            btn.dataset.lang = label;
        }
        btn.classList.add('lang-btn');
    });

    const btns = document.querySelectorAll('.lang-btn[data-lang]');

    btns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const newLang = this.dataset.lang;
            
            // If switching to same language, do nothing
            if (newLang === currentLang) return;
            
            // Save the new language preference
            localStorage.setItem('siteLang', newLang);
            
            // Navigate to the corresponding language page
            const currentPath = window.location.pathname;
            let newPath = currentPath;
            
            if (newLang === 'en') {
                // Switch to English version
                if (currentPath.endsWith('.html') && !currentPath.includes('-en.html')) {
                    // Regular Arabic page -> English page
                    newPath = currentPath.replace('.html', '-en.html');
                } else if (currentPath.endsWith('/')) {
                    // Directory index -> English index
                    newPath = currentPath + 'index-en.html';
                }
            } else {
                // Switch to Arabic version
                if (currentPath.includes('-en.html')) {
                    // English page -> Regular Arabic page
                    newPath = currentPath.replace('-en.html', '.html');
                } else if (currentPath.endsWith('index-en.html')) {
                    // English index -> Regular index
                    newPath = currentPath.replace('index-en.html', 'index.html');
                }
            }
            
            // Only navigate if the path actually changed
            if (newPath !== currentPath) {
                window.location.href = newPath;
            } else {
                // If same page, just update language settings
                currentLang = newLang;
                updatePageDirection(currentLang);
                applyLanguageContent();
                if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            }
            
        });
    });

    // Ensure active state reflects current saved language at startup
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

}

function initMobileLanguageSwitcher() {
    if (document.querySelector('.mobile-lang-switch')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-lang-switch';
    wrapper.innerHTML = `
        <div class="nav-lang lang-switch-pro" role="group" aria-label="Language Switcher">
            <button type="button" class="lang-btn" data-lang="ar">AR</button>
            <button type="button" class="lang-btn" data-lang="en">EN</button>
        </div>
    `;

    document.body.appendChild(wrapper);
}

function initContentSync() {
    window.addEventListener('storage', async (event) => {
        if (event.key === 'adminLivePreviewUpdatedAt') {
            const isAdminPreview = new URLSearchParams(window.location.search).get('adminPreview') === '1';
            if (isAdminPreview) {
                await loadDynamicContent(true);
                applyLanguageContent();
                return;
            }
        }
        if (event.key !== 'contentUpdatedAt') return;
        await refreshDynamicContentIfNeeded(true);
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            await loadDynamicContent(true);
            applyLanguageContent();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }
    });

    window.addEventListener('focus', async () => {
        await loadDynamicContent(true);
        applyLanguageContent();
    });

    setInterval(() => {
        refreshContentFromServerIfUpdated();
    }, CONTENT_LIVE_SYNC_INTERVAL_MS);
}

function initLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        window.addEventListener('load', () => {
            gsap.to(loader, {
                opacity: 0,
                duration: 0.8,
                onComplete: () => {
                    loader.style.display = 'none';
                    loader.style.pointerEvents = 'none';
                }
            });
        });
    }
}

function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto')) {
            link.addEventListener('click', e => {
                e.preventDefault();
                const clickHref = toLanguageHref(link.getAttribute('href'), currentLang);
                const loader = document.getElementById('loader');
                if (loader && typeof gsap !== 'undefined') {
                    loader.style.display = 'flex';
                    gsap.fromTo(loader,
                        { opacity: 0 },
                        {
                            opacity: 1,
                            duration: 0.4,
                            onComplete: () => {
                                window.location.href = clickHref;
                            }
                        }
                    );
                } else {
                    window.location.href = clickHref;
                }
            });
        }
    });
}

function initCustomCursor() {
    const cursor = document.getElementById('cursor');
    const follower = document.getElementById('cursorFollower');
    if (cursor && follower && typeof gsap !== 'undefined') {
        document.addEventListener('mousemove', e => {
            gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1 });
            gsap.to(follower, { x: e.clientX, y: e.clientY, duration: 0.3 });
        });
    }
}

function initMouseParticles() {
    const container = document.getElementById('mouseParticleContainer');
    if (!container) return;

    let mouseX = 0, mouseY = 0;

    let rafPending = false;
    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
        });
    });
}

function initScrollAnimations() {
    if (typeof gsap === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('[data-scroll]').forEach(el => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                end: 'bottom 15%',
                toggleActions: 'play none none reverse'
            },
            y: 50,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out'
        });
    });

    document.querySelectorAll('[data-scroll-left]').forEach(el => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%'
            },
            x: -60,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        });
    });

    document.querySelectorAll('[data-scroll-right]').forEach(el => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%'
            },
            x: 60,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        });
    });

    document.querySelectorAll('[data-scroll-scale]').forEach(el => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%'
            },
            scale: 0.8,
            opacity: 0,
            duration: 1,
            ease: 'back.out(1.7)'
        });
    });

    document.querySelectorAll('.portfolio-item').forEach((el, i) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                toggleActions: 'play none none none'
            },
            y: 60,
            opacity: 0,
            duration: 1,
            delay: i * 0.12,
            ease: 'power2.out'
        });
    });

    document.querySelectorAll('.service-card, .project-card, .blog-card').forEach((el, i) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 90%'
            },
            y: 50,
            opacity: 0,
            duration: 0.9,
            delay: i * 0.08,
            ease: 'power2.out'
        });
    });

    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        gsap.from(section, {
            scrollTrigger: {
                trigger: section,
                start: 'top 80%'
            },
            backgroundPosition: '50% 0%',
            duration: 1.5
        });
    });
}

function init3DTiltEffect() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.service-card, .project-card, .portfolio-item').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            gsap.to(card, {
                rotateX: rotateX,
                rotateY: rotateY,
                transformPerspective: 1000,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
        });
    });
}

function initParallax() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.hero-main-img, .hero-bg-img').forEach(el => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            y: 150,
            ease: 'none'
        });
    });
}

function initMagneticButtons() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.btn, .social-link-item').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'elastic.out(1, 0.5)'
            });
        });
    });
}

function initHeader() {
    const header = document.querySelector('.header, .nav, .lux-nav');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
}

function initProjectsCounter() {
    const counter = document.querySelector('.projects-counter-number');
    const label = document.querySelector('.projects-counter-label');

    if (counter && label) {
        label.textContent = currentLang === 'ar'
            ? 'مشروع تم تنفيذه باحترافية'
            : 'Projects Delivered Professionally';
    }

    if (counter) {
        const target = Number(counter.dataset.counterTarget || '400');
        if (target && !Number.isNaN(target) && counter.dataset.animated !== 'true') {
            const animateCounter = () => {
                const duration = 1800;
                const startTime = performance.now();

                const step = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const value = Math.floor(target * eased);
                    counter.textContent = String(value);
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        counter.textContent = String(target);
                        counter.dataset.animated = 'true';
                    }
                };

                requestAnimationFrame(step);
            };

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            animateCounter();
                            observer.disconnect();
                        }
                    });
                }, { threshold: 0.35 });
                observer.observe(counter);
            } else {
                animateCounter();
            }
        }
    }

    // Home stats counters (.stat-number) - animate each card once.
    const statNumbers = Array.from(document.querySelectorAll('.stat-number[data-count]'));

    if ('IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                if (el.dataset.animated === 'true') return;
                const target = Number(el.dataset.count || '0');
                if (!Number.isFinite(target) || target <= 0) {
                    el.textContent = '0';
                    el.dataset.animated = 'true';
                    obs.unobserve(el);
                    return;
                }
                const duration = 1400;
                const start = performance.now();
                const from = 0;
                const step = (now) => {
                    const t = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - t, 3);
                    const value = Math.floor(from + (target - from) * eased);
                    el.textContent = String(value);
                    if (t < 1) {
                        requestAnimationFrame(step);
                    } else {
                        el.textContent = String(target);
                        el.dataset.animated = 'true';
                        obs.unobserve(el);
                    }
                };
                requestAnimationFrame(step);
            });
        }, { threshold: 0.35 });

        statNumbers.forEach((el) => statsObserver.observe(el));

        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            const gridObserver = new MutationObserver(() => {
                const newStatNumbers = statsGrid.querySelectorAll('.stat-number[data-count]:not([data-animated])');
                newStatNumbers.forEach((el) => {
                    statsObserver.observe(el);
                });
            });
            gridObserver.observe(statsGrid, { childList: true, subtree: true });
        }
    } else {
        statNumbers.forEach((el) => {
            const target = Number(el.dataset.count || '0');
            if (!Number.isFinite(target) || target <= 0) {
                el.textContent = '0';
                el.dataset.animated = 'true';
                return;
            }
            const duration = 1400;
            const start = performance.now();
            const from = 0;
            const step = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const value = Math.floor(from + (target - from) * eased);
                el.textContent = String(value);
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = String(target);
                    el.dataset.animated = 'true';
                }
            };
            requestAnimationFrame(step);
        });
    }
}

function initHeroAnimations() {
    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero-title', {
        y: 80,
        opacity: 0,
        duration: 1.5,
        skewY: 3
    })
    .from('.hero-subtitle', {
        y: 40,
        opacity: 0,
        duration: 1.2
    }, '-=1')
    .from('.slider-dots .dot', {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1
    }, '-=0.5')
    .from('.hero-image-container', {
        x: 100,
        opacity: 0,
        duration: 1.5,
        ease: 'power2.out'
    }, '-=1.2')
    .from('.hero-image-container img', {
        scale: 1.3,
        duration: 2,
        ease: 'power2.out'
    }, '-=1.5')
    .from('.why-us-section', {
        y: 50,
        opacity: 0,
        duration: 1
    }, '-=1')
    .from('.featured-projects-section', {
        y: 50,
        opacity: 0,
        duration: 1
    }, '-=0.8');

    const heroSection = document.querySelector('.hero-split');
    if (heroSection) {
        gsap.to('.hero-image-container img', {
            scrollTrigger: {
                trigger: heroSection,
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            scale: 1.2,
            ease: 'none'
        });

        gsap.to('.featured-projects-section', {
            scrollTrigger: {
                trigger: heroSection,
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            opacity: 0,
            y: -50,
            ease: 'none'
        });
    }
}

function initHeroSlider() {
    if (!siteContent?.hero?.slides?.length) return;
    applyHeroTextStyles(siteContent?.hero);
    applyHeroLayerMotion(siteContent?.hero);
    const slides = siteContent.hero.slides.filter((slide) => slide?.enabled !== false);
    if (!slides.length) return;
    const sliderIntervalMs = Math.round(getHeroTextStyleSettings(siteContent?.hero).slideDurationSec * 1000);
    const heroSlidesContainer = document.getElementById('heroSlidesContainer');
    const heroSlideEls = heroSlidesContainer ? Array.from(heroSlidesContainer.querySelectorAll('.hero-slide')) : [];
    const heroPrevBtnLux = document.getElementById('heroNavPrev');
    const heroNextBtnLux = document.getElementById('heroNavNext');
    const hTitleLux = document.querySelector('.hero-title-lux');
    const hSubLux = document.querySelector('.hero-subtitle-lux');

    // New homepage structure (lux): slides already rendered in #heroSlidesContainer.
    if (heroSlidesContainer && heroSlideEls.length) {
        const allSlides = Array.isArray(siteContent?.hero?.slides)
            ? siteContent.hero.slides.filter((slide) => slide?.enabled !== false)
            : [];
        const effectiveSlides = siteContent?.hero?.videoOnlyMode === true
            ? (() => {
                const firstVideo = allSlides.find((slide) => {
                    const mediaUrl = getMediaUrl(slide) || '';
                    return slide?.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl);
                });
                const fallbackSlide = allSlides.find((slide) => !!getMediaUrl(slide));
                return firstVideo ? [firstVideo] : (fallbackSlide ? [fallbackSlide] : []);
            })()
            : allSlides;

        let idx = Number(window.currentSlideIndex || 0);
        let autoTimer = null;
        window.currentSlideIndex = idx;

        const showHeroArrows = siteContent?.hero?.videoOnlyMode !== true && heroSlideEls.length > 1;
        if (heroPrevBtnLux) heroPrevBtnLux.style.display = showHeroArrows ? '' : 'none';
        if (heroNextBtnLux) heroNextBtnLux.style.display = showHeroArrows ? '' : 'none';

        function updateSlide(index) {
            idx = (index + heroSlideEls.length) % heroSlideEls.length;
            window.currentSlideIndex = idx;
            heroSlideEls.forEach((el, i) => el.classList.toggle('active', i === idx));

            const currentSlide = effectiveSlides[idx];
            if (currentSlide && currentSlide[currentLang]) {
                if (hTitleLux) hTitleLux.innerHTML = (currentSlide[currentLang].title || '').replace(/\n/g, '<br>');
                if (hSubLux) hSubLux.textContent = currentSlide[currentLang].subtitle || '';
                setHeroBehindTextContent(currentSlide, currentLang);
            }
        }

        function restartAuto() {
            if (window.heroAutoTimer) clearInterval(window.heroAutoTimer);
            if (!showHeroArrows) return;
            window.heroAutoTimer = setInterval(() => updateSlide(idx + 1), sliderIntervalMs);
        }

        updateSlide(idx);
        restartAuto();

        if (heroPrevBtnLux && !heroPrevBtnLux.dataset.boundSlider) {
            heroPrevBtnLux.dataset.boundSlider = '1';
            heroPrevBtnLux.addEventListener('click', () => {
                updateSlide(idx - 1);
                restartAuto();
            });
        }
        if (heroNextBtnLux && !heroNextBtnLux.dataset.boundSlider) {
            heroNextBtnLux.dataset.boundSlider = '1';
            heroNextBtnLux.addEventListener('click', () => {
                updateSlide(idx + 1);
                restartAuto();
            });
        }
        return;
    }

    const hTitle = document.querySelector('.hero-title');
    const hSub = document.querySelector('.hero-subtitle');
    const hImgContainer = document.querySelector('.hero-image-container');
    const dotsTop = document.querySelector('.slider-dots');
    const dotsVertical = document.querySelector('.slider-dots-vertical');
    const prevBtn = document.querySelector('.project-nav .prev');
    const nextBtn = document.querySelector('.project-nav .next');

    let idx = window.currentSlideIndex || 0;
    let autoTimer = null;
    window.currentSlideIndex = idx;

    function renderDots(container) {
        if (!container) return;
        container.innerHTML = slides.map((_, i) => (
            `<span class="dot ${i === idx ? 'active' : ''}" data-slide-index="${i}"></span>`
        )).join('');
    }

    function markActiveDots() {
        document.querySelectorAll('.slider-dots .dot, .slider-dots-vertical .dot').forEach(dot => {
            dot.classList.toggle('active', Number(dot.dataset.slideIndex) === idx);
        });
    }

    function updateSlide(index) {
        idx = (index + slides.length) % slides.length;
        window.currentSlideIndex = idx;

        const slide = slides[idx];
        if (!slide || !slide[currentLang]) return;

        if (hTitle) hTitle.innerHTML = (slide[currentLang].title || '').replace(/\n/g, '<br>');
        if (hSub) hSub.textContent = slide[currentLang].subtitle || '';
        if (hImgContainer) {
            const mediaUrl = slide.video || slide.image || '';
            const isVideo = slide.mediaType === 'video' || (mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) && !slide.image);
            if (isVideo && mediaUrl) {
                hImgContainer.innerHTML = `<video src="${mediaUrl}" autoplay muted loop playsinline class="hero-main-img" style="width:100%;height:100%;object-fit:cover;"></video>`;
            } else if (mediaUrl) {
                hImgContainer.innerHTML = `<img src="${mediaUrl}" alt="" class="hero-main-img">`;
            }
        }
        markActiveDots();
    }

    function restartAuto() {
        if (autoTimer) clearInterval(autoTimer);
        if (slides.length <= 1) return;
        autoTimer = setInterval(() => {
            updateSlide(idx + 1);
        }, sliderIntervalMs);
    }

    renderDots(dotsTop);
    renderDots(dotsVertical);
    updateSlide(idx);
    restartAuto();

    document.querySelectorAll('.slider-dots .dot, .slider-dots-vertical .dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const target = Number(dot.dataset.slideIndex);
            if (!Number.isNaN(target)) {
                updateSlide(target);
                restartAuto();
            }
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            updateSlide(idx - 1);
            restartAuto();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            updateSlide(idx + 1);
            restartAuto();
        });
    }
}

function initScrollProjectsReveal() {
    const carousel = document.getElementById('scrollProjectsCarousel');
    if (!carousel) return;
    const cards = Array.from(carousel.querySelectorAll('.scroll-project-card'));
    if (!cards.length) return;

    carousel.classList.add('scroll-projects-carousel');
    if (typeof carousel._scrollProjectsCleanup === 'function') {
        carousel._scrollProjectsCleanup();
    }

    cards.forEach((card, index) => {
        card.classList.remove('is-visible', 'is-active', 'is-passed');
        card.style.setProperty('--card-index', String(index));
        card.style.setProperty('--card-progress', '0');
    });

    let ticking = false;
    const updateCards = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!vh) {
            ticking = false;
            return;
        }

        const enterStart = vh * 0.9;
        const enterEnd = vh * 0.22;
        const travel = Math.max(1, enterStart - enterEnd);
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const rawProgress = (enterStart - rect.top) / travel;
            const progress = Math.max(0, Math.min(1, rawProgress));
            // Smooth step easing for a softer "grab and pull" feeling.
            const eased = progress * progress * (3 - (2 * progress));

            card.style.setProperty('--card-progress', progress.toFixed(3));
            card.style.setProperty('--card-progress-eased', eased.toFixed(3));
            // Make later cards stack above earlier cards while scrolling down.
            card.style.zIndex = String(index + 1);

            const visible = progress > 0.02 || rect.top < vh * 0.98;
            const active = progress > 0.45 && rect.bottom > vh * 0.2;
            const passed = rect.bottom < vh * 0.3;

            card.classList.toggle('is-visible', visible);
            card.classList.toggle('is-active', active);
            card.classList.toggle('is-passed', passed);
        });

        ticking = false;
    };

    const requestUpdate = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateCards);
    };

    const onScroll = () => requestUpdate();
    const onResize = () => requestUpdate();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    carousel._scrollProjectsCleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
    };

    requestUpdate();
}

function initProjectDisplayMotion() {
    const canRun = document.body
        && document.body.dataset.projectDisplayTheme === 'almimar-editorial'
        && !(window.matchMedia && window.matchMedia('(max-width: 900px)').matches)
        && typeof gsap !== 'undefined'
        && typeof ScrollTrigger !== 'undefined';
    if (!canRun) {
        cleanupProjectDisplayMotion();
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const getNumberVar = (name, fallback) => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : fallback;
    };

    const speed = getNumberVar('--project-display-scroll-speed', 1.15);
    const stickyTop = getNumberVar('--project-display-sticky-top', 112);
    const overlap = getNumberVar('--project-display-overlap', 86);
    const containers = [];

    if (document.body.dataset.projectDisplayHome === '1') {
        const home = document.querySelector('#servicesShowcase');
        if (home && home.querySelector('.service-card-lux')) containers.push({ container: home, selector: '.service-card-lux' });
    }

    if (document.body.dataset.projectDisplayPortfolio === '1') {
        const portfolio = document.querySelector('#modernPortfolioGrid, .portfolio-grid-full, .modern-portfolio-grid');
        if (portfolio) containers.push({ container: portfolio, selector: '.portfolio-item, .project-card' });
    }

    containers.forEach(({ container, selector }) => {
        const cards = Array.from(container.querySelectorAll(selector));
        if (cards.length < 2) {
            container.classList.remove('project-display-cinematic-stack');
            cards.forEach((card) => card.classList.remove('project-display-card'));
            return;
        }

        if (container._projectDisplayTriggers) {
            container._projectDisplayTriggers.forEach((trigger) => trigger.kill());
        }
        container._projectDisplayTriggers = [];
        if (!container._projectDisplayObserver) {
            let observerTimer = null;
            container._projectDisplayObserver = new MutationObserver(() => {
                clearTimeout(observerTimer);
                observerTimer = setTimeout(initProjectDisplayMotion, 120);
            });
            container._projectDisplayObserver.observe(container, { childList: true });
        }

        container.classList.add('project-display-cinematic-stack');
        cards.forEach((card, index) => {
            card.classList.add('project-display-card');
            card.style.zIndex = String(index + 1);
            card.style.setProperty('--project-card-index', String(index));
            gsap.set(card, {
                opacity: index === 0 ? 0 : 0.18,
                y: index === 0 ? 80 : 150 + (index * 22),
                scale: index === 0 ? 0.96 : 0.985,
                force3D: true
            });
        });

        const first = cards[0];
        const pinTrigger = ScrollTrigger.create({
            trigger: first,
            start: `top ${stickyTop}px`,
            end: () => `+=${Math.round((cards.length - 1) * (260 / speed))}`,
            pin: first,
            pinSpacing: false,
            scrub: true,
            invalidateOnRefresh: true
        });
        container._projectDisplayTriggers.push(pinTrigger);

        const firstTween = gsap.to(first, {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: container,
                start: 'top 88%',
                end: 'top 45%',
                scrub: Math.max(0.3, 1.2 / speed),
                invalidateOnRefresh: true
            }
        });
        container._projectDisplayTriggers.push(firstTween.scrollTrigger);

        cards.slice(1).forEach((card, index) => {
            const order = index + 1;
            const tween = gsap.to(card, {
                y: () => -(overlap * order * 0.22),
                opacity: 1,
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: container,
                    start: () => `top+=${Math.round(order * 120 / speed)} 72%`,
                    end: () => `top+=${Math.round((order + 1) * 260 / speed)} 34%`,
                    scrub: Math.max(0.35, 1.4 / speed),
                    invalidateOnRefresh: true
                }
            });
            container._projectDisplayTriggers.push(tween.scrollTrigger);
        });
    });

    ScrollTrigger.refresh();
}

function initMobileServiceCardStack(container) {
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.service-card-lux'));
    if (!cards.length) return;

    if (typeof container._mobileStackCleanup === 'function') {
        container._mobileStackCleanup();
    }

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    let isEnabled = false;
    let ticking = false;

    const resetCards = () => {
        container.classList.remove('mobile-stack-enabled');
        cards.forEach((card, index) => {
            card.classList.remove('is-stack-visible', 'is-stack-active', 'is-stack-passed');
            card.style.removeProperty('--stack-top');
            card.style.removeProperty('--stack-progress');
            card.style.removeProperty('--stack-eased');
            card.style.removeProperty('transform');
            card.style.removeProperty('opacity');
            card.style.removeProperty('z-index');
            card.style.setProperty('--stack-index', String(index + 1));
        });
    };

    const applyLayout = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!vh) return;
        cards.forEach((card, index) => {
            const centerTop = Math.max(74, Math.round((vh - card.offsetHeight) / 2));
            card.style.setProperty('--stack-top', `${centerTop}px`);
            card.style.setProperty('--stack-index', String(index + 1));
            card.style.zIndex = String(index + 1);
        });
    };

    const updateCards = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!vh || !isEnabled) {
            ticking = false;
            return;
        }

        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const cardHeight = Math.max(1, rect.height);
            const centerTop = Math.max(74, Math.round((vh - cardHeight) / 2));
            const enterStart = vh * 0.97;
            const travel = Math.max(1, enterStart - centerTop);
            const rawProgress = (enterStart - rect.top) / travel;
            const progress = Math.max(0, Math.min(1, rawProgress));
            const eased = progress * progress * (3 - (2 * progress));

            let translateY = (1 - eased) * 90;
            let scale = 0.93 + (eased * 0.07);
            let opacity = 0.68 + (eased * 0.32);

            const passed = rect.bottom < (centerTop + cardHeight * 0.42);
            if (passed) {
                translateY = -20;
                scale = 0.985;
                opacity = 0.9;
            }

            const visible = progress > 0.03 || rect.top < vh * 0.96;
            const active = progress > 0.52 && rect.bottom > centerTop + cardHeight * 0.2;

            card.style.setProperty('--stack-progress', progress.toFixed(3));
            card.style.setProperty('--stack-eased', eased.toFixed(3));
            card.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
            card.style.opacity = opacity.toFixed(3);

            card.classList.toggle('is-stack-visible', visible);
            card.classList.toggle('is-stack-active', active);
            card.classList.toggle('is-stack-passed', passed);
        });

        ticking = false;
    };

    const requestUpdate = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateCards);
    };

    const enable = () => {
        if (isEnabled) return;
        isEnabled = true;
        container.classList.add('mobile-stack-enabled');
        applyLayout();
        requestUpdate();
        window.addEventListener('scroll', requestUpdate, { passive: true });
    };

    const disable = () => {
        if (!isEnabled) return;
        isEnabled = false;
        window.removeEventListener('scroll', requestUpdate);
        resetCards();
    };

    const handleViewportChange = () => {
        if (mobileQuery.matches) {
            enable();
            applyLayout();
            requestUpdate();
        } else {
            disable();
        }
    };

    const onResize = () => handleViewportChange();
    const onOrientationChange = () => handleViewportChange();
    const onMediaQueryChange = () => handleViewportChange();

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientationChange);
    if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', onMediaQueryChange);
    } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(onMediaQueryChange);
    }

    handleViewportChange();

    container._mobileStackCleanup = () => {
        disable();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onOrientationChange);
        if (typeof mobileQuery.removeEventListener === 'function') {
            mobileQuery.removeEventListener('change', onMediaQueryChange);
        } else if (typeof mobileQuery.removeListener === 'function') {
            mobileQuery.removeListener(onMediaQueryChange);
        }
    };
}

function initPortfolioFilter() {
    const container = document.querySelector('.portfolio-filter');
    if (!container) return;
    container.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        applyPortfolioFilter(btn.dataset.filter);
    });
}

function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn, #hamburgerBtn, .hamburger');
    const menu = document.querySelector('.nav-container, .nav-links');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            menu.classList.toggle('active');
        });
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                btn.classList.remove('active');
                menu.classList.remove('active');
            });
        });
    }
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const API_URL = 'https://script.google.com/macros/s/AKfycbzebgI1mv33CmJWS60WfD4RX7sRYA90sRKaujY0apaQBNLikR8MPc_Uljx28VB1ituWNA/exec';
    ensureLeadFormFeedbackStyles();
    const feedback = createLeadFormFeedback(form);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = btn ? btn.innerHTML : '';

        if (!form.name.value.trim() || !form.phone.value.trim() || !form.project_type.value || !form.message.value.trim()) {
            showLeadFormFeedback(feedback, 'error', currentLang === 'ar' ? 'يرجى تعبئة الاسم والهاتف ونوع المشروع والرسالة.' : 'Please fill name, phone, project type and message.');
            return;
        }

        showLeadFormFeedback(feedback, 'loading', currentLang === 'ar' ? 'جاري إرسال طلبك إلى فريق Elawadi Group...' : 'Sending your request to Elawadi Group...');

        if (btn) {
            btn.disabled = true;
            btn.classList.add('is-sending');
            btn.innerHTML = currentLang === 'ar'
                ? '<span class="lead-submit-spinner" aria-hidden="true"></span><span>جاري الإرسال...</span>'
                : '<span class="lead-submit-spinner" aria-hidden="true"></span><span>Sending...</span>';
        }

        try {
            const payload = new URLSearchParams({
                name: form.name.value.trim(),
                phone: form.phone.value.trim(),
                email: form.email.value.trim(),
                project_type: form.project_type.value,
                message: form.message.value.trim()
            });

            const response = await fetch(API_URL, {
                method: "POST",
                body: payload
            });

            if (!response.ok) throw new Error(`Lead submission failed: ${response.status}`);

            showLeadFormFeedback(feedback, 'success', currentLang === 'ar'
                ? 'تم استلام طلبك بنجاح. سنراجع التفاصيل ونتواصل معك قريباً.'
                : 'Your request was received successfully. Our team will contact you soon.');
            form.reset();
        } catch (err) {
            console.error(err);
            showLeadFormFeedback(feedback, 'error', currentLang === 'ar'
                ? 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب.'
                : 'Could not send your message. Please try again or contact us on WhatsApp.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('is-sending');
                btn.innerHTML = originalBtnHtml;
            }
        }
    });
}

function ensureLeadFormFeedbackStyles() {
    if (document.getElementById('lead-form-feedback-styles')) return;
    const style = document.createElement('style');
    style.id = 'lead-form-feedback-styles';
    style.textContent = `
        .lead-form-feedback {
            display: none;
            align-items: center;
            gap: 14px;
            margin: 18px 0;
            padding: 16px 18px;
            border-radius: 18px;
            border: 1px solid rgba(199, 162, 82, 0.28);
            background: rgba(255, 255, 255, 0.06);
            box-shadow: 0 18px 45px rgba(0, 0, 0, 0.12);
            color: var(--white, #1A1A1A);
            transform: translateY(8px);
            opacity: 0;
            transition: opacity 0.35s ease, transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .lead-form-feedback.is-visible { display: flex; opacity: 1; transform: translateY(0); }
        .lead-form-feedback.success { border-color: rgba(199, 162, 82, 0.55); box-shadow: 0 18px 50px rgba(199, 162, 82, 0.22); }
        .lead-form-feedback.error { border-color: rgba(220, 38, 38, 0.45); color: #b91c1c; }
        .lead-form-feedback.loading { border-color: rgba(199, 162, 82, 0.38); }
        .lead-form-icon {
            width: 38px;
            height: 38px;
            min-width: 38px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--gold, #C7A252), var(--gold-dark, #a8893f));
            color: #000;
            box-shadow: 0 0 28px rgba(199, 162, 82, 0.28);
        }
        .lead-form-message { line-height: 1.8; font-weight: 700; }
        .lead-submit-spinner,
        .lead-feedback-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(0, 0, 0, 0.25);
            border-top-color: #000;
            border-radius: 50%;
            animation: leadSpin 0.8s linear infinite;
        }
        .lead-feedback-spinner { border-color: rgba(199, 162, 82, 0.25); border-top-color: var(--gold, #C7A252); }
        .btn-lux.is-sending { cursor: wait; opacity: 0.84; transform: translateY(-2px); }
        @keyframes leadSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
            .lead-submit-spinner,
            .lead-feedback-spinner { animation: none; }
            .lead-form-feedback { transition: none; }
        }
    `;
    document.head.appendChild(style);
}

function createLeadFormFeedback(form) {
    let feedback = form.querySelector('.lead-form-feedback');
    if (feedback) return feedback;

    feedback = document.createElement('div');
    feedback.className = 'lead-form-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.innerHTML = '<span class="lead-form-icon"><i class="fas fa-check"></i></span><span class="lead-form-message"></span>';

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        form.insertBefore(feedback, submitBtn);
    } else {
        form.appendChild(feedback);
    }
    return feedback;
}

function showLeadFormFeedback(feedback, type, message) {
    if (!feedback) return;
    const icon = feedback.querySelector('.lead-form-icon');
    const text = feedback.querySelector('.lead-form-message');
    const iconHtml = {
        success: '<i class="fas fa-check"></i>',
        error: '<i class="fas fa-triangle-exclamation"></i>',
        loading: '<span class="lead-feedback-spinner" aria-hidden="true"></span>'
    };
    feedback.className = `lead-form-feedback ${type} is-visible`;
    if (icon) icon.innerHTML = iconHtml[type] || iconHtml.success;
    if (text) text.textContent = message;
}
