/**
 * auth.js — Frontend Auth Client for Django Day-43
 *
 * Design decisions:
 *  - Google Client ID is NEVER hardcoded here. It is fetched from
 *    GET /api/v1/users/config on startup.
 *  - Google login uses the OAuth2 popup flow (not One Tap) so any user
 *    can pick or switch their Google account freely.
 */

const API = 'http://localhost:8000';

// ── Token helpers ─────────────────────────────────────────────────────────
const Tokens = {
  set(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  },
  getAccess()  { return localStorage.getItem('access_token'); },
  getRefresh() { return localStorage.getItem('refresh_token'); },
  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// ── Runtime config (populated on startup from backend) ────────────────────
const Config = { googleClientId: null };

// ── HTTP helper ───────────────────────────────────────────────────────────
async function apiPost(path, body, useAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth) headers['Authorization'] = `Bearer ${Tokens.getAccess()}`;
  try {
    const res  = await fetch(`${API}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false, status: 0,
      data: { detail: 'Cannot reach server. Make sure Django is running on http://127.0.0.1:8000' },
    };
  }
}

async function apiGet(path) {
  try {
    const res  = await fetch(`${API}${path}`);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: {} };
  }
}

// ── Error normalizer ──────────────────────────────────────────────────────
function extractErrors(data) {
  if (!data || typeof data === 'string') return data || 'Something went wrong.';
  if (data.detail) return data.detail;
  const messages = [];
  for (const [key, val] of Object.entries(data)) {
    const prefix = key === 'non_field_errors' ? '' : `${key}: `;
    const msgs   = Array.isArray(val) ? val : [val];
    messages.push(...msgs.map(m => `${prefix}${m}`));
  }
  return messages.join(' | ') || 'Something went wrong. Please try again.';
}

// ── UI helpers ────────────────────────────────────────────────────────────
function showMsg(elId, type, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className      = 'msg-box ' + type;
  el.textContent    = message;
  el.style.display  = 'block';
}

function hideMsg(elId) {
  const el = document.getElementById(elId);
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}

function setLoading(btnId, loading) {
  const btn     = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled  = loading;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.spinner');
  if (label)   label.style.display   = loading ? 'none'         : 'inline';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function setGoogleBtnsDisabled(disabled) {
  document.querySelectorAll('.btn-google').forEach(b => {
    b.disabled = disabled;
    b.style.opacity = disabled ? '0.6' : '1';
  });
}

function setFieldError(formId, fieldName, msg) {
  const form  = document.getElementById(formId);
  const input = form ? form.elements[fieldName] : null;
  if (input) input.classList.add('error');
  const errEl = document.getElementById(`${formId}-err-${fieldName}`);
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

function clearErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('input').forEach(i => i.classList.remove('error'));
  form.querySelectorAll('.field-error').forEach(e => {
    e.textContent  = '';
    e.style.display = 'none';
  });
}

// ── Page router ───────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  hideMsg('login-msg');
  clearErrors('login-form');
  setLoading('login-btn', true);

  const form = document.getElementById('login-form');
  const payload = {
    username: form.elements['username'].value.trim(),
    password: form.elements['password'].value,
  };

  if (!payload.username || !payload.password) {
    showMsg('login-msg', 'error', 'Please fill in all fields.');
    setLoading('login-btn', false);
    return;
  }

  const { ok, data } = await apiPost('/api/v1/users/login', payload);
  setLoading('login-btn', false);

  if (ok) {
    Tokens.set(data.access, data.refresh);
    showMsg('login-msg', 'success', 'Signed in successfully! Redirecting…');
    setTimeout(() => renderDashboard(), 700);
    return;
  }

  showMsg('login-msg', 'error', extractErrors(data));
}

// ── REGISTER ──────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  hideMsg('register-msg');
  clearErrors('register-form');
  setLoading('register-btn', true);

  const form    = document.getElementById('register-form');
  const payload = {
    username:         form.elements['username'].value.trim(),
    first_name:       form.elements['first_name'].value.trim(),
    last_name:        form.elements['last_name'].value.trim(),
    email:            form.elements['email'].value.trim(),
    password:         form.elements['password'].value,
    password_confirm: form.elements['password_confirm'].value,
  };

  if (!payload.username || !payload.email || !payload.password || !payload.password_confirm) {
    showMsg('register-msg', 'error', 'Please fill in all required fields.');
    setLoading('register-btn', false);
    return;
  }

  if (payload.password !== payload.password_confirm) {
    showMsg('register-msg', 'error', 'Passwords do not match.');
    setLoading('register-btn', false);
    return;
  }

  const { ok, data } = await apiPost('/api/v1/users/register', payload);
  setLoading('register-btn', false);

  if (ok) {
    showMsg('register-msg', 'success', '✓ Account created! Redirecting to sign in…');
    setTimeout(() => showPage('login'), 1200);
    return;
  }

  const fieldMap = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name'];
  let hasFieldErr = false;
  for (const field of fieldMap) {
    if (data[field]) {
      const msg = Array.isArray(data[field]) ? data[field][0] : data[field];
      setFieldError('register-form', field, msg);
      hasFieldErr = true;
    }
  }
  if (!hasFieldErr) showMsg('register-msg', 'error', extractErrors(data));
}

// ── GOOGLE OAUTH POPUP FLOW ───────────────────────────────────────────────
//
// Strategy: use google.accounts.oauth2 (popup) instead of One Tap.
// This opens a real account-picker window, so multiple users can each
// choose their own Google account — no pre-selection, no session lock-in.
//
function triggerGoogleSignIn() {
  const activeMsgId = document.querySelector('.page.active')?.id?.replace('page-', '') + '-msg' || 'login-msg';

  if (!Config.googleClientId) {
    showMsg(activeMsgId, 'error', 'Google Sign-In is not configured. Check the backend GOOGLE_CLIENT_ID setting.');
    return;
  }

  if (!window.google) {
    showMsg(activeMsgId, 'error', 'Google Sign-In script is still loading, please wait a moment.');
    return;
  }

  setGoogleBtnsDisabled(true);

  // Request an ID token via popup — user gets full account picker
  const client = google.accounts.oauth2.initTokenClient({
    client_id: Config.googleClientId,
    scope: 'openid email profile',
    callback: () => {}, // overridden below
  });

  // Instead, use the ID token flow with a popup
  google.accounts.id.initialize({
    client_id: Config.googleClientId,
    callback: handleGoogleCredential,
    ux_mode: 'popup',       // ← popup window, not embedded One Tap
    auto_select: false,     // ← never auto-select, always show picker
    cancel_on_tap_outside: true,
  });

  // Render a hidden button and programmatically click it —
  // this is the only reliable way to trigger the popup with account choice
  const container = document.getElementById('google-btn-hidden');
  container.innerHTML = '';
  google.accounts.id.renderButton(container, {
    type: 'standard',
    size: 'large',
    theme: 'outline',
    text: 'signin_with',
    shape: 'rectangular',
    width: 1,
  });

  // Small delay so the button is in DOM, then click it
  setTimeout(() => {
    const btn = container.querySelector('[role="button"], button, div[tabindex]');
    if (btn) {
      btn.click();
    } else {
      // Fallback: prompt
      google.accounts.id.prompt((notification) => {
        setGoogleBtnsDisabled(false);
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showMsg(activeMsgId, 'error', 'Google Sign-In popup was blocked. Please allow popups for this site.');
        }
      });
    }
  }, 100);
}

async function handleGoogleCredential(response) {
  setGoogleBtnsDisabled(false);

  const activeMsgId = (document.querySelector('.page.active')?.id?.replace('page-', '') || 'login') + '-msg';
  hideMsg(activeMsgId);

  if (!response?.credential) {
    showMsg(activeMsgId, 'error', 'Google sign-in was cancelled.');
    return;
  }

  const { ok, data } = await apiPost('/api/v1/users/google/', { token: response.credential });

  if (ok) {
    Tokens.set(data.access, data.refresh);
    showMsg(activeMsgId, 'success', 'Signed in with Google!');
    setTimeout(() => renderDashboard(), 700);
    return;
  }

  showMsg(activeMsgId, 'error', data.detail || 'Google sign-in failed. Please try again.');
}

// ── LOGOUT ────────────────────────────────────────────────────────────────
async function handleLogout() {
  const refresh = Tokens.getRefresh();
  if (refresh) {
    await apiPost('/api/v1/users/logout', { refresh }, true).catch(() => {});
  }
  Tokens.clear();

  // Revoke Google session too so next click shows account picker again
  if (window.google && Config.googleClientId) {
    google.accounts.id.disableAutoSelect();
  }

  showPage('login');
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard() {
  const access = Tokens.getAccess();
  let username = 'User', email = '';
  if (access) {
    try {
      const payload = JSON.parse(atob(access.split('.')[1]));
      username = payload.username || 'User';
      email    = payload.email    || '';
    } catch (_) {}
  }

  const el = (id) => document.getElementById(id);
  if (el('dash-username')) el('dash-username').textContent = username;
  if (el('dash-email'))    el('dash-email').textContent    = email;
  if (el('dash-avatar'))   el('dash-avatar').textContent   = username.charAt(0).toUpperCase();

  showPage('dashboard');
}

// ── PASSWORD STRENGTH ─────────────────────────────────────────────────────
function updateStrength(val) {
  let score = 0;
  if (val.length >= 8)           score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[a-z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { w: '0%',   c: 'transparent', l: '' },
    { w: '20%',  c: '#E53E3E',     l: 'Very weak' },
    { w: '40%',  c: '#DD6B20',     l: 'Weak' },
    { w: '60%',  c: '#D69E2E',     l: 'Fair' },
    { w: '80%',  c: '#38A169',     l: 'Strong' },
    { w: '100%', c: '#276749',     l: 'Very strong' },
  ];
  const lv = levels[Math.min(score, 5)];
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (fill)  { fill.style.width = lv.w; fill.style.background = lv.c; }
  if (label) label.textContent = lv.l;
}

// ── PASSWORD TOGGLE ───────────────────────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show  = input.type === 'password';
  input.type  = show ? 'text' : 'password';
  btn.innerHTML = show
    ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.08 10.08 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ── STARTUP ───────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  // 1. Fetch public config from backend — no hardcoded secrets
  const { ok, data } = await apiGet('/api/v1/users/config');
  if (ok && data.google_client_id) {
    Config.googleClientId = data.google_client_id;
  } else {
    // Config fetch failed — disable Google buttons gracefully
    document.querySelectorAll('.btn-google').forEach(b => {
      b.disabled = true;
      b.title    = 'Google Sign-In unavailable — backend config not loaded';
      b.style.opacity = '0.5';
    });
    console.warn('Could not load /api/v1/users/config — Google Sign-In disabled.');
  }

  // 2. Route to dashboard if already logged in
  if (Tokens.getAccess()) {
    renderDashboard();
  } else {
    showPage('login');
  }
});

// Expose to HTML
window.showPage            = showPage;
window.handleLogin         = handleLogin;
window.handleRegister      = handleRegister;
window.handleLogout        = handleLogout;
window.triggerGoogleSignIn = triggerGoogleSignIn;
window.handleGoogleCredential = handleGoogleCredential;
window.togglePw            = togglePw;
window.updateStrength      = updateStrength;
JSEOF