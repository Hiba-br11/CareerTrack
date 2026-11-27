import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ApplicationRoutes from '../src/routes/ApplicationRoutes.jsx'

const company = { id: 1, name: 'Acme' }
const app1 = { id: 1, companyId: 1, jobTitle: 'PFE Computer Vision', applicationType: 'PFE', applicationDate: '2026-11-19T00:00:00.000Z', status: 'APPLIED', offerUrl: null, company }
const app2 = { id: 2, companyId: 1, jobTitle: 'Stage ML', applicationType: 'SUMMER_INTERNSHIP', applicationDate: '2026-10-01T00:00:00.000Z', status: 'TO_APPLY', offerUrl: null, company }
const list = (data, extra = {}) => ({ data, total: data.length, page: 1, limit: 10, totalPages: 1, ...extra })

let calls
function mockApi(routes) {
  calls = []
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const method = opts.method ?? 'GET'
    calls.push({ method, url, body: opts.body ? JSON.parse(opts.body) : undefined })
    const path = url.split('?')[0]
    const handler = routes[`${method} ${path}`]
    if (!handler) return new Response(JSON.stringify({ message: `no mock for ${method} ${url}` }), { status: 500 })
    const { status = 200, json } = await handler(url, opts)
    return status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } })
  })
}
function LocationProbe() { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.search}</div> }
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/applications/*" element={<ApplicationRoutes />} /></Routes>
      <LocationProbe />
    </MemoryRouter>
  )
}
const getCalls = (method, prefix) => calls.filter((c) => c.method === method && c.url.startsWith(prefix))

describe('list page', () => {
  beforeEach(() => mockApi({ 'GET /api/applications': () => ({ json: list([app1, app2]) }) }))

  it('shows rows, french labels and formatted dates', async () => {
    renderAt('/applications')
    expect(await screen.findByText('PFE Computer Vision')).toBeTruthy()
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Postulée')).toBeTruthy()
    expect(table.getByText('Stage d’été')).toBeTruthy()
    expect(screen.getByText('19/11/2026')).toBeTruthy()
  })

  it('keeps ?page= on first render (debounce must not wipe it) ', async () => {
    renderAt('/applications?page=2&status=APPLIED')
    await screen.findByText('PFE Computer Vision')
    await new Promise((r) => setTimeout(r, 800))
    expect(screen.getByTestId('loc').textContent).toBe('/applications?page=2&status=APPLIED')
    for (const c of getCalls('GET', '/api/applications')) expect(c.url).toContain('page=2')
    expect(getCalls('GET', '/api/applications').length).toBe(1)
  })

  it('status filter updates URL, drops page, refetches', async () => {
    const user = userEvent.setup()
    renderAt('/applications?page=3')
    await screen.findByText('PFE Computer Vision')
    await user.selectOptions(screen.getByLabelText('Statut'), 'INTERVIEW')
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications?status=INTERVIEW'))
    await waitFor(() => expect(getCalls('GET', '/api/applications?status=INTERVIEW').length).toBe(1))
  })

  it('search is debounced into one request', async () => {
    const user = userEvent.setup()
    renderAt('/applications')
    await screen.findByText('PFE Computer Vision')
    await user.type(screen.getByLabelText('Recherche'), 'pfe')
    await waitFor(() => expect(getCalls('GET', '/api/applications?search=pfe').length).toBe(1), { timeout: 2000 })
    const urls = calls.map((c) => c.url)
    expect(urls).not.toContain('/api/applications?search=p')    // no request per keystroke
    expect(urls).not.toContain('/api/applications?search=pf')
    expect(urls.filter((u) => u.includes('search=')).length).toBe(1)
  })

  it('reset clears filters', async () => {
    const user = userEvent.setup()
    renderAt('/applications?status=APPLIED&search=x')
    await screen.findByText('PFE Computer Vision')
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications'))
    expect(screen.getByLabelText('Recherche').value).toBe('')
  })

  it('pagination buttons change page', async () => {
    mockApi({ 'GET /api/applications': () => ({ json: list([app1], { total: 25, totalPages: 3, page: 1 }) }) })
    const user = userEvent.setup()
    renderAt('/applications')
    await screen.findByText('PFE Computer Vision')
    expect(screen.getByRole('button', { name: 'Précédent' }).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications?page=2'))
  })

  it('empty states differ with/without filters', async () => {
    mockApi({ 'GET /api/applications': () => ({ json: list([]) }) })
    renderAt('/applications')
    expect(await screen.findByText('Vous n’avez encore aucune candidature.')).toBeTruthy()
    renderAt('/applications?status=REJECTED')
    expect(await screen.findByText('Aucune candidature ne correspond à ces filtres.')).toBeTruthy()
  })

  it('page beyond the last one jumps back to the last page', async () => {
    mockApi({ 'GET /api/applications': (url) => ({ json: url.includes('page=3') ? list([], { total: 11, page: 3, totalPages: 2 }) : list([app1], { total: 11, page: 2, totalPages: 2 }) }) })
    renderAt('/applications?page=3')
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications?page=2'))
  })

  it('delete asks for confirmation, calls DELETE, reloads', async () => {
    let remaining = [app1, app2]
    mockApi({
      'GET /api/applications': () => ({ json: list(remaining) }),
      'DELETE /api/applications/1': () => { remaining = [app2]; return { status: 204 } },
    })
    const user = userEvent.setup()
    renderAt('/applications')
    await screen.findByText('PFE Computer Vision')
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    expect(getCalls('DELETE', '/api').length).toBe(0)                      // nothing deleted before confirming
    const dialog = document.querySelector('dialog')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(within(dialog).getByText(/PFE Computer Vision/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(screen.queryByText('PFE Computer Vision')).toBeNull())
    expect(getCalls('DELETE', '/api/applications/1').length).toBe(1)
  })

  it('shows API errors', async () => {
    mockApi({ 'GET /api/applications': () => ({ status: 400, json: { message: 'Données invalides' } }) })
    renderAt('/applications?limit=999')
    expect((await screen.findByRole('alert')).textContent).toBe('Données invalides')
  })
})

describe('create form', () => {
  const routes = () => ({
    'GET /api/companies': () => ({ json: [company, { id: 3, name: 'Beta' }] }),
    'POST /api/applications': () => ({ status: 201, json: { ...app1, id: 42 } }),
    'GET /api/applications/42': () => ({ json: { ...app1, id: 42, company, history: [] } }),
  })

  it('blocks invalid input on the client (no request)', async () => {
    mockApi(routes())
    const user = userEvent.setup()
    renderAt('/applications/new')
    await screen.findByRole('option', { name: 'Acme' })
    await user.click(screen.getByRole('button', { name: 'Créer la candidature' }))
    expect(screen.getByText('Choisissez une entreprise')).toBeTruthy()
    expect(screen.getByText('Le poste doit contenir au moins 2 caractères')).toBeTruthy()
    expect(screen.getByText('La date de candidature est requise')).toBeTruthy()
    expect(getCalls('POST', '/api').length).toBe(0)
    await user.type(screen.getByLabelText('Poste', { exact: false }), 'PFE')
    expect(screen.queryByText('Le poste doit contenir au moins 2 caractères')).toBeNull() // error clears while typing
  })

  it('rejects non-http offer links client-side', async () => {
    mockApi(routes())
    const user = userEvent.setup()
    renderAt('/applications/new')
    await screen.findByRole('option', { name: 'Acme' })
    await user.type(screen.getByLabelText('Lien de l’offre'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Créer la candidature' }))
    expect(screen.getByText('Le lien doit commencer par http:// ou https://')).toBeTruthy()
  })

  it('submits the right payload then goes to the detail page', async () => {
    mockApi(routes())
    const user = userEvent.setup()
    renderAt('/applications/new')
    await screen.findByRole('option', { name: 'Acme' })
    await user.selectOptions(screen.getByLabelText('Entreprise', { exact: false }), 'Acme')
    await user.type(screen.getByLabelText('Poste', { exact: false }), '  PFE Vision  ')
    await user.selectOptions(screen.getByLabelText('Type', { exact: false }), 'PFE')
    await user.type(screen.getByLabelText('Date de candidature', { exact: false }), '2026-11-19')
    await user.click(screen.getByRole('button', { name: 'Créer la candidature' }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications/42'))
    expect(getCalls('POST', '/api/applications')[0].body).toEqual({
      companyId: 1, jobTitle: 'PFE Vision', applicationType: 'PFE', applicationDate: '2026-11-19',
      status: 'TO_APPLY', offerUrl: '', description: '', notes: '', followUpDate: '',
    })
  })

  it('shows server-side field errors and general errors', async () => {
    const r = routes()
    r['POST /api/applications'] = () => ({ status: 400, json: { message: 'Données invalides', errors: [{ field: 'offerUrl', message: 'URL refusée par le serveur' }] } })
    mockApi(r)
    const user = userEvent.setup()
    renderAt('/applications/new')
    await screen.findByRole('option', { name: 'Acme' })
    await user.selectOptions(screen.getByLabelText('Entreprise', { exact: false }), 'Acme')
    await user.type(screen.getByLabelText('Poste', { exact: false }), 'Job')
    await user.selectOptions(screen.getByLabelText('Type', { exact: false }), 'PFE')
    await user.type(screen.getByLabelText('Date de candidature', { exact: false }), '2026-11-19')
    await user.click(screen.getByRole('button', { name: 'Créer la candidature' }))
    expect(await screen.findByText('URL refusée par le serveur')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Données invalides')
    expect(screen.getByRole('button', { name: 'Créer la candidature' }).disabled).toBe(false) // can retry
  })

  it('warns when the companies API fails', async () => {
    mockApi({ 'GET /api/companies': () => ({ status: 404, json: { message: 'Route introuvable' } }) })
    renderAt('/applications/new')
    expect((await screen.findByRole('alert')).textContent).toBe('Route introuvable')
  })
})

describe('edit form', () => {
  it('prefills (dates as YYYY-MM-DD, null as empty) and PATCHes', async () => {
    mockApi({
      'GET /api/companies': () => ({ json: [company] }),
      'GET /api/applications/1': () => ({ json: { ...app1, followUpDate: '2026-12-01T00:00:00.000Z', notes: null, description: null, history: [] } }),
      'PATCH /api/applications/1': () => ({ json: app1 }),
    })
    const user = userEvent.setup()
    renderAt('/applications/1/edit')
    await waitFor(() => expect(screen.getByLabelText('Poste', { exact: false }).value).toBe('PFE Computer Vision'))
    expect(screen.getByLabelText('Date de candidature', { exact: false }).value).toBe('2026-11-19')
    expect(screen.getByLabelText('Date de relance').value).toBe('2026-12-01')
    expect(screen.getByLabelText('Entreprise', { exact: false }).value).toBe('1')
    expect(screen.getByLabelText('Notes personnelles').value).toBe('')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(getCalls('PATCH', '/api/applications/1').length).toBe(1))
    expect(getCalls('PATCH', '/api/applications/1')[0].body.status).toBe('APPLIED')
  })
})

describe('detail page', () => {
  const detail = (over = {}) => ({
    ...app1, description: 'Line 1\nLine 2', notes: '<b>not html</b>', followUpDate: null,
    company: { ...company, website: 'javascript:alert(1)' },
    history: [
      { id: 1, applicationId: 1, oldStatus: null, newStatus: 'TO_APPLY', changedAt: '2026-11-10T09:00:00.000Z' },
      { id: 2, applicationId: 1, oldStatus: 'TO_APPLY', newStatus: 'APPLIED', changedAt: '2026-11-19T10:30:00.000Z' },
    ], ...over,
  })

  it('renders fields, timeline, escapes HTML and refuses unsafe links', async () => {
    mockApi({ 'GET /api/applications/1': () => ({ json: detail({ offerUrl: 'javascript:alert(1)' }) }) })
    renderAt('/applications/1')
    expect(await screen.findByRole('heading', { name: 'PFE Computer Vision' })).toBeTruthy()
    expect(screen.getByText('Créée avec le statut « À postuler »')).toBeTruthy()
    expect(screen.getByText('À postuler → Postulée')).toBeTruthy()
    expect(screen.getByText('<b>not html</b>')).toBeTruthy()        // shown as text, not interpreted
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it('renders safe https links with rel=noopener', async () => {
    mockApi({ 'GET /api/applications/1': () => ({ json: detail({ offerUrl: 'https://jobs.example.com/1' }) }) })
    renderAt('/applications/1')
    const a = await screen.findByRole('link', { name: 'https://jobs.example.com/1' })
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    expect(a.getAttribute('target')).toBe('_blank')
  })

  it('quick status change PATCHes only the status and reloads the timeline', async () => {
    let current = detail()
    mockApi({
      'GET /api/applications/1': () => ({ json: current }),
      'PATCH /api/applications/1': (_u, opts) => {
        const body = JSON.parse(opts.body)
        current = detail({ status: body.status, history: [...current.history, { id: 3, applicationId: 1, oldStatus: 'APPLIED', newStatus: body.status, changedAt: '2026-11-20T08:00:00.000Z' }] })
        return { json: current }
      },
    })
    const user = userEvent.setup()
    renderAt('/applications/1')
    await screen.findByRole('heading', { name: 'PFE Computer Vision' })
    await user.selectOptions(screen.getByLabelText('Changer le statut'), 'INTERVIEW')
    expect(await screen.findByText('Postulée → Entretien planifié')).toBeTruthy()
    expect(getCalls('PATCH', '/api/applications/1')[0].body).toEqual({ status: 'INTERVIEW' })
  })

  it('delete: confirm, DELETE, back to list', async () => {
    mockApi({
      'GET /api/applications/1': () => ({ json: detail() }),
      'DELETE /api/applications/1': () => ({ status: 204 }),
      'GET /api/applications': () => ({ json: list([]) }),
    })
    const user = userEvent.setup()
    renderAt('/applications/1')
    await screen.findByRole('heading', { name: 'PFE Computer Vision' })
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    expect(getCalls('DELETE', '/api').length).toBe(0)
    const dialog = document.querySelector('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/applications'))
    expect(getCalls('DELETE', '/api/applications/1').length).toBe(1)
  })

  it('404 shows an error and a way back', async () => {
    mockApi({ 'GET /api/applications/9': () => ({ status: 404, json: { message: 'Candidature introuvable' } }) })
    renderAt('/applications/9')
    expect((await screen.findByRole('alert')).textContent).toBe('Candidature introuvable')
    expect(screen.getByRole('link', { name: /Retour à la liste/ })).toBeTruthy()
  })
})
