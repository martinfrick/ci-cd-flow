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

## Phase 2 — PR pipeline (`.github/workflows/pr.yml`) ✅ (2026-07-09)

- [x] Job `title-lint`: `amannn/action-semantic-pull-request@v6` (re-runs on PR title edits)
- [x] Job `build-test`: `npm ci` → eslint → `cds build --production` → Jest smoke tests (CatalogService boots, Books + ListOfBooks 200 on in-memory sqlite)
- [x] Job `security`: gitleaks action + `npm audit --audit-level=high`
- [x] All three registered as required status checks in ruleset 18708507
- [x] **Verified**: all three checks green on PR #2 before being marked required

## Phase 3 — Release Please (`.github/workflows/release-please.yml`)

- [x] `googleapis/release-please-action@v4` on push to main, release-type `node`, manifest bootstrap at 1.0.0
- [x] `release-please-config.json`: reader-focused changelog sections (⚠ Breaking auto, Features, Bug Fixes, Performance, Dependencies); hidden: chore/ci/test/refactor/docs/style/build
- [ ] ⚠ **User action**: add `RELEASE_PLEASE_TOKEN` repo secret (fine-grained PAT, contents + pull-requests write) — the default `GITHUB_TOKEN` cannot trigger pr.yml on the Release PR, leaving required checks stuck pending (admin-bypass merge works meanwhile)
- [ ] `extra-files` for `chart/Chart.yaml` + `chart/values.yaml` image tags — added in Phase 4 when the chart exists
- **Verify**: merge a `feat:` PR → Release PR appears with correct next version + changelog entry; merge Release PR → tag + GitHub Release created (note: the three `chore:` commits to date correctly trigger no release)

## Phase 4 — Build & publish (`.github/workflows/release-build.yml`, on release published)

- [x] Chart via `cds add kyma` + `cds add hana` in `chart/`; `cds build --production` resolves subcharts into `gen/chart` (web-application srv, service-instance hana, content-deployment hana-deployer job). Env value overrides land in Phase 5.
- [x] `pack build` × 2 from `gen/srv` + `gen/db` (paketobuildpacks/builder-jammy-base, `BP_NODE_RUN_SCRIPTS=""`) — **html5-deployer deferred**: needs HTML5 Application Repository + destination/launchpad services; srv serves the Fiori apps meanwhile
- [x] Push images + OCI chart to GHCR tagged with release version (auth: `GITHUB_TOKEN`, `packages: write`); chart version stamped at `helm package` time — no release-please extra-files needed
- [x] Trivy scan images, `continue-on-error: true` (placeholder → blocking later); buildpack SBOMs zipped and attached to the GitHub Release
- [x] `workflow_dispatch` fallback with tag input (also covers re-runs if a release build fails)
- [x] Local verification: `helm package --version 1.1.0-test` stamps correctly; `helm template` renders Deployment/Job/ServiceInstance/Bindings/APIRule/NetworkPolicy/PDB
- [ ] **Verify in CI (needs first Release)**: GHCR shows both images + chart at the version; Release has SBOM asset; Trivy summary present

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
