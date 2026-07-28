import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import overrideIcon from "@/assets/override-icon.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock tax rules data
const TAX_RULES = {
  rule1: {
    name: "Rule 1",
    description: "Shipping Fees-Postal (Export From India)",
    taxName: "GST",
    slabs: [
      { range: "Upto 1000", rate: "10%" },
      { range: "Above 1000", rate: "20%" },
    ],
  },
  rule2: {
    name: "Rule 2",
    description: "Electronics & Appliances (Domestic)",
    taxName: "GST",
    slabs: [
      { range: "Upto 5000", rate: "12%" },
      { range: "Above 5000", rate: "18%" },
    ],
  },
  rule3: {
    name: "Rule 3",
    description: "Luxury Goods (Import)",
    taxName: "GST",
    slabs: [
      { range: "Upto 10000", rate: "18%" },
      { range: "Above 10000", rate: "28%" },
    ],
  },
};

export interface CustomsTaxData {
  countryOfOrigin: string;
  hsnCode: string;
  taxRule: string;
}

export interface CustomsAndTaxRef {
  getData: () => CustomsTaxData;
}

interface CustomsAndTaxProps {
  initialData?: CustomsTaxData;
  hideCountryOfOrigin?: boolean;
}

export const CustomsAndTax = forwardRef<CustomsAndTaxRef, CustomsAndTaxProps>(
  function CustomsAndTax({ initialData, hideCountryOfOrigin = false }, ref) {
    const [countryOfOrigin, setCountryOfOrigin] = useState<string>(initialData?.countryOfOrigin || "india");
    const [selectedHSN, setSelectedHSN] = useState<string>(initialData?.hsnCode || "");
    const [selectedRule, setSelectedRule] = useState<string>(initialData?.taxRule || "");

    // Load initial data when it changes (edit mode)
    useEffect(() => {
      if (initialData) {
        setCountryOfOrigin(initialData.countryOfOrigin || "india");
        setSelectedHSN(initialData.hsnCode || "");
        setSelectedRule(initialData.taxRule || "");
      }
    }, [initialData]);

    // Expose getData method to parent
    useImperativeHandle(ref, () => ({
      getData: () => ({
        countryOfOrigin,
        hsnCode: selectedHSN,
        taxRule: selectedRule,
      }),
    }));

    const taxRuleData = selectedRule ? TAX_RULES[selectedRule as keyof typeof TAX_RULES] : null;

    return (
      <div className="form-section animate-fade-in">
        {!hideCountryOfOrigin && (
          <>
            <h2 className="form-section-title">Customs Information</h2>
            <div className="space-y-5">
              <div>
                <label className="form-label">Country of Origin</label>
                <Select value={countryOfOrigin} onValueChange={setCountryOfOrigin}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="india">India</SelectItem>
                    <SelectItem value="usa">United States</SelectItem>
                    <SelectItem value="china">China</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="germany">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <div className={hideCountryOfOrigin ? "" : "space-y-5"}>
          <div className={hideCountryOfOrigin ? "" : "pt-4 border-t border-border"}>
            <h3 className="text-base font-semibold text-foreground mb-4">Tax</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Select HSN/HS Code</label>
                <Select value={selectedHSN} onValueChange={setSelectedHSN}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="E.g: 42034000" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="42034000">42034000</SelectItem>
                    <SelectItem value="61099000">61099000</SelectItem>
                    <SelectItem value="85171200">85171200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="form-label">Select Tax Rule</label>
                <Select value={selectedRule} onValueChange={setSelectedRule}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="E.g: Rule 1" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rule1">Rule 1</SelectItem>
                    <SelectItem value="rule2">Rule 2</SelectItem>
                    <SelectItem value="rule3">Rule 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tax Rule Brief */}
            {taxRuleData && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      {taxRuleData.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {taxRuleData.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <img src={overrideIcon} alt="" className="w-4 h-4" /> 1 Region Override(s)
                    </span>
                    <span className="hidden sm:inline text-muted-foreground/30">|</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <img src={overrideIcon} alt="" className="w-4 h-4" /> 1 Store Override(s)
                    </span>
                    <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                      Default
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border mt-4 pt-4">
                  {/* Tax Slabs Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {taxRuleData.taxName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Slab(s)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {taxRuleData.slabs.map((slab, index) => (
                          <div key={index} className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground min-w-[120px]">
                              {index === 0 ? `0 to ₹${slab.range.replace(/[^0-9]/g, '')}` : `₹${slab.range.replace(/[^0-9]/g, '')} & Above`}
                            </span>
                            <span className="font-semibold text-foreground">
                              {slab.rate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="text-sm font-medium text-primary hover:underline">
                      View Tax Details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
