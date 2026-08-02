/**
 * Bloque de carga con pulso. Dale forma con `className` (alto/ancho/radio):
 * imita la silueta del contenido real para que el layout no salte al cargar.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-(--color-bg-elevated) ${className}`}
    />
  )
}
