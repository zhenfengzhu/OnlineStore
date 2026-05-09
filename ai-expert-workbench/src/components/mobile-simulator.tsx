import { X, Heart, Star, MessageCircle, ChevronLeft, MoreHorizontal } from "lucide-react";
import { useEffect } from "react";

interface MobileSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  coverImage?: string;
  authorName?: string;
}

export function MobileSimulator({
  isOpen,
  onClose,
  title,
  content,
  coverImage,
  authorName = "品牌官方账号"
}: MobileSimulatorProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="relative flex h-[850px] max-h-full w-[400px] flex-col overflow-hidden rounded-[3rem] border-[12px] border-zinc-900 bg-white shadow-2xl ring-1 ring-zinc-800">
        
        {/* 刘海屏 / 灵动岛 */}
        <div className="absolute left-1/2 top-0 z-50 h-6 w-32 -translate-x-1/2 rounded-b-3xl bg-zinc-900"></div>

        {/* 顶部导航 */}
        <div className="relative z-40 flex items-center justify-between px-4 pt-10 pb-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-white backdrop-blur-md">
            <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
               <div className="h-full w-full bg-rose-400"></div>
            </div>
            <span className="text-xs font-medium">{authorName}</span>
            <button className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold">关注</button>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* 滚动内容区 */}
        <div className="flex-1 overflow-y-auto -mt-[72px]" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {/* 封面图 */}
          <div className="relative w-full pb-[133%] bg-muted">
            {coverImage ? (
              <img src={coverImage} alt="封面" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 text-zinc-400">
                <span className="font-medium text-lg">3:4 封面占位图</span>
                <span className="text-sm mt-1">1024 x 1365</span>
              </div>
            )}
          </div>

          {/* 正文区域 */}
          <div className="relative px-4 pb-24 pt-4">
            <h1 className="mb-3 text-[18px] font-bold leading-[1.4] text-zinc-900">{title}</h1>
            
            <div className="relative text-[15px] leading-[1.6] text-zinc-800 whitespace-pre-wrap font-[system-ui]">
              {content}
              
              {/* 首屏折叠线提示 */}
              <div className="pointer-events-none absolute left-0 right-0 top-[120px] flex items-center justify-center border-t border-dashed border-rose-400">
                <div className="absolute -top-3 bg-white px-2 text-[10px] font-medium text-rose-500 shadow-sm rounded-full border border-rose-100">
                  前台首屏可见折叠线
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-[12px] text-zinc-400">
               编辑于 刚刚
            </div>
          </div>
        </div>

        {/* 底部互动区 */}
        <div className="absolute bottom-0 left-0 right-0 z-40 flex h-14 items-center gap-6 border-t border-zinc-100 bg-white px-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex-1 border border-zinc-200 rounded-full h-8 px-4 flex items-center text-zinc-400 text-sm">
            说点什么...
          </div>
          <div className="flex items-center gap-4 text-zinc-600">
             <div className="flex items-center gap-1">
               <Heart className="h-6 w-6" />
               <span className="text-xs font-medium">赞</span>
             </div>
             <div className="flex items-center gap-1">
               <Star className="h-6 w-6" />
               <span className="text-xs font-medium">收藏</span>
             </div>
             <div className="flex items-center gap-1">
               <MessageCircle className="h-6 w-6" />
               <span className="text-xs font-medium">评论</span>
             </div>
          </div>
        </div>

      </div>

      {/* 关闭按钮 */}
      <button 
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-zinc-800/50 p-2 text-white hover:bg-zinc-800/80 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
