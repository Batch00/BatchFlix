import Image from "next/image";
import type { TMDBProvider, TMDBWatchProvidersRegion } from "@/lib/tmdb";

type Props = {
  providers: TMDBWatchProvidersRegion | null | undefined;
};

function ProviderRow({
  title,
  providers,
}: {
  title: string;
  providers: TMDBProvider[];
}) {
  if (!providers.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <div key={p.provider_id} title={p.provider_name}>
            <Image
              src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
              alt={p.provider_name}
              width={40}
              height={40}
              className="rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StreamingProviders({ providers }: Props) {
  if (!providers) return null;
  const hasAny =
    (providers.flatrate?.length ?? 0) > 0 ||
    (providers.rent?.length ?? 0) > 0 ||
    (providers.buy?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Where to Watch
      </h2>
      <div className="flex flex-col gap-4">
        {providers.flatrate && (
          <ProviderRow title="Streaming" providers={providers.flatrate} />
        )}
        {providers.rent && (
          <ProviderRow title="Rent" providers={providers.rent} />
        )}
        {providers.buy && (
          <ProviderRow title="Buy" providers={providers.buy} />
        )}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Powered by JustWatch
      </p>
    </div>
  );
}
