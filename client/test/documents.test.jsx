import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const company = { id: 1, name: 'Acme' }
const app1 = { id: 1, jobTitle: 'PFE Computer Vision', company }
const doc1 = { id: 5, applicationId: 1, fileName: 'CV_Élève.pdf', fileType: 'CV', mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: '2026-11-19T10:00:00.000Z', application: { id: 1, jobTitle: 'PFE Computer Vision' } }
const doc2 = { id: 6, applicationId: null, fileName: 'lettre.docx', fileType: 'COVER_LETTER', mimeType: 'x', sizeBytes: 3 * 1024 * 1024, uploadedAt: '2026-11-20T10:00:00.000Z', application: null }

let calls
function mockApi(routes) {
  calls = []
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const method = opts.method ?? 'GET'
    const isForm = opts.body instanceof FormData
    calls.push({ method, url, isForm, headers: opts.headers, form: isForm ? opts.body : undefined })
    const handler = routes[`${method} ${url.split('?')[0]}`]
    if (!handler) return new Response(JSON.stringify({ message: `no mock for ${method} ${url}` }), { status: 500 })
    const { status = 200, json } = await handler(url, opts)
    return status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } })
  })
}
const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const getCalls = (method, prefix) => calls.filter((c) => c.method === method && c.url.startsWith(prefix))
const pdfFile = (name = 'cv.pdf', size = 1000) => new File([new Uint8Array(size)], name, { type: 'application/pdf' })

describe('documents page', () => {
  let docs
  beforeEach(() => {
    docs = [doc2, doc1]
    mockApi({
      'GET /api/documents': () => ({ json: docs }),
      'GET /api/applications': () => ({ json: { data: [app1], total: 1, page: 1, limit: 50, totalPages: 1 } }),
    })
  })

  it('lists documents with type label, size, linked application and download link', async () => {
    renderAt('/documents')
    const table = within(await screen.findByRole('table'))
    expect(table.getByText('CV_Élève.pdf')).toBeTruthy()
    expect(table.getByText('Lettre de motivation')).toBeTruthy()
    expect(table.getByText('2 Ko')).toBeTruthy()
    expect(table.getByText('3 Mo')).toBeTruthy()
    expect(table.getByRole('link', { name: 'PFE Computer Vision' }).getAttribute('href')).toBe('/applications/1')
    expect(table.getAllByRole('link', { name: 'Télécharger' })[1].getAttribute('href')).toBe('/api/documents/5/download')
  })

  it('shows a malicious file name as text, never as HTML', async () => {
    docs = [{ ...doc1, fileName: '<img src=x onerror=alert(1)>.pdf' }]
    renderAt('/documents')
    expect(await screen.findByText('<img src=x onerror=alert(1)>.pdf')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('empty state', async () => {
    docs = []
    renderAt('/documents')
    expect(await screen.findByText('Aucun document.')).toBeTruthy()
  })

  it('blocks bad files on the client: nothing is sent', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderAt('/documents')
    await screen.findByRole('table')
    const input = screen.getByLabelText(/^Fichier/)

    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Choisissez un fichier')

    await user.upload(input, new File(['x'], 'virus.exe'))
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Format non accepté/)

    await user.upload(input, pdfFile('big.pdf', 5 * 1024 * 1024 + 1))
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    expect(screen.getByRole('alert').textContent).toMatch(/trop volumineux/)

    await user.upload(input, new File([], 'empty.pdf'))
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    expect(screen.getByRole('alert').textContent).toBe('Le fichier est vide')

    expect(getCalls('POST', '/api/documents').length).toBe(0)
  })

  it('uploads a multipart form (file, type, applicationId), then reloads the list', async () => {
    mockApi({
      'GET /api/documents': () => ({ json: docs }),
      'GET /api/applications': () => ({ json: { data: [app1], total: 1, page: 1, limit: 50, totalPages: 1 } }),
      'POST /api/documents': () => { docs = [doc1]; return { status: 201, json: doc1 } },
    })
    const user = userEvent.setup()
    renderAt('/documents')
    await screen.findByRole('table')
    await user.upload(screen.getByLabelText(/^Fichier/), pdfFile('mon-cv.pdf'))
    await user.selectOptions(screen.getByLabelText('Type de document'), 'COVER_LETTER')
    await user.selectOptions(screen.getByLabelText(/Candidature associée/), '1')
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))

    await waitFor(() => expect(getCalls('POST', '/api/documents').length).toBe(1))
    const post = getCalls('POST', '/api/documents')[0]
    expect(post.isForm).toBe(true)
    expect(post.headers).toBeUndefined()                       // the browser sets the multipart boundary
    expect(post.form.get('file').name).toBe('mon-cv.pdf')
    expect(post.form.get('type')).toBe('COVER_LETTER')
    expect(post.form.get('applicationId')).toBe('1')
    await waitFor(() => expect(getCalls('GET', '/api/documents').length).toBe(2)) // list reloaded
  })

  it('shows the server error (e.g. 413) and lets the user retry', async () => {
    mockApi({
      'GET /api/documents': () => ({ json: [] }),
      'GET /api/applications': () => ({ json: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } }),
      'POST /api/documents': () => ({ status: 413, json: { message: 'Fichier trop volumineux (5 Mo maximum)' } }),
    })
    const user = userEvent.setup()
    renderAt('/documents')
    await screen.findByText('Aucun document.')
    await user.upload(screen.getByLabelText(/^Fichier/), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Fichier trop volumineux (5 Mo maximum)')
    expect(screen.getByRole('button', { name: 'Téléverser' }).disabled).toBe(false)
  })

  it('delete asks for confirmation, then DELETEs and reloads', async () => {
    mockApi({
      'GET /api/documents': () => ({ json: docs }),
      'GET /api/applications': () => ({ json: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } }),
      'DELETE /api/documents/5': () => { docs = [doc2]; return { status: 204 } },
    })
    const user = userEvent.setup()
    renderAt('/documents')
    const table = within(await screen.findByRole('table'))
    await user.click(table.getAllByRole('button', { name: 'Supprimer' })[1]) // row of doc1 (second)
    expect(getCalls('DELETE', '/api').length).toBe(0)
    const dialog = document.querySelector('dialog')
    expect(within(dialog).getByText(/CV_Élève.pdf/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(screen.queryByText('CV_Élève.pdf')).toBeNull())
    expect(getCalls('DELETE', '/api/documents/5').length).toBe(1)
  })
})

describe('application detail page documents section', () => {
  const detail = () => ({
    id: 1, companyId: 1, jobTitle: 'PFE Computer Vision', applicationType: 'PFE', applicationDate: '2026-11-19T00:00:00.000Z',
    status: 'APPLIED', offerUrl: null, description: null, notes: null, followUpDate: null, company,
    history: [], documents: [doc1],
  })

  it('shows the attached documents and uploads with the application fixed', async () => {
    mockApi({
      'GET /api/applications/1': () => ({ json: detail() }),
      'POST /api/documents': () => ({ status: 201, json: doc1 }),
    })
    const user = userEvent.setup()
    renderAt('/applications/1')
    expect(await screen.findByText('CV_Élève.pdf')).toBeTruthy()
    expect(screen.queryByLabelText(/Candidature associée/)).toBeNull()          // no select: it is fixed
    await user.upload(screen.getByLabelText(/^Fichier/), pdfFile('lettre.pdf'))
    await user.selectOptions(screen.getByLabelText('Type de document'), 'COVER_LETTER')
    await user.click(screen.getByRole('button', { name: 'Téléverser' }))
    await waitFor(() => expect(getCalls('POST', '/api/documents').length).toBe(1))
    expect(getCalls('POST', '/api/documents')[0].form.get('applicationId')).toBe('1')
    await waitFor(() => expect(getCalls('GET', '/api/applications/1').length).toBe(2)) // detail reloaded
  })

  it('works when the API sends no documents field (older responses)', async () => {
    const d = detail(); delete d.documents
    mockApi({ 'GET /api/applications/1': () => ({ json: d }) })
    renderAt('/applications/1')
    expect(await screen.findByText('Aucun document.')).toBeTruthy()
  })

  it('the application delete dialog says documents are kept', async () => {
    mockApi({ 'GET /api/applications/1': () => ({ json: detail() }) })
    const user = userEvent.setup()
    renderAt('/applications/1')
    await screen.findByRole('heading', { name: 'PFE Computer Vision' })
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    expect(document.querySelector('dialog[open]').textContent).toMatch(/documents restent dans « Mes documents »/)
  })
})
