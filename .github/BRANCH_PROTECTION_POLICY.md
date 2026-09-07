# Main Branch Protection Policy

Target branch: `main`

## Required merge gate

The repository must require pull requests before changes reach `main`.

Required status check:

- `architecture-typecheck` (workflow: `Architecture Check`)

The check runs on every non-draft pull request targeting `main` and validates:

1. `npm ci`
2. architecture TypeScript check with `tsconfig.architecture.json`
3. production build with `npm run build`

## GitHub branch/ruleset configuration

Configure the `main` branch with:

- Require a pull request before merging: **enabled**
- Required approvals: **0** while the repository is maintained by a single primary maintainer
- Require status checks to pass before merging: **enabled**
- Required check: **`architecture-typecheck`**
- Require branches to be up to date before merging: **enabled**
- Require conversation resolution before merging: **enabled**
- Block force pushes: **enabled**
- Block branch deletion: **enabled**
- Require linear history: **disabled** (current rollback/audit workflow uses merge commits)
- Administrator bypass: keep available only as an emergency recovery path; normal changes must use PR + CI

## Operational rule

No feature, performance, security, schema, or production change should be merged directly to `main`.

Emergency recovery should prefer a revert PR. Administrator bypass is reserved for cases where GitHub Actions or the protection mechanism itself prevents recovery.

## Rollback

This policy does not remove rollback capability. Revert the merge commit in a dedicated PR, let `architecture-typecheck` pass, and merge the revert.
