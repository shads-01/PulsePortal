import React from "react";

/**
 * Lightweight Markdown renderer for AI responses.
 * Handles: **bold**, *italic*, ## headings, - bullet lists, numbered lists, \n line breaks.
 * No external dependencies needed.
 */
export default function MarkdownRenderer({ content, className = "" }) {
    if (!content) return null;

    const lines = content.split("\n");
    const elements = [];
    let listBuffer = [];
    let listType = null; // 'ul' or 'ol'

    const flushList = () => {
        if (listBuffer.length > 0) {
            const Tag = listType === "ol" ? "ol" : "ul";
            const listClass = listType === "ol"
                ? "list-decimal pl-5 space-y-1 my-2"
                : "list-disc pl-5 space-y-1 my-2";
            elements.push(
                <Tag key={`list-${elements.length}`} className={listClass}>
                    {listBuffer.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 leading-relaxed">
                            {renderInline(item)}
                        </li>
                    ))}
                </Tag>
            );
            listBuffer = [];
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty line
        if (trimmed === "") {
            flushList();
            continue;
        }

        // Headings: ### h3, ## h2, # h1
        if (trimmed.startsWith("###")) {
            flushList();
            elements.push(
                <h4 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">
                    {renderInline(trimmed.replace(/^###\s*/, ""))}
                </h4>
            );
            continue;
        }
        if (trimmed.startsWith("##")) {
            flushList();
            elements.push(
                <h3 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">
                    {renderInline(trimmed.replace(/^##\s*/, ""))}
                </h3>
            );
            continue;
        }
        if (trimmed.startsWith("# ")) {
            flushList();
            elements.push(
                <h3 key={i} className="text-base font-bold text-slate-800 mt-3 mb-1">
                    {renderInline(trimmed.replace(/^#\s*/, ""))}
                </h3>
            );
            continue;
        }

        // Bullet list: - item, * item, • item
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
        if (bulletMatch) {
            if (listType !== "ul") flushList();
            listType = "ul";
            listBuffer.push(bulletMatch[1]);
            continue;
        }

        // Numbered list: 1. item, 2. item
        const orderedMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
        if (orderedMatch) {
            if (listType !== "ol") flushList();
            listType = "ol";
            listBuffer.push(orderedMatch[1]);
            continue;
        }

        // Regular paragraph
        flushList();
        elements.push(
            <p key={i} className="text-sm text-slate-700 leading-relaxed my-1">
                {renderInline(trimmed)}
            </p>
        );
    }

    flushList();

    return <div className={className}>{elements}</div>;
}

/**
 * Render inline markdown: **bold**, *italic*, `code`
 */
function renderInline(text) {
    if (!text) return text;

    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // **bold**
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // *italic*  (but not **)
        const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
        // `code`
        const codeMatch = remaining.match(/`([^`]+)`/);

        // Find the earliest match
        let earliest = null;
        let earliestIndex = remaining.length;
        let type = null;

        if (boldMatch && boldMatch.index < earliestIndex) {
            earliest = boldMatch;
            earliestIndex = boldMatch.index;
            type = "bold";
        }
        if (codeMatch && codeMatch.index < earliestIndex) {
            earliest = codeMatch;
            earliestIndex = codeMatch.index;
            type = "code";
        }
        // Only match italic if it comes before bold
        if (italicMatch && italicMatch.index < earliestIndex && type !== "bold") {
            earliest = italicMatch;
            earliestIndex = italicMatch.index;
            type = "italic";
        }

        if (!earliest) {
            parts.push(remaining);
            break;
        }

        // Text before the match
        if (earliestIndex > 0) {
            parts.push(remaining.substring(0, earliestIndex));
        }

        // The formatted element
        if (type === "bold") {
            parts.push(
                <strong key={key++} className="font-semibold text-slate-800">
                    {earliest[1]}
                </strong>
            );
        } else if (type === "italic") {
            parts.push(
                <em key={key++} className="italic">
                    {earliest[1]}
                </em>
            );
        } else if (type === "code") {
            parts.push(
                <code key={key++} className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">
                    {earliest[1]}
                </code>
            );
        }

        remaining = remaining.substring(earliestIndex + earliest[0].length);
    }

    return parts;
}
