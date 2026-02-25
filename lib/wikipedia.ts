import type { WikipediaResult } from './types';

const WIKIPEDIA_API_URL = 'https://ru.wikipedia.org/w/api.php';
const WIKIPEDIA_EN_API_URL = 'https://en.wikipedia.org/w/api.php';

export async function searchWikipedia(
  query: string
): Promise<WikipediaResult | null> {
  const result = await searchWikipediaByLang(query, WIKIPEDIA_API_URL, 'ru');
  if (result) return result;

  return searchWikipediaByLang(query, WIKIPEDIA_EN_API_URL, 'en');
}

async function searchWikipediaByLang(
  query: string,
  apiUrl: string,
  lang: string
): Promise<WikipediaResult | null> {
  try {
    const searchUrl = new URL(apiUrl);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', '1');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    const results = searchData?.query?.search;

    if (!results || results.length === 0) return null;

    const pageTitle = results[0].title;

    const extractUrl = new URL(apiUrl);
    extractUrl.searchParams.set('action', 'query');
    extractUrl.searchParams.set('titles', pageTitle);
    extractUrl.searchParams.set('prop', 'extracts');
    extractUrl.searchParams.set('exintro', '1');
    extractUrl.searchParams.set('explaintext', '1');
    extractUrl.searchParams.set('exsentences', '3');
    extractUrl.searchParams.set('format', 'json');
    extractUrl.searchParams.set('origin', '*');

    const extractResponse = await fetch(extractUrl.toString());
    if (!extractResponse.ok) return null;

    const extractData = await extractResponse.json();
    const pages = extractData?.query?.pages;

    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;

    const page = pages[pageId];

    return {
      title: page.title,
      description: page.extract || '',
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    };
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return null;
  }
}
