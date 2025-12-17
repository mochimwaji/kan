interface MultiDragBadgeProps {
  count: number;
}

export default function MultiDragBadge({ count }: MultiDragBadgeProps) {
  if (count <= 1) return null;

  return (
    <div className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-md">
      {count}
    </div>
  );
}
