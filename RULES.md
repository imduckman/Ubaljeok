# Git 협업 규칙 (Week 1)

## 브랜치 전략
- `main`: 시연 가능한 안정 버전
- `develop`: 주간 통합 브랜치
- `feature/영역/integration`: 영역 통합 브랜치
- `feature/영역/작업명`: 세부 기능 브랜치
- `release/*`: 릴리스 준비
- `hotfix/*`: 긴급 수정

## 작업 규칙
1. `main`, `develop` 직접 push 금지 (PR로만 병합)
2. PR은 작성자 외 최소 1명 승인 후 병합
3. 가능한 1~2일 단위의 작은 PR 유지
4. 커밋 메시지는 Conventional Commits 사용
5. PR에 변경 범위, 테스트 결과, 남은 TODO 명시

## 기본 워크플로
1. `develop` 최신화 후 기능 브랜치 생성
2. 구현 후 로컬 테스트 통과
3. PR 생성 및 리뷰 반영
4. 병합 후 브랜치 정리
