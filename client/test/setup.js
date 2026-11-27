import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// jsdom has no <dialog>.showModal(): minimal stand-in
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
afterEach(cleanup)
