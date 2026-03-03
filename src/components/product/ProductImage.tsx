
import { useRef, useState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductImageProps {
  imageUrl?: string;
  alt: string;
}

const ProductImage = ({ imageUrl, alt }: ProductImageProps) => {
  const imageLoaded = useRef(false);
  const [imageError, setImageError] = useState(false);
  
  // Reset image loaded state when image URL changes
  useEffect(() => {
    imageLoaded.current = false;
    setImageError(false);
  }, [imageUrl]);

  const handleImageLoad = () => {
    imageLoaded.current = true;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <AspectRatio ratio={4/3} className="bg-white">
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={alt}
          className="rounded-t-lg object-contain w-full h-full p-2"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-muted rounded-t-lg">
          <ImageIcon className="h-6 w-6 md:h-10 md:w-10 text-muted-foreground" />
        </div>
      )}
    </AspectRatio>
  );
};

export default ProductImage;
