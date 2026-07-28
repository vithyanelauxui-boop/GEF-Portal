import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, GripVertical, Image, Film, Box, Youtube, Link2, ChevronLeft, ChevronRight, Sparkles, Type, Camera, ImageIcon, QrCode } from "lucide-react";
import icImageEnhance from "@/assets/ic-image-enhance.svg";
import { GenerateMediaModal } from "./GenerateMediaModal";
import { QRUploadTab } from "./QRUploadTab";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
 import { useToast } from "@/hooks/use-toast";
 import { validateImageFile, validateVideoFile, validate3DModelFile, youtubeUrlSchema } from "@/lib/validations";

type MediaType = "image" | "video" | "3d" | "youtube";

interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  youtubeId?: string;
  altText?: string;
}

interface MediaUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxVisible?: number;
}

// Parse YouTube URL to get video ID
const getYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Get YouTube thumbnail
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

export function MediaUpload({ images, onImagesChange, maxVisible = 9 }: MediaUploadProps) {
  const isMobile = useIsMobile();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [activeTab, setActiveTab] = useState<string>("image");
  const [mobileUrlMode, setMobileUrlMode] = useState(false);
  const [mobileUrlInput, setMobileUrlInput] = useState("");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
   const { toast } = useToast();

  // For now, we'll store media items in a simple format
  // Images are stored as data URLs, videos/3D/YouTube store metadata
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => 
    images.map((url, i) => ({ id: `img-${i}`, type: "image" as MediaType, url, altText: "" }))
  );

  // Re-sync mediaItems when the images prop changes (e.g. navigating to edit an existing product)
  const prevImagesRef = useRef(images);
  useEffect(() => {
    if (prevImagesRef.current !== images && images.length > 0) {
      const currentUrls = new Set(mediaItems.map(m => m.url));
      const allFromProp = images.every(url => currentUrls.has(url)) && currentUrls.size === images.length;
      if (!allFromProp) {
        const newItems = images.map((url, i) => ({ id: `img-${i}`, type: "image" as MediaType, url, altText: "" }));
        setMediaItems(newItems);
      }
    }
    prevImagesRef.current = images;
  }, [images]);

  const syncToParent = useCallback((items: MediaItem[]) => {
    // Extract just image URLs for backward compatibility
    const imageUrls = items.filter(m => m.type === "image").map(m => m.url);
    onImagesChange(imageUrls);
  }, [onImagesChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

     const allFiles = Array.from(files);
     
     // Validate each file based on type
     const validatedFiles: File[] = [];
     const errors: string[] = [];
     
     allFiles.forEach((file) => {
       let validation: { valid: boolean; error?: string };
       
       switch (type) {
         case "image":
           validation = validateImageFile(file);
           break;
         case "video":
           validation = validateVideoFile(file);
           break;
         case "3d":
           validation = validate3DModelFile(file);
           break;
         default:
           validation = { valid: true };
       }
       
       if (validation.valid) {
         validatedFiles.push(file);
       } else if (validation.error) {
         errors.push(`${file.name}: ${validation.error}`);
       }
     });
     
     // Show validation errors if any
     if (errors.length > 0) {
       toast({
         title: "File Validation Error",
         description: errors.slice(0, 3).join("\n") + (errors.length > 3 ? `\n...and ${errors.length - 3} more` : ""),
         variant: "destructive",
       });
     }
     
     if (validatedFiles.length === 0) {
       // Reset inputs
       if (fileInputRef.current) fileInputRef.current.value = "";
       if (videoInputRef.current) videoInputRef.current.value = "";
       if (modelInputRef.current) modelInputRef.current.value = "";
       return;
     }

    let loadedCount = 0;
    const newItems: MediaItem[] = [];

     validatedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newItems[index] = {
            id: `${type}-${Date.now()}-${index}`,
            type,
            url: event.target.result as string,
          };
          loadedCount++;
          
           if (loadedCount === validatedFiles.length) {
            const updatedItems = [...mediaItems, ...newItems.filter(Boolean)];
            setMediaItems(updatedItems);
            syncToParent(updatedItems);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (modelInputRef.current) modelInputRef.current.value = "";
    setIsAddMediaOpen(false);
   }, [mediaItems, syncToParent, toast]);

  const handleYoutubeAdd = () => {
     // Validate YouTube URL using Zod schema
     const result = youtubeUrlSchema.safeParse(youtubeUrl);
     if (!result.success) {
       toast({
         title: "Invalid YouTube URL",
         description: "Please enter a valid YouTube URL",
         variant: "destructive",
       });
       return;
     }
     
     const videoId = getYouTubeId(youtubeUrl);
     if (!videoId) return;

    const newItem: MediaItem = {
      id: `youtube-${Date.now()}`,
      type: "youtube",
      url: youtubeUrl,
      thumbnail: getYouTubeThumbnail(videoId),
      youtubeId: videoId,
    };

    const updatedItems = [...mediaItems, newItem];
    setMediaItems(updatedItems);
    syncToParent(updatedItems);
    setYoutubeUrl("");
    setIsAddMediaOpen(false);
  };

  const handleRemoveMedia = (index: number) => {
    const newItems = mediaItems.filter((_, i) => i !== index);
    setMediaItems(newItems);
    syncToParent(newItems);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newItems = [...mediaItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setMediaItems(newItems);
    syncToParent(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "video": return <Film className="w-4 h-4" />;
      case "3d": return <Box className="w-4 h-4" />;
      case "youtube": return <Youtube className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMediaThumbnail = (item: MediaItem) => {
    if (item.type === "youtube" && item.thumbnail) {
      return item.thumbnail;
    }
    if (item.type === "video") {
      // For videos, we'd need to generate a thumbnail - use placeholder
      return item.url;
    }
    return item.url;
  };

  // Viewer navigation
  const openViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  const goToPrevious = () => {
    setViewerIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const goToNext = () => {
    setViewerIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const updateAltText = (index: number, altText: string) => {
    const newItems = [...mediaItems];
    newItems[index] = { ...newItems[index], altText };
    setMediaItems(newItems);
  };

  const handleGenerateAltText = () => {
    // Placeholder for AI integration
    // This will be connected to the AI gateway in the future
    console.log("AI alt text generation - to be implemented");
  };

  const handleGeneratedImages = useCallback((urls: string[]) => {
    const newItems: MediaItem[] = urls.map((url, i) => ({
      id: `ai-${Date.now()}-${i}`,
      type: "image" as MediaType,
      url,
    }));
    const updated = [...mediaItems, ...newItems];
    setMediaItems(updated);
    syncToParent(updated);
  }, [mediaItems, syncToParent]);

  const maxSmallImages = 7;
  const visibleSmallMedia = mediaItems.slice(1, maxSmallImages + 1);
  const remainingCount = mediaItems.length - (maxSmallImages + 1);

  const handleQrMediaAdded = useCallback((urls: string[]) => {
    const newItems: MediaItem[] = urls
      .filter((url) => !mediaItems.some((m) => m.url === url))
      .map((url, i) => ({
        id: `qr-${Date.now()}-${i}`,
        type: "image" as MediaType,
        url,
      }));
    if (newItems.length > 0) {
      const updated = [...mediaItems, ...newItems];
      setMediaItems(updated);
      syncToParent(updated);
    }
  }, [mediaItems, syncToParent]);

  const addMediaTabsContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="image" className="gap-2"><Image className="w-4 h-4" />Image</TabsTrigger>
        <TabsTrigger value="video" className="gap-2"><Film className="w-4 h-4" />Video</TabsTrigger>
        <TabsTrigger value="3d" className="gap-2"><Box className="w-4 h-4" />3D</TabsTrigger>
        <TabsTrigger value="youtube" className="gap-2"><Youtube className="w-4 h-4" />YouTube</TabsTrigger>
        <TabsTrigger value="qr" className="gap-2"><QrCode className="w-4 h-4" />Scan & Upload</TabsTrigger>
      </TabsList>
      <TabsContent value="image" className="mt-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
          <Image className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Click to upload images</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFileSelect(e, "image")} className="hidden" />
      </TabsContent>
      <TabsContent value="video" className="mt-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => videoInputRef.current?.click()}>
          <Film className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Click to upload videos</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WEBM up to 100MB</p>
        </div>
        <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={(e) => handleFileSelect(e, "video")} className="hidden" />
      </TabsContent>
      <TabsContent value="3d" className="mt-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => modelInputRef.current?.click()}>
          <Box className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Click to upload 3D models</p>
          <p className="text-xs text-muted-foreground mt-1">OBJ, GLTF, GLB up to 50MB</p>
        </div>
        <input ref={modelInputRef} type="file" accept=".obj,.gltf,.glb" onChange={(e) => handleFileSelect(e, "3d")} className="hidden" />
      </TabsContent>
      <TabsContent value="youtube" className="mt-4">
        <div className="space-y-4">
          <div>
            <label className="form-label">YouTube URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="pl-10" />
              </div>
              <Button onClick={handleYoutubeAdd} disabled={!getYouTubeId(youtubeUrl)}>Add</Button>
            </div>
          </div>
          {youtubeUrl && getYouTubeId(youtubeUrl) && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={getYouTubeThumbnail(getYouTubeId(youtubeUrl)!)} alt="YouTube preview" className="w-full aspect-video object-cover" />
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="qr" className="mt-4">
        <QRUploadTab onMediaAdded={handleQrMediaAdded} />
      </TabsContent>
    </Tabs>
  );

  const renderAddMediaModal = () => {
    if (isMobile) {
      return (
        <Drawer open={isAddMediaOpen} onOpenChange={setIsAddMediaOpen}>
          <DrawerContent className="pb-6">
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Add Media</h2>
                <button onClick={() => setIsAddMediaOpen(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setIsAddMediaOpen(false);
                    // Use capture attribute for camera
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.capture = "environment";
                    input.onchange = (e) => handleFileSelect(e as any, "image");
                    input.click();
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Camera</p>
                    <p className="text-xs text-muted-foreground">Take a photo</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setIsAddMediaOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Media</p>
                    <p className="text-xs text-muted-foreground">Choose from gallery</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setMobileUrlMode(true);
                    setMobileUrlInput("");
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">URL</p>
                    <p className="text-xs text-muted-foreground">Add image from URL</p>
                  </div>
                </button>
                {mobileUrlMode && (
                  <div className="space-y-3 pt-2">
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={mobileUrlInput}
                        onChange={(e) => setMobileUrlInput(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!mobileUrlInput.trim()}
                      onClick={() => {
                        const url = mobileUrlInput.trim();
                        if (url) {
                          const newItem: MediaItem = {
                            id: `url-${Date.now()}`,
                            type: "image",
                            url,
                          };
                          const updated = [...mediaItems, newItem];
                          setMediaItems(updated);
                          syncToParent(updated);
                          setMobileUrlInput("");
                          setMobileUrlMode(false);
                          setIsAddMediaOpen(false);
                        }
                      }}
                    >
                      Add Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={isAddMediaOpen} onOpenChange={setIsAddMediaOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Media</DialogTitle>
          </DialogHeader>
          {addMediaTabsContent}
        </DialogContent>
      </Dialog>
    );
  };

  if (mediaItems.length === 0) {
    return (
      <div>
        <label className="form-label">Media</label>
        <div className="upload-zone py-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                className="relative inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium text-foreground hover:opacity-90 transition-opacity"
                style={{
                  background: "linear-gradient(white, white) padding-box, linear-gradient(88deg, #E0D0EE -14.85%, #9F80F8 21.47%, #1079E2 85.02%) border-box",
                  border: "1.5px solid transparent",
                }}
                onClick={() => setIsGenerateOpen(true)}
              >
                <img src={icImageEnhance} alt="" className="w-4 h-4" />
                Generate Media
              </button>
              <button 
                type="button"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                onClick={() => setIsAddMediaOpen(true)}
              >
                Add Media
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag and drop images, videos, 3D models, and files
            </p>
          </div>
        </div>

        {renderAddMediaModal()}
        <GenerateMediaModal open={isGenerateOpen} onOpenChange={setIsGenerateOpen} onImagesGenerated={handleGeneratedImages} />
      </div>
    );
  }

  return (
    <div>
      <label className="form-label">Media</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
        {/* Featured large image */}
        <div 
          className="col-span-2 row-span-2 relative group"
          onMouseEnter={() => setHoveredIndex(0)}
          onMouseLeave={() => setHoveredIndex(null)}
          draggable
          onDragStart={() => handleDragStart(0)}
          onDragOver={(e) => handleDragOver(e, 0)}
          onDragEnd={handleDragEnd}
        >
          <div 
            className="aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer"
            onClick={() => openViewer(0)}
          >
            <img 
              src={getMediaThumbnail(mediaItems[0])} 
              alt={mediaItems[0].altText || "Product media 1"} 
              className="w-full h-full object-cover"
            />
            {/* Media type badge */}
            {mediaItems[0].type !== "image" && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
                {getMediaIcon(mediaItems[0].type)}
                {mediaItems[0].type === "youtube" ? "YouTube" : mediaItems[0].type === "3d" ? "3D" : "Video"}
              </div>
            )}
            {hoveredIndex === 0 && (
              <>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">1</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(0)}
                  className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute top-2 left-2 cursor-grab">
                  <GripVertical className="w-5 h-5 text-white" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Smaller media grid - 7 max visible */}
        {visibleSmallMedia.map((item, idx) => {
          const actualIndex = idx + 1;
          const isLastVisible = idx === visibleSmallMedia.length - 1 && remainingCount > 0;
          
          return (
            <div
              key={item.id}
              className="relative group aspect-square"
              onMouseEnter={() => setHoveredIndex(actualIndex)}
              onMouseLeave={() => setHoveredIndex(null)}
              draggable
              onDragStart={() => handleDragStart(actualIndex)}
              onDragOver={(e) => handleDragOver(e, actualIndex)}
              onDragEnd={handleDragEnd}
            >
              <div 
                className="w-full h-full rounded-xl overflow-hidden bg-muted relative cursor-pointer"
                onClick={() => !isLastVisible && openViewer(actualIndex)}
              >
                <img 
                  src={getMediaThumbnail(item)} 
                  alt={item.altText || `Product media ${actualIndex + 1}`} 
                  className="w-full h-full object-cover"
                />
                {/* Media type badge */}
                {item.type !== "image" && (
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-1">
                    {getMediaIcon(item.type)}
                  </div>
                )}
                {isLastVisible && (
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(true)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                  >
                    <span className="text-white text-xl font-bold">+{remainingCount}</span>
                  </button>
                )}
                {hoveredIndex === actualIndex && !isLastVisible && (
                  <>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">{actualIndex + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(actualIndex)}
                      className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute top-1 left-1 cursor-grab">
                      <GripVertical className="w-4 h-4 text-white" />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Upload more button */}
        <div 
          className="aspect-square rounded-xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"
          onClick={() => setIsAddMediaOpen(true)}
        >
          <Upload className="w-5 h-5 text-primary" />
          <span className="text-xs text-primary font-medium">Add Media</span>
        </div>
      </div>

      {renderAddMediaModal()}
      <GenerateMediaModal open={isGenerateOpen} onOpenChange={setIsGenerateOpen} onImagesGenerated={handleGeneratedImages} />

      {/* Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Media ({mediaItems.length} items)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {mediaItems.map((item, index) => (
              <div
                key={item.id}
                className="relative group aspect-square"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className={cn(
                  "w-full h-full rounded-xl overflow-hidden bg-muted relative",
                  draggedIndex === index && "opacity-50"
                )}>
                  <img 
                    src={getMediaThumbnail(item)} 
                    alt={`Product media ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  {/* Media type badge */}
                  {item.type !== "image" && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
                      {getMediaIcon(item.type)}
                      {item.type === "youtube" ? "YouTube" : item.type === "3d" ? "3D" : "Video"}
                    </div>
                  )}
                  <div className="absolute inset-0 sm:bg-black/0 bg-black/20 sm:group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="text-white text-xl font-bold sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {index + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute top-2 left-2 cursor-grab sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
            {/* Upload more in modal */}
            <div 
              className="aspect-square rounded-xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setIsGalleryOpen(false);
                setIsAddMediaOpen(true);
              }}
            >
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-sm text-primary font-medium">Add Media</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Media Viewer Modal */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-background">
          <div className="flex flex-col lg:flex-row h-[85vh]">
            {/* Main viewer area */}
            <div className="flex-1 relative bg-muted/30 flex items-center justify-center min-h-[300px]">
              {/* Navigation - Previous */}
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Media display */}
              {mediaItems[viewerIndex] && (
                <div className="w-full h-full flex items-center justify-center p-8">
                  {mediaItems[viewerIndex].type === "youtube" && mediaItems[viewerIndex].youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${mediaItems[viewerIndex].youtubeId}`}
                      className="w-full max-w-3xl aspect-video rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : mediaItems[viewerIndex].type === "video" ? (
                    <video
                      src={mediaItems[viewerIndex].url}
                      controls
                      className="max-w-full max-h-full rounded-lg"
                    />
                  ) : (
                    <img
                      src={mediaItems[viewerIndex].url}
                      alt={mediaItems[viewerIndex].altText || `Media ${viewerIndex + 1}`}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  )}
                </div>
              )}

              {/* Navigation - Next */}
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
                {viewerIndex + 1} / {mediaItems.length}
              </div>
            </div>

            {/* Sidebar - Details panel */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Media Details</DialogTitle>
              </DialogHeader>

              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {mediaItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setViewerIndex(idx)}
                    className={cn(
                      "w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors",
                      idx === viewerIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <img
                      src={getMediaThumbnail(item)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Alt Text section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Type className="w-4 h-4 text-muted-foreground" />
                    Alt Text
                  </label>
                </div>
                <Textarea
                  placeholder="Describe this image for accessibility..."
                  value={mediaItems[viewerIndex]?.altText || ""}
                  onChange={(e) => updateAltText(viewerIndex, e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Alt text helps screen readers describe images to visually impaired users.
                </p>
              </div>

              {/* AI Section - Placeholder for future */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Assist
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleGenerateAltText}
                  disabled
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Alt Text
                  <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Image className="w-4 h-4" />
                  Enhance Image
                  <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Box className="w-4 h-4" />
                  Remove Background
                  <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                </Button>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4 border-t border-border flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRemoveMedia(viewerIndex)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsViewerOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
