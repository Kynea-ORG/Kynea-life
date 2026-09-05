import React from 'react';

// Regex that finds URLs starting with http://, https://, or www.
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

// Trailing characters that are likely punctuation ending a sentence rather than part of the URL
const TRAILING_PUNCTUATION_RE = /[.,;!?)]+$/;

interface LinkifiedTextProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
}

export default function LinkifiedText({
  text,
  className,
  linkClassName = 'text-primary underline hover:text-primary-dark transition-colors break-words [overflow-wrap:anywhere]',
}: LinkifiedTextProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(/^(https?:\/\/|www\.)/i)) {
          const trailingMatch = part.match(TRAILING_PUNCTUATION_RE);
          let url = part;
          let trailing = '';
          if (trailingMatch) {
            trailing = trailingMatch[0];
            url = part.slice(0, -trailing.length);
          }

          const href = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

          return (
            <React.Fragment key={index}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
              {trailing}
            </React.Fragment>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
