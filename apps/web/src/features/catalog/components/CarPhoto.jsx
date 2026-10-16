import { useEffect, useState } from 'react';

// If a remote listing photo fails, show another real vehicle photograph rather
// than reverting to the SVG illustration used elsewhere in the original app.
const PHOTO_FALLBACKS = {
  sedan: 'https://citymagazine.b-cdn.net/wp-content/uploads/2024/08/2025_Camry_XSE_AWD_HeavyMetalBlackRoof_003-1400x933.webp',
  hatch: 'https://www.toyota.co.th/media/product/series/colors/v/yaris/39/ab4de76e4836b11a50307970c6a611383964227ca48bd4152739fcea999aac60.webp',
  suv: 'https://carprices.ae/uploads/api_uploads_img_car_gallery_2023_toyota_fortuner_4_0l_vxr_3_4a0c66dd4b.jpg',
  pickup: 'https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg',
  sport: 'https://www.autoblog.com/.image/MjA5MTc4Mjc4NjIzNzgyNzU2/2012%20Nissan%20GT-R.jpg?profile=w1536&x=50&y=50',
  supercar: 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_1_2560x1440.jpg',
  ev: 'https://asset.carwyapar.com/Car%20Images/BYD/Seal/BYD-Seal-Premium/sidefront.webp',
};

export default function CarPhoto({ car, className = '', imageOnly = false }) {
  const fallbackSource = PHOTO_FALLBACKS[car?.type] || PHOTO_FALLBACKS.sedan;
  const preferredSource = car?.imageUrl || fallbackSource;
  const [source, setSource] = useState(preferredSource);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSource(preferredSource);
    setFailed(false);
  }, [preferredSource]);

  if (failed) {
    return (
      <div className={`${className} catalog-photo-unavailable`} role="img" aria-label={`ไม่มีภาพ ${car?.brand || ''} ${car?.name || 'รถยนต์'}`}>
        <span>ภาพรถไม่พร้อมใช้งาน</span>
      </div>
    );
  }

  return (
    <img
      className={className || 'catalog-photo'}
      src={source}
      alt={`${car?.brand || ''} ${car?.name || 'รถยนต์'}`.trim()}
      loading={imageOnly ? 'eager' : 'lazy'}
      onError={() => {
        if (source !== fallbackSource) setSource(fallbackSource);
        else setFailed(true);
      }}
    />
  );
}
