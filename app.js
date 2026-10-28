/* ═══════════════════════════════════════════════════════
   D'VAAW — Shared App Logic
   Injects nav + footer + toast + cookie. Handles cart state.
═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const WHATSAPP = '601118866239';
    const FALLBACK_IMAGE = 'image/perfume-bottle-ai.webp';

    /* Storage may be disabled by strict privacy settings. Keep the storefront
       usable with a temporary in-memory fallback instead of aborting startup. */
    const volatileStorage = new Map();
    function storageKey(key, session) { return (session ? 'session:' : 'local:') + key; }
    function storageGet(key, session = false) {
        const memoryKey = storageKey(key, session);
        if (volatileStorage.has(memoryKey)) return volatileStorage.get(memoryKey);
        try { return (session ? sessionStorage : localStorage).getItem(key); }
        catch { return null; }
    }
    function storageSet(key, value, session = false) {
        const memoryKey = storageKey(key, session);
        try {
            (session ? sessionStorage : localStorage).setItem(key, value);
            volatileStorage.delete(memoryKey);
        } catch {
            volatileStorage.set(memoryKey, String(value));
        }
    }
    function storageRemove(key, session = false) {
        const memoryKey = storageKey(key, session);
        try { (session ? sessionStorage : localStorage).removeItem(key); } catch {}
        volatileStorage.delete(memoryKey);
    }

    /* Shared rendering guards for Firebase and local-storage content. */
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
        })[char]);
    }
    function safeImageSource(value) {
        const src = String(value || '').trim();
        if (/^image\/[a-z0-9._/-]+$/i.test(src) || /^data:image\/(?:png|jpe?g|webp);base64,/i.test(src)) return src;
        return FALLBACK_IMAGE;
    }
    function useFallbackImage(img) {
        img.onerror = null;
        img.src = FALLBACK_IMAGE;
        img.classList.add('fallback-bottle');
    }

    /* ═════ GREETING SPLASH ═════
       Plays on: first visit, page refresh, and right after login/register.
       Skips: normal link navigation between pages (no annoyance, no lag). */
    function playSplash(title, name) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let sp = document.getElementById('splash');
        if (!sp) {
            sp = document.createElement('div');
            sp.id = 'splash';
            document.body.appendChild(sp);
        }
        sp.classList.remove('hide');
        sp.innerHTML =
            '<div class="sp-eyebrow">' + title + '</div>' +
            '<div class="sp-name">' + name + '</div>' +
            '<div class="sp-line"></div>';
        clearTimeout(window._spT);
        window._spT = setTimeout(() => sp.classList.add('hide'), 2100);
    }
    window.DVAAW_GREET = playSplash;

    (function autoSplash() {
        const navEntry = performance.getEntriesByType('navigation')[0];
        const isReload = navEntry && navEntry.type === 'reload';
        const firstThisTab = !storageGet('dvaaw_tab_seen', true);
        storageSet('dvaaw_tab_seen', '1', true);
        if (!isReload && !firstThisTab) return;      // internal navigation → skip

        let cached = null;
        try { cached = JSON.parse(storageGet('dvaaw_profile')); } catch {}
        if (cached && cached.name) {
            playSplash('Welcome back', cached.name.split(' ')[0]);
        } else {
            playSplash('Where Value Meets Authenticity', "D'Vaaw");
        }
    })();
    const page = location.pathname.split('/').pop() || 'index.html';

    /* ───── PRODUCT CATALOG (single source of truth) ───── */
    const CATALOG = [
        // For Her
        { id:'red-gorgeous', name:'Red Gorgeous', cat:'her', notes:'Sweet Fruity · Vanilla · Rose', img:'image/red-gorgeous.webp' },
        { id:'candy', name:'Candy', cat:'her', notes:'Sweet Vanilla · Fruity Powdery · Lactonic', img:'image/candy.webp' },
        { id:'the-goddess', name:'The Goddess', cat:'her', notes:'Vanilla · Warm Spicy Cacao · Amber Powdery', img:'image/the-goddess.webp' },
        { id:'selena-secret', name:'Selena Secret', cat:'her', notes:'Chocolate Vanilla · Fruity Sweet · Tropical', img:'image/selena-secret.webp' },
        { id:'lady-boss', name:'Lady Boss', cat:'her', notes:'Fruity Fresh · Citrus Floral · White Floral', img:'image/lady-boss.webp' },
        { id:'demure-opium', name:'Demure Opium', cat:'her', notes:'Coffee Vanilla · Warm Spicy Woods · Balsamic', img:'image/demure-opium.webp' },
        { id:'miss-bloom', name:'Miss Bloom', cat:'her', notes:'White Floral · Patchouli Lactonic · Citrus Woody', img:'image/miss-bloom.webp' },
        { id:'love-sick', name:'Love Sick', cat:'her', notes:'Sweet Fruity · Floral Rose · Fresh Sour', img:'image/love-sick.webp' },
        { id:'sweet-vanilla', name:'Sweet Vanilla', cat:'her', notes:'Vanilla · Almond Powdery · Woody Amber', img:'image/sweet-vanilla.webp' },
        { id:'glamorous', name:'Glamorous', cat:'her', notes:'Fruity Vanilla · Sweet Floral · Chocolate Aquatic', img:'image/glamorous.webp' },
        { id:'roses-potion', name:'Roses Potion', cat:'her', notes:'Roses Champagne · Sweet Musky · Woody Amber', img:'image/roses-potion.webp' },
        { id:'ms-classy', name:'Ms. Classy', cat:'her', notes:'Floral Fruity · Rose Aquatic · Green Patchouli', img:'image/ms-classy.webp' },
        { id:'sweet-dew', name:'Sweet Dew', cat:'her', notes:'Ozonic · Aquatic Fresh · Rock Melon', img:'image/sweet-dew.webp' },
        { id:'mia-bubblelush', name:'Mia Bubblelush', cat:'her', notes:'Fruity · Radiant · Irresistible', img:'image/mia-bubblelush.webp',
          description:'A vibrant blend of tangy roselle and juicy tropical fruits, wrapped in the creamy sweetness of vanilla and the smooth warmth of sandalwood. Playful yet elegant, this captivating fragrance leaves a sweet, unforgettable impression.',
          top:'Roselle', middle:'Tropical Fruit', base:'Vanilla · Sandalwood' },
        { id:'phylish-aurella', name:'Phylish Aurella', cat:'her', notes:'Elegant · Sensual · Sophisticated', img:'image/phylish-aurella.webp',
          description:'A luscious burst of black currant unfolds into the romantic elegance of rose, enriched by the soft warmth of cashmere and the golden allure of amber. Refined and captivating, this fragrance leaves a lasting impression of feminine luxury.',
          top:'Black Currant', middle:'Rose', base:'Cashmere · Amber' },
        { id:'elara-velvet', name:'Elara Velvet', cat:'her', notes:'Fresh · Floral · Enchanting', img:'image/elara-velvet.webp',
          description:'A vibrant burst of juicy mandarin unfolds into the delicate elegance of orchid, wrapped in the warm, balsamic sweetness of benzoin. Radiant yet sensual, this captivating fragrance leaves a soft, unforgettable impression.',
          top:'Mandarin Juice', middle:'Orchid', base:'Benzoin' },
        { id:'tarava-aura', name:'Tarava Aura', cat:'her', notes:'Exotic · Warm · Addictive', img:'image/tarava-aura.webp',
          description:'An exotic burst of luscious marang unfolds into the spicy warmth of cinnamon and the golden richness of amber, wrapped in the creamy sweetness of vanilla. Unique and captivating, this fragrance leaves a warm, irresistible impression.',
          top:'Marang', middle:'Cinnamon · Amber', base:'Vanilla' },
        // For Him
        { id:'hottest-guy', name:'Hottest Guy', cat:'him', notes:'Fresh Spicy Citrus · Aromatic Woods · Herbal Lavender', img:'image/hottest-guy.webp' },
        { id:'the-zillion', name:'The Zillion', cat:'him', notes:'Cinnamon Citrus · Amber Patchouli · Rose Leather', img:'image/the-zillion.webp' },
        { id:'great-man', name:'Great Man', cat:'him', notes:'Bergamot Fruity · Smoky Woods · Musky Moss', img:'image/great-man.webp' },
        { id:'vip-scent', name:'VIP Scent', cat:'him', notes:'Aromatic Vodka · Spicy Green Woods · Citrus Fruity', img:'image/vip-scent.webp' },
        { id:'perfect-men', name:'Perfect Men', cat:'him', notes:'Citrus Marine · Fruity Amber · Sweet Floral', img:'image/perfect-men.webp' },
        { id:'the-gentleman', name:'The Gentleman', cat:'him', notes:'Aquatic Citrus · Marine Woods · Fresh Lavender', img:'image/the-gentleman.webp' },
        { id:'the-eros-men', name:'The Eros Men', cat:'him', notes:'Aromatic Citrus · Vanilla Amber · Powdery Sweet', img:'image/the-eros-men.webp' },
        { id:'titan-x', name:'Titan-X', cat:'him', notes:'Red Ginger · Woody Notes · Bourbon Vanilla', img:'image/titan-x.webp' },
        { id:'ignis-black', name:'Ignis Black', cat:'him', notes:'Fresh · Spicy · Sophisticated', img:'image/ignis-black.webp',
          description:'A refreshing burst of zesty lime and bergamot unfolds into the warm spice of cinnamon, grounded by rich cedarwood and smooth vanilla. Fresh yet seductive, this captivating fragrance embodies confidence and timeless masculinity.',
          top:'Lime · Bergamot', middle:'Cinnamon', base:'Cedarwood · Vanilla' },
        { id:'bad-boy', name:'BAD BOY', cat:'him', notes:'Fresh · Bold · Refined', img:'image/bad-boy.webp',
          description:'A soothing touch of lavender meets the vibrant freshness of bergamot and the rich sweetness of black plum, grounded by the deep, earthy notes of cedarwood and oak. Sophisticated and effortlessly masculine, this fragrance leaves a powerful, lasting impression.',
          top:'Lavender', middle:'Bergamot · Black Plum', base:'Cedarwood · Oak' },
        { id:'dark-alpha', name:'Dark Alpha', cat:'him', notes:'Bold · Mysterious · Unforgettable', img:'image/dark-alpha.webp',
          description:'An intriguing blend of smoky pineapple and smooth vanilla, deepened by sensual musk and dry woods. Bold, warm, and irresistibly masculine — a fragrance that commands attention without saying a word. Own your presence. Define your alpha.',
          top:'Smoky Pineapple', middle:'Vanilla', base:'Musk · Dry Wood' },
        { id:'prince-charming', name:'Prince Charming', cat:'him', notes:'Elegant · Sensual · Timeless', img:'image/prince-charming.webp',
          description:'A captivating blend of fresh orange blossom and delicate roses, softened by creamy vanilla and enriched with the warm, resinous depth of labdanum. Refined, alluring, and effortlessly masculine — a scent that leaves a lasting impression.',
          top:'Orange Blossom · Roses', middle:'Vanilla', base:'Labdanum' },
        // Unisex
        { id:'obsession', name:'Obsession', cat:'unisex', notes:'Amber Saffron · Warm Spicy Nutty · Musky Floral', img:'image/obsession.webp' },
        { id:'valora', name:'Valora', cat:'unisex', notes:'Vanilla Salty · Woody Amber · Black Pepper Marine', img:'image/valora.webp' },
        // Borneo Edition
        { id:'rentap-ridge', name:'Rentap Ridge', cat:'borneo', notes:'Shorea Macrophylia · Herbal Lavender · Warm Spicy', img:'image/rentap-ridge.webp' },
        { id:'borneo-luxe', name:'Borneo Luxe', cat:'borneo', notes:'Sweet Woody · Vanilla Powdery · Borneo Nut', img:'image/borneo-luxe.webp' },
    ];

    // Keep long-lived browser caches from showing an older product photo after an asset refresh.
    const PRODUCT_IMAGE_REVISION = 'f0667b4';
    CATALOG.forEach(product => {
        if (product.img && product.img.startsWith('image/') && product.img.endsWith('.webp')) {
            product.img += '?v=' + PRODUCT_IMAGE_REVISION;
        }
    });

    const SIZES = [
        { size:'10ml', price:18 },
        { size:'35ml', price:79 },
    ];

    const CAT_LABEL = { her:'For Her', him:'For Him', unisex:'Unisex', borneo:'Borneo Edition' };

    // Expose for pages that render products
    window.DVAAW = {
        CATALOG, SIZES, CAT_LABEL, WHATSAPP, FALLBACK_IMAGE,
        escapeHTML, safeImageSource, useFallbackImage
    };

    /* ───── CART (safe, self-healing) ───── */
    function getCart() {
        try {
            const c = JSON.parse(storageGet('dvaaw_cart'));
            if (!Array.isArray(c)) return [];
            let changed = false;
            const cleaned = c.map(i => {
                if (!i || typeof i !== 'object') { changed = true; return null; }
                // Migrate old-format items (title/variant/category) to new format
                if (!i.name && i.title) { i.name = i.title; changed = true; }
                if (!i.size && i.variant) { i.size = i.variant; changed = true; }
                if (!i.cat && i.category) { i.cat = i.category; changed = true; }
                if (!i.key) { i.key = (i.id || i.name) + '-' + (i.size || ''); changed = true; }
                const rawQty = Number(i.qty);
                const cleanQty = Number.isFinite(rawQty) && rawQty > 0 ? Math.min(99, Math.floor(rawQty)) : 0;
                if (cleanQty !== i.qty) { i.qty = cleanQty; changed = true; }
                return i;
            }).filter(i =>
                i && i.name && i.size && Number.isFinite(i.price) && i.qty > 0
            );
            if (cleaned.length !== c.length) changed = true;
            if (changed) storageSet('dvaaw_cart', JSON.stringify(cleaned));
            return cleaned;
        } catch { return []; }
    }
    function setCart(c) { storageSet('dvaaw_cart', JSON.stringify(c)); paintCount(); }
    function cartCount() { return getCart().reduce((s,i) => s + i.qty, 0); }
    function paintCount() {
        const n = cartCount();
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = n;
            el.classList.toggle('show', n > 0);
        });
    }
    window.DVAAW.getCart = getCart;
    window.DVAAW.setCart = setCart;
    window.DVAAW.addToCart = function(prodId, size, price) {
        const prod = CATALOG.find(p => p.id === prodId);
        if (!prod) return;
        if (prod.stock === 0) { showToast(prod.name + ' is out of stock'); return; }
        price = window.DVAAW.price(price);   // apply active discount
        const cart = getCart();
        const key = prodId + '-' + size;
        const found = cart.find(i => i.key === key);
        if (found) found.qty++;
        else cart.push({ key, id:prodId, name:prod.name, cat:CAT_LABEL[prod.cat], size, price, img:prod.img, qty:1 });
        setCart(cart);
        showToast(prod.name + ' (' + size + ') added');
        trackViewed(prodId);
    };

    /* ───── RECENTLY VIEWED ───── */
    function trackViewed(id) {
        let rv = [];
        try {
            const stored = JSON.parse(storageGet('dvaaw_viewed') || '[]');
            if (Array.isArray(stored)) rv = stored;
        } catch {}
        rv = rv.filter(x => x !== id);
        rv.unshift(id);
        rv = rv.slice(0, 6);
        storageSet('dvaaw_viewed', JSON.stringify(rv));
    }
    window.DVAAW.trackViewed = trackViewed;
    window.DVAAW.getViewed = () => {
        try {
            const stored = JSON.parse(storageGet('dvaaw_viewed') || '[]');
            return Array.isArray(stored) ? stored : [];
        } catch { return []; }
    };

    /* ───── TOAST ───── */
    function showToast(msg) {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.innerHTML = '<span class="tick">✓</span><span class="toast-msg"></span>';
            document.body.appendChild(t);
        }
        t.querySelector('.toast-msg').textContent = msg;
        t.classList.remove('show');
        void t.offsetWidth;
        t.classList.add('show');
        clearTimeout(window._tt);
        window._tt = setTimeout(() => t.classList.remove('show'), 2600);
    }
    window.DVAAW.showToast = showToast;

    /* ───── NAV ───── */
    function navLink(href, label) {
        const active = page === href ? ' class="active"' : '';
        return `<a href="${href}"${active}>${label}</a>`;
    }
    const nav = document.createElement('header');
    nav.id = 'nav';
    nav.innerHTML = `
        <nav class="nav-links">
            ${navLink('shop.html','Shop')}
            ${navLink('about.html','Story')}
            ${navLink('shipping.html','Shipping')}
        </nav>
        <a href="index.html" class="brand">D'Vaaw</a>
        <div class="nav-right">
            ${navLink('contact.html','Contact')}
            <a href="account.html" id="accountLink"${page==='account.html'?' class="active"':''}>Account</a>
            <a href="cart.html" class="cart-link">Cart<span class="cart-count"></span></a>
        </div>
        <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>`;
    document.body.insertBefore(nav, document.body.firstChild);

    // Paint greeting INSTANTLY from cached profile — no flicker while Firebase wakes up
    (function instantGreeting() {
        try {
            const p = JSON.parse(storageGet('dvaaw_profile'));
            if (p && p.name) {
                const link = document.getElementById('accountLink');
                if (link) link.textContent = 'Hello, ' + p.name.split(' ')[0];
            }
        } catch {}
    })();

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    drawer.innerHTML = `
        <span class="eyebrow">D'Vaaw</span>
        <a href="index.html">Home</a>
        <a href="shop.html">Shop</a>
        <a href="about.html">Story</a>
        <a href="shipping.html">Shipping</a>
        <a href="contact.html">Contact</a>
        <a href="account.html">Account</a>
        <a href="cart.html">Cart</a>`;
    document.body.insertBefore(drawer, nav.nextSibling);

    const toggle = document.getElementById('navToggle');
    toggle.addEventListener('click', () => {
        const open = drawer.classList.toggle('open');
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        drawer.setAttribute('aria-hidden', String(!open));
        drawer.inert = !open;
        document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        drawer.setAttribute('aria-hidden', 'true');
        drawer.inert = true;
        document.body.style.overflow = '';
    }));

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !drawer.classList.contains('open')) return;
        toggle.click();
        toggle.focus();
    });

    window.addEventListener('scroll', () => {
        nav.classList.toggle('shrink', window.scrollY > 50);
    }, { passive: true });

    /* ───── FOOTER ───── */
    const footer = document.createElement('footer');
    footer.id = 'footer';
    footer.innerHTML = `
        <div class="footer-top">
            <div class="footer-brand">
                <a href="index.html" class="brand">D'Vaaw</a>
                <p>"Where Value Meets Authenticity" — Halal luxury fragrances crafted with Gula Apong, made in Sarawak, Borneo.</p>
            </div>
            <div class="footer-col">
                <h4>Shop</h4>
                <a href="shop.html?cat=her">For Her</a>
                <a href="shop.html?cat=him">For Him</a>
                <a href="shop.html?cat=unisex">Unisex</a>
                <a href="shop.html?cat=borneo">Borneo Edition</a>
            </div>
            <div class="footer-col">
                <h4>Brand</h4>
                <a href="about.html">Our Story</a>
                <a href="shipping.html">Shipping</a>
                <a href="contact.html">Contact</a>
                <a href="info.html">Privacy</a>
            </div>
            <div class="footer-col">
                <h4>Connect</h4>
                <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a>
                <a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
                <a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a>
                <a href="https://tiktok.com" target="_blank" rel="noopener">TikTok</a>
            </div>
        </div>
        <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} D'Vaaw Perfume · Kota Samarahan, Sarawak</span>
            <span>Made in Borneo 🇲🇾</span>
        </div>`;
    document.body.appendChild(footer);

    /* ───── FLOATING WHATSAPP ───── */
    const waFloat = document.createElement('a');
    waFloat.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent("Hi D'Vaaw! I have a question.");
    waFloat.target = '_blank';
    waFloat.rel = 'noopener';
    waFloat.setAttribute('aria-label', 'Chat on WhatsApp');
    waFloat.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;width:54px;height:54px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;z-index:9990;box-shadow:0 8px 28px rgba(37,211,102,0.4);transition:transform 0.3s;';
    waFloat.onmouseenter = () => waFloat.style.transform = 'scale(1.1)';
    waFloat.onmouseleave = () => waFloat.style.transform = 'scale(1)';
    waFloat.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.6-2-1.1-.5-.5-.9-1-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.7.7-.9 1.5-.9 2.5 0 1.5 1.1 2.9 1.2 3.1.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2"/></svg>';
    document.body.appendChild(waFloat);

    /* ───── COOKIE ───── */
    if (!storageGet('dvaaw_cookie')) {
        const ck = document.createElement('div');
        ck.id = 'cookie';
        ck.innerHTML = `
            <p>We remember your cart for a smoother experience. No tracking cookies. <a href="info.html">Privacy</a></p>
            <div class="cookie-btns">
                <button class="cookie-ok">Got it</button>
                <button class="cookie-no">Dismiss</button>
            </div>`;
        document.body.appendChild(ck);
        setTimeout(() => ck.classList.add('show'), 1400);
        ck.querySelector('.cookie-ok').onclick = () => { storageSet('dvaaw_cookie','ok'); ck.classList.remove('show'); };
        ck.querySelector('.cookie-no').onclick = () => { storageSet('dvaaw_cookie','no'); ck.classList.remove('show'); };
    }

    /* ───── REVEAL OBSERVER ───── */
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
            if (e.isIntersecting) {
                setTimeout(() => e.target.classList.add('in'), i * 70);
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
    function observeReveals() { document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el)); }
    window.DVAAW.observeReveals = observeReveals;

    /* ───── FIREBASE (auth, products, discount) ───── */
    let discount = null;                       // {active, percent, label}
    window.DVAAW.price = function (base) {
        if (discount && discount.active && discount.percent > 0) {
            return Math.max(1, Math.round(base * (100 - discount.percent)) / 100);
        }
        return base;
    };
    window.DVAAW.discountInfo = () => discount;

    window.addEventListener('dvaaw:auth', (e) => {
        const { profile } = e.detail || {};
        const link = document.getElementById('accountLink');
        if (link) {
            if (profile && profile.name) {
                const first = profile.name.split(' ')[0];
                link.textContent = 'Hello, ' + first;
            } else if (e.detail && e.detail.user) {
                link.textContent = 'My Account';
            } else {
                link.textContent = 'Account';
            }
        }
    });

    import('./firebase.js').then(async () => {
        try {
            // These reads are independent; fetching them together makes Firebase startup faster.
            const [remote, pricing, remoteDiscount] = await Promise.all([
                window.DVFB.fetchProducts().catch(() => []),
                window.DVFB.fetchPricing().catch(() => null),
                window.DVFB.fetchDiscount().catch(() => null)
            ]);
            // Merge admin products / overrides into catalog
            if (remote.length) {
                remote.forEach(rp => {
                    const i = CATALOG.findIndex(p => p.id === rp.id);
                    if (rp.hidden) {                       // removed by admin
                        if (i >= 0) CATALOG.splice(i, 1);
                        return;
                    }
                    if (i >= 0) CATALOG[i] = { ...CATALOG[i], ...rp };
                    else CATALOG.push({ id: rp.id, name: rp.name || rp.id, cat: rp.cat || 'unisex',
                                        notes: rp.notes || '', stock: rp.stock,
                                        img: rp.img || ('image/' + rp.id + '.webp') });
                });
            }
            // Global size pricing set by admin
            if (pricing && pricing.p10 > 0 && pricing.p35 > 0) {
                SIZES[0].price = pricing.p10;
                SIZES[1].price = pricing.p35;
            }
            // Load discount + banner
            discount = remoteDiscount;
            if (discount && discount.active && discount.percent > 0) {
                const bar = document.createElement('div');
                bar.style.cssText = 'background:var(--gold);color:var(--black);text-align:center;' +
                    'padding:0.55rem 1rem;font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;';
                bar.textContent = (discount.label || 'Sale') + ' — ' + discount.percent + '% off, applied at checkout';
                nav.after(bar);
            }
            window.dispatchEvent(new CustomEvent('dvaaw:catalog'));
        } catch (e) { console.warn('Remote catalog unavailable:', e); }
    }).catch(e => console.warn('Firebase unavailable — site works normally.', e));

    /* ───── INIT ───── */
    paintCount();
    window.addEventListener('storage', e => { if (e.key === 'dvaaw_cart') paintCount(); });
    document.addEventListener('DOMContentLoaded', observeReveals);
    observeReveals();

})();
