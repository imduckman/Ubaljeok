# Git 협업 규칙 (Week 1)

## 브랜치 전략
- `main`: 시연 가능한 안정 버전
- `develop`: 주간 통합 브랜치
- `feature/영역/integration`: 영역 통합 브랜치
- `feature/영역/작업명`: 세부 기능 브랜치
- `release/*`: 릴리스 준비
- `hotfix/*`: 긴급 수정

교수님 도식의 `Master`는 이 저장소의 `main`에 해당합니다. `main`과 `develop`은 상시 유지하고, `feature/*`, `release/*`, `hotfix/*`는 작업이 있을 때 생성합니다.

## 분기 및 병합 경로
| 작업 브랜치 | 분기 기준 | PR 병합 대상 |
| --- | --- | --- |
| `feature/*` | `develop` | `develop` |
| `release/*` | `develop` | `main`, `develop` |
| `hotfix/*` | `main` | `main`, `develop` |

- 영역 통합 브랜치를 사용하는 경우 세부 기능 → 영역 통합 → `develop` 순서로 PR을 만듭니다.
- 릴리스 중 추가한 수정은 `develop`에도 PR로 반영합니다. 이미 같은 커밋이 포함되어 있으면 중복 PR은 만들지 않습니다.
- 릴리스 버전 태그는 실제 시연·배포 버전을 확정할 때 `main`의 해당 커밋에 붙입니다.
- 브랜치 관계가 남도록 GitHub의 **Create a merge commit** 방식을 사용합니다.
- 초기 구성 PR은 Copilot이 생성한 `copilot/*` 브랜치를 사용하며, 이후 작업부터 위 이름 규칙을 따릅니다.

## 작업 규칙
1. `main`, `develop` 직접 push 금지 (PR로만 병합)
2. PR은 작성자 외 최소 1명 승인 후 병합
3. 가능한 1~2일 단위의 작은 PR 유지
4. 커밋 메시지는 Conventional Commits 사용
5. PR에 변경 범위, 테스트 결과, 남은 TODO 명시
6. CI가 통과한 뒤 병합합니다. 현재 검사는 프론트엔드 lint·테스트·빌드와 백엔드 pytest입니다.
7. 관리자에게 별도로 PR 전용 우회 예외가 설정된 경우에만 승인 조건을 우회할 수 있습니다. 직접 push는 금지하며, 관리자도 CI 결과를 확인합니다. 일반 팀원의 리뷰 승인 조건은 유지합니다.

## 기본 워크플로
1. `develop` 최신화 후 기능 브랜치 생성
2. 구현 후 로컬 테스트 통과
3. PR 생성 및 리뷰 반영
4. `develop` 대상 PR 병합 후 기능 브랜치 정리
5. 릴리스 준비 시 `develop`에서 `release/*` 생성 → 검증 → `main` 대상 PR 병합
6. 릴리스 수정 및 긴급 수정은 위 표에 따라 `develop`에도 반영 후 임시 브랜치 정리
