import * as React from "react";
import { Plus, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  logo?: string;
}

interface CreatableSelectProps {
  placeholder?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onCreateNew?: (name: string) => void;
  createLabel?: string;
  className?: string;
}

export function CreatableSelect({
  placeholder = "Select...",
  options,
  value,
  onChange,
  onCreateNew,
  createLabel = "Add",
  className,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Show quick add when search has no matching results
  const showQuickAdd = search.trim().length > 0 && filteredOptions.length === 0;
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setOpen(false);
    setSearch("");
  };

  // Directly create the category/item without showing modal
  const handleQuickCreate = () => {
    if (search.trim()) {
      onCreateNew?.(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreating(true);
    setNewItemName("");
  };

  const handleCreateConfirm = () => {
    if (newItemName.trim()) {
      onCreateNew?.(newItemName.trim());
      setIsCreating(false);
      setNewItemName("");
      setSearch("");
      setOpen(false);
    }
  };

  const handleCloseCreate = () => {
    setIsCreating(false);
    setNewItemName("");
  };

  // Extract the item type name (e.g., "Category" from "Add Category")
  const itemTypeName = createLabel.replace("Add ", "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("flex items-center gap-2", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.logo && (
              <div className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                <img src={selectedOption.logo} alt={selectedOption.label} className="w-4 h-4 object-contain" />
              </div>
            )}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 opacity-50" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {!isCreating ? (
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-[200px] overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3",
                      value === option.value && "bg-muted font-medium"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.logo && (
                      <div className="w-8 h-8 rounded-md border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                        <img src={option.logo} alt={option.label} className="w-5 h-5 object-contain" />
                      </div>
                    )}
                    <span>{option.label}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No results found
                </div>
              )}
            </div>

            {/* Bottom CTA - changes based on search state */}
            <div className="border-t border-border p-2">
              {showQuickAdd ? (
                // When searching with no results: show "Add Category 'searchTerm'" - clicks directly create
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary rounded-md"
                  onClick={handleQuickCreate}
                >
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>Add {itemTypeName} "{search}"</span>
                </button>
              ) : (
                // Default: show "Add New Category" - opens modal for manual entry
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary rounded-md"
                  onClick={handleOpenCreateModal}
                >
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>Add New {itemTypeName}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Create New Form */
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">Close</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {itemTypeName} Name
                </label>
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Enter ${itemTypeName.toLowerCase()} name`}
                  className="h-10"
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleCreateConfirm}
                  disabled={!newItemName.trim()}
                  className="bg-primary/80 hover:bg-primary"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
