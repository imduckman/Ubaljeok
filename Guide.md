# 우발적 팀원·AI 작업 가이드

초보 팀원이 작은 기능을 개발하고 PR을 만드는 안내이자, AI가 프로젝트 작업을 수행할 때 읽는 공통 참조 문서입니다. 공식 규칙은 [RULES.md](./RULES.md), 실행 개요는 [README.md](./README.md), API 초안은 [API.md](./API.md)에 있습니다.

## 목차

1. [용어와 브랜치](#1-용어와-브랜치)
2. [처음 한 번 준비](#2-처음-한-번-준비)
3. [작업·커밋·Push](#3-작업커밋push)
4. [PR·리뷰·병합](#4-pr리뷰병합)
5. [충돌 해결](#5-충돌-해결)
6. [개발 환경 실행·검사](#6-개발-환경-실행검사)
7. [수업 평가와 현재 한계](#7-수업-평가와-현재-한계)
8. [AI가 따를 작업 절차](#8-ai가-따를-작업-절차)

## 1. 용어와 브랜치

| 용어 | 뜻 |
| --- | --- |
| Clone | GitHub 저장소를 내 컴퓨터로 처음 가져오기 |
| Branch | 다른 작업과 구분해 수정하는 작업 흐름 |
| Commit | 관련 변경을 설명과 함께 로컬 이력에 기록하기 |
| Push | 로컬 커밋을 GitHub에 업로드하기 |
| Pull Request·PR | 내 작업을 대상 브랜치에 합쳐 달라고 요청하기 |
| Review·Approve | 변경을 읽고 의견을 남기거나 승인하기 |
| Merge | 두 브랜치의 변경을 합치기 |
| CI | 변경 후 GitHub Actions가 자동 실행하는 검사 |

`origin`은 Clone한 원격 저장소의 별명입니다. `origin/develop`은 마지막으로 가져온 원격 상태이고 `develop`은 내 컴퓨터의 브랜치입니다. `git fetch origin`으로 원격 상태를 갱신합니다.

```text
develop → feature/frontend/login-form → PR → develop
develop → release/준비중인버전         → PR → main
main    → hotfix/오류이름              → PR → main + develop
```

- `main`은 안정 버전, `develop`은 다음 버전 통합용입니다. 두 브랜치에 직접 Push하지 않습니다.
- 일반 작업은 `develop`에서 `feature/영역/작업명`을 만듭니다. 영역 예시는 `frontend`, `map`, `backend`, `photo-ai`, `infra`이며 이름은 영문 소문자·하이픈을 사용합니다.
- 중간 통합이 필요하면 담당자끼리 정해서 `feature/영역/integration`을 사용합니다. 이 경우 세부 기능 → 영역 통합 → `develop` 순서입니다.
- 릴리스는 인프라·통합 담당자가 준비하고 새 기능을 넣지 않습니다. 핫픽스는 배포된 버전의 긴급 오류에만 사용합니다.
- 릴리스 중 수정과 핫픽스는 `develop`에도 반영해야 다음 버전에 수정이 사라지지 않습니다. 필요한 대상에 모두 반영한 뒤 임시 브랜치를 삭제합니다.
- 다섯 종류의 브랜치를 항상 미리 만들어둘 필요는 없습니다. 실제 시연·배포 버전이 확정되면 통합 담당자가 `main`에 버전 태그를 붙입니다.

## 2. 처음 한 번 준비

Git, Node.js 22, Python 3.12, Docker Desktop과 Compose를 준비합니다. Node.js 22·Python 3.12는 현재 CI 기준입니다. 저장소의 협업 초대도 수락해야 Push할 수 있습니다.

원하는 상위 폴더에서 실행합니다. **이미 Clone한 폴더가 있다면 다시 Clone하지 말고 그 폴더를 사용합니다.** 이름과 이메일은 자신의 값으로 바꿉니다.

```bash
git clone https://github.com/imduckman/Ubaljeok.git
cd Ubaljeok
git config user.name "내 이름"
git config user.email "내 GitHub 커밋 이메일"
git fetch origin
git switch -c develop --track origin/develop
```

이미 로컬 `develop`이 있으면 마지막 명령 대신 `git switch develop`을 실행합니다. 공개 이메일 대신 GitHub가 제공하는 비공개 커밋 이메일을 사용할 수 있습니다.

```bash
git --version
node --version
npm --version
python --version
docker --version
docker compose version
git status
```

버전 명령이 실패하면 설치·경로를 확인합니다. Windows에서 `py -3.12 --version`이 동작하면 아래 `python -m venv` 대신 `py -3.12 -m venv`를 사용할 수 있습니다.

## 3. 작업·커밋·Push

GitHub Issue에 목적·담당자·완료 조건을 작성합니다. 다음 예시의 브랜치 이름과 파일은 실제 작업에 맞게 바꿉니다.

```bash
git status
git switch develop
git pull --ff-only origin develop
git switch -c feature/frontend/login-form
```

미처리 변경이 있으면 기존 작업부터 정리합니다. `--ff-only` 오류는 이력이 갈라졌다는 뜻이므로 중단하고 통합 담당자에게 확인합니다.

수정 후 변경 파일과 커밋에 들어갈 내용을 확인합니다.

```bash
git status
git diff
git add frontend/src/App.tsx
git diff --cached
git commit -m "feat: add login form"
git push -u origin feature/frontend/login-form
```

`git add`에는 실제 수정한 파일을 지정합니다. `.env`, 키, 개인 사진이 포함되지 않았는지 확인합니다. 접두사는 기능 `feat:`, 오류 `fix:`, 문서 `docs:`, 설정 `chore:`, 테스트 `test:`를 사용합니다.

Commit은 로컬 기록이고 Push는 GitHub 업로드입니다. `-u`는 첫 Push 때 원격 작업 브랜치를 연결하며 이후에는 같은 브랜치에서 `git push`만 실행해도 됩니다.

## 4. PR·리뷰·병합

1. GitHub의 **Pull requests → New pull request**를 선택합니다.
2. 보통 **base: `develop`**, **compare: 내 `feature/...`**로 설정합니다. 영역 통합을 사용하기로 했다면 base를 해당 브랜치로 바꿉니다.
3. PR 템플릿에 목적·바뀐 동작·검증 명령과 결과·미완료 사항을 적습니다. `Refs #이슈번호`로 관련 Issue를 연결합니다.
4. **Files changed**에서 불필요한 파일·비밀값을 확인합니다. 작업 중이면 Draft로 엽니다.
5. 완료되면 리뷰어를 지정합니다. 리뷰어는 변경과 검증 결과를 읽고 **Comment**, **Request changes**, **Approve**로 의견을 남깁니다.
6. 수정 요청은 같은 브랜치에 커밋·Push합니다. 새 PR을 만들지 않습니다. 승인이 취소됐다면 재리뷰를 요청합니다.
7. 최신 커밋의 CI 성공·승인·대화 해결을 확인하고 **Create a merge commit**으로 병합합니다. 실행하지 못한 검사를 통과했다고 적지 않습니다.

`Refs #12`는 Issue를 참조합니다. `Closes #12`는 완료된 Issue를 닫는 표현이지만, 기본 브랜치가 `main`이므로 `develop` 병합 때 즉시 닫히지 않을 수 있습니다. 팀에서 완료 여부를 확인해 상태를 정리합니다.

관리자는 PR 승인 조건을 우회할 수 있지만 이유·검토 내용·검증 결과를 남깁니다. 일반 팀원의 승인 조건은 유지됩니다. Copilot과 함께 작성한 계정의 승인만으로 필수 리뷰가 충족되지 않을 수도 있습니다.

병합한 기능 브랜치는 GitHub의 **Delete branch**로 정리하고 로컬에서도 정리합니다. 미커밋 작업이 없고 실제 통합 대상에 반영됐는지 먼저 확인합니다.

```bash
git switch develop
git pull --ff-only origin develop
git branch -d feature/frontend/login-form
git fetch --prune origin
```

`-d`가 거부되면 `-D`로 강제 삭제하지 말고 남은 커밋·병합 대상을 확인합니다. 팀원이 사용하는 영역 통합 브랜치는 혼자 삭제하지 않습니다.

## 5. 충돌 해결

작업을 커밋한 뒤 **자신의 기능 브랜치에서** 실행합니다. 영역 통합이 PR 대상이면 `origin/develop`을 실제 대상 브랜치로 바꿉니다.

```bash
git switch feature/frontend/login-form
git fetch origin
git merge origin/develop
```

충돌이 없다면 검사 후 Push합니다. 충돌이 있다면 다음 순서로 처리합니다.

1. `git status`에서 충돌 파일을 찾습니다.
2. `<<<<<<<`, `=======`, `>>>>>>>` 사이의 양쪽 코드를 읽고 필요한 동작을 유지하도록 수정한 뒤 표시를 제거합니다.
3. 다른 담당자 코드의 의도가 불분명하면 함께 확인합니다.
4. `git add 파일경로`, `git commit`으로 병합을 마무리합니다.
5. 관련 검사를 다시 실행하고 `git push`로 기존 PR을 갱신합니다.

병합 전 작업 폴더가 깨끗했고 이번 병합 시도만 취소하려면 `git merge --abort`를 사용합니다. 판단이 어렵다면 파일을 버리거나 강제 Push하지 말고 도움을 요청합니다.

**수업 기준: 이미 Push한 브랜치에는 rebase와 강제 Push를 사용하지 않습니다.** 아직 공유하지 않은 개인 로컬 커밋만 rebase로 정리할 수 있으며, 초보 팀원은 기본 merge 흐름을 따르면 됩니다.

## 6. 개발 환경 실행·검사

### Docker Compose 통합 실행

Docker Desktop을 실행하고 엔진이 준비된 뒤 **저장소 최상위 폴더에서** 진행합니다. `.env`가 이미 있으면 덮어쓰지 않습니다.

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS/Linux 또는 Git Bash
cp .env.example .env
```

이후 공통 명령을 실행합니다.

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 api worker
```

기본 주소는 프론트 `http://localhost/`, API `http://localhost/api/health`입니다. 정상 상태 응답은 `{"status":"ok"}`입니다. `NGINX_PORT`를 바꿨다면 주소에도 그 포트를 사용합니다. PowerShell에서는 `Invoke-RestMethod http://localhost/api/health`로 응답을 확인할 수 있습니다.

| 서비스 | 현재 역할 |
| --- | --- |
| `nginx` | 정적 프론트 제공, `/api/`를 `api:8000`으로 전달, 유일한 호스트 공개 포트 |
| `api` | FastAPI `/health`, 미디어 볼륨 공유. DB·Redis 환경변수는 준비됐지만 업무 API는 아직 없음 |
| `db` | PostgreSQL/PostGIS, `db_data`에 DB 저장 |
| `redis` | 작업 큐 서버, `redis_data`에 데이터 저장 |
| `worker` | Redis 큐를 기다리는 RQ 워커, FFmpeg 설치, API와 `media_data` 공유 |

컨테이너끼리는 `db`, `redis`, `api` 같은 서비스 이름으로 연결합니다. 호스트의 `localhost`와 컨테이너 내부의 `localhost`는 다른 대상입니다. 현재 DB·Redis는 호스트 포트를 공개하지 않습니다.

종료는 `docker compose down`입니다. 이름 있는 볼륨은 유지됩니다. **`docker compose down -v`는 데이터 볼륨까지 삭제하므로 일반 종료에 사용하지 않습니다.** 현재 구성은 소스 자동 반영이 아니므로 변경 후 `docker compose up --build -d`로 재빌드합니다.

### 프론트엔드 로컬 실행

저장소 최상위 폴더에서 시작합니다.

```bash
cd frontend
npm ci
npm run dev
```

터미널에 표시된 주소를 열고 `Ctrl+C`로 종료합니다. 검사는 같은 폴더의 별도 터미널 또는 서버 종료 후 실행합니다.

```bash
npm run lint
npm run test -- --run
npm run build
```

### 백엔드 로컬 실행

저장소 최상위 폴더에서 시작하며 활성화 스크립트 없이 가상환경의 Python을 사용합니다.

```powershell
# Windows PowerShell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```bash
# macOS/Linux
cd backend
python3.12 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --reload
```

직접 접근 주소는 `http://localhost:8000/health`입니다. 서버 종료 후 같은 `backend` 폴더에서 검사합니다.

```powershell
# Windows PowerShell
.\.venv\Scripts\python.exe -m pytest
```

```bash
# macOS/Linux
./.venv/bin/python -m pytest
```

호스트에서 실행한 API는 Compose 내부 주소 `db`·`redis`에 바로 접근할 수 없습니다. 현재 `/health`에는 DB 연결이 필요 없으며, DB 기능을 추가하면 담당자와 로컬 연결 방법을 조율합니다.

## 7. 수업 평가와 현재 한계

PR의 **Checks** 또는 저장소 **Actions**에서 최신 커밋을 확인합니다. 실패한 Step의 로그를 읽고 원인을 수정해 같은 브랜치에 Push합니다. 도움을 요청할 때 명령·오류·브랜치·커밋을 공유하고 비밀값은 제거합니다.

| 평가 조건 | 현재 상태와 앞으로의 증거 |
| --- | --- |
| 계층적 Git·PR | 초기 통합·릴리스 PR 이력 있음. 팀원들의 실제 기능 PR·리뷰·수정 반영을 이어갈 것 |
| Compose 3종류 이상·통신·볼륨 | 서비스 5개와 연결·볼륨 설정 있음. 전체 기동·통신·재기동 후 데이터 유지를 검증할 것 |
| 수업 외 오픈소스 1개 이상 | 언어·DB 자체를 제외한 도구의 선택 이유·라이선스·기능 사용 위치를 기록할 것 |
| Workflow 5개 이상 | 현재 `ci.yml` 1개, Job 2개. 다양한 검사를 수행하는 Workflow와 실행 결과를 추가할 것 |

Workflow는 자동화 전체이고 Job은 그 안의 작업입니다. Job 2개가 Workflow 2개는 아닙니다. 최종 7개 Workflow로 확장할 계획은 [RULES.md](./RULES.md)에 있습니다.

Compose와 Kubernetes는 평가표의 대안입니다. 조건을 위해 Kubernetes를 추가하거나, 브랜치 종류를 보여주기 위해 의미 없는 기능·가짜 장애를 만들 필요는 없습니다.

초기 기반에서 확인된 것은 GitHub CI, 로컬 프론트 lint·빌드, 백엔드 pytest와 Compose 설정 검사입니다. 당시 Windows 로컬 Vitest는 정상 종료하지 않았고 Docker 엔진 문제로 전체 기동은 미검증입니다. 현재 작업에서는 기존 결과를 그대로 사용하지 말고 해당 변경의 결과를 확인합니다.

로그인·그룹·지도·사진·코인·영상 기능, Alembic migrate 작업, 백업·복원, 워커·Compose·E2E 검사는 아직 완성된 것으로 간주하지 않습니다. 유료 AI API는 CI에서 호출하지 않습니다.

## 8. AI가 따를 작업 절차

이 절은 AI에게 프로젝트 맥락과 판단 기준을 제공합니다. 사용자 요청의 범위를 확장하거나 외부 작업을 자동 승인하는 권한은 아닙니다.

### 문서와 스킬의 관계

- `RULES.md`: 팀이 지킬 Git·리뷰·평가 기록 규칙의 기준입니다.
- `Guide.md`: 사람과 AI가 함께 읽는 절차·실행 예시입니다. 예시 명령을 그대로 일괄 실행하지 말고 현재 위치·브랜치·작업 상태를 확인합니다.
- `.agents/skills/ubaljeok-workflow/SKILL.md`: 지원되는 Codex 환경에서 이 가이드를 찾아 읽게 하는 저장소 전용 스킬입니다. `$ubaljeok-workflow`로 요청하거나 파일 경로를 직접 지정해 읽게 할 수 있습니다. 설치 환경에 따라 새 세션·스킬 목록 갱신이 필요할 수 있습니다.
- `AGENTS.md`: 저장소에서 작업하는 에이전트에게 위 문서의 위치를 안내합니다. 다른 AI 도구가 이 파일이나 스킬을 자동으로 읽는다고 가정하지 않습니다. 지원하지 않으면 `RULES.md`와 `Guide.md`를 직접 첨부합니다.

저장소의 `AGENTS.md`와 `.agents/skills/`를 함께 사용하는 방식은 [OpenAI 공식 설명](https://developers.openai.com/blog/skills-agents-sdk)을 참고했습니다. 이 프로젝트의 실제 작업 기준은 위 로컬 문서입니다.

### 작업 전 확인

1. 사용자 요청과 현재 `git status`·브랜치·실제 파일을 확인합니다. 분석 요청이면 파일을 수정하지 않습니다. 사용자 변경을 덮어쓰지 않습니다.
2. `RULES.md`와 이 문서의 관련 절을 읽습니다. 구현은 API·Compose·CI 등 해당 소스도 확인하고, 계획과 구현 사실을 구분합니다.
3. React/Vite/TypeScript, FastAPI/SQLAlchemy/Alembic, PostgreSQL/PostGIS, Redis/RQ, FFmpeg, MapLibre/GeoJSON, exifr 및 단일 서버 Compose를 기준으로 합니다. 실제 AI 영상 API는 미정이며 Mock과 구분합니다.
4. 인프라·통합 작업을 우선하고, 사용자 요청 없이 다른 팀원의 기능이나 대규모 리팩터링을 시작하지 않습니다. 새 기술 도입은 이유와 범위를 먼저 설명합니다.

### 수정·검증·보고

- 일반 수정은 최신 `develop` 기반 기능 브랜치에서 합니다. 이미 사용자가 선택한 작업 브랜치가 있으면 목적과 상태를 확인해 유지합니다. 릴리스·핫픽스는 `RULES.md`의 분기 기준을 따릅니다.
- 변경은 요청을 충족하는 작은 범위로 유지하고 실제 변경에 맞는 검사를 선택합니다. 문서만 바뀌면 링크·명령·설정 일치·공백 오류를 확인하며, 불필요하게 전체 테스트나 서비스를 실행하지 않습니다.
- UI/API·의존성·CI·Compose 변경이면 관련 검사와 실행 경로를 검증합니다. 검증을 못 했으면 이유와 영향, 재현 명령을 보고합니다. Docker 설정 문법 통과를 실제 서비스 기동 성공이라고 표현하지 않습니다.
- 커밋·Push·PR 생성·병합·배포·권한 변경은 사용자가 요청하거나 기존에 승인한 범위에서만 수행합니다. 가이드를 읽었다는 이유로 수행 권한이 생기지 않습니다.
- 병합 요청이면 최신 PR 커밋의 검사·리뷰·충돌·보호 설정을 확인합니다. 차단된 보호 규칙을 임의로 약화하지 않습니다. 관리자 예외를 사용했다면 이유와 검증 내용을 기록합니다.
- 최종 보고에는 변경 파일·목적·검증 결과·미완료 또는 미검증 사항·GitHub 반영 여부를 구분합니다. 실제 확인하지 않은 기능·설정은 완료라고 말하지 않습니다.

AI에게 요청하는 예:

> `$ubaljeok-workflow`를 사용해 현재 브랜치와 문서를 확인한 뒤 내 요청 범위만 작업해줘. 변경 파일과 검증 결과를 알려주고, GitHub 반영은 별도 요청이 있을 때만 진행해줘.

## PR 올리기 전 확인

- [ ] 작업 브랜치와 PR 대상이 올바른가?
- [ ] 관련 Issue·변경 목적·테스트 결과·미검증 사항을 적었는가?
- [ ] 불필요한 파일·비밀번호·사진 원본을 올리지 않았는가?
- [ ] 공통 API·DB·설정 변경을 담당자와 조율했는가?
- [ ] 리뷰 요청과 최신 CI 결과를 확인했는가?
