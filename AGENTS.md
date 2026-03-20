# Web Futures Agent Guide

This project is a specialized fork of the [web-features](https://github.com/web-platform-dx/web-features) package. It includes a surgical change to the core logic that allows unreleased browser versions to affect the browser support matrix for features. 

The name **"web-futures"** reflects our ability to look ahead and see what is coming up in the web platform's support landscape. This project is a critical dependency that powers the [timebase](https://github.com/rviscomi/timebase) project.

---

## The "Surgical" Change

The core difference between `web-features` and `web-futures` lies in how browser releases are filtered. In the upstream project, pre-release browser versions (e.g., Safari Technology Preview, Chrome Canary) are excluded from the feature support matrix.

In `web-futures`, we remove this filter in `index.ts`:

```typescript
// Upstream web-features:
const releases = browser.releases.filter(release => !release.isPrerelease()).map(release => ({ ... }));

// web-futures:
const releases = browser.releases.map(release => ({ ... }));
```

This simple change allows the data generation process to include unreleased browser versions, providing a "future" view of web feature interoperability.

## Syncing with Upstream

Maintaining parity with the upstream `web-features` project is essential. Follow these steps to synchronize changes and prepare a new release.

### 1. Pull Upstream Changes
Fetch the latest updates from the main `web-features` repository.

```bash
git pull upstream main
```

> [!NOTE]
> This project uses **Husky** hooks to maintain the `web-futures` identity and logic. When you merge or rebase (e.g., after a `git pull`), a `post-merge` or `post-rebase` hook automatically runs `npm run post-sync`.
>
> This script does two things:
> 1. It calls `npm run apply-local-patches`, which applies the surgical changes defined in `local-patches/web-futures-local.patch` (including the filter removal in `index.ts` and the package name update).
> 2. It runs `npm install` if any `package.json` changes were detected.

> [!IMPORTANT]
> The `git pull` will likely result in numerous merge conflicts, particularly in generated data files. **Do not attempt to resolve these manually yet.** Proceed to the next step.

### 2. Install/Sync Dependencies
Before regenerating data, verify that all dependencies are in sync.

```bash
npm install
```

> [!NOTE]
> If there are conflicts in `package-lock.json` or `packages/web-features/package-lock.json`, running `npm install` in the respective directories will often resolve them automatically by merging the changes.

### 3. Regenerate Support Data
Run the distribution script to resolve conflicts in generated files automatically.

```bash
npm run dist
```

This script regenerates the browser support data using the unreleased browser version logic. Since many of the conflicts are in files that this script produces, running it will overwrite those conflicts with the correct `web-futures` data.

### 4. Manual Conflict Resolution
After running `npm run dist`, some conflicts may still remain (e.g., in `package.json` or other configuration files).

*   **Package Name**: Ensure the name remains `"web-futures"`.
*   **Version Syntax**: Always keep the package version **identical** to the upstream `web-features` version.
*   **Dependency Discrepancies**: Resolve any other naming or versioning conflicts manually.

### 5. Build the Release Candidate
Once all conflicts are resolved and the data is regenerated, build the project to ensure everything is valid and ready for distribution.

```bash
npm run build
```

This generates the release candidate for the new version.

### 6. Commit the Merge
Once the build is verified, commit all staged changes with this exact message:

```
Merge branch 'main' of github.com:web-platform-dx/web-features
```

---

## Publishing

Publishing is currently a manual process. Once the build is verified:

1.  Ensure you are authenticated with npm.
2.  Publish the new version of the `@web-futures` (or equivalent) package.

> [!NOTE]
> The publishing step is performed at the discretion of the maintainer after the release candidate has been built and verified.
