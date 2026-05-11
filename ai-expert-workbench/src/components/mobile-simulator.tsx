import { X, Heart, Star, MessageCircle, ChevronLeft, MoreHorizontal, Image as ImageIcon, Type, Layout } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  coverImage?: string;
  coverText?: string;
  authorName?: string;
  isSticky?: boolean;
}

export function MobileSimulator({
  isOpen,
  onClose,
  title,
  content,
  coverImage,
  coverText,
  authorName = "品牌官方账号",
  isSticky = false
}: MobileSimulatorProps) {
  const [viewMode, setViewMode] = useState<"cover" | "detail">("detail");
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    color: "#ffffff",
    textAlign: "center" as "center" | "left" | "right",
    position: "center" as "center" | "top" | "bottom"
  });

  useEffect(() => {
    if (isOpen && !isSticky) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSticky]);

  if (!isOpen && !isSticky) return null;

  const renderContent = () => {
    if (viewMode === "detail") {
      return (
        <>
          {/* 封面图 / 详情页顶部 */}
          <div className="relative w-full pb-[133%] bg-zinc-100">
            {coverImage ? (
              <img src={coverImage} alt="封面" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300">
                <ImageIcon className="h-10 w-10 mb-2" />
                <span className="text-[10px]">3:4 图片展示位</span>
              </div>
            )}
          </div>

          {/* 正文区域 */}
          <div className="relative px-4 pb-24 pt-4">
            <h1 className="mb-3 text-[18px] font-bold leading-[1.4] text-zinc-900">{title}</h1>
            <div className="text-[15px] leading-[1.6] text-zinc-800 whitespace-pre-wrap font-[system-ui]">
              {content}
            </div>
            <div className="mt-4 text-[12px] text-zinc-400">编辑于 刚刚</div>
          </div>
        </>
      );
    }

    return (
      <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 via-zinc-900 to-black" />
        )}
        
        <div 
          className={cn(
            "absolute inset-x-8 p-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all",
            textStyle.position === "center" && "top-1/2 -translate-y-1/2",
            textStyle.position === "top" && "top-20",
            textStyle.position === "bottom" && "bottom-20",
            textStyle.textAlign === "center" && "text-center",
            textStyle.textAlign === "left" && "text-left",
            textStyle.textAlign === "right" && "text-right"
          )}
          style={{ 
            color: textStyle.color,
            fontSize: `${textStyle.fontSize + (isSticky ? -4 : 4)}px`,
            fontWeight: "900",
            lineHeight: 1.1,
            letterSpacing: "-0.02em"
          }}
        >
          {coverText || "封面文案待输入"}
        </div>

        <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3">
          <div className="flex gap-4 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 transition-opacity">
            <button onClick={() => setTextStyle(s => ({...s, textAlign: "left"}))} className="p-1.5 hover:bg-white/10 rounded"><Layout className="h-4 w-4 rotate-90 text-white" /></button>
            <button onClick={() => setTextStyle(s => ({...s, textAlign: "center"}))} className="p-1.5 hover:bg-white/10 rounded"><Layout className="h-4 w-4 text-white" /></button>
            <button onClick={() => setTextStyle(s => ({...s, position: "top"}))} className="p-1.5 hover:bg-white/10 rounded"><ChevronLeft className="h-4 w-4 rotate-90 text-white" /></button>
            <button onClick={() => setTextStyle(s => ({...s, position: "bottom"}))} className="p-1.5 hover:bg-white/10 rounded"><ChevronLeft className="h-4 w-4 -rotate-90 text-white" /></button>
          </div>
          <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-[10px] text-white/70 border border-white/5">
            封面预览模式 · 底部按钮调整布局
          </div>
        </div>
      </div>
    );
  };

  if (isSticky) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="p-3 border-b flex items-center justify-between bg-white z-50">
          <span className="text-xs font-bold text-zinc-900">预览模拟器</span>
          <div className="flex gap-1">
            <Button size="sm" variant={viewMode === "cover" ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setViewMode("cover")}>封面</Button>
            <Button size="sm" variant={viewMode === "detail" ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setViewMode("detail")}>详情</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="relative flex h-[850px] max-h-full w-[400px] flex-col overflow-hidden rounded-[3rem] border-[12px] border-zinc-900 bg-white shadow-2xl ring-1 ring-zinc-800">
        <div className="absolute left-1/2 top-0 z-50 h-6 w-32 -translate-x-1/2 rounded-b-3xl bg-zinc-900"></div>

        <div className="relative z-40 flex items-center justify-between px-4 pt-10 pb-2 bg-white">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className={cn("h-7 px-3 rounded-full text-xs", viewMode === "cover" && "bg-zinc-100 font-bold")} onClick={() => setViewMode("cover")}>封面图</Button>
            <Button variant="ghost" size="sm" className={cn("h-7 px-3 rounded-full text-xs", viewMode === "detail" && "bg-zinc-100 font-bold")} onClick={() => setViewMode("detail")}>详情页</Button>
          </div>
          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {renderContent()}
        </div>

        {viewMode === "detail" && (
          <div className="absolute bottom-0 left-0 right-0 z-40 flex h-14 items-center gap-6 border-t border-zinc-100 bg-white px-5">
            <div className="flex-1 border border-zinc-200 rounded-full h-8 px-4 flex items-center text-zinc-400 text-sm">说点什么...</div>
            <div className="flex items-center gap-4 text-zinc-600">
              <Heart className="h-6 w-6" />
              <Star className="h-6 w-6" />
              <MessageCircle className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>
      <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-zinc-800/50 p-2 text-white hover:bg-zinc-800/80 transition-colors">
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
