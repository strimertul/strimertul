import decodeVLQ from '../../vendor/vlq/decode';

interface SourceMap {
  file: string;
  version: 3;
  sources: string[];
  names: string[];
  mappings: string;
  sourceRoot: string;
}

export type SourceMapMappings = [number, number, number, number][][];

export function parseSourceMap(sourceMapText: string): SourceMapMappings {
  const sourceMap = JSON.parse(sourceMapText) as SourceMap;
  return sourceMap.mappings
    .split(';')
    .map((m) => m.split(','))
    .map((line) => line.map(decodeVLQ));
}

export function mapError(error: Error, mappings: SourceMapMappings) {
  /* TODO */
}
