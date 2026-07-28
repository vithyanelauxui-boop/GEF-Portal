import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProducts } from "@/contexts/ProductsContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChannelVariantsPageProps {
  channelName: string;
  channelSlug: string;
}

interface ChannelVariantGroup {
  id: string;
  name: string;
  values: string[];
  displayName: string;
  showOnPLP: boolean;
}

function VariantGroupCard({
  group,
  onTogglePLP,
  onUpdateDisplayName,
}: {
  group: ChannelVariantGroup;
  onTogglePLP: () => void;
  onUpdateDisplayName: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editValue, setEditValue] = useState(group.displayName);

  return (
    <div className="bg-card border border-border rounded-xl transition-shadow">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{group.name}</p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
            expanded && "rotate-180"
          )}
        />
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          <span className="text-base font-semibold text-foreground">Edit Configurations</span>

          {/* Original Name (read-only) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
            <Input
              value={group.name}
              disabled
              className="h-9 text-sm bg-muted"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-medium text-primary mb-1.5 block">Display Name</label>
            <Input
              value={editValue}
              onChange={(e) => { setEditValue(e.target.value); onUpdateDisplayName(e.target.value); }}
              className="h-9 text-sm"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* PLP toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-primary">
                Allow this variant to appear on the PLP
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Show this variant type as a filter on the Product Listing Page</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              checked={group.showOnPLP}
              onCheckedChange={onTogglePLP}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChannelVariantsPage({ channelName, channelSlug }: ChannelVariantsPageProps) {
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  // Extract unique variant groups (types) across all products
  const initialGroups = useMemo(() => {
    const groupMap = new Map<string, Set<string>>();

    for (const product of products) {
      if (!product.hasVariants || !product.variants) continue;
      const v = product.variants as any;
      if (!v.savedVariants) continue;

      const groups = v.savedVariants as Array<{
        id: string;
        name: string;
        values: Array<{ id: string; label: string }>;
      }>;

      for (const group of groups) {
        if (!groupMap.has(group.name)) {
          groupMap.set(group.name, new Set());
        }
        const existing = groupMap.get(group.name)!;
        for (const val of group.values) {
          existing.add(val.label);
        }
      }
    }

    const result: ChannelVariantGroup[] = [];
    groupMap.forEach((values, name) => {
      result.push({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        values: Array.from(values),
        displayName: name,
        showOnPLP: false,
      });
    });
    return result;
  }, [products]);

  const [groups, setGroups] = useState<ChannelVariantGroup[]>(initialGroups);
  const [isDirty, setIsDirty] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.values.some((v) => v.toLowerCase().includes(q))
    );
  }, [groups, search]);

  const togglePLP = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, showOnPLP: !g.showOnPLP } : g))
    );
    setIsDirty(true);
  };

  const updateDisplayName = (id: string, name: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, displayName: name } : g))
    );
    setIsDirty(true);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Variants</h1>
          <Button
            disabled={!isDirty}
            onClick={() => {
              setIsDirty(false);
              toast({ title: "Changes saved" });
            }}
          >
            Save
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search variant type, value…"
            className="pl-10 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No variants found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((group) => (
              <VariantGroupCard
                key={group.id}
                group={group}
                onTogglePLP={() => togglePLP(group.id)}
                onUpdateDisplayName={(name) => updateDisplayName(group.id, name)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
