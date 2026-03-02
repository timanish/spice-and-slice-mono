import { useEffect, useRef } from "react";

interface MapboxAddressAutofillProps {
  accessToken: string;
  onAddressSelect: (address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  }) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const useMapboxAddressAutofill = ({
  accessToken,
  onAddressSelect,
  inputRef,
}: MapboxAddressAutofillProps) => {
  const searchBoxRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleFocusRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!inputRef.current || !accessToken) {
      if (!inputRef.current) {
        console.warn("useMapboxAddressAutofill: Input ref not yet available");
      }
      if (!accessToken) {
        console.error("useMapboxAddressAutofill: Missing Mapbox access token");
      }
      return;
    }

    const inputElement = inputRef.current;

    const loadMapboxAutofill = async () => {
      try {
        const { MapboxSearchBox } = await import("@mapbox/search-js-web");
        searchBoxRef.current = new MapboxSearchBox();
        searchBoxRef.current.accessToken = accessToken;
        searchBoxRef.current.options = {
          types: "address",
          country: "US",
        };

        containerRef.current = document.createElement("div");
        containerRef.current.style.display = "none";
        containerRef.current.style.position = "relative";

        if (inputElement.parentElement) {
          inputElement.parentElement.insertBefore(
            containerRef.current,
            inputElement.nextSibling
          );
          containerRef.current.appendChild(searchBoxRef.current);
        }

        const handleFocus = () => {
          if (containerRef.current && inputElement) {
            inputElement.style.display = "none";
            containerRef.current.style.display = "block";
            if (searchBoxRef.current && inputElement.value) {
              searchBoxRef.current.value = inputElement.value;
            }
            setTimeout(() => {
              const searchInput = searchBoxRef.current?.querySelector("input");
              if (searchInput) {
                searchInput.focus();

                const handleSearchBlur = (e: FocusEvent) => {
                  setTimeout(() => {
                    const activeElement = document.activeElement;
                    const isClickingDropdown =
                      searchBoxRef.current?.contains(activeElement);

                    if (
                      !isClickingDropdown &&
                      containerRef.current &&
                      inputElement
                    ) {
                      containerRef.current.style.display = "none";
                      inputElement.style.display = "block";
                    }
                  }, 200);
                };

                searchInput.addEventListener("blur", handleSearchBlur);
              }
            }, 0);
          }
        };

        handleFocusRef.current = handleFocus;
        inputElement.addEventListener("focus", handleFocus);

        searchBoxRef.current.addEventListener("retrieve", (event: any) => {
          const featureCollection = event.detail;
          if (
            featureCollection &&
            featureCollection.features &&
            featureCollection.features.length > 0
          ) {
            const feature = featureCollection.features[0];
            const props = feature.properties;
            const addressLine1 = props.address || props.name || "";
            const city = props.context?.place?.name || "";
            const state = props.context?.region?.region_code || "";
            const postalCode = props.context?.postcode?.name || "";

            const addressData = {
              addressLine1: addressLine1,
              addressLine2: "",
              city: city,
              state: state,
              postalCode: postalCode,
            };

            onAddressSelect(addressData);
            if (containerRef.current && inputElement) {
              containerRef.current.style.display = "none";
              inputElement.style.display = "block";
            }
          }
        });
      } catch (error) {
        console.error("Failed to load Mapbox Search Box:", error);
      }
    };

    loadMapboxAutofill();

    return () => {
      const inputElement = inputRef.current;
      if (inputElement && handleFocusRef.current) {
        inputElement.removeEventListener("focus", handleFocusRef.current);
      }
      if (searchBoxRef.current) {
        try {
          searchBoxRef.current.remove();
        } catch (e) {
          console.error("Error removing search box:", e);
        }
      }
      if (containerRef.current) {
        try {
          containerRef.current.remove();
        } catch (e) {
          console.error("Error removing container:", e);
        }
      }
    };
  }, [accessToken, inputRef, onAddressSelect]);
};
