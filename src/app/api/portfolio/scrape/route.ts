import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface ScrapedProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  category?: string;
}

interface ScrapeResult {
  success: boolean;
  projects: ScrapedProject[];
  siteName?: string;
  error?: string;
  debug?: string[];
  method?: string;
}

// Helper function to extract projects from HTML
function extractProjectsFromHtml($: cheerio.CheerioAPI, baseUrl: string, debug: string[]): ScrapedProject[] {
  const projects: ScrapedProject[] = [];

  // Extended list of selectors
  const selectors = [
    // Common portfolio/project selectors
    '.portfolio-item, .project-item, .work-item, .gallery-item',
    '.portfolio__item, .project__item, .work__item, .gallery__item',
    '[class*="portfolio-item"], [class*="project-item"], [class*="work-item"]',
    '[class*="portfolio_item"], [class*="project_item"], [class*="work_item"]',
    
    // Grid and card patterns
    '[class*="project"] [class*="card"], [class*="portfolio"] [class*="card"]',
    '[class*="project"][class*="card"], [class*="portfolio"][class*="card"]',
    '.card[class*="project"], .card[class*="portfolio"], .card[class*="work"]',
    
    // Common CMS patterns
    '.projects .project, .works .work, .portfolio .item',
    '.projects > div, .works > div, .portfolio > div',
    '.projects-grid > *, .works-grid > *, .portfolio-grid > *',
    
    // Section-based patterns
    'section[class*="project"] > div > div',
    'section[class*="portfolio"] > div > div',
    '#projects > div, #portfolio > div, #works > div',
    '#projets > div, #realisations > div',
    
    // Article patterns
    'article[class*="project"], article[class*="portfolio"]',
    
    // Link-based patterns
    'a[class*="project"], a[class*="portfolio"], a[class*="work"]',
    'a[href*="/project"], a[href*="/portfolio"], a[href*="/work"]',
    'a[href*="/projets"], a[href*="/realisations"]',
    
    // Grid children with images
    '.grid > div:has(img), .grid > a:has(img)',
    '[class*="grid"] > div:has(img)',
    
    // Masonry/Isotope layouts
    '.masonry > div, .isotope-item, .packery-item',
    
    // Swiper/Carousel
    '.swiper-slide:has(img)',
    
    // Figure elements
    'figure[class*="project"], .projects figure',
    
    // Any element with project-like data attributes
    '[data-project], [data-portfolio]',
  ];

  for (const selector of selectors) {
    try {
      const items = $(selector);
      if (items.length > 0) {
        debug.push(`Selector "${selector}" found ${items.length} items`);
        
        items.each((index, element) => {
          const $el = $(element);
          
          // Find image
          let imageUrl = '';
          const img = $el.find('img').first();
          if (img.length) {
            imageUrl = img.attr('src') 
              || img.attr('data-src') 
              || img.attr('data-lazy-src') 
              || img.attr('data-original')
              || img.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
              || '';
          }
          
          // Check for background images
          if (!imageUrl) {
            const elementsWithBg = $el.find('[style*="background"]').addBack('[style*="background"]');
            elementsWithBg.each((_, bgEl) => {
              if (imageUrl) return;
              const style = $(bgEl).attr('style') || '';
              const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
              if (bgMatch) imageUrl = bgMatch[1];
            });
          }
          
          // Check data attributes
          if (!imageUrl) {
            imageUrl = $el.attr('data-background') 
              || $el.attr('data-bg') 
              || $el.attr('data-image')
              || $el.find('[data-background], [data-bg], [data-image]').first().attr('data-background')
              || '';
          }

          // Find title
          let title = '';
          const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '.name', '[class*="title"]'];
          for (const titleSel of titleSelectors) {
            if (title) break;
            const titleEl = $el.find(titleSel).first();
            if (titleEl.length) title = titleEl.text().trim();
          }
          if (!title && img.length) title = img.attr('alt') || img.attr('title') || '';
          if (!title) {
            const linkEl = $el.is('a') ? $el : $el.find('a').first();
            title = linkEl.attr('title') || linkEl.attr('aria-label') || '';
          }

          // Find description
          let description = '';
          const descSelectors = ['p', '.description', '.excerpt', '[class*="desc"]'];
          for (const descSel of descSelectors) {
            if (description) break;
            const descEl = $el.find(descSel).first();
            if (descEl.length) {
              const text = descEl.text().trim();
              if (text && text !== title && text.length > 10) {
                description = text.slice(0, 300);
              }
            }
          }

          // Find link
          let link = '';
          const linkEl = $el.is('a') ? $el : $el.find('a').first();
          if (linkEl.length) link = linkEl.attr('href') || '';

          // Find category
          let category = '';
          const catEl = $el.find('.category, [class*="category"], [class*="tag"]').first();
          if (catEl.length) category = catEl.text().trim();

          // Resolve relative URLs
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            imageUrl = imageUrl.startsWith('/') ? baseUrl + imageUrl : baseUrl + '/' + imageUrl;
          }
          if (link && !link.startsWith('http') && !link.startsWith('#') && !link.startsWith('mailto:')) {
            link = link.startsWith('/') ? baseUrl + link : baseUrl + '/' + link;
          }

          // Filter bad URLs
          if (imageUrl && (
            imageUrl.includes('placeholder') || imageUrl.includes('blank.gif') ||
            imageUrl.includes('spacer') || imageUrl.length < 10
          )) {
            imageUrl = '';
          }

          // Add if valid
          const isDuplicate = projects.some(p => 
            (p.imageUrl && p.imageUrl === imageUrl) || 
            (p.title && p.title === title && title.length > 3)
          );
          
          if ((imageUrl || (title && title.length > 2)) && !isDuplicate) {
            projects.push({
              id: `scraped-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: title || `Projet ${projects.length + 1}`,
              description,
              imageUrl,
              link,
              category,
            });
          }
        });

        if (projects.filter(p => p.imageUrl).length >= 3) {
          debug.push(`Found ${projects.length} projects, stopping`);
          break;
        }
      }
    } catch {
      // Continue on selector errors
    }
  }

  // Fallback: find all substantial images
  if (projects.filter(p => p.imageUrl).length < 3) {
    debug.push('Trying image fallback');
    
    $('img').each((index, element) => {
      const $img = $(element);
      const src = $img.attr('src') || $img.attr('data-src') || '';
      const width = parseInt($img.attr('width') || '0');
      const height = parseInt($img.attr('height') || '0');

      if (width > 0 && width < 80) return;
      if (height > 0 && height < 80) return;
      
      const skipPatterns = [
        'pixel', 'tracking', 'logo', 'icon', 'avatar', 'favicon',
        'spinner', 'loader', 'placeholder', 'social', 'button',
        '.svg', '.gif', 'base64', 'gravatar',
      ];
      
      if (skipPatterns.some(p => src.toLowerCase().includes(p))) return;

      let imageUrl = src;
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = imageUrl.startsWith('/') ? baseUrl + imageUrl : baseUrl + '/' + imageUrl;
      }

      if (!imageUrl || projects.some(p => p.imageUrl === imageUrl)) return;

      const parentLink = $img.closest('a');
      const parentArticle = $img.closest('article, section, figure, [class*="project"]');
      
      let title = $img.attr('alt') || '';
      if (!title && parentArticle.length) {
        const titleEl = parentArticle.find('h1, h2, h3, h4, [class*="title"]').first();
        title = titleEl.text().trim() || '';
      }

      let link = parentLink.attr('href') || '';
      if (link && !link.startsWith('http') && !link.startsWith('#')) {
        link = link.startsWith('/') ? baseUrl + link : baseUrl + '/' + link;
      }

      projects.push({
        id: `img-${index}-${Date.now()}`,
        title: title || `Image ${projects.length + 1}`,
        description: '',
        imageUrl,
        link,
      });
    });
  }

  return projects;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResult>> {
  const debug: string[] = [];
  let browser = null;
  
  try {
    const { url, useJavaScript = true } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, projects: [], error: 'URL requise' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ success: false, projects: [], error: 'URL invalide' }, { status: 400 });
    }

    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    let html = '';
    let siteName = '';
    let method = 'static';

    // Try with Puppeteer first for JavaScript rendering
    if (useJavaScript) {
      try {
        debug.push('Launching Puppeteer browser...');
        
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080',
          ],
        });

        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        debug.push(`Navigating to ${url}...`);
        
        // Navigate and wait for content
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Wait a bit more for any lazy-loaded content
        debug.push('Waiting for dynamic content...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Scroll down to trigger lazy loading
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= scrollHeight || totalHeight > 5000) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the rendered HTML
        html = await page.content();
        debug.push(`Got ${html.length} chars of rendered HTML`);
        method = 'puppeteer';

        await browser.close();
        browser = null;

      } catch (puppeteerError) {
        debug.push(`Puppeteer error: ${puppeteerError}`);
        if (browser) {
          await browser.close();
          browser = null;
        }
        // Fall back to static fetch
      }
    }

    // Fallback to static fetch if Puppeteer failed or wasn't used
    if (!html) {
      debug.push('Using static fetch fallback...');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return NextResponse.json({ 
          success: false, 
          projects: [], 
          error: `Impossible de charger la page (${response.status})`,
          debug 
        }, { status: 400 });
      }

      html = await response.text();
      debug.push(`Got ${html.length} chars of static HTML`);
      method = 'static';
    }

    const $ = cheerio.load(html);

    // Get site name
    siteName = $('meta[property="og:site_name"]').attr('content') 
      || $('meta[name="application-name"]').attr('content')
      || $('title').text().split('|')[0].split('-')[0].trim()
      || parsedUrl.hostname;

    debug.push(`Site: ${siteName}`);

    // Extract projects
    const projects = extractProjectsFromHtml($, baseUrl, debug);

    // Also check JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        const items = json['@graph'] || (Array.isArray(json) ? json : [json]);
        
        for (const item of items) {
          if (['CreativeWork', 'ImageObject', 'Product', 'Article'].includes(item['@type'])) {
            const existing = projects.find(p => p.title === item.name);
            if (!existing && (item.image || item.name)) {
              const imgUrl = typeof item.image === 'string' ? item.image : item.image?.url || '';
              if (imgUrl || item.name) {
                projects.push({
                  id: `ld-${projects.length}-${Date.now()}`,
                  title: item.name || item.headline || 'Sans titre',
                  description: item.description || '',
                  imageUrl: imgUrl,
                  link: item.url || '',
                });
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON
      }
    });

    // Remove duplicates
    const uniqueProjects = projects.reduce((acc, project) => {
      if (!project.imageUrl || !acc.some(p => p.imageUrl === project.imageUrl)) {
        acc.push(project);
      }
      return acc;
    }, [] as ScrapedProject[]);

    debug.push(`Final: ${uniqueProjects.length} unique projects (method: ${method})`);

    return NextResponse.json({
      success: true,
      projects: uniqueProjects.slice(0, 50),
      siteName,
      debug,
      method,
    });

  } catch (error) {
    console.error('Scrape error:', error);
    debug.push(`Error: ${error}`);
    
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      projects: [], 
      error: 'Erreur lors du scraping: ' + (error instanceof Error ? error.message : 'Erreur inconnue'),
      debug 
    }, { status: 500 });
  }
}
