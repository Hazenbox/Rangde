"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScaleResult, getReadableTextColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { colord } from "colord";
import { ContrastPreview } from "@/components/contrast-preview";

interface ColorSwatchProps {
  scale: ScaleResult;
  label: string;
  showStep?: boolean;
  compact?: boolean;
  showDots?: boolean;
  surfaceColor?: string;
}

export function ColorSwatch({ scale, label, showStep = false, compact = false, showDots = true, surfaceColor }: ColorSwatchProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      // Use clipboard API if available (HTTPS), otherwise fallback to execCommand
      if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(scale.hex);
      } else {
        // Fallback for HTTP contexts
        const textArea = document.createElement("textarea");
        textArea.value = scale.hex;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Get background color for the swatch
  const bgColor = scale.hex.startsWith("rgba") 
    ? scale.hex 
    : scale.hex;

  // Get both hex and rgba representations
  const getColorFormats = () => {
    if (scale.hex.startsWith("rgba") || scale.hex.startsWith("rgb")) {
      // Already in rgba/rgb format, extract both
      const rgbaMatch = scale.hex.match(/rgba?\(([^)]+)\)/);
      if (rgbaMatch) {
        const values = rgbaMatch[1].split(',').map(v => v.trim());
        let r = parseFloat(values[0]);
        let g = parseFloat(values[1]);
        let b = parseFloat(values[2]);
        
        // Check if values are in 0-1 range (need to multiply by 255) or 0-255 range
        if (r <= 1 && g <= 1 && b <= 1) {
          r = Math.round(r * 255);
          g = Math.round(g * 255);
          b = Math.round(b * 255);
        } else {
          r = Math.round(r);
          g = Math.round(g);
          b = Math.round(b);
        }
        
        const a = values[3] ? parseFloat(values[3]) : 1;
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        
        // Format rgba with proper precision
        const rgbaFormatted = a < 1 
          ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
          : `rgb(${r}, ${g}, ${b})`;
        
        return { hex, rgba: rgbaFormatted };
      }
    }
    
    // Convert hex to rgba
    const color = colord(scale.hex);
    const rgb = color.toRgb();
    const alpha = scale.alpha !== undefined ? scale.alpha : rgb.a ?? 1;
    const rgba = alpha < 1 
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`
      : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    return { hex: scale.hex.toUpperCase(), rgba };
  };

  const { hex: displayHexValue, rgba: displayRgbaValue } = getColorFormats();

  // Determine text color for readability
  const textColor = scale.hex.startsWith("rgba")
    ? "#000000"
    : getReadableTextColor(scale.hex);

  // Check if all AA contrast checks pass
  const passesAllAA = scale.wcag.normalText.aa && scale.wcag.largeText.aa && scale.wcag.graphics.aa;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "rounded-md overflow-hidden",
            compact ? "h-7" : "h-12"
          )}
          style={{ backgroundColor: surfaceColor }}
        >
          <button
            onClick={handleCopy}
            className={cn(
              "group relative flex w-full h-full items-center justify-center border transition-all hover:scale-[1.02] cursor-pointer rounded-md",
            )}
            style={{ backgroundColor: bgColor }}
          >
            {/* AA Status Indicator - Grid view only (top-right) */}
            {!compact && showDots && (
              <span
                className={cn(
                  "absolute top-1 right-1 h-1 w-1 rounded-full",
                  passesAllAA ? "bg-green-500" : "bg-red-500"
                )}
              />
            )}
            {copied ? (
              <Check className={cn(compact ? "h-2 w-2" : "h-2.5 w-2.5")} style={{ color: textColor }} />
            ) : (
              <Copy
                className={cn(
                  "opacity-0 transition-opacity group-hover:opacity-50",
                  compact ? "h-2 w-2" : "h-2.5 w-2.5"
                )}
                style={{ color: textColor }}
              />
            )}
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-64">
        <div className="space-y-2.5 text-xs text-primary-foreground">
          {/* Contrast Preview */}
          <ContrastPreview
            foregroundColor={scale.blendedHex || scale.hex}
            backgroundColor={surfaceColor || '#ffffff'}
          />
          
          <div className="font-medium">{label}</div>
          
          <div className="space-y-1">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">Hex</span>
                <code className="font-mono text-xs">{displayHexValue}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">RGBA</span>
                <code className="font-mono text-xs">{displayRgbaValue}</code>
              </div>
            </div>
            
            {scale.alpha !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">Alpha</span>
                <span>{Math.round(scale.alpha * 100)}%</span>
              </div>
            )}
            
            {showStep && scale.sourceStep && (
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">Step</span>
                <span>{scale.sourceStep}</span>
              </div>
            )}
          </div>
          
          {/* WCAG Contrast Check Section */}
          <div className="border-t border-primary-foreground/20 pt-2.5 space-y-1.5">
            {/* Contrast Ratio */}
            <div className="flex items-center justify-between">
              <span className="opacity-70">Contrast</span>
              <span className="font-mono">{scale.contrastRatio.toFixed(2)} : 1</span>
            </div>
            
            {/* Normal Text */}
            <div className="flex items-center justify-between">
              <span className="opacity-70">Normal Text</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    scale.wcag.normalText.aa ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  )}
                >
                  AA
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    scale.wcag.normalText.aaa ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  )}
                >
                  AAA
                </span>
              </div>
            </div>
            
            {/* Large Text */}
            <div className="flex items-center justify-between">
              <span className="opacity-70">Large Text</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    scale.wcag.largeText.aa ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  )}
                >
                  AA
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    scale.wcag.largeText.aaa ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  )}
                >
                  AAA
                </span>
              </div>
            </div>
            
            {/* Graphics */}
            <div className="flex items-center justify-between">
              <span className="opacity-70">Graphics</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    scale.wcag.graphics.aa ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  )}
                >
                  AA
                </span>
              </div>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
