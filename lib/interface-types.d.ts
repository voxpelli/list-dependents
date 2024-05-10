import type { BunyanLite } from "bunyan-adaptor";
// @ts-ignore
import type { NormalizedPackageJson } from "read-pkg";

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

interface DependentLookupOptions {
  logger?: BunyanLite | undefined;
  skipPkg?: boolean | undefined;
}

export type EcosystemFilterCallback = (item: import('./interface-types.d.ts').EcosystemDependentsMeta) => boolean;

interface FilteredLookupOptions {
  filter?: EcosystemFilterCallback
}

export interface PackageLookupOptions extends DependentLookupOptions, FilteredLookupOptions {}

export interface DependentsOptions extends DependentLookupOptions {
  maxPages?: number | undefined;
}

export interface NpmDependentsOptions extends DependentsOptions {
  minDownloadsLastWeek?: number | undefined;
}

export interface EcosystemDependentsOptions extends DependentsOptions {
  maxAge?: number | undefined;
  minDownloadsLastMonth?: number | undefined;
  perPage?: number | undefined;
}
