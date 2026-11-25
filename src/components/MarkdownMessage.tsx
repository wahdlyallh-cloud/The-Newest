import React from 'react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
  isAi?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '', isAi = false }) => {
  if (!content) return null;

  // Parse inline tokens: **bold**, *italic*, `code`
  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, *italic*, or `code`
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className={isAi ? "font-black text-[#2B3E50]" : "font-black"}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic opacity-90">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={match.index} className="bg-black/5 px-1 py-0.5 rounded text-[11px] font-mono">
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="font-black text-xs md:text-sm text-[#2B3E50] mt-2 mb-1">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="font-black text-sm text-[#2B3E50] mt-2 mb-1">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="font-black text-base text-[#2B3E50] mt-2.5 mb-1.5">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet items
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <span className="text-[#8B9D83] text-sm leading-tight select-none shrink-0">•</span>
          <div className="flex-1 leading-relaxed">{parseInline(itemText)}</div>
        </div>
      );
      continue;
    }

    // Numbered items
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <span className="font-black text-[11px] text-[#8B9D83] shrink-0 mt-0.5 select-none">{numMatch[1]}.</span>
          <div className="flex-1 leading-relaxed">{parseInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <p key={i} className="leading-relaxed my-0.5">
        {parseInline(trimmed)}
      </p>
    );
  }

  return <div className={`space-y-0.5 text-start ${className}`}>{elements}</div>;
};

export default MarkdownMessage;
