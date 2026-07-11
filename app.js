/* ═══════════════════════════════════════════════════════
   D'VAAW — Shared App Logic
   Injects nav + footer + toast + cookie. Handles cart state.
═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const WHATSAPP = '601118866239';
    const page = location.pathname.split('/').pop() || 'index.html';

    /* ───── PRODUCT CATALOG (single source of truth) ───── */
    const CATALOG = [
        // For Her
        { id:'red-gorgeous', name:'Red Gorgeous', cat:'her', notes:'Sweet · Fruity · Rose', img:'image/red-gorgeous.png' },
        { id:'candy', name:'Candy', cat:'her', notes:'Sweet · Vanilla · Lactonic', img:'image/candy.png' },
        { id:'the-goddess', name:'The Goddess', cat:'her', notes:'Vanilla · Amber · Powdery', img:'image/the-goddess.png' },
        { id:'selena-secret', name:'Selena Secret', cat:'her', notes:'Chocolate · Vanilla · Tropical', img:'image/selena-secret.png' },
        { id:'lady-boss', name:'Lady Boss', cat:'her', notes:'Fruity · Tropical · White Floral', img:'image/lady-boss.png' },
        { id:'demure-opium', name:'Demure Opium', cat:'her', notes:'Coffee · Vanilla · Balsamic', img:'image/demure-opium.png' },
        { id:'miss-bloom', name:'Miss Bloom', cat:'her', notes:'White Floral · Citrus · Woody', img:'image/miss-bloom.png' },
        { id:'love-sick', name:'Love Sick', cat:'her', notes:'Sweet · Fruity · Sour', img:'image/love-sick.png' },
        { id:'sweet-vanilla', name:'Sweet Vanilla', cat:'her', notes:'Vanilla · Woody · Amber', img:'image/sweet-vanilla.png' },
        { id:'glamorous', name:'Glamorous', cat:'her', notes:'Fruity · Chocolate · Aquatic', img:'image/glamorous.png' },
        { id:'roses-potion', name:'Roses Potion', cat:'her', notes:'Roses · Champagne · Amber', img:'image/roses-potion.png' },
        { id:'ms-classy', name:'Ms. Classy', cat:'her', notes:'Floral · Patchouli · Powdery', img:'image/ms-classy.png' },
        { id:'sweet-dew', name:'Sweet Dew', cat:'her', notes:'Ozonic · Rock Melon', img:'image/sweet-dew.png' },
        // For Him
        { id:'hottest-guy', name:'Hottest Guy', cat:'him', notes:'Fresh Spicy · Amber · Lavender', img:'image/hottest-guy.png' },
        { id:'the-zillion', name:'The Zillion', cat:'him', notes:'Cinnamon · Rose · Leather', img:'image/the-zillion.png' },
        { id:'great-man', name:'Great Man', cat:'him', notes:'Bergamot · Musky · Mossy', img:'image/great-man.png' },
        { id:'vip-scent', name:'VIP Scent', cat:'him', notes:'Aromatic · Citrus · Fruity', img:'image/vip-scent.png' },
        { id:'perfect-men', name:'Perfect Men', cat:'him', notes:'Citrus · Marine · Floral', img:'image/perfect-men.png' },
        { id:'the-gentleman', name:'The Gentleman', cat:'him', notes:'Aquatic · Lavender · Spicy', img:'image/the-gentleman.png' },
        { id:'the-eros-men', name:'The Eros Men', cat:'him', notes:'Aromatic · Citrus · Powdery', img:'image/the-eros-men.png' },
        { id:'titan-x', name:'Titan-X', cat:'him', notes:'Ginger · Bourbon Vanilla', img:'image/titan-x.png' },
        // Unisex
        { id:'obsession', name:'Obsession', cat:'unisex', notes:'Amber · Saffron · Musky', img:'image/obsession.png' },
        { id:'valora', name:'Valora', cat:'unisex', notes:'Vanilla · Black Pepper · Marine', img:'image/valora.png' },
        // Borneo Edition
        { id:'rentap-ridge', name:'Rentap Ridge', cat:'borneo', notes:'Shorea Macrophylia · Warm Spicy', img:'image/rentap-ridge.png' },
        { id:'borneo-luxe', name:'Borneo Luxe', cat:'borneo', notes:'Sweet · Woody · Borneo Nut', img:'image/borneo-luxe.png' },
    ];

    const SIZES = [
        { size:'10ml', price:18 },
        { size:'35ml', price:79 },
    ];

    const CAT_LABEL = { her:'For Her', him:'For Him', unisex:'Unisex', borneo:'Borneo Edition' };

    // Expose for pages that render products
    window.DVAAW = { CATALOG, SIZES, CAT_LABEL, WHATSAPP };

    /* ───── CART (safe, self-healing) ───── */
    function getCart() {
        try {
            const c = JSON.parse(localStorage.getItem('dvaaw_cart'));
            if (!Array.isArray(c)) return [];
            let changed = false;
            const cleaned = c.map(i => {
                if (!i || typeof i !== 'object') { changed = true; return null; }
                // Migrate old-format items (title/variant/category) to new format
                if (!i.name && i.title) { i.name = i.title; changed = true; }
                if (!i.size && i.variant) { i.size = i.variant; changed = true; }
                if (!i.cat && i.category) { i.cat = i.category; changed = true; }
                if (!i.key) { i.key = (i.id || i.name) + '-' + (i.size || ''); changed = true; }
                return i;
            }).filter(i =>
                i && i.name && i.size && typeof i.price === 'number' && i.qty > 0
            );
            if (cleaned.length !== c.length) changed = true;
            if (changed) localStorage.setItem('dvaaw_cart', JSON.stringify(cleaned));
            return cleaned;
        } catch { return []; }
    }
    function setCart(c) { localStorage.setItem('dvaaw_cart', JSON.stringify(c)); paintCount(); }
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
        let rv = JSON.parse(localStorage.getItem('dvaaw_viewed') || '[]');
        rv = rv.filter(x => x !== id);
        rv.unshift(id);
        rv = rv.slice(0, 6);
        localStorage.setItem('dvaaw_viewed', JSON.stringify(rv));
    }
    window.DVAAW.trackViewed = trackViewed;
    window.DVAAW.getViewed = () => JSON.parse(localStorage.getItem('dvaaw_viewed') || '[]');

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
        <button class="nav-toggle" id="navToggle" aria-label="Menu"><span></span><span></span><span></span></button>`;
    document.body.insertBefore(nav, document.body.firstChild);

    // Paint greeting INSTANTLY from cached profile — no flicker while Firebase wakes up
    (function instantGreeting() {
        try {
            const p = JSON.parse(localStorage.getItem('dvaaw_profile'));
            if (p && p.name) {
                const link = document.getElementById('accountLink');
                if (link) link.textContent = 'Hello, ' + p.name.split(' ')[0];
            }
        } catch {}
    })();

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
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
        document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
    }));

    let lastY = 0;
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
                <p>Halal luxury fragrances rooted in the soul of Borneo. Crafted with Gula Apong, made in Sarawak.</p>
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
            <span>© 2026 D'Vaaw Perfume · Kota Samarahan, Sarawak</span>
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
    if (!localStorage.getItem('dvaaw_cookie')) {
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
        ck.querySelector('.cookie-ok').onclick = () => { localStorage.setItem('dvaaw_cookie','ok'); ck.classList.remove('show'); };
        ck.querySelector('.cookie-no').onclick = () => { localStorage.setItem('dvaaw_cookie','no'); ck.classList.remove('show'); };
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
            // Merge admin products / overrides into catalog
            const remote = await window.DVFB.fetchProducts();
            if (remote.length) {
                remote.forEach(rp => {
                    const i = CATALOG.findIndex(p => p.id === rp.id);
                    if (i >= 0) CATALOG[i] = { ...CATALOG[i], ...rp };
                    else CATALOG.push({ id: rp.id, name: rp.name, cat: rp.cat || 'unisex',
                                        notes: rp.notes || '', img: rp.img || ('image/' + rp.id + '.png') });
                });
            }
            // Load discount + banner
            discount = await window.DVFB.fetchDiscount();
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
