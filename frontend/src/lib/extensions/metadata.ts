// ==Extension==
// @name        ${slug}
// @version     1.0
// @author      Put your name here!
// @description A new extension for strimertul
// ==/Extension==

interface ExtensionMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
}

export function parseExtensionMetadata(
  source: string,
): ExtensionMetadata | null {
  // Find metadata block
  const start = source.indexOf('// ==Extension==');
  const end = source.indexOf('// ==/Extension==', start);
  if (start < 0 || end < 0) {
    // No block, return null
    return null;
  }

  // Extract metadata
  const metadata = Object.fromEntries(
    source
      .substring(start, end)
      .trim()
      .split('\n')
      .map((line) => line.trim().match(/^\s*\/\/\s*@([^\s]+)\s+(.+)/))
      .filter((matches) => matches && matches.length > 2)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([_, key, value]) => [key, value]),
  );

  return {
    name: metadata.name,
    version: metadata.version,
    author: metadata.author,
    description: metadata.description,
  };
}

export default { parseExtensionMetadata };
