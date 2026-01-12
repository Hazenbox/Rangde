"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContrastPreviewProps {
  foregroundColor: string;
  backgroundColor: string;
  className?: string;
}

export function ContrastPreview({
  foregroundColor,
  backgroundColor,
  className,
}: ContrastPreviewProps) {
  const [copiedFg, setCopiedFg] = React.useState(false);
  const [copiedBg, setCopiedBg] = React.useState(false);

  const handleCopyFg = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(foregroundColor);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = foregroundColor;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedFg(true);
      setTimeout(() => setCopiedFg(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyBg = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(backgroundColor);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = backgroundColor;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedBg(true);
      setTimeout(() => setCopiedBg(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Visual Preview Container */}
      <div
        className="relative rounded-md border border-primary-foreground/10 p-3 h-16 flex items-center justify-center gap-2"
        style={{ backgroundColor }}
      >
        {/* Circle */}
        <div
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: foregroundColor }}
        />
        
        {/* Heart */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12,21.35 L10.55,20.03 C5.4,15.36 2,12.27 2,8.5 C2,5.41 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.08 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.41 22,8.5 C22,12.27 18.6,15.36 13.45,20.03 L12,21.35 Z"
              fill={foregroundColor}
            />
          </svg>
        </div>
        
        {/* Square */}
        <div
          className="w-5 h-5"
          style={{ backgroundColor: foregroundColor }}
        />
      </div>

      {/* Color Codes */}
      <div className="flex items-center justify-between gap-4 text-[10px]">
        {/* Foreground Color */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded border border-primary-foreground/10 shrink-0"
            style={{ backgroundColor: foregroundColor }}
          />
          <code className="font-mono text-[10px] opacity-90">
            {foregroundColor.toUpperCase()}
          </code>
          <button
            onClick={handleCopyFg}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            {copiedFg ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
          </button>
        </div>

        {/* Background Color */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded border border-primary-foreground/10 shrink-0"
            style={{ backgroundColor }}
          />
          <code className="font-mono text-[10px] opacity-90">
            {backgroundColor.toUpperCase()}
          </code>
          <button
            onClick={handleCopyBg}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            {copiedBg ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
