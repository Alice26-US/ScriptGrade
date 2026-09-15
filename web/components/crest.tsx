export function Crest({ size = 52 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--gold)] bg-[rgb(185_138_46/0.1)]"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D8B96B"
        strokeWidth="1.3"
        style={{ width: size * 0.5, height: size * 0.5 }}
      >
        <path d="M12 2 L21 6.5 L21 13 C21 18 17 21.5 12 23 C7 21.5 3 18 3 13 L3 6.5 Z" />
        <path d="M12 7 L12 17 M8 10 L16 10" strokeWidth="1" />
      </svg>
    </div>
  );
}
