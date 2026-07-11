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
    initializeFirestore, doc, getDoc, setDoc, addDoc, collection,
    getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

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

    async saveProduct(p) {                       // {id,name,cat,notes,img?}
        await setDoc(doc(db, 'products', p.id), { ...p, updated: Date.now() }, { merge: true });
    },

    async uploadProductImage(id, file) {
        const r = ref(storage, 'products/' + id + '-' + Date.now());
        await uploadBytes(r, file);
        return await getDownloadURL(r);
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
