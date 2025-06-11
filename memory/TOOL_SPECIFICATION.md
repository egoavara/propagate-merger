# Propagate Merger 도구 명세서

## 개요
Propagate Merger는 GitHub Action 기반의 브랜치 전파 자동화 도구입니다. 주로 Hotfix 프로세스에서 복잡한 브랜치 전파 작업을 자동화하여 인적 오류를 방지하고 일관된 브랜치 관리를 제공합니다.

## 도구의 핵심 역할

### 1. Hotfix 생명주기 관리
- **Hotfix 브랜치 생성**: Git 태그에서 표준화된 hotfix 브랜치 자동 생성
- **전파 자동화**: 정의된 정책에 따른 자동 브랜치 전파
- **브랜치 정리**: 작업 완료 후 임시 브랜치 자동 삭제

### 2. 정책 기반 자동화
- **Semantic Versioning 준수**: 버전 비교 로직으로 올바른 전파 대상 선별
- **머지 전략 자동 선택**: 상황에 맞는 머지 전략 적용
- **충돌 감지 및 대응**: 자동 처리 가능한 경우만 진행, 충돌 시 중단

## 주요 기능

### 통합된 입력 파라미터
```yaml
inputs:
  mode:
    description: '실행 모드 (branch-create: hotfix 브랜치 생성, auto-merge: hotfix 전파)'
    required: true
    type: choice
    options:
      - branch-create
      - auto-merge
  version: 
    description: 'Hotfix 대상 버전 (필수, 예: v0.1.2)'
    required: true
  hotfix-suffix:
    description: 'Hotfix 접미사 (기본값: hotfix.1)'
    required: false
    default: 'hotfix.1'
  direct-merge-branches:
    description: '1단계: 직접 전파할 브랜치 패턴 (먼저 실행, mode: auto-merge시 사용, 기본값: main,release/*)'
    required: false
    default: 'main,release/*'
  update-then-merge-branches:
    description: '2단계: Update branch 후 전파할 브랜치들 (direct-merge-branches 완료 후 실행, mode: auto-merge시 사용, 기본값: dev)'
    required: false
    default: 'dev'
  auto-cleanup:
    description: '전파 완료 후 hotfix 브랜치 자동 삭제 (mode: auto-merge시 사용)'
    required: false
    default: 'true'
```

### 기능 1: Hotfix 브랜치 생성 (mode: branch-create)
**목적**: PROD 환경 버그 수정을 위한 hotfix 브랜치 생성

**필수 입력**:
- `mode: branch-create`
- `version: v0.1.2`

**선택 입력**:
- `hotfix-suffix: hotfix.1` (기본값)

**브랜치명 생성 규칙**:
- 생성될 브랜치명: `hotfix/v{version}-{hotfix-suffix}`
- 예: `hotfix/v0.1.2-hotfix.1`

**수행 작업**:
1. 입력된 버전의 Git 태그 존재 확인
2. 동시 실행 중인 다른 hotfix 브랜치 존재 확인
3. `hotfix/v{version}-{suffix}` 브랜치 생성
4. 생성된 브랜치를 원격 저장소에 푸시

**출력**:
```yaml
outputs:
  hotfix-branch:
    description: '생성된 hotfix 브랜치명'
  base-version:
    description: '기준이 된 버전 태그'
```

**예시**:
```bash
# 입력: mode=branch-create, version=v0.1.2, hotfix-suffix=hotfix.1
# 결과: hotfix/v0.1.2-hotfix.1 브랜치가 v0.1.2 태그에서 생성됨
```

### 기능 2: Hotfix 전파 (mode: auto-merge)
**목적**: Hotfix 변경사항을 관련 브랜치들에 자동 전파

**필수 입력**:
- `mode: auto-merge`
- `version: v0.1.2`

**선택 입력**:
- `hotfix-suffix: hotfix.1` (기본값)
- `direct-merge-branches: main,release/*` (기본값)
- `update-then-merge-branches: dev` (기본값)
- `auto-cleanup: true` (기본값)

**브랜치명 생성 규칙**:
- 전파할 브랜치명: `hotfix/v{version}-{hotfix-suffix}`
- 예: `hotfix/v0.1.2-hotfix.1`

**수행 작업**:
1. **전파 대상 분석**:
   - 현재 존재하는 모든 브랜치 목록 조회
   - Semantic versioning 기준으로 미래 버전 브랜치 필터링
   - `direct-merge-branches`와 `update-then-merge-branches`에서 지정된 브랜치들을 전파 대상에 포함

2. **1단계: 직접 전파** (direct-merge-branches):
   ```
   hotfix/v0.1.2-hotfix.1 → main
   hotfix/v0.1.2-hotfix.1 → release/v0.2.0
   hotfix/v0.1.2-hotfix.1 → release/v0.3.0
   ```
   - 각 대상 브랜치별로 PR 생성
   - 충돌 없는 경우에만 자동 머지 (일반 merge)
   - 충돌 발생 시 해당 브랜치 전파 중단

3. **2단계: Update 후 전파** (update-then-merge-branches):
   ```
   dev → hotfix/v0.1.2-hotfix.1 (update branch 먼저 수행)
   hotfix/v0.1.2-hotfix.1 → dev (일반 merge)
   ```
   - `update-then-merge-branches`에 지정된 브랜치들에 대해 특별 처리
   - 해당 브랜치에는 추가 기능이 있을 수 있어 hotfix 브랜치를 먼저 최신화
   - update branch 완료 후 hotfix 브랜치를 해당 브랜치로 전파

4. **3단계: 정리 작업**:
   - 모든 전파 성공 시 hotfix 브랜치 삭제
   - 전파 결과 리포트 생성

**출력**:
```yaml
outputs:
  propagation-result:
    description: '전파 결과 (success/partial/failed)'
  successful-branches:
    description: '성공적으로 전파된 브랜치 목록 (JSON)'
  failed-branches:
    description: '전파 실패한 브랜치 목록 (JSON)'
  created-prs:
    description: '생성된 PR 번호 목록 (JSON)'
```

## 기술적 구현 세부사항

### Semantic Version 비교 로직
```typescript
function isVersionNewer(baseVersion: string, targetVersion: string): boolean {
  // v0.1.2-hotfix.1 vs v0.2.0 → true (전파 필요)
  // v0.1.2-hotfix.1 vs v0.1.1 → false (전파 불필요)
  // v0.1.2-hotfix.1 vs v0.1.2 → false (자기 자신 제외)
}
```

### 충돌 감지 및 처리
```typescript
interface ConflictResult {
  hasConflicts: boolean;
  conflictingFiles: string[];
  canAutoResolve: boolean;
}
```

### 브랜치 패턴 매칭
- **direct-merge-branches** (1단계):
  - `main`: 메인 브랜치
  - `release/*`: 모든 릴리즈 브랜치 (미래 버전만)
- **update-then-merge-branches** (2단계):
  - `dev`: 개발 브랜치 (update branch 먼저 수행 후 전파)
- **기타**:
  - `hotfix/*`: 기존 hotfix 브랜치들 (중복 방지용)

## 사용 시나리오

### 시나리오 1: PROD Hotfix 전체 플로우
```yaml
# Step 1: Hotfix 브랜치 생성
- name: Create Hotfix Branch
  uses: egoavara/propagate-merger@v1
  with:
    mode: branch-create
    version: v0.1.2

# 개발자가 hotfix/v0.1.2-hotfix.1 브랜치에서 수정 작업 수행
# CBT 환경에서 테스트 완료 후...

# Step 2: Hotfix 전파
- name: Propagate Hotfix
  uses: egoavara/propagate-merger@v1
  with:
    mode: auto-merge
    version: v0.1.2
```

### 시나리오 2: 부분 실패 처리
```yaml
- name: Propagate Hotfix
  id: propagate
  uses: egoavara/propagate-merger@v1
  with:
    mode: auto-merge
    version: v0.1.2

- name: Handle Conflicts
  if: steps.propagate.outputs.propagation-result != 'success'
  run: |
    echo "Failed branches: ${{ steps.propagate.outputs.failed-branches }}"
    echo "Manual intervention required"
```

## 에러 처리 및 복구

### 일반적인 에러 상황
1. **Git 태그 미존재**: hotfix-start 시 대상 버전 태그가 없는 경우
2. **동시 hotfix 감지**: 이미 다른 hotfix 브랜치가 존재하는 경우
3. **브랜치 충돌**: 전파 과정에서 머지 충돌 발생
4. **권한 부족**: GitHub 토큰 권한 문제

### 복구 전략
- **부분 실패 허용**: 일부 브랜치 전파 실패해도 다른 브랜치는 계속 처리
- **상태 보고**: 상세한 실패 원인과 수동 처리 가이드 제공
- **롤백 지원**: 필요시 생성된 브랜치 및 PR 정리

## 제한사항 및 고려사항

### 제한사항
- **동시 hotfix 제한**: 한 번에 하나의 hotfix만 처리 가능
- **충돌 자동 해결 불가**: 머지 충돌 시 수동 개입 필요
- **GitHub API 제한**: Rate limiting 고려한 구현 필요

### 보안 고려사항
- **최소 권한 원칙**: 필요한 최소한의 GitHub 권한만 요청
- **브랜치 보호 규칙**: 중요 브랜치의 보호 설정 우선 적용
- **감사 로그**: 모든 브랜치 조작 활동 기록

## 설정 및 환경 요구사항

### 필수 GitHub 권한
- `contents: write` - 브랜치 생성/삭제
- `pull-requests: write` - PR 생성/머지
- `metadata: read` - 저장소 정보 조회

### 환경 변수
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # 추가 설정값들...
```

이 도구는 복잡한 브랜치 전파 프로세스를 자동화하여 개발팀의 생산성을 높이고 휴먼 에러를 방지하는 것이 주요 목표입니다.