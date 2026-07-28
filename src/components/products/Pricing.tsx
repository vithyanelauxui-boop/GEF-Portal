import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { BASE_UOM_OPTIONS, BaseUomCode } from "@/contexts/ProductsContext";
import { ChevronDown, ChevronUp, HelpCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ProductFormErrors } from "@/pages/CreateProduct";

type AdditionalPriceType = "costPrice" | "transfer";

interface AdditionalPrice {
  type: AdditionalPriceType;
  label: string;
  value: string;
  currency: string;
}

const ADDITIONAL_PRICE_OPTIONS: { type: AdditionalPriceType; label: string }[] = [
  { type: "costPrice", label: "Cost Price" },
  { type: "transfer", label: "Transfer Price" },
];

const CURRENCY_MAP: Record<string, string> = {
  inr: "INR",
  usd: "USD",
  eur: "EUR",
  gbp: "GBP",
};

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  inr: "₹",
  usd: "$",
  eur: "€",
  gbp: "£",
};

export interface PricingExtras {
  costPrice?: string;
  transferPrice?: string;
}

export interface PricingRef {
  getData: () => PricingExtras;
}

interface PricingProps {
  errors?: ProductFormErrors;
  formData?: {
    actualPrice: string;
    sellingPrice: string;
  };
  updateFormData?: (field: "actualPrice" | "sellingPrice", value: string) => void;
  baseUom?: BaseUomCode;
  initialPricingExtras?: PricingExtras;
}


export const Pricing = forwardRef<PricingRef, PricingProps>(function Pricing({ errors, formData, updateFormData, baseUom, initialPricingExtras }, ref) {
  const [sellingCurrency, setSellingCurrency] = useState("inr");
  const [compareAtCurrency, setCompareAtCurrency] = useState("inr");
  
  const [additionalPrices, setAdditionalPrices] = useState<AdditionalPrice[]>(() => {
    const initial: AdditionalPrice[] = [];
    if (initialPricingExtras?.costPrice) {
      initial.push({ type: "costPrice", label: "Cost Price", value: initialPricingExtras.costPrice, currency: "inr" });
    }
    if (initialPricingExtras?.transferPrice) {
      initial.push({ type: "transfer", label: "Transfer Price", value: initialPricingExtras.transferPrice, currency: "inr" });
    }
    return initial;
  });
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(true);

  useImperativeHandle(ref, () => ({
    getData: () => {
      const cost = additionalPrices.find(p => p.type === "costPrice");
      const transfer = additionalPrices.find(p => p.type === "transfer");
      return {
        costPrice: cost?.value || undefined,
        transferPrice: transfer?.value || undefined,
      };
    },
  }));

  // Hydrate from initialPricingExtras when it arrives async in edit mode
  useEffect(() => {
    if (initialPricingExtras) {
      setAdditionalPrices(prev => {
        if (prev.length > 0) return prev; // already initialized
        const initial: AdditionalPrice[] = [];
        if (initialPricingExtras.costPrice) {
          initial.push({ type: "costPrice", label: "Cost Price", value: initialPricingExtras.costPrice, currency: "inr" });
        }
        if (initialPricingExtras.transferPrice) {
          initial.push({ type: "transfer", label: "Transfer Price", value: initialPricingExtras.transferPrice, currency: "inr" });
        }
        return initial;
      });
    }
  }, [initialPricingExtras]);

  const sellingPrice = formData?.sellingPrice || "";
  const compareAtPrice = formData?.actualPrice || "";

  // Filter: show as button if not added OR added but empty
  const filledAdditionalPrices = additionalPrices.filter((p) => p.value.trim());
  const unfilledAdditionalPrices = additionalPrices.filter((p) => !p.value.trim());

  // Available options = not added at all OR added but unfilled (when collapsed)
  const getAvailableOptions = () => {
    if (isAdditionalOpen) {
      return ADDITIONAL_PRICE_OPTIONS.filter(
        (opt) => !additionalPrices.some((p) => p.type === opt.type)
      );
    } else {
      return ADDITIONAL_PRICE_OPTIONS.filter(
        (opt) => !filledAdditionalPrices.some((p) => p.type === opt.type)
      );
    }
  };

  const handleAddPrice = (type: AdditionalPriceType, label: string) => {
    const existing = additionalPrices.find((p) => p.type === type);
    if (!existing) {
      setAdditionalPrices((prev) => [
        ...prev,
        { type, label, value: "", currency: "inr" },
      ]);
    }
    setIsAdditionalOpen(true);
  };

  const handleUpdatePrice = (type: AdditionalPriceType, value: string) => {
    setAdditionalPrices((prev) =>
      prev.map((p) => (p.type === type ? { ...p, value } : p))
    );
  };

  const handleUpdateCurrency = (type: AdditionalPriceType, currency: string) => {
    setAdditionalPrices((prev) =>
      prev.map((p) => (p.type === type ? { ...p, currency } : p))
    );
  };

  const handleCollapseChange = (open: boolean) => {
    if (!open) {
      setAdditionalPrices((prev) => prev.filter((p) => p.value.trim()));
    }
    setIsAdditionalOpen(open);
  };

  // Parse prices
  const sellingPriceNum = parseFloat(sellingPrice.replace(/,/g, "")) || 0;
  const compareAtPriceNum = parseFloat(compareAtPrice.replace(/,/g, "")) || 0;
  const costPriceEntry = additionalPrices.find((p) => p.type === "costPrice");
  const costPriceNum = costPriceEntry ? (parseFloat(costPriceEntry.value.replace(/,/g, "")) || 0) : 0;
  const hasCostPrice = costPriceEntry && costPriceNum > 0;
  const transferPriceEntry = additionalPrices.find((p) => p.type === "transfer");
  const transferPriceNum = transferPriceEntry ? (parseFloat(transferPriceEntry.value.replace(/,/g, "")) || 0) : 0;
  const hasTransferPrice = transferPriceEntry && transferPriceNum > 0;

  // Discount: Compare At vs Selling (only when both filled and compare > selling)
  const discountAmount = compareAtPriceNum - sellingPriceNum;
  const discountPercent = compareAtPriceNum > 0 ? ((discountAmount / compareAtPriceNum) * 100) : 0;
  const showDiscount = sellingPriceNum > 0 && compareAtPriceNum > 0 && compareAtPriceNum > sellingPriceNum;

  // Margin: Selling - Cost (only when cost price added)
  const marginAmount = sellingPriceNum - costPriceNum;
  const marginPercent = costPriceNum > 0 ? ((marginAmount / costPriceNum) * 100) : 0;
  const showMargin = hasCostPrice && sellingPriceNum > 0;

  // Transfer Margin: Transfer Price - Cost Price
  const transferMarginAmount = transferPriceNum - costPriceNum;
  const transferMarginPercent = costPriceNum > 0 ? ((transferMarginAmount / costPriceNum) * 100) : 0;
  const showTransferMargin = hasCostPrice && hasTransferPrice;

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  const showAdditionalSection = additionalPrices.length > 0;

  return (
    <div className="form-section animate-fade-in">
      <div className="flex items-center gap-2 mb-0">
        <h2 className="form-section-title">Pricing</h2>
        {baseUom && (
          <span className="text-xs text-muted-foreground font-normal -mt-1">
            (per {BASE_UOM_OPTIONS.find(u => u.code === baseUom)?.name ?? baseUom})
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Main Price Inputs: Selling Price first, then Compare At */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div data-field="sellingPrice">
            <label className="form-label flex items-center gap-1">
              Selling Price<span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The price at which you sell this product</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="flex items-center">
              <Select value={sellingCurrency} onValueChange={setSellingCurrency}>
                <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="0"
                value={sellingPrice}
                onChange={(e) => updateFormData?.("sellingPrice", e.target.value)}
                className={`flex-1 h-10 rounded-l-none ${errors?.sellingPrice ? 'border-destructive' : ''}`}
              />
            </div>
            {errors?.sellingPrice && (
              <p className="text-xs text-destructive mt-1">{errors.sellingPrice}</p>
            )}
          </div>

          <div data-field="actualPrice">
            <label className="form-label flex items-center gap-1">
              Full Price<span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The original/MRP price of the product</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="flex items-center">
              <Select value={compareAtCurrency} onValueChange={setCompareAtCurrency}>
                <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="0"
                value={compareAtPrice}
                onChange={(e) => updateFormData?.("actualPrice", e.target.value)}
                className={`flex-1 h-10 rounded-l-none ${errors?.actualPrice ? 'border-destructive' : ''}`}
              />
            </div>
            {errors?.actualPrice && (
              <p className="text-xs text-destructive mt-1">{errors.actualPrice}</p>
            )}
          </div>
        </div>

        {/* Compact Discount & Margin banners */}
        {(showDiscount || showMargin) && (
          <div className="flex flex-wrap gap-2">
            {showDiscount && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                Discount: -₹{formatCurrency(Math.abs(discountAmount))} (-{discountPercent.toFixed(1)}%)
              </span>
            )}
            {showMargin && (
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                marginAmount >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                Margin: {marginAmount >= 0 ? "₹" : "-₹"}{formatCurrency(Math.abs(marginAmount))} ({marginAmount >= 0 ? "+" : ""}{marginPercent.toFixed(1)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Additional Pricing Details Section */}
      {showAdditionalSection ? (
        <Collapsible open={isAdditionalOpen} onOpenChange={handleCollapseChange}>
          <div className="-mx-5 px-5 border-t border-border mt-6 pt-5">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="text-sm font-semibold text-foreground">
                Additional Pricing Details
              </h3>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isAdditionalOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-5">
              <div className={cn(
                "grid gap-5",
                additionalPrices.length > 1 ? "grid-cols-2" : "grid-cols-1"
              )}>
                {additionalPrices.map((price) => (
                  <div key={price.type}>
                    <label className="form-label flex items-center gap-1">
                      {price.label}<span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{price.label} for this product</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <div className="flex items-center">
                      <Select
                        value={price.currency}
                        onValueChange={(val) => handleUpdateCurrency(price.type, val)}
                      >
                        <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inr">INR</SelectItem>
                          <SelectItem value="usd">USD</SelectItem>
                          <SelectItem value="eur">EUR</SelectItem>
                          <SelectItem value="gbp">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="0"
                        value={price.value}
                        onChange={(e) => handleUpdatePrice(price.type, e.target.value)}
                        className="flex-1 h-10 rounded-l-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {showTransferMargin && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                    transferMarginAmount >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    Transfer Margin: {transferMarginAmount >= 0 ? "₹" : "-₹"}{formatCurrency(Math.abs(transferMarginAmount))} ({transferMarginAmount >= 0 ? "+" : ""}{transferMarginPercent.toFixed(1)}%)
                  </span>
                </div>
              )}
              {/* Add buttons inside expanded view */}
              {getAvailableOptions().length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-5">
                  {getAvailableOptions().map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleAddPrice(opt.type, opt.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleContent>

            {/* Collapsed: show filled chips + remaining add pills */}
            {!isAdditionalOpen && (
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {filledAdditionalPrices.map((price) => (
                  <span
                    key={price.type}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-foreground bg-muted rounded-full"
                  >
                    {price.label}: {CURRENCY_MAP[price.currency] || price.currency.toUpperCase()} {price.value}
                  </span>
                ))}
                {getAvailableOptions().map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => { handleAddPrice(opt.type, opt.label); handleCollapseChange(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Collapsible>
      ) : (
        /* No additional prices yet — show add pills */
        <div className="flex items-center gap-2 flex-wrap mt-6">
          {ADDITIONAL_PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => { handleAddPrice(opt.type, opt.label); setIsAdditionalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
