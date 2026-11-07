/* Collection discovery: search, filters, saved scents and accessible quick views. */
(function () {
    'use strict';
    const app = window.DVAAW;
    const esc = app.escapeHTML;
    const grid = document.getElementById('grid');
    const search = document.getElementById('scentSearch');
    const sort = document.getElementById('scentSort');
    const savedFilter = document.getElementById('savedFilter');
    const reset = document.getElementById('resetFilters');
    const selectedSizes = new Map();
    let category = 'all';
    let savedOnly = false;
    const categories = ['all', 'her', 'him', 'unisex', 'borneo'];
    const heart = app.icon('heart');

    function readURL() {
        const params = new URLSearchParams(location.search);
        category = categories.includes(params.get('cat')) ? params.get('cat') : 'all';
        search.value = (params.get('q') || '').slice(0, 120);
        sort.value = ['az', 'za'].includes(params.get('sort')) ? params.get('sort') : 'featured';
        savedOnly = params.get('saved') === '1';
    }

    function updateURL(product) {
        const url = new URL(location.href);
        for (const key of ['cat', 'q', 'sort', 'saved', 'product']) url.searchParams.delete(key);
        if (category !== 'all') url.searchParams.set('cat', category);
        if (search.value.trim()) url.searchParams.set('q', search.value.trim());
        if (sort.value !== 'featured') url.searchParams.set('sort', sort.value);
        if (savedOnly) url.searchParams.set('saved', '1');
        if (product) url.searchParams.set('product', product);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    function saved(id) { return app.isSaved ? app.isSaved(id) : false; }

    function profile(product) {
        if (!product.description) return '';
        const levels = [['Top', product.top], ['Middle', product.middle], ['Base', product.base]];
        return `<details class="pc-details"><summary>Discover the scent</summary>
            <p>${esc(product.description)}</p>
            <dl class="pc-profile">${levels.filter(([, value]) => value).map(([label, value]) =>
                `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></details>`;
    }

    function card(product) {
        const selected = selectedSizes.get(product.id) || app.SIZES[1].size;
        const variant = app.SIZES.find(size => size.size === selected) || app.SIZES[1];
        const isSaved = saved(product.id);
        return `<article class="prod-card" data-id="${esc(product.id)}">
            <div class="pc-visual">
                <button type="button" class="pc-img" data-shop-product="${esc(product.id)}" aria-label="Explore ${esc(product.name)}">
                    <img src="${app.safeImageSource(product.img)}" alt="${esc(product.name)}" width="600" height="800" loading="lazy" decoding="async" onerror="window.DVAAW.useFallbackImage(this)">
                    <span class="pc-quick-label">Explore scent ↗</span>
                </button>
                <button type="button" class="pc-save" data-shop-save="${esc(product.id)}" aria-label="${isSaved ? 'Unsave' : 'Save'} ${esc(product.name)}" aria-pressed="${isSaved}">${heart}</button>
            </div>
            <div class="pc-cat">${esc(app.CAT_LABEL[product.cat] || 'Collection')}</div>
            <h2 class="pc-name"><button type="button" data-shop-product="${esc(product.id)}">${esc(product.name)}</button></h2>
            <div class="pc-notes">${esc(product.notes)}</div>
            ${profile(product)}
            <div class="pc-price" data-card-price>RM${app.price(variant.price).toFixed(2)}</div>
            <div class="pc-actions">
                <div class="pc-size" role="group" aria-label="${esc(product.name)} bottle size">
                    ${app.SIZES.map(size => `<button type="button" data-shop-size="${esc(size.size)}" class="${size.size === variant.size ? 'sel' : ''}" aria-pressed="${size.size === variant.size}">${esc(size.size)}</button>`).join('')}
                </div>
                <button type="button" class="pc-add" data-shop-add ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
            </div>
        </article>`;
    }

    function updateSavedControls() {
        document.getElementById('savedCount').textContent = app.CATALOG.filter(product => saved(product.id)).length;
        savedFilter.setAttribute('aria-pressed', String(savedOnly));
        grid.querySelectorAll('[data-shop-save]').forEach(button => {
            const product = app.CATALOG.find(item => item.id === button.dataset.shopSave);
            const active = saved(button.dataset.shopSave);
            button.setAttribute('aria-pressed', String(active));
            button.setAttribute('aria-label', `${active ? 'Unsave' : 'Save'} ${product?.name || 'fragrance'}`);
        });
    }

    function render() {
        const terms = search.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
        const products = app.CATALOG.filter(product => {
            if (category !== 'all' && product.cat !== category) return false;
            if (savedOnly && !saved(product.id)) return false;
            const text = [product.name, product.notes, product.description, product.top, product.middle, product.base,
                app.CAT_LABEL[product.cat]].filter(Boolean).join(' ').toLocaleLowerCase();
            return terms.every(term => text.includes(term));
        });
        if (sort.value !== 'featured') {
            products.sort((a, b) => String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }) * (sort.value === 'za' ? -1 : 1));
        }
        document.getElementById('collectionCount').textContent = `${app.CATALOG.length} Fragrances`;
        document.getElementById('resultCount').textContent = `${products.length} ${savedOnly ? 'saved ' : ''}${products.length === 1 ? 'scent' : 'scents'}${category === 'all' ? '' : ' · ' + app.CAT_LABEL[category]}`;
        reset.hidden = category === 'all' && !search.value && sort.value === 'featured' && !savedOnly;
        document.querySelectorAll('[data-filter]').forEach(button => {
            const active = button.dataset.filter === category;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        grid.innerHTML = products.length ? products.map(card).join('') : `<div class="collection-empty">
            <span class="eyebrow">Your next favourite awaits</span>
            <h2>${savedOnly ? 'A little room for favourites.' : 'No scents found just yet.'}</h2>
            <p>${savedOnly ? 'Save a scent with the heart button, or adjust your filters to see your favourites.' : 'Try another name or note, or explore the full collection.'}</p>
            <button type="button" class="btn btn-dark" data-reset-collection>Explore all fragrances</button>
        </div>`;
        updateSavedControls();
    }

    function renderRecently() {
        const recent = app.getViewed().map(id => app.CATALOG.find(product => product.id === id)).filter(Boolean);
        document.getElementById('recently').style.display = recent.length ? 'block' : 'none';
        document.getElementById('recentlyGrid').innerHTML = recent.map(product => `<button type="button" class="rv-mini" data-shop-product="${esc(product.id)}" aria-label="Explore ${esc(product.name)}">
            <img src="${app.safeImageSource(product.img)}" alt="" loading="lazy" decoding="async" onerror="window.DVAAW.useFallbackImage(this)">
            <span class="n">${esc(product.name)}</span></button>`).join('');
    }

    function resetAll() {
        category = 'all'; savedOnly = false; search.value = ''; sort.value = 'featured';
        updateURL(); render(); search.focus();
    }

    function openProduct(id) {
        if (!app.CATALOG.some(product => product.id === id)) return;
        updateURL(id);
        app.openProduct(id);
        renderRecently();
    }

    search.addEventListener('input', () => { updateURL(); render(); });
    sort.addEventListener('change', () => { updateURL(); render(); });
    savedFilter.addEventListener('click', () => { savedOnly = !savedOnly; updateURL(); render(); });
    reset.addEventListener('click', resetAll);
    document.getElementById('filters').addEventListener('click', event => {
        const button = event.target.closest('[data-filter]');
        if (!button) return;
        category = button.dataset.filter;
        updateURL(); render();
    });
    document.addEventListener('click', event => {
        const opener = event.target.closest('[data-shop-product]');
        if (opener) { openProduct(opener.dataset.shopProduct); return; }
        if (event.target.closest('[data-reset-collection]')) { resetAll(); return; }
        const save = event.target.closest('[data-shop-save]');
        if (save) {
            const index = Array.from(grid.querySelectorAll('[data-shop-save]')).indexOf(save);
            app.toggleSaved(save.dataset.shopSave);
            if (savedOnly && !save.isConnected) {
                const remaining = grid.querySelectorAll('[data-shop-save]');
                (remaining[Math.min(index, remaining.length - 1)] || savedFilter).focus();
            }
            return;
        }
        const sizeButton = event.target.closest('[data-shop-size]');
        if (sizeButton) {
            const cardEl = sizeButton.closest('[data-id]');
            const variant = app.SIZES.find(size => size.size === sizeButton.dataset.shopSize);
            if (!variant) return;
            selectedSizes.set(cardEl.dataset.id, variant.size);
            cardEl.querySelectorAll('[data-shop-size]').forEach(button => {
                const active = button === sizeButton;
                button.classList.toggle('sel', active);
                button.setAttribute('aria-pressed', String(active));
            });
            cardEl.querySelector('[data-card-price]').textContent = 'RM' + app.price(variant.price).toFixed(2);
        }
        const addButton = event.target.closest('[data-shop-add]');
        if (addButton) {
            const id = addButton.closest('[data-id]').dataset.id;
            const variant = app.SIZES.find(size => size.size === selectedSizes.get(id)) || app.SIZES[1];
            app.addToCart(id, variant.size, variant.price);
            renderRecently();
        }
    });
    window.addEventListener('dvaaw:saved', () => { if (savedOnly) render(); else updateSavedControls(); });
    window.addEventListener('dvaaw:catalog', () => { render(); renderRecently(); });
    window.addEventListener('popstate', () => { readURL(); render(); });
    readURL(); render(); renderRecently();
    const initialProduct = new URLSearchParams(location.search).get('product');
    if (initialProduct) openProduct(initialProduct);
})();
