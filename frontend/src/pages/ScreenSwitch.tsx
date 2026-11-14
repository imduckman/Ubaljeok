import { useNavigate } from 'react-router'
import { SegmentedControl } from '../shared/components/ui/SegmentedControl'

type ScreenName = 'map' | 'groups'

const SCREEN_PATHS: Record<ScreenName, string> = { map: '/map', groups: '/groups' }

/** 지도 / 그룹 화면 전환 버튼 */
export function ScreenSwitch({ current }: { current: ScreenName }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <SegmentedControl
      label="화면 선택"
      value={current}
      options={[
        { value: 'map', label: '지도' },
        { value: 'groups', label: '그룹' },
      ]}
      onChange={(screen) => navigate(SCREEN_PATHS[screen])}
      />
    </div>
  )
}
