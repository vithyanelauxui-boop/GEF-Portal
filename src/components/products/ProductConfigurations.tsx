import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { CalendarIcon, HelpCircle, Globe } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
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
import { MultiSelectTags } from "@/components/ui/multi-select-tags";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Default tag options
const DEFAULT_TAGS = [
  { value: "new", label: "New Arrival" },
  { value: "sale", label: "On Sale" },
  { value: "featured", label: "Featured" },
  { value: "bestseller", label: "Bestseller" },
  { value: "limited", label: "Limited Edition" },
  { value: "trending", label: "Trending" },
];

interface ConfigCardProps {
  title: string;
  description?: string;
  enabled?: boolean;
  onToggle?: () => void;
  showToggle?: boolean;
  children?: React.ReactNode;
}

function ConfigCard({ title, description, enabled, onToggle, showToggle = true, children }: ConfigCardProps) {
  return (
    <div className="form-section animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {showToggle && onToggle && (
          <Switch checked={enabled} onCheckedChange={onToggle} />
        )}
      </div>
      {((showToggle && enabled) || !showToggle) && children && (
        <div className="mt-4">{children}</div>
      )}
    </div>
  );
}

type TimeFormat = "12h" | "24h";

// Generate time values in 30-minute steps (stored as 24h "HH:mm")
const generateTimeValues = () => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const minute = m.toString().padStart(2, "0");
      const value = `${h.toString().padStart(2, "0")}:${minute}`;
      times.push(value);
    }
  }
  return times;
};

const TIME_VALUES = generateTimeValues();

const formatTimeLabel = (time24: string, format: TimeFormat) => {
  if (format === "24h") return time24;
  const [h, m] = time24.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

// Common timezone options - format: Region/City with GMT offset
const TIMEZONE_OPTIONS = [
  { value: "Pacific/Pago_Pago", region: "Pacific/Pago Pago", offset: "-11:00" },
  { value: "Pacific/Honolulu", region: "Pacific/Honolulu", offset: "-10:00" },
  { value: "Pacific/Rarotonga", region: "Pacific/Rarotonga", offset: "-10:00" },
  { value: "Pacific/Tahiti", region: "Pacific/Tahiti", offset: "-10:00" },
  { value: "America/Adak", region: "America/Adak", offset: "-10:00" },
  { value: "America/Anchorage", region: "America/Anchorage", offset: "-09:00" },
  { value: "America/Los_Angeles", region: "America/Los Angeles", offset: "-08:00" },
  { value: "America/Denver", region: "America/Denver", offset: "-07:00" },
  { value: "America/Chicago", region: "America/Chicago", offset: "-06:00" },
  { value: "America/New_York", region: "America/New York", offset: "-05:00" },
  { value: "America/Sao_Paulo", region: "America/São Paulo", offset: "-03:00" },
  { value: "Atlantic/Azores", region: "Atlantic/Azores", offset: "-01:00" },
  { value: "Europe/London", region: "Europe/London", offset: "+00:00" },
  { value: "Europe/Paris", region: "Europe/Paris", offset: "+01:00" },
  { value: "Europe/Berlin", region: "Europe/Berlin", offset: "+01:00" },
  { value: "Africa/Cairo", region: "Africa/Cairo", offset: "+02:00" },
  { value: "Europe/Moscow", region: "Europe/Moscow", offset: "+03:00" },
  { value: "Asia/Dubai", region: "Asia/Dubai", offset: "+04:00" },
  { value: "Asia/Karachi", region: "Asia/Karachi", offset: "+05:00" },
  { value: "Asia/Ashgabat", region: "Asia/Ashgabat", offset: "+05:00" },
  { value: "Asia/Samarkand", region: "Asia/Samarkand", offset: "+05:00" },
  { value: "Asia/Tashkent", region: "Asia/Tashkent", offset: "+05:00" },
  { value: "Asia/Kolkata", region: "Asia/Kolkata", offset: "+05:30" },
  { value: "Asia/Dhaka", region: "Asia/Dhaka", offset: "+06:00" },
  { value: "Asia/Bangkok", region: "Asia/Bangkok", offset: "+07:00" },
  { value: "Asia/Singapore", region: "Asia/Singapore", offset: "+08:00" },
  { value: "Asia/Shanghai", region: "Asia/Shanghai", offset: "+08:00" },
  { value: "Asia/Tokyo", region: "Asia/Tokyo", offset: "+09:00" },
  { value: "Australia/Sydney", region: "Australia/Sydney", offset: "+10:00" },
  { value: "Pacific/Auckland", region: "Pacific/Auckland", offset: "+12:00" },
];

// Auto-detect user's timezone
const getDefaultTimezone = () => {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const found = TIMEZONE_OPTIONS.find((tz) => tz.value === userTz);
  return found ? found.value : "America/New_York";
};

// Format timezone display like "Asia/Kolkata" (short) or "Asia/Kolkata GMT +05:30" (full)
const getTimezoneDisplayShort = (tzValue: string) => {
  const found = TIMEZONE_OPTIONS.find((tz) => tz.value === tzValue);
  return found ? found.region : tzValue;
};

const getTimezoneDisplayFull = (tzValue: string) => {
  const found = TIMEZONE_OPTIONS.find((tz) => tz.value === tzValue);
  if (!found) return tzValue;
  return `${found.region} GMT ${found.offset}`;
};

export interface ProductConfigurationsData {
  availability: boolean;
  publishDateTime: string;
  publishTimezone: string;
  madeToOrder: boolean;
  manufacturingTime: string;
  manufacturingTimeUnit: string;
  selectedTags: string[];
  returnConfig: boolean;
  returnTime: string;
  returnTimeUnit: string;
  dependable: boolean;
  allowIndividualReturn?: boolean;
}

export interface ProductConfigurationsRef {
  getData: () => ProductConfigurationsData;
}

interface ProductConfigurationsProps {
  initialData?: ProductConfigurationsData;
  onUnlistedChange?: (unlisted: boolean) => void;
  isBundle?: boolean;
  productType?: "physical" | "digital";
}

export const ProductConfigurations = forwardRef<ProductConfigurationsRef, ProductConfigurationsProps>(
  function ProductConfigurations({ initialData, onUnlistedChange, isBundle, productType }, ref) {
    const isMobile = useIsMobile();
    const [dateDrawerOpen, setDateDrawerOpen] = useState(false);
    const [availability, setAvailability] = useState(initialData?.availability ?? true);
    const [madeToOrder, setMadeToOrder] = useState(initialData?.madeToOrder ?? false);
    const [returnConfig, setReturnConfig] = useState(initialData?.returnConfig ?? false);
    const [dependable, setDependable] = useState(initialData?.dependable ?? false);
    const [allowIndividualReturn, setAllowIndividualReturn] = useState(initialData?.allowIndividualReturn ?? false);
    
    // Tags state
    const [tags, setTags] = useState<typeof DEFAULT_TAGS>(DEFAULT_TAGS);
    const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.selectedTags || []);
    
    // Manufacturing time
    const [manufacturingTime, setManufacturingTime] = useState(initialData?.manufacturingTime || "");
    const [manufacturingTimeUnit, setManufacturingTimeUnit] = useState(initialData?.manufacturingTimeUnit || "hours");
    
    // Return time
    const [returnTime, setReturnTime] = useState(initialData?.returnTime || "");
    const [returnTimeUnit, setReturnTimeUnit] = useState(initialData?.returnTimeUnit || "days");
    
    // Timezone state - auto-detect
    const [selectedTimezone, setSelectedTimezone] = useState(() => {
      return initialData?.publishTimezone || getDefaultTimezone();
    });
    
    // Initialize with current date and time or from initialData
    const [publishDateTime, setPublishDateTime] = useState<Date>(() => {
      if (initialData?.publishDateTime) {
        return new Date(initialData.publishDateTime);
      }
      return new Date();
    });
    const [selectedTime, setSelectedTime] = useState(() => {
      if (initialData?.publishDateTime) {
        const date = new Date(initialData.publishDateTime);
        const hours = date.getHours();
        const minutes = date.getMinutes() < 30 ? "00" : "30";
        return `${hours.toString().padStart(2, "0")}:${minutes}`;
      }
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes() < 30 ? "00" : "30";
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    });

    const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");

    // Ref for measuring trigger width
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [triggerWidth, setTriggerWidth] = useState(0);

    // Load initial data when it changes (edit mode)
    useEffect(() => {
      if (initialData) {
        setAvailability(initialData.availability ?? true);
        setMadeToOrder(initialData.madeToOrder ?? true);
        setReturnConfig(initialData.returnConfig ?? true);
        setDependable(initialData.dependable ?? true);
        setAllowIndividualReturn(initialData.allowIndividualReturn ?? false);
        setSelectedTags(initialData.selectedTags || []);
        setManufacturingTime(initialData.manufacturingTime || "");
        setManufacturingTimeUnit(initialData.manufacturingTimeUnit || "hours");
        setReturnTime(initialData.returnTime || "");
        setReturnTimeUnit(initialData.returnTimeUnit || "days");
        if (initialData.publishTimezone) {
          setSelectedTimezone(initialData.publishTimezone);
        }
        if (initialData.publishDateTime) {
          const date = new Date(initialData.publishDateTime);
          setPublishDateTime(date);
          const hours = date.getHours();
          const minutes = date.getMinutes() < 30 ? "00" : "30";
          setSelectedTime(`${hours.toString().padStart(2, "0")}:${minutes}`);
        }
      }
    }, [initialData]);

    // Expose getData method to parent
    useImperativeHandle(ref, () => ({
      getData: () => ({
        availability,
        publishDateTime: publishDateTime.toISOString(),
        publishTimezone: selectedTimezone,
        madeToOrder,
        manufacturingTime,
        manufacturingTimeUnit,
        selectedTags,
        returnConfig,
        returnTime,
        returnTimeUnit,
        dependable,
        allowIndividualReturn,
      }),
    }));

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        date.setHours(hours, minutes);
        setPublishDateTime(date);
      }
    };

    const handleTimeSelect = (timeValue: string) => {
      setSelectedTime(timeValue);
      const [hours, minutes] = timeValue.split(":").map(Number);
      const newDate = new Date(publishDateTime);
      newDate.setHours(hours, minutes);
      setPublishDateTime(newDate);
    };

    const formatDisplayTime = (time: string) => formatTimeLabel(time, timeFormat);

    return (
      <>
        {/* Other Configurations Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium">Other Configurations</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Product Status Card */}
        <ConfigCard
          title="Product Status"
          enabled={availability}
          onToggle={() => setAvailability(!availability)}
        >
          <div className="space-y-3">
            <div>
              <label className="form-label">Publish Date</label>
            {/* Combined Date Time Picker */}
            {isMobile ? (
              <>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-10 justify-start text-left font-normal overflow-hidden",
                    !publishDateTime && "text-muted-foreground"
                  )}
                  onClick={() => setDateDrawerOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {publishDateTime 
                      ? `${format(publishDateTime, "MMM dd, yyyy")} ${formatDisplayTime(selectedTime)} • ${getTimezoneDisplayShort(selectedTimezone)}`
                      : "Select date and time"}
                  </span>
                </Button>
                <Drawer open={dateDrawerOpen} onOpenChange={setDateDrawerOpen}>
                  <DrawerContent className="max-h-[85vh]">
                    <div className="overflow-y-auto px-4 pb-6 pt-4">
                      {/* Timezone */}
                      <div className="mb-4">
                        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                          <SelectTrigger className="w-full h-10 rounded-lg border border-input bg-card">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{getTimezoneDisplayShort(selectedTimezone)}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="max-h-[280px] bg-popover z-[60]">
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.region} GMT {tz.offset}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Calendar */}
                      <Calendar
                        mode="single"
                        selected={publishDateTime}
                        onSelect={handleDateSelect}
                        className={cn("pointer-events-auto")}
                        classNames={{
                          months: "flex flex-col w-full",
                          month: "space-y-4 w-full",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-input hover:bg-muted transition-colors",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex w-full justify-between",
                          head_cell: "text-muted-foreground rounded-lg flex-1 font-normal text-[0.8rem] text-center",
                          row: "flex w-full mt-2 justify-between",
                          cell: "h-9 flex-1 text-center text-sm p-0 relative",
                          day: "h-9 w-full p-0 font-normal rounded-lg hover:bg-muted transition-colors inline-flex items-center justify-center",
                          day_selected: "bg-primary text-primary-foreground rounded-lg",
                          day_today: "",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_hidden: "invisible",
                        }}
                      />

                      {/* Time Selection */}
                      <div className="mt-4 border-t border-border pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-foreground">
                            {publishDateTime ? format(publishDateTime, "EEE dd") : "Select"}
                          </span>
                          <div className="flex text-xs bg-muted rounded-md overflow-hidden">
                            <button type="button" onClick={() => setTimeFormat("12h")} className={cn("px-2 py-1 transition-colors", timeFormat === "12h" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>12h</button>
                            <button type="button" onClick={() => setTimeFormat("24h")} className={cn("px-2 py-1 transition-colors", timeFormat === "24h" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>24h</button>
                          </div>
                        </div>
                        <div className="h-[200px] overflow-y-auto space-y-1.5">
                          {TIME_VALUES.map((timeValue) => (
                            <button
                              key={timeValue}
                              type="button"
                              onClick={() => handleTimeSelect(timeValue)}
                              className={cn(
                                "w-full text-center py-2.5 text-sm rounded-lg border border-input",
                                selectedTime === timeValue && "bg-primary text-primary-foreground border-primary"
                              )}
                            >
                              {formatTimeLabel(timeValue, timeFormat)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              </>
            ) : (
            <Popover onOpenChange={(open) => {
              if (open) {
                if (triggerRef.current) {
                  setTriggerWidth(triggerRef.current.offsetWidth);
                }
                setTimeout(() => {
                  const selectedEl = document.querySelector('[data-time-selected="true"]');
                  selectedEl?.scrollIntoView({ block: 'center', behavior: 'instant' });
                }, 0);
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  variant="outline"
                  className={cn(
                    "w-full h-10 justify-start text-left font-normal overflow-hidden",
                    !publishDateTime && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {publishDateTime 
                      ? `${format(publishDateTime, "MMM dd, yyyy")} ${formatDisplayTime(selectedTime)} • ${getTimezoneDisplayShort(selectedTimezone)}`
                      : "Select date and time"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0 z-50 bg-popover" 
                align="start" 
                sideOffset={4}
                style={{ width: triggerWidth > 0 ? triggerWidth : 'auto' }}
              >
                <div className="overflow-hidden">
                  {/* Timezone at top with globe icon */}
                  <div className="border-b border-border p-3">
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger className="w-full h-10 rounded-lg border border-input bg-card hover:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{getTimezoneDisplayShort(selectedTimezone)}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px] bg-popover z-50 [&_[data-radix-scroll-area-viewport]~div]:hidden [&>button]:hidden [&>[data-radix-select-viewport]~button]:hidden">
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem 
                            key={tz.value} 
                            value={tz.value}
                          >
                            {tz.region} GMT {tz.offset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row">
                    {/* Calendar with consistent rounded-lg styling */}
                    <div className="p-4 sm:border-r border-b sm:border-b-0 border-border sm:basis-[65%] shrink-0">
                      <Calendar
                        mode="single"
                        selected={publishDateTime}
                        onSelect={handleDateSelect}
                        initialFocus
                        className={cn("pointer-events-auto")}
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                          month: "space-y-4 w-full",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-input hover:bg-muted transition-colors",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex w-full justify-between",
                          head_cell: "text-muted-foreground rounded-lg flex-1 font-normal text-[0.8rem] text-center",
                          row: "flex w-full mt-2 justify-between",
                          cell: "h-9 flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                          day: "h-9 w-full p-0 font-normal rounded-lg hover:bg-muted transition-colors inline-flex items-center justify-center",
                          day_range_end: "day-range-end",
                          day_selected: "bg-primary text-primary-foreground rounded-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_range_middle: "",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>
                    
                    {/* Time Selection */}
                    <div className="p-4 sm:basis-[35%] sm:min-w-[220px]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-foreground">
                          {publishDateTime ? format(publishDateTime, "EEE dd") : "Select"}
                        </span>
                        <div className="flex text-xs bg-muted rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setTimeFormat("12h")}
                            className={cn(
                              "px-2 py-1 transition-colors",
                              timeFormat === "12h" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            12h
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimeFormat("24h")}
                            className={cn(
                              "px-2 py-1 transition-colors",
                              timeFormat === "24h" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            24h
                          </button>
                        </div>
                      </div>
                      <div className="h-[280px] overflow-y-auto space-y-1.5">
                        {TIME_VALUES.map((timeValue) => (
                          <button
                            key={timeValue}
                            type="button"
                            data-time-selected={selectedTime === timeValue}
                            onClick={() => handleTimeSelect(timeValue)}
                            className={cn(
                              "w-full text-center py-2.5 text-sm rounded-lg border border-input text-foreground bg-transparent hover:bg-muted transition-colors",
                              selectedTime === timeValue && "bg-primary text-primary-foreground border-primary hover:bg-primary"
                            )}
                          >
                            {formatTimeLabel(timeValue, timeFormat)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            )}
            </div>
          </div>
        </ConfigCard>

        {/* Made to Order Card - hidden for bundles and digital */}
        {!isBundle && productType !== "digital" && (
        <ConfigCard
          title="Made to Order"
          description="Enable if the product is manufactured only on order"
          enabled={madeToOrder}
          onToggle={() => setMadeToOrder(!madeToOrder)}
        >
          <div>
            <label className="form-label flex items-center gap-1">
              Manufacturing Time<span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Time required to manufacture this product</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="" 
                className="flex-1 h-10" 
                value={manufacturingTime}
                onChange={(e) => setManufacturingTime(e.target.value)}
              />
              <Select value={manufacturingTimeUnit} onValueChange={setManufacturingTimeUnit}>
                <SelectTrigger className="w-24 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigCard>
        )}

        {/* Add Tags Card */}
        <ConfigCard
          title="Product Tags"
          showToggle={false}
        >
          <MultiSelectTags
            placeholder="Select or add tags..."
            options={tags}
            selectedValues={selectedTags}
            onChange={setSelectedTags}
            onCreateNew={(name) => {
              const newTag = { value: name.toLowerCase().replace(/\s+/g, "-"), label: name };
              setTags((prev) => [...prev, newTag]);
              setSelectedTags((prev) => [...prev, newTag.value]);
            }}
          />
        </ConfigCard>

        {/* Return Configuration Card */}
        <ConfigCard
          title={isBundle ? "Allow return of individual bundled products" : "Return Configuration"}
          description="Mark this product as returnable. When enabled, customers can initiate a return within the specified return window."
          enabled={returnConfig}
          onToggle={() => setReturnConfig(!returnConfig)}
        >
          <div>
            <label className="form-label flex items-center gap-1">
              Return Window<span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duration within which customers can return this product</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="" 
                className="flex-1 h-10" 
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
              />
              <Select value={returnTimeUnit} onValueChange={setReturnTimeUnit}>
                <SelectTrigger className="w-24 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigCard>

        {/* Allow return of individual bundled products - only for bundles */}
        {isBundle && returnConfig && (
          <ConfigCard
            title="Allow return of individual bundled products"
            description="Customers can return specific items from the bundle rather than the entire set. Please note, in case of a whole return, individual shipments will be created for the products within the bundle."
            enabled={allowIndividualReturn}
            onToggle={() => setAllowIndividualReturn(!allowIndividualReturn)}
          />
        )}

        <ConfigCard
          title="Unlisted Product"
          description="Unlisted products are not discoverable in search and listing pages. They still have a product detail page."
          enabled={dependable}
          onToggle={() => {
            const newVal = !dependable;
            setDependable(newVal);
            onUnlistedChange?.(newVal);
          }}
        />
      </>
    );
  }
);
