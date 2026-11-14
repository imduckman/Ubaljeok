/** 로그인 화면 그림: 회색에서 핑크로 진해지는 칸을 친구들이 건너가 깃발에 도착한다. */
export function LoginHero() {
  return (
    <div style={{ height: 206, borderRadius: 26, background: 'var(--page)', border: '1.5px solid var(--line-strong)', overflow: 'hidden' }}>
      <svg
        width="100%"
        height="206"
        viewBox="0 0 342 206"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="친구 셋이 연한 칸에서 진한 분홍 칸으로 걸어가 깃발에 도착하는 그림"
      >
        <rect x="22" y="152" width="48" height="44" rx="12" fill="#DCDDE3" />
        <rect x="22" y="148" width="48" height="44" rx="12" fill="#ECEDF1" />
        <rect x="80" y="136" width="48" height="44" rx="12" fill="#DCDDE3" />
        <rect x="80" y="132" width="48" height="44" rx="12" fill="#ECEDF1" />
        <rect x="138" y="118" width="48" height="44" rx="12" fill="#FFC9D5" />
        <rect x="138" y="114" width="48" height="44" rx="12" fill="#FFE3E9" />
        <rect x="196" y="98" width="48" height="44" rx="12" fill="#F7A3B6" />
        <rect x="196" y="94" width="48" height="44" rx="12" fill="#FFBDCB" />
        <rect x="254" y="76" width="62" height="56" rx="14" fill="#C81E52" />
        <rect x="254" y="72" width="62" height="56" rx="14" fill="#F2426D" />
        <path d="M285 84 V30" stroke="#0E0F14" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M287 30 L316 40 L287 50 Z" fill="#FFB800" />
        <circle cx="104" cy="148" r="9" fill="#FFB800" />
        <circle cx="104" cy="148" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
        <g transform="translate(146 70)">
          <rect x="0" y="6" width="30" height="40" rx="15" fill="#FFB800" />
          <circle cx="10" cy="22" r="2.4" fill="#5C3D00" />
          <circle cx="20" cy="22" r="2.4" fill="#5C3D00" />
          <path d="M11 29 Q15 32 19 29" fill="none" stroke="#5C3D00" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(200 40)">
          <rect x="0" y="6" width="36" height="50" rx="18" fill="#F2426D" />
          <circle cx="12" cy="26" r="2.8" fill="#FFFFFF" />
          <circle cx="24" cy="26" r="2.8" fill="#FFFFFF" />
          <path d="M13 34 Q18 38 23 34" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g transform="translate(90 92)">
          <rect x="0" y="6" width="28" height="36" rx="14" fill="#4F62F2" />
          <circle cx="9" cy="21" r="2.3" fill="#FFFFFF" />
          <circle cx="19" cy="21" r="2.3" fill="#FFFFFF" />
          <path d="M10 27 Q14 30 18 27" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="rotate(-14 46 52)">
          <rect x="26" y="34" width="40" height="40" rx="11" fill="#DCDDE3" />
          <rect x="26" y="30" width="40" height="40" rx="11" fill="#FFFFFF" />
          <circle cx="37" cy="41" r="3.6" fill="#0E0F14" />
          <circle cx="46" cy="50" r="3.6" fill="#F2426D" />
          <circle cx="55" cy="59" r="3.6" fill="#0E0F14" />
        </g>
      </svg>
    </div>
  )
}
