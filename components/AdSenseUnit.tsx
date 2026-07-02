
// components/AdSenseUnit.tsx
import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: any;
  }
}

interface AdSenseUnitProps {
  client: string;
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  client,
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style = { display: 'block' }
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const [isAdPushed, setIsAdPushed] = useState(false);

  useEffect(() => {
    const element = adRef.current;
    if (!element || isAdPushed) return;

    const loadAd = () => {
      // Double check connection and visibility
      if (element && element.isConnected && element.offsetWidth > 0 && element.offsetHeight > 0) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setIsAdPushed(true);
          return true;
        } catch (e) {
          console.error('AdSense error:', e);
        }
      }
      return false;
    };

    // Attempt to load immediately if visible
    if (loadAd()) return;

    // Use ResizeObserver to wait for dimensions
    const observer = new ResizeObserver(() => {
        // Use RequestAnimationFrame to avoid "ResizeObserver loop limit exceeded" 
        // and ensure paint is ready
        requestAnimationFrame(() => {
            if (loadAd()) {
                observer.disconnect();
            }
        });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isAdPushed, slot]);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      ></ins>
    </div>
  );
};
