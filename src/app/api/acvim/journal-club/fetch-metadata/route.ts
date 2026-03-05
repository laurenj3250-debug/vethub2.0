import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const fetchSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

// Extract PMID from PubMed URLs
function extractPMID(url: string): string | null {
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
  return match ? match[1] : null;
}

// Extract DOI from URLs (doi.org links or embedded DOIs)
function extractDOI(url: string): string | null {
  // Direct doi.org URL
  const doiOrgMatch = url.match(/doi\.org\/(10\.\d{4,9}\/[^\s?#]+)/);
  if (doiOrgMatch) return doiOrgMatch[1];

  // DOI embedded in other URLs
  const embeddedMatch = url.match(/(10\.\d{4,9}\/[^\s?#]+)/);
  if (embeddedMatch) return embeddedMatch[1];

  return null;
}

// Fetch from PubMed NCBI E-utilities
async function fetchFromPubMed(pmid: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.result?.[pmid];
    if (!result?.title) return null;

    return { title: result.title };
  } catch {
    return null;
  }
}

// Fetch from CrossRef API
async function fetchFromCrossRef(doi: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=vethub@example.com`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const work = data?.message;
    if (!work?.title?.[0]) return null;

    return { title: work.title[0] };
  } catch {
    return null;
  }
}

// POST - Fetch article title from URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = fetchSchema.parse(body);

    // Strategy 1: PubMed URL → NCBI
    const pmid = extractPMID(url);
    if (pmid) {
      const result = await fetchFromPubMed(pmid);
      if (result) {
        return NextResponse.json({ ...result, source: 'pubmed', pmid });
      }
    }

    // Strategy 2: Extract DOI → CrossRef
    const doi = extractDOI(url);
    if (doi) {
      const result = await fetchFromCrossRef(doi);
      if (result) {
        return NextResponse.json({ ...result, source: 'crossref', doi });
      }
    }

    // Strategy 3: If PubMed URL but esummary failed, try efetch
    if (pmid) {
      try {
        const res = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const xml = await res.text();
          const titleMatch = xml.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/);
          if (titleMatch) {
            return NextResponse.json({ title: titleMatch[1], source: 'pubmed-efetch', pmid });
          }
        }
      } catch {
        // Fall through
      }
    }

    return NextResponse.json(
      { error: 'Could not extract article metadata from this URL. Try a PubMed or DOI link.' },
      { status: 422 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Please enter a valid URL', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error fetching article metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article metadata' },
      { status: 500 }
    );
  }
}
