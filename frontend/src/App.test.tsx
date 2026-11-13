import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import App from './App'

vi.mock('./SuwonMap', () => ({
  default: () => null,
}))

describe('App', () => {
  it('renders project title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '우발적 (偶發的)' })).toBeTruthy()
  })
})