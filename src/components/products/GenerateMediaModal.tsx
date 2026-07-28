import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Search, SlidersHorizontal, LayoutGrid, Copy, RefreshCw, Bookmark, Download, ThumbsUp, ThumbsDown, Maximize2, Pencil, Play, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import textToImageIcon from "@/assets/text-to-image.png";
import icAspectRatio from "@/assets/ic-aspect-ratio.svg";
import icModel from "@/assets/ic-model.svg";
import icSparkle from "@/assets/ic-sparkle.svg";
import { supabase } from "@/integrations/supabase/client";

interface GenerateMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesGenerated: (urls: string[]) => void;
}

export function GenerateMediaModal({ open, onOpenChange, onImagesGenerated }: GenerateMediaModalProps) {
  const [prompt, setPrompt] = useState("");
  const [numImages, setNumImages] = useState("4");
  const [aspectRatio, setAspectRatio] = useState("4:3");
  const [model, setModel] = useState("gemini-flash");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lastPrompt, setLastPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const hasGenerated = generatedImages.length > 0 || isGenerating;

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedImages(new Set());
    setLastPrompt(prompt.trim());

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim(), aspectRatio, numImages: parseInt(numImages), referenceImage },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.images?.length) {
        setGeneratedImages(data.images);
      } else {
        throw new Error("No images generated");
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToMedia = () => {
    const selected = selectedImages.size > 0
      ? generatedImages.filter((_, i) => selectedImages.has(i))
      : generatedImages;
    onImagesGenerated(selected);
    setGeneratedImages([]);
    setSelectedImages(new Set());
    setPrompt("");
    setLastPrompt("");
    onOpenChange(false);
  };

  const handleRegenerate = () => {
    if (lastPrompt) {
      handleGenerateWithPrompt(lastPrompt);
    }
  };

  const handleGenerateWithPrompt = async (p: string) => {
    setPrompt(p);
    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedImages(new Set());
    setLastPrompt(p);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: p, aspectRatio, numImages: parseInt(numImages), referenceImage },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.images?.length) {
        setGeneratedImages(data.images);
      } else {
        throw new Error("No images generated");
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(lastPrompt);
    toast({ title: "Prompt copied to clipboard" });
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((img, i) => {
      const a = document.createElement("a");
      a.href = img;
      a.download = `generated-${i + 1}.png`;
      a.click();
    });
  };

  const handleDownloadImage = (img: string, index: number) => {
    const a = document.createElement("a");
    a.href = img;
    a.download = `generated-${index + 1}.png`;
    a.click();
  };

  const toggleSelect = (index: number) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const clearSelection = () => setSelectedImages(new Set());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Generate Media</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-auto bg-muted/30 relative">
          {isGenerating ? (
            <div className="flex-1 p-6 space-y-4">
              {/* Prompt display while generating */}
              <div className="flex items-center gap-3">
                <p className="text-sm text-foreground flex-1 truncate">{lastPrompt}</p>
                <div className="flex items-center gap-1">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center"><Copy className="w-4 h-4 text-muted-foreground/40" /></span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center"><RefreshCw className="w-4 h-4 text-muted-foreground/40" /></span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center"><Bookmark className="w-4 h-4 text-muted-foreground/40" /></span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center"><Download className="w-4 h-4 text-muted-foreground/40" /></span>
                  <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">{aspectRatio}</span>
                </div>
              </div>
              {/* Skeleton cards */}
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: parseInt(numImages) }).map((_, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/60 aspect-[4/3]">
                    <div className="absolute top-2.5 left-2.5">
                      <img src={icSparkle} alt="" className="w-3 h-3 opacity-60" />
                    </div>
                    {/* Bottom progressive fill bar */}
                    <div className="absolute bottom-3 left-3 right-3 h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-muted-foreground/30 rounded-full"
                        style={{
                          animation: `loading-progressive 3s ease-in-out infinite`,
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="flex-1 p-6 space-y-4">
              {/* Search bar - full width */}
              {isSearchOpen ? (
                <div className="flex items-center gap-2 border border-border rounded-lg bg-card px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search generated images..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setIsSearchOpen(true)} className="w-9 h-9 rounded-full border border-border hover:bg-accent transition-colors flex items-center justify-center">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="w-9 h-9 rounded-full border border-border hover:bg-accent transition-colors flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="w-9 h-9 rounded-full border border-border hover:bg-accent transition-colors flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Prompt display with action icons + collapse chevron */}
              <div className="flex items-center gap-3">
                <p className="text-sm text-foreground flex-1 truncate">{lastPrompt}</p>
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyPrompt} className="w-8 h-8 rounded-full hover:bg-accent transition-colors flex items-center justify-center" title="Copy prompt">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={handleRegenerate} className="w-8 h-8 rounded-full hover:bg-accent transition-colors flex items-center justify-center" title="Regenerate">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="w-8 h-8 rounded-full hover:bg-accent transition-colors flex items-center justify-center" title="Bookmark">
                    <Bookmark className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={handleDownloadAll} className="w-8 h-8 rounded-full hover:bg-accent transition-colors flex items-center justify-center" title="Download all">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">{aspectRatio}</span>
                  <button onClick={() => setIsResultsCollapsed(!isResultsCollapsed)} className="w-8 h-8 rounded-full hover:bg-accent transition-colors flex items-center justify-center ml-1" title={isResultsCollapsed ? "Expand" : "Collapse"}>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isResultsCollapsed ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                </div>
              </div>

              {/* 4-image grid with hover overlay & selection */}
              {!isResultsCollapsed && (
                <div className="grid grid-cols-4 gap-3">
                  {generatedImages.map((img, i) => {
                    const isSelected = selectedImages.has(i);
                    return (
                      <div
                        key={i}
                        className={`relative rounded-xl overflow-hidden border-2 bg-card group cursor-pointer transition-all ${isSelected ? "border-primary" : "border-transparent hover:border-border"}`}
                        onClick={() => toggleSelect(i)}
                      >
                        {/* Sparkle icon - visible when not hovered */}
                        <div className="absolute top-2.5 left-2.5 z-10 group-hover:opacity-0 transition-opacity">
                          <img src={icSparkle} alt="" className="w-3 h-3" />
                        </div>

                        {/* Selection checkbox */}
                        <div className={`absolute top-2 left-2 z-20 w-5 h-5 rounded border transition-all ${isSelected ? "opacity-100 bg-primary border-primary" : "opacity-0 group-hover:opacity-100 bg-card/90 border-border"}`}>
                          {isSelected && <Check className="w-full h-full p-0.5 text-primary-foreground" />}
                        </div>

                        <img src={img} alt={`Generated ${i + 1}`} className="w-full aspect-[4/3] object-cover" />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          {/* Top-right: download, like, dislike */}
                          <div className="flex justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(img, i); }} className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <Download className="w-3.5 h-3.5 text-foreground" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); toast({ title: "Liked!" }); }} className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <ThumbsUp className="w-3.5 h-3.5 text-foreground" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); toast({ title: "Disliked" }); }} className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <ThumbsDown className="w-3.5 h-3.5 text-foreground" />
                            </button>
                          </div>

                          {/* Center: expand */}
                          <div className="flex justify-center">
                            <button onClick={(e) => { e.stopPropagation(); }} className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <Maximize2 className="w-4 h-4 text-foreground" />
                            </button>
                          </div>

                          {/* Bottom: edit, add to media, play */}
                          <div className="flex items-center justify-between">
                            <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-foreground" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onImagesGenerated([img]);
                                toast({ title: "Added to media" });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground hover:bg-card transition-colors border border-border/50"
                            >
                              Add to Media
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                              <Play className="w-3.5 h-3.5 text-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <img src={textToImageIcon} alt="" className="w-24 h-24" />
              <h3 className="text-lg font-semibold text-foreground">Start generating product images</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Describe the image you want to create using a prompt. Use tags and style options to customise your output.
              </p>
              <p className="text-sm text-primary cursor-pointer hover:underline">Need help? See Prompt examples</p>
            </div>
          )}

          {/* Selection toast bar */}
          {selectedImages.size > 0 && (
            <div className="sticky bottom-4 mx-auto w-fit bg-card border border-border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-4 z-30">
              <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm text-foreground font-medium">{selectedImages.size} Images Selected</span>
              <Button
                onClick={handleAddToMedia}
                variant="outline"
                size="sm"
                className="rounded-md border-primary text-primary hover:bg-primary/5 text-xs h-7 px-3"
              >
                Add to Media
              </Button>
              <button className="p-1.5 hover:bg-accent rounded transition-colors" title="Download">
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 hover:bg-accent rounded transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom prompt bar */}
        <div className="border-t border-border bg-card px-6 pt-4 pb-3 space-y-3">
          {isGenerating ? (
            /* Generating state: show prompt text + loading spinner */
            <div className="border border-border rounded-xl bg-card px-4 py-3 flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground">{lastPrompt}</p>
              <div
                className="rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(88deg, #E0D0EE -14.85%, #9F80F8 21.47%, #1079E2 85.02%)",
                  opacity: 0.6,
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
            </div>
          ) : generatedImages.length > 0 ? (
            /* After generation: full prompt bar with all options */
            <div className="border border-border rounded-xl bg-card p-4 space-y-3">
              <Textarea
                placeholder="Describe your idea here"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[60px] max-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/60 transition-colors"
                    title="Upload reference image"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <Select value={numImages} onValueChange={setNumImages}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Image</SelectItem>
                      <SelectItem value="2">2 Images</SelectItem>
                      <SelectItem value="4">4 Images</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <img src={icAspectRatio} alt="" className="w-4 h-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="3:4">3:4</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <img src={icModel} alt="" className="w-4 h-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-flash">GPT-4o</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="rounded-full px-6 text-sm font-medium text-white border-0"
                  style={{
                    background: !prompt.trim()
                      ? "hsl(var(--muted))"
                      : "linear-gradient(88deg, #E0D0EE -14.85%, #9F80F8 21.47%, #1079E2 85.02%)",
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
          ) : (
            /* Initial state: full prompt box */
            <div className="border border-border rounded-xl bg-card p-4 space-y-3">
              {referenceImage && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative w-12 h-12 rounded-lg border border-border flex-shrink-0">
                    <img src={referenceImage} alt="Reference" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full w-5 h-5 flex items-center justify-center text-[10px] z-10 shadow-sm"
                    >×</button>
                  </div>
                </div>
              )}
              <Textarea
                placeholder="Describe your idea here"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[60px] max-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/60 transition-colors"
                    title="Upload reference image"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <Select value={numImages} onValueChange={setNumImages}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Image</SelectItem>
                      <SelectItem value="2">2 Images</SelectItem>
                      <SelectItem value="4">4 Images</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <img src={icAspectRatio} alt="" className="w-4 h-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="3:4">3:4</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-0 text-sm bg-transparent shadow-none px-0">
                      <img src={icModel} alt="" className="w-4 h-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-flash">GPT-4o</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="rounded-full px-6 text-sm font-medium text-white border-0"
                  style={{
                    background: !prompt.trim()
                      ? "hsl(var(--muted))"
                      : "linear-gradient(88deg, #E0D0EE -14.85%, #9F80F8 21.47%, #1079E2 85.02%)",
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Fynd AI can make mistakes. Make sure to double check important information.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
