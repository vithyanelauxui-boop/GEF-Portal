import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoSvg from "@/assets/logo.svg";
import cornerLeft from "@/assets/corner-left.svg";

export function AppHeader() {
  return (
    <header className="h-14 bg-frame flex items-center justify-between px-4 md:px-5 sticky top-0 z-20 relative">
      {/* Curved notch at bottom - only on desktop where L2 panel exists */}
      <img 
        src={cornerLeft} 
        alt="" 
        className="absolute -bottom-6 left-20 w-6 h-6 z-30 hidden md:block"
      />
      {/* Left - Logo */}
      <div className="flex items-center">
        <img src={logoSvg} alt="Commerce" className="h-6" />
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-frame-foreground hover:text-frame-foreground-active hover:bg-frame-muted"
        >
          <Bell className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 ring-2 ring-primary">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-white text-xs font-medium">
              FV
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white leading-tight">
              Fuschia Vine Designs
            </p>
            <p className="text-xs text-frame-foreground leading-tight">
              Atharva Keshattiwar
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
