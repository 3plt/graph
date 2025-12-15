/**
 * Shared Shiki highlighter for client-side syntax highlighting.
 * Uses a singleton pattern to avoid re-creating the highlighter.
 * 
 * We import language grammars directly to avoid lazy-loading issues
 * with the /graph base path.
 */

import { createHighlighter, type Highlighter } from 'shiki';
import langTypescript from 'shiki/langs/typescript.mjs';
import langTsx from 'shiki/langs/tsx.mjs';
import langVue from 'shiki/langs/vue.mjs';
import langAngular from 'shiki/langs/angular-ts.mjs';
import themeLight from 'shiki/themes/github-light.mjs';
import themeDark from 'shiki/themes/github-dark.mjs';

let highlighterPromise: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [themeLight, themeDark],
      langs: [langTypescript, langTsx, langVue, langAngular],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  // Map 'angular' to 'angular-ts' which is the actual Shiki language name
  const shikiLang = lang === 'angular' ? 'angular-ts' : lang;
  return highlighter.codeToHtml(code, {
    lang: shikiLang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  });
}
