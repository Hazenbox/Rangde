"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

// Base Sidebar Container
interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  width?: "standard" | "chat" | string;
  withBorder?: boolean;
}

export function Sidebar({ children, className, width = "standard", withBorder = false }: SidebarProps) {
  const widthClass = width === "standard" 
    ? DESIGN_TOKENS.sidebar.width.standard 
    : width === "chat" 
    ? DESIGN_TOKENS.sidebar.width.chat 
    : width;

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        DESIGN_TOKENS.sidebar.background,
        "relative z-10",
        widthClass,
        withBorder && DESIGN_TOKENS.sidebar.border,
        className
      )}
    >
      {children}
    </div>
  );
}

// Sidebar Header
interface SidebarHeaderProps {
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ title, actions, className }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        DESIGN_TOKENS.sidebar.header.padding,
        DESIGN_TOKENS.sidebar.header.height,
        className
      )}
    >
      <h2
        className={cn(
          DESIGN_TOKENS.sidebar.header.titleSize,
          DESIGN_TOKENS.sidebar.header.titleWeight
        )}
      >
        {title}
      </h2>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

// Sidebar Content - Scrollable area
interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SidebarContent({ children, className, noPadding = false }: SidebarContentProps) {
  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className={cn(!noPadding && DESIGN_TOKENS.sidebar.content.scrollPadding)}>
        {children}
      </div>
    </ScrollArea>
  );
}

// Sidebar Search
interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SidebarSearch({ value, onChange, placeholder = "Search...", className }: SidebarSearchProps) {
  return (
    <div className={cn(DESIGN_TOKENS.sidebar.search.padding, className)}>
      <div className="relative">
        <Search
          className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
            DESIGN_TOKENS.sidebar.search.iconSize
          )}
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            DESIGN_TOKENS.sidebar.search.inputHeight,
            "pl-8",
            DESIGN_TOKENS.sidebar.search.inputTextSize,
            "bg-background/50"
          )}
        />
      </div>
    </div>
  );
}

// Sidebar Section - For grouping content
interface SidebarSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  spacing?: "default" | "tight" | "none";
}

export function SidebarSection({ children, className, title, spacing = "default" }: SidebarSectionProps) {
  const spacingClass = spacing === "default" 
    ? DESIGN_TOKENS.sidebar.content.sectionPaddingVertical
    : spacing === "tight"
    ? "py-1"
    : "";

  return (
    <div className={cn(DESIGN_TOKENS.sidebar.content.paddingHorizontal, spacingClass, className)}>
      {title && (
        <h3 className={cn(DESIGN_TOKENS.typography.label, "font-medium text-muted-foreground mb-2")}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// Sidebar Action Button - Standardized icon button for sidebar headers
interface SidebarActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  className?: string;
}

export function SidebarActionButton({ icon, onClick, tooltip, className }: SidebarActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        DESIGN_TOKENS.sidebar.button.size,
        DESIGN_TOKENS.sidebar.button.shape,
        className
      )}
      onClick={onClick}
      title={tooltip}
    >
      {icon}
    </Button>
  );
}

// Sidebar Tabs - Custom tab implementation for sidebars
interface SidebarTabsProps {
  tabs: Array<{
    id: string;
    label: string;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function SidebarTabs({ tabs, activeTab, onTabChange, className }: SidebarTabsProps) {
  return (
    <div className={cn(DESIGN_TOKENS.sidebar.content.paddingHorizontal, "py-2", className)}>
      <div className={cn("flex", DESIGN_TOKENS.spacing.itemGap)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Sidebar Footer - Optional footer section
interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div
      className={cn(
        "border-t",
        DESIGN_TOKENS.sidebar.content.paddingHorizontal,
        "py-2",
        "bg-muted/20",
        className
      )}
    >
      {children}
    </div>
  );
}

// Sidebar Nav Item - For navigation items in sidebars (matches palette item styling)
interface SidebarNavItemProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function SidebarNavItem({ label, isActive, onClick, className }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 items-center justify-between rounded-lg pl-3 pr-1 text-sm transition-colors cursor-pointer w-full",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50",
        className
      )}
    >
      <span className="flex-1 truncate text-left">{label}</span>
    </button>
  );
}
