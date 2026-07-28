import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ExtensionBlocks, { type ExtensionBlock } from "@/components/location/ExtensionBlocks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiSelectTags } from "@/components/ui/multi-select-tags";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ArrowLeft, Plus, X, Search, Loader2, Info, CalendarIcon, Upload, FileText, Pencil, Trash2, Check, Eye, Clock, ChevronRight, SlidersHorizontal, ChevronDown, MapPin, Building2, Layers, MoreVertical, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { salesChannels } from "@/components/layout/AppSidebar";
import cloudUploadIcon from "@/assets/ic-cloud-upload.svg";
import emptyImg from "@/assets/empty-attributes.png";
import fetchLocationIcon from "@/assets/ic-fetch-location.svg";
import mapPinIcon from "@/assets/ic-map-pin.svg";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiY2hhaXRhbnlhc2FpIiwiYSI6ImNtbTA4ZWllMDBkdHAzZnF3OWl4ZmR0dWoifQ.97MgMVt6bHs_Rp5TgqWWdg";

interface Address {
  id: string;
  label: string;
  fullAddress: string;
  houseNo: string;
  pincode: string;
  city: string;
  state: string;
}

interface DayTiming {
  enabled: boolean;
  open: string;
  close: string;
}

interface Holiday {
  id: string;
  name: string;
  type: "Public" | "Custom";
  fromDate: string;
  toDate: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastSeen: string;
  status: "accepted" | "pending";
}

interface Zone {
  id: string;
  name: string;
  type: string;
  defaultStorage: boolean;
  defaultPicking: boolean;
  notes: string;
  tags: string[];
  maxOnHand: string;
}

interface InfrastructureConfig {
  zones: Zone[];
  capacityType: "none" | "unit" | "value" | "volume";
  maxCapacity: string;
  reorderBuffer: string;
  allowOverflow: boolean;
  overflowHandling: "allow-flag" | "require-approval" | "block";
  enableZoneLevelCapacity: boolean;
}

interface Location {
  locationType: string;
  locationName: string;
  locationCode: string;
  managers: TeamMember[];
  storePrimaryPhone: string;
  storeEmails: string[];
  addresses: Address[];
  returnToAnother: boolean;
  returnAddressId: string;
  gstName: string;
  gstNumber: string;
  gstDocument: File | null;
  operationalTiming: Record<string, DayTiming>;
  orderAcceptanceSameAsOp: boolean;
  orderAcceptanceTiming: Record<string, DayTiming>;
  avgOrderProcessingTime: string;
  avgOrderProcessingUnit: string;
  holidays: Holiday[];
  capacityEnabled: boolean;
  maxOrdersPerDay: string;
  maxOrdersPerHour: string;
  maxConcurrentOrders: string;
  autoPauseOnCapacity: boolean;
  infrastructure: InfrastructureConfig;
  settings: {
    eWayBill: boolean;
    eInvoice: boolean;
    autoInvoice: boolean;
    autoCreditNote: boolean;
    bulkShipment: boolean;
    multiPieceShipment: boolean;
    autoReturnInventorySync: boolean;
  };
  tags: string[];
}

/* ---------- Sales Channel Types ---------- */
interface OrderingSourceStatus {
  enabled: boolean;
  activeSince: string | null;
  inactiveSince: string | null;
  lastModifiedBy: string;
  lastModifiedAt: string;
  history: { status: string; changedBy: string; date: string; reason?: string }[];
}

interface ChannelConfig {
  id: string;
  name: string;
  type: "core" | "extension";
  sources: { key: string; label: string; status: OrderingSourceStatus }[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

const getChannelStatus = (sources: ChannelConfig["sources"]): "Active" | "Partially Active" | "Inactive" => {
  const onCount = sources.filter((s) => s.status.enabled).length;
  if (onCount === sources.length) return "Active";
  if (onCount > 0) return "Partially Active";
  return "Inactive";
};

const getChannelActiveSince = (sources: ChannelConfig["sources"]): string | null => {
  const activeDates = sources.filter((s) => s.status.enabled && s.status.activeSince).map((s) => s.status.activeSince!);
  if (!activeDates.length) return null;
  return activeDates.sort()[0];
};

const defaultSource = (label: string, key: string, enabled: boolean): ChannelConfig["sources"][0] => ({
  key,
  label,
  status: {
    enabled,
    activeSince: enabled ? "2026-01-12" : null,
    inactiveSince: enabled ? null : "2026-02-01",
    lastModifiedBy: "Rahul Sharma",
    lastModifiedAt: "2026-02-24",
    history: [
      { status: enabled ? "Activated" : "Deactivated", changedBy: "Rahul Sharma", date: "2026-01-12", reason: "Initial setup" },
    ],
  },
});

const INITIAL_CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    id: "just-dogs",
    name: "Just Dogs",
    type: "core",
    sources: [
      defaultSource("Storefront", "storefront", true),
      defaultSource("POS", "pos", true),
      defaultSource("Kiosk", "kiosk", false),
      defaultSource("Scan & Go", "scan-go", false),
    ],
    lastUpdatedBy: "Rahul Sharma",
    lastUpdatedAt: "2026-02-24",
  },
  {
    id: "parysu",
    name: "Parysu",
    type: "core",
    sources: [
      defaultSource("Storefront", "storefront", true),
      defaultSource("POS", "pos", false),
      defaultSource("Kiosk", "kiosk", false),
      defaultSource("Scan & Go", "scan-go", false),
    ],
    lastUpdatedBy: "Priya Patel",
    lastUpdatedAt: "2026-02-20",
  },
  {
    id: "konnect",
    name: "Konnect",
    type: "extension",
    sources: [
      defaultSource("Amazon", "amazon", true),
      defaultSource("Flipkart", "flipkart", false),
    ],
    lastUpdatedBy: "Amit Kumar",
    lastUpdatedAt: "2026-02-18",
  },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultDayTiming = (): Record<string, DayTiming> =>
  Object.fromEntries(DAYS.map((d) => [d, { enabled: true, open: "11:00", close: "22:00" }]));

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "Rahul Sharma", email: "rahul@fynd.com", phone: "+91 98765 43210", role: "Owner", lastSeen: "2026-02-26T10:30:00", status: "accepted" },
  { id: "2", name: "Priya Patel", email: "priya@fynd.com", phone: "+91 87654 32109", role: "Store Manager", lastSeen: "2026-02-25T18:15:00", status: "accepted" },
  { id: "3", name: "Amit Kumar", email: "amit@fynd.com", phone: "+91 76543 21098", role: "Assistant Manager", lastSeen: "2026-02-24T14:45:00", status: "accepted" },
  { id: "4", name: "Sneha Desai", email: "sneha@fynd.com", phone: "+91 65432 10987", role: "Floor Manager", lastSeen: "2026-02-23T09:00:00", status: "accepted" },
  { id: "5", name: "Vikram Singh", email: "vikram@fynd.com", phone: "+91 54321 09876", role: "Warehouse Lead", lastSeen: "2026-02-20T11:30:00", status: "pending" },
];

const emptyLocation: Location = {
  locationType: "highstreet",
  locationName: "",
  locationCode: "",
  managers: [MOCK_TEAM_MEMBERS[0]],
  storePrimaryPhone: "",
  storeEmails: [],
  addresses: [],
  returnToAnother: false,
  returnAddressId: "",
  gstName: "",
  gstNumber: "",
  gstDocument: null,
  operationalTiming: defaultDayTiming(),
  orderAcceptanceSameAsOp: true,
  orderAcceptanceTiming: defaultDayTiming(),
  avgOrderProcessingTime: "",
  avgOrderProcessingUnit: "Hours",
  capacityEnabled: false,
  maxOrdersPerDay: "",
  maxOrdersPerHour: "",
  maxConcurrentOrders: "",
  autoPauseOnCapacity: false,
  holidays: [],
  infrastructure: {
    zones: [],
    capacityType: "none",
    maxCapacity: "",
    reorderBuffer: "",
    allowOverflow: false,
    overflowHandling: "allow-flag",
    enableZoneLevelCapacity: false,
  },
  settings: {
    eWayBill: false,
    eInvoice: false,
    autoInvoice: false,
    autoCreditNote: false,
    bulkShipment: false,
    multiPieceShipment: false,
    autoReturnInventorySync: false,
  },
  tags: [],
};

const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/* ---------- Address Modal ---------- */
type ModalStep = "search" | "details";

function AddAddressModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (addr: Address) => void;
}) {
  const [step, setStep] = useState<ModalStep>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ label: string; fullAddress: string; lat: number; lon: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ label: string; fullAddress: string; lat: number; lon: number; pincode?: string; city?: string; state?: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.076, 72.8777]);
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);

  const reset = () => {
    setStep("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPlace(null);
    setHouseNo("");
    setLandmark("");
    setPincode("");
    setCity("");
    setState("");
    setMapCenter([19.076, 72.8777]);
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=in`
      );
      const data = await res.json();
      setSearchResults((data.features || []).map((f: any) => ({
        label: f.text || f.place_name?.split(",")[0],
        fullAddress: f.place_name,
        lat: f.center[1],
        lon: f.center[0],
      })));
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(searchQuery), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, doSearch]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place,postcode,region&limit=1`
      );
      const data = await res.json();
      if (data.features?.length) {
        const f = data.features[0];
        const ctx = f.context || [];
        const getCtx = (prefix: string) => ctx.find((c: any) => c.id?.startsWith(prefix))?.text || "";
        return {
          label: f.text || f.place_name?.split(",")[0],
          fullAddress: f.place_name,
          lat, lon: lng,
          pincode: getCtx("postcode"),
          city: getCtx("place") || getCtx("locality"),
          state: getCtx("region"),
        };
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    if (!open || step !== "search") return;
    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      if (!mapInstance.current) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [mapCenter[1], mapCenter[0]],
          zoom: 14,
          attributionControl: false,
        });
        mapInstance.current = map;
        const marker = new mapboxgl.Marker({ draggable: true, color: "#4F46E5" })
          .setLngLat([mapCenter[1], mapCenter[0]])
          .addTo(map);
        markerRef.current = marker;

        map.on("load", () => {
          map.resize();
          if (navigator.geolocation) {
            setLocatingMe(true);
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude } = pos.coords;
                map.flyTo({ center: [longitude, latitude], zoom: 15 });
                marker.setLngLat([longitude, latitude]);
                setMapCenter([latitude, longitude]);
                const place = await reverseGeocode(latitude, longitude);
                if (place) setSelectedPlace(place);
                setLocatingMe(false);
              },
              () => setLocatingMe(false),
              { timeout: 5000 }
            );
          }
        });

        marker.on("dragend", async () => {
          const lngLat = marker.getLngLat();
          setMapCenter([lngLat.lat, lngLat.lng]);
          const place = await reverseGeocode(lngLat.lat, lngLat.lng);
          if (place) setSelectedPlace(place);
        });

        map.on("click", async (e) => {
          const { lat, lng } = e.lngLat;
          marker.setLngLat([lng, lat]);
          setMapCenter([lat, lng]);
          const place = await reverseGeocode(lat, lng);
          if (place) setSelectedPlace(place);
        });
      } else {
        mapInstance.current.resize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, step]);

  const handleSelectResult = (result: { label: string; fullAddress: string; lat: number; lon: number }) => {
    setSelectedPlace(result);
    setMapCenter([result.lat, result.lon]);
    if (mapInstance.current) {
      mapInstance.current.flyTo({ center: [result.lon, result.lat], zoom: 16 });
      markerRef.current?.setLngLat([result.lon, result.lat]);
    }
  };

  const handleConfirm = () => {
    if (!selectedPlace) return;
    if (selectedPlace.pincode) setPincode(selectedPlace.pincode);
    if (selectedPlace.city) setCity(selectedPlace.city);
    if (selectedPlace.state) setState(selectedPlace.state);
    setStep("details");
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        mapInstance.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        markerRef.current?.setLngLat([longitude, latitude]);
        const place = await reverseGeocode(latitude, longitude);
        if (place) setSelectedPlace(place);
        setLocatingMe(false);
      },
      () => setLocatingMe(false),
      { timeout: 5000 }
    );
  };

  useEffect(() => {
    if (!open && mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      markerRef.current = null;
    }
  }, [open]);

  const handleSave = () => {
    if (!selectedPlace || !houseNo.trim()) return;
    onSave({
      id: crypto.randomUUID(),
      label: selectedPlace.label,
      fullAddress: `${houseNo}, ${selectedPlace.fullAddress}`,
      houseNo,
      pincode,
      city,
      state,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); } onOpenChange(v); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" style={{ height: step === "search" ? "80vh" : "auto", display: "flex", flexDirection: "column" }}>
        {step === "search" && (
          <>
            <DialogHeader className="p-5 pb-3 shrink-0">
              <DialogTitle className="text-base">Select Location</DialogTitle>
            </DialogHeader>
            <div className="px-5 pb-3 relative z-20 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for pincode, area, street name..."
                  className="pl-9"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              {searchQuery.trim() && searchResults.length > 0 && (
                <div className="absolute left-5 right-5 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto z-30">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
                      onClick={() => { handleSelectResult(r); setSearchQuery(""); }}
                    >
                      <img src={mapPinIcon} alt="" className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.fullAddress}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex-1 min-h-[350px] overflow-hidden">
              <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
              <button
                onClick={handleLocateMe}
                disabled={locatingMe}
                className="absolute bottom-3 right-3 bg-card border border-border rounded-full p-2.5 shadow-md z-[1000] hover:bg-muted transition-colors"
              >
                {locatingMe ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <img src={fetchLocationIcon} alt="Locate me" className="w-5 h-5" />}
              </button>
            </div>
            {selectedPlace && (
              <div className="px-5 py-4 border-t border-border shrink-0">
                <div className="flex items-start gap-3 mb-3">
                  <img src={mapPinIcon} alt="" className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{selectedPlace.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedPlace.fullAddress}</p>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={handleConfirm}>CONFIRM</Button>
              </div>
            )}
          </>
        )}

        {step === "details" && selectedPlace && (
          <div className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Enter Address</h2>
            <div className="p-3 border border-border rounded-lg flex items-center gap-3">
              <img src={mapPinIcon} alt="" className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{selectedPlace.label}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedPlace.fullAddress}</p>
              </div>
              <button onClick={() => setStep("search")} className="text-xs font-semibold text-primary hover:underline shrink-0">
                CHANGE
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">House no / Building / Apartment<span className="text-destructive">*</span></Label>
              <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="Enter house / building details" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Landmark</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark (optional)" />
            </div>
            <Button className="w-full" size="lg" onClick={handleSave} disabled={!houseNo.trim()}>
              Save & Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Add/Edit Holiday Modal ---------- */
function AddHolidayModal({
  open,
  onOpenChange,
  onSave,
  editHoliday,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (h: Holiday) => void;
  editHoliday?: Holiday | null;
}) {
  const [holidays, setHolidays] = useState<{ id: string; name: string; type: "Public" | "Custom"; fromDate: string; toDate: string }[]>([]);

  useEffect(() => {
    if (open) {
      if (editHoliday) {
        setHolidays([{ ...editHoliday }]);
      } else {
        setHolidays([{ id: crypto.randomUUID(), name: "", type: "Public", fromDate: "", toDate: "" }]);
      }
    }
  }, [open, editHoliday]);

  const updateHoliday = (index: number, field: string, value: string) => {
    setHolidays((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const addMore = () => {
    setHolidays((prev) => [...prev, { id: crypto.randomUUID(), name: "", type: "Public" as const, fromDate: "", toDate: "" }]);
  };

  const removeRow = (index: number) => {
    if (holidays.length > 1) setHolidays((prev) => prev.filter((_, i) => i !== index));
  };

  const canSave = holidays.every((h) => h.name.trim() && h.fromDate && h.toDate);

  const handleSave = () => {
    if (!canSave) return;
    holidays.forEach((h) => onSave({ ...h, name: h.name.trim() }));
    onOpenChange(false);
  };

  const lastHolidayComplete = holidays.length > 0 && (() => {
    const last = holidays[holidays.length - 1];
    return !!last.name.trim() && !!last.fromDate && !!last.toDate;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-base">{editHoliday ? "Edit Holiday" : "Add Holidays"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto px-0.5">
          {holidays.map((h, i) => (
            <div key={h.id} className="space-y-3">
              {holidays.length > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{h.name.trim() || `Holiday ${i + 1}`}</p>
                  <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Holiday Title<span className="text-destructive">*</span></Label>
                  <Input value={h.name} onChange={(e) => updateHoliday(i, "name", e.target.value)} placeholder="Enter title here" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Holiday Type<span className="text-destructive">*</span></Label>
                  <Select value={h.type} onValueChange={(v) => updateHoliday(i, "type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From Date<span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !h.fromDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {h.fromDate ? format(parse(h.fromDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "DD/MM/YYYY"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={h.fromDate ? parse(h.fromDate, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(d) => d && updateHoliday(i, "fromDate", format(d, "yyyy-MM-dd"))}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To Date<span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !h.toDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {h.toDate ? format(parse(h.toDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "DD/MM/YYYY"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={h.toDate ? parse(h.toDate, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(d) => d && updateHoliday(i, "toDate", format(d, "yyyy-MM-dd"))}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {i < holidays.length - 1 && <div className="border-b border-border pt-1" />}
            </div>
          ))}
          {!editHoliday && (
            <button
              className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
              onClick={addMore}
              disabled={!lastHolidayComplete}
            >
              <Plus className="w-3.5 h-3.5" /> Add Holiday
            </button>
          )}
        </div>
        <div className="pt-2">
          <Button className="w-full" onClick={handleSave} disabled={!canSave}>
            {editHoliday ? "Save Changes" : "Add to Holiday Listing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Section Header Helper ---------- */
function SectionHeader({ title, description, icon }: { title: string; description?: string; icon?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {icon && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent><p>{title}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

/* ---------- Settings Toggle Row ---------- */
function SettingRow({ label, description, checked, onChange, icon }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-b-0">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {icon && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent><p>{label}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  );
}

/* ---------- Timing Row ---------- */
function TimingRow({ day, timing, onChange, disabled }: { day: string; timing: DayTiming; onChange: (t: DayTiming) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox checked={timing.enabled} onCheckedChange={(c) => onChange({ ...timing, enabled: !!c })} disabled={disabled} className="shrink-0" />
      <span className="text-sm font-medium text-foreground w-24 shrink-0">{day}</span>
      <Input
        type="time"
        value={timing.open}
        onChange={(e) => onChange({ ...timing, open: e.target.value })}
        className="w-32 text-xs"
        disabled={!timing.enabled || disabled}
      />
      <Input
        type="time"
        value={timing.close}
        onChange={(e) => onChange({ ...timing, close: e.target.value })}
        className="w-32 text-xs"
        disabled={!timing.enabled || disabled}
      />
    </div>
  );
}

/* ---------- AVAILABLE TAGS (mock) ---------- */
const LOCATION_TAG_OPTIONS = [
  { value: "flagship", label: "Flagship" },
  { value: "express", label: "Express Delivery" },
  { value: "pickup", label: "Pickup Point" },
  { value: "returns", label: "Returns Center" },
];

/* ---------- Filter Pill Components ---------- */
const LocationMultiFilterPill = ({
  label, options, selected, onChange,
}: {
  label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const count = selected.length;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-sm border transition-colors ${count > 0 ? "border-primary/40 bg-primary/5 text-foreground" : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:bg-muted/50"}`}>
          {label}
          {count > 0 && <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-1.5">{count < 10 ? `0${count}` : count}</span>}
          {count > 0 ? <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); onChange([]); }} /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-popover z-50" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function LocationPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [deleteTarget, setDeleteTarget] = useState<{ idx: number; name: string } | null>(null);
  const [form, setForm] = useState<Location>(emptyLocation);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailInputError, setEmailInputError] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>(INITIAL_CHANNEL_CONFIGS);
  const [savedChannelConfigs, setSavedChannelConfigs] = useState<ChannelConfig[]>(INITIAL_CHANNEL_CONFIGS);
  const [historySheet, setHistorySheet] = useState<{ channelId: string; sourceKey?: string } | null>(null);
  const [deactivateReasonModal, setDeactivateReasonModal] = useState<{ items: { channelId: string; channelName: string; sourceKey: string; sourceLabel: string }[]; reasons: Record<string, string>; applyToAll: boolean; sharedReason: string } | null>(null);
  const [extensionBlocks, setExtensionBlocks] = useState<Record<string, ExtensionBlock[]>>({
    overview: [],
    operations: [],
    "sales-channels": [],
    infrastructure: [],
    compliance: [],
    automation: [],
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["overview"]));
  const [nameAttempted, setNameAttempted] = useState(false);
  const [capacityAttempted, setCapacityAttempted] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const [zonePage, setZonePage] = useState(1);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [zoneNameErrors, setZoneNameErrors] = useState<Record<string, string>>({});
  const isCapacityValid = !form.capacityEnabled || !!(form.maxOrdersPerDay.trim() || form.maxOrdersPerHour.trim() || form.maxConcurrentOrders.trim());

  /* ---------- Listing State ---------- */
  const [listingTab, setListingTab] = useState("locations");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [locationFilters, setLocationFilters] = useState({
    orderSource: [] as string[],
    locationType: [] as string[],
    capacityFilter: [] as string[],
    state: [] as string[],
    city: [] as string[],
    country: [] as string[],
    locationTags: [] as string[],
    inventoryHealth: [] as string[],
  });
  const [zoneListSearch, setZoneListSearch] = useState("");

  const activeLocationFilterCount = Object.values(locationFilters).reduce((sum, v) => sum + v.length, 0);

  const getCapacityLabel = (loc: Location) => {
    if (loc.infrastructure.capacityType === "none") return "Not Configured";
    const max = parseFloat(loc.infrastructure.maxCapacity);
    if (!max) return "Not Configured";
    if (loc.infrastructure.allowOverflow) return "Overflow Active";
    const buffer = parseFloat(loc.infrastructure.reorderBuffer) || 0;
    const threshold = max - buffer;
    if (threshold <= 0) return "Capacity Reached";
    if (buffer > 0 && threshold / max < 0.15) return "Near Capacity";
    return "Within Limit";
  };

  const getInventoryLabel = (loc: Location) => {
    if (loc.infrastructure.capacityType === "none") return "Not Configured";
    if (loc.infrastructure.allowOverflow) return "Overflow";
    return "Healthy";
  };

  const getCapacityDisplay = (loc: Location, idx: number) => {
    if (loc.infrastructure.capacityType === "none") return { text: "Not Configured", variant: "muted" as const };
    const max = parseFloat(loc.infrastructure.maxCapacity);
    if (!max) return { text: "Not Configured", variant: "muted" as const };
    const unitLabel = loc.infrastructure.capacityType === "unit" ? "units" : loc.infrastructure.capacityType === "value" ? "₹" : "m³";
    const onHand = Math.round(max * (0.3 + ((idx * 7 + 3) % 10) * 0.07));
    const ratio = onHand / max;
    let variant: "success" | "warning" | "destructive" | "muted" = "success";
    if (ratio >= 1) variant = "destructive";
    else if (ratio >= 0.85) variant = "warning";
    if (loc.infrastructure.allowOverflow) variant = "destructive";
    return { text: `${onHand}/${Math.round(max)} ${unitLabel}`, variant };
  };

  const filteredLocations = useMemo(() => {
    let result = locations.map((loc, idx) => ({ loc, idx }));
    if (locationSearch.trim()) {
      const q = locationSearch.toLowerCase();
      result = result.filter(({ loc }) =>
        loc.locationName.toLowerCase().includes(q) ||
        loc.locationCode.toLowerCase().includes(q) ||
        loc.tags.some(t => t.toLowerCase().includes(q)) ||
        loc.addresses.some(a => a.fullAddress.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.state.toLowerCase().includes(q))
      );
    }
    if (locationFilters.locationType.length > 0) result = result.filter(({ loc }) => locationFilters.locationType.includes(loc.locationType));
    if (locationFilters.orderSource.length > 0) result = result.filter(() => channelConfigs.some(ch => ch.sources.some(s => s.status.enabled && locationFilters.orderSource.includes(s.key))));
    if (locationFilters.locationTags.length > 0) result = result.filter(({ loc }) => loc.tags.some(t => locationFilters.locationTags.includes(t)));
    if (locationFilters.capacityFilter.length > 0) result = result.filter(({ loc }) => locationFilters.capacityFilter.includes(getCapacityLabel(loc)));
    if (locationFilters.inventoryHealth.length > 0) result = result.filter(({ loc }) => locationFilters.inventoryHealth.includes(getInventoryLabel(loc)));
    if (locationFilters.state.length > 0) result = result.filter(({ loc }) => loc.addresses.some(a => locationFilters.state.includes(a.state)));
    if (locationFilters.city.length > 0) result = result.filter(({ loc }) => loc.addresses.some(a => locationFilters.city.includes(a.city)));
    return result;
  }, [locations, locationSearch, locationFilters, channelConfigs]);

  const allZones = useMemo(() => {
    return locations.flatMap((loc, li) => loc.infrastructure.zones.map(z => ({ ...z, locationName: loc.locationName, locationCode: loc.locationCode, locIdx: li, capacityType: loc.infrastructure.capacityType, enableZoneLevelCapacity: loc.infrastructure.enableZoneLevelCapacity })));
  }, [locations]);

  const filteredZonesListing = useMemo(() => {
    if (!zoneListSearch.trim()) return allZones;
    const q = zoneListSearch.toLowerCase();
    return allZones.filter(z => z.name.toLowerCase().includes(q) || z.locationName.toLowerCase().includes(q) || z.tags.some(t => t.toLowerCase().includes(q)));
  }, [allZones, zoneListSearch]);

  const uniqueStates = useMemo(() => [...new Set(locations.flatMap(l => l.addresses.map(a => a.state)).filter(Boolean))], [locations]);
  const uniqueCities = useMemo(() => [...new Set(locations.flatMap(l => l.addresses.map(a => a.city)).filter(Boolean))], [locations]);
  const uniqueTags = useMemo(() => [...new Set(locations.flatMap(l => l.tags))], [locations]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => phone.length >= 10;

  const isCodeDuplicate = form.locationCode.trim() !== "" && locations.some((l, i) => i !== editingIndex && l.locationCode === form.locationCode);

  const isFormValid =
    !!form.locationType &&
    !!form.locationName.trim() &&
    !isCodeDuplicate &&
    (form.managers || []).length > 0;

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const updateExtBlocks = (tab: string, blocks: ExtensionBlock[]) =>
    setExtensionBlocks((prev) => ({ ...prev, [tab]: blocks }));

  const getNewlyDisabledSources = () => {
    const items: { channelId: string; channelName: string; sourceKey: string; sourceLabel: string }[] = [];
    channelConfigs.forEach((ch) => {
      const savedCh = savedChannelConfigs.find((sc) => sc.id === ch.id);
      if (!savedCh) return;
      ch.sources.forEach((src) => {
        const savedSrc = savedCh.sources.find((ss) => ss.key === src.key);
        if (savedSrc && savedSrc.status.enabled && !src.status.enabled) {
          items.push({ channelId: ch.id, channelName: ch.name, sourceKey: src.key, sourceLabel: src.label });
        }
      });
    });
    return items;
  };

  const completeSave = (reasons?: Record<string, string>) => {
    if (reasons) {
      setChannelConfigs((prev) =>
        prev.map((ch) => ({
          ...ch,
          sources: ch.sources.map((s) => {
            const key = `${ch.id}::${s.key}`;
            if (reasons[key] !== undefined) {
              return {
                ...s,
                status: {
                  ...s.status,
                  history: [
                    { status: "Deactivated", changedBy: "You", date: format(new Date(), "yyyy-MM-dd"), reason: reasons[key] || undefined },
                    ...s.status.history,
                  ],
                },
              };
            }
            return s;
          }),
        }))
      );
    }
    if (editingIndex !== null) {
      setLocations((prev) => prev.map((loc, i) => i === editingIndex ? form : loc));
    } else {
      // Auto-generate unique location code if not provided
      let finalForm = form;
      if (!form.locationCode.trim()) {
        const base = form.locationName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "LOC";
        let code = base;
        let counter = 1;
        const existingCodes = new Set(locations.map(l => l.locationCode));
        while (existingCodes.has(code)) {
          code = `${base}-${counter}`;
          counter++;
        }
        finalForm = { ...form, locationCode: code };
      }
      setLocations((prev) => [...prev, finalForm]);
    }
    setSavedChannelConfigs(channelConfigs);
    setForm(emptyLocation);
    setEditingIndex(null);
    setView("list");
  };

  const handleSave = () => {
    if (!isFormValid) return;
    const disabled = getNewlyDisabledSources();
    if (disabled.length > 0) {
      const reasons: Record<string, string> = {};
      disabled.forEach((d) => { reasons[`${d.channelId}::${d.sourceKey}`] = ""; });
      setDeactivateReasonModal({ items: disabled, reasons, applyToAll: disabled.length > 1, sharedReason: "" });
      return;
    }
    completeSave();
  };

  const updateSettings = (key: keyof Location["settings"], value: boolean) => {
    setForm({ ...form, settings: { ...form.settings, [key]: value } });
  };

  const updateOpTiming = (day: string, t: DayTiming) => {
    const next = { ...form.operationalTiming, [day]: t };
    setForm({ ...form, operationalTiming: next, ...(form.orderAcceptanceSameAsOp ? { orderAcceptanceTiming: next } : {}) });
  };

  const formatHolidayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
    return `${day}${suffix} ${format(d, "MMM")} '${format(d, "yy")}`;
  };

  if (view === "form") {
    return (
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditingIndex(null); setView("list"); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-foreground">{editingIndex !== null ? "Edit Location" : "Create Location"}</h1>
            </div>
            {(() => {
              const TAB_ORDER = ["overview", "operations", "sales-channels", "infrastructure"];
              const currentIdx = TAB_ORDER.indexOf(activeTab);
              const isNew = editingIndex === null;
              const reachedSalesChannels = visitedTabs.has("sales-channels");
              const canSave = isFormValid;

              if (!isNew) {
                return <Button onClick={handleSave} disabled={!canSave}>Save</Button>;
              }

              if (reachedSalesChannels) {
                return <Button onClick={handleSave} disabled={!canSave}>Save</Button>;
              }

              // Show Next for overview and operations
              if (currentIdx >= 0 && currentIdx < TAB_ORDER.length - 1) {
                const nextTab = TAB_ORDER[currentIdx + 1];
                return (
                  <Button onClick={() => {
                    if (activeTab === "overview" && !form.locationName.trim()) {
                      setNameAttempted(true);
                      return;
                    }
                    if (activeTab === "operations" && !isCapacityValid) {
                      setCapacityAttempted(true);
                      return;
                    }
                    setActiveTab(nextTab);
                    setVisitedTabs((prev) => new Set(prev).add(nextTab));
                  }}>
                    Next
                  </Button>
                );
              }

              return <Button onClick={handleSave} disabled={!canSave}>Save</Button>;
            })()}
          </div>

          <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
            <Tabs value={activeTab} onValueChange={(v) => {
              if (editingIndex === null && activeTab === "overview" && !form.locationName.trim() && v !== "overview") {
                setNameAttempted(true);
                return;
              }
              if (editingIndex === null && activeTab === "operations" && !isCapacityValid && v !== "operations") {
                setCapacityAttempted(true);
                return;
              }
              setActiveTab(v);
              setVisitedTabs((prev) => new Set(prev).add(v));
            }} className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="operations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Operations
                </TabsTrigger>
                <TabsTrigger value="sales-channels" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Sales Channels
                </TabsTrigger>
                <TabsTrigger value="infrastructure" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Infrastructure
                </TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="automation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Automation
                </TabsTrigger>
              </TabsList>

              {/* ==================== OVERVIEW TAB ==================== */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Basic Information */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Basic Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Location Type<span className="text-destructive">*</span></Label>
                      <Select value={form.locationType} onValueChange={(v) => setForm({ ...form, locationType: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="highstreet">HighStreet</SelectItem>
                          <SelectItem value="mall">Mall</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Location Name<span className="text-destructive">*</span></Label>
                      <Input value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} placeholder="Enter location name" className={nameAttempted && !form.locationName.trim() ? "border-destructive" : ""} />
                      {nameAttempted && !form.locationName.trim() && (
                        <p className="text-xs text-destructive mt-1">Location name is required</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Location Code</Label>
                      <Input
                        value={form.locationCode}
                        onChange={(e) => {
                          const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                          setForm({ ...form, locationCode: sanitized });
                        }}
                        placeholder="Auto-generated if left empty"
                        className="font-mono"
                      />
                      {form.locationCode && locations.some((l, i) => i !== editingIndex && l.locationCode === form.locationCode) && (
                        <p className="text-xs text-destructive mt-1">Location code must be unique</p>
                      )}
                    </div>
                  </div>
                  {/* Tags */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <MultiSelectTags
                      placeholder="Search, select or add tags"
                      options={LOCATION_TAG_OPTIONS}
                      selectedValues={form.tags}
                      onChange={(tags) => setForm({ ...form, tags })}
                      onCreateNew={(name) => setForm({ ...form, tags: [...form.tags, name] })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="bg-card border border-border rounded-lg">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <SectionHeader title="Address" />
                      {form.addresses.length === 0 ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddressModalOpen(true)}>
                          <Plus className="w-3.5 h-3.5" />
                          Add Address
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setAddressModalOpen(true)}>
                          Modify
                        </Button>
                      )}
                    </div>
                    {form.addresses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <img src={mapPinIcon} alt="" className="w-10 h-10 opacity-40 mb-2" />
                        <p className="text-sm text-muted-foreground">No address added yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Click "Add Address" to add your location</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {form.addresses.map((addr) => (
                          <div key={addr.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                            <img src={mapPinIcon} alt="" className="w-4 h-4 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{addr.label}</p>
                              <p className="text-xs text-muted-foreground">{addr.fullAddress}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Contacts" />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            Add Manager
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <div className="p-3 border-b border-border">
                            <p className="text-sm font-medium text-foreground mb-2">Select team member</p>
                          </div>
                          <div className="max-h-[240px] overflow-y-auto">
                            {MOCK_TEAM_MEMBERS.filter(m => m.status === "accepted" && !(form.managers || []).some(fm => fm.id === m.id)).map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
                                onClick={() => setForm({ ...form, managers: [...(form.managers || []), member] })}
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-primary">{member.name.split(" ").map(n => n[0]).join("")}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                              </button>
                            ))}
                            {MOCK_TEAM_MEMBERS.filter(m => m.status === "accepted" && !(form.managers || []).some(fm => fm.id === m.id)).length === 0 && (
                              <div className="px-3 py-4 text-sm text-muted-foreground text-center">All team members added</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {(form.managers || []).length > 0 ? (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Role</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Email</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Mobile No.</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Last Seen</th>
                              <th className="px-4 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(form.managers || []).map((mgr) => {
                              const lastSeenDate = new Date(mgr.lastSeen);
                              const now = new Date();
                              const diffMs = now.getTime() - lastSeenDate.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHrs = Math.floor(diffMins / 60);
                              const diffDays = Math.floor(diffHrs / 24);
                              let lastSeenText = "";
                              if (diffMins < 5) lastSeenText = "Online";
                              else if (diffMins < 60) lastSeenText = `${diffMins}m ago`;
                              else if (diffHrs < 24) lastSeenText = `${diffHrs}h ago`;
                              else lastSeenText = `${diffDays}d ago`;

                              return (
                                <tr key={mgr.id} className="group border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-semibold text-primary">{mgr.name.split(" ").map(n => n[0]).join("")}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-foreground">{mgr.name}</span>
                                        {mgr.role === "Owner" && (
                                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Owner</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{mgr.role}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{mgr.email}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{mgr.phone}</td>
                                  <td className="px-4 py-3">
                                    <span className={cn("text-xs", lastSeenText === "Online" ? "text-green-600 font-medium" : "text-muted-foreground")}>
                                      {lastSeenText}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {mgr.role !== "Owner" && (
                                      <button
                                        type="button"
                                        onClick={() => setForm({ ...form, managers: (form.managers || []).filter(m => m.id !== mgr.id) })}
                                        className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-muted-foreground">No managers assigned yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Click "Add Manager" to assign team members</p>
                      </div>
                    )}
                </div>

                {/* Location Contact Information */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Location Contact Information" />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Primary Contact Number (Optional)</Label>
                    <PhoneNumberInput value={form.storePrimaryPhone} onChange={(phone) => setForm({ ...form, storePrimaryPhone: phone })} placeholder="Enter contact number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Emails</Label>
                    <div className="flex flex-wrap items-center gap-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm min-h-[36px]">
                      {(form.storeEmails || []).map((email, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded text-xs font-medium h-fit">
                          {email}
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, storeEmails: (form.storeEmails || []).filter((_, idx) => idx !== i) })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (emailInputError) setEmailInputError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && emailInput.trim()) {
                            e.preventDefault();
                            if (isValidEmail(emailInput.trim())) {
                              if ((form.storeEmails || []).includes(emailInput.trim())) {
                                setEmailInputError("This email is already added");
                              } else {
                                setForm({ ...form, storeEmails: [...(form.storeEmails || []), emailInput.trim()] });
                                setEmailInput("");
                                setEmailInputError("");
                              }
                            } else {
                              setEmailInputError("Enter a valid email address (e.g. name@example.com)");
                            }
                          }
                        }}
                        placeholder={(form.storeEmails || []).length === 0 ? "Enter email and press enter" : ""}
                        className="flex-1 min-w-[150px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    {emailInputError && (
                      <p className="text-[11px] text-destructive mt-1">{emailInputError}</p>
                    )}
                  </div>
                </div>

                {/* Return Routing */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Return Routing" />
                  <div className="flex items-start gap-3">
                    <Switch
                      checked={form.returnToAnother}
                      onCheckedChange={(checked) => setForm({ ...form, returnToAnother: checked })}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Return products to another location</p>
                      <p className="text-xs text-muted-foreground">Use this option to send all the returned products to another warehouse or retail store</p>
                    </div>
                  </div>
                  {form.returnToAnother && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Select Return Location</Label>
                      <Select value={form.returnAddressId} onValueChange={(v) => setForm({ ...form, returnAddressId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                        <SelectContent>
                          {locations.map((loc, i) => (
                            <SelectItem key={i} value={loc.locationName}>{loc.locationName}</SelectItem>
                          ))}
                          {locations.length === 0 && (
                            <SelectItem value="none" disabled>No other locations available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Custom Data */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <SectionHeader title="Custom Data" icon />
                  <p className="text-sm text-muted-foreground text-center py-6">No custom data fields available</p>
                </div>

                <ExtensionBlocks blocks={extensionBlocks.overview} onBlocksChange={(b) => updateExtBlocks("overview", b)} />
              </TabsContent>

              {/* ==================== OPERATIONS TAB ==================== */}
              <TabsContent value="operations" className="space-y-4 mt-4">
                {/* Processing & Capacity */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Processing & Capacity" />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Default Order Processing Time</Label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        min="0"
                        value={form.avgOrderProcessingTime}
                        onChange={(e) => setForm({ ...form, avgOrderProcessingTime: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="Enter time"
                        className="max-w-[200px]"
                      />
                      <Select value={form.avgOrderProcessingUnit} onValueChange={(v) => setForm({ ...form, avgOrderProcessingUnit: v })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hours">Hours</SelectItem>
                          <SelectItem value="Minutes">Minutes</SelectItem>
                          <SelectItem value="Days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Capacity Limits Toggle */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-foreground">Enable Capacity Limits</Label>
                      </div>
                      <Switch checked={form.capacityEnabled} onCheckedChange={(v) => { setForm({ ...form, capacityEnabled: v, ...(!v ? { autoPauseOnCapacity: false } : {}) }); if (!v) setCapacityAttempted(false); }} />
                    </div>
                    {capacityAttempted && !isCapacityValid && (
                      <p className="text-xs text-destructive">At least one capacity limit (orders per day, per hour, or concurrent orders) is required when capacity limits are enabled.</p>
                    )}

                    {form.capacityEnabled && (
                      <div className="space-y-5 pl-0">
                        {/* Order Volume Limits */}
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Volume Limits</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">Maximum Orders Per Day</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px]"><p>Applies only to fulfillment orders and not in-person orders.</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Input type="number" min="0" value={form.maxOrdersPerDay} onChange={(e) => setForm({ ...form, maxOrdersPerDay: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Optional" className="max-w-full" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">Maximum Orders Per Hour</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px]"><p>Applies only to fulfillment orders and not in-person orders.</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Input type="number" min="0" value={form.maxOrdersPerHour} onChange={(e) => setForm({ ...form, maxOrdersPerHour: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Optional" className="max-w-full" />
                            </div>
                          </div>
                        </div>

                        {/* Concurrent Workload Limit */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Concurrent Workload Limit</p>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground">Maximum Concurrent Orders</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px]"><p>Maximum number of active fulfillment orders that can be processed simultaneously. An order is counted from the time it is placed until it is marked as handed over.</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input type="number" min="0" value={form.maxConcurrentOrders} onChange={(e) => setForm({ ...form, maxConcurrentOrders: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Optional" className="max-w-[200px]" />
                        </div>

                        {/* Auto Control */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto Control</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-sm text-foreground">Auto-Pause When Capacity Reached</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[280px]"><p>If enabled, the location will stop receiving new fulfillment allocations when capacity limits are reached. Demand generation will continue. Orders may be routed to other eligible locations or remain unallocated based on routing configuration.</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Switch checked={form.autoPauseOnCapacity} onCheckedChange={(v) => setForm({ ...form, autoPauseOnCapacity: v })} />
                          </div>
                          {form.autoPauseOnCapacity && !form.maxOrdersPerDay.trim() && !form.maxOrdersPerHour.trim() && !form.maxConcurrentOrders.trim() && (
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                              Define at least one capacity limit to enable auto-pause.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Configuration */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <SectionHeader title="Shipping Configuration" />
                  <div className="mt-2">
                    <SettingRow icon label="Bulk Shipment" description="Enable to combine one or more products into one shipment" checked={form.settings.bulkShipment} onChange={(v) => updateSettings("bulkShipment", v)} />
                    <SettingRow icon label="Multi-Piece Shipment" description="Enable the option to create multiple packages within a single shipment" checked={form.settings.multiPieceShipment} onChange={(v) => updateSettings("multiPieceShipment", v)} />
                  </div>
                </div>

                {/* Operational Hours */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Operational Hours" description="Set the operational timing for your selling location" />
                  {DAYS.map((day) => (
                    <TimingRow key={day} day={day} timing={form.operationalTiming[day]} onChange={(t) => updateOpTiming(day, t)} />
                  ))}
                </div>

                {/* Order Acceptance Hours */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Order Acceptance Hours" />
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <Checkbox
                        checked={form.orderAcceptanceSameAsOp}
                        onCheckedChange={(c) => setForm({ ...form, orderAcceptanceSameAsOp: !!c, ...(c ? { orderAcceptanceTiming: { ...form.operationalTiming } } : {}) })}
                      />
                      Same as operational timing
                    </label>
                  </div>
                  {DAYS.map((day) => (
                    <TimingRow
                      key={day}
                      day={day}
                      timing={form.orderAcceptanceSameAsOp ? form.operationalTiming[day] : form.orderAcceptanceTiming[day]}
                      onChange={(t) => setForm({ ...form, orderAcceptanceTiming: { ...form.orderAcceptanceTiming, [day]: t } })}
                      disabled={form.orderAcceptanceSameAsOp}
                    />
                  ))}
                </div>

                {/* Holidays */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Holidays" description="Manage your holidays here" />
                    <Button variant="outline" size="sm" onClick={() => { setEditingHoliday(null); setHolidayModalOpen(true); }}>Add Holiday</Button>
                  </div>
                  {form.holidays.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No holidays added</p>
                  ) : (
                    <div className="space-y-2">
                      {form.holidays.map((h) => (
                        <div key={h.id} className="group flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{h.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatHolidayDate(h.fromDate)} to {formatHolidayDate(h.toDate)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{h.type}</span>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <div className="w-px h-4 bg-border" />
                              <button onClick={() => { setEditingHoliday(h); setHolidayModalOpen(true); }} className="text-muted-foreground hover:text-foreground p-1">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setForm({ ...form, holidays: form.holidays.filter((x) => x.id !== h.id) })} className="text-muted-foreground hover:text-destructive p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <ExtensionBlocks blocks={extensionBlocks.operations} onBlocksChange={(b) => updateExtBlocks("operations", b)} />
              </TabsContent>

              {/* ==================== SALES CHANNELS TAB ==================== */}
              <TabsContent value="sales-channels" className="space-y-4 mt-4">
                {channelConfigs.map((channel) => {
                  const status = getChannelStatus(channel.sources);
                  const activeSince = getChannelActiveSince(channel.sources);
                  const statusVariant = status === "Active" ? "success" : status === "Partially Active" ? "warning" : "muted";
                  return (
                    <div key={channel.id} className="bg-card border border-border rounded-lg">
                      {/* Header */}
                      <div className="p-5 border-b border-border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-foreground">{channel.name}</h3>
                            <Badge variant={statusVariant}>{status}</Badge>
                            {channel.type === "extension" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Extension</span>
                            )}
                          </div>
                          <button className="text-xs font-medium text-primary hover:underline" onClick={() => setHistorySheet({ channelId: channel.id })}>View History</button>
                        </div>
                      </div>

                      {/* Ordering Sources */}
                      <div className="p-5">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-foreground">Order Sources</p>
                          <p className="text-xs text-muted-foreground">Define where this location can accept orders from.</p>
                        </div>
                        <div className="space-y-0">
                          {channel.sources.map((source) => (
                            <div key={source.key} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-foreground font-medium">{source.label}</span>
                                  {source.key === "storefront" && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                                            <Info className="w-3.5 h-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[220px]">
                                          <p>Enabling will activate storefront and Store OS endless aisle mode</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-[11px] text-muted-foreground text-right whitespace-nowrap">
                                  {source.status.enabled && source.status.activeSince
                                    ? `Active since ${format(parse(source.status.activeSince, "yyyy-MM-dd", new Date()), "dd MMM, yyyy")}`
                                    : source.status.inactiveSince
                                      ? `Inactive since ${format(parse(source.status.inactiveSince, "yyyy-MM-dd", new Date()), "dd MMM, yyyy")}`
                                      : "Not configured"}
                                  <br />
                                  <span className="text-muted-foreground/70">Last updated by {source.status.lastModifiedBy} {format(parse(source.status.lastModifiedAt, "yyyy-MM-dd", new Date()), "dd MMM, yyyy")}</span>
                                </p>
                                <Switch
                                  checked={source.status.enabled}
                                  onCheckedChange={(checked) => {
                                    setChannelConfigs((prev) =>
                                      prev.map((ch) =>
                                        ch.id === channel.id
                                          ? {
                                              ...ch,
                                              lastUpdatedBy: "You",
                                              lastUpdatedAt: format(new Date(), "yyyy-MM-dd"),
                                              sources: ch.sources.map((s) =>
                                                s.key === source.key
                                                  ? {
                                                      ...s,
                                                      status: {
                                                        ...s.status,
                                                        enabled: checked,
                                                        activeSince: checked ? format(new Date(), "yyyy-MM-dd") : s.status.activeSince,
                                                        inactiveSince: !checked ? format(new Date(), "yyyy-MM-dd") : null,
                                                        lastModifiedBy: "You",
                                                        lastModifiedAt: format(new Date(), "yyyy-MM-dd"),
                                                        // Only add history for activation; deactivation history added on save with reason
                                                        history: checked
                                                          ? [{ status: "Activated", changedBy: "You", date: format(new Date(), "yyyy-MM-dd") }, ...s.status.history]
                                                          : s.status.history,
                                                      },
                                                    }
                                                  : s
                                              ),
                                            }
                                          : ch
                                      )
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Unified History Sheet (multi-level) */}
                <Sheet open={!!historySheet} onOpenChange={(v) => !v && setHistorySheet(null)}>
                  <SheetContent className="w-[440px] sm:w-[500px]">
                    {historySheet && (() => {
                      const ch = channelConfigs.find((c) => c.id === historySheet.channelId);
                      if (!ch) return null;

                      // Source-level view (with back button)
                      if (historySheet.sourceKey) {
                        const src = ch.sources.find((s) => s.key === historySheet.sourceKey);
                        if (!src) return null;
                        return (
                          <>
                            <SheetHeader>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setHistorySheet({ channelId: historySheet.channelId })} className="text-muted-foreground hover:text-foreground -ml-1">
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                                <SheetTitle className="text-base">{ch.name} — {src.label}</SheetTitle>
                              </div>
                            </SheetHeader>
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <Badge variant={src.status.enabled ? "success" : "muted"}>{src.status.enabled ? "Active" : "Inactive"}</Badge>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">{src.status.enabled ? "Active Since" : "Inactive Since"}</p>
                                  <p className="text-sm font-medium text-foreground">
                                    {(src.status.enabled ? src.status.activeSince : src.status.inactiveSince)
                                      ? format(parse((src.status.enabled ? src.status.activeSince : src.status.inactiveSince)!, "yyyy-MM-dd", new Date()), "dd MMM, yyyy")
                                      : "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Last Modified By</p>
                                  <p className="text-sm font-medium text-foreground">{src.status.lastModifiedBy}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Last Modified At</p>
                                  <p className="text-sm font-medium text-foreground">
                                    {format(parse(src.status.lastModifiedAt, "yyyy-MM-dd", new Date()), "dd MMM, yyyy")}
                                  </p>
                                </div>
                              </div>
                              <div className="border-t border-border pt-4">
                                <p className="text-sm font-semibold text-foreground mb-3">Status History</p>
                                <div className="border border-border rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-muted/50">
                                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Changed By</th>
                                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {src.status.history.map((h, i) => (
                                        <tr key={i} className="border-t border-border">
                                          <td className="px-3 py-2">
                                            <Badge variant={h.status === "Activated" ? "success" : "muted"} className="text-[10px]">{h.status}</Badge>
                                          </td>
                                          <td className="px-3 py-2 text-foreground">{h.changedBy}</td>
                                          <td className="px-3 py-2 text-muted-foreground">{h.date}</td>
                                          <td className="px-3 py-2 text-muted-foreground">{h.reason || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      }

                      // Channel-level view
                      const status = getChannelStatus(ch.sources);
                      const allHistory = ch.sources.flatMap((s) =>
                        s.status.history.map((h) => ({ ...h, sourceLabel: s.label }))
                      ).sort((a, b) => b.date.localeCompare(a.date));
                      return (
                        <>
                          <SheetHeader>
                            <SheetTitle className="text-base">{ch.name} — Channel History</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Current Status</p>
                                <Badge variant={status === "Active" ? "success" : status === "Partially Active" ? "warning" : "muted"}>{status}</Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Last Updated By</p>
                                <p className="text-sm font-medium text-foreground">{ch.lastUpdatedBy}</p>
                              </div>
                            </div>

                            {/* Per-source summary */}
                            <div className="border-t border-border pt-4">
                              <p className="text-sm font-semibold text-foreground mb-3">Source Status Summary</p>
                              <div className="space-y-2">
                                {ch.sources.map((s) => (
                                  <div key={s.key} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg">
                                    <span className="text-sm text-foreground">{s.label}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={s.status.enabled ? "success" : "muted"} className="text-[10px]">
                                        {s.status.enabled ? "Active" : "Inactive"}
                                      </Badge>
                                      <button
                                        onClick={() => setHistorySheet({ channelId: ch.id, sourceKey: s.key })}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <ChevronRight className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Combined timeline */}
                            <div className="border-t border-border pt-4">
                              <p className="text-sm font-semibold text-foreground mb-3">Activity Timeline</p>
                              <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Source</th>
                                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">By</th>
                                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allHistory.map((h, i) => (
                                      <tr key={i} className="border-t border-border">
                                        <td className="px-3 py-2 text-foreground">{h.sourceLabel}</td>
                                        <td className="px-3 py-2">
                                          <span className={cn("text-xs font-medium", h.status === "Activated" ? "text-success" : "text-muted-foreground")}>{h.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">{h.changedBy}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{h.date}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{h.reason || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </SheetContent>
                </Sheet>

                {/* Deactivation Reason Dialog */}
                <Dialog open={!!deactivateReasonModal} onOpenChange={(v) => !v && setDeactivateReasonModal(null)}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reason for Deactivation</DialogTitle>
                    </DialogHeader>
                    {deactivateReasonModal && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Please provide a reason for deactivating the following order source(s):</p>
                        
                        {deactivateReasonModal.items.length > 1 && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={deactivateReasonModal.applyToAll}
                              onCheckedChange={(c) => setDeactivateReasonModal({ ...deactivateReasonModal, applyToAll: !!c })}
                            />
                            <span className="text-sm text-foreground">Apply same reason to all</span>
                          </label>
                        )}

                        {deactivateReasonModal.applyToAll ? (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Reason for {deactivateReasonModal.items.map((i) => i.sourceLabel).join(", ")}
                            </Label>
                            <Input
                              value={deactivateReasonModal.sharedReason}
                              onChange={(e) => setDeactivateReasonModal({ ...deactivateReasonModal, sharedReason: e.target.value })}
                              placeholder="Enter reason for deactivation"
                            />
                          </div>
                        ) : (
                          deactivateReasonModal.items.map((item) => {
                            const key = `${item.channelId}::${item.sourceKey}`;
                            return (
                              <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{item.channelName} — {item.sourceLabel}</Label>
                                <Input
                                  value={deactivateReasonModal.reasons[key] || ""}
                                  onChange={(e) => setDeactivateReasonModal({ ...deactivateReasonModal, reasons: { ...deactivateReasonModal.reasons, [key]: e.target.value } })}
                                  placeholder="Enter reason for deactivation"
                                />
                              </div>
                            );
                          })
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={() => setDeactivateReasonModal(null)}>Cancel</Button>
                          <Button
                            onClick={() => {
                              let reasons = deactivateReasonModal.reasons;
                              if (deactivateReasonModal.applyToAll) {
                                reasons = {};
                                deactivateReasonModal.items.forEach((item) => {
                                  reasons[`${item.channelId}::${item.sourceKey}`] = deactivateReasonModal.sharedReason;
                                });
                              }
                              setDeactivateReasonModal(null);
                              completeSave(reasons);
                            }}
                            disabled={
                              deactivateReasonModal.applyToAll
                                ? !deactivateReasonModal.sharedReason.trim()
                                : deactivateReasonModal.items.some((item) => !deactivateReasonModal.reasons[`${item.channelId}::${item.sourceKey}`]?.trim())
                            }
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <ExtensionBlocks blocks={extensionBlocks["sales-channels"]} onBlocksChange={(b) => updateExtBlocks("sales-channels", b)} />
              </TabsContent>

              {/* ==================== INFRASTRUCTURE TAB ==================== */}
              <TabsContent value="infrastructure" className="space-y-4 mt-4">
                {/* Location Layout */}
                {(() => {
                  const ZONES_PER_PAGE = 5;

                  const sanitizeZoneName = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "");

                  const validateZoneName = (name: string, currentId: string): string => {
                    if (!name.trim()) return "";
                    const dup = form.infrastructure.zones.some(z => z.id !== currentId && z.name === name);
                    if (dup) return "Zone name must be unique";
                    return "";
                  };

                  const filteredZones = form.infrastructure.zones.filter(z => {
                    if (!zoneSearch.trim()) return true;
                    const q = zoneSearch.toLowerCase();
                    return z.name.toLowerCase().includes(q) || z.tags.some(t => t.toLowerCase().includes(q));
                  });

                  const totalPages = Math.max(1, Math.ceil(filteredZones.length / ZONES_PER_PAGE));
                  const safePage = Math.min(zonePage, totalPages);
                  const pagedZones = filteredZones.slice((safePage - 1) * ZONES_PER_PAGE, safePage * ZONES_PER_PAGE);

                  return (
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Location Layout" description="Define zones within this location for organized storage and picking." />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      const newId = crypto.randomUUID();
                      const newZone: Zone = { id: newId, name: "", type: "storage", defaultStorage: false, defaultPicking: false, notes: "", tags: [], maxOnHand: "" };
                      setForm({ ...form, infrastructure: { ...form.infrastructure, zones: [...form.infrastructure.zones, newZone] } });
                      // New zones with empty name stay expanded automatically
                    }}>
                      <Plus className="w-3.5 h-3.5" /> Add Zone
                    </Button>
                  </div>

                  {form.infrastructure.zones.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={zoneSearch}
                        onChange={(e) => { setZoneSearch(e.target.value); setZonePage(1); }}
                        placeholder="Search by zone name or tag..."
                        className="pl-9"
                      />
                    </div>
                  )}

                  {form.infrastructure.zones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-border rounded-lg">
                      <p className="text-sm text-muted-foreground">No zones added yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Click "Add Zone" to define storage and picking areas</p>
                    </div>
                  ) : filteredZones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-border rounded-lg">
                      <p className="text-sm text-muted-foreground">No zones match your search</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pagedZones.map((zone) => {
                        const zi = form.infrastructure.zones.findIndex(z => z.id === zone.id);
                        // New zones (empty name) stay expanded; named zones collapse by default unless explicitly expanded
                        const isExpanded = expandedZones.has(zone.id) || zone.name.trim() === "";
                        return (
                        <div key={zone.id} className="border border-border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => {
                              if (zone.name.trim() === "") return;
                              setExpandedZones(prev => {
                                const next = new Set(prev);
                                if (next.has(zone.id)) next.delete(zone.id); else next.add(zone.id);
                                return next;
                              });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                              <p className="text-sm font-semibold text-foreground">{zone.name.trim() || `Zone ${zi + 1}`}</p>
                              {zone.type && <Badge variant="outline" className="text-[10px] capitalize">{zone.type}</Badge>}
                              {zone.tags.length > 0 && <span className="text-[10px] text-muted-foreground">· {zone.tags.length} tag{zone.tags.length > 1 ? "s" : ""}</span>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setForm({ ...form, infrastructure: { ...form.infrastructure, zones: form.infrastructure.zones.filter((z) => z.id !== zone.id) } }); }} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Zone Name<span className="text-destructive">*</span></Label>
                              <Input
                                value={zone.name}
                                onChange={(e) => {
                                  const sanitized = sanitizeZoneName(e.target.value);
                                  const zones = [...form.infrastructure.zones];
                                  zones[zi] = { ...zones[zi], name: sanitized };
                                  setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                                  const err = validateZoneName(sanitized, zone.id);
                                  setZoneNameErrors(prev => ({ ...prev, [zone.id]: err }));
                                }}
                              placeholder="e.g. AISLE_A, COLD-STORAGE"
                                className={cn(zoneNameErrors[zone.id] && "border-destructive", "font-mono")}
                              />
                              {zoneNameErrors[zone.id] && <p className="text-xs text-destructive">{zoneNameErrors[zone.id]}</p>}
                              <p className="text-[10px] text-muted-foreground">Uppercase, numbers, _ and - only. Must be unique.</p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Zone Type</Label>
                              <Select
                                value={zone.type}
                                onValueChange={(v) => {
                                  const zones = [...form.infrastructure.zones];
                                  zones[zi] = { ...zones[zi], type: v };
                                  setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                                }}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="storage">Storage</SelectItem>
                                  <SelectItem value="picking">Picking</SelectItem>
                                  <SelectItem value="receiving">Receiving</SelectItem>
                                  <SelectItem value="staging">Staging</SelectItem>
                                  <SelectItem value="returns">Returns</SelectItem>
                                  <SelectItem value="cold">Cold Storage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Tags</Label>
                            <MultiSelectTags
                              selectedValues={zone.tags}
                              onChange={(tags) => {
                                const zones = [...form.infrastructure.zones];
                                zones[zi] = { ...zones[zi], tags };
                                setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                              }}
                              onCreateNew={(name) => {
                                const zones = [...form.infrastructure.zones];
                                zones[zi] = { ...zones[zi], tags: [...zones[zi].tags, name] };
                                setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                              }}
                              options={[
                                { value: "fragile", label: "Fragile" },
                                { value: "high-value", label: "High Value" },
                                { value: "temperature-controlled", label: "Temperature Controlled" },
                                { value: "hazardous", label: "Hazardous" },
                                { value: "bulk", label: "Bulk" },
                                { value: "fast-moving", label: "Fast Moving" },
                              ]}
                              placeholder="Add tags..."
                            />
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={zone.defaultStorage}
                                onCheckedChange={(c) => {
                                  const zones = [...form.infrastructure.zones];
                                  if (c) zones.forEach((z, i) => { zones[i] = { ...z, defaultStorage: i === zi }; });
                                  else zones[zi] = { ...zones[zi], defaultStorage: false };
                                  setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                                }}
                              />
                              <span className="text-sm text-foreground">Default Storage Zone</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={zone.defaultPicking}
                                onCheckedChange={(c) => {
                                  const zones = [...form.infrastructure.zones];
                                  if (c) zones.forEach((z, i) => { zones[i] = { ...z, defaultPicking: i === zi }; });
                                  else zones[zi] = { ...zones[zi], defaultPicking: false };
                                  setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                                }}
                              />
                              <span className="text-sm text-foreground">Default Picking Zone</span>
                            </label>
                          </div>

                          {/* Zone-level Max On-hand (only if zone-level capacity enabled) */}
                          {form.infrastructure.enableZoneLevelCapacity && form.infrastructure.capacityType !== "none" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">
                                Max On-hand ({form.infrastructure.capacityType === "unit" ? "Units" : form.infrastructure.capacityType === "value" ? "Value (₹)" : "Volume (m³)"})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={zone.maxOnHand}
                                onChange={(e) => {
                                  const zones = [...form.infrastructure.zones];
                                  zones[zi] = { ...zones[zi], maxOnHand: e.target.value.replace(/[^0-9.]/g, "") };
                                  setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                                }}
                                placeholder="Zone-level capacity limit"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Notes</Label>
                            <Input
                              value={zone.notes}
                              onChange={(e) => {
                                const zones = [...form.infrastructure.zones];
                                zones[zi] = { ...zones[zi], notes: e.target.value };
                                setForm({ ...form, infrastructure: { ...form.infrastructure, zones } });
                              }}
                              placeholder="Optional notes about this zone"
                            />
                          </div>
                          </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredZones.length > ZONES_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Showing {((safePage - 1) * ZONES_PER_PAGE) + 1}–{Math.min(safePage * ZONES_PER_PAGE, filteredZones.length)} of {filteredZones.length} zones
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setZonePage(safePage - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setZonePage(safePage + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </div>
                  );
                })()}

                {/* Stock Capacity */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="Stock Capacity" description="Define the maximum inventory this location can hold." />

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Inventory Capacity Type</Label>
                    <Select
                      value={form.infrastructure.capacityType}
                      onValueChange={(v: "none" | "unit" | "value" | "volume") => setForm({ ...form, infrastructure: { ...form.infrastructure, capacityType: v, maxCapacity: "", reorderBuffer: "" } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="unit" description="Track capacity by number of units">Unit-Based</SelectItem>
                        <SelectItem value="value" description="Track capacity by monetary value">Value-Based</SelectItem>
                        <SelectItem value="volume" description="Track capacity by physical volume">Volume-Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.infrastructure.capacityType !== "none" && (() => {
                    const unitLabel = form.infrastructure.capacityType === "unit" ? "Units" : form.infrastructure.capacityType === "value" ? "Value (₹)" : "Volume (m³)";
                    return (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Max On-hand ({unitLabel})
                              {form.infrastructure.enableZoneLevelCapacity && (
                                <span className="ml-1 text-[10px] text-primary">(acts as cap across zones)</span>
                              )}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={form.infrastructure.maxCapacity}
                              onChange={(e) => setForm({ ...form, infrastructure: { ...form.infrastructure, maxCapacity: e.target.value.replace(/[^0-9.]/g, '') } })}
                              placeholder={`Enter max ${unitLabel.toLowerCase()}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Reorder Buffer ({unitLabel})</Label>
                            <Input
                              type="number"
                              min="0"
                              value={form.infrastructure.reorderBuffer}
                              onChange={(e) => setForm({ ...form, infrastructure: { ...form.infrastructure, reorderBuffer: e.target.value.replace(/[^0-9.]/g, '') } })}
                              placeholder={`Enter buffer ${unitLabel.toLowerCase()}`}
                            />
                          </div>
                        </div>

                        {/* Allow Overflow */}
                        <div className="border-t border-border pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Allow Overflow</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Allow inventory to exceed the defined capacity limits</p>
                            </div>
                            <Switch
                              checked={form.infrastructure.allowOverflow}
                              onCheckedChange={(c) => setForm({ ...form, infrastructure: { ...form.infrastructure, allowOverflow: c } })}
                              className="shrink-0 mt-0.5"
                            />
                          </div>
                        </div>

                        {form.infrastructure.allowOverflow && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Overflow Handling</Label>
                            <Select
                              value={form.infrastructure.overflowHandling}
                              onValueChange={(v: "allow-flag" | "require-approval" | "block") => setForm({ ...form, infrastructure: { ...form.infrastructure, overflowHandling: v } })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="allow-flag" description="Allow overflow and flag for review">Allow &amp; Flag</SelectItem>
                                <SelectItem value="require-approval" description="Require manager approval before overflow">Require Approval</SelectItem>
                                <SelectItem value="block" description="Block controlled inward transfers only">Block Controlled Transfers</SelectItem>
                              </SelectContent>
                            </Select>
                            {form.infrastructure.overflowHandling === "block" && (
                              <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                                <p className="text-xs font-medium text-foreground mb-1">System Rule</p>
                                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                  <li>Applies only to controlled inward movements</li>
                                  <li>Does not block customer returns or transfer returns</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Enable Zone-Level Capacity */}
                        <div className="border-t border-border pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Enable Zone-Level Capacity</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Location-level capacity becomes the max cap across all zones. Each zone gets its own Max On-hand limit.
                              </p>
                              {form.infrastructure.enableZoneLevelCapacity && (
                                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Zone-level limits control enforcement for Max On-hand</li>
                                    <li>Reorder Buffer and Overflow config remain at location level only</li>
                                  </ul>
                                </div>
                              )}
                            </div>
                            <Switch
                              checked={form.infrastructure.enableZoneLevelCapacity}
                              onCheckedChange={(c) => setForm({ ...form, infrastructure: { ...form.infrastructure, enableZoneLevelCapacity: c } })}
                              className="shrink-0 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <ExtensionBlocks blocks={extensionBlocks.infrastructure} onBlocksChange={(b) => updateExtBlocks("infrastructure", b)} />
              </TabsContent>


              <TabsContent value="compliance" className="space-y-4 mt-4">
                {/* GST Details */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <SectionHeader title="GST Details" description="Provide GST details. Don't have GST? Know how to get GST" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Name on GST</Label>
                      <Input value={form.gstName} onChange={(e) => setForm({ ...form, gstName: e.target.value })} placeholder="For eg: John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">GST Number</Label>
                      <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="For eg: 18AABCT3518Q1ZV" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Upload GST Document</Label>
                    {form.gstDocument ? (
                      <div className="border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{form.gstDocument.name}</span>
                          <p className="text-xs text-muted-foreground">{(form.gstDocument.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => setForm({ ...form, gstDocument: null })} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-4 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary flex flex-col items-center justify-center gap-1 shrink-0">
                          <Upload className="w-5 h-5 text-primary" />
                          <span className="text-[10px] text-primary font-medium">Add Media</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">Upload your GST document</p>
                          <ul className="list-disc list-inside text-xs">
                            <li>Accepted formats: JPG, PNG, PDF</li>
                            <li>Max size: 5MB</li>
                          </ul>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 5 * 1024 * 1024) {
                              setForm({ ...form, gstDocument: file });
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Regulatory Settings */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <SectionHeader title="Regulatory Settings" />
                  <div className="mt-2">
                    <SettingRow icon label="Generate e-Way Bill" description="Enable this if you're shipping in bulk and the value of transported shipment is greater than ₹50,000" checked={form.settings.eWayBill} onChange={(v) => updateSettings("eWayBill", v)} />
                    <SettingRow icon label="Generate e-Invoice" description="Enable this if you do B2B transactions and have a turnover of more than ₹50 crores in a financial year" checked={form.settings.eInvoice} onChange={(v) => updateSettings("eInvoice", v)} />
                  </div>
                </div>

                <ExtensionBlocks blocks={extensionBlocks.compliance} onBlocksChange={(b) => updateExtBlocks("compliance", b)} />
              </TabsContent>

              {/* ==================== AUTOMATION TAB ==================== */}
              <TabsContent value="automation" className="space-y-4 mt-4">
                {/* Billing Automation */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <SectionHeader title="Billing Automation" />
                  <div className="mt-2">
                    <SettingRow icon label="Auto Invoice Generation" description="Enable to auto generate invoices" checked={form.settings.autoInvoice} onChange={(v) => updateSettings("autoInvoice", v)} />
                    <SettingRow icon label="Auto Credit Note Generation" description="Enable to auto generate credit notes" checked={form.settings.autoCreditNote} onChange={(v) => updateSettings("autoCreditNote", v)} />
                  </div>
                </div>

                {/* Inventory Automation */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <SectionHeader title="Inventory Automation" />
                  <div className="mt-2">
                    <SettingRow icon label="Auto Return Inventory Sync" description="Enable to automatically add returned items to sellable inventory if quality check is good, or to damaged inventory if it's bad" checked={form.settings.autoReturnInventorySync} onChange={(v) => updateSettings("autoReturnInventorySync", v)} />
                  </div>
                </div>

                <ExtensionBlocks blocks={extensionBlocks.automation} onBlocksChange={(b) => updateExtBlocks("automation", b)} />
              </TabsContent>
            </Tabs>
          </div>

          <AddAddressModal open={addressModalOpen} onOpenChange={setAddressModalOpen} onSave={(addr) => setForm({ ...form, addresses: [...form.addresses, addr] })} />
          <AddHolidayModal
            open={holidayModalOpen}
            onOpenChange={(v) => { setHolidayModalOpen(v); if (!v) setEditingHoliday(null); }}
            editHoliday={editingHoliday}
            onSave={(h) => {
              if (editingHoliday) {
                setForm({ ...form, holidays: form.holidays.map((x) => (x.id === h.id ? h : x)) });
              } else {
                setForm({ ...form, holidays: [...form.holidays, h] });
              }
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const locationTypeLabel = (t: string) => {
    switch (t) {
      case "highstreet": return "HighStreet";
      case "mall": return "Mall";
      case "warehouse": return "Warehouse";
      default: return t;
    }
  };

  const ORDER_SOURCE_OPTIONS = [
    { value: "storefront", label: "Storefront" },
    { value: "pos", label: "POS" },
    { value: "kiosk", label: "Kiosk" },
    { value: "scan-go", label: "Scan & Go" },
    { value: "amazon", label: "Amazon" },
    { value: "flipkart", label: "Flipkart" },
  ];

  const LOCATION_TYPE_OPTIONS = [
    { value: "highstreet", label: "HighStreet" },
    { value: "mall", label: "Mall" },
    { value: "warehouse", label: "Warehouse" },
  ];

  const CAPACITY_FILTER_OPTIONS = [
    { value: "Within Limit", label: "Within Limit" },
    { value: "Near Capacity", label: "Near Capacity" },
    { value: "Capacity Reached", label: "Capacity Reached" },
    { value: "Not Configured", label: "Not Configured" },
    { value: "Overflow Active", label: "Overflow Active" },
  ];

  const INVENTORY_HEALTH_OPTIONS = [
    { value: "Healthy", label: "Healthy" },
    { value: "Replenishment Required", label: "Replenishment Required" },
    { value: "Near Stock Limit", label: "Near Stock Limit" },
    { value: "Overflow", label: "Overflow" },
    { value: "Not Configured", label: "Not Configured" },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Location</h1>
          <Button className="gap-2" onClick={() => { setForm(emptyLocation); setEditingIndex(null); setActiveTab("overview"); setVisitedTabs(new Set(["overview"])); setView("form"); }}>
            <Plus className="w-4 h-4" /> Add Location
          </Button>
        </div>

        {locations.length === 0 ? (
          <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-24 px-4">
            <img src={emptyImg} alt="No locations" className="w-28 h-28 mb-4 opacity-80" />
            <h2 className="text-lg font-semibold text-foreground mb-1">No Location Found</h2>
            <p className="text-sm text-muted-foreground mb-6">Once you create locations they will appear here</p>
            <div className="flex items-center gap-3">
              <Button variant="outline">Learn more</Button>
              <Button className="gap-2" onClick={() => { setForm(emptyLocation); setEditingIndex(null); setActiveTab("overview"); setVisitedTabs(new Set(["overview"])); setView("form"); }}>
                <Plus className="w-4 h-4" /> Add Location
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border">
            <Tabs value={listingTab} onValueChange={setListingTab} className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 px-4 md:px-6 gap-4 md:gap-6">
                <TabsTrigger
                  value="locations"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-4 text-sm font-medium flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Locations
                </TabsTrigger>
                <TabsTrigger
                  value="zones"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-4 text-sm font-medium flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Infrastructure Zones
                </TabsTrigger>
              </TabsList>

              {/* ========== LOCATIONS TAB ========== */}
              <TabsContent value="locations" className="mt-0">
                {/* Search & Filter */}
                <div className="flex items-center gap-3 p-3 md:p-4 border-b border-border">
                  <div className="relative flex-1 md:max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by Name, Code, Tags, Address"
                      className="pl-10 h-9"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant={showLocationFilters ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 relative"
                    onClick={() => setShowLocationFilters(!showLocationFilters)}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeLocationFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {activeLocationFilterCount}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Filter Pills */}
                {showLocationFilters && (
                  <div className="flex items-center gap-2 flex-wrap p-3 md:px-4 border-b border-border">
                    <span className="text-sm font-medium text-foreground mr-1">Filters</span>
                    <LocationMultiFilterPill label="Order Source" options={ORDER_SOURCE_OPTIONS} selected={locationFilters.orderSource} onChange={(v) => setLocationFilters(f => ({ ...f, orderSource: v }))} />
                    <LocationMultiFilterPill label="Location Type" options={LOCATION_TYPE_OPTIONS} selected={locationFilters.locationType} onChange={(v) => setLocationFilters(f => ({ ...f, locationType: v }))} />
                    <LocationMultiFilterPill label="Capacity" options={CAPACITY_FILTER_OPTIONS} selected={locationFilters.capacityFilter} onChange={(v) => setLocationFilters(f => ({ ...f, capacityFilter: v }))} />
                    <LocationMultiFilterPill label="Inventory Health" options={INVENTORY_HEALTH_OPTIONS} selected={locationFilters.inventoryHealth} onChange={(v) => setLocationFilters(f => ({ ...f, inventoryHealth: v }))} />
                    {uniqueStates.length > 0 && <LocationMultiFilterPill label="State" options={uniqueStates.map(s => ({ value: s, label: s }))} selected={locationFilters.state} onChange={(v) => setLocationFilters(f => ({ ...f, state: v }))} />}
                    {uniqueCities.length > 0 && <LocationMultiFilterPill label="City" options={uniqueCities.map(c => ({ value: c, label: c }))} selected={locationFilters.city} onChange={(v) => setLocationFilters(f => ({ ...f, city: v }))} />}
                    {uniqueTags.length > 0 && <LocationMultiFilterPill label="Location Tags" options={uniqueTags.map(t => ({ value: t, label: t }))} selected={locationFilters.locationTags} onChange={(v) => setLocationFilters(f => ({ ...f, locationTags: v }))} />}
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Location</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Sales Channels</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Capacity Status</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Inventory Status</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Last Updated</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLocations.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No locations match your search or filters</td></tr>
                      ) : filteredLocations.map(({ loc, idx }) => {
                        const totalSources = channelConfigs.reduce((sum, ch) => sum + ch.sources.length, 0);
                        const activeSources = channelConfigs.reduce((sum, ch) => sum + ch.sources.filter(s => s.status.enabled).length, 0);
                        const capacity = getCapacityDisplay(loc, idx);
                        const inventoryStatus = getInventoryLabel(loc);
                        const lastUpdated = channelConfigs.reduce((latest, ch) => ch.lastUpdatedAt > latest ? ch.lastUpdatedAt : latest, "");

                        return (
                          <tr key={idx} className="group border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setForm({ ...loc }); setEditingIndex(idx); setView("form"); }}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{loc.locationName}</div>
                              {loc.locationCode && <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{loc.locationCode}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{locationTypeLabel(loc.locationType)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-foreground text-sm font-medium">{activeSources}/{totalSources}</span>
                              <span className="text-muted-foreground text-xs ml-1">Sources Active</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                                capacity.variant === "success" && "bg-success/10 text-success",
                                capacity.variant === "warning" && "bg-warning/10 text-warning",
                                capacity.variant === "destructive" && "bg-destructive/10 text-destructive",
                                capacity.variant === "muted" && "bg-muted text-muted-foreground",
                              )}>{capacity.text}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                                inventoryStatus === "Healthy" && "bg-success/10 text-success",
                                (inventoryStatus as string) === "Replenishment Required" && "bg-warning/10 text-warning",
                                (inventoryStatus as string) === "Near Stock Limit" && "bg-warning/10 text-warning",
                                inventoryStatus === "Overflow" && "bg-destructive/10 text-destructive",
                                inventoryStatus === "Not Configured" && "bg-muted text-muted-foreground",
                              )}>{inventoryStatus}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                              {lastUpdated ? (() => { try { return format(new Date(lastUpdated), "dd MMM, yyyy"); } catch { return lastUpdated; } })() : "—"}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="text-muted-foreground hover:text-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover z-50">
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/inventory")}>
                                    <Package className="w-4 h-4" />
                                    View Inventory
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteTarget({ idx, name: loc.locationName })}>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Location
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* ========== INFRASTRUCTURE ZONES TAB ========== */}
              <TabsContent value="zones" className="mt-0">
                <div className="flex items-center gap-3 p-3 md:p-4 border-b border-border">
                  <div className="relative flex-1 md:max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by Zone Name, Location, or Tags"
                      className="pl-10 h-9"
                      value={zoneListSearch}
                      onChange={(e) => setZoneListSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Zone Name</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Location</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Tags</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Defaults</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Zone Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredZonesListing.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          {allZones.length === 0 ? "No infrastructure zones configured across locations" : "No zones match your search"}
                        </td></tr>
                      ) : filteredZonesListing.map((z) => (
                        <tr key={`${z.locIdx}-${z.id}`} className="group border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => {
                          const loc = locations[z.locIdx];
                          setForm({ ...loc });
                          setEditingIndex(z.locIdx);
                          setActiveTab("infrastructure");
                          setView("form");
                        }}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-foreground">{z.name || <span className="text-muted-foreground italic">Unnamed</span>}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-foreground">{z.locationName}</div>
                            {z.locationCode && <div className="font-mono text-[11px] text-muted-foreground">{z.locationCode}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{z.type || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {z.tags.length > 0 ? z.tags.slice(0, 3).map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                              )) : <span className="text-xs text-muted-foreground">—</span>}
                              {z.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{z.tags.length - 3}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {z.defaultStorage && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Storage</span>}
                              {z.defaultPicking && <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info font-medium">Picking</span>}
                              {!z.defaultStorage && !z.defaultPicking && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {z.enableZoneLevelCapacity && z.maxOnHand ? `${z.maxOnHand} ${z.capacityType === "unit" ? "units" : z.capacityType === "value" ? "₹" : z.capacityType === "volume" ? "m³" : ""}` : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Location"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            setLocations(prev => prev.filter((_, i) => i !== deleteTarget.idx));
            setDeleteTarget(null);
          }
        }}
      />
    </DashboardLayout>
  );
}
