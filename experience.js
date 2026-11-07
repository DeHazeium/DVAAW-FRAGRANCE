/* D'Vaaw discovery: local favourites, accessible quick view and scent finder. */
(() => {
    'use strict';
    const D = window.DVAAW;
    const esc = D.escapeHTML;
    const savedKey = 'dvaaw_saved';
    const getSaved = () => {
        try {
            const value = JSON.parse(D.storageGet(savedKey) || '[]');
            return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))] : [];
        } catch { return []; }
    };
    D.isSaved = id => getSaved().includes(id);
    D.toggleSaved = id => {
        if (!D.CATALOG.some(p => p.id === id)) return false;
        const saved = getSaved();
        const active = !saved.includes(id);
        D.storageSet(savedKey, JSON.stringify(active ? [...saved, id] : saved.filter(x => x !== id)));
        window.dispatchEvent(new CustomEvent('dvaaw:saved'));
        D.showToast(active ? 'Saved to your favourites on this device' : 'Removed from favourites');
        return active;
    };
    window.addEventListener('storage', e => {
        if (e.key === savedKey || e.key === null) window.dispatchEvent(new CustomEvent('dvaaw:saved'));
    });

    const dialog = document.createElement('dialog');
    dialog.className = 'discovery-dialog';
    dialog.setAttribute('aria-labelledby', 'discovery-title');
    document.body.appendChild(dialog);
    let returnFocus = null;
    let oldOverflow = '';
    let currentProduct = null;
    let selectedSize = '35ml';
    function show(html) {
        if (!dialog.open) {
            returnFocus = document.activeElement;
            oldOverflow = document.body.style.overflow;
        }
        dialog.innerHTML = `<button class="discovery-close" type="button" aria-label="Close dialog">×</button>${html}`;
        dialog.querySelector('.discovery-close').onclick = () => dialog.close();
        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        dialog.scrollTop = 0;
        dialog.querySelector('#discovery-title')?.focus({ preventScroll: true });
    }
    dialog.addEventListener('click', e => { if (e.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) dialog.close();
    }});
    dialog.addEventListener('close', () => {
        currentProduct = null;
        document.body.style.overflow = oldOverflow;
        if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
    const money = base => 'RM' + D.price(base).toFixed(2);
    function saveButton(id) {
        return `<button class="discovery-save" type="button" data-save="${esc(id)}" aria-pressed="${D.isSaved(id)}">${D.icon('heart')} ${D.isSaved(id) ? 'Saved' : 'Save scent'}</button>`;
    }
    D.openProduct = id => {
        const p = D.CATALOG.find(item => item.id === id);
        if (!p) { D.showToast('This fragrance is no longer available. Explore the collection.'); return; }
        currentProduct = id;
        selectedSize = '35ml';
        D.trackViewed(id);
        renderProduct();
    };
    function renderProduct() {
        const p = D.CATALOG.find(item => item.id === currentProduct);
        if (!p) { dialog.close(); return; }
        const size = D.SIZES.find(s => s.size === selectedSize) || D.SIZES[0];
        const profile = [['Top', p.top], ['Heart', p.middle], ['Base', p.base]].filter(([, note]) => note);
        show(`<div class="discovery-product">
            <div class="discovery-photo"><img src="${D.safeImageSource(p.img)}" alt="${esc(p.name)} perfume" decoding="async"></div>
            <div class="discovery-copy">
                <span class="eyebrow">${esc(D.CAT_LABEL[p.cat] || 'The collection')} · Eau de parfum</span>
                <h2 id="discovery-title" tabindex="-1">${esc(p.name)}</h2>
                <p class="discovery-notes">${esc(p.notes || '')}</p>
                ${p.description ? `<p class="discovery-description">${esc(p.description)}</p>` : ''}
                ${profile.length ? `<dl class="note-pyramid">${profile.map(([label, note], index) => `<div><dt><span>0${index + 1}</span>${label}</dt><dd>${esc(note)}</dd></div>`).join('')}</dl>` : `<p class="discovery-description">Explore the notes above to find your next signature scent. Choose a pocket-sized 10ml or the everyday 35ml bottle.</p>`}
                <fieldset class="discovery-sizes"><legend>Choose your size</legend>${D.SIZES.map(s => `<button type="button" data-variant="${esc(s.size)}" aria-pressed="${s.size === selectedSize}"><strong>${esc(s.size)}</strong><span>${money(s.price)}</span></button>`).join('')}</fieldset>
                <div class="discovery-purchase"><strong>${money(size.price)}</strong><span>Shipping calculated in your bag</span></div>
                <button type="button" class="btn btn-dark discovery-add" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of stock' : 'Add to bag'}</button>
                <div class="discovery-tools">${saveButton(p.id)}<button type="button" class="discovery-share">Copy scent link ↗</button><a href="cart.html">View bag →</a></div>
                <p class="discovery-status" role="status" aria-live="polite"></p>
            </div></div>`);
        dialog.querySelector('img').onerror = e => D.useFallbackImage(e.target);
        dialog.querySelectorAll('[data-variant]').forEach(button => button.onclick = () => {
            selectedSize = button.dataset.variant;
            renderProduct();
            dialog.querySelector(`[data-variant="${selectedSize}"]`).focus();
        });
        dialog.querySelector('.discovery-add').onclick = () => {
            if (D.addToCart(p.id, selectedSize, size.price)) {
                dialog.querySelector('.discovery-status').textContent = `${p.name}, ${selectedSize} added to your bag.`;
            }
        };
        dialog.querySelector('.discovery-share').onclick = async () => {
            const url = new URL('shop.html', location.href);
            url.searchParams.set('product', p.id);
            const status = dialog.querySelector('.discovery-status');
            try {
                await navigator.clipboard.writeText(url.href);
                status.textContent = 'Scent link copied. Share it with someone you love.';
            } catch {
                status.replaceChildren();
                const label = document.createElement('label');
                label.textContent = 'Copy this scent link: ';
                const input = document.createElement('input');
                input.readOnly = true; input.value = url.href;
                label.append(input); status.append(label); input.select();
            }
        };
    }
    document.addEventListener('click', e => {
        const save = e.target.closest('[data-save]');
        if (save) { e.preventDefault(); D.toggleSaved(save.dataset.save); }
        const product = e.target.closest('[data-open-product]');
        if (product) { e.preventDefault(); D.openProduct(product.dataset.openProduct); }
        if (e.target.closest('[data-open-finder]')) { e.preventDefault(); D.openFinder(); }
    });
    window.addEventListener('dvaaw:saved', () => {
        document.querySelectorAll('[data-save]').forEach(button => {
            const saved = D.isSaved(button.dataset.save);
            button.setAttribute('aria-pressed', String(saved));
            button.innerHTML = D.icon('heart') + (saved ? ' Saved' : ' Save scent');
        });
    });

    const families = {
        fresh: { label: 'Fresh & bright', words: ['fresh', 'citrus', 'aquatic', 'marine', 'bergamot', 'lime', 'mandarin', 'ozonic'] },
        floral: { label: 'Soft & floral', words: ['floral', 'rose', 'orchid', 'blossom', 'lavender'] },
        sweet: { label: 'Sweet & comforting', words: ['sweet', 'vanilla', 'fruity', 'fruit', 'chocolate', 'cacao', 'caramel', 'lactonic'] },
        woody: { label: 'Warm & woody', words: ['wood', 'amber', 'spicy', 'musk', 'smoky', 'cinnamon', 'saffron', 'ginger'] }
    };
    const occasions = {
        everyday: ['fresh', 'citrus', 'aquatic', 'floral'],
        evening: ['amber', 'musk', 'wood', 'spicy', 'vanilla'],
        gift: []
    };
    // Transparent note-based suggestions; this is a preference guide, not an AI assessment.
    D.rankScents = (answers, catalog = D.CATALOG) => catalog.filter(p =>
        p.stock !== 0 && (answers.collection === 'all' || p.cat === answers.collection)
    ).map(p => {
        const text = [p.notes, p.top, p.middle, p.base].filter(Boolean).join(' ').toLowerCase();
        const matches = (families[answers.family]?.words || []).filter(word => text.includes(word));
        const occasionScore = (occasions[answers.occasion] || []).filter(word => text.includes(word)).length;
        return { product: p, matches, score: matches.length * 3 + occasionScore };
    }).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).slice(0, 3);
    let step = 0;
    let answers = {};
    const questions = [
        { key: 'collection', title: 'Which collection speaks to you?', hint: 'A starting point. There are no rules to finding your scent.', options: [['all','Explore everything','An open mind, a new discovery'],['her','For Her','Expressive and captivating'],['him','For Him','Confident and distinctive'],['unisex','Unisex','Made to be shared'],['borneo','Borneo Edition','A sense of home']] },
        { key: 'family', title: 'What draws you in?', hint: 'Choose the scent family you naturally reach for.', options: [['fresh','Fresh & bright','Citrus, aquatic and airy notes'],['floral','Soft & floral','Rose, blossoms and gentle florals'],['sweet','Sweet & comforting','Vanilla, fruit and gourmand notes'],['woody','Warm & woody','Amber, woods and warming spice']] },
        { key: 'occasion', title: 'When will you wear it?', hint: 'A daily ritual, a special moment, or a thoughtful gift.', options: [['everyday','Everyday signature','From morning plans to spontaneous moments'],['evening','An evening to remember','For moments that feel a little special'],['gift','A gift for someone','A thoughtful scent, chosen with care']] }
    ];
    D.openFinder = D.openQuiz = () => { currentProduct = null; step = 0; answers = {}; renderQuestion(); };
    function renderQuestion() {
        const q = questions[step];
        show(`<div class="finder-panel"><span class="eyebrow">The scent finder · ${step + 1} / 3</span>
            <div class="finder-progress" aria-hidden="true">${questions.map((_, i) => `<span class="${i <= step ? 'complete' : ''}"></span>`).join('')}</div>
            <h2 id="discovery-title" tabindex="-1">${q.title}</h2><p>${q.hint}</p>
            <div class="finder-options">${q.options.map(([value,title,subtitle]) => `<button type="button" data-answer="${value}" aria-pressed="${answers[q.key] === value}"><strong>${title}</strong><span>${subtitle}</span><i aria-hidden="true">↗</i></button>`).join('')}</div>
            <div class="finder-bottom"><button type="button" class="finder-back" ${step === 0 ? 'disabled' : ''}>← Back</button><span>Three questions. A little inspiration.</span></div></div>`);
        dialog.querySelector('.finder-back').onclick = () => { step--; renderQuestion(); };
        dialog.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
            answers[q.key] = button.dataset.answer;
            if (step < questions.length - 1) { step++; renderQuestion(); } else renderResults();
        });
    }
    function renderResults() {
        const results = D.rankScents(answers);
        show(`<div class="finder-panel finder-results"><span class="eyebrow">Your scent edit</span>
            <h2 id="discovery-title" tabindex="-1">A little more <em>you.</em></h2>
            <p>Inspired by your ${esc(families[answers.family].label.toLowerCase())} preference. Suggestions use the collection's listed notes; your favourite is yours to discover.</p>
            <div class="finder-matches">${results.map(({product:p, matches}) => `<article><button class="finder-result-image" type="button" data-open-product="${esc(p.id)}" aria-label="Discover ${esc(p.name)}"><img src="${D.safeImageSource(p.img)}" alt="${esc(p.name)}" decoding="async"></button><span class="eyebrow">${matches.length ? 'Notes you may love' : 'Explore something different'}</span><h3>${esc(p.name)}</h3><p>${esc(p.notes)}</p><button type="button" class="btn btn-dark" data-open-product="${esc(p.id)}">Discover scent ↗</button></article>`).join('') || '<p>No available scents in this collection right now. Try another collection.</p>'}</div>
            <div class="finder-bottom"><button type="button" class="finder-restart">↻ Start again</button><a href="shop.html">Explore all fragrances →</a></div></div>`);
        dialog.querySelectorAll('img').forEach(img => img.onerror = () => D.useFallbackImage(img));
        dialog.querySelector('.finder-restart').onclick = D.openFinder;
    }
    window.addEventListener('dvaaw:catalog', () => {
        if (dialog.open && currentProduct) renderProduct();
        else if (dialog.open && dialog.querySelector('.finder-results')) renderResults();
    });
    if (new URLSearchParams(location.search).get('finder') === '1') {
        D.openFinder();
        const url = new URL(location.href); url.searchParams.delete('finder');
        history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
})();
