import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(process.cwd(), '..');

describe('production deployment policy', () => {
  it('leaves production publishing to the Vercel Git integration', () => {
    const workflowDirectory = resolve(repositoryRoot, '.github', 'workflows');
    const workflowSources = readdirSync(workflowDirectory)
      .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
      .map((fileName) => readFileSync(resolve(workflowDirectory, fileName), 'utf8'));

    const cliProductionDeploys = workflowSources.flatMap((source) =>
      source.match(/vercel\s+deploy[^\r\n]*--prod/g) ?? [],
    );

    expect(cliProductionDeploys).toEqual([]);
  });

  it('does not make missing asset responses immutable in browsers', () => {
    const vercelConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as {
      headers?: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };

    const assetCachePolicies = (vercelConfig.headers ?? [])
      .filter((rule) => rule.source.includes('assets'))
      .flatMap((rule) => rule.headers)
      .filter((header) => header.key.toLowerCase() === 'cache-control')
      .map((header) => header.value.toLowerCase());

    expect(assetCachePolicies).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/immutable|max-age=31536000/)]),
    );
  });
});
