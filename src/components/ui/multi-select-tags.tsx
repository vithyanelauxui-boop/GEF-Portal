import * as React from "react";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TagOption {
  value: string;
  label: string;
}

interface MultiSelectTagsProps {
  placeholder?: string;
  options: TagOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onCreateNew?: (name: string) => void;
  className?: string;
}

export function MultiSelectTags({
  placeholder = "Select tags...",
  options,
  selectedValues,
  onChange,
  onCreateNew,
  className,
}: MultiSelectTagsProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(search.toLowerCase()) &&
      !selectedValues.includes(option.value)
  );

  const selectedOptions = options.filter((opt) =>
    selectedValues.includes(opt.value)
  );

  const showAddOption =
    search.trim().length > 0 &&
    !options.some((opt) => opt.label.toLowerCase() === search.toLowerCase());

  const handleSelect = (optionValue: string) => {
    if (!selectedValues.includes(optionValue)) {
      onChange([...selectedValues, optionValue]);
    }
    setSearch("");
  };

  const handleRemove = (optionValue: string) => {
    onChange(selectedValues.filter((v) => v !== optionValue));
  };

  const handleCreateNew = () => {
    if (search.trim() && onCreateNew) {
      onCreateNew(search.trim());
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      if (showAddOption && onCreateNew) {
        handleCreateNew();
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      }
    } else if (e.key === "Backspace" && !search && selectedValues.length > 0) {
      handleRemove(selectedValues[selectedValues.length - 1]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              className
            )}
          >
            <span className="text-muted-foreground">{placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search or add new..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))
              ) : !showAddOption ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {selectedValues.length === options.length
                    ? "All tags selected"
                    : "No matching tags"}
                </div>
              ) : null}

              {/* Add New Option */}
              {showAddOption && onCreateNew && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add "{search}"</span>
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Tags - Below Input */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1.5 bg-muted text-foreground px-3 py-1.5 rounded-full text-sm"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => handleRemove(opt.value)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
