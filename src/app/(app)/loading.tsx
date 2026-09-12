// Shown during server transitions that actually take time, such as the
// history and detail reads. Instant content renders without it.
export default function AppLoading() {
  return (
    <p role="status" className="p-6 text-lg text-zinc-600">
      Cargando…
    </p>
  );
}
