# list-dependents

Lists all dependents of a project, using npm and [`ecosyste.ms`](https://ecosyste.ms/)

[![npm version](https://img.shields.io/npm/v/list-dependents.svg?style=flat)](https://www.npmjs.com/package/list-dependents)
[![npm downloads](https://img.shields.io/npm/dm/list-dependents.svg?style=flat)](https://www.npmjs.com/package/list-dependents)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg)](https://github.com/voxpelli/eslint-config)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

### Simple

```javascript
import { fetchEcosystemDependents } from 'list-dependents';

const result = fetchEcosystemDependents(name);

for await (const { downloads, name, pkg } of fetchEcosystemDependents('npm-run-all2')) {
  console.log(downloads, name, pkg.description);
}
```

### Advanced

See [`examples/cli.js`](./examples/cli.js)

## API

### fetchEcosystemDependents()

Uses the [`ecosyste.ms`](https://ecosyste.ms/) API to resolve packages of dependents

#### Syntax

```ts
fetchEcosystemDependents(name, [options]) => AsyncGenerator<EcosystemDependentsItem>
```

#### Arguments

* `name`: The name of the package to do the lookup for
* `options`: Type `EcosystemDependentsOptions` – optional options

#### Options

* `filter` – a function that's called with an `EcosystemDependentsMeta` object and which should return `true` for it to be included or else `false`
* `logger` – a `BunyanLite` compatible logger instance
* `maxAge` – the maximum age of latest release to uinclude
* `maxPages` – the maximum number of source pages to fetch (there are `perPage` items per page)
* `minDownloadsLastMonth = 400` – the minimum amount of downloads needed to be returned
* `perPage = 36` – how many items per page to lookup
* `skipPkg` – when set skips resolving `package.json`

#### Types

```ts
import type { NormalizedPackageJson } from 'read-pkg';

export interface DependentsMeta {
  downloads: number;
  name: string;
}

export interface EcosystemDependentsMeta extends DependentsMeta {
  dependentCount: number | undefined,
  firstRelease: string | undefined,
  latestRelease: string | undefined,
  repositoryUrl: string | undefined;
}

export interface DependentsItem extends DependentsMeta {
  pkg?: NormalizedPackageJson | undefined;
}

export interface EcosystemDependentsItem extends DependentsItem, EcosystemDependentsMeta {}
```

### fetchEcosystemPackage()

Uses the [`ecosyste.ms`](https://ecosyste.ms/) API to resolve a package

#### Syntax

```ts
fetchEcosystemPackage(name, [options]) => Promise<EcosystemDependentsItem>
```

#### Arguments

* `name`: The name of the package to do the lookup for
* `options`: Type `PackageLookupOptions` – optional options

#### Options

* `filter` – a function that's called with an `EcosystemDependentsMeta` object and which should return `true` for it to be included or else `false`
* `logger` – a `BunyanLite` compatible logger instance
* `skipPkg` – when set skips resolving `package.json`

#### Types

See [`fetchEcosystemDependents`](#fetchecosystemdependents)

### fetchNpmDependents()

Uses the npm [website](https://www.npmjs.com/browse/depended/c8), [registry API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#getpackageversion) and [download count API](https://github.com/npm/registry/blob/master/docs/download-counts.md) to resolve packages of dependents

#### Syntax

```ts
fetchNpmDependents(name, [options]) => AsyncGenerator<DependentsItem>
```

#### Arguments

* `name`: The name of the package to do the lookup for
* `options`: Type `NpmDependentsOptions` – optional options

#### Options

* `logger` – a `BunyanLite` compatible logger instande
* `maxPages` – the maximum number of source pages to fetch (there are `36` items per page)
* `minDownloadsLastWeek = 100` – the minimum amount of downloads needed to be returned
* `skipPkg` – when set skips resolving `package.json`

#### Types

```ts
import type { NormalizedPackageJson } from 'read-pkg';

interface DependentsItem = {
  downloads: number;
  name: string;
  pkg?: NormalizedPackageJson | undefined,
}
```

### fetchNpmDependentList()

Uses the npm website to resolve dependent names. Used internally by [`fetchNpmDependents()`](#fetchnpmdependents)

#### Syntax

```ts
fetchNpmDependentList(name, [options]) => AsyncGenerator<string>
```

#### Arguments

* `name`: The name of the package to do the lookup for
* `options`: Type `NpmDependentListOptions` – optional options

#### Options

* `logger` – a `BunyanLite` compatible logger instande
* `maxPages` – the maximum number of source pages to fetch (there are `36` items per page)

## Similar modules

* [`dependents`](https://github.com/pkgjs/dependents) – uses [`npm-dependants`](https://github.com/juliangruber/npm-dependants) together with the npm API and GitHub API to deliver a functionality similar to [`fetchEcosystemDependents()`](#fetchecosystemdependents) / [`fetchNpmDependents()`](#fetchnpmdependents)
* [`list-installed`](https://github.com/voxpelli/list-installed) – sister module to this module – similar API but resolves locally installed modules rather than remote dependents
* [`npm-dependants`](https://github.com/juliangruber/npm-dependants) – similar in functionality to [`fetchNpmDependentList()`](#fetchnpmdependentlist)

<!-- ## See also

* [Announcement blog post](#)
* [Announcement tweet](#) -->
