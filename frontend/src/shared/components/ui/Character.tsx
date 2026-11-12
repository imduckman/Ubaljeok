type CharacterTone = 'pink' | 'gold' | 'indigo'

const TONE_COLORS: Record<CharacterTone, { body: string; face: string }> = {
  pink: { body: '#F2426D', face: '#FFFFFF' },
  gold: { body: '#FFB800', face: '#5C3D00' },
  indigo: { body: '#4F62F2', face: '#FFFFFF' },
}

interface CharacterProps {
  tone?: CharacterTone
  size?: number
}

/** 우발적의 둥근 막대 캐릭터. 가로:세로 = 3:4 */
export function Character({ tone = 'pink', size = 40 }: CharacterProps) {
  const { body, face } = TONE_COLORS[tone]
  return (
    <svg width={size} height={(size * 4) / 3} viewBox="0 0 36 48" aria-hidden="true">
      <rect x="0" y="0" width="36" height="48" rx="18" fill={body} />
      <circle cx="12" cy="20" r="2.8" fill={face} />
      <circle cx="24" cy="20" r="2.8" fill={face} />
      <path d="M13 28 Q18 32 23 28" fill="none" stroke={face} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
