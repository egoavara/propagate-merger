# Branch Policy & Hotfix Process

## 기본 브랜치 전파 과정

### 일반 기능 개발
1. JIRA 티켓 생성
2. 티켓으로부터 기능 브랜치 생성 (예: AAA-0000)
3. AAA-0000 → dev 브랜치 머지 (squash merge)
4. dev → release/${버전명} 브랜치 생성
5. release/${버전명} → CBT 환경 배포 및 테스트
6. release/${버전명} → main 브랜치 머지
7. main 브랜치에서 GitHub release 및 태그 생성

### 환경별 단계
- **DEV**: 개발 브랜치 (dev)
- **CBT**: 릴리즈 브랜치 (release/버전명)
- **PROD**: 메인 브랜치 (main) + GitHub Release/Tag

## Hotfix 프로세스

### CBT 단계 Hotfix
**시나리오**: CBT 환경에서 버그 발견

1. JIRA 티켓 생성 (AAA-0001)
2. `release/버전명` 브랜치에서 AAA-0001 브랜치 생성
3. **Propagate Merger 도구로 `hotfix/v버전명-hotfix` 브랜치 생성** (release/버전명 브랜치 기반)
4. 수정 완료 후 AAA-0001 → `hotfix/v버전명-hotfix` 브랜치 머지
5. `hotfix/v버전명-hotfix` → `dev` 전파 머지 (**일반 merge**)
6. 문제있는 기존 release 브랜치 삭제
7. 미래 버전 브랜치들에도 전파 머지

**브랜치 예시**:
- release/v0.1.1 (문제 있음 → 삭제)
- hotfix/v0.1.1-hotfix (핫픽스 브랜치)
- release/v0.1.2 (미래 버전 → 전파 필요)

### PROD 단계 Hotfix
**시나리오**: PROD 환경에서 버그 발견

1. JIRA 티켓 생성 (AAA-0002)
2. **Git 태그**에서 `hotfix/v버전명-hotfix.1` 브랜치 생성 (main 브랜치에서 X)
   - 예: v0.1.2 태그 → hotfix/v0.1.2-hotfix.1
3. `hotfix/v0.1.2-hotfix.1`에서 AAA-0002 기능 브랜치 생성
4. AAA-0002 → `hotfix/v0.1.2-hotfix.1` PR 머지
5. CBT 환경 배포 및 검증
6. `hotfix/v0.1.2-hotfix.1` 브랜치에서 직접 릴리즈 생성 (태그: v0.1.2-hotfix.1)
7. **전파 머지 수행** (아래 상세 설명)
8. 모든 전파 완료 후 hotfix 브랜치 삭제

## Hotfix 전파 순서 및 전략

### 전파 대상 및 순서
1. **병렬 전파**: `hotfix/*` → `main`, 미래 `release/*` 브랜치들 (일반 merge)
2. **dev 전파**: 
   - `dev` → `hotfix/*` (update branch)
   - `hotfix/*` → `dev` (일반 merge)

### 머지 전략
- **일반 기능**: AAA-0000 → dev (squash merge)
- **핫픽스 관련**: 모든 전파에서 **일반 merge만 사용**

### 버전 비교 규칙
- **미래 버전으로만 전파**: semantic versioning 기준
- **자기 자신 제외**: v0.1.2-hotfix.1 → v0.1.2는 전파하지 않음
- **예시**: v0.1.2-hotfix.1 → v0.2.0 (OK), v0.1.1 (NO)

### 제약 사항
- **동시 hotfix 제한**: 핫픽스는 동시에 1개만 존재 가능
- **충돌 처리**: 충돌 감지 시 작업 중단하고 사용자에게 수동 해결 요청

## Propagate Merger 도구 기능

### 1. Hotfix 시작 (workflow_dispatch)
**입력**: 핫픽스할 버전 (예: v0.1.2)
**작업**: 해당 Git 태그에서 `hotfix/v0.1.2-hotfix.1` 브랜치 생성

### 2. Hotfix 전파 (workflow_dispatch)
**입력**: 전파할 hotfix 브랜치명
**작업 순서**:
1. `hotfix/*` → `main`, 미래 `release/*` 브랜치들에 병렬 전파 (일반 merge)
2. `dev` → `hotfix/*` update branch 수행
3. `hotfix/*` → `dev` 전파 (일반 merge)
4. hotfix 브랜치 삭제

**충돌 시**: 작업 중단하고 사용자에게 알림

## 브랜치 정리 정책
- **hotfix 브랜치**: 모든 전파 완료 후 삭제 (GitHub Release/Tag로 추적 가능)
- **문제있는 release 브랜치**: hotfix 생성 시 삭제
- **기능 브랜치**: 머지 후 삭제