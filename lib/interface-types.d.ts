import type { BunyanLite } from "bunyan-adaptor";
import { Got } from "got";
// @ts-ignore
// eslint-disable-next-line n/no-unpublished-import
import type { NormalizedPackageJson } from "read-pkg";

declare global {
  // Trying to upstream here: https://github.com/octet-stream/form-data-encoder/pull/29
  // The <_R = any> is needed for compatibility with the ReadableStream from lib.dom.d.ts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReadableStream<_R = any> extends NodeJS.ReadableStream {}
}

export interface DependentsMeta {
  downloads: number;
  name: string;
}

export interface DependentsItem extends DependentsMeta {
  targetVersion?: string | undefined,
  pkg?: NormalizedPackageJson | undefined;
}

export interface EcosystemDependentsMeta extends DependentsMeta {
  dependentCount: number | undefined,
  firstRelease: string | undefined,
  latestRelease: string | undefined,
  latestVersion: string | undefined,
  repositoryUrl: string | undefined;
}

export interface EcosystemDependentsItem extends DependentsItem, EcosystemDependentsMeta {}

interface HttpClientOptions {
  logger?: BunyanLite | undefined;
  userAgent?: string | undefined;
}

interface DependentLookupOptions extends HttpClientOptions {
  skipPkg?: boolean | undefined | ((meta: EcosystemDependentsMeta) => boolean);
}

export type EcosystemFilterCallback = (item: import('./interface-types.d.ts').EcosystemDependentsMeta) => boolean;

interface FilteredLookupOptions {
  filter?: EcosystemFilterCallback | undefined;
}

export interface PackageLookupOptions extends DependentLookupOptions, FilteredLookupOptions {
  client?: Got | undefined;
  dependentOn?: string | undefined;
}

export type PackageFetchQueueOptions = Pick<PackageLookupOptions, 'client' | 'logger' | 'userAgent'>;
export type PackageFetchQueueLookupOptions = Omit<PackageLookupOptions, 'client' | 'logger' | 'userAgent'>;

export interface DependentsOptions extends DependentLookupOptions {
  maxPages?: number | undefined;
  skipPkg?: boolean | undefined;
}

export interface EcosystemDependentsOptions extends DependentsOptions, FilteredLookupOptions {
  maxAge?: number | undefined;
  minDownloadsLastMonth?: number | undefined;
  perPage?: number | undefined;
}
