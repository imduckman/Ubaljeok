import { render, screen } from '@testing-library/react'

import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('로그인하지 않았으면 로그인 화면을 보여준다', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: '우발적' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '출발하기' })).toBeTruthy()
  })
})
