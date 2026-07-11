/* ═══════════════════════════════════════════════════════
   D'VAAW — Firebase module (auth, profiles, products,
   discounts, image upload, order logging)
═══════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    initializeFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, collection,
    getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
const app = initializeApp({
    apiKey: "AIzaSyCxOigVTO2ZCeKYoVRJvU085fEiEL9EKOI",
    authDomain: "d-vaaw-perfume.firebaseapp.com",
    databaseURL: "https://d-vaaw-perfume-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "d-vaaw-perfume",
    storageBucket: "d-vaaw-perfume.firebasestorage.app",
    messagingSenderId: "176200300799",
    appId: "1:176200300799:web:ee8893e3e3e6a4dd14b4ca"
});
const auth = getAuth(app);
const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true   // fixes "client is offline" on strict networks
});

const ADMIN_USERNAME = 'dvaaw_nick';          // temporary — see SECURITY.txt
const norm = s => (s || '').trim().toLowerCase();

/* Identifier → email. Accepts email, username, or phone. */
async function resolveEmail(identifier) {
    const id = norm(identifier);
    if (id.includes('@')) return id;
    try {
        const snap = await getDoc(doc(db, 'lookups', id.replace(/[^a-z0-9+]/g, '')));
        if (snap.exists()) return snap.data().email;
        throw new Error('No account found for that username / phone.');
    } catch (e) {
        if ((e.message || '').includes('offline')) {
            throw new Error('Connection issue — try signing in with your email instead.');
        }
        throw e;
    }
}

const DVFB = {
    user: null,
    profile: null,

    get isAdmin() { return !!this.profile && norm(this.profile.username) === ADMIN_USERNAME; },

    async register({ name, age, prefs, email, username, phone, password }) {
        email = norm(email);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        const profile = { name, age: age || null, prefs: prefs || [], email,
                          username: username || '', phone: phone || '', created: Date.now() };
        await setDoc(doc(db, 'users', uid), profile);
        localStorage.setItem('dvaaw_profile', JSON.stringify({ uid, ...profile }));
        // lookups so people can log in with username or phone
        if (username) await setDoc(doc(db, 'lookups', norm(username).replace(/[^a-z0-9+]/g,'')), { email });
        if (phone)    await setDoc(doc(db, 'lookups', norm(phone).replace(/[^a-z0-9+]/g,'')),    { email });
        this.user = cred.user; this.profile = profile;
        return profile;
    },

    async login(identifier, password) {
        const email = await resolveEmail(identifier);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
    },

    logout() {
        localStorage.removeItem('dvaaw_profile');
        return signOut(auth);
    },

    async loadProfile(uid) {
        // Try Firestore with one retry; fall back to cached copy
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const snap = await getDoc(doc(db, 'users', uid));
                if (snap.exists()) {
                    this.profile = snap.data();
                    localStorage.setItem('dvaaw_profile', JSON.stringify({ uid, ...this.profile }));
                    return this.profile;
                }
                break;
            } catch (e) {
                if (attempt === 0) await new Promise(r => setTimeout(r, 800));
            }
        }
        // Firestore unavailable → use cache so "Hello, name" still works
        try {
            const cached = JSON.parse(localStorage.getItem('dvaaw_profile'));
            if (cached && cached.uid === uid) { this.profile = cached; return cached; }
        } catch {}
        this.profile = null;
        return null;
    },

    async saveProfile(patch) {
        if (!this.user) throw new Error('Not logged in');
        this.profile = { ...(this.profile || {}), ...patch };
        await setDoc(doc(db, 'users', this.user.uid), this.profile, { merge: true });
        localStorage.setItem('dvaaw_profile', JSON.stringify({ uid: this.user.uid, ...this.profile }));
        window.dispatchEvent(new CustomEvent('dvaaw:auth', { detail: { user: this.user, profile: this.profile } }));
        return this.profile;
    },

    /* ── Products (admin adds/overrides; everyone reads) ── */
    async fetchProducts() {
        const out = [];
        const qs = await getDocs(collection(db, 'products'));
        qs.forEach(d => out.push({ id: d.id, ...d.data() }));
        return out;
    },

    async saveProduct(p) {                       // {id,name,cat,notes,img?,stock?}
        await setDoc(doc(db, 'products', p.id), { ...p, updated: Date.now() }, { merge: true });
    },

    async deleteProduct(id) {                    // admin-added → gone; built-in → hidden
        const builtIn = ['red-gorgeous','candy','the-goddess','selena-secret','lady-boss','demure-opium','miss-bloom','love-sick','sweet-vanilla','glamorous','roses-potion','ms-classy','sweet-dew','hottest-guy','the-zillion','great-man','vip-scent','perfect-men','the-gentleman','the-eros-men','titan-x','obsession','valora','rentap-ridge','borneo-luxe'];
        if (builtIn.includes(id)) {
            await setDoc(doc(db, 'products', id), { id, hidden: true, updated: Date.now() }, { merge: true });
        } else {
            await deleteDoc(doc(db, 'products', id));
        }
    },

    async restoreProduct(id) {                   // un-hide a built-in
        await setDoc(doc(db, 'products', id), { hidden: false, updated: Date.now() }, { merge: true });
    },

    async setStock(id, stock) {
        await setDoc(doc(db, 'products', id), { id, stock: Math.max(0, stock|0), updated: Date.now() }, { merge: true });
    },

    /* ── Global size pricing (settings/pricing) ── */
    async fetchPricing() {
        const snap = await getDoc(doc(db, 'settings', 'pricing'));
        return snap.exists() ? snap.data() : null;      // {p10, p35}
    },
    async savePricing(p10, p35) {
        await setDoc(doc(db, 'settings', 'pricing'), { p10, p35, updated: Date.now() });
    },

    /* Compress the picture in the browser and store it inside the
       product document itself — no Firebase Storage (free plan). */
    async uploadProductImage(id, file) {
        if (file.size > 8 * 1024 * 1024) throw new Error('Image too large — pick one under 8MB.');
        const dataUrl = await new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const MAX = 700;                          // longest side
                let { width: w, height: h } = img;
                if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX; }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
            img.src = url;
        });
        if (dataUrl.length > 900000) throw new Error('Image still too big after compression — try a smaller photo.');
        return dataUrl;                                   // stored in the product doc's img field
    },

    /* ── Discount (settings/discount) ── */
    async fetchDiscount() {
        const snap = await getDoc(doc(db, 'settings', 'discount'));
        return snap.exists() ? snap.data() : null;
    },
    async saveDiscount(d) {                      // {active, percent, label}
        await setDoc(doc(db, 'settings', 'discount'), d);
    },

    /* ── Orders ── */
    saveOrder(cart, subtotal, shipping, total) {
        addDoc(collection(db, 'orders'), {
            orderItems: cart, subtotal, shippingFee: shipping, totalAmount: total,
            user: this.user ? { uid: this.user.uid, email: this.user.email } : null,
            status: 'Pending WhatsApp Confirmation', timestamp: serverTimestamp()
        }).catch(e => console.error('Order log failed:', e));
    }
};

onAuthStateChanged(auth, async (user) => {
    DVFB.user = user;
    DVFB.profile = user ? await DVFB.loadProfile(user.uid).catch(() => null) : null;
    window.dispatchEvent(new CustomEvent('dvaaw:auth', { detail: { user, profile: DVFB.profile } }));
});

window.DVFB = DVFB;
window.dvaawSaveOrder = (...a) => DVFB.saveOrder(...a);   // cart.html compatibility
export default DVFB;
