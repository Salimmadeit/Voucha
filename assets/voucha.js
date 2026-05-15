/* Voucha — frontend ⇄ backend bridge
 *
 * Loaded as `<script src="assets/voucha.js" defer></script>` from every screen.
 * Exposes a single global, `window.Voucha`, with four namespaces:
 *
 *   Voucha.config   environment-level constants (API base, Squad key)
 *   Voucha.session  token + org/user context, with require() guard
 *   Voucha.flow     handoff state across upload → trust-score → settlement
 *   Voucha.api      fetch wrapper: auth header + CSRF + typed errors
 *   Voucha.squad    inline-checkout integration stub
 *   Voucha.ui       small DOM helpers (toast, file-validate) shared across pages
 *
 * Nothing here makes a real network call yet — the backend team should swap
 * the FAKE_API block for a live base URL. The contract is documented in
 * BACKEND_CONTRACT.md alongside this file.
 */

(function (global) {
  'use strict';

  /* ---------- config ---------- */
  const CONFIG = {
    API_BASE: (global.__VOUCHA_API_BASE__ || '/api/v1'),
    SQUAD_PUBLIC_KEY: (global.__VOUCHA_SQUAD_KEY__ || 'pk_test_PLACEHOLDER'),
    SESSION_KEY: 'voucha.session',
    FLOW_KEY: 'voucha.flow',
    CSRF_COOKIE: 'voucha_csrf',
    MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
    ACCEPTED_MIME: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'],
    ACCEPTED_EXT:  ['.pdf', '.jpg', '.jpeg', '.png', '.heic'],
  };

  /* ---------- typed errors ---------- */
  class VouchaError extends Error {
    constructor(code, message, status, payload) {
      super(message);
      this.name = 'VouchaError';
      this.code = code;
      this.status = status;
      this.payload = payload;
    }
  }

  /* ---------- cookies / storage ---------- */
  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function readJSON(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }
  function writeJSON(key, value) {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  }

  /* ---------- Voucha.session ---------- */
  const session = {
    get() { return readJSON(CONFIG.SESSION_KEY); },
    isAuthed() { const s = this.get(); return !!(s && s.token && s.exp && s.exp > Date.now()); },
    set(s) { writeJSON(CONFIG.SESSION_KEY, s); },
    clear() { writeJSON(CONFIG.SESSION_KEY, null); writeJSON(CONFIG.FLOW_KEY, null); },
    /** Guard a protected screen. If no valid session, redirect to landing. */
    require(redirect) {
      if (this.isAuthed()) return this.get();
      const target = redirect || 'landing.html';
      // Allow the backend team to flip a flag off in dev: ?nogate=1
      if (new URLSearchParams(location.search).has('nogate')) return null;
      if (!location.pathname.endsWith(target)) location.replace(target);
      return null;
    },
    /** Hydrate from a backend response (e.g. after Squad-callback or OTP login). */
    hydrate(payload) {
      // expected shape: { token, exp, org: {...}, user: {...} }
      if (!payload || !payload.token) throw new VouchaError('SESSION_INVALID', 'Bad session payload');
      this.set({
        token: payload.token,
        exp:   payload.exp || (Date.now() + 30 * 60 * 1000),
        org:   payload.org || null,
        user:  payload.user || null,
      });
    },
  };

  /* ---------- Voucha.flow ---------- */
  const flow = {
    get() { return readJSON(CONFIG.FLOW_KEY) || {}; },
    set(patch) { writeJSON(CONFIG.FLOW_KEY, Object.assign(this.get(), patch || {})); },
    clear() { writeJSON(CONFIG.FLOW_KEY, null); },
    /** A document was just uploaded; subsequent screens read this. */
    setDocument(doc) { this.set({ documentId: doc.id, documentName: doc.name, documentSize: doc.size, uploadedAt: Date.now() }); },
    setVerdict(v) { this.set({ verdictId: v.id, score: v.score, reasoning: v.reasoning }); },
    setPayment(p) { this.set({ paymentRef: p.reference, paymentStatus: p.status }); },
  };

  /* ---------- Voucha.api ---------- */
  async function call(path, opts) {
    opts = opts || {};
    const url = CONFIG.API_BASE.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
    const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    const tok = session.get();
    if (tok && tok.token) headers['Authorization'] = 'Bearer ' + tok.token;
    const csrf = readCookie(CONFIG.CSRF_COOKIE);
    if (csrf && (opts.method || 'GET').toUpperCase() !== 'GET') headers['X-CSRF-Token'] = csrf;

    let body = opts.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body,
        credentials: 'same-origin',
        signal: opts.signal,
      });
    } catch (e) {
      throw new VouchaError('NETWORK', 'Network unreachable: ' + e.message, 0);
    }

    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const code = (payload && payload.code) || ('HTTP_' + res.status);
      throw new VouchaError(code, (payload && payload.message) || res.statusText, res.status, payload);
    }
    return payload;
  }

  const api = {
    call,
    /** POST /documents — multipart upload. Returns { id, name, size, hash }. */
    uploadDocument(file, onProgress) {
      const fd = new FormData();
      fd.append('document', file, file.name);
      // XHR for progress; fetch can't surface upload progress yet
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.API_BASE.replace(/\/$/, '') + '/documents');
        const tok = session.get();
        if (tok && tok.token) xhr.setRequestHeader('Authorization', 'Bearer ' + tok.token);
        const csrf = readCookie(CONFIG.CSRF_COOKIE);
        if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
        xhr.responseType = 'json';
        xhr.upload.onprogress = (e) => onProgress && onProgress(e.loaded, e.total);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else reject(new VouchaError('UPLOAD_FAIL', 'Upload failed', xhr.status, xhr.response));
        };
        xhr.onerror = () => reject(new VouchaError('NETWORK', 'Upload network error', 0));
        xhr.send(fd);
      });
    },
    /** GET /verdicts/:id — poll for the AI verdict. */
    getVerdict(documentId) { return call('/documents/' + encodeURIComponent(documentId) + '/verdict'); },
    /** POST /settlements — start a Squad checkout, returns { reference, signedRequest }. */
    initSettlement(verdictId, method) {
      return call('/settlements', { method: 'POST', body: { verdictId, method } });
    },
    /** POST /settlements/:ref/confirm — server verifies with Squad after redirect. */
    confirmSettlement(reference) {
      return call('/settlements/' + encodeURIComponent(reference) + '/confirm', { method: 'POST' });
    },
  };

  /* ---------- Voucha.squad ---------- */
  // Wraps Squad's inline checkout (squadInlineJS). Only the settlement screen
  // should actually load https://checkout.squadco.com/widget/squad.min.js.
  const squad = {
    /** Returns a Promise resolving with a Squad transaction reference. */
    initCheckout(opts) {
      // opts: { amountKobo, currency, reference, email, customer_name, onSuccess, onClose }
      if (typeof global.squad !== 'function' && typeof global.Squad !== 'function') {
        // Library hasn't loaded — fail loud so the team notices in dev.
        return Promise.reject(new VouchaError('SQUAD_MISSING',
          'Squad inline script not loaded. Add <script src="https://checkout.squadco.com/widget/squad.min.js"> to settlement.html.', 0));
      }
      return new Promise((resolve, reject) => {
        const SquadCtor = global.squad || global.Squad;
        const widget = new SquadCtor({
          onClose: () => { opts.onClose && opts.onClose(); reject(new VouchaError('USER_CANCELLED', 'User closed Squad', 0)); },
          onLoad: () => {},
          onSuccess: (tx) => { opts.onSuccess && opts.onSuccess(tx); resolve(tx); },
          key: CONFIG.SQUAD_PUBLIC_KEY,
          email: opts.email,
          amount: opts.amountKobo,             // Squad expects kobo
          currency_code: opts.currency || 'NGN',
          transaction_ref: opts.reference,
          customer_name: opts.customer_name || '',
          payment_channels: opts.channels || ['card', 'bank', 'ussd', 'transfer'],
        });
        widget.setup();
        widget.open();
      });
    },
  };

  /* ---------- Voucha.ui ---------- */
  const ui = {
    /** Validate a chosen file before upload (size + MIME + extension). */
    validateFile(file) {
      if (!file) return { ok: false, code: 'NO_FILE', message: 'Select a file' };
      if (file.size > CONFIG.MAX_UPLOAD_BYTES) {
        return { ok: false, code: 'TOO_LARGE', message: 'File exceeds 25MB' };
      }
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (CONFIG.ACCEPTED_EXT.indexOf(ext) === -1) {
        return { ok: false, code: 'BAD_EXT', message: 'Only PDF, JPG, PNG, or HEIC' };
      }
      if (file.type && CONFIG.ACCEPTED_MIME.indexOf(file.type) === -1 && ext !== '.heic') {
        return { ok: false, code: 'BAD_MIME', message: 'Unsupported MIME ' + file.type };
      }
      return { ok: true };
    },
    toast(msg, kind) {
      let host = document.getElementById('voucha-toast');
      if (!host) {
        host = document.createElement('div');
        host.id = 'voucha-toast';
        host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(host);
      }
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'background:#0A0E1A;color:#fff;padding:10px 16px;border-radius:8px;font:500 13px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-width:min(440px,90vw);';
      if (kind === 'warn') t.style.background = '#C8941D';
      if (kind === 'error') t.style.background = '#DC2626';
      host.appendChild(t);
      setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, 3200);
    },
  };

  /* ---------- expose ---------- */
  global.Voucha = {
    config: CONFIG,
    Error: VouchaError,
    session,
    flow,
    api,
    squad,
    ui,
  };
})(window);
