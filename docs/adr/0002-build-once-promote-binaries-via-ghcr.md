# 0002. Build once, promote binaries via GHCR

Date: 2026-07-09

## Status

Accepted

## Context

The CAP application deploys to three SAP BTP Kyma environments (dev, qa, prod) via Helm. When a Release is cut, its artifacts must reach qa and later prod. Two models were considered:

- **Rebuild per environment**: each deploy job checks out the release tag and rebuilds images/chart. Simple pipelines, but what runs in prod is not byte-identical to what QA tested — base images, buildpacks, and transitive dependencies can drift between builds.
- **Build once, promote binaries**: the release build produces immutable, versioned artifacts once; qa and prod deployments pull those exact artifacts from a registry.

The application requires three images (srv, hana-deployer, html5-deployer — HANA HDI deployment runs as a Helm pre-upgrade job) built with the `pack` CLI (Cloud Native Buildpacks, no Dockerfiles), plus a Helm chart. GHCR was chosen as the registry and supports both container images and Helm charts as OCI artifacts.

## Decision

On Release, build all three images with `pack` from the `cds build --production` output, stamp the chart (`Chart.version` = app version = Release version), and push **all four artifacts to GHCR** tagged with the Release version. QA and prod deploy jobs run `helm upgrade` pulling the OCI chart and images from GHCR by version — they never check out source or rebuild. Snapshots (merge to `main`) build and deploy to dev only, without a semantic version.

## Consequences

- Prod runs the byte-identical artifacts QA verified; buildpack/base-image drift between environments is impossible within one Release.
- Deploy jobs need only registry credentials and a kubeconfig — no Node/CAP toolchain — so promotion is fast and has a small attack surface.
- Artifacts in GHCR are the system of record for what a version *is*; SBOMs and Trivy results attach to them. GHCR retention/cleanup policy must preserve released versions indefinitely.
- Chart, images, and app share one version number; a chart-only fix still requires a new Release (accepted for simplicity — see CONTEXT.md "Release artifact").
- Base-image security patches do not reach prod until a new Release is cut; Renovate + regular releases are the mitigation.
