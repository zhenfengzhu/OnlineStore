import { X, Heart, Star, MessageCircle, ChevronLeft, ChevronRight, MoreHorizontal, Image as ImageIcon, Layout } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  coverImage?: string;
  coverImages?: string[];
  coverText?: string;
  authorName?: string;
  isSticky?: boolean;
}

function isRenderableImageSrc(src: string) {
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith("data:image/")) return value.includes(",");
  if (value.startsWith("blob:")) return true;
  if (value.startsWith("/api/image-proxy")) return value.includes("url=");

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function MobileSimulator({
  isOpen,
  onClose,
  title,
  content,
  coverImage,
  coverImages,
  coverText,
  authorName = "品牌官方账号",
  isSticky = false
}: MobileSimulatorProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const [viewMode, setViewMode] = useState<"cover" | "detail">("detail");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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

  const images = (coverImages?.length ? coverImages : coverImage ? [coverImage] : []).filter(isRenderableImageSrc);
  const activeImage = images[activeImageIndex] ?? images[0];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [coverImage, coverImages]);

  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        window.clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen && !isSticky) return null;

  function scrollCarouselToIndex(index: number, behavior: ScrollBehavior = "smooth") {
    const carousel = carouselRef.current;
    if (!carousel || viewMode !== "detail") return;

    if (scrollSyncTimeoutRef.current) {
      window.clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = window.setTimeout(() => {
      scrollSyncTimeoutRef.current = null;
    }, 450);

    carousel.scrollTo({
      left: carousel.clientWidth * index,
      behavior
    });
  }

  function selectImage(index: number) {
    if (images.length === 0) return;
    const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
    setActiveImageIndex(nextIndex);
    scrollCarouselToIndex(nextIndex);
  }

  function changeImage(delta: number) {
    if (!hasMultipleImages) return;
    setActiveImageIndex((current) => {
      const nextIndex = (current + delta + images.length) % images.length;
      scrollCarouselToIndex(nextIndex);
      return nextIndex;
    });
  }

  const renderContent = () => {
    if (viewMode === "detail") {
      return (
        <>
          {/* 封面图 / 详情页顶部 */}
          <div className="relative w-full bg-zinc-100">
            {images.length > 0 ? (
              <>
                <div
                  ref={carouselRef}
                  className="flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  onScroll={(event) => {
                    if (scrollSyncTimeoutRef.current) return;
                    const target = event.currentTarget;
                    const nextIndex = Math.round(target.scrollLeft / Math.max(target.clientWidth, 1));
                    if (nextIndex !== activeImageIndex) {
                      setActiveImageIndex(Math.min(Math.max(nextIndex, 0), images.length - 1));
                    }
                  }}
                >
                  {images.map((image, index) => (
                    <div key={`${image}-${index}`} className="relative h-full w-full shrink-0 snap-center">
                      <img src={image} alt={`笔记图片 ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>

                {hasMultipleImages ? (
                  <>
                    <button
                      type="button"
                      aria-label="上一张图片"
                      className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/50"
                      onClick={() => changeImage(-1)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="下一张图片"
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/50"
                      onClick={() => changeImage(1)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                      {activeImageIndex + 1}/{images.length}
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((image, index) => (
                        <button
                          key={`${image}-dot-${index}`}
                          type="button"
                          aria-label={`查看第 ${index + 1} 张图片`}
                          className={cn(
                            "h-1.5 rounded-full bg-white/70 transition-all",
                            index === activeImageIndex ? "w-5" : "w-1.5 opacity-70"
                          )}
                          onClick={() => selectImage(index)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center text-zinc-300">
                <ImageIcon className="h-10 w-10 mb-2" />
                <span className="text-[10px]">3:4 图片展示位</span>
              </div>
            )}
          </div>

          {/* 正文区域 */}
          <div className="relative px-4 pb-24 pt-4">
            <h1 className="mb-3 break-words text-[18px] font-bold leading-[1.4] text-zinc-900 [overflow-wrap:anywhere]">{title}</h1>
            <div className="whitespace-pre-wrap break-words font-[system-ui] text-[15px] leading-[1.6] text-zinc-800 [overflow-wrap:anywhere]">
              {content}
            </div>
            <div className="mt-4 text-[12px] text-zinc-400">编辑于 刚刚</div>
          </div>
        </>
      );
    }

    return (
      <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
        {activeImage ? (
          <img src={activeImage} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 via-zinc-900 to-black" />
        )}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              aria-label="上一张封面图片"
              className="absolute left-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
              onClick={() => changeImage(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="下一张封面图片"
              className="absolute right-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
              onClick={() => changeImage(1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute right-4 top-14 z-20 rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
              {activeImageIndex + 1}/{images.length}
            </div>
          </>
        ) : null}
        
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
