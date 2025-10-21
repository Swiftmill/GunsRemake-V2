const state = {
  token: null,
  user: null,
  pages: [],
  badges: [],
  currentPage: 'swift',
  view: 'landing',
  error: null,
  message: null,
};

const apiBase = '';

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Requête échouée');
  }
  return res.json();
}

function setState(partial) {
  Object.assign(state, partial);
  render();
}

async function loadInitial() {
  try {
    const badges = await api('/api/badges');
    setState({ badges: badges.badges });
  } catch (error) {
    console.warn('Failed to load badges', error);
  }
  try {
    const page = await api(`/api/users/${state.currentPage}`);
    setState({ currentPageData: page });
  } catch (error) {
    console.warn('Failed to load page', error);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    username: form.username.value,
    password: form.password.value,
  };
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setState({ token: data.token, user: data.user, view: 'dashboard', error: null, message: 'Connexion réussie' });
    await refreshDashboard();
  } catch (error) {
    setState({ error: error.message });
  }
}

async function refreshDashboard() {
  if (!state.user) return;
  try {
    const [pageRes, badgesRes] = await Promise.all([
      api(`/api/users/${state.user.username}`),
      api('/api/badges'),
    ]);
    setState({ currentPageData: pageRes, badges: badgesRes.badges });
    if (state.user.roles?.includes('admin')) {
      const users = await api('/api/admin/users');
      setState({ adminUsers: users.users });
    }
  } catch (error) {
    setState({ error: error.message });
  }
}

async function handleUpdatePage(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    bio: form.bio.value,
    theme: form.theme.value,
    links: form.links.value
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [label, url] = line.split('|');
        return { label: label?.trim(), url: url?.trim() };
      })
      .filter((link) => link.label && link.url),
  };
  try {
    const data = await api(`/api/users/${state.user.username}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setState({ currentPageData: { ...state.currentPageData, page: data.page }, message: 'Page mise à jour' });
  } catch (error) {
    setState({ error: error.message });
  }
}

async function handleCreateBadge(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    id: form.badgeId.value,
    label: form.badgeLabel.value,
    icon: form.badgeIcon.value,
  };
  try {
    await api('/api/badges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setState({ message: 'Badge créé', error: null });
    await refreshDashboard();
    form.reset();
  } catch (error) {
    setState({ error: error.message });
  }
}

async function handleQuotaUpdate(event, username) {
  event.preventDefault();
  const form = event.target;
  try {
    await api(`/api/admin/users/${username}`, {
      method: 'PATCH',
      body: JSON.stringify({ quotaMb: Number(form.quota.value) }),
    });
    setState({ message: 'Quota mis à jour' });
    await refreshDashboard();
  } catch (error) {
    setState({ error: error.message });
  }
}

function badgePill(badge) {
  return `<span class="badge">${badge.icon || '🏷'} ${badge.label}</span>`;
}

function renderLanding() {
  const current = state.currentPageData;
  const page = current?.page;
  const user = current?.user;
  return `
    <header>
      <div class="brand">guns.lol — édition autonome</div>
      <p>Réplica locale 100% fichiers : utilisateurs, pages et assets stockés dans <code>/data/guns</code>.</p>
      <div>
        <button id="login-btn">Se connecter</button>
      </div>
    </header>
    <main>
      <section class="panel profile-card">
        <div class="profile-header">
          <div>
            <div class="profile-name">${user?.displayName || 'Utilisateur inconnu'}</div>
            <div class="muted">@${user?.username || state.currentPage}</div>
          </div>
        </div>
        <p>${page?.bio || 'Cette page est prête à être personnalisée.'}</p>
        <div class="links">
          ${(page?.links || []).map((link) => `<a href="${link.url}" target="_blank">${link.label}</a>`).join('')}
        </div>
        <div class="badges">
          ${(page?.badges || []).map((id) => {
            const badge = state.badges.find((item) => item.id === id);
            return badge ? badgePill(badge) : '';
          }).join('')}
        </div>
      </section>
      <section class="panel">
        <h2>Administration sur fichiers</h2>
        <p>Utilisez les endpoints REST pour gérer les comptes, quotas, badges et assets. Tout est persisté en JSON.</p>
        <ul>
          <li>POST <code>/api/auth/register</code> pour créer un utilisateur</li>
          <li>POST <code>/api/users/&lt;username&gt;/assets</code> pour déposer un asset (base64)</li>
          <li>POST <code>/api/admin/backup</code> pour générer une archive ZIP</li>
        </ul>
      </section>
      <section class="panel">
        <h2>Comptes de démonstration</h2>
        <p>swift / swiftpass — moh / mohpass — hris / hrispass — admin / adminpass</p>
        <p>Connectez-vous pour accéder au panneau de configuration.</p>
      </section>
    </main>
    <div class="footer">© ${new Date().getFullYear()} guns.lol local replica</div>
  `;
}

function renderLogin() {
  return `
    <section class="panel">
      <h2>Connexion</h2>
      ${state.error ? `<div class="alert error">${state.error}</div>` : ''}
      <form id="login-form">
        <label for="username">Nom d'utilisateur</label>
        <input name="username" id="username" required />
        <label for="password">Mot de passe</label>
        <input type="password" name="password" id="password" required />
        <button type="submit">Se connecter</button>
      </form>
    </section>
  `;
}

function renderDashboard() {
  const page = state.currentPageData?.page || {};
  const adminUsers = state.adminUsers || [];
  return `
    <section class="panel">
      <div class="profile-card">
        <div class="profile-header">
          <div>
            <div class="profile-name">${state.user.displayName}</div>
            <div class="muted">@${state.user.username}</div>
          </div>
          <div>${(state.user.roles || []).map((role) => `<span class="tag">${role}</span>`).join('')}</div>
        </div>
        <p>${page.bio || 'Ajoutez une bio pour personnaliser votre page.'}</p>
        <div class="links">
          ${(page.links || []).map((link) => `<a href="${link.url}" target="_blank">${link.label}</a>`).join('')}
        </div>
      </div>
      ${state.message ? `<div class="alert">${state.message}</div>` : ''}
      ${state.error ? `<div class="alert error">${state.error}</div>` : ''}
      <form id="page-form">
        <h2>Personnaliser la page</h2>
        <label for="bio">Bio</label>
        <textarea id="bio" name="bio" rows="3">${page.bio || ''}</textarea>
        <label for="theme">Thème</label>
        <input id="theme" name="theme" value="${page.theme || ''}" />
        <label for="links">Liens (label|url par ligne)</label>
        <textarea id="links" name="links" rows="4">${(page.links || [])
          .map((link) => `${link.label}|${link.url}`)
          .join('\n')}</textarea>
        <button type="submit">Enregistrer</button>
      </form>
    </section>
    ${state.user.roles?.includes('admin') ? `
      <section class="panel">
        <h2>Gestion des badges</h2>
        <form id="badge-form" class="form-row">
          <div>
            <label for="badgeId">Identifiant</label>
            <input id="badgeId" name="badgeId" required />
          </div>
          <div>
            <label for="badgeLabel">Label</label>
            <input id="badgeLabel" name="badgeLabel" required />
          </div>
          <div>
            <label for="badgeIcon">Icône</label>
            <input id="badgeIcon" name="badgeIcon" placeholder="emoji" />
          </div>
          <div style="align-self:flex-end;">
            <button type="submit">Ajouter</button>
          </div>
        </form>
        <div class="badges">
          ${state.badges.map((badge) => badgePill(badge)).join('')}
        </div>
      </section>
      <section class="panel">
        <h2>Utilisateurs</h2>
        <table class="table">
          <thead>
            <tr><th>Utilisateur</th><th>Quota (MB)</th><th>Utilisation (MB)</th><th>Rôles</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${adminUsers
              .map(
                (user) => `
                  <tr>
                    <td>${user.username}</td>
                    <td>
                      <form data-user="${user.username}" class="quota-form">
                        <input name="quota" type="number" value="${user.quotaMb}" min="10" />
                        <button type="submit">Mettre à jour</button>
                      </form>
                    </td>
                    <td>${((user.usedBytes || 0) / (1024 * 1024)).toFixed(2)}</td>
                    <td>${(user.roles || []).join(', ')}</td>
                    <td></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </section>
    ` : ''}
  `;
}

function render() {
  const root = document.getElementById('app');
  let content = '';
  if (state.view === 'dashboard' && state.user) {
    content = renderDashboard();
  } else if (state.view === 'login') {
    content = renderLogin();
  } else {
    content = renderLanding();
  }
  root.innerHTML = content;

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => setState({ view: 'login', error: null, message: null }));
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  const pageForm = document.getElementById('page-form');
  if (pageForm) {
    pageForm.addEventListener('submit', handleUpdatePage);
  }
  const badgeForm = document.getElementById('badge-form');
  if (badgeForm) {
    badgeForm.addEventListener('submit', handleCreateBadge);
  }
  const quotaForms = document.querySelectorAll('.quota-form');
  quotaForms.forEach((form) => {
    form.addEventListener('submit', (event) => handleQuotaUpdate(event, form.dataset.user));
  });
}

render();
loadInitial();
