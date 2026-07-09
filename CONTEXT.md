# Context: CI/CD Flow

Glossary of terms for the CAP CI/CD pipeline (GitHub + GitHub Actions). Terms here are canonical — use them consistently in code, workflows, and docs.

## Terms

### Release

A deliberate, batched version cut, executed by merging the Release PR. A Release is **not** a merge of a feature PR and **not** a Deployment — feature merging is continuous; releasing is a reviewed human decision. Merging the Release PR creates the git tag and the GitHub Release, which triggers building and publishing the Release artifacts.

### Release PR

The rolling pull request maintained by Release Please on `main`. It accumulates the version bump and `CHANGELOG.md` entries derived from Conventional Commit PR titles since the last Release. Reviewing the Release PR **is** the peer review of the release notes.

### Conventional Commit

A commit message following the Conventional Commits spec (`feat:`, `fix:`, `chore:`, …). PR titles must be Conventional Commits — after squash merge they are the commits Release Please reads.

### Merge

Feature/fix PRs land on `main` exclusively by **squash merge**. The PR title becomes the commit subject; the PR description becomes the commit body (including any `BREAKING CHANGE:` footer). Branch-local commits never reach `main` directly.

### Deployment

Installing a build (Snapshot or Release artifact) into one Environment via Helm. A Deployment never rebuilds — Releases are built once and promoted as-is ("build once, promote binaries").

### Environment

One of three Kyma targets, mirrored as GitHub Environments: **dev** (receives a Snapshot on every merge to `main`), **qa** (receives Release artifacts when a Release is cut), **prod** (receives the same Release artifacts via manual Promotion).

### Snapshot

An untagged build produced from `main` on merge, deployed only to dev. Not a Release; carries no semantic version of its own.

### Promotion

The manual, approval-gated act of deploying an already-released, already-QA-deployed artifact to prod. No rebuild, no new version.

### Release artifact

The immutable outputs of one Release, all sharing the Release version and stored in GHCR: container images (**srv**, **hana-deployer** — an **html5-deployer** joins once the HTML5 Application Repository is set up; until then srv serves the UIs) plus the **Helm chart** (pushed as an OCI artifact, version stamped at `helm package` time = Release version). HDI schema deployment runs as a Helm job using the hana-deployer image. QA and prod Deployments pull these artifacts from GHCR — never rebuilt from source.

### Highlights

An AI-drafted, human-reviewed narrative summary of a Release. Drafted by Claude as a sticky comment on the Release PR (so reviewers approve it alongside the release notes), then prepended to the GitHub Release body on merge. Never written into `CHANGELOG.md`, which stays fully deterministic.

### Image build

Container images are built with the `pack` CLI (Cloud Native Buildpacks, `builder-jammy-base`) from the output of `cds build --production` — e.g. `gen/srv` for the service image and `app/html5-deployer` for the UI deployer image. No Dockerfiles.
