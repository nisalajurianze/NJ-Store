const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'h4',
  'li',
  'ol',
  'p',
  'strong',
  'ul'
]);

const BLOCKED_TAGS = new Set([
  'button',
  'embed',
  'form',
  'iframe',
  'img',
  'input',
  'math',
  'object',
  'script',
  'select',
  'style',
  'svg',
  'textarea'
]);

const ALLOWED_ATTRIBUTES: Partial<Record<string, Set<string>>> = {
  a: new Set(['href', 'rel', 'target'])
};

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const isSafeHref = (href: string): boolean => {
  if (!href.trim()) {
    return false;
  }

  if (href.startsWith('#') || href.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(href, 'https://njstore.local');
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};



const sanitizeNode = (parent: ParentNode): void => {
  let child = parent.firstChild;
  
  while (child) {
    const nextNode = child.nextSibling;

    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      child = nextNode;
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child = nextNode;
      continue;
    }

    const element = child as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (BLOCKED_TAGS.has(tagName)) {
      element.remove();
      child = nextNode;
      continue;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      const firstInserted = element.firstChild;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      
      child = firstInserted || nextNode;
      continue;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const allowedForElement = ALLOWED_ATTRIBUTES[tagName];

      if (!allowedForElement?.has(name)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (tagName === 'a') {
      const href = element.getAttribute('href');

      if (!href || !isSafeHref(href)) {
        element.removeAttribute('href');
        element.removeAttribute('rel');
        element.removeAttribute('target');
      } else {
        element.setAttribute('rel', 'noopener noreferrer');
        element.setAttribute('target', '_blank');
      }
    }

    sanitizeNode(element);
    
    child = nextNode;
  }
};

export const sanitizeRichTextHtml = (html: string): string => {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return html;
  }

  const documentFragment = new DOMParser().parseFromString(html, 'text/html');
  sanitizeNode(documentFragment.body);
  return documentFragment.body.innerHTML;
};
