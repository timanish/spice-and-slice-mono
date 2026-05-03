import { useEffect, useState } from "react";

interface Props {
  images: string[];
  // 1-indexed; 0 means "not in split-screen mode"
  screenNumber: number;
  totalScreens: number;
  // seconds per image when cycling
  durationSeconds: number;
  backgroundColor: string;
}

export function StaticImagesLayout({
  images,
  screenNumber,
  totalScreens,
  durationSeconds,
  backgroundColor,
}: Props) {
  const valid = images.filter(Boolean);
  const isSplit = screenNumber > 0 && totalScreens > 1;

  // Split-screen: each TV shows the image matching its screen index.
  // Wraps if there are fewer images than screens.
  const splitImage = isSplit
    ? valid[(screenNumber - 1) % Math.max(valid.length, 1)]
    : null;

  if (valid.length === 0) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <p style={{ color: "#FFFFFF80", fontSize: "1.2rem" }}>
          No images uploaded yet
        </p>
      </div>
    );
  }

  if (splitImage) {
    return <FullBleedImage src={splitImage} backgroundColor={backgroundColor} />;
  }

  // Cycle mode
  return (
    <CycleImages
      images={valid}
      durationSeconds={durationSeconds}
      backgroundColor={backgroundColor}
    />
  );
}

function FullBleedImage({
  src,
  backgroundColor,
}: {
  src: string;
  backgroundColor: string;
}) {
  return (
    <div
      className="h-screen w-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor }}
    >
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function CycleImages({
  images,
  durationSeconds,
  backgroundColor,
}: {
  images: string[];
  durationSeconds: number;
  backgroundColor: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const ms = Math.max(2, durationSeconds) * 1000;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, ms);
    return () => clearInterval(id);
  }, [images.length, durationSeconds]);

  return (
    <div
      className="h-screen w-screen relative overflow-hidden"
      style={{ backgroundColor }}
    >
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: i === index ? 1 : 0,
            transition: "opacity 700ms ease-in-out",
          }}
        />
      ))}
    </div>
  );
}
