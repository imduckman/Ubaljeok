import { render, screen } from '@testing-library/react'

import App from './App'

describe('App', () => {
  it('renders project title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '우발적 (偶發的)' })).toBeTruthy()
  })
})
