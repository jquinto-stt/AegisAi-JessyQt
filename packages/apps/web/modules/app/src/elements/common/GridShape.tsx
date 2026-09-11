/**
 * @kgId 98aba6133f20
 */
export default function GridShape() {
  return (
    <>
      <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px] text-white/30 pointer-events-none">
        <svg viewBox="0 0 450 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3,3" />
            </pattern>
          </defs>
          <rect width="450" height="450" fill="url(#grid-pattern)" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px] text-white/30 pointer-events-none">
        <svg viewBox="0 0 450 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="450" height="450" fill="url(#grid-pattern)" />
        </svg>
      </div>
    </>
  );
}
