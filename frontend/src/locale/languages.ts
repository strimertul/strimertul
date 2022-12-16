import { ResourceKey } from 'i18next';
import en from './en/translation.json';
import it from './it/translation.json';

function countKeys(res: ResourceKey): number {
  if (typeof res === 'string') {
    return 1;
  }
  return Object.values(res).reduce<number>(
    (acc: number, k: ResourceKey) => acc + countKeys(k),
    0,
  );
}

interface LanguageMeta {
  'language-name': string;
}

export const resources = {
  en: {
    translation: en,
  },
  it: {
    translation: it,
  },
} as const;

export const languages = Object.entries(resources).map(([code, lang]) => ({
  code,
  name: (lang.translation.$meta as LanguageMeta)['language-name'] || code,
  keys: countKeys(lang),
}));

export default resources;
