import { useEffect } from "react";

export const useFlyToCartAnimation = () => {
  const animateItemToCart = (
    itemElement: HTMLElement,
    cartElement: HTMLElement
  ) => {
    // Get the positions
    const itemRect = itemElement.getBoundingClientRect();
    const cartRect = cartElement.getBoundingClientRect();

    // Create a clone of the item image for animation
    const clone = itemElement.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = `${itemRect.top}px`;
    clone.style.left = `${itemRect.left}px`;
    clone.style.width = `${itemRect.width}px`;
    clone.style.height = `${itemRect.height}px`;
    clone.style.zIndex = "9999";
    clone.style.transition = "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    clone.style.pointerEvents = "none";

    document.body.appendChild(clone);

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      const scale = 0.2;
      const targetX = cartRect.left + cartRect.width / 2;
      const targetY = cartRect.top + cartRect.height / 2;

      clone.style.transform = `translate(${targetX - itemRect.left}px, ${
        targetY - itemRect.top
      }px) scale(${scale})`;
      clone.style.opacity = "0";
    });

    // Remove clone after animation
    setTimeout(() => {
      document.body.removeChild(clone);
    }, 800);

    // Pulse the cart icon
    cartElement.classList.add("animate-bounce");
    setTimeout(() => {
      cartElement.classList.remove("animate-bounce");
    }, 600);
  };

  return { animateItemToCart };
};

export const useCartPulse = (itemCount: number) => {
  useEffect(() => {
    const cartIcon = document.getElementById("cart-summary-icon");
    if (cartIcon && itemCount > 0) {
      cartIcon.classList.add("scale-110");
      setTimeout(() => {
        cartIcon.classList.remove("scale-110");
      }, 300);
    }
  }, [itemCount]);
};
