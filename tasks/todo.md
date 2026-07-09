# CI/CD Implementation Plan

Design authority: `CONTEXT.md`, `docs/adr/0001`, `docs/adr/0002`. Each phase is independently verifiable — do not start a phase until the previous one's verification passes.

## Phase 0 — Repo foundation ✅ (2026-07-09)

- [x] `git init`, initial commit of existing CAP starter
- [x] Create GitHub repo (github.com/martinfrick/ci-cd-flow, **public** — free plan doesn't enforce rulesets on private repos), push, squash-only merge
- [x] Default squash commit message = PR title + description (`PR_TITLE`/`PR_BODY`)
- [x] Add `CODEOWNERS` (owners for `.github/workflows/`, `chart/`, `db/`)
- [x] Branch protection ruleset `main-protection`: 1 approval, dismiss stale reviews, code-owner review, block force-push/deletion, PR-only. Required status checks added in Phase 2.
  - ⚠ Repo-admin **bypass** enabled for solo development — remove `bypass_actors` from ruleset 18708507 when a second reviewer joins
- [x] **Verified**: direct push to `main` rejected (GH013, "Changes must be made through a pull request"); repo settings confirm squash-only

> Public-repo bonus: CodeQL and GitHub secret-scanning push protection are now free — Phase 2/6 upgrade CodeQL from placeholder to real.

## Phase 1 — Local guardrails (Husky) ✅ (2026-07-09)

- [x] Dev deps installed: husky, commitlint (+config-conventional), lint-staged, eslint via `cds add lint` (@sap/eslint-plugin-cds flat config), prettier; gitleaks via brew (hook warns + skips gracefully if absent)
- [x] `commitlint.config.js` extending config-conventional
- [x] Hooks: `commit-msg` → commitlint · `pre-commit` → lint-staged (eslint + prettier on staged) + gitleaks staged scan · `pre-push` → branch-name check (main exempt)
- [x] `prepare-commit-msg` → Claude drafts conventional message from staged diff; only when message empty; skip via `SKIP_AI=1`; graceful no-op when `claude` CLI absent
- [x] **Verified**: non-conventional message rejected by commitlint; staged fake GitHub PAT blocked by gitleaks (note: AWS `AKIA…EXAMPLE` sample keys are allowlisted by gitleaks — test with realistic tokens); AI hook drafted a valid conventional message from the real diff; `BadBranchName` push rejected by pre-push

## Phase 2 — PR pipeline (`.github/workflows/pr.yml`)

- [ ] Job `title-lint`: `amannn/action-semantic-pull-request`
- [ ] Job `build-test`: `npm ci` → eslint → `cds build --production` → Jest with `@cap-js/cds-test` (add first smoke test: service boots, `GET /odata/v4/...` 200 on in-memory sqlite)
- [ ] Job `security`: `npm audit --audit-level=high` + gitleaks action
- [ ] Register all three as required status checks in the ruleset
- **Verify**: PR with bad title blocked; PR with failing test blocked; green PR mergeable with 1 approval

## Phase 3 — Release Please (`.github/workflows/release-please.yml`)

- [ ] `release-please-action`, release-type `node`
- [ ] `release-please-config.json`: reader-focused changelog sections (⚠ Breaking, Features, Bug Fixes, Performance, Dependencies); hide chore/ci/test/refactor/docs; `extra-files` to bump `chart/Chart.yaml` version + appVersion and image tags in `chart/values.yaml`
- **Verify**: merge a `feat:` PR → Release PR appears with correct next version + changelog entry; merge Release PR → tag + GitHub Release created

## Phase 4 — Build & publish (`.github/workflows/release-build.yml`, on release published)

- [ ] `cds add helm`-based chart in `chart/` with values-dev/qa/prod.yaml; hana-deployer as pre-upgrade job
- [ ] `cds build --production` → `pack build` × 3 (srv from `gen/srv`, hana-deployer from `gen/db`, html5-deployer from `app/html5-deployer`; builder-jammy-base, `BP_NODE_RUN_SCRIPTS=""`)
- [ ] Push images + OCI chart to GHCR tagged with release version (auth: `GITHUB_TOKEN`, `packages: write`)
- [ ] Trivy scan all images, `continue-on-error: true`, results to job summary (placeholder → blocking later)
- [ ] Extract buildpack SBOMs, attach to the GitHub Release
- **Verify**: after a release, GHCR shows 3 images + chart at the version; Release has SBOM assets; Trivy summary present

## Phase 5 — Deployments

- [ ] Kyma: per-env namespace + ServiceAccount with deploy-scoped Role; kubeconfigs stored as secrets on GitHub Environments dev/qa/prod; prod Environment requires reviewer approval
- [ ] Snapshot workflow (push to `main`): build + push sha-tagged images, `helm upgrade` dev from checkout
- [ ] QA deploy job (after release build): `helm upgrade` pulling OCI chart + images from GHCR by version
- [ ] Promotion workflow (`workflow_dispatch`, input: version, environment: prod): same helm command, gated by prod Environment reviewers
- **Verify**: merge → dev updated with sha tag; release → qa runs the release version; promotion requires approval, then prod runs the identical artifacts

## Phase 6 — AI & supply-chain finishers

- [ ] Highlights workflow: on Release PR changes, Claude drafts `## Highlights` as sticky PR comment; on release published, prepend approved comment to Release body (`ANTHROPIC_API_KEY` secret)
- [ ] Claude Code command/skill for PR creation: draft conventional title + structured description (what/why/testing/breaking) from branch diff, author approves, `gh pr create`
- [ ] Renovate: conventional commit titles (`fix(deps)`/`chore(deps)`), grouped @sap/cds updates
- [ ] npm signature/provenance verification step (`npm audit signatures`) in PR pipeline
- [ ] Enable CodeQL (free on public repos) + GitHub secret-scanning push protection; document Trivy flip-to-blocking instructions in README
- **Verify**: Release PR carries reviewable Highlights comment; published Release body starts with Highlights; Renovate PR appears with conventional title

## Explicitly out of scope (documented, not built)

- OIDC federation to Kyma (hardening follow-up, replaces stored kubeconfigs)
- GitOps/ArgoCD promotion model
- Multi-version maintenance branches (single release line for now)
