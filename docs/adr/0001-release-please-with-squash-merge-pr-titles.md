# 0001. Release Please with squash-merge PR titles as the release driver

Date: 2026-07-09

## Status

Accepted

## Context

We need automated, conventional-commit-driven versioning and changelogs with a human gate on releases and peer-reviewable release notes. The design was originally targeted at Bitbucket Cloud, where Release Please does not work (it is built on the GitHub API); semantic-release with a manually-triggered pipeline was selected as the closest substitute. Mid-design, the platform decision changed to GitHub, reopening the choice.

Two candidate models on GitHub:

- **semantic-release** (manual `workflow_dispatch`): releases cut by triggering a workflow; release notes publish without review.
- **Release Please** (rolling Release PR): version bump and changelog accumulate in a PR; merging the PR cuts the release.

A second, coupled decision is what commits the tool reads. With merge commits, every branch commit lands on `main` and pollutes the changelog unless authors rebase with discipline. With squash merges, exactly one conventional commit per PR lands on `main` — the PR title.

## Decision

Use **Release Please** via `release-please-action`, with **squash merge as the only allowed merge strategy**. PR titles must be valid Conventional Commits, enforced by a required status check (`amannn/action-semantic-pull-request`); they become the commits Release Please reads. The PR description becomes the squash-commit body, so `BREAKING CHANGE:` footers are declared there. Merging the Release PR creates the tag and GitHub Release, which triggers artifact build/publish and QA deployment.

## Consequences

- Release notes are peer-reviewed: reviewing the Release PR *is* reviewing the changelog. AI-drafted Highlights attach to this PR as a sticky comment and are approved in the same review.
- The PR title is load-bearing — a mistyped title mis-versions the release. The title-lint check is therefore non-negotiable, and local commitlint (Husky) is hygiene rather than the release gate.
- Individual branch commits never appear in history on `main`; granular in-branch history is lost on merge (acceptable: PRs are short-lived).
- Changing merge strategy later (e.g. to merge commits) silently changes what Release Please reads and would corrupt version calculation — this pairing must change together or not at all.
- Reverting to semantic-release later would lose the reviewable Release PR and require re-teaching the release gate to the team.
