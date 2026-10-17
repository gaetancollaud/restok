# ci-delivery Specification

## Purpose

Defines the GitHub Actions pipeline that verifies every change, builds and tests the native image, and publishes release images to GitHub Container Registry.

## Requirements

### Requirement: Verification on every change
For every pull request and every push to `main`, CI SHALL run the JVM test suite, fail if the committed GraphQL schema snapshot is out of date, and fail if the Kustomize overlays do not render.

#### Scenario: Failing test
- **WHEN** a pull request introduces a failing test
- **THEN** the CI check fails and reports the failing test

#### Scenario: Stale schema snapshot
- **WHEN** a pull request changes the GraphQL API without committing the updated schema snapshot
- **THEN** the CI check fails

### Requirement: Native build and tests
For every pull request and every push to `main` or a version tag, CI SHALL build the native executable and run the integration tests against it.

#### Scenario: Native-only breakage
- **WHEN** a change works in JVM mode but fails in the native executable
- **THEN** the CI check fails

### Requirement: Image publication to GitHub Container Registry
On pushes to `main` and on version tags `v*`, after all checks pass, CI SHALL push the native image to `ghcr.io/<owner>/restok`. Pull requests SHALL NOT push images.

#### Scenario: Push to main
- **WHEN** a commit is pushed to `main` and CI passes
- **THEN** the image is published with tags `main` and `sha-<short commit sha>`

#### Scenario: Version tag
- **WHEN** tag `v1.2.3` is pushed and CI passes
- **THEN** the image is published with tags `1.2.3` and `latest`

#### Scenario: Pull request
- **WHEN** CI runs for a pull request
- **THEN** no image is pushed

### Requirement: No long-lived registry credentials
CI SHALL authenticate to the registry with the workflow's built-in token and least-privilege permissions, not with stored personal credentials.

#### Scenario: Workflow permissions
- **WHEN** the workflow file is inspected
- **THEN** registry login uses the workflow token and only the publishing job has `packages: write`
