"use client";

import * as React from "react";
import { Search, ChevronLeft } from "lucide-react";
import { useCollectionsStore } from "@/store/collections-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarHeader, SidebarContent, SidebarSearch, SidebarFooter } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

interface CollectionTreeSidebarProps {
  onBack?: () => void;
  className?: string;
}

export function CollectionTreeSidebar({ onBack, className }: CollectionTreeSidebarProps) {
  const { collectionNodes, selectedNodeId, setSelectedNode } = useCollectionsStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCollections = React.useMemo(() => {
    if (!searchQuery.trim()) return collectionNodes;
    const query = searchQuery.toLowerCase();
    return collectionNodes.filter(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.icon?.toLowerCase().includes(query)
    );
  }, [collectionNodes, searchQuery]);

  return (
    <Sidebar width="standard" className={className}>
      <SidebarHeader title="Collections" />
      
      {onBack && (
        <div className={cn(DESIGN_TOKENS.sidebar.content.paddingHorizontal, "pt-2")}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-[11px] px-2"
            onClick={onBack}
          >
            <ChevronLeft className="h-3 w-3 mr-1.5" />
            Back to Surfaces
          </Button>
        </div>
      )}
      
      <SidebarSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search..."
      />
      
      <div className={cn(DESIGN_TOKENS.sidebar.content.paddingHorizontal, "pb-2")}>
        <div className="text-[9px] text-muted-foreground px-1">
          {collectionNodes.length} {collectionNodes.length === 1 ? 'collection' : 'collections'}
        </div>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        <div className={cn(DESIGN_TOKENS.sidebar.content.paddingHorizontal, "py-1", "space-y-0.5")}>
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8 px-2">
              <div className="text-[10px] text-muted-foreground">
                {searchQuery ? `No collections found for "${searchQuery}"` : 'No collections yet'}
              </div>
            </div>
          ) : (
            filteredCollections.map((collection) => (
              <button
                key={collection.id}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                  selectedNodeId === collection.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setSelectedNode(collection.id)}
              >
                {collection.icon && (
                  <span className="text-sm flex-shrink-0">{collection.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{collection.name}</div>
                  <div className="text-[9px] opacity-70">
                    {collection.modes.length}m · {collection.variables.length}v
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <SidebarFooter>
        <p className="text-[9px] text-muted-foreground text-center">
          Click to select collection
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
