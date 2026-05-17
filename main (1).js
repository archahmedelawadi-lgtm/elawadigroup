let siteContent = null;
window.siteContent = window.siteContent || null; // Make it global (don't overwrite if already set)
let currentLang = 'ar';
let lastContentUpdateToken = localStorage.getItem('contentUpdatedAt') || '';

function getApiCandidates(path) {
    const cleanPath = String(path || '');
    const candidates = [];
    const protocol = window.location.protocol;
    const origin = window.location.origin;

    if (protocol === 'http:' || protocol === 'https:') {
        candidates.push(cleanPath);
        if (origin && origin !== 'null') {
            candidates.push(`${origin}${cleanPath}`);
        }
    }

    candidates.push(`http://127.0.0.1:8080${cleanPath}`);
    candidates.push(`http://localhost:8080${cleanPath}`);
    return [...new Set(candidates)];
}

async function fetchWithFallback(path, options = {}) {
    let lastErr = null;
    for (const url of getApiCandidates(path)) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
            lastErr = new Error(`HTTP ${res.status} from ${url}`);
        } catch (err) {
            lastErr = err;
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
  "branding": {
    "logo": "/uploads/20260416114117041013.png",
    "ar": { "siteName": "استوديو العوضي", "tagline": "معماريون، مهندسون، ومدراء إبداعيون" },
    "en": { "siteName": "ELAWADI STUDIO", "tagline": "ARCHITECTS & ENGINEERS" }
  },
  "hero": {
    "slides": [
      { "ar": { "title": "نصمم لك إرثاً معمارياً يعيش للأجيال", "subtitle": "أعلى معايير الدقة الهندسية والفخامة الكلاسيكية" }, "en": { "title": "Designing Architectural Legacies for Generations", "subtitle": "Highest standards of engineering precision" }, "image": "/uploads/20260424012620941629.png" },
      { "ar": { "title": "تصميم هندسي دقيق ومعاصر", "subtitle": "حلول معمارية مبتكرة تلبي طموحاتك" }, "en": { "title": "Precise and Contemporary Engineering Design", "subtitle": "Innovative architectural solutions" }, "image": "/uploads/20260423231603969343.png" }
    ]
  },
  "about": {
    "ar": { "shortText": "أقدم خدمات التصميم الداخلي والمعماري.", "text": "أهلاً بك، أنا مهندس تصميم داخلي ومعماري بأكثر من 10 سنوات من الخبرة.", "stats": { "experience": "+10 سنوات", "projects": "+250 مشروع" } },
    "en": { "shortText": "Providing interior and architectural design services.", "text": "Welcome, I am an interior and architectural designer with over 10 years of experience.", "stats": { "experience": "+10 Years", "projects": "+250 Projects" } },
    "image": "/uploads/20260425005347866687.jpeg"
  },
  "services": [
    { "ar": { "title": "تصميم شقق كاملة", "description": "تصميم متكامل للشقق من الألف إلى الياء" }, "en": { "title": "Full Apartment Design", "description": "Integrated design for apartments from A to Z" }, "icon": "fa-home", "image": "/uploads/20260423195738220901.gif" },
    { "ar": { "title": "تصميم غرف منفصلة", "description": "تصميم غرف محددة" }, "en": { "title": "Separate Room Design", "description": "Design for specific rooms" }, "icon": "fa-door-open", "image": "/uploads/20260423221017168668.png" },
    { "ar": { "title": "تصميم واجهات", "description": "تصميم واجهات خارجية مميزة" }, "en": { "title": "Facade Design", "description": "Unique exterior facade designs" }, "icon": "fa-building", "image": "/uploads/20260423221100158990.png" },
    { "ar": { "title": "تصميم 3D واقعي", "description": "نماذج 3D واقعية" }, "en": { "title": "Realistic 3D Design", "description": "Realistic 3D models" }, "icon": "fa-cube", "image": "/uploads/20260423221457738492.png" }
  ],
  "portfolio": [
    { "type": "facade", "ar": { "title": "فيلا كلاسيكية", "category": "تصميم خارجي" }, "en": { "title": "Classical Villa", "category": "Exterior Design" }, "images": ["/uploads/20260423220536002923.png"] },
    { "type": "apartment", "ar": { "title": "شقة مودرن", "category": "شقق" }, "en": { "title": "Modern Apartment", "category": "Apartments" }, "images": ["/uploads/20260423222427220934.png"] }
  ],
  "contact": { "phone": "+966 50 000 0000", "email": "info@elawadi.com", "ar": { "address": "الرياض، المملكة العربية السعودية" }, "en": { "address": "Riyadh, Saudi Arabia" }, "whatsapp": "https://wa.me/966500000000" },
  "ui": {
    "ar": { "home": "الرئيسية", "projects": "مشاريعنا", "services": "خدماتنا", "about": "من نحن", "blog": "مدونتنا", "contact": "اتصل بنا", "book_consultation": "احجز استشارتك", "read_more": "اقرأ المزيد", "copyright": "© 2026 استوديو العوضي. جميع الحقوق محفوظة", "why_us": "لماذا نحن؟", "featured_projects": "مشاريع مميزة", "view_album": "عرض الألبوم", "order_now": "اطلب الخدمة الآن", "contact_title": "تواصل معنا", "send_message": "أرسل رسالة", "form_fill_hint": "املأ النموذج", "full_name": "الاسم الكامل", "phone_number": "رقم الهاتف", "project_type": "نوع المشروع", "project_details": "تفاصيل المشروع", "placeholder_name": "أدخل اسمك الكامل", "placeholder_phone": "05xxxxxxxx", "placeholder_message": "اكتب تفاصيل مشروعك...", "select_project": "اختر نوع المشروع", "type_apartment": "تصميم شقة", "type_room": "تصميم غرفة", "type_kitchen": "تصميم مطبخ", "type_facade": "تصميم واجهة", "type_other": "أخرى", "let_talk": "لنتحادث", "contact_intro": "تواصل معي", "call_me": "اتصل بي", "whatsapp": "واتساب", "email_me": "راسلني", "follow_me": "تابعني على", "ready_to_transform": "جاهز لتحويل حلمك إلى واقع؟", "start_project": "ابدأ مشروعك الآن", "how_work": "كيف أعمل", "work_steps": "خطوات العمل", "step_1_title": "الاستشارة المجانية", "step_2_title": "دراسة المشروع", "step_3_title": "التصميم الأولي", "step_4_title": "النموذج 3D", "step_5_title": "التسليم", "all": "الكل", "apartments": "شقق", "kitchens": "مطابخ", "bedrooms": "غرف نوم", "facades": "واجهات", "have_project": "لديك مشروع في ذهنك؟" },
    "en": { "home": "Home", "projects": "Our Projects", "services": "Our Services", "about": "About Us", "blog": "Our Blog", "contact": "Contact Us", "book_consultation": "Book Consultation", "read_more": "Read More", "copyright": "© 2026 ELAWADI STUDIO. All Rights Reserved", "why_us": "Why Us?", "featured_projects": "Featured Projects", "view_album": "View Album", "order_now": "Order Service Now", "contact_title": "Contact Us", "send_message": "Send a Message", "form_fill_hint": "Fill the form", "full_name": "Full Name", "phone_number": "Phone Number", "project_type": "Project Type", "project_details": "Project Details", "placeholder_name": "Enter your full name", "placeholder_phone": "05xxxxxxxx", "placeholder_message": "Write your project details...", "select_project": "Select Project Type", "type_apartment": "Apartment Design", "type_room": "Room Design", "type_kitchen": "Kitchen Design", "type_facade": "Facade Design", "type_other": "Other", "let_talk": "Let's Talk", "contact_intro": "Contact me", "call_me": "Call Me", "whatsapp": "WhatsApp", "email_me": "Email Me", "follow_me": "Follow Me On", "ready_to_transform": "Ready to turn your dream into reality?", "start_project": "Start Your Project Now", "how_work": "How I Work", "work_steps": "Work Steps", "step_1_title": "Free Consultation", "step_2_title": "Project Study", "step_3_title": "Initial Design", "step_4_title": "3D Modeling", "step_5_title": "Delivery", "all": "All", "apartments": "Apartments", "kitchens": "Kitchens", "bedrooms": "Bedrooms", "facades": "Facades", "have_project": "Have a project in mind?" }
  }
};

window.addEventListener('DOMContentLoaded', async function() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    const savedLang = localStorage.getItem('siteLang');
    currentLang = savedLang || 'ar';

    initLoader();
    initCustomCursor();
    initMouseParticles();
    initPageTransitions();
    
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
    initPortfolioFilter();
    initMobileMenu();
    initLanguageSwitcher();
    initContentSync();
    initContactForm();
    
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
        loader.style.pointerEvents = 'none';
    }
});

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
    const cacheBust = `ts=${Date.now()}`;
    try {
        // Prefer API to ensure site reflects exactly what admin saved.
        const res = await fetchWithFallback('/api/content', { cache: 'no-store' });
        siteContent = await res.json();
        window.siteContent = siteContent;
        normalizePortfolioSections(siteContent);
        return;
    } catch (e) {
        console.error('API content load failed, trying local JSON fallback:', e);
    }

    const localSources = [`data/content.json?${cacheBust}`, `./data/content.json?${cacheBust}`];
    for (const source of localSources) {
        try {
            const res = await fetch(source, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to load ${source}`);
            siteContent = await res.json();
            window.siteContent = siteContent;
            normalizePortfolioSections(siteContent);
            return;
        } catch (e) {
            console.error(`Load error from ${source}:`, e);
        }
    }

    console.error("All content sources failed, using fallback data");
    siteContent = FALLBACK_CONTENT;
    window.siteContent = siteContent; // Global sync
    normalizeSocialContent(siteContent);
    normalizePortfolioSections(siteContent);
    console.log('siteContent is now available');
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

function getSocialIconMarkup(data, platform, label = '') {
    const config = data?.socialIcons?.[platform] || {};
    const globalConfig = data?.socialIconsGlobal || {};
    const fallback = SOCIAL_ICON_DEFAULTS[platform] || { iconClass: 'fas fa-link' };
    const iconClass = config.iconClass || fallback.iconClass;

    let style = '';
    const bgColor = config.bgColor || globalConfig.bgColor || '#C7A252';
    const iconColor = config.iconColor || globalConfig.color || '#000000';
    const size = config.size || globalConfig.size || '45';
    const shape = config.shape || globalConfig.shape || 'circle';

    style += `background:${bgColor};color:${iconColor};width:${size}px;height:${size}px;`;
    if (shape === 'circle') {
        style += 'border-radius:50%;';
    } else if (shape === 'square') {
        style += 'border-radius:0;';
    } else if (shape === 'rounded') {
        style += 'border-radius:12px;';
    } else if (shape === 'none') {
        style += 'background:transparent;border-radius:0;';
    }

    if (config.type === 'custom' && config.customIcon) {
        return `<img src="${escapeHtml(config.customIcon)}" alt="${escapeHtml(label || fallback.label || platform)}" class="social-icon-media" style="${style}">`;
    }

    return `<i class="${escapeHtml(iconClass)}" aria-hidden="true" style="${style}"></i>`;
}

function renderSocialLinks(data) {
    document.querySelectorAll('.social-links[data-social-style]').forEach(container => {
        const style = container.dataset.socialStyle || 'minimal';
        const linkClass = style === 'contact' ? 'social-link' : 'social-link-item';
        const activePlatforms = SOCIAL_LINK_ORDER.filter(platform => isSocialActive(data, platform));

        container.innerHTML = activePlatforms.map(platform => {
            const href = getSocialUrl(data, platform);
            const label = SOCIAL_ICON_DEFAULTS[platform]?.label || platform;
            return `<a href="${escapeHtml(href)}" class="${linkClass}" target="_blank" rel="noopener noreferrer" data-hover aria-label="${escapeHtml(label)}">
                ${getSocialIconMarkup(data, platform, label)}
            </a>`;
        }).join('');
    });
}

function updateSiteWhatsAppIcons(data) {
    const whatsappUrl = getSocialUrl(data, 'whatsapp') || '#';
    const whatsappIcon = getSocialIconMarkup(data, 'whatsapp', 'WhatsApp');

    document.querySelectorAll('.whatsapp-float').forEach(link => {
        link.href = whatsappUrl;
        link.innerHTML = whatsappIcon;
    });

    document.querySelectorAll('.btn-whatsapp').forEach(link => {
        link.href = whatsappUrl;
        const oldIcon = link.querySelector('i, img, .social-icon-media');
        if (oldIcon) {
            oldIcon.outerHTML = whatsappIcon;
        } else {
            link.insertAdjacentHTML('afterbegin', whatsappIcon);
        }
    });

    document.querySelectorAll('.contact-method.whatsapp').forEach(link => {
        link.href = whatsappUrl;
        const iconBox = link.querySelector('.method-icon');
        if (iconBox) iconBox.innerHTML = whatsappIcon;
    });
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
            ${escapeHtml(section[lang] || section.ar || section.en || section.id)}
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

function applyLanguageContent() {
    if (!siteContent) {
        console.log('No siteContent, skipping');
        return;
    }
    
    const lang = currentLang;
    const data = siteContent;
    console.log('Applying language:', lang);

    // Branding
    if (data.branding) {
        if (data.branding[lang]) {
            document.querySelectorAll('.logo-text').forEach(el => el.textContent = data.branding[lang].siteName);
            document.querySelectorAll('.ref-branding small').forEach(el => el.textContent = data.branding[lang].tagline);
            document.title = data.branding[lang].siteName + ' | ' + data.branding[lang].tagline;
        }
        
        if (data.branding.logo) {
            document.querySelectorAll('.logo-icon-wrapper').forEach(el => {
                el.innerHTML = `<img src="${data.branding.logo}" alt="Logo" style="width:45px; height:45px; object-fit:contain;">`;
            });
        }
    }

    // All data-i18n elements
    if (data.ui && data.ui[lang]) {
        const ui = data.ui[lang];
        console.log('UI translation keys:', Object.keys(ui));
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const translation = ui[key];
            console.log('Element:', el.tagName, 'key:', key, 'translation:', translation);
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
    } else {
        console.log('No ui or ui[lang] found');
    }

    // Hero Slides
    if (data.hero && data.hero.slides && data.hero.slides.length > 0) {
        // Initial setup for the first slide if needed
        const slide = data.hero.slides[0];
        if (slide && slide[lang]) {
            const hTitle = document.querySelector('.hero-title');
            const hSub = document.querySelector('.hero-subtitle');
            const hImgContainer = document.querySelector('.hero-image-container');
            if (hTitle) hTitle.innerHTML = (slide[lang].title || '').replace(/\n/g, '<br>');
            if (hSub) hSub.textContent = slide[lang].subtitle || '';
            if (hImgContainer) {
                const mediaUrl = slide.video || slide.image || '';
                const isVideo = slide.mediaType === 'video' || (mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) && !slide.image);
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

    // Contact
    if (data.contact) {
        document.querySelectorAll('[data-content="address"]').forEach(el => {
            el.textContent = data.contact[lang]?.address || data.contact.ar?.address || '';
        });
        document.querySelectorAll('[data-content="phone"]').forEach(el => el.textContent = data.contact.phone);
        document.querySelectorAll('[data-content="email"]').forEach(el => el.textContent = data.contact.email);
    }

    renderSocialLinks(data);
    updateSiteWhatsAppIcons(data);
    renderPortfolioFilters(data, lang);
    updateDynamicGrids(data, lang);
}

function getMediaUrl(item) {
    if (!item) return '';
    
    // 1. Check primary image/video fields
    let url = item.image || item.video || "";
    
    // 2. Check images array (common in portfolio)
    if (!url && Array.isArray(item.images) && item.images.length > 0) {
        url = item.images[0];
    }
    
    // 3. Check slides array (common in projects)
    if (!url && Array.isArray(item.slides) && item.slides.length > 0) {
        const firstSlide = item.slides[0];
        url = firstSlide.image || firstSlide.video || "";
    }
    
    if (!url || typeof url !== 'string' || url.trim() === "") return '';
    
    url = url.trim();
    
    // Final Path Normalization
    if (url.startsWith('http')) return url; // Don't touch external URLs
    
    // Ensure relative paths start with /uploads/ correctly
    if (!url.startsWith('/')) {
        if (!url.startsWith('uploads/')) {
            url = '/uploads/' + url;
        } else {
            url = '/' + url;
        }
    }
    
    // Fix double slashes only for local paths (avoid breaking http://)
    url = url.replace(/\/+/g, '/');
    
    return url;
}

function updateDynamicGrids(data, lang) {
    // Services Grid (Home)
    if (data.services && data.services.length > 0) {
        const whyGrid = document.querySelector('.why-us-grid');
        if (whyGrid) {
            whyGrid.innerHTML = data.services.slice(0, 3).map((srv, i) => {
                const icon = srv.icon && srv.icon.startsWith('fa') ? `<i class="fas ${srv.icon}"></i>` : '';
                const mediaUrl = getMediaUrl(srv);
                const isExternal = mediaUrl.startsWith('http');
                const crossOrigin = isExternal ? 'crossorigin="anonymous"' : '';
                
                // Only show img if it exists
                const imgHtml = mediaUrl ? `<img src="${mediaUrl}" style="display:none" ${crossOrigin} onerror="this.src=''">` : '';
                
                return `<a href="services.html#service-${i}" class="why-us-card" style="text-decoration:none">
                    <div class="card-icon">${icon}</div>
                    <h3>${srv[lang]?.title || ''}</h3>
                    <p>${srv[lang]?.description || ''}</p>
                    ${imgHtml}
                </a>`;
            }).join('');
        }
    }

    // Portfolio Mini
    if (data.portfolio && data.portfolio.length > 0) {
        const miniGrid = document.querySelector('.projects-mini-grid');
        if (miniGrid) {
            miniGrid.innerHTML = data.portfolio.slice(0, 4).map((proj, i) => {
                const img = getMediaUrl(proj);
                if (!img) return '';
                const isExternal = img.startsWith('http');
                const crossOrigin = isExternal ? 'crossorigin="anonymous"' : '';
                return `<div class="project-mini-card" onclick="window.location.href='project-detail.html?id=${i}'">
                    <img src="${img}" alt="${proj[lang]?.title || ''}" ${crossOrigin} onerror="this.src=''">
                    <div class="project-mini-overlay">
                        <h3>${proj[lang]?.title || ''}</h3>
                        <span>${proj[lang]?.category || ''}</span>
                    </div>
                </div>`;
            }).join('');
        }

        const scrollProjectsGrid = document.querySelector('.scroll-projects-grid');
        if (scrollProjectsGrid) {
            scrollProjectsGrid.innerHTML = data.portfolio.slice(0, 6).map((proj, i) => {
                const img = getMediaUrl(proj);
                if (!img) return '';
                const isExternal = img.startsWith('http');
                const crossOrigin = isExternal ? 'crossorigin="anonymous"' : '';
                return `<div class="project-mini-card scroll-project-card" data-project-index="${i}" onclick="window.location.href='project-detail.html?id=${i}'">
                    <img src="${img}" alt="${proj[lang]?.title || ''}" ${crossOrigin} onerror="this.src=''">
                    <div class="project-mini-overlay">
                        <h3>${proj[lang]?.title || ''}</h3>
                        <span>${proj[lang]?.category || ''}</span>
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
            const isExternal = mediaUrl.startsWith('http');
            const crossOrigin = isExternal ? 'crossorigin="anonymous"' : '';
            const mediaHtml = isVideo
                ? `<video src="${mediaUrl}" autoplay muted loop playsinline class="service-vid" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`
                : `<img src="${mediaUrl}" alt="" ${crossOrigin} style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src=''">`;
            return `
            <div class="service-detail-card" id="service-${i}">
                <div class="service-img" style="background:#222; overflow:hidden; display:flex; align-items:center; justify-content:center;">${mediaHtml}</div>
                <div class="service-info">
                    <div class="service-icon-box"><i class="fas ${srv.icon}"></i></div>
                    <h2>${srv[lang]?.title || ''}</h2>
                    <p>${srv[lang]?.description || ''}</p>
                    <a href="contact.html" class="btn btn-primary">${data.ui[lang]?.order_now || ''}</a>
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
                mediaElement = `<img src="${mediaUrl}" alt="${proj[lang]?.title || ''}" loading="eager" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.opacity='0'">`;
            } else {
                mediaElement = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2a2a2a 0%,#1a1a1a 100%);">
                    <i class="fas fa-image" style="font-size:48px;color:#C7A252;opacity:0.6;"></i>
                </div>`;
            }
                
            return `<div class="portfolio-item" data-category="${proj.type}" onclick="window.location.href='project-detail.html?id=${i}'">
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
}

function initLanguageSwitcher() {
    console.log('Setting up language switcher');
    const btns = document.querySelectorAll('.lang-btn');
    console.log('Found buttons:', btns.length);
    
    btns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const newLang = this.dataset.lang;
            console.log('Language button clicked:', newLang);
            console.log('Current lang before:', currentLang);
            
            currentLang = newLang;
            localStorage.setItem('siteLang', currentLang);
            
            console.log('Updating page direction to:', currentLang);
            updatePageDirection(currentLang);
            
            console.log('Applying language content for:', currentLang);
            applyLanguageContent();
            
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            
            console.log('Done. Page should now be in:', currentLang);
        });
    });
    
    console.log('Language switcher initialized');
}

function initContentSync() {
    window.addEventListener('storage', async (event) => {
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
                const loader = document.getElementById('loader');
                if (loader) {
                    loader.style.display = 'flex';
                    gsap.fromTo(loader,
                        { opacity: 0 },
                        {
                            opacity: 1,
                            duration: 0.4,
                            onComplete: () => {
                                window.location.href = href;
                            }
                        }
                    );
                } else {
                    window.location.href = href;
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
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
}

function initProjectsCounter() {
    const counter = document.querySelector('.projects-counter-number');
    const label = document.querySelector('.projects-counter-label');
    if (!counter) return;

    if (label) {
        label.textContent = currentLang === 'ar'
            ? 'مشروع تم تنفيذه باحترافية'
            : 'Projects Delivered Professionally';
    }

    const target = Number(counter.dataset.counterTarget || '400');
    if (!target || Number.isNaN(target)) return;
    if (counter.dataset.animated === 'true') return;

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
    const slides = siteContent.hero.slides;
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
        }, 4000);
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
    const btn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.nav-container');
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
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = btn ? btn.innerHTML : '';
        const nameEl = form.querySelector('#name');
        const phoneEl = form.querySelector('#phone');
        const projectTypeEl = form.querySelector('#projectType');
        const messageEl = form.querySelector('#message');

        const payload = {
            name: (nameEl?.value || '').trim(),
            phone: (phoneEl?.value || '').trim(),
            projectType: (projectTypeEl?.value || '').trim(),
            message: (messageEl?.value || '').trim()
        };

        if (!payload.name || !payload.phone || !payload.message) {
            alert(currentLang === 'ar' ? 'يرجى تعبئة الاسم والهاتف والرسالة' : 'Please fill name, phone and message');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const res = await fetchWithFallback('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert(currentLang === 'ar' ? 'تم الإرسال!' : 'Sent!');
                form.reset();
            } else {
                const errText = await res.text();
                throw new Error(errText || `HTTP ${res.status}`);
            }
        } catch (err) {
            console.error(err);
            alert(currentLang === 'ar' ? 'تعذر الإرسال، حاول مرة أخرى' : 'Failed to send, please try again');
        } finally {
            btn.disabled = false;
            if (btn) btn.innerHTML = originalBtnHtml;
        }
    });
}
